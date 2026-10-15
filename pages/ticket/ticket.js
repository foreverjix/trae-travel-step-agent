const app = getApp()
const { trainStations, busStations, trains, buses } = require('../../data/mock')
const { formatDate, showToast } = require('../../utils/index')
const baiduAsrService = require('../../services/baidu-asr.js')

// 辅助函数：在POI结果中挑选最匹配的
function _pickBestMatch(keyword, pois) {
  if (!pois || !pois.length) return null
  // 先找完全包含关键词的
  for (var i = 0; i < pois.length; i++) {
    if (pois[i].name.indexOf(keyword) >= 0) return pois[i]
  }
  // 再找关键词包含POI名的
  for (var j = 0; j < pois.length; j++) {
    if (keyword.indexOf(pois[j].name) >= 0) return pois[j]
  }
  // 最后取第一个
  return pois[0]
}

Page({
  data: {
    currentTab: 'train',
    today: formatDate(new Date()),
    locateStatus: 'locating',
    searchForm: {
      from: '',
      to: '',
      date: formatDate(new Date())
    },
    results: [],
    sortBy: 'time',
    hotStations: [],
    quickRoutes: [
      { from: '太原南站', to: '北京西站' },
      { from: '太原南站', to: '南京南站' },
      { from: '太原南站', to: '上海虹桥站' },
      { from: '太原南站', to: '西安北站' }
    ],
    showPicker: false,
    pickerTitle: '',
    pickerType: '',
    searchKeyword: '',
    filteredStations: [],
    currentTrip: null,
    isRecording: false,
    showVoiceModal: false,
    voiceText: '正在听您说，说完点击下方按钮',
    voiceResult: '',
    // 日期选择器
    showDateSheet: false,
    dateOptions: [],
    datePickerIndex: 0,
    // AI视觉强化
    highlightFields: {}
  },

  onLoad(options) {
    const today = formatDate(new Date())
    const dateOptions = this.generateDateOptions()
    this.setData({
      today,
      dateOptions,
      datePickerIndex: 0,
      searchForm: {
        from: '',
        to: '',
        date: today
      },
      hotStations: trainStations.slice(0, 8)
    })
    this.checkCurrentTrip()
    this.initRecorder()
    this.autoLocateFrom()
    // 如果是从首页语音跳转过来，自动解析并回填
    if (options && options.voiceText) {
      var v = decodeURIComponent(options.voiceText)
      this.setData({ voiceResult: v })
      var that = this
      setTimeout(function() { that.applyVoiceResult(true) }, 600)
    }
  },

  // 生成未来7天的日期选项
  generateDateOptions() {
    const options = []
    const today = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const dateStr = formatDate(d)
      const label = i === 0 ? '今天' : (i === 1 ? '明天' : (i === 2 ? '后天' : '周' + weekDays[d.getDay()]))
      options.push(label + ' ' + dateStr.slice(5))
    }
    return options
  },

  openDatePicker() {
    const date = this.data.searchForm.date
    const options = this.data.dateOptions
    let index = 0
    for (let i = 0; i < options.length; i++) {
      if (options[i].includes(date.slice(5))) {
        index = i
        break
      }
    }
    this.setData({
      showDateSheet: true,
      datePickerIndex: index
    })
  },

  closeDateSheet() {
    this.setData({ showDateSheet: false })
  },

  onDatePickerChange(e) {
    this.setData({ datePickerIndex: e.detail.value[0] })
  },

  confirmDatePicker() {
    const index = this.data.datePickerIndex
    const options = this.data.dateOptions
    const dateStr = options[index]
    const date = dateStr.split(' ')[1]
    const today = new Date()
    const year = today.getFullYear()
    this.setData({
      'searchForm.date': year + '-' + date,
      showDateSheet: false
    })
  },

  autoLocateFrom() {
    const role = app.globalData.role || 'elder'
    if (role !== 'elder') return
    const self = this
    this.setData({ locateStatus: 'locating' })

    if (this._cachedTrainStations && this._cachedTrainStations.length > 0) {
      this.applyStationResult(this._cachedTrainStations)
      return
    }

    wx.getLocation({
      type: 'gcj02',
      success: function(res) {
        const amapService = require('../../services/amap-service.js')
        const location = res.longitude + ',' + res.latitude

        if (self.data.currentTab === 'plane') {
          amapService.searchNearbyPOI(location, '150200', 50000).then(function(poiResult) {
            if (poiResult.success && poiResult.data && poiResult.data.length > 0) {
              self.setData({
                'searchForm.from': self.cleanAirportName(poiResult.data[0].name),
                locateStatus: 'success'
              })
            } else {
              self.setData({ locateStatus: 'failed' })
            }
          }).catch(function() {
            self.setData({ locateStatus: 'failed' })
          })
          return
        }

        amapService.searchNearbyPOI(location, '150100', 50000).then(function(poiResult) {
          if (!poiResult.success || !poiResult.data || poiResult.data.length === 0) {
            self.fallbackStation(location)
            return
          }

          var isAirport = function(name) {
            return name.indexOf('机场') >= 0 || name.indexOf('航站') >= 0 ||
                   name.indexOf('候机') >= 0 || name.indexOf('停机') >= 0 ||
                   name.indexOf('武宿') >= 0 || name.indexOf('航空') >= 0
          }

          var trainStations = []
          for (var i = 0; i < poiResult.data.length; i++) {
            if (!isAirport(poiResult.data[i].name)) {
              trainStations.push(poiResult.data[i])
            }
          }

          if (trainStations.length === 0) {
            self.fallbackStation(location)
            return
          }

          self._cachedTrainStations = trainStations
          self.applyStationResult(trainStations)
        }).catch(function() {
          self.fallbackStation(location)
        })
      },
      fail: function() {
        self.fallbackStation(null)
      }
    })
  },

  fallbackStation(location) {
    const self = this
    const amapService = require('../../services/amap-service.js')
    const isGaotie = this.data.currentTab === 'gaotie'

    if (location) {
      amapService.reverseGeocode(location).then(function(result) {
        if (result.success && result.data && result.data.city) {
          var city = result.data.city.replace(/市$/, '')
          var stationName = isGaotie ? city + '南站' : city + '站'
          self.setData({
            'searchForm.from': stationName,
            locateStatus: 'success'
          })
        } else {
          self.setData({
            'searchForm.from': isGaotie ? '太原南站' : '太原站',
            locateStatus: 'success'
          })
        }
      }).catch(function() {
        self.setData({
          'searchForm.from': isGaotie ? '太原南站' : '太原站',
          locateStatus: 'success'
        })
      })
    } else {
      self.setData({
        'searchForm.from': isGaotie ? '太原南站' : '太原站',
        locateStatus: 'success'
      })
    }
  },

  applyStationResult(trainStations) {
    var stationName = ''

    if (this.data.currentTab === 'gaotie') {
      for (var i = 0; i < trainStations.length; i++) {
        if (trainStations[i].name.indexOf('南') >= 0) {
          stationName = this.cleanStationName(trainStations[i].name)
          break
        }
      }
      if (!stationName) {
        stationName = this.cleanStationName(trainStations[0].name)
      }
    } else {
      stationName = this.cleanStationName(trainStations[0].name)
    }

    this.setData({
      'searchForm.from': stationName,
      locateStatus: 'success'
    })
  },

  // 清理站名：去掉"站"字后面的多余内容
  cleanStationName(name) {
    // 匹配常见站名模式：XX站、XX南站、XX北站等
    var match = name.match(/^(.+?[站东西南北])/)
    if (match) return match[1]
    // 如果没有匹配到，去掉括号及之后的内容
    var idx = name.indexOf('(')
    if (idx >= 0) return name.substring(0, idx)
    idx = name.indexOf('（')
    if (idx >= 0) return name.substring(0, idx)
    return name
  },

  // 清理机场名：提取主机场名称
  cleanAirportName(name) {
    // 匹配"XX国际机场"或"XX机场"
    var match = name.match(/^(.+?机场)/)
    if (match) return match[1]
    // 去掉"1号航站楼"、"T2航站楼"等后缀
    var patterns = ['1号航站楼', '2号航站楼', '3号航站楼', 'T1航站楼', 'T2航站楼', 'T3航站楼', '候机区', '办理临时乘机证明']
    for (var i = 0; i < patterns.length; i++) {
      var idx = name.indexOf(patterns[i])
      if (idx >= 0) {
        var result = name.substring(0, idx).trim()
        // 确保以"机场"结尾
        if (result.indexOf('机场') < 0) {
          result = result + '机场'
        }
        return result
      }
    }
    return name
  },

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
        this.applyVoiceResult(false)
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

    // 先去掉口语化前缀：买票/高铁/订票 等意图词，只留下出发/到达信息
    var cleanText = text
      .replace(/^.*?(我想|我要|我打算|帮我|请|麻烦你|能不能|能不能帮我|能不能给我|给我|给我买|给我订|订一张|买一张|我要买|我要订|订个|买个|订|买|坐|乘坐|乘|去买票|去订票|去订|去买)/, '')
      .replace(/(高铁|动车|火车|票|火车票|车票|二等座|一等座|商务座|硬卧|软卧|硬座)/g, '')
      .replace(/嗯|啊|呀|哎|哦|呐|吧|嘛|的呢|呢/g, '')
      .trim()
    if (!cleanText) cleanText = text

    // 提取出发地和目的地
    let from = ''
    let to = ''
    let date = this.data.searchForm.date

    // 提取日期
    const datePatterns = [
      { re: /明天|次日/, val: this.getTomorrow() },
      { re: /后天/, val: this.getDayAfterTomorrow() },
      { re: /今天/, val: formatDate(new Date()) },
      { re: /(\d{1,2})月(\d{1,2})[日号]/, val: null },
      { re: /(\d{1,2})月(\d{1,2})/, val: null },
      { re: /大后天/, val: (function(){var d=new Date();d.setDate(d.getDate()+3);return formatDate(d)})() }
    ]
    for (const p of datePatterns) {
      if (p.re.test(cleanText)) {
        if (p.val) {
          date = p.val
        } else {
          const m = cleanText.match(p.re)
          if (m) {
            const year = new Date().getFullYear()
            date = year + '-' + String(m[1]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0')
          }
        }
        break
      }
    }

    // 提取出发地和目的地
    const routePatterns = [
      /从(.+?)(?:到|去|出发|走)/,
      /(.+?)(?:到|去|飞|前往|直达)(.+?)(?:的|看|找|玩|走|早上|上午|下午|晚上|明天|后天|大后天|今天|$)/,
      /(.+?)(?:到|去|飞|前往|直达)(.+)/
    ]
    for (const p of routePatterns) {
      const m = cleanText.match(p)
      if (m) {
        from = (m[1] || '').trim()
        if (m[2]) to = (m[2]).trim()
        break
      }
    }

    // 如果没提取到，用整句话作为目的地（再做一次净化，去掉"走/早上/明天"等）
    if (!to && !from) {
      var raw = cleanText
        .replace(/(早上|上午|下午|晚上|中午|凌晨|天亮|明早|明晚|一早|一晚)/g, '')
        .replace(/(明天|后天|大后天|今天|这两天|周末|周日|周六|周一|周二|周三|周四|周五)/g, '')
        .replace(/[，。、,.;:：；\s]/g, '')
        .trim()
      if (raw) to = raw
    } else if (!to && from) {
      to = from
      from = ''
    }

    // 出发地已经有autoLocate定位结果，不要覆盖
    if (this.data.searchForm && this.data.searchForm.from) {
      from = this.data.searchForm.from
    }

    // 尝试用高德POI纠正地名
    const self = this
    if (to) {
      const amapService = require('../../services/amap-service.js')
      amapService.searchPOI(to).then(function(poiResult) {
        if (poiResult.success && poiResult.data && poiResult.data.length > 0) {
          to = poiResult.data[0].name
        }
        self.setData({
          'searchForm.from': from || self.data.searchForm.from,
          'searchForm.to': to,
          'searchForm.date': date,
          showVoiceModal: false
        })
        if (!silentFromRoute) {
          showToast('已填入：' + ((from || self.data.searchForm.from) ? (from || self.data.searchForm.from) + ' → ' : '') + to)
        }
      }).catch(function() {
        self.setData({
          'searchForm.from': from || self.data.searchForm.from,
          'searchForm.to': to,
          'searchForm.date': date,
          showVoiceModal: false
        })
        if (!silentFromRoute) {
          showToast('已填入：' + ((from || self.data.searchForm.from) ? (from || self.data.searchForm.from) + ' → ' : '') + to)
        }
      })
    } else {
      this.setData({
        'searchForm.date': date,
        showVoiceModal: false
      })
      if (!silentFromRoute) showToast('未识别到目的地，请手动输入')
    }
  },

  getTomorrow() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return formatDate(d)
  },

  getDayAfterTomorrow() {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return formatDate(d)
  },

  hideVoiceModal() {
    this.setData({
      showVoiceModal: false,
      isRecording: false
    })
  },

  onShow() {
    this.checkCurrentTrip()
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    // 确保此页面允许AI助手监听（首页会禁用，离开首页后需要恢复）
    app.globalData.aiPageListenDisabled = false
    // 设置AI页面上下文（丰富版）
    var that = this
    app.globalData.aiPageContext = {
      page: 'ticket',
      title: '购票',
      summary: '火车/高铁/飞机票预订',
      actions: ['出发地选择', '目的地选择', '选择日期', '查询车次'],
      formFields: ['出发地', '目的地', '出发日期'],
      formData: {
        '出发地': this.data.searchForm.from || '',
        '目的地': this.data.searchForm.to || '',
        '出发日期': this.data.searchForm.date || ''
      },
      tips: '出发地已自动定位，只需输入目的地和选择日期，点底部蓝色按钮查车次'
    }
    // 注册AI助手回调：自动填表单
    app.globalData.aiFillCallback = function(payload) {
      that._handleAIFill(payload.fields)
    }
    // 注册AI助手回调：触发操作
    app.globalData.aiActionCallback = function(payload) {
      if (payload.action === 'search') {
        that.searchTickets()
      }
    }
    // 注册AI助手回调：视觉强化
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

  // AI助手调用：填充表单字段
  _handleAIFill(fields) {
    console.log('[票务页] _handleAIFill被调用, fields:', JSON.stringify(fields))
    if (!fields || Object.keys(fields).length === 0) {
      console.log('[票务页] fields为空，跳过')
      return
    }
    var that = this
    var from = this.data.searchForm.from
    var to = this.data.searchForm.to
    var date = this.data.searchForm.date
    var changed = false

    // 出发地
    if (fields['出发地']) {
      from = fields['出发地'].toString().trim()
      changed = true
      console.log('[票务页] 设置出发地:', from)
    }
    // 目的地
    if (fields['目的地']) {
      to = fields['目的地'].toString().trim()
      changed = true
      console.log('[票务页] 设置目的地:', to)
    }
    // 出发日期
    if (fields['出发日期']) {
      var dateStr = fields['出发日期'].toString().trim()
      var parsed = this._parseDateExpression(dateStr)
      if (parsed) {
        date = parsed
        changed = true
        console.log('[票务页] 设置日期:', date)
      } else {
        console.log('[票务页] 日期解析失败:', dateStr)
      }
    }

    console.log('[票务页] changed:', changed, 'from:', from, 'to:', to, 'date:', date)
    if (!changed) return

    // 立即填充表单（原始值），让用户马上看到结果
    this.setData({
      'searchForm.from': from,
      'searchForm.to': to,
      'searchForm.date': date
    })
    app.globalData.aiPageContext.formData = {
      '出发地': from, '目的地': to, '出发日期': date
    }
    showToast('已填入：' + (from ? from + ' → ' : '') + to)

    // 如果有目的地，异步用高德POI纠正站名（带类型筛选）
    if (to) {
      const amapService = require('../../services/amap-service.js')
      // 带车站类型搜索：先查火车站类型(150100)，更准确
      amapService.searchPOI(to, '', '150100').then(function(poiResult) {
        if (poiResult.success && poiResult.data && poiResult.data.length > 0) {
          var best = _pickBestMatch(to, poiResult.data)
          if (best && best.name && best.name !== to) {
            that.setData({ 'searchForm.to': best.name })
            app.globalData.aiPageContext.formData['目的地'] = best.name
          }
        }
      }).catch(function() {})
    }
  },

  // 解析日期表达式：明天/后天/8月7号/2026-08-07等
  _parseDateExpression(str) {
    if (!str) return null
    if (/明天|次日/.test(str)) return this.getTomorrow()
    if (/后天/.test(str)) return this.getDayAfterTomorrow()
    if (/今天|当日/.test(str)) return formatDate(new Date())
    // X月X日/X月X号
    var m = str.match(/(\d{1,2})[月\-](\d{1,2})[日号]?/)
    if (m) {
      var year = new Date().getFullYear()
      return year + '-' + String(m[1]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0')
    }
    // 已经是 YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
    return null
  },

  // AI视觉强化：高亮指定字段，2秒后自动取消
  _handleAIHighlight(fieldNames) {
    if (!fieldNames || !fieldNames.length) return
    var highlightFields = {}
    for (var i = 0; i < fieldNames.length; i++) {
      highlightFields[fieldNames[i]] = true
    }
    this.setData({ highlightFields: highlightFields })
    var that = this
    // 2.5秒后恢复
    setTimeout(function() {
      that.setData({ highlightFields: {} })
    }, 2500)
  },

  goBack() {
    wx.navigateBack()
  },

  showExitReminder() {
    const trip = this.data.currentTrip
    if (!trip) return

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    if (trip.date !== today) return

    const key = 'trip_remind_' + trip.orderId
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

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab,
      results: []
    })
    // 切换类型后重新定位附近站点
    this.autoLocateFrom()
  },

  onFromInput(e) {
    this.setData({
      'searchForm.from': e.detail.value
    })
  },

  onToInput(e) {
    this.setData({
      'searchForm.to': e.detail.value
    })
  },

  swapRoute() {
    const { from, to } = this.data.searchForm
    this.setData({
      'searchForm.from': to,
      'searchForm.to': from
    })
  },

  onDateChange(e) {
    this.setData({
      'searchForm.date': e.detail.value
    })
  },

  // 站点模糊匹配：支持"太原"匹配"太原南站"、"南京站"匹配"南京南站"
  stationMatches(search, stationName) {
    if (!search || !stationName) return false
    if (stationName.indexOf(search) >= 0 || search.indexOf(stationName) >= 0) return true
    var s1 = search.replace(/站$/, '')
    var s2 = stationName.replace(/站$/, '')
    if (s2.indexOf(s1) >= 0 || s1.indexOf(s2) >= 0) return true
    // 同一个城市匹配：太原/太原站 匹配 太原南站、太原站等
    var city1 = s1.replace(/[南西北东]/g, '')
    var city2 = s2.replace(/[南西北东]/g, '')
    if (city1 && city2 && city1 === city2) return true
    return false
  },

  searchTickets() {
    const { from, to, date } = this.data.searchForm
    if (!from) {
      showToast('请输入出发地')
      return
    }
    if (!to) {
      showToast('请输入目的地')
      return
    }
    if (!date) {
      showToast('请选择出发日期')
      return
    }

    const isTrainTab = this.data.currentTab === 'train' || this.data.currentTab === 'gaotie'
    let results = isTrainTab ? trains : buses
    const self = this
    results = results.filter(function(item) {
      return self.stationMatches(from, item.startStation) && self.stationMatches(to, item.endStation)
    })

    if (this.data.currentTab === 'gaotie') {
      results = results.filter(item => item.type === '高铁' || item.type === '动车')
    }

    if (this.data.sortBy === 'price') {
      results.sort((a, b) => a.price - b.price)
    } else {
      results.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }

    if (results.length === 0) {
      showToast('未找到符合条件的车次')
    }

    this.setData({
      results
    })
  },

  selectQuickRoute(e) {
    const from = e.currentTarget.dataset.from
    const to = e.currentTarget.dataset.to
    this.setData({
      'searchForm.from': from,
      'searchForm.to': to
    })
    this.searchTickets()
  },

  setSort(e) {
    const sort = e.currentTarget.dataset.sort
    this.setData({
      sortBy: sort
    })
    this.searchTickets()
  },

  showStationPicker(e) {
    const type = e.currentTarget.dataset.type
    const stations = this.data.currentTab === 'train' ? trainStations : busStations
    this.setData({
      showPicker: true,
      pickerTitle: type === 'from' ? '选择出发地' : '选择目的地',
      pickerType: type,
      filteredStations: stations,
      searchKeyword: ''
    })
  },

  hidePicker() {
    this.setData({
      showPicker: false
    })
  },

  onSearchKeyword(e) {
    const keyword = e.detail.value
    const stations = this.data.currentTab === 'train' ? trainStations : busStations
    const filtered = stations.filter(item => item.name.includes(keyword))
    this.setData({
      searchKeyword: keyword,
      filteredStations: filtered
    })
  },

  confirmStation(e) {
    const name = e.currentTarget.dataset.name
    const type = this.data.pickerType
    this.setData({
      [`searchForm.${type}`]: name,
      showPicker: false
    })
  },

  selectStation(e) {
    const name = e.currentTarget.dataset.name
    const { from, to } = this.data.searchForm
    if (!from) {
      this.setData({
        'searchForm.from': name
      })
    } else if (!to) {
      this.setData({
        'searchForm.to': name
      })
    } else {
      this.setData({
        'searchForm.from': name,
        'searchForm.to': ''
      })
    }
  },

  goToTicketDetail(e) {
    const ticket = e.currentTarget.dataset.ticket
    const type = this.data.currentTab
    wx.navigateTo({
      url: `/pages/ticket-detail/ticket-detail?type=${type}&id=${ticket.id}`
    })
  },

  preventBubble() {
    // 阻止事件冒泡，点击弹窗内容时不关闭弹窗
  },
})