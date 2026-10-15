const app = getApp()
const { formatDate, getDistance } = require('../../utils/index')
const travelService = require('../../services/travel.js')
const amapService = require('../../services/amap-service.js')
const apiConfig = require('../../config/api.js')
const ttsService = require('../../services/baidu-tts.js')

Page({
  data: {
    from: '太原',
    to: '',
    scene: '',
    date: formatDate(new Date()),
    today: formatDate(new Date()),

    loadingPlans: false,
    plans: [],
    plansError: '',

    transitMode: {},
    confirmedSegments: {},
    processingSegment: '',
    expandedPlanId: '',
    savedPlanIds: [],
    taxiInfo: {},

    distance: 0,
    centerLng: 112.549248,
    centerLat: 37.857014,
    mapScale: 6,
    markers: [],
    polyline: [],
    hasSearched: false,

    searchResults: [],
    showSearchResults: false,
    searchKeyword: '',
    isSearching: false,
    
    isTtsPlaying: false,
    isTtsLoop: false,
    currentTtsPlanId: '',

    role: 'elder',
    aiAssistantEnabled: false
  },

  goBack() {
    var pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  onLoad(options) {
    var today = formatDate(new Date())
    var role = app.globalData.role || 'elder'
    this.setData({ date: today, today: today, role: role })

    if (options.scene) {
      this.setData({ scene: options.scene })
    }

    if (options.date) {
      var dateVal = decodeURIComponent(options.date)
      if (dateVal === '明天') {
        var tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        this.setData({ date: formatDate(tomorrow) })
      } else if (dateVal === '后天') {
        var dayAfter = new Date()
        dayAfter.setDate(dayAfter.getDate() + 2)
        this.setData({ date: formatDate(dayAfter) })
      }
    }

    if (options.time) {
      this.setData({ time: decodeURIComponent(options.time) })
    }

    if (options.to) {
      this.setData({ to: decodeURIComponent(options.to) })
      this.autoLocateAndSearch()
    } else if (options.from === 'voice' && options.voiceText) {
      var rawText = decodeURIComponent(options.voiceText)
      var dest = this.extractDestination(rawText)
      var dateVal = this.extractDateFromText(rawText)
      var timeVal = this.extractTimeFromText(rawText)
      console.log('语音识别原文:', rawText, '提取目的地:', dest, '日期:', dateVal, '时间:', timeVal)
      this.setData({ to: dest || '南京' })
      if (dateVal) {
        if (dateVal === '明天') {
          var tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          this.setData({ date: formatDate(tomorrow) })
        } else if (dateVal === '后天') {
          var dayAfter = new Date()
          dayAfter.setDate(dayAfter.getDate() + 2)
          this.setData({ date: formatDate(dayAfter) })
        } else if (dateVal === '今天') {
          this.setData({ date: today })
        }
      }
      if (timeVal) {
        this.setData({ time: timeVal })
      }
      this.autoLocateAndSearch()
    } else {
      this.autoLocate()
    }
  },

  onShow() {
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    // 行程规划页：AI助手只播报页面介绍，不进入监听（用页面大麦克风代替）
    app.globalData.aiPageListenDisabled = true
    app.globalData.aiPageContext = {
      page: 'map-trip',
      title: '行程规划',
      summary: 'AI帮您规划出行方案',
      actions: ['出发地输入', '目的地输入', '选择出发时间', '开始规划', '查看方案'],
      formFields: ['出发地', '目的地', '出发时间'],
      formData: {
        '出发地': this.data.from || '',
        '目的地': this.data.to || '',
        '出发时间': this.data.departTime || ''
      },
      tips: '输入出发地和目的地，选好时间，点开始规划就能看到多种出行方案'
    }
  },

  onHide() {
    // 离开页面时恢复监听模式
    app.globalData.aiPageListenDisabled = false
  },

  autoLocate() {
    var self = this
    amapService.getCurrentLocation().then(function(result) {
      if (result.success) {
        self.setData({
          from: result.address,
          fromCoord: { lng: result.longitude, lat: result.latitude }
        })
      }
    }).catch(function() {})
  },

  autoLocateAndSearch() {
    var self = this
    amapService.getCurrentLocation().then(function(result) {
      if (result.success) {
        self.setData({
          from: result.address,
          fromCoord: { lng: result.longitude, lat: result.latitude }
        })
      }
      self.searchPlans()
    }).catch(function() {
      self.searchPlans()
    })
  },

  extractDestination(text) {
    if (!text) return ''

    // 强净化：先去掉意图词、语气词、订票/打车语义，只留下地址/地名
    var cleanText = text
      .replace(/(我想|我要|我打算|想|要|打算|计划|准备|希望|想让|想请|想叫|想打|想买|想订|想走|想起|想去|想到|帮我|麻烦|请|劳烦|能不能|可以|给我|安排|一下|一趟|一会|一会儿|吧|嘛|呢|呐|啊|嗯|哦|呀|哎|喂|哈喽|你好|您好)/g, '')
      .replace(/(买票|购票|订票|火车票|车票|高铁|动车|火车|打车|叫车|出租车|快车|约车|拦车|滴滴|网约车|接人|送人|接|送|去接|去送|订一张|买一张|换乘|转车|改签|退票)/g, '')
      .replace(/(早上|上午|下午|晚上|中午|凌晨|天亮|明早|明晚|一早|一晚|现在|马上|立刻|赶紧|几点|什么时候|时间)/g, '')
      .replace(/(明天|后天|大后天|今天|这两天|周末|周日|周六|周一|周二|周三|周四|周五|下周|下周一|下星期)/g, '')
      .replace(/[，。、,.;:：；!！?？\s"'"'（）()《》【】\[\]]/g, '')
      .trim()
    if (!cleanText) cleanText = text
    
    var dest = ''
    
    var actionWords = '看|找|玩|办事|办点事|拿药|取|办|坐|看孙子|看病|复查|接人|接|送人|送|看望|探望|吃饭|买|逛|去|一趟'
    
    var patterns = [
      new RegExp('去(.+?)(?:' + actionWords + '|$)'),
      new RegExp('到(.+?)(?:' + actionWords + '|$)'),
      new RegExp('去(.+)'),
      new RegExp('到(.+)')
    ]
    
    for (var i = 0; i < patterns.length; i++) {
      var m = cleanText.match(patterns[i])
      if (m && m[1]) {
        dest = m[1].trim()
        break
      }
    }
    
    if (!dest || dest === cleanText) {
      if (cleanText.indexOf('回家') >= 0) {
        dest = '家'
      } else if (cleanText.indexOf('回') >= 0) {
        var homeMatch = cleanText.match(/回(.+)/)
        if (homeMatch && homeMatch[1]) {
          dest = homeMatch[1].trim()
        } else {
          dest = '家'
        }
      }
    }
    
    var cityNames = ['太原南站','太原站','北京西站','北京南站','北京站','上海虹桥站','上海站',
      '南京南站','南京站','杭州东站','广州南站','深圳北站','成都东站','重庆北站','西安北站',
      '武汉站','郑州东站','长沙南站','天津站','合肥南站','福州南站','厦门北站',
      '太原','北京','上海','南京','杭州','广州','深圳','成都','重庆','西安','武汉','郑州',
      '长沙','天津','合肥','沈阳','哈尔滨','石家庄','济南','青岛','大连','苏州','无锡',
      '宁波','厦门','福州','南昌','昆明','贵阳','南宁','兰州','银川','西宁','拉萨',
      '呼和浩特','乌鲁木齐','长春','火车站','高铁站','机场','县医院','省人民医院',
      '社区医院','中心医院','中医院','银行','超市','菜市场','人民公园','市政府',
      '老干部活动中心','地铁','地铁站','公司','单位','学校','幼儿园','小学','中学']
    
    var sortedCities = cityNames.sort(function(a, b) { return b.length - a.length })
    
    if (!dest || dest === cleanText) {
      for (var j = 0; j < sortedCities.length; j++) {
        if (cleanText.indexOf(sortedCities[j]) >= 0) {
          dest = sortedCities[j]
          break
        }
      }
    } else {
      for (var k = 0; k < sortedCities.length; k++) {
        if (dest.indexOf(sortedCities[k]) >= 0) {
          dest = sortedCities[k]
          break
        }
      }
    }
    
    // 如果还没有，用净化后的整段（再做一轮替换）
    if (!dest || dest === cleanText) {
      dest = cleanText.replace(/我要|帮我|明天|后天|今天|下周|上午|下午|去|到|坐|从|高铁|火车|打车|叫个车|接人|接|送人|送|一下|一趟/g, '').trim()
    }

    // 最后兜底：如果 dest 还包含"我想/嗯/啊"这类不干净的词，直接置空，避免错误POI
    var badWords = /^(我想|我想嗯|我想啊|我想去|我要|嗯|啊|哦|呀|呢|吧|的|去|到|走|去去|去去去|打|打打|打车|叫|叫车|买|买票|订|订票|高铁|火车)$/
    if (dest && (badWords.test(dest) || dest.length <= 1)) {
      dest = ''
    }
    
    if (dest.length > 10) {
      var idx = -1
      for (var n = 0; n < sortedCities.length; n++) {
        var p = dest.indexOf(sortedCities[n])
        if (p >= 0 && (idx === -1 || p < idx)) {
          idx = p
          dest = sortedCities[n]
        }
      }
    }
    
    return dest
  },

  // 从语音文本提取日期
  extractDateFromText: function(text) {
    if (!text) return ''
    var dateMatch = text.match(/(大后天|大后日|后天|后日|后儿个|后儿|明天|明日|明儿个|明儿|明个|今天|今日|今儿个|今儿|今个)/)
    if (dateMatch) {
      var d = dateMatch[1]
      if (d === '明儿个' || d === '明儿' || d === '明个' || d === '明日') return '明天'
      if (d === '后儿个' || d === '后儿' || d === '后日') return '后天'
      if (d === '今儿个' || d === '今儿' || d === '今个' || d === '今日') return '今天'
      if (d === '大后日') return '大后天'
      return d
    }
    return ''
  },

  // 从语音文本提取时间
  extractTimeFromText: function(text) {
    if (!text) return ''
    // 支持阿拉伯数字和中文数字（一二三四五六七八九十百）
    // 先找 "早上八点" "下午三点半" "上午10点" 这种
    var match = text.match(/(上午|下午|晚上|早晨|中午|早上|凌晨|半夜)\s*([一二三四五六七八九十百\d]+点半|[一二三四五六七八九十百\d]+点\d{1,2}分|[一二三四五六七八九十百\d]+点半|[一二三四五六七八九十百\d]+点|\d+:\d+)/)
    if (match) {
      return match[1] + match[2]
    }
    // 只有数字时间 "8点" "3点半" "八点半"
    match = text.match(/([一二三四五六七八九十百\d]+点半|[一二三四五六七八九十百\d]+点\d{1,2}分|[一二三四五六七八九十百\d]+点半|[一二三四五六七八九十百\d]+点|\d+:\d+)/)
    if (match) return match[1]
    // 只有时段
    var periodMatch = text.match(/(上午|下午|晚上|早晨|中午|早上|凌晨|半夜)/)
    if (periodMatch) return periodMatch[1]
    return ''
  },

  onFromInput(e) {
    this.setData({ from: e.detail.value })
  },

  onToInput(e) {
    var value = e.detail.value
    this.setData({ to: value, searchKeyword: value })
    if (value.length >= 2) {
      this.searchScenicSpot(value)
    } else {
      this.setData({ showSearchResults: false, searchResults: [] })
    }
  },

  searchScenicSpot(keyword) {
    if (!keyword || keyword.length < 2) {
      this.setData({ showSearchResults: false, searchResults: [] })
      return
    }

    if (this.searchTimer) clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.setData({ isSearching: true })
      
      amapService.searchPOI(keyword).then((result) => {
        console.log('高德POI搜索结果:', JSON.stringify(result))
        if (result.success && result.data.length > 0) {
          this.setData({
            searchResults: result.data,
            showSearchResults: true,
            isSearching: false
          })
        } else {
          console.log('POI搜索失败或无结果:', result.error)
          this.setData({ showSearchResults: false, searchResults: [], isSearching: false })
        }
      }).catch((err) => {
        console.error('POI搜索异常:', err)
        this.setData({ showSearchResults: false, searchResults: [], isSearching: false })
      })
    }, 300)
  },

  selectSearchResult(e) {
    var result = e.currentTarget.dataset.result
    this.setData({
      to: result.name,
      showSearchResults: false,
      searchResults: []
    })
  },

  getCurrentLocation() {
    var self = this
    var role = this.data.role

    // 子女端：优先使用父母共享位置
    if (role === 'family') {
      var parentLoc = app.getParentLocation()
      if (parentLoc && parentLoc.latitude && parentLoc.longitude) {
        wx.showLoading({ title: '获取父母位置...', mask: true })
        // 反向地理编码获取地址
        amapService.reverseGeocode(parentLoc.longitude + ',' + parentLoc.latitude).then(function(result) {
          wx.hideLoading()
          if (result.success && result.data) {
            var address = result.data.address || '父母当前位置'
            self.setData({
              from: address,
              centerLng: parentLoc.longitude,
              centerLat: parentLoc.latitude,
              mapScale: 16
            })
            wx.showToast({ title: '已定位到父母位置', icon: 'success', duration: 2000 })
            var newMarkers = [{
              id: 3,
              longitude: parentLoc.longitude,
              latitude: parentLoc.latitude,
              width: 32,
              height: 32,
              callout: {
                content: '父母位置',
                color: '#ffffff',
                fontSize: 12,
                borderRadius: 8,
                padding: 6,
                display: 'ALWAYS',
                bgColor: '#06D6A0'
              }
            }]
            self.setData({ markers: newMarkers })
          } else {
            // 反向地理编码失败，使用坐标兜底
            var coordAddress = '父母当前位置(' + parentLoc.latitude.toFixed(4) + ',' + parentLoc.longitude.toFixed(4) + ')'
            self.setData({
              from: coordAddress,
              centerLng: parentLoc.longitude,
              centerLat: parentLoc.latitude,
              mapScale: 15
            })
            wx.showToast({ title: '已获取父母位置', icon: 'success', duration: 2000 })
          }
        }).catch(function() {
          wx.hideLoading()
          var coordAddress = '父母当前位置(' + parentLoc.latitude.toFixed(4) + ',' + parentLoc.longitude.toFixed(4) + ')'
          self.setData({
            from: coordAddress,
            centerLng: parentLoc.longitude,
            centerLat: parentLoc.latitude,
            mapScale: 15
          })
          wx.showToast({ title: '已获取父母位置', icon: 'success', duration: 2000 })
        })
        return
      } else {
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
    }

    // 老人端：使用自己的定位
    self._locateSelf()
  },

  _locateSelf() {
    var self = this
    wx.showLoading({ title: '定位中...', mask: true })
    amapService.getCurrentLocation().then((result) => {
      wx.hideLoading()
      console.log('定位结果:', JSON.stringify(result))
      if (result.success) {
        var address = result.address || '当前位置'
        var isCoordFallback = address.indexOf('当前位置(') >= 0
        self.setData({
          from: address,
          centerLng: result.longitude,
          centerLat: result.latitude,
          mapScale: isCoordFallback ? 15 : 16
        })
        
        var accuracyMsg = result.accuracy ? '（精度' + Math.round(result.accuracy) + '米）' : ''
        if (isCoordFallback) {
          wx.showToast({ title: '定位成功' + accuracyMsg + '，地址解析中...', icon: 'none', duration: 2500 })
        } else {
          wx.showToast({ title: '定位成功' + accuracyMsg, icon: 'success', duration: 2000 })
        }
        
        var newMarkers = [{
          id: 3,
          longitude: result.longitude,
          latitude: result.latitude,
          width: 32,
          height: 32,
          callout: {
            content: '当前位置',
            color: '#ffffff',
            fontSize: 12,
            borderRadius: 8,
            padding: 6,
            display: 'ALWAYS',
            bgColor: '#111111'
          }
        }]
        self.setData({ markers: newMarkers })
      } else {
        wx.showToast({ title: result.error || '定位失败', icon: 'none', duration: 2500 })
      }
    }).catch((err) => {
      wx.hideLoading()
      console.error('定位失败:', err)
      wx.showToast({ title: '定位失败，请检查权限设置', icon: 'none', duration: 2500 })
    })
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value })
  },

  swapAddress() {
    var from = this.data.from
    var to = this.data.to
    this.setData({ from: to, to: from })
  },

  switchTransitMode(e) {
    var planId = e.currentTarget.dataset.planId
    var segmentIndex = e.currentTarget.dataset.segmentIndex
    var mode = e.currentTarget.dataset.mode

    var transitMode = this.data.transitMode
    if (!transitMode[planId]) {
      transitMode[planId] = {}
    }
    transitMode[planId][segmentIndex] = mode

    var plans = this.data.plans
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        var plan = plans[i]
        var newTotalCost = 0
        
        for (var j = 0; j < plan.segments.length; j++) {
          var seg = plan.segments[j]
          var segMode = (transitMode[planId] && transitMode[planId][j]) || 'taxi'
          
          if (seg.type === 'train') {
            if (seg.train && seg.train.minPrice !== undefined) {
              newTotalCost += Number(seg.train.minPrice) || 0
            } else if (seg.taxi && seg.taxi.cost) {
              newTotalCost += Number(seg.taxi.cost) || 0
            }
          } else if (seg.type === 'local') {
            if (segMode === 'bus' && seg.bus) {
              newTotalCost += Number(seg.bus.cost) || 0
            } else if (segMode === 'subway' && seg.subway) {
              newTotalCost += Number(seg.subway.cost) || 0
            } else if (seg.taxi) {
              newTotalCost += Number(seg.taxi.cost) || 0
            } else if (seg.bus) {
              newTotalCost += Number(seg.bus.cost) || 0
            } else if (seg.subway) {
              newTotalCost += Number(seg.subway.cost) || 0
            }
          } else if (seg.type === 'walk') {
            newTotalCost += 0
          } else {
            if (seg.taxi && seg.taxi.cost) {
              newTotalCost += Number(seg.taxi.cost) || 0
            }
          }
        }
        
        plan.totalCost = newTotalCost
        plan.taxiTotalCost = newTotalCost
        break
      }
    }

    this.setData({ 
      transitMode: transitMode,
      plans: this.preprocessPlans(plans)
    })
  },

  preprocessPlans(plans) {
    var self = this
    var confirmedSegments = self.data.confirmedSegments || {}
    var transitMode = self.data.transitMode || {}
    var processingSegment = self.data.processingSegment || ''
    var result = []

    for (var i = 0; i < plans.length; i++) {
      var plan = plans[i]
      if (!plan.segments) {
        result.push(plan)
        continue
      }

      var newSegments = []
      for (var j = 0; j < plan.segments.length; j++) {
        var seg = plan.segments[j]
        var segKey = plan.id + '_' + j
        var segConfirmed = confirmedSegments[segKey]
        var segMode = (transitMode[plan.id] && transitMode[plan.id][j]) || ''

        var displayLabel = ''
        if (segConfirmed) {
          displayLabel = '已完成'
        } else if (seg.type === 'train') {
          displayLabel = '火车'
        } else if (seg.type === 'walk') {
          displayLabel = '步行'
        } else if (seg.type === 'bus') {
          displayLabel = '公交'
        } else if (seg.type === 'taxi') {
          displayLabel = '打车'
        } else {
          if (segMode === 'bus') {
            displayLabel = '公交'
          } else if (segMode === 'subway') {
            displayLabel = '地铁'
          } else {
            displayLabel = '打车'
          }
        }

        var isLocalSegment = (seg.type !== 'train' && seg.type !== 'walk' && seg.type !== 'bus' && seg.type !== 'taxi')

        var isTaxiActive = false
        var isBusActive = false
        var isSubwayActive = false
        if (isLocalSegment) {
          if (!segMode || segMode === 'taxi') isTaxiActive = true
          if (segMode === 'bus') isBusActive = true
          if (segMode === 'subway') isSubwayActive = true
        }

        var showDoneBtn = !!segConfirmed
        var showLoadingBtn = (processingSegment === segKey)
        var showTrainBtn = (!showDoneBtn && !showLoadingBtn && seg.type === 'train')
        var showTaxiBtn = false
        var showBusBtn = false
        var showSubwayBtn = false

        if (!showDoneBtn && !showLoadingBtn) {
          if (seg.type === 'taxi') {
            showTaxiBtn = true
          } else if (seg.type === 'bus') {
            showBusBtn = true
          } else if (isLocalSegment) {
            if (!segMode || segMode === 'taxi') showTaxiBtn = true
            if (segMode === 'bus') showBusBtn = true
            if (segMode === 'subway') showSubwayBtn = true
          }
        }

        var newSeg = {}
        for (var k in seg) {
          newSeg[k] = seg[k]
        }
        newSeg.displayLabel = displayLabel
        newSeg.isLocalSegment = isLocalSegment
        newSeg.isTaxiActive = isTaxiActive
        newSeg.isBusActive = isBusActive
        newSeg.isSubwayActive = isSubwayActive
        newSeg.showDoneBtn = showDoneBtn
        newSeg.showLoadingBtn = showLoadingBtn
        newSeg.showTrainBtn = showTrainBtn
        newSeg.showTaxiBtn = showTaxiBtn
        newSeg.showBusBtn = showBusBtn
        newSeg.showSubwayBtn = showSubwayBtn

        newSegments.push(newSeg)
      }

      plan.segments = newSegments
      result.push(plan)
    }

    return result
  },

  togglePlanExpand(e) {
    var planId = e.currentTarget.dataset.planId
    var current = this.data.expandedPlanId
    this.setData({
      expandedPlanId: current === planId ? '' : planId
    })
  },

  searchAll() {
    this.searchPlans()
  },

  searchPlans() {
    var from = this.data.from
    var to = this.data.to
    var scene = this.data.scene

    if (!from || !to) {
      wx.showToast({ title: '请输入出发地和目的地', icon: 'none' })
      return
    }
    if (from === to) {
      wx.showToast({ title: '出发地和目的地不能相同', icon: 'none' })
      return
    }

    this.setData({ hasSearched: true, loadingPlans: true, plansError: '', plans: [] })

    var self = this

    var searchTimeout = setTimeout(function() {
      if (self.data.loadingPlans) {
        self.setData({ loadingPlans: false, plansError: '查询超时，请重试' })
      }
    }, 20000)

    Promise.all([self.getCityFromName(from), self.getCityFromName(to)]).then(function(cities) {
      var fromCity = cities[0]
      var toCity = cities[1]
      
      travelService.getLocalPlans(from, to, self.data.time).then(function(plans) {
        travelService.getDrivingRoute(from, to, fromCity, toCity).then(function(route) {
          var fromCoord = { lng: route.fromGeo.lng, lat: route.fromGeo.lat }
          var toCoord = { lng: route.toGeo.lng, lat: route.toGeo.lat }

          var polylinePoints = route.success && route.points.length > 0 ? route.points : [
            { longitude: fromCoord.lng, latitude: fromCoord.lat },
            { longitude: toCoord.lng, latitude: toCoord.lat }
          ]

          self.updateMapWithCoords(from, to, fromCoord, toCoord, polylinePoints)

          plans.forEach(function(plan) {
            plan.mapMarkers = [
              {
                id: 1,
                longitude: fromCoord.lng,
                latitude: fromCoord.lat,
                width: 40,
                height: 40,
                callout: {
                  content: '起点',
                  color: '#ffffff',
                  fontSize: 14,
                  borderRadius: 8,
                  padding: 8,
                  display: 'ALWAYS',
                  bgColor: '#FF8C42'
                }
              },
              {
                id: 2,
                longitude: toCoord.lng,
                latitude: toCoord.lat,
                width: 40,
                height: 40,
                callout: {
                  content: '终点',
                  color: '#ffffff',
                  fontSize: 14,
                  borderRadius: 8,
                  padding: 8,
                  display: 'ALWAYS',
                  bgColor: '#06D6A0'
                }
              }
            ]

            plan.mapPolyline = [{
              points: polylinePoints,
              color: '#FF8C42',
              width: 12,
              dottedLine: false,
              arrowLine: true,
              borderColor: '#FFB627',
              borderWidth: 4
            }]
          })

          self.setData({
            plans: self.preprocessPlans(plans),
            loadingPlans: false,
            expandedPlanId: plans.length > 0 ? plans[0].id : ''
          })
        }).catch(function() {
          travelService.geocode(from).then(function(fromGeo) {
            travelService.geocode(to).then(function(toGeo) {
              var fromCoord = { lng: fromGeo.lng, lat: fromGeo.lat }
              var toCoord = { lng: toGeo.lng, lat: toGeo.lat }

              self.updateMapWithCoords(from, to, fromCoord, toCoord)

              plans.forEach(function(plan) {
                plan.mapMarkers = [
                  {
                    id: 1,
                    longitude: fromCoord.lng,
                    latitude: fromCoord.lat,
                    width: 40,
                    height: 40,
                    callout: {
                      content: '起点',
                      color: '#ffffff',
                      fontSize: 14,
                      borderRadius: 8,
                      padding: 8,
                      display: 'ALWAYS',
                      bgColor: '#FF8C42'
                    }
                  },
                  {
                    id: 2,
                    longitude: toCoord.lng,
                    latitude: toCoord.lat,
                    width: 40,
                    height: 40,
                    callout: {
                      content: '终点',
                      color: '#ffffff',
                      fontSize: 14,
                      borderRadius: 8,
                      padding: 8,
                      display: 'ALWAYS',
                      bgColor: '#06D6A0'
                    }
                  }
                ]

                plan.mapPolyline = [{
                  points: [
                    { longitude: fromCoord.lng, latitude: fromCoord.lat },
                    { longitude: toCoord.lng, latitude: toCoord.lat }
                  ],
                  color: '#FF8C42',
                  width: 12,
                  dottedLine: false,
                  arrowLine: true,
                  borderColor: '#FFB627',
                  borderWidth: 4
                }]
              })

              self.setData({
                plans: self.preprocessPlans(plans),
                loadingPlans: false,
                expandedPlanId: plans.length > 0 ? plans[0].id : ''
              })
            }).catch(function() {
              self.setData({ plans: self.preprocessPlans(plans), loadingPlans: false, expandedPlanId: plans.length > 0 ? plans[0].id : '' })
            })
          }).catch(function() {
            self.setData({ plans: self.preprocessPlans(plans), loadingPlans: false, expandedPlanId: plans.length > 0 ? plans[0].id : '' })
          })
        })
      }).catch(function(err) {
        self.setData({
          plansError: err.message || '查询失败',
          loadingPlans: false
        })
      })
    }).catch(function(err) {
      self.setData({
        plansError: err.message || '查询失败',
        loadingPlans: false
      })
    })
  },

  updateMapWithCity(from, to) {
    var fromCoord = this.getCityCoord(from)
    var toCoord = this.getCityCoord(to)
    this.updateMapWithCoords(from, to, fromCoord, toCoord)
  },

  updateMapWithCoords(from, to, fromCoord, toCoord, polylinePoints) {
    var fromLng = fromCoord.lng
    var fromLat = fromCoord.lat
    var toLng = toCoord.lng
    var toLat = toCoord.lat

    if (!Number.isFinite(fromLng) || !Number.isFinite(fromLat) ||
        !Number.isFinite(toLng) || !Number.isFinite(toLat)) {
      wx.showToast({ title: '坐标无效，无法显示地图', icon: 'none' })
      return
    }

    var centerLng = (fromLng + toLng) / 2
    var centerLat = (fromLat + toLat) / 2

    var distance = Math.floor(getDistance(fromLat, fromLng, toLat, toLng))
    
    var mapScale = 15
    if (distance > 1000) {
      mapScale = 5
    } else if (distance > 500) {
      mapScale = 6
    } else if (distance > 200) {
      mapScale = 7
    } else if (distance > 100) {
      mapScale = 8
    } else if (distance > 50) {
      mapScale = 10
    } else if (distance > 20) {
      mapScale = 12
    }

    var markers = [
      {
        id: 1,
        longitude: fromLng,
        latitude: fromLat,
        width: 32,
        height: 32,
        callout: {
          content: '起点 · ' + from,
          color: '#ffffff',
          fontSize: 12,
          borderRadius: 8,
          padding: 6,
          display: 'ALWAYS',
          bgColor: '#FF8C42'
        }
      },
      {
        id: 2,
        longitude: toLng,
        latitude: toLat,
        width: 32,
        height: 32,
        callout: {
          content: '终点 · ' + to,
          color: '#ffffff',
          fontSize: 12,
          borderRadius: 8,
          padding: 6,
          display: 'ALWAYS',
          bgColor: '#06D6A0'
        }
      }
    ]

    var linePoints = polylinePoints || [
      { longitude: fromLng, latitude: fromLat },
      { longitude: toLng, latitude: toLat }
    ]

    var polyline = [{
      points: linePoints,
      color: '#FF8C42',
      width: 12,
      dottedLine: false,
      arrowLine: true,
      borderColor: '#FFB627',
      borderWidth: 4
    }]

    this.setData({
      distance: distance,
      centerLng: centerLng,
      centerLat: centerLat,
      mapScale: mapScale,
      markers: markers,
      polyline: polyline
    })
  },

  getCityCoord(city) {
    var cityCoords = {
      '太原': { lng: 112.549248, lat: 37.857014 },
      '南京': { lng: 118.796875, lat: 32.060255 },
      '北京': { lng: 116.407395, lat: 39.904211 },
      '上海': { lng: 121.473701, lat: 31.230416 },
      '杭州': { lng: 120.153576, lat: 30.287459 },
      '广州': { lng: 113.264385, lat: 23.129110 },
      '深圳': { lng: 114.057964, lat: 22.543099 },
      '成都': { lng: 104.066801, lat: 30.572816 },
      '重庆': { lng: 106.551556, lat: 29.563009 },
      '沈阳': { lng: 123.432894, lat: 41.805643 },
      '西安': { lng: 108.948024, lat: 34.261894 },
      '武汉': { lng: 114.305469, lat: 30.593168 },
      '天津': { lng: 117.200755, lat: 39.084158 },
      '苏州': { lng: 120.619585, lat: 31.299379 },
      '郑州': { lng: 113.625346, lat: 34.746644 },
      '青岛': { lng: 120.333566, lat: 36.067121 },
      '大连': { lng: 121.614761, lat: 38.914063 },
      '厦门': { lng: 118.089425, lat: 24.479833 },
      '长沙': { lng: 112.938828, lat: 28.228024 },
      '哈尔滨': { lng: 126.642464, lat: 45.803756 },
      '长春': { lng: 125.324521, lat: 43.817071 },
      '合肥': { lng: 117.227219, lat: 31.820651 },
      '济南': { lng: 117.000923, lat: 36.675807 },
      '石家庄': { lng: 114.514896, lat: 38.042309 },
      '昆明': { lng: 102.712251, lat: 24.881168 },
      '贵阳': { lng: 106.630465, lat: 26.647535 },
      '南宁': { lng: 108.371797, lat: 22.817029 },
      '福州': { lng: 119.296475, lat: 26.075302 },
      '南昌': { lng: 115.859484, lat: 28.682866 },
      '兰州': { lng: 103.834341, lat: 36.061122 },
      '太原南站': { lng: 112.606739, lat: 37.775063 },
      '沈阳站': { lng: 123.424628, lat: 41.808980 }
    }
    return cityCoords[city] || { lng: 116.407395, lat: 39.904211 }
  },

  getCityFromNameSync(name) {
    var cityMap = {
      '太原': '太原', '北京': '北京', '上海': '上海', '南京': '南京', '武汉': '武汉',
      '杭州': '杭州', '西安': '西安', '广州': '广州', '深圳': '深圳', '成都': '成都',
      '重庆': '重庆', '天津': '天津', '苏州': '苏州', '郑州': '郑州', '长沙': '长沙',
      '青岛': '青岛', '沈阳': '沈阳', '大连': '大连', '合肥': '合肥', '福州': '福州',
      '厦门': '厦门', '南昌': '南昌', '昆明': '昆明', '贵阳': '贵阳', '南宁': '南宁',
      '兰州': '兰州', '西宁': '西宁', '银川': '银川', '呼和浩特': '呼和浩特',
      '乌鲁木齐': '乌鲁木齐', '哈尔滨': '哈尔滨', '长春': '长春', '石家庄': '石家庄',
      '济南': '济南', '黄鹤楼': '武汉', '西湖': '杭州', '故宫': '北京', '天安门': '北京',
      '兵马俑': '西安', '长城': '北京', '东方明珠': '上海', '夫子庙': '南京',
      '东方明珠广播电视塔': '上海', '西湖风景名胜区': '杭州', '张家界国家森林公园': '张家界',
      '九寨沟风景区': '九寨沟', '桂林山水': '桂林', '黄山风景区': '黄山',
      '泰山风景区': '泰安', '峨眉山景区': '乐山', '布达拉宫': '拉萨',
      '大雁塔': '西安', '中山陵': '南京', '都江堰': '成都', '青城山': '成都',
      '丽江古城': '丽江', '凤凰古城': '湘西', '鼓浪屿': '厦门', '颐和园': '北京',
      '圆明园': '北京', '天坛': '北京', '武侯祠': '成都', '杜甫草堂': '成都',
      '宽窄巷子': '成都', '三坊七巷': '福州', '滕王阁': '南昌', '岳阳楼': '岳阳',
      '黄鹤楼公园': '武汉', '中山陵景区': '南京', '夫子庙景区': '南京',
      '外滩': '上海', '豫园': '上海', '陆家嘴': '上海', '人民广场': '上海'
    }
    
    var sortedKeys = Object.keys(cityMap).sort(function(a, b) {
      return b.length - a.length
    })
    
    for (var i = 0; i < sortedKeys.length; i++) {
      var key = sortedKeys[i]
      if (name.includes(key)) {
        return cityMap[key]
      }
    }
    
    return name.replace(/站|市|区|省/g, '')
  },

  getCityFromName(name) {
    return travelService.getCityFromName(name)
  },

  confirmSegment(e) {
    var planId = e.currentTarget.dataset.planId
    var segIndex = e.currentTarget.dataset.segmentIndex
    var segType = e.currentTarget.dataset.segType
    var plan = e.currentTarget.dataset.plan
    var key = planId + '_' + segIndex

    if (this.data.confirmedSegments[key]) {
      var confirmed = this.data.confirmedSegments
      delete confirmed[key]
      this.setData({ confirmedSegments: confirmed })
      return
    }

    var self = this
    var title = ''
    var content = ''

    if (segType === 'train') {
      var train = plan.train
      title = '确认购买火车票'
      content = train.trainNo + ' ' + train.type + '\n' +
                train.fromStation + ' → ' + train.toStation + '\n' +
                '出发：' + train.startTime + '  到达：' + train.endTime + '\n' +
                '票价：¥' + train.minPrice + '起'
    } else if (segType === 'taxi') {
      var seg = plan.segments[segIndex]
      var taxiCost = seg.taxi ? seg.taxi.cost : plan.totalCost
      title = '确认叫车'
      content = '出发地：' + this.data.from + '\n目的地：' + this.data.to + '\n预估费用：¥' + taxiCost
    } else if (segType === 'bus') {
      title = '确认公交方案'
      content = '已为您规划公交路线\n公交不支持在线购票，请上车扫码支付'
    } else if (segType === 'subway') {
      title = '确认地铁方案'
      content = '已为您规划地铁路线\n地铁不支持在线购票，请进站扫码支付'
    }

    wx.showModal({
      title: title,
      content: content,
      confirmText: '确认',
      cancelText: '取消',
      confirmColor: '#FF8C42',
      success: function(res) {
        if (res.confirm) {
          self.setData({ processingSegment: key })

          var loadingText = ''
          if (segType === 'train') loadingText = '正在预订火车票...'
          else if (segType === 'taxi') loadingText = '正在为您叫车...'
          else if (segType === 'bus') loadingText = '正在规划公交路线...'
          else if (segType === 'subway') loadingText = '正在规划地铁路线...'

          wx.showLoading({ title: loadingText, mask: true })

          setTimeout(function() {
            wx.hideLoading()

            var confirmed = self.data.confirmedSegments
            confirmed[key] = segType
            self.setData({
              confirmedSegments: confirmed,
              processingSegment: ''
            })

            if (segType === 'train') {
              wx.showToast({ title: '火车票预订成功！', icon: 'success', duration: 1500 })
            } else if (segType === 'taxi') {
              var plates = ['晋A88888', '晋A66666', '晋A99999', '晋A77777']
              var plate = plates[Math.floor(Math.random() * plates.length)]
              var driverPhones = ['13800138001', '13900139001', '13700137001']
              var driverPhone = driverPhones[Math.floor(Math.random() * driverPhones.length)]
              var seg = plan.segments[segIndex]
              var taxiCost = seg.taxi ? seg.taxi.cost : plan.totalCost
              var taxiDuration = seg.taxi ? seg.taxi.duration : ''

              var taxiInfo = {}
              taxiInfo[key] = {
                plate: plate,
                driverPhone: driverPhone,
                cost: taxiCost,
                duration: taxiDuration
              }
              self.setData({
                taxiInfo: Object.assign({}, self.data.taxiInfo, taxiInfo)
              })

              wx.showModal({
                title: '叫车成功！',
                content: '司机正在赶来，请耐心等待\n\n预估费用：¥' + taxiCost + '\n车牌号：' + plate + '\n司机电话：' + driverPhone + '\n预计到达：约' + taxiDuration,
                confirmText: '知道了',
                showCancel: false,
                confirmColor: '#FF8C42',
                success: function() {
                  wx.showToast({ title: '司机正在赶来', icon: 'success', duration: 1500 })
                }
              })
            } else if (segType === 'bus') {
              wx.showToast({ title: '公交方案已确认', icon: 'success', duration: 1500 })
            } else if (segType === 'subway') {
              wx.showToast({ title: '地铁方案已确认', icon: 'success', duration: 1500 })
            }

            self.saveOrder(plan, confirmed)
          }, 1500)
        }
      }
    })
  },

  confirmAllSegments(e) {
    var plan = e.currentTarget.dataset.plan
    var self = this

    var content = ''
    if (plan.train) {
      var train = plan.train
      content = '即将确认以下行程：\n\n' +
                train.trainNo + ' ' + train.type + '\n' +
                train.fromStation + ' → ' + train.toStation + '\n' +
                '出发：' + train.startTime + '  到达：' + train.endTime + '\n\n' +
                '全程预估：¥' + plan.totalCost + '起'
    } else {
      var planTransitMode = (self.data.transitMode || {})[plan.id] || {}
      content = '即将确认以下行程：\n\n' +
                plan.segments.map(function(seg, idx) {
                  var icon = seg.icon
                  var title = seg.title || ''
                  if (seg.type !== 'train' && seg.type !== 'walk' && seg.type !== 'bus' && seg.type !== 'taxi') {
                    var mode = planTransitMode[idx] || 'taxi'
                    if (mode === 'bus') {
                      icon = '🚌'
                      if (title === '打车') title = '公交'
                    } else if (mode === 'subway') {
                      icon = '🚇'
                      if (title === '打车') title = '地铁'
                    }
                  }
                  return icon + ' ' + title + (seg.desc ? ' · ' + seg.desc : '')
                }).join('\n') + '\n\n' +
                '全程预估：¥' + plan.totalCost + '起'
    }

    wx.showModal({
      title: '确认全部行程',
      content: content,
      confirmText: '确认全部',
      cancelText: '取消',
      confirmColor: '#06D6A0',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '正在确认全部行程...', mask: true })

          setTimeout(function() {
            wx.hideLoading()

            var newConfirmed = {}
            var hasTaxi = false
            for (var i = 0; i < plan.segments.length; i++) {
              var seg = plan.segments[i]
              if (seg.type === 'walk') continue
              var segMode = (self.data.transitMode[plan.id] && self.data.transitMode[plan.id][i]) || 'taxi'
              var segType = seg.type === 'train' ? 'train' : (segMode === 'bus' ? 'bus' : (segMode === 'subway' ? 'subway' : 'taxi'))
              newConfirmed[plan.id + '_' + i] = segType
              if (segType === 'taxi') hasTaxi = true
            }

            var confirmed = Object.assign({}, self.data.confirmedSegments, newConfirmed)
            self.setData({ confirmedSegments: confirmed })

            if (hasTaxi) {
              var plates = ['晋A88888', '晋A66666', '晋A99999', '晋A77777']
              var driverPhones = ['13800138001', '13900139001', '13700137001']
              var taxiInfo = {}

              for (var j = 0; j < plan.segments.length; j++) {
                var seg = plan.segments[j]
                if (seg.type === 'walk') continue
                var segType = newConfirmed[plan.id + '_' + j]
                if (segType === 'taxi') {
                  var plate = plates[Math.floor(Math.random() * plates.length)]
                  var driverPhone = driverPhones[Math.floor(Math.random() * driverPhones.length)]
                  var taxiCost = seg.taxi ? seg.taxi.cost : plan.totalCost
                  var taxiDuration = seg.taxi ? seg.taxi.duration : ''
                  var key = plan.id + '_' + j
                  taxiInfo[key] = {
                    plate: plate,
                    driverPhone: driverPhone,
                    cost: taxiCost,
                    duration: taxiDuration
                  }
                }
              }

              self.setData({
                taxiInfo: Object.assign({}, self.data.taxiInfo, taxiInfo)
              })
            }

            self.saveOrder(plan, confirmed)

            wx.showToast({ title: '行程确认成功！', icon: 'success', duration: 1500 })
            setTimeout(function() {
              wx.reLaunch({ url: '/pages/index/index' })
            }, 1500)
          }, 1500)
        }
      }
    })
  },

  _randomPlate(prefix) {
    prefix = prefix || '晋A'
    var letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    var digits = '0123456789'
    var chars = []
    for (var i = 0; i < 5; i++) {
      if (Math.random() < 0.25) {
        chars.push(letters.charAt(Math.floor(Math.random() * letters.length)))
      } else {
        chars.push(digits.charAt(Math.floor(Math.random() * digits.length)))
      }
    }
    return prefix + '·' + chars.join('')
  },

  saveOrder(plan, confirmedSegments) {
    if (this.data.savedPlanIds.indexOf(plan.id) >= 0) return

    var train = plan.train
    var allConfirmed = true
    for (var i = 0; i < plan.segments.length; i++) {
      var seg = plan.segments[i]
      if (seg.type === 'walk') continue
      if (!confirmedSegments[plan.id + '_' + i]) {
        allConfirmed = false
        break
      }
    }

    if (!allConfirmed) return

    var steps = []
    for (var j = 0; j < plan.segments.length; j++) {
      var seg = plan.segments[j]
      if (seg.type === 'walk') continue
      var mode = confirmedSegments[plan.id + '_' + j]

      if (seg.type === 'train') {
        steps.push({
          type: 'train',
          name: train.type + ' ' + train.trainNo,
          time: train.startTime,
          status: 'confirmed',
          seat: '二等座',
          platform: '请查看详情',
          location: train.fromStation + ' → ' + train.toStation
        })
      } else if (seg.type === 'taxi') {
        steps.push({
          type: 'taxi',
          name: '打车到' + (seg.location || ''),
          time: '',
          status: 'confirmed',
          plate: this._randomPlate(j === 0 ? '晋A' : '苏A'),
          location: seg.location
        })
      } else if (seg.type === 'bus') {
        steps.push({
          type: 'bus',
          name: '公交到' + (seg.location || ''),
          time: '',
          status: 'confirmed',
          plate: '约' + seg.bus.duration,
          location: seg.location
        })
      } else {
        var transport = mode === 'bus' ? seg.bus : (mode === 'subway' ? seg.subway : seg.taxi)
        var stepTime = ''
        if (train) {
          if (j === 0) {
            var depParts = train.startTime.match(/(\d{1,2}):(\d{2})/)
            if (depParts) {
              var depMin = Number(depParts[1]) * 60 + Number(depParts[2])
              var durMatch = transport.duration.match(/(\d+)/)
              var durMin = durMatch ? Number(durMatch[1]) : 30
              var startMin = Math.max(0, depMin - durMin)
              var startHour = Math.floor(startMin / 60)
              var startM = startMin % 60
              stepTime = (startHour < 10 ? '0' : '') + startHour + ':' + (startM < 10 ? '0' : '') + startM
            }
          } else if (j === 2) {
            stepTime = train.endTime
          }
        }

        var modeLabel = mode === 'bus' ? '公交' : (mode === 'subway' ? '地铁' : '打车')
        steps.push({
          type: mode,
          name: modeLabel + '到' + (seg.location || ''),
          time: stepTime,
          status: 'confirmed',
          plate: mode === 'taxi' ? this._randomPlate(j === 0 ? '晋A' : '苏A') : '约' + transport.duration,
          location: seg.location
        })
      }
    }

    var order = {}
    if (train) {
      order = {
        orderId: 'ORDER_' + Date.now(),
        type: 'train',
        status: 'booked',
        date: this.data.date,
        from: this.data.from,
        to: this.data.to,
        name: train.trainNo,
        departureTime: train.startTime,
        arrivalTime: train.endTime,
        seat: '二等座',
        price: plan.totalCost,
        steps: steps
      }
    } else {
      order = {
        orderId: 'ORDER_' + Date.now(),
        type: plan.type || 'taxi',
        status: 'booked',
        date: this.data.date,
        from: this.data.from,
        to: this.data.to,
        name: plan.type === 'taxi' ? '打车出行' : '公交出行',
        departureTime: '',
        arrivalTime: '',
        seat: '',
        price: plan.totalCost,
        steps: steps
      }
    }

    app.addOrder(order)
    this.setData({ savedPlanIds: this.data.savedPlanIds.concat([plan.id]) })
  },

  toggleTtsPlay(e) {
    var planId = e.currentTarget.dataset.planId
    var plans = this.data.plans
    var plan = null
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plan = plans[i]
        break
      }
    }
    if (!plan) return

    var isPlaying = this.data.isTtsPlaying
    var isLoop = this.data.isTtsLoop

    if (isPlaying && this.data.currentTtsPlanId === planId) {
      ttsService.stopPlay()
      this.setData({
        isTtsPlaying: false,
        isTtsLoop: false,
        currentTtsPlanId: ''
      })
      wx.showToast({ title: '已停止播报', icon: 'none' })
    } else {
      if (isLoop) {
        ttsService.announceTripLoop(plan)
        this.setData({
          isTtsPlaying: true,
          isTtsLoop: true,
          currentTtsPlanId: planId
        })
        wx.showToast({ title: '循环播报中，点击停止', icon: 'none', duration: 2000 })
      } else {
        ttsService.announceTrip(plan)
        this.setData({
          isTtsPlaying: true,
          isTtsLoop: false,
          currentTtsPlanId: planId
        })
        wx.showToast({ title: '语音播报中', icon: 'none', duration: 2000 })
      }
    }
  },

  toggleTtsLoop(e) {
    var planId = e.currentTarget.dataset.planId
    var plans = this.data.plans
    var plan = null
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plan = plans[i]
        break
      }
    }
    if (!plan) return

    if (this.data.isTtsPlaying && this.data.currentTtsPlanId === planId) {
      ttsService.stopPlay()
      this.setData({
        isTtsPlaying: false,
        isTtsLoop: false,
        currentTtsPlanId: ''
      })
    }

    var newLoop = !this.data.isTtsLoop
    this.setData({ isTtsLoop: newLoop })

    if (newLoop) {
      ttsService.announceTripLoop(plan)
      this.setData({
        isTtsPlaying: true,
        currentTtsPlanId: planId
      })
      wx.showToast({ title: '开启循环播报', icon: 'none', duration: 1500 })
    } else {
      wx.showToast({ title: '关闭循环播报', icon: 'none', duration: 1500 })
    }
  },

  previewTtsText(e) {
    var planId = e.currentTarget.dataset.planId
    var plans = this.data.plans
    var plan = null
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plan = plans[i]
        break
      }
    }
    if (!plan) return

    var items = ttsService.buildTripAnnouncements(plan)
    
    wx.showModal({
      title: '语音播报内容',
      content: items.join('\n\n'),
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onUnload() {
    ttsService.stopPlay()
  }
})
