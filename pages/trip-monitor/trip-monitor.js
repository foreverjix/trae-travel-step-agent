const app = getApp()
const amapService = require('../../services/amap-service.js')
const aiService = require('../../services/ai-service.js')

// 统一：本地规则检测触发 → AI agent二次分析生成人性化文案 → 弹窗+推送
// 失败时自动回落到本地默认文案（analyzeSafetyAlert内部已处理兜底）
function _riskIcon(riskLevel) {
  return riskLevel === 'high' ? '🚨' : (riskLevel === 'low' ? 'ℹ️' : '⏰')
}
function _riskType(riskLevel) {
  return riskLevel === 'high' ? 'danger' : (riskLevel === 'low' ? 'success' : 'warning')
}

Page({
  /**
   * 将AI分析结果应用到预警展示：deviationAlert/stationaryAlert/missedStationAlert + alerts历史列表 + showModal
   */
  _applyAlert(alertKey, analysis, opts) {
    var page = this
    var now = new Date()
    var timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    var riskType = _riskType(analysis.riskLevel)
    var icon = _riskIcon(analysis.riskLevel)
    var title = analysis.title
    var desc = analysis.desc + (analysis.suggestion ? '｜建议：' + analysis.suggestion : '')
    var alertObj = { id: Date.now(), type: riskType, icon: icon, title: title, desc: desc, time: analysis.time || timeStr }
    var setPayload = { showSmartDetection: true }
    setPayload[alertKey] = alertObj
    // 先立即用AI分析前生成的标题/desc更新UI，避免等待
    page.setData(setPayload)
    page.data.alerts.push(alertObj)
    page.setData({ alerts: page.data.alerts })
    if (!page._isAlive || getCurrentPages().length === 0) return
    wx.vibrateLong()
    try {
      wx.showModal({
        title: icon + ' ' + title,
        content: desc,
        confirmText: opts && opts.confirmText ? opts.confirmText : '联系父母',
        cancelText: '忽略',
        success: (res) => {
          if (res.confirm && opts && typeof opts.onConfirm === 'function') opts.onConfirm()
          if (res.confirm && !opts) page.callParent()
        }
      })
    } catch (e) {
      // 页面已销毁，忽略弹窗
    }
  },
  data: {
    isMonitoring: true,
    monitorStatusClass: 'active',
    monitorStatusText: '定位中...',
    locationName: '定位中...',
    currentLocation: null,
    currentTrip: null,
    currentDriver: null,
    timelineItems: [],
    alerts: [],
    showSmartDetection: false,
    deviationAlert: null,
    stationaryAlert: null,
    missedStationAlert: null,
    deviateCounter: 0,
    lastLocationTime: Date.now(),
    useMockData: false,
    mapData: {
      latitude: 39.9042,
      longitude: 116.4074,
      scale: 5,
      markers: [],
      polyline: [],
      hasDestination: false
    }
  },

  _monitorTimer: null,
  _locationTimer: null,
  _isAlive: false,
  _simStartTime: 0,

  onLoad(options) {
    this._isAlive = true
    this.setData({
      parentName: options.parentName ? decodeURIComponent(options.parentName) : '',
      parentPhone: options.parentPhone ? decodeURIComponent(options.parentPhone) : ''
    })
  },

  onShow() {
    this._simStartTime = Date.now()
    this.loadTripData(() => {
      // 行程数据加载完再更新地图，确保destCoord可读
      this.startRealLocationUpdate()
    })
    this.startMonitoring()
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    // 设置AI页面上下文
    app.globalData.aiPageContext = {
      page: 'trip-monitor',
      title: '行程监控',
      summary: '监控长辈出行'
    }
  },

  loadTripData(callback) {
    const orders = app.globalData.orders || []
    const today = new Date().toISOString().split('T')[0]
    
    // 查找今天或未来的有效行程（优先最新创建的）
    var validOrders = orders.filter(function(o) {
      return o.date >= today && ['booked', 'waiting', 'picking', 'onway'].includes(o.status)
    })
    
    // 优先使用最新创建的订单（最后一个）
    var activeTrip = validOrders.length > 0 ? validOrders[validOrders.length - 1] : null
    
    if (activeTrip && activeTrip.steps && activeTrip.steps.length > 0) {
      // 有真实行程数据
      this.loadRealTrip(activeTrip, callback)
    } else {
      // 没有真实行程，使用mock数据
      this.loadMockTrip(callback)
    }
  },

  loadRealTrip(order, callback) {
    const statusMap = {
      'booked': { class: 'booked', text: '待出发' },
      'waiting': { class: 'waiting', text: '候车中' },
      'onway': { class: 'onway', text: '行程中' },
      'picking': { class: 'picking', text: '接送中' }
    }
    
    const statusInfo = statusMap[order.status] || { class: '', text: '未知' }
    
    // 构建行程信息
    const currentTrip = {
      from: order.from || '',
      fromShort: this._shortenLocationName(order.from || ''),
      to: order.to || '',
      toShort: this._shortenLocationName(order.to || ''),
      name: order.name || '',
      departureTime: order.departureTime || '',
      arrivalTime: order.arrivalTime || '',
      seat: order.seat || '',
      status: order.status,
      displayStatusText: statusInfo.text,
      destCoord: order.destCoord || null,
      fromCoord: order.fromCoord || null
    }
    
    // 构建司机信息
    const currentDriver = {
      name: order.driver || '未知司机',
      plate: order.plate || '未知车牌',
      phone: order.driverPhone || '',
      arrivalTime: ''
    }
    
    // 构建时间线
    const timelineItems = (order.steps || []).map((step, index) => {
      const statusClass = step.status || 'pending'
      const statusTextMap = {
        'completed': '已完成',
        'current': '进行中',
        'pending': '待出发'
      }
      
      return {
        id: 'step-' + (index + 1),
        icon: step.type === 'train' ? '🚄' : '🚕',
        name: step.name || '',
        time: step.time || '',
        desc: step.desc || '',
        status: statusClass,
        statusClass: statusClass,
        statusText: statusTextMap[statusClass] || '待确认',
        driverPhone: step.driverPhone || step.phone || ''
      }
    })
    
    // 构建提醒
    const alerts = []
    const firstStep = order.steps && order.steps[0]
    if (firstStep && firstStep.status === 'completed') {
      alerts.push({
        id: 1,
        type: 'success',
        icon: '✅',
        title: '行程已开始',
        desc: '父母已出发，正在前往' + (firstStep.location || '目的地'),
        time: firstStep.time || ''
      })
    }
    
    var self = this
    this.setData({
      currentTrip: currentTrip,
      currentDriver: currentDriver,
      timelineItems: timelineItems,
      alerts: alerts,
      useMockData: false
    }, function() {
      if (callback) callback()
      self.initMapAfterTripLoad()
    })
  },

  loadMockTrip(callback) {
    var self = this
    this.setData({
      currentTrip: {
        from: '太原',
        fromShort: '太原',
        to: '南京',
        toShort: '南京',
        name: 'G1954',
        departureTime: '08:30',
        arrivalTime: '13:20',
        seat: '二等座 05车 12A',
        status: 'onway',
        displayStatusText: '行程中',
        destCoord: { lat: 32.0584, lng: 118.7969 },
        fromCoord: { lat: 37.7854, lng: 112.6167 }
      },
      currentDriver: {
        name: '王师傅',
        plate: '晋A·88888',
        phone: '13800138001',
        arrivalTime: '07:50'
      },
      timelineItems: [
        {
          id: 'step-1',
          icon: '🚕',
          name: '网约车到太原南站',
          time: '07:30',
          desc: '约20分钟',
          status: 'completed',
          statusClass: 'completed',
          statusText: '已完成',
          driverPhone: '13800138001'
        },
        {
          id: 'step-2',
          icon: '🚄',
          name: '高铁 G1954',
          time: '08:30',
          desc: '约4小时50分',
          status: 'current',
          statusClass: 'current',
          statusText: '进行中',
          driverPhone: ''
        },
        {
          id: 'step-3',
          icon: '🚕',
          name: '网约车到目的地',
          time: '13:30',
          desc: '约40分钟',
          status: 'pending',
          statusClass: '',
          statusText: '待确认',
          driverPhone: '13900139001'
        }
      ],
      alerts: [
        { id: 1, type: 'success', icon: '✅', title: '已到达太原南站', desc: '父母已顺利到达车站，正在候车中', time: '07:52' },
        { id: 2, type: 'warning', icon: '⚠️', title: '距离发车还有20分钟', desc: '请提醒父母准备检票进站', time: '08:10' }
      ],
      useMockData: true
    }, function() {
      if (callback) callback()
      self.initMapAfterTripLoad()
    })
  },

  // 行程数据加载完成后初始化地图
  initMapAfterTripLoad() {
    var trip = this.data.currentTrip
    if (!trip) return
    // 地图初始化等 startRealLocationUpdate 拿到真实位置后再渲染
  },

  onHide() {
    this._isAlive = false
    this.stopMonitoring()
  },

  onUnload() {
    this._isAlive = false
    this.stopMonitoring()
  },

  startMonitoring() {
    if (this._monitorTimer) {
      clearInterval(this._monitorTimer)
      this._monitorTimer = null
    }
    if (this._locationTimer) {
      clearInterval(this._locationTimer)
      this._locationTimer = null
    }

    this._isAlive = true

    this._locationTimer = setInterval(() => {
      if (!this._isAlive) return
      if (this.data.useMockData) {
        this.updateSimulationLocation()
      }
    }, 5000)
  },

  stopMonitoring() {
    if (this._monitorTimer) {
      clearInterval(this._monitorTimer)
      this._monitorTimer = null
    }
    if (this._locationTimer) {
      clearInterval(this._locationTimer)
      this._locationTimer = null
    }
  },

  startRealLocationUpdate() {
    var self = this
    var sharedLocation = app.getParentLocation()
    var trip = this.data.currentTrip

    // 根据角色决定策略：
    // - 子女端(family)：默认使用行程起点/模拟位置，避免把子女手机位置错显示为父母位置
    // - 父母端(elder)：可使用自己的位置（父母的手机即父母本人）
    var currentRole = app.globalData.role || 'elder'
    var canUseLocalShared = (currentRole === 'elder')

    if (sharedLocation && app.globalData.isLocationSharing && canUseLocalShared) {
      if (!Number.isFinite(sharedLocation.latitude) || !Number.isFinite(sharedLocation.longitude)) {
        this.setData({ 
          locationName: '位置异常，请重新获取',
          monitorStatusText: '位置异常'
        })
        return
      }
      
      var lat = sharedLocation.latitude
      var lng = sharedLocation.longitude
      
      this.setData({ 
        locationName: '正在定位...',
        monitorStatusText: '定位中'
      })
      this.setData({
        currentLocation: { lat: lat, lng: lng, name: '正在定位...' }
      })
      this.updateMapMarkers(lat, lng)
      
      var locStr = lng + ',' + lat
      amapService.reverseGeocode(locStr).then(function(result) {
        var locationName = null
        if (result && result.success && result.data) {
          var d = result.data
          // 兼容 building/neighborhood 可能是对象 {name: 'xx'} 或字符串
          var _pick = function(v) {
            if (!v) return ''
            if (typeof v === 'string') return v
            if (typeof v.name === 'string') return v.name
            return ''
          }
          var building = _pick(d.building)
          var neighborhood = _pick(d.neighborhood)
          var township = _pick(d.township || d.township || '')
          var street = _pick(d.street || '')
          var district = _pick(d.district || '')
          var address = _pick(d.address || '')

          // 优先级：楼栋 > 小区 > 街道/乡镇 > 区 > 地址裁剪
          if (building && building.length >= 2) {
            locationName = building
          } else if (neighborhood && neighborhood.length >= 2) {
            locationName = neighborhood
          } else if (street && street.length >= 2) {
            locationName = street
          } else if (township && township.length >= 2) {
            locationName = township
          } else if (district && district.length >= 2) {
            locationName = district
          } else if (address) {
            // 裁剪掉省市区前缀，取更短的后缀
            var clean = address.replace(/^(北京|上海|天津|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|内蒙古|广西|西藏|宁夏|新疆|香港|澳门)[省市自治区]?/, '')
            clean = clean.replace(/^[^\u4e00-\u9fa5]*?/, '')
            if (clean.length > 12) clean = clean.substring(0, 12)
            if (clean.length >= 2) locationName = clean
          }
        }
        if (!locationName) locationName = '当前位置'
        self.setData({
          locationName: locationName,
          monitorStatusText: '监控中'
        })
        self.updateMarkerCallout(locationName)
      }).catch(function() {
        self.setData({
          locationName: '当前位置',
          monitorStatusText: '监控中'
        })
        self.updateMarkerCallout('当前位置')
      })
    } else {
      // 子女端 / 没有位置共享：使用行程起点坐标
      var startLat = 37.7854
      var startLng = 112.6167
      var startName = '太原南站'

      // 优先使用行程自身带的出发地坐标（真实 POI 定位）
      if (trip && trip.fromCoord && Number.isFinite(trip.fromCoord.lat) && Number.isFinite(trip.fromCoord.lng)) {
        startLat = trip.fromCoord.lat
        startLng = trip.fromCoord.lng
        if (trip.from) {
          startName = this._shortenLocationName(trip.from)
        } else {
          startName = '出发地'
        }
      } else if (trip && trip.from) {
        // 没有坐标，用名称做兜底
        startName = this._shortenLocationName(trip.from)
        // 尝试解析城市名
        var cityCoord = this._getCityCoord(trip.from)
        if (cityCoord) {
          startLat = cityCoord.lat
          startLng = cityCoord.lng
        }
      }

      this.setData({
        locationName: startName,
        monitorStatusText: '监控中'
      })
      this.setData({
        currentLocation: { lat: startLat, lng: startLng, name: startName }
      })
      this.updateMapMarkers(startLat, startLng)
    }
  },

  // 把完整 POI 地址精简为可读的短名称
  // 例："山西省太原市小店街道昌盛街68号太原市小店区人民政府" → "小店区人民政府"
  // 例："北京市朝阳区北京站" → "北京站"
  _shortenLocationName(fullAddr) {
    if (!fullAddr) return '出发地'
    // 先尝试找"站"、"机场"、"政府"等关键字
    var keywords = ['站', '机场', '火车站', '南站', '北站', '东站', '西站', '人民政府', '医院', '学校', '广场']
    for (var i = 0; i < keywords.length; i++) {
      var idx = fullAddr.lastIndexOf(keywords[i])
      if (idx > 0) {
        // 向前截取到最近一个"市"/"区"/"县"/"省"
        var before = fullAddr.substring(0, idx)
        var cutIdx = -1
        for (var j = before.length - 1; j >= 0; j--) {
          if ('市区县省'.indexOf(before[j]) >= 0) {
            cutIdx = j
            break
          }
        }
        if (cutIdx >= 0 && idx - cutIdx <= 12) {
          // 距离不远，直接用
        }
        return fullAddr.substring(Math.max(0, cutIdx + 1))
      }
    }
    // 没有关键字，返回最后 10 个字符或去掉前两个行政区
    var cleaned = fullAddr.replace(/^[\u4e00-\u9fa5]{2,3}[省市区]/, '')
    if (cleaned.length > 15) cleaned = cleaned.substring(cleaned.length - 15)
    return cleaned
  },

  // 根据城市名获取粗略坐标（兜底用）
  _getCityCoord(name) {
    if (!name) return null
    var cityMap = {
      '北京': { lat: 39.9042, lng: 116.4074 },
      '上海': { lat: 31.2304, lng: 121.4737 },
      '广州': { lat: 23.1291, lng: 113.2644 },
      '深圳': { lat: 22.5431, lng: 114.0579 },
      '太原': { lat: 37.7870, lng: 112.5489 },
      '南京': { lat: 32.0603, lng: 118.7969 },
      '郑州': { lat: 34.7466, lng: 113.6254 },
      '石家庄': { lat: 38.0428, lng: 114.5149 },
      '西安': { lat: 34.3416, lng: 108.9398 },
      '成都': { lat: 30.5728, lng: 104.0668 },
      '杭州': { lat: 30.2741, lng: 120.1551 },
      '武汉': { lat: 30.5928, lng: 114.3055 },
      '长沙': { lat: 28.2282, lng: 112.9388 },
      '青岛': { lat: 36.0671, lng: 120.3826 },
      '重庆': { lat: 29.4316, lng: 106.9123 },
      '天津': { lat: 39.3434, lng: 117.3616 },
      '沈阳': { lat: 41.8057, lng: 123.4315 },
      '昆明': { lat: 25.0389, lng: 102.7183 },
      '哈尔滨': { lat: 45.8038, lng: 126.5349 },
      '济南': { lat: 36.6512, lng: 116.9972 },
      '合肥': { lat: 31.8206, lng: 117.2272 },
      '福州': { lat: 26.0745, lng: 119.2965 },
      '厦门': { lat: 24.4798, lng: 118.0894 },
      '南昌': { lat: 28.6820, lng: 115.8579 },
      '兰州': { lat: 36.0611, lng: 103.8343 },
      '贵阳': { lat: 26.6470, lng: 106.6302 }
    }
    for (var key in cityMap) {
      if (name.indexOf(key) >= 0) return cityMap[key]
    }
    return null
  },

  // 没有真实位置时的模拟定位（已移除，用行程起点代替）
  simulateLocalization(updateLoc) {
    updateLoc(37.7854, 112.6167, '太原南站')
  },

  // 只更新地图标记的callout文本（不重新设置坐标）
  updateMarkerCallout(name) {
    var markers = this.data.mapData.markers
    if (markers && markers.length > 0) {
      markers[0].callout.content = '父母位置\n' + name
      this.setData({ 'mapData.markers': markers })
    }
  },

  // 更新地图标记
  updateMapMarkers(lat, lng) {
    var trip = this.data.currentTrip
    var markers = [
      {
        id: 1,
        latitude: lat,
        longitude: lng,
        iconPath: '/images/map-start.png',
        width: 36,
        height: 36,
        callout: {
          content: '父母位置\n' + (this.data.locationName || ''),
          color: '#333',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#fff',
          padding: 8,
          display: 'ALWAYS'
        }
      }
    ]
    var polyline = []
    var hasDestination = false
    var destLat = null
    var destLng = null

    // 如果有目的地坐标，添加目的地标记和路线
    if (trip && trip.destCoord) {
      destLat = trip.destCoord.lat
      destLng = trip.destCoord.lng
      markers.push({
        id: 2,
        latitude: destLat,
        longitude: destLng,
        iconPath: '/images/map-end.png',
        width: 36,
        height: 36,
        callout: {
          content: '目的地\n' + (trip.to || ''),
          color: '#333',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#fff',
          padding: 8,
          display: 'ALWAYS'
        }
      })
      polyline = [{
        points: [
          { latitude: lat, longitude: lng },
          { latitude: destLat, longitude: destLng }
        ],
        color: '#5B8DEF',
        width: 4,
        dottedLine: true
      }]
      hasDestination = true
    }

    // 计算地图中心点和缩放级别，确保两个标记都可见
    var centerLat = lat
    var centerLng = lng
    var scale = 14  // 默认街道级别
    if (hasDestination) {
      centerLat = (lat + destLat) / 2
      centerLng = (lng + destLng) / 2
      // 根据距离计算缩放级别：距离越远级别越小
      var dLat = Math.abs(lat - destLat)
      var dLng = Math.abs(lng - destLng)
      var maxDiff = Math.max(dLat, dLng)
      if (maxDiff > 5) scale = 5
      else if (maxDiff > 2) scale = 7
      else if (maxDiff > 1) scale = 9
      else if (maxDiff > 0.5) scale = 11
      else scale = 13
    }

    this.setData({
      'mapData.latitude': centerLat,
      'mapData.longitude': centerLng,
      'mapData.scale': scale,
      'mapData.markers': markers,
      'mapData.polyline': polyline,
      'mapData.hasDestination': hasDestination
    })
  },

  refreshLocation() {
    wx.showToast({ title: '正在刷新位置...', icon: 'none', duration: 1000 })
    // 重置模拟起点，从行程起点重新开始演示
    this._simStartTime = Date.now()
    this.startRealLocationUpdate()
  },

  // 基于页面进入时间推进模拟位置（演示模式）
  // 从太原南 → 南京南，整段行程按 5 分钟真实时间走完
  updateSimulationLocation() {
    var trip = this.data.currentTrip
    if (!trip || !trip.from || !trip.to) {
      return
    }

    // 从页面进入时刻开始，整段模拟行程时长 5 分钟
    var SIM_DURATION_MS = 5 * 60 * 1000
    var elapsed = Date.now() - this._simStartTime
    var progress = Math.max(0, Math.min(1, elapsed / SIM_DURATION_MS))

    var routePoints = [
      { lat: 37.7854, lng: 112.6167, name: '太原南站' },
      { lat: 38.0387, lng: 114.5170, name: '石家庄站' },
      { lat: 34.7458, lng: 113.6254, name: '郑州东站' },
      { lat: 32.0584, lng: 118.7969, name: '南京南站' }
    ]

    var totalSegments = routePoints.length - 1
    var segProgress = progress * totalSegments
    var segIndex = Math.min(Math.floor(segProgress), totalSegments - 1)
    var segFraction = Math.min(1, segProgress - segIndex)
    var p1 = routePoints[segIndex]
    var p2 = routePoints[segIndex + 1] || p1
    var curLat = p1.lat + (p2.lat - p1.lat) * segFraction
    var curLng = p1.lng + (p2.lng - p1.lng) * segFraction
    var defaultName = progress <= 0.01 ? '太原南站'
      : progress >= 1 ? '南京南站'
      : p1.name

    this.deviateCounter++
    if (this.deviateCounter === 10) {
      this.triggerDemoDeviation()
    }

    // Step 1：先渲染标记位置 + 同步更新 callout 文案
    this.setData({
      locationName: defaultName,
      currentLocation: {
        lat: curLat,
        lng: curLng,
        name: defaultName
      }
    })
    this.updateMapMarkers(curLat, curLng)
    this.updateMarkerCallout(defaultName)

    // Step 2：异步调用高德逆地理编码获取真实地名，仅在有足够精度时覆盖
    // 节流：每 8 次 tick 才调一次，避免高频请求
    this._regeoCounter = (this._regeoCounter || 0) + 1
    var shouldCallRegeo = progress <= 0.01 || progress >= 1     // 起点/终点必调
      || segFraction <= 0.02 || segFraction >= 0.98               // 进入/离开站点必调
      || this._regeoCounter % 8 === 0                              // 中途每隔 N 次调一次
    if (shouldCallRegeo) {
      var locStr = curLng + ',' + curLat
      var self = this
      amapService.reverseGeocode(locStr).then(function(result) {
        // 精度校验：只有 building 或 neighborhood 有值时才覆盖默认名称
        // 否则保持"站点名+附近"这种对用户更有意义的描述
        var finalName = defaultName
        var hasPrecise = false
        if (result && result.success && result.data) {
          var d = result.data
          var _pick = function(v) {
            if (!v) return ''
            if (typeof v === 'string') return v
            if (typeof v.name === 'string') return v.name
            return ''
          }
          var building = _pick(d.building)
          var neighborhood = _pick(d.neighborhood)
          var township = _pick(d.township || '')
          var district = _pick(d.district || '')

          // building 有值 => 最精确，直接用
          if (building && building.length >= 2) {
            finalName = building
            hasPrecise = true
          }
          // neighborhood 有值 => 次精确，且长度合理（排除纯区级/市级）
          else if (neighborhood && neighborhood.length >= 3 && neighborhood.length <= 15) {
            finalName = neighborhood
            hasPrecise = true
          }
          // township 有值且不是空泛的街道名
          else if (township && township.length >= 5) {
            finalName = township
            hasPrecise = true
          }
          // district 仅在起点/终点或没有更好选项时才用
          else if (district && (progress <= 0.01 || progress >= 1)) {
            finalName = district
            hasPrecise = true
          }
        }
        // 已到达/即将出发的特殊语义优先，不用逆地理覆盖
        if (progress <= 0.01) finalName = '太原南站'
        if (progress >= 1) finalName = '南京南站'
        self.setData({
          locationName: finalName,
          'currentLocation.name': finalName
        })
        self.updateMarkerCallout(finalName)
      }).catch(function() {
        self.updateMarkerCallout(defaultName)
      })
    }

    this.checkStationaryTime()
  },

  // 定位到行程起点
  _locateAtTripStart(trip) {
    var startLat = 37.7854
    var startLng = 112.6167
    var startName = '太原南站'
    if (trip && trip.from === '太原') {
      startLat = 37.7854
      startLng = 112.6167
      startName = '太原南站'
    } else if (trip && trip.from) {
      startName = trip.from + '站'
    }
    this.setData({
      locationName: startName,
      monitorStatusText: '监控中',
      currentLocation: { lat: startLat, lng: startLng, name: startName }
    })
    this.updateMapMarkers(startLat, startLng)
  },

  checkStationaryTime() {
    const now = Date.now()
    const stationaryMinutes = Math.floor((now - this.data.lastLocationTime) / 60000)
    if (stationaryMinutes >= 15 && !this.data.stationaryAlert) {
      this.triggerDemoStationary()
    }
  },

  speakTripInfo() {
    const trip = this.data.currentTrip
    const text = `当前行程：${trip.from}到${trip.to}，车次${trip.name}，${trip.departureTime}出发，${trip.arrivalTime}到达，座位${trip.seat}。当前状态：${trip.displayStatusText}。`
    
    if (wx.speechSynthesis) {
      wx.speechSynthesis.stop()
      wx.speechSynthesis.speak({
        text: text,
        lang: 'zh_CN',
        rate: 0.8,
        volume: 1.0
      })
    }
    
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '正在朗读行程详情', icon: 'none' })
  },

  callParent() {
    const phone = this.data.parentPhone || '13800138000'
    wx.makePhoneCall({ phoneNumber: phone })
  },

  callDriver() {
    wx.makePhoneCall({ phoneNumber: this.data.currentDriver.phone })
  },

  callStepDriver(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({ phoneNumber: phone })
  },

  goToVolunteer() {
    const parentName = this.data.parentName || ''
    const parentPhone = this.data.parentPhone || ''
    wx.navigateTo({
      url: `/pages/volunteer/volunteer?parentName=${encodeURIComponent(parentName)}&parentPhone=${encodeURIComponent(parentPhone)}`
    })
  },

  shareLocation() {
    wx.showToast({ title: '位置分享功能已开启', icon: 'success' })
  },

  goBack() {
    wx.navigateBack()
  },

  triggerDemoDeviation() {
    var page = this
    var ctx = {
      deviationMeters: 580,
      parentName: page.data.parentName || '父亲',
      routeName: page.data.currentTrip && page.data.currentTrip.tripTitle ? page.data.currentTrip.tripTitle : '太原→南京南',
      currentLocationName: page.data.locationName || '未知位置',
      timestamp: Date.now()
    }
    // Step1：本地规则已触发（偏离>500m）→ 先立即显示本地默认文案，保证实时性
    var fallback = aiService._getDefaultSafetyAlert('deviation', ctx)
    page._applyAlert('deviationAlert', fallback)
    // Step2：并行调用AI agent做二次分析，异步刷新为更人性化的文案（confidence>0.7才刷新，避免瞎改）
    aiService.analyzeSafetyAlert('deviation', ctx).then(function(analysis) {
      if (!analysis || !analysis.title) return
      if ((analysis.confidence || 0) >= 0.7 && analysis.title !== fallback.title) {
        var riskType = _riskType(analysis.riskLevel)
        var icon = _riskIcon(analysis.riskLevel)
        var desc = analysis.desc + (analysis.suggestion ? '｜建议：' + analysis.suggestion : '')
        page.data.alerts[page.data.alerts.length - 1] = {
          id: page.data.alerts[page.data.alerts.length - 1].id,
          type: riskType, icon: icon, title: analysis.title, desc: desc, time: analysis.time
        }
        page.setData({ alerts: page.data.alerts })
        var payload = {}
        payload['deviationAlert'] = {
          id: Date.now(), type: riskType, icon: icon, title: analysis.title, desc: desc, time: analysis.time
        }
        page.setData(payload)
      }
    })
  },

  triggerDemoStationary() {
    var page = this
    var ctx = {
      stationaryMinutes: 18,
      parentName: page.data.parentName || '父亲',
      locationName: page.data.locationName || '当前位置',
      lastMoveAt: Date.now() - 18 * 60 * 1000,
      timestamp: Date.now()
    }
    var fallback = aiService._getDefaultSafetyAlert('stationary', ctx)
    page._applyAlert('stationaryAlert', fallback)
    aiService.analyzeSafetyAlert('stationary', ctx).then(function(analysis) {
      if (!analysis || !analysis.title) return
      if ((analysis.confidence || 0) >= 0.7 && analysis.title !== fallback.title) {
        var riskType = _riskType(analysis.riskLevel)
        var icon = _riskIcon(analysis.riskLevel)
        var desc = analysis.desc + (analysis.suggestion ? '｜建议：' + analysis.suggestion : '')
        page.data.alerts[page.data.alerts.length - 1] = {
          id: page.data.alerts[page.data.alerts.length - 1].id,
          type: riskType, icon: icon, title: analysis.title, desc: desc, time: analysis.time
        }
        page.setData({ alerts: page.data.alerts })
        var payload = {}
        payload['stationaryAlert'] = {
          id: Date.now(), type: riskType, icon: icon, title: analysis.title, desc: desc, time: analysis.time
        }
        page.setData(payload)
      }
    })
  },

  triggerDemoMissedStation() {
    var page = this
    var ctx = {
      stationName: '石家庄站',
      stationType: 'train',
      parentName: page.data.parentName || '父亲',
      missedMinutes: 6,
      currentLocationName: page.data.locationName || '石家庄',
      timestamp: Date.now()
    }
    var fallback = aiService._getDefaultSafetyAlert('missed_station', ctx)
    page._applyAlert('missedStationAlert', fallback)
    aiService.analyzeSafetyAlert('missed_station', ctx).then(function(analysis) {
      if (!analysis || !analysis.title) return
      if ((analysis.confidence || 0) >= 0.7 && analysis.title !== fallback.title) {
        var riskType = _riskType(analysis.riskLevel)
        var icon = _riskIcon(analysis.riskLevel)
        var desc = analysis.desc + (analysis.suggestion ? '｜建议：' + analysis.suggestion : '')
        page.data.alerts[page.data.alerts.length - 1] = {
          id: page.data.alerts[page.data.alerts.length - 1].id,
          type: riskType, icon: icon, title: analysis.title, desc: desc, time: analysis.time
        }
        page.setData({ alerts: page.data.alerts })
        var payload = {}
        payload['missedStationAlert'] = {
          id: Date.now(), type: riskType, icon: icon, title: analysis.title, desc: desc, time: analysis.time
        }
        page.setData(payload)
      }
    })
  },

  triggerDemoArrival() {
    const now = new Date()
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    
    this.setData({
      locationName: '南京南站'
    })
    
    this.data.alerts.push({ id: Date.now(), type: 'success', icon: '✅', title: '到达南京南站', desc: '父母已安全到达目的地，行程圆满结束', time: timeStr })
    this.setData({ alerts: this.data.alerts })
    
    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '🎉 父母已到达目的地', icon: 'success' })
  }
})
