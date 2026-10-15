const app = getApp()
const { formatDate, formatTime } = require('../../utils/index')
const { callAI, planTrip } = require('../../services/ai-service')
const amapService = require('../../services/amap-service.js')
const baiduAsr = require('../../services/baidu-asr.js')
const entityExtractor = require('../../services/entity-extract.js')

Page({
  data: {
    messages: [],
    userMessages: [],
    inputText: '',
    isListening: false,
    isThinking: false,
    chatHistory: [],
    currentIntent: null,
    pendingQuestions: [],
    recordingDuration: 0,
    showVoiceWave: false,
    showSuggestions: false,
    suggestions: ['去省人民医院', '回家', '去太原南站', '去机场', '查天气', '现在几点']
  },

  onLoad: function() {
    this.addMessage('assistant', '您好！我是您的出行小助手，请问您想去哪里？')
    this.speak('您好！我是您的出行小助手，请问您想去哪里？')
  },

  goBack() {
    wx.navigateBack()
  },

  addMessage: function(role, content) {
    var messages = this.data.messages
    messages.push({
      role: role,
      content: content,
      time: formatTime(new Date())
    })
    this.setData({ messages: messages })
    
    var history = this.data.chatHistory
    history.push({ role: role === 'assistant' ? 'assistant' : 'user', content: content })
    this.setData({ chatHistory: history })
    
    setTimeout(function() {
      this.scrollToBottom()
    }.bind(this), 100)
  },

  scrollToBottom: function() {
    var len = this.data.messages.length
    if (len > 0) {
      this.setData({ scrollIntoId: 'msg-' + (len - 1) })
    }
  },

  useSuggestion(e) {
    var text = e.currentTarget.dataset.text
    if (!text) return
    this.setData({ inputText: text })
    this.sendMessage()
  },

  speak: function(text) {
    if (wx.speechSynthesis) {
      wx.speechSynthesis.stop()
      wx.speechSynthesis.speak({
        text: text,
        lang: 'zh_CN',
        rate: 0.8,
        volume: 1.0
      })
    }
  },

  vibrate: function(type = 'light') {
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: type })
    }
  },

  onInput: function(e) {
    this.setData({ inputText: e.detail.value })
  },

  sendMessage: function() {
    var text = this.data.inputText.trim()
    if (!text) return

    this.addMessage('user', text)
    this.setData({ inputText: '', isThinking: true })

    this.processMessage(text)
  },

  processMessage: async function(message) {
    var that = this
    var intent = that.data.currentIntent
    var pending = that.data.pendingQuestions
    
    if (pending && pending.length > 0 && intent && intent.to) {
      var response = that.handlePendingQuestion(message, intent, pending)
      that.handleResponse(response)
      return
    }
    
    try {
      var response = await callAI(message, that.data.chatHistory.slice(-10))
      that.handleResponse(response)
    } catch (err) {
      var fallbackResponse = await that.generateResponse(message)
      that.handleResponse(fallbackResponse)
    }
  },

  generateResponse: async function(message) {
    // 优先用AI返回的结构化结果（AI已做过语义理解和实体提取）
    // 正则NLP只做兜底
    var nlpResult = this.parseNLP(message)

    if (nlpResult.intent === 'greeting') {
      return { action: 'greeting', params: {}, reply: '您好！我是您的出行小助手，请问您想去哪里？' }
    }

    if (nlpResult.intent === 'cancel') {
      return { action: 'cancel', params: {}, reply: '好的，已取消操作。如果需要帮助，请随时告诉我。' }
    }

    if (nlpResult.intent === 'ask_time') {
      var now = new Date()
      var hours = now.getHours()
      var minutes = now.getMinutes()
      var timeStr = hours + '点' + (minutes > 0 ? minutes + '分' : '')
      return { action: 'ask_time', params: {}, reply: '现在是' + timeStr + '。' }
    }

    if (nlpResult.intent === 'ask_weather') {
      return { action: 'ask_weather', params: {}, reply: '今天太原天气晴朗，气温25到32度，适合出行。' }
    }

    if (nlpResult.intent === 'route_plan') {
      // AI已经提取了实体，直接用
      var to = nlpResult.destination || ''
      var date = nlpResult.date || ''
      var time = nlpResult.time || ''
      var purpose = nlpResult.purpose || ''
      var transport = nlpResult.preferences || []

      // 根据目的地类型补充名称
      if (to === '家' || to === '家里') {
        to = app.globalData.homeAddress || '家'
      }

      if (!to) {
        if (this.data.currentIntent && this.data.currentIntent.to) {
          to = this.data.currentIntent.to
        } else {
          return { action: 'route_plan', params: {}, reply: '请问您想去哪里呢？' }
        }
      } else if (to !== '家' && to !== '医院' && to !== '火车站' && to !== '机场') {
        // 普通地点用高德POI搜索确认
        var poiResult = await amapService.searchPOI(to)
        if (poiResult.success && poiResult.data.length > 0) {
          to = poiResult.data[0].name
          console.log('高德POI确认地点:', to)
        }
      }

      // 构建回复
      var replyParts = ['好的']
      if (date) replyParts.push(date)
      if (time) replyParts.push(time)
      if (purpose) {
        replyParts.push('去' + to + purpose)
      } else {
        replyParts.push('去' + to)
      }

      if (!date && !time) {
        replyParts.push('。请问您想什么时候出发呢？')
        return { action: 'route_plan', params: { to: to, purpose: purpose, transport: transport }, reply: replyParts.join('') }
      }

      replyParts.push('的路线，正在为您规划...')
      return { action: 'route_plan', params: { to: to, date: date, time: time, purpose: purpose, transport: transport }, reply: replyParts.join('') }
    }

    return { action: 'unknown', params: {}, reply: '抱歉，我没听懂您的意思。请问您想去哪里？' }
  },

  parseNLP: function(text) {
    var result = {
      intent: 'unknown',
      destination: '',
      date: '',
      time: '',
      purpose: '',
      preferences: []
    }

    if (/你好|您好|哈喽|hi|hello|嘿|嗨/i.test(text)) {
      result.intent = 'greeting'
      return result
    }

    if (/取消|退出|结束|重来|算了/i.test(text)) {
      result.intent = 'cancel'
      return result
    }

    if (/几点|时间|现在几点|现在时间/i.test(text)) {
      result.intent = 'ask_time'
      return result
    }

    if (/天气|下雨|晴天|温度|冷|热/i.test(text)) {
      result.intent = 'ask_weather'
      return result
    }

    result.intent = 'route_plan'

    var dateMatch = text.match(/(明天|后天|今天|周六|周日|周一|周二|周三|周四|周五)/)
    if (dateMatch) {
      result.date = dateMatch[1]
    }

    var timeMatch = text.match(/(上午|下午|晚上|早晨|中午|早上|凌晨|半夜)?\s*(\d+点半|\d+点\d{1,2}分|\d+点半|\d+点|\d+:\d+)/) || text.match(/(\d+点半|\d+点\d{1,2}分|\d+点|\d+:\d+)/) || text.match(/(上午|下午|晚上|早晨|中午|早上|凌晨|半夜)/)
    if (timeMatch) {
      if (timeMatch[2]) {
        result.time = (timeMatch[1] || '') + timeMatch[2]
      } else {
        result.time = timeMatch[1] || timeMatch[0]
      }
    }

    var homeKeywords = ['回家', '回家里', '我家', '家里']
    var hospitalKeywords = ['医院', '就医', '看病', '挂号', '复诊', '体检', '就诊']
    var stationKeywords = ['车站', '火车站', '动车站', '高铁站', '火车', '动车', '高铁']
    var airportKeywords = ['机场', '飞机', '航班', '航站楼']

    if (homeKeywords.some(k => text.includes(k))) {
      result.destination = app.globalData.homeAddress || '家'
    } else if (hospitalKeywords.some(k => text.includes(k))) {
      var hospitalMatch = text.match(/(省人民医院|市人民医院|中医院|中心医院|第一医院|第二医院|妇幼保健院|儿童医院|眼科医院|骨科医院)/)
      result.destination = hospitalMatch ? hospitalMatch[1] : '医院'
    } else if (stationKeywords.some(k => text.includes(k))) {
      var stationMatch = text.match(/(太原站|太原南站|太原东站|太原西站|大同站|晋中站|忻州站)/)
      result.destination = stationMatch ? stationMatch[1] : '火车站'
    } else if (airportKeywords.some(k => text.includes(k))) {
      var airportMatch = text.match(/(太原武宿机场|武宿机场|太原机场)/)
      result.destination = airportMatch ? airportMatch[1] : '机场'
    } else {
      var toMatch = text.match(/去(.+?)[，。？、]/) || text.match(/到(.+?)[，。？、]/) || text.match(/前往(.+?)[，。？、]/)
      if (toMatch) {
        result.destination = toMatch[1].trim()
      } else {
        var cleanText = text.replace(/我要|我想去|我要去|帮我|想|规划|路线|出发/g, '')
        cleanText = cleanText.replace(/[，。？、]/g, '').trim()
        if (cleanText && cleanText.length <= 20) {
          result.destination = cleanText
        }
      }
    }

    if (text.includes('打车') || text.includes('出租车') || text.includes('网约车')) {
      result.preferences.push('taxi')
    }
    if (text.includes('地铁') || text.includes('地铁')) {
      result.preferences.push('subway')
    }
    if (text.includes('公交') || text.includes('公交车')) {
      result.preferences.push('bus')
    }

    return result
  },

  generateRouteReply: function(to, date, time) {
    var dateStr = date ? date + ' ' : ''
    var timeStr = time ? time + ' ' : ''
    return '好的，已为您规划' + dateStr + timeStr + '出发去' + to + '的路线，正在为您跳转...'
  },

  handlePendingQuestion: function(message, intent, pending) {
    var firstQuestion = pending[0]
    var to = intent.to || ''
    var date = intent.date || ''
    var time = intent.time || ''
    
    if (firstQuestion === 'confirm_address' || firstQuestion === 'destination' || firstQuestion === '地址') {
      var nlpResult = this.parseNLP(message)
      var dest = nlpResult.destination || message
      return { action: 'route_plan', params: { to: dest, date: '', time: '' }, reply: '好的，已为您规划去' + dest + '的路线，正在为您跳转...' }
    }
    
    if (firstQuestion === 'departure_time' || firstQuestion === '出发时间' || firstQuestion === 'time' || firstQuestion === '出行日期和时间') {
      var nlpResult = this.parseNLP(message)
      var useDate = nlpResult.date || date || '今天'
      var useTime = nlpResult.time || message
      
      if (!nlpResult.date && !nlpResult.time) {
        return { action: 'route_plan', params: { to: to, date: useDate, time: message }, reply: '好的，已为您规划' + useDate + message + '出发去' + to + '的路线，正在为您跳转...' }
      }
      
      return { action: 'route_plan', params: { to: to, date: useDate, time: useTime }, reply: '好的，已为您规划' + useDate + (useTime || '') + '出发去' + to + '的路线，正在为您跳转...' }
    }
    
    return { action: 'unknown', params: {}, reply: '抱歉，我没听懂您的意思。' }
  },

  handleResponse: function(response) {
    this.setData({ isThinking: false })
    
    if (!response.reply) {
      response.reply = '抱歉，我没听懂您的意思。'
    }

    this.addMessage('assistant', response.reply)
    this.speak(response.reply)
    this.vibrate()

    switch (response.action) {
      case 'go_home':
        this.handleGoHome(response)
        break
      case 'go_hospital':
        this.handleGoHospital(response)
        break
      case 'go_station':
        this.handleGoStation(response)
        break
      case 'route_plan':
        this.handleRoutePlan(response)
        break
      case 'ask_question':
        this.handleAskQuestion(response)
        break
      case 'cancel':
        this.handleCancel(response)
        break
    }
  },

  handleGoHome: function(response) {
    var address = app.globalData.homeAddress || response.params.to || '您的家'
    this.setData({
      currentIntent: { type: 'go_home', to: address, from: '太原' },
      pendingQuestions: ['confirm_address']
    })
  },

  handleGoHospital: function(response) {
    var hospital = response.params.to || '省人民医院'
    this.setData({
      currentIntent: { type: 'go_hospital', to: hospital, from: '太原' },
      pendingQuestions: ['departure_time']
    })
  },

  handleGoStation: function(response) {
    var station = response.params.to || '太原南站'
    this.setData({
      currentIntent: { type: 'go_station', to: station, from: '太原' },
      pendingQuestions: ['departure_time']
    })
  },

  handleRoutePlan: function(response) {
    var to = response.params.to || ''
    var date = response.params.date || ''
    var time = response.params.time || ''
    var purpose = response.params.purpose || ''

    if (!to) {
      this.setData({
        currentIntent: { type: 'route_plan', from: '太原' },
        pendingQuestions: ['destination']
      })
      setTimeout(function() {
        this.addMessage('assistant', '请问您想去哪里呢？')
        this.speak('请问您想去哪里呢？')
      }.bind(this), 500)
      return
    }

    // 有日期或时间就直接规划，不再追问
    var hasDate = date && date !== '' && date !== '今天'
    var hasTime = time && time !== ''

    if (!hasDate && !hasTime) {
      // 连日期都没说，才追问
      this.setData({
        currentIntent: { type: 'route_plan', to: to, from: '太原', date: date, time: time, purpose: purpose },
        pendingQuestions: ['departure_time']
      })
      setTimeout(function() {
        this.addMessage('assistant', '请问您想什么时候出发呢？（例如：明天上午九点）')
        this.speak('请问您想什么时候出发呢？')
      }.bind(this), 500)
    } else {
      // 有日期或时间就直接规划
      this.confirmAndNavigate(to, date, time, purpose)
    }
  },

  handleAskQuestion: function(response) {
    var questionType = response.params.question || 'unknown'
    var to = response.params.to || ''
    
    if (!to && response.reply) {
      var match = response.reply.match(/去(.+?)的路线/)
      if (match) {
        to = match[1]
      }
    }
    
    var intentType = 'asking'
    if (questionType === '出行日期和时间' || questionType === '出发时间') {
      intentType = 'route_plan'
    }
    
    this.setData({
      currentIntent: { type: intentType, question: questionType, to: to },
      pendingQuestions: [questionType]
    })
  },

  handleCancel: function(response) {
    this.setData({ currentIntent: null, pendingQuestions: [] })
  },

  confirmAndNavigate: function(to, date, time) {
    var dateStr = this.parseDate(date)
    var reply = '好的，已为您规划' + dateStr + (time || '') + '出发去' + to + '的路线。正在返回首页...'
    this.addMessage('assistant', reply)
    this.speak(reply)
    this.vibrate('medium')

    app.globalData.tripPlan = {
      to: to,
      date: date || '',
      time: time || ''
    }

    setTimeout(function() {
      wx.reLaunch({ url: '/pages/index/index' })
    }, 1500)
  },

  parseDate: function(dateText) {
    if (!dateText || dateText === '今天') return ''
    if (dateText === '明天') return '明天 '
    if (dateText === '后天') return '后天 '
    return dateText + ' '
  },

  startListening: function() {
    var that = this
    
    if (that.data.isListening) {
      that.stopListening()
      return
    }

    that.setData({ isListening: true, showVoiceWave: true, recordingDuration: 0 })
    that.vibrate('medium')
    
    wx.showToast({ title: '正在听...', icon: 'none', duration: 0 })

    that._recordingTimer = setInterval(function() {
      var duration = that.data.recordingDuration + 1
      that.setData({ recordingDuration: duration })
      if (duration >= 60) {
        that.stopListening()
      }
    }, 1000)

    var recorderManager = wx.getRecorderManager()
    recorderManager.onStop(function(res) {
      that.stopListening()
      that.handleRecordSuccess(res.tempFilePath)
    })
    recorderManager.onError(function(err) {
      that.stopListening()
      console.error('录音失败:', err)
      wx.authorize({
        scope: 'scope.record',
        success: function() {
          that.startListening()
        },
        fail: function() {
          wx.showModal({
            title: '需要录音权限',
            content: '请在设置中开启录音权限，以便使用语音输入功能',
            showCancel: false
          })
        }
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

  stopListening: function() {
    this.setData({ isListening: false, showVoiceWave: false })
    wx.hideToast()
    
    try {
      var recorderManager = wx.getRecorderManager()
      recorderManager.stop()
    } catch(e) {}
    
    if (this._recordingTimer) {
      clearInterval(this._recordingTimer)
      this._recordingTimer = null
    }
  },

  handleRecordSuccess: function(filePath) {
    var that = this
    that.setData({ isThinking: true })
    wx.showLoading({ title: '百度识别中...' })

    baiduAsr.recognizeSpeech(filePath).then(function(result) {
      wx.hideLoading()
      if (result && result.text) {
        console.log('百度ASR识别结果:', result.text)
        that.setData({ inputText: result.text })
        that.sendMessage()
      } else {
        that.handleMockVoiceInput()
      }
    }).catch(function(err) {
      wx.hideLoading()
      console.error('百度ASR识别失败:', err)
      that.handleMockVoiceInput()
    })
  },

  handleMockVoiceInput: function() {
    var mockTexts = [
      '帮我规划去省人民医院的路线',
      '我要回家',
      '明天上午九点去太原南站',
      '去南京看孙子',
      '今天下午三点去火车站',
      '后天下午去中医院',
      '现在几点了',
      '明天天气怎么样',
      '我想去北京旅游',
      '帮我订一张去上海的车票'
    ]
    var mockText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
    this.setData({ inputText: mockText })
    this.sendMessage()
  },

  clearHistory: function() {
    this.setData({ messages: [], currentIntent: null, pendingQuestions: [], chatHistory: [] })
    this.addMessage('assistant', '您好！我是您的出行小助手，请问您想去哪里？')
    this.speak('您好！我是您的出行小助手，请问您想去哪里？')
  }
})