const app = getApp()
const { taxiDrivers } = require('../../data/mock')
const { formatDate, generateOrderId, showToast, showModal, validatePhone } = require('../../utils/index')
const amapService = require('../../services/amap-service')
const baiduAsrService = require('../../services/baidu-asr.js')

// 辅助函数：在POI结果中挑选最匹配的
function _pickBestMatch(keyword, pois) {
  if (!pois || !pois.length) return null
  for (var i = 0; i < pois.length; i++) {
    if (pois[i].name.indexOf(keyword) >= 0) return pois[i]
  }
  for (var j = 0; j < pois.length; j++) {
    if (keyword.indexOf(pois[j].name) >= 0) return pois[j]
  }
  return pois[0]
}

Page({
  data: {
    from: '',
    to: '',
    fromCoord: null,
    toCoord: null,
    area: 'city',
    distance: 0,
    duration: '',
    price: 0,
    drivers: [],
    phone: '',
    time: '',
    passengers: 1,
    currentTrip: null,
    parentName: '',
    parentPhone: '',
    isFromParentLocation: false,
    isGettingLocation: false,
    role: 'elder',
    isRecording: false,
    showVoiceModal: false,
    voiceText: '正在听您说，说完点击下方按钮',
    voiceResult: '',
    // AI视觉强化
    highlightFields: {}
  },

  onLoad(options) {
    var role = app.globalData.role || 'elder'
    this.setData({ role: role })
    this.initDrivers()
    this.checkCurrentTrip()
    this.initRecorder()
    
    // 子女端：自动尝试获取父母位置
    if (role === 'family') {
      this.setData({
        parentName: options && options.parentName ? decodeURIComponent(options.parentName) : '',
        parentPhone: options && options.parentPhone ? decodeURIComponent(options.parentPhone) : '',
        isGettingLocation: true
      })
      this.getParentLocation()
    } else if (options && options.fromParentLocation === '1') {
      this.setData({
        isFromParentLocation: true,
        parentName: options.parentName ? decodeURIComponent(options.parentName) : '',
        parentPhone: options.parentPhone ? decodeURIComponent(options.parentPhone) : '',
        isGettingLocation: true
      })
      this.getParentLocation()
    } else if (role === 'elder') {
      // 老人端：自动定位
      this.autoLocateFrom()
    }
    // 如果是从首页语音跳转过来，自动解析并回填
    if (options && options.voiceText) {
      var v = decodeURIComponent(options.voiceText)
      this.setData({ voiceResult: v })
      var that = this
      setTimeout(function() { that.applyVoiceResult(true) }, 600)
    }
  },

  autoLocateFrom() {
    const self = this
    wx.getLocation({
      type: 'gcj02',
      success: function(res) {
        const amapService = require('../../services/amap-service.js')
        amapService.reverseGeocode(res.longitude + ',' + res.latitude).then(function(result) {
          if (result.success && result.data && result.data.address) {
            self.setData({
              from: result.data.address,
              fromCoord: { lng: res.longitude, lat: res.latitude }
            })
            self.calculatePrice()
          }
        }).catch(function() {})
      },
      fail: function() {}
    })
  },

  onShow() {
    var role = app.globalData.role || 'elder'
    this.setData({ role: role })
    this.checkCurrentTrip()
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    // 确保此页面允许AI助手监听（首页会禁用，离开首页后需要恢复）
    app.globalData.aiPageListenDisabled = false
    var that = this
    // 设置AI页面上下文（丰富版）
    app.globalData.aiPageContext = {
      page: 'taxi',
      title: '打车',
      summary: '打车服务',
      actions: ['出发地定位', '目的地输入', '快捷目的地（医院/家/车站/机场）', '立即呼叫'],
      formFields: ['出发地', '目的地'],
      formData: {
        '出发地': this.data.from || '',
        '目的地': this.data.to || ''
      },
      tips: '出发地已自动定位，输入目的地后点底部红色按钮叫车'
    }
    // 注册AI助手回调
    app.globalData.aiFillCallback = function(payload) {
      that._handleAIFill(payload.fields)
    }
    app.globalData.aiActionCallback = function(payload) {
      if (payload.action === 'call') {
        that.callTaxi()
      }
    }
    app.globalData.aiHighlightCallback = function(payload) {
      that._handleAIHighlight(payload.fields)
    }
  },

  onHide() {
    // 注意：不清空aiFillCallback，因为AI助手可能正在处理语音识别结果
    // 回调只在 onUnload 时清理
  },
  onUnload() {
    if (app.globalData.aiFillCallback) app.globalData.aiFillCallback = null
    if (app.globalData.aiActionCallback) app.globalData.aiActionCallback = null
  },

  // AI助手填表单
  _handleAIFill(fields) {
    console.log('[打车页] 收到AI填表单:', JSON.stringify(fields))
    if (!fields) return
    var that = this
    var from = this.data.from
    var to = this.data.to
    var changed = false

    if (fields['出发地']) {
      from = fields['出发地'].toString().trim()
      changed = true
    }
    if (fields['目的地']) {
      to = fields['目的地'].toString().trim()
      changed = true
    }
    if (!changed) return

    // 立即填充表单（原始值），让用户马上看到结果
    this.setData({ from: from, to: to })
    app.globalData.aiPageContext.formData = { '出发地': from, '目的地': to }
    if (to) this.calculatePrice()
    showToast('已填入：' + to)

    // 异步用高德POI搜索坐标，获取后重新计算价格
    if (from) this.searchAndSetCoord(from, 'from')
    if (to) this.searchAndSetCoord(to, 'to')

    // 异步用高德POI纠正目的地（带类型筛选，避免选到无关POI）
    if (to) {
      const amapService = require('../../services/amap-service.js')
      // 同时搜索交通设施(150)和商务住宅(12)，覆盖各种目的地
      var types = '150100|150200|120000|140000|150300'
      amapService.searchPOI(to, '', types).then(function(poiResult) {
        if (poiResult.success && poiResult.data && poiResult.data.length > 0) {
          var best = _pickBestMatch(to, poiResult.data)
          if (best && best.name && best.name !== to) {
            that.setData({ to: best.name })
            app.globalData.aiPageContext.formData['目的地'] = best.name
            that.calculatePrice()
          }
        }
      }).catch(function() {})
    }
  },

  // AI视觉强化：高亮指定字段
  _handleAIHighlight(fieldNames) {
    if (!fieldNames || !fieldNames.length) return
    var highlightFields = {}
    for (var i = 0; i < fieldNames.length; i++) {
      highlightFields[fieldNames[i]] = true
    }
    this.setData({ highlightFields: highlightFields })
    var that = this
    setTimeout(function() {
      that.setData({ highlightFields: {} })
    }, 2500)
  },

  goBack() {
    wx.navigateBack()
  },

  onHide() {
    this.showExitReminder()
  },

  showExitReminder() {
    const trip = this.data.currentTrip
    if (!trip) return

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    if (trip.date !== today) return

    const key = 'exit_remind_' + trip.orderId + '_' + today
    if (wx.getStorageSync(key)) return

    wx.setStorageSync(key, true)

    const firstStep = trip.steps && trip.steps[0]
    const plate = trip.plate || (firstStep && firstStep.plate) || '请查看详情'

    if (getCurrentPages().length === 0) return
    try {
      wx.showModal({
        title: '📋 今日行程提醒',
        content: trip.name + '\n' + trip.from + ' → ' + trip.to + '\n\n⏰ 出发时间：' + (trip.departureTime || '') + '\n💺 座位号：' + (trip.seat || '请查看详情') + '\n🚗 接站车牌：' + plate + '\n\n请提前做好出行准备！',
        showCancel: true,
        cancelText: '保存卡片',
        confirmText: '我知道了',
        success: (res) => {
          if (!res.confirm) {
            wx.navigateTo({
              url: '/pages/order-detail/order-detail?orderId=' + trip.orderId
            })
          }
        }
      })
    } catch (e) {}
  },

  checkCurrentTrip() {
    const orders = app.globalData.orders || []
    const today = new Date().toISOString().split('T')[0]
    
    let currentTrip = orders.find(o => {
      return o.date === today && ['booked', 'waiting', 'picking', 'onway'].includes(o.status)
    })
    
    if (!currentTrip) {
      const hasShownDemo = wx.getStorageSync('demoTripShown')
      if (!hasShownDemo) {
        currentTrip = {
          orderId: 'DEMO001',
          type: 'train',
          status: 'booked',
          date: today,
          from: '太原',
          to: '南京',
          name: 'G1954',
          departureTime: '08:30',
          arrivalTime: '13:20',
          seat: '二等座 05车 12A',
          price: 590,
          steps: [
            { type: 'taxi', name: '网约车到太原南站', time: '07:30', status: 'pending', plate: '晋A·88888', driver: '王师傅' },
            { type: 'train', name: '高铁 G1954', time: '08:30', status: 'pending', seat: '二等座 05车 12A', platform: '3站台' },
            { type: 'taxi', name: '网约车到目的地', time: '13:30', status: 'pending', plate: '苏A·66666', driver: '李师傅' }
          ]
        }
      }
    }
    
    this.setData({ currentTrip: currentTrip || null })
  },

  initDrivers() {
    const drivers = taxiDrivers.map(d => ({
      ...d,
      distance: (Math.random() * 3 + 0.5).toFixed(1)
    }))
    this.setData({
      drivers
    })
  },

  onFromInput(e) {
    const from = e.detail.value
    this.setData({ from: from })
    this.searchAndSetCoord(from, 'from')
    this.calculatePrice()
  },

  onToInput(e) {
    const to = e.detail.value
    this.setData({ to: to })
    this.searchAndSetCoord(to, 'to')
    this.calculatePrice()
  },

  searchAndSetCoord(address, field) {
    if (!address || address.trim().length < 2) return
    var self = this
    amapService.searchPOI(address).then(function(result) {
      var pois = null
      if (result && result.data && Array.isArray(result.data)) {
        pois = result.data
      } else if (result && result.pois && Array.isArray(result.pois)) {
        pois = result.pois
      }
      if (pois && pois.length > 0) {
        var poi = pois[0]
        var locationStr = poi.location || (poi.lng && poi.lat ? poi.lng + ',' + poi.lat : '')
        if (locationStr) {
          var parts = locationStr.split(',')
          var lng = parseFloat(parts[0])
          var lat = parseFloat(parts[1])
          if (Number.isFinite(lng) && Number.isFinite(lat)) {
            var coordKey = field + 'Coord'
            var updateData = {}
            updateData[coordKey] = { lng: lng, lat: lat }
            self.setData(updateData)
            self.calculatePrice()
          }
        }
      }
    }).catch(function(err) {
      console.log('POI search failed for ' + address + ':', err)
    })
  },

  async useCurrentLocation() {
    var role = this.data.role

    // 子女端：优先从云数据库获取父母位置（跨设备）
    if (role === 'family') {
      wx.showLoading({ title: '获取父母位置...' })
      var self = this

      // 先从云数据库获取（跨设备实时位置）
      try {
        var cloudLoc = await app.getParentLocationFromCloud()
        if (cloudLoc && Number.isFinite(cloudLoc.latitude) && Number.isFinite(cloudLoc.longitude)) {
          // 云数据库有位置，使用它
          var sharedLocation = {
            latitude: cloudLoc.latitude,
            longitude: cloudLoc.longitude,
            accuracy: cloudLoc.accuracy || 0
          }
          amapService.reverseGeocode(sharedLocation.longitude + ',' + sharedLocation.latitude).then(function(result) {
            wx.hideLoading()
            if (result.success && result.data) {
              self.setData({
                from: result.data.address || '父母当前位置',
                fromCoord: { lng: sharedLocation.longitude, lat: sharedLocation.latitude }
              })
            } else {
              var coordAddr = '父母位置(' + sharedLocation.latitude.toFixed(4) + ',' + sharedLocation.longitude.toFixed(4) + ')'
              self.setData({
                from: coordAddr,
                fromCoord: { lng: sharedLocation.longitude, lat: sharedLocation.latitude }
              })
            }
            showToast('已获取父母实时位置')
            self.calculatePrice()
          }).catch(function() {
            wx.hideLoading()
            var coordAddr = '父母位置(' + sharedLocation.latitude.toFixed(4) + ',' + sharedLocation.longitude.toFixed(4) + ')'
            self.setData({
              from: coordAddr,
              fromCoord: { lng: sharedLocation.longitude, lat: sharedLocation.latitude }
            })
            showToast('已获取父母位置')
            self.calculatePrice()
          })
          return
        }
      } catch (err) {
        console.log('云数据库获取父母位置失败，尝试本地共享:', err)
      }

      // 云数据库没有，尝试本地共享位置（同设备演示）
      var sharedLocation = app.getParentLocation()
      if (sharedLocation && Number.isFinite(sharedLocation.latitude) && Number.isFinite(sharedLocation.longitude)) {
        amapService.reverseGeocode(sharedLocation.longitude + ',' + sharedLocation.latitude).then(function(result) {
          wx.hideLoading()
          if (result.success && result.data) {
            self.setData({
              from: result.data.address || '父母当前位置',
              fromCoord: { lng: sharedLocation.longitude, lat: sharedLocation.latitude }
            })
          } else {
            var coordAddr = '父母位置(' + sharedLocation.latitude.toFixed(4) + ',' + sharedLocation.longitude.toFixed(4) + ')'
            self.setData({
              from: coordAddr,
              fromCoord: { lng: sharedLocation.longitude, lat: sharedLocation.latitude }
            })
          }
          showToast('已获取父母位置')
          self.calculatePrice()
        }).catch(function() {
          wx.hideLoading()
          var coordAddr = '父母位置(' + sharedLocation.latitude.toFixed(4) + ',' + sharedLocation.longitude.toFixed(4) + ')'
          self.setData({
            from: coordAddr,
            fromCoord: { lng: sharedLocation.longitude, lat: sharedLocation.latitude }
          })
          showToast('已获取父母位置')
          self.calculatePrice()
        })
        return
      }

      // 都没有位置
      wx.hideLoading()
      wx.showModal({
        title: '未获取到父母位置',
        content: '父母尚未开启位置共享，是否使用您的当前位置？',
        confirmText: '用我的位置',
        cancelText: '取消',
        confirmColor: '#FF8C42',
        success: function(res) {
          if (res.confirm) {
            self._locateSelf()
          }
        }
      })
      return
    }

    // 老人端：使用自己的定位
    this._locateSelf()
  },

  async _locateSelf() {
    wx.showLoading({ title: '定位中...' })
    try {
      const result = await amapService.getCurrentLocation()
      wx.hideLoading()
      
      if (result.success) {
        this.setData({
          from: result.address,
          fromCoord: { lng: result.longitude, lat: result.latitude }
        })
        showToast('已定位到当前位置')
        this.calculatePrice()
      } else {
        showToast('定位失败：' + (result.error || '请检查GPS'))
      }
    } catch (err) {
      wx.hideLoading()
      console.error('定位异常:', err)
      showToast('定位失败，请检查位置权限')
    }
  },

  swapFromTo() {
    const oldFrom = this.data.from
    const oldFromCoord = this.data.fromCoord
    this.setData({
      from: this.data.to,
      fromCoord: this.data.toCoord,
      to: oldFrom,
      toCoord: oldFromCoord
    })
    this.calculatePrice()
  },

  getParentLocation() {
    const sharedLocation = app.getParentLocation()
    
    if (sharedLocation && app.globalData.isLocationSharing) {
      if (!Number.isFinite(sharedLocation.latitude) || !Number.isFinite(sharedLocation.longitude)) {
        this.setData({ from: '位置异常，请手动输入', isGettingLocation: false })
        return
      }
      
      this.setData({
        fromCoord: { lng: sharedLocation.longitude, lat: sharedLocation.latitude }
      })
      
      this.reverseGeocode(sharedLocation.latitude, sharedLocation.longitude, (address) => {
        const location = address || `当前位置 (${sharedLocation.latitude.toFixed(4)}, ${sharedLocation.longitude.toFixed(4)})`
        
        this.setData({
          from: location,
          isGettingLocation: false
        })
        this.calculatePrice()
        
        wx.showModal({
          title: '📍 已获取父母实时位置',
          content: `父母已开启位置共享，当前位置：\n${location}\n\n是否使用此位置作为上车点？`,
          confirmText: '使用此位置',
          cancelText: '手动修改',
          success: (res) => {
            if (res.confirm) {
              showToast('已使用父母实时位置')
            }
          }
        })
      })
    } else {
      wx.showModal({
        title: '父母未开启位置共享',
        content: '父母尚未开启位置共享，是否手动选择父母当前位置？',
        confirmText: '选择位置',
        cancelText: '使用默认地址',
        success: (res) => {
          if (res.confirm) {
            wx.chooseLocation({
              success: (res) => {
                const location = res.name || res.address
                this.setData({
                  from: location,
                  isGettingLocation: false
                })
                showToast('已选择父母位置')
              },
              fail: () => {
                this.useDefaultLocation()
              }
            })
          } else {
            this.useDefaultLocation()
          }
        }
      })
    }
  },

  async reverseGeocode(lat, lng, callback) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      callback(null)
      return
    }
    
    try {
      const locationStr = `${lng},${lat}`
      const result = await amapService.reverseGeocode(locationStr)
      if (result.success && result.data && result.data.address) {
        callback(result.data.address)
      } else {
        callback(null)
      }
    } catch (err) {
      console.error('逆地理编码失败:', err)
      callback(null)
    }
  },

  async useDefaultLocation() {
    wx.showLoading({ title: '定位中...' })
    try {
      const result = await amapService.getCurrentLocation()
      wx.hideLoading()
      
      if (result.success) {
        this.setData({
          from: result.address,
          isGettingLocation: false
        })
        showToast('已定位到当前位置')
      } else {
        this.setData({
          from: '定位失败，请手动输入',
          isGettingLocation: false
        })
        showToast('定位失败，请手动输入地址')
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({
        from: '定位失败，请手动输入',
        isGettingLocation: false
      })
      showToast('定位失败，请手动输入地址')
    }
  },

  switchArea(e) {
    const area = e.currentTarget.dataset.area
    this.setData({
      area
    })
    this.calculatePrice()
  },

  calculatePrice() {
    if (!this.data.from || !this.data.to) {
      this.setData({
        distance: 0,
        duration: '',
        price: 0
      })
      return
    }

    const fromCoord = this.data.fromCoord || this.getDefaultCoord(this.data.from)
    const toCoord = this.data.toCoord || this.getDefaultCoord(this.data.to)
    
    if (!fromCoord || !toCoord) {
      this.setData({ distance: 3, duration: '15分钟', price: 13 })
      return
    }
    
    const dx = (toCoord.lng - fromCoord.lng) * 111 * Math.cos((fromCoord.lat + toCoord.lat) / 2 * Math.PI / 180)
    const dy = (toCoord.lat - fromCoord.lat) * 111
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    let price = 0
    let duration = ''
    if (dist > 300) {
      this.setData({ distance: Math.round(dist), duration: '跨城距离', price: 0 })
      return
    }
    if (dist <= 3) {
      price = 13
    } else if (dist <= 15) {
      price = 13 + (dist - 3) * 2.3
    } else if (dist <= 50) {
      price = 13 + 12 * 2.3 + (dist - 15) * 3.45
    } else {
      price = 13 + 12 * 2.3 + 35 * 3.45 + (dist - 50) * 2.5
    }
    
    price = Math.round(price)
    if (price > 300) price = 300
    const durationMins = Math.max(5, Math.round(dist * 1.2))
    duration = durationMins + '分钟'
    if (durationMins >= 60) {
      duration = Math.floor(durationMins / 60) + '小时' + (durationMins % 60 > 0 ? (durationMins % 60) + '分' : '')
    }
    
    this.setData({
      distance: Math.round(dist),
      duration,
      price
    })
  },
  
  getDefaultCoord(address) {
    const cityCoords = {
      '太原': { lng: 112.549248, lat: 37.857014 },
      '南京': { lng: 118.796875, lat: 32.060255 },
      '北京': { lng: 116.407395, lat: 39.904211 },
      '上海': { lng: 121.473701, lat: 31.230416 },
      '杭州': { lng: 120.153576, lat: 30.287459 },
      '广州': { lng: 113.264385, lat: 23.129110 },
      '深圳': { lng: 114.057964, lat: 22.543099 },
      '成都': { lng: 104.066801, lat: 30.572816 },
      '重庆': { lng: 106.551556, lat: 29.563009 },
      '武汉': { lng: 114.305469, lat: 30.593168 },
      '西安': { lng: 108.948024, lat: 34.261894 },
      '郑州': { lng: 113.625346, lat: 34.746644 },
      '长沙': { lng: 112.938828, lat: 28.228024 },
      '天津': { lng: 117.200755, lat: 39.084158 },
      '青岛': { lng: 120.333566, lat: 36.067121 },
      '沈阳': { lng: 123.432894, lat: 41.805643 },
      '哈尔滨': { lng: 126.642464, lat: 45.803756 },
      '合肥': { lng: 117.227219, lat: 31.820651 },
      '石家庄': { lng: 114.514896, lat: 38.042309 },
      '济南': { lng: 117.000923, lat: 36.675807 },
      '昆明': { lng: 102.712251, lat: 24.881168 },
      '福州': { lng: 119.296475, lat: 26.075302 },
      '南昌': { lng: 115.859484, lat: 28.682866 },
      '兰州': { lng: 103.834341, lat: 36.061122 },
      '贵阳': { lng: 106.630465, lat: 26.647535 },
      '南宁': { lng: 108.371797, lat: 22.817029 },
      '厦门': { lng: 118.089425, lat: 24.479833 },
      '苏州': { lng: 120.619585, lat: 31.299379 },
      '大连': { lng: 121.614761, lat: 38.914063 },
      '长春': { lng: 125.324521, lat: 43.817071 },
      '太原南站': { lng: 112.606739, lat: 37.775063 },
      '北京站': { lng: 116.420868, lat: 39.901067 },
      '南京南站': { lng: 118.817413, lat: 31.942595 },
      '广州南站': { lng: 113.268448, lat: 23.044243 },
      '杭州东站': { lng: 120.157953, lat: 30.246638 },
      '成都东站': { lng: 104.146152, lat: 30.621894 },
      '重庆西站': { lng: 106.327782, lat: 29.886919 },
      '西安北站': { lng: 108.946023, lat: 34.258312 },
      '郑州东站': { lng: 113.740334, lat: 34.747245 },
      '长沙南站': { lng: 112.979357, lat: 28.151638 },
      '武汉站': { lng: 114.416790, lat: 30.597214 },
      '天津站': { lng: 117.201184, lat: 39.137129 },
      '合肥南站': { lng: 117.283042, lat: 31.806210 },
      '福州站': { lng: 119.296475, lat: 26.106053 },
      '厦门北站': { lng: 118.089425, lat: 24.616939 }
    }
    
    if (cityCoords[address]) return cityCoords[address]
    
    for (const key in cityCoords) {
      if (address && address.indexOf(key) >= 0) return cityCoords[key]
    }
    
    return { lng: 116.407395, lat: 39.904211 }
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    })
  },

  onPassengersInput(e) {
    this.setData({
      passengers: e.detail.value
    })
  },

  showTimePicker() {
    const today = new Date()
    wx.showActionSheet({
      itemList: [
        `${formatDate(today)} ${today.getHours()}:30`,
        `${formatDate(today)} ${today.getHours() + 1}:00`,
        `${formatDate(today)} ${today.getHours() + 2}:00`,
        `${formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))} 09:00`
      ],
      success: (res) => {
        const times = [
          `${formatDate(today)} ${today.getHours()}:30`,
          `${formatDate(today)} ${today.getHours() + 1}:00`,
          `${formatDate(today)} ${today.getHours() + 2}:00`,
          `${formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))} 09:00`
        ]
        this.setData({
          time: times[res.tapIndex]
        })
      }
    })
  },

  async callTaxi() {
    if (!this.data.from) {
      showToast('请输入出发地')
      return
    }
    if (!this.data.to) {
      showToast('请输入目的地')
      return
    }

    if (this.data.area === 'remote') {
      if (!this.data.phone || !validatePhone(this.data.phone)) {
        showToast('请输入正确的联系电话')
        return
      }
      if (!this.data.time) {
        showToast('请选择用车时间')
        return
      }

      const confirmed = await showModal('确认预约', `您即将预约偏远地区用车\n出发地: ${this.data.from}\n目的地: ${this.data.to}\n用车时间: ${this.data.time}\n乘客人数: ${this.data.passengers}\n预估费用: ¥${this.data.price}\n我们将尽快为您联系车辆`)
      
      if (confirmed) {
        const order = {
          orderId: generateOrderId(),
          type: 'taxi',
          subType: 'remote',
          start: this.data.from,
          end: this.data.to,
          phone: this.data.phone,
          time: this.data.time,
          passengers: this.data.passengers,
          price: this.data.price,
          status: 'waiting'
        }

        app.addOrder(order)
        showToast('预约成功，我们将尽快联系您', 'success')
        
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/orders/orders'
          })
        }, 1500)
      }
    } else {
      const confirmed = await showModal('确认呼叫', `您即将呼叫网约车\n出发地: ${this.data.from}\n目的地: ${this.data.to}\n预估距离: ${this.data.distance}公里\n预估费用: ¥${this.data.price}`)
      
      if (confirmed) {
        wx.showLoading({ title: '正在呼叫司机...' })
        
        setTimeout(() => {
          wx.hideLoading()
          
          const randomDriver = this.data.drivers[Math.floor(Math.random() * this.data.drivers.length)]
          const order = {
            orderId: generateOrderId(),
            type: 'taxi',
            subType: 'online',
            start: this.data.from,
            end: this.data.to,
            driver: randomDriver,
            distance: this.data.distance,
            duration: this.data.duration,
            price: this.data.price,
            status: 'picking'
          }

          app.addOrder(order)
          
          wx.navigateTo({
            url: `/pages/taxi-detail/taxi-detail?orderId=${order.orderId}`
          })
        }, 2000)
      }
    }
  },

  // 语音相关
  initRecorder() {
    const recorderManager = wx.getRecorderManager()
    recorderManager.onStop((res) => {
      console.log('录音停止, 文件路径:', res.tempFilePath)
      this.handleVoiceResult(res.tempFilePath)
    })
    recorderManager.onError((err) => {
      console.error('录音失败：', err)
      this.setData({
        isRecording: false,
        voiceText: '录音失败，请检查麦克风权限',
        showVoiceModal: true
      })
    })
  },

  startRecord() {
    this.setData({
      isRecording: true,
      showVoiceModal: true,
      voiceText: '请说话，说完点下方按钮',
      voiceResult: ''
    })
    const recorderManager = wx.getRecorderManager()
    // 重新注册回调（因为AI助手的录音会覆盖页面的回调）
    recorderManager.onStop((res) => {
      console.log('录音停止, 文件路径:', res.tempFilePath)
      this.handleVoiceResult(res.tempFilePath)
    })
    recorderManager.onError((err) => {
      console.error('录音失败：', err)
      this.setData({
        isRecording: false,
        voiceText: '录音失败，请检查麦克风权限',
        showVoiceModal: true
      })
    })
    recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'pcm'
    })
  },

  stopRecord() {
    if (!this.data.isRecording) return
    const recorderManager = wx.getRecorderManager()
    recorderManager.stop()
    this.setData({
      isRecording: false,
      voiceText: '正在识别...'
    })
  },

  handleVoiceResult(tempFilePath) {
    baiduAsrService.recognizeSpeech(tempFilePath).then((res) => {
      if (res.success && res.text) {
        this.setData({
          voiceText: '识别成功',
          voiceResult: res.text
        })
      } else {
        this.setData({
          voiceText: '识别失败，请重试',
          voiceResult: ''
        })
      }
    }).catch((error) => {
      console.error('语音识别错误:', error)
      this.setData({
        voiceText: '识别失败，请重试',
        voiceResult: ''
      })
    })
  },

  applyVoiceResult(silentFromRoute) {
    const text = this.data.voiceResult
    if (!text) return

    // 净化：去掉意图词/语气词，只留地址信息
    var cleanText = text
      .replace(/^.*?(我想|我要|我打算|帮我|请|麻烦你|能不能|能不能帮我|给我|帮我打|帮我叫|给我叫|叫个|打个|叫|打|坐|乘坐|去打车|去叫车)/, '')
      .replace(/(打车|叫车|出租车|快车|滴滴|网约车|约车|拦车|接|送|接人|送人|去接|去送)/g, '')
      .replace(/嗯|啊|呀|哎|哦|呐|吧|嘛|呢/g, '')
      .trim()
    if (!cleanText) cleanText = text

    let from = ''
    let to = ''

    // 提取出发地和目的地
    const routePatterns = [
      /从(.+?)(?:到|去|出发|走)/,
      /(.+?)(?:到|去|前往|直达|去接|去送)(.+?)(?:的|看|找|玩|走|早上|上午|下午|晚上|明天|后天|大后天|今天|$)/,
      /(.+?)(?:到|去|前往|直达|去接|去送)(.+)/
    ]
    for (const p of routePatterns) {
      const m = cleanText.match(p)
      if (m) {
        from = (m[1] || '').trim()
        if (m[2]) to = (m[2]).trim()
        break
      }
    }

    // 如果没提取到，用整句话作为目的地（再次净化时间和语气词）
    if (!to && !from) {
      var raw = cleanText
        .replace(/(早上|上午|下午|晚上|中午|凌晨|天亮|明早|明晚|一早|一晚|现在|马上|立刻|赶紧)/g, '')
        .replace(/(明天|后天|大后天|今天|这两天|周末|周日|周六|周一|周二|周三|周四|周五)/g, '')
        .replace(/[，。、,.;:：；\s]/g, '')
        .trim()
      if (raw) to = raw
    } else if (!to && from) {
      to = from
      from = ''
    }

    // 出发地已经 autoLocate 结果，不要覆盖
    if (this.data.from) from = this.data.from

    const self = this
    if (to) {
      amapService.searchPOI(to).then(function(poiResult) {
        if (poiResult.success && poiResult.data && poiResult.data.length > 0) {
          to = poiResult.data[0].name
        }
        var updateData = { to: to, showVoiceModal: false }
        if (from) updateData.from = from
        self.setData(updateData)
        // 填入后自动更新预估信息
        if (self.data.from && to) {
          self.calculatePrice()
        }
        if (!silentFromRoute) {
          showToast('已填入：' + (from ? from + ' → ' : '') + to)
        }
      }).catch(function() {
        var updateData = { to: to, showVoiceModal: false }
        if (from) updateData.from = from
        self.setData(updateData)
        if (self.data.from && to) {
          self.calculatePrice()
        }
        if (!silentFromRoute) {
          showToast('已填入：' + (from ? from + ' → ' : '') + to)
        }
      })
    } else {
      this.setData({ showVoiceModal: false })
      if (!silentFromRoute) showToast('未识别到目的地，请手动输入')
    }
  },

  hideVoiceModal() {
    this.setData({
      showVoiceModal: false,
      isRecording: false
    })
  },

  preventBubble() {
    // 阻止事件冒泡
  },

  setQuickTo(e) {
    const to = e.currentTarget.dataset.to
    this.setData({ to: to })
    this.searchAndSetCoord(to, 'to')
    this.calculatePrice()
  }
})