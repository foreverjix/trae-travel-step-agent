const app = getApp()
const { hotRoutes } = require('../../data/mock')
const { getOrderStatusText, getOrderStatusColor, showToast } = require('../../utils/index')
const travelService = require('../../services/travel.js')
const amapService = require('../../services/amap-service.js')
const baiduAsrService = require('../../services/baidu-asr.js')

Page({
  data: {
    userName: '长辈',
    greeting: '您好',
    today: '',
    weekDay: '',
    homeName: '点击设置家庭地址',
    hospitalName: '点击设置就医地址',
    stationName: '点击设置车站地址',
    isRecording: false,
    showVoiceModal: false,
    isRecognizing: false,
    voiceText: '正在听您说…',
    voiceResult: '',
    currentTrip: null,
    showTripDetail: false,
    statusBarHeight: 44,
    role: 'elder',
    parentAccounts: [],
    tripResult: null,
    isProcessing: false,
    isLocationSharing: false,
    showMoreFeatures: false,
    aiAssistantEnabled: false
  },

  onLoad() {
    this.initStatusBar()
    this.initData()
    this.initDate()
    this.initRecorder()
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
        isRecognizing: false
      })
    })
  },

  onShow() {
    this.initData()
    this.checkCurrentTrip()
    this.checkTripPlan()
    this.showExitReminder()
    this.setData({
      isLocationSharing: app.globalData.isLocationSharing,
      aiAssistantEnabled: app.globalData.aiAssistantEnabled
    })
    // 长辈端：默认开启位置共享，让子女能随时看到父母位置
    if (this.data.role === 'elder' && !app.globalData.isLocationSharing) {
      this.autoStartLocationShare()
    }
    // 首页：AI助手只播报欢迎语，不进入监听（用页面大麦克风代替）
    app.globalData.aiPageListenDisabled = true
    // 设置AI页面上下文（丰富版）
    app.globalData.aiPageContext = {
      page: 'index',
      title: '首页',
      summary: '出行助手首页',
      actions: ['买票', '打车', '查行程', '常用地址（回家/就医/车站）', '语音助手'],
      formFields: [],
      formData: {},
      tips: '首页有买票、打车、查行程三个大按钮，想做什么点对应的就行'
    }
  },

  onHide() {
    // 离开首页时恢复监听模式
    app.globalData.aiPageListenDisabled = false
  },

  noop() {},

  cancelProcessing() {
    this.setData({ isProcessing: false })
    wx.showToast({ title: '已取消', icon: 'none' })
  },

  enableAI() {
    this.setData({ aiAssistantEnabled: true })
    app.globalData.aiAssistantEnabled = true
    // 通知其他页面
    var pages = getCurrentPages()
    pages.forEach(function(page) {
      if (page.setData) {
        page.setData({ aiAssistantEnabled: true })
      }
    })
    wx.showToast({ title: 'AI助手已开启', icon: 'success' })
  },

  disableAI() {
    this.setData({ aiAssistantEnabled: false })
    app.globalData.aiAssistantEnabled = false
    // 通知其他页面
    var pages = getCurrentPages()
    pages.forEach(function(page) {
      if (page.setData) {
        page.setData({ aiAssistantEnabled: false })
      }
    })
    wx.showToast({ title: 'AI助手已关闭', icon: 'none' })
  },

  checkTripPlan() {
    const tripPlan = app.globalData.tripPlan
    if (tripPlan && tripPlan.to) {
      const to = tripPlan.to
      const date = tripPlan.date || ''
      const time = tripPlan.time || ''
      
      app.globalData.tripPlan = null
      
      wx.navigateTo({
        url: '/pages/map-trip/map-trip?to=' + encodeURIComponent(to) + '&date=' + encodeURIComponent(date) + '&time=' + encodeURIComponent(time)
      })
    }
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
  },

  initStatusBar() {
    let statusBarHeight = 44
    try {
      if (wx.getWindowInfo) {
        statusBarHeight = wx.getWindowInfo().statusBarHeight || statusBarHeight
      } else {
        statusBarHeight = wx.getSystemInfoSync().statusBarHeight || statusBarHeight
      }
    } catch (e) {}
    this.setData({ statusBarHeight })
  },

  initDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekDay = weekDays[now.getDay()]
    
    const hour = now.getHours()
    let greeting = '您好'
    if (hour < 6) greeting = '夜深了'
    else if (hour < 9) greeting = '早上好'
    else if (hour < 12) greeting = '上午好'
    else if (hour < 14) greeting = '中午好'
    else if (hour < 18) greeting = '下午好'
    else greeting = '晚上好'
    
    this.setData({
      today: year + '年' + month + '月' + day + '日',
      weekDay: weekDay,
      greeting: greeting
    })
  },

  initData() {
    const userInfo = app.globalData.userInfo
    const role = app.globalData.role || wx.getStorageSync('role') || 'elder'
    
    const homeAddress = wx.getStorageSync('homeAddress')
    const hospitalAddress = wx.getStorageSync('hospitalAddress')
    const stationAddress = wx.getStorageSync('stationAddress')
    
    // 读取已绑定的长辈账号
    const parentAccounts = (app.globalData.parentAccounts || wx.getStorageSync('parentAccounts') || []).map(function(account) {
      var name = account.name || ''
      // 提取姓名中的姓氏部分（处理"父亲-张大爷"格式）
      var avatarChar = name.charAt(0)
      if (name.indexOf('-') > -1) {
        var parts = name.split('-')
        var realName = parts[parts.length - 1]
        avatarChar = realName.charAt(0)
      }
      return Object.assign({}, account, { avatarChar: avatarChar })
    })
    
    const updateData = {
      userName: userInfo ? userInfo.name : (role === 'family' ? '小张' : '长辈'),
      role: role,
      parentAccounts: parentAccounts
    }
    
    if (homeAddress) updateData.homeName = homeAddress
    if (hospitalAddress) updateData.hospitalName = hospitalAddress
    if (stationAddress) updateData.stationName = stationAddress
    
    this.setData(updateData)
  },

  checkCurrentTrip() {
    const orders = app.globalData.orders || []
    const today = new Date().toISOString().split('T')[0]
    
    let currentTrip = orders.find(o => {
      return o.date >= today && ['booked', 'waiting', 'picking', 'onway'].includes(o.status)
    })
    
    if (!currentTrip) {
      const hasShownDemo = wx.getStorageSync('demoTripShown')
      if (!hasShownDemo) {
        currentTrip = this.createDemoTrip()
        wx.setStorageSync('demoTripShown', true)
        // 将演示行程加入全局订单列表，使详情页能找到
        if (!app.globalData.orders) app.globalData.orders = []
        app.globalData.orders.push(currentTrip)
      }
    }
    
    if (currentTrip) {
      this.setData({ currentTrip })
      this.announceNextStep(currentTrip)
    } else {
      this.setData({ currentTrip: null })
    }
  },

  createDemoTrip() {
    // 创建一个演示行程，让老人体验功能
    const demoTrip = {
      orderId: 'DEMO001',
      type: 'train',
      status: 'booked',
      date: new Date().toISOString().split('T')[0],
      from: '太原',
      to: '南京',
      name: 'G1954',
      departureTime: '08:30',
      arrivalTime: '13:20',
      seat: '二等座 05车 12A',
      price: 590,
      steps: [
        { type: 'taxi', name: '网约车到太原南站', time: '07:30', status: 'pending', plate: '晋A·88888', driver: '王师傅', location: '太原南' },
        { type: 'train', name: '高铁 G1954', time: '08:30', status: 'pending', seat: '二等座 05车 12A', platform: '3站台', location: '太原南 → 南京南' },
        { type: 'taxi', name: '网约车到目的地', time: '13:30', status: 'pending', plate: '苏A·66666', driver: '李师傅', location: '南京南 → 南京' }
      ]
    }
    return demoTrip
  },

  announceNextStep(trip) {
    // 语音播报下一段行程
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute
    
    // 找到下一个未完成的行程段
    const nextStep = trip.steps.find(s => s.status === 'pending')
    if (!nextStep) return
    
    const timeParts = nextStep.time.split(':')
    const stepHour = Number(timeParts[0])
    const stepMinute = Number(timeParts[1])
    const stepTime = stepHour * 60 + stepMinute
    
    // 如果距离下一段行程还有30分钟以内，播报提醒
    const timeDiff = stepTime - currentTime
    if (timeDiff > 0 && timeDiff <= 30) {
      const announceKey = 'announced_' + trip.orderId + '_' + nextStep.type
      const hasAnnounced = wx.getStorageSync(announceKey)
      
      if (!hasAnnounced) {
        let message = ''
        if (nextStep.type === 'taxi') {
          message = '温馨提示：' + nextStep.time + '有网约车，车牌号' + nextStep.plate + '，司机' + nextStep.driver + '，请提前准备。'
        } else if (nextStep.type === 'train') {
          message = '温馨提示：' + nextStep.time + '的' + nextStep.name + '，座位' + nextStep.seat + '，' + nextStep.platform + '，请提前到站。'
        }
        
        if (getCurrentPages().length === 0) return
        try {
          wx.showModal({
            title: '📢 行程提醒',
            content: message,
            showCancel: false,
            confirmText: '知道了',
            success: () => {
              wx.setStorageSync(announceKey, true)
            }
          })
        } catch (e) {}
      }
    }
  },

  goToTripDetail() {
    const trip = this.data.currentTrip
    if (!trip) return
    
    wx.navigateTo({
      url: '/pages/order-detail/order-detail?orderId=' + trip.orderId
    })
  },

  // 语音相关
  startVoice() {
    wx.showModal({
      title: '🎙️ 语音助手',
      content: '请说出您的目的地，例如"我要去县医院"',
      showCancel: true,
      cancelText: '取消',
      confirmText: '开始说话',
      success: (res) => {
        if (res.confirm) {
          this.startRecord()
        }
      }
    })
  },

  startRecord() {
    // 暂停AI助手，避免录音冲突
    app.globalData.aiPausedByMainMic = true
    try {
      // 通过组件选择器获取AI助手实例，强制停止其录音
      var aiAssistant = this.selectComponent('#ai-assistant')
      if (aiAssistant && aiAssistant.forceStopRecording) {
        aiAssistant.forceStopRecording()
      }
      // 停止AI助手正在播放的TTS
      var ttsService = require('../../services/baidu-tts.js')
      ttsService.stopPlay()
    } catch (e) {}

    this.setData({
      isRecording: true,
      showVoiceModal: true,
      voiceText: '正在听您说，说完点击下方按钮',
      voiceResult: '',
      isProcessing: false
    })
    
    const recorderManager = wx.getRecorderManager()
    // 覆盖AI助手的onFrameRecorded回调（防止VAD干扰大麦克风录音）
    recorderManager.onFrameRecorded(() => {})
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
        isRecognizing: false
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
      voiceText: '正在识别...',
      isRecognizing: true
    })
  },

  handleVoiceResult(tempFilePath) {
    this.setData({ isProcessing: true })

    // 安全超时：防止识别过程卡住导致遮罩永远不消失
    var safetyTimeout = setTimeout(function() {
      if (this.data.isProcessing) {
        this.setData({ isProcessing: false })
        wx.showToast({ title: '识别超时，请重试', icon: 'none' })
      }
    }.bind(this), 15000)

    baiduAsrService.recognizeSpeech(tempFilePath).then((res) => {
      clearTimeout(safetyTimeout)
      // 识别完成，恢复AI助手
      this._resumeAIListening()
      if (res.success && res.text) {
        var text = res.text
        this.setData({
          isRecognizing: false,
          isProcessing: false,
          showVoiceModal: false,
          voiceResult: text
        })
        // 意图识别：先判断是买票/打车/查行程，最后才是行程规划
        var intent = this._classifyIntent(text)
        if (intent === 'ticket') {
          wx.navigateTo({
            url: '/pages/ticket/ticket?from=voice&voiceText=' + encodeURIComponent(text)
          })
        } else if (intent === 'taxi') {
          wx.navigateTo({
            url: '/pages/taxi/taxi?from=voice&voiceText=' + encodeURIComponent(text)
          })
        } else if (intent === 'orders') {
          wx.navigateTo({ url: '/pages/orders/orders' })
        } else {
          // 最后才是行程规划
          wx.navigateTo({
            url: '/pages/map-trip/map-trip?from=voice&voiceText=' + encodeURIComponent(text)
          })
        }
      } else {
        this.setData({
          isRecognizing: false,
          voiceText: '识别失败，请重试',
          isProcessing: false
        })
      }
    }).catch((error) => {
      clearTimeout(safetyTimeout)
      console.error('语音识别错误:', error)
      this._resumeAIListening()
      this.setData({
        isRecognizing: false,
        voiceText: '识别失败，请重试',
        isProcessing: false
      })
    })
  },

  // 恢复AI助手监听（大麦克风录音结束后调用）
  _resumeAIListening() {
    app.globalData.aiPausedByMainMic = false
  },

  // 语音意图识别：买票 / 打车 / 查行程 / 行程规划
  _classifyIntent(text) {
    // 打车意图
    var taxiKw = /打车|叫车|出租车|快车|约车|去接|送我|接我|送一下|叫个车|打个车|坐车|拦车|滴滴/
    if (taxiKw.test(text)) return 'taxi'
    // 买票/票务意图
    var ticketKw = /买票|购票|火车票|高铁|动车|火车|订票|订一张|买一张|取票|改签|退票|换时间|坐火车|坐高铁|乘车|去车站|火车站/
    if (ticketKw.test(text)) return 'ticket'
    // 查行程/订单意图
    var ordersKw = /我的行程|行程|订单|看行程|查行程|订单详情|车票详情|打车订单|我订的|我买的/
    if (ordersKw.test(text)) return 'orders'
    // 默认：行程规划
    return 'plan'
  },

  autoDispatchTrip(voiceText) {
    let destination = '目的地'
    const patterns = [
      { re: /去(.+?)(?:看|找|玩|办事|$)/, grp: 1 },
      { re: /去(.+)/, grp: 1 },
      { re: /到(.+)/, grp: 1 }
    ]
    for (const p of patterns) {
      const m = voiceText.match(p.re)
      if (m && m[p.grp]) {
        destination = m[p.grp].trim()
        break
      }
    }

    var that = this
    var fromLocation = wx.getStorageSync('last_location') || '太原'

    // 同时搜索出发地和目的地POI，获取精确坐标
    Promise.all([
      amapService.searchPOI(fromLocation),
      amapService.searchPOI(destination)
    ]).then(function(results) {
      var fromPoi = results[0]
      var destPoi = results[1]

      // 出发地信息
      var realFrom = fromLocation
      var fromCoord = null
      if (fromPoi && fromPoi.success && fromPoi.data && fromPoi.data.length > 0) {
        realFrom = fromPoi.data[0].name || fromLocation
        if (fromPoi.data[0].location) {
          fromCoord = {
            lng: parseFloat(fromPoi.data[0].location.lng),
            lat: parseFloat(fromPoi.data[0].location.lat)
          }
        }
      }

      // 目的地信息
      var realDestination = destination
      var destCoord = null
      if (destPoi && destPoi.success && destPoi.data && destPoi.data.length > 0) {
        realDestination = destPoi.data[0].name
        if (destPoi.data[0].location) {
          destCoord = {
            lng: parseFloat(destPoi.data[0].location.lng),
            lat: parseFloat(destPoi.data[0].location.lat)
          }
        }
        console.log('高德POI搜索到目的地:', realDestination)
      }

      travelService.getLocalPlans(realFrom, realDestination).then(function(plans) {
        var trainPlan = plans.find(function(p) { return p.type === 'train' || (p.segments && p.segments.some(function(s) { return s.type === 'train' })) })
        var taxiPlan = plans.find(function(p) { return p.type === 'taxi' })

        const now = new Date()
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const pickupHour = 8

        const plates = ['晋A·88888', '晋A·66666', '晋A·99999', '晋A·77777']
        const drivers = ['王师傅', '李师傅', '张师傅', '赵师傅']
        const phones = ['13800138001', '13900139001', '13700137001', '13600136001']
        const plateIndex = Math.floor(Math.random() * plates.length)
        const plate = plates[plateIndex]
        const driver = drivers[plateIndex]
        const phone = phones[plateIndex]

        var tripResult, currentTrip

        if (trainPlan && trainPlan.segments) {
          var trainSeg = trainPlan.segments.find(function(s) { return s.type === 'train' })
          var firstLeg = trainPlan.segments[0]
          var lastLeg = trainPlan.segments[trainPlan.segments.length - 1]
          var trainInfo = trainSeg ? trainSeg.train : null
          var trainNo = trainInfo ? trainInfo.trainNo : '火车'
          var trainType = trainInfo ? trainInfo.type : '高铁'
          var startStation = trainInfo ? trainInfo.fromStation : ''
          var endStation = trainInfo ? trainInfo.toStation : ''
          var trainStartTime = trainInfo ? trainInfo.startTime : '08:00'
          var trainEndTime = trainInfo ? trainInfo.endTime : '12:00'
          var trainPrice = trainInfo && trainInfo.minPrice ? trainInfo.minPrice : 200
          var firstTaxiCost = firstLeg && firstLeg.taxi && firstLeg.taxi.cost ? firstLeg.taxi.cost : 15
          var firstTaxiDuration = firstLeg && firstLeg.taxi && firstLeg.taxi.duration ? firstLeg.taxi.duration : '15分钟'
          var lastTaxiCost = lastLeg && lastLeg.taxi && lastLeg.taxi.cost ? lastLeg.taxi.cost : 15
          var lastTaxiDuration = lastLeg && lastLeg.taxi && lastLeg.taxi.duration ? lastLeg.taxi.duration : '15分钟'
          if (firstTaxiCost <= 0) firstTaxiCost = 15
          if (lastTaxiCost <= 0) lastTaxiCost = 15
          var totalFee = Number(firstTaxiCost) + Number(trainPrice) + Number(lastTaxiCost)

          var steps = [
            { icon: '🚕', name: '网约车送站', time: '明天 ' + trainStartTime, desc: driver + ' · ' + plate + ' · ¥' + firstTaxiCost + ' · 约' + firstTaxiDuration },
            { icon: '🚄', name: trainType + ' ' + trainNo, time: trainStartTime + ' - ' + trainEndTime, desc: startStation + ' → ' + endStation + ' · ¥' + trainPrice },
            { icon: '🚕', name: '到站打车', time: '明天 ' + trainEndTime, desc: '¥' + lastTaxiCost + ' · 约' + lastTaxiDuration + '到' + realDestination }
          ]

          tripResult = {
            destination: realDestination,
            voiceText: voiceText,
            pickupTime: '明天 ' + trainStartTime,
            driver: driver,
            plate: plate,
            phone: phone,
            fee: totalFee,
            notified: true,
            childNotified: true,
            steps: steps,
            isCrossCity: true,
            trainInfo: { no: trainNo, type: trainType, start: startStation, end: endStation, startTime: trainStartTime, endTime: trainEndTime, price: trainPrice }
          }

          currentTrip = {
            orderId: 'ORDER_' + Date.now(),
            type: 'train',
            status: 'booked',
            date: tomorrow.toISOString().split('T')[0],
            from: realFrom,
            to: realDestination,
            name: trainType + ' ' + trainNo,
            departureTime: trainStartTime,
            arrivalTime: trainEndTime,
            seat: '二等座',
            price: totalFee,
            plate: plate,
            driver: driver,
            driverPhone: phone,
            fromCoord: fromCoord,
            destCoord: destCoord,
            steps: [
              { type: 'taxi', name: '打车去' + startStation, time: trainStartTime, status: 'pending', plate: plate, driver: driver, location: realFrom + ' → ' + startStation, cost: firstTaxiCost },
              { type: 'train', name: trainType + ' ' + trainNo, time: trainStartTime + '-' + trainEndTime, status: 'pending', location: startStation + ' → ' + endStation, cost: trainPrice },
              { type: 'taxi', name: '打车去' + realDestination, time: trainEndTime, status: 'pending', location: endStation + ' → ' + realDestination, cost: lastTaxiCost }
            ]
          }
        } else {
          var fee = taxiPlan && taxiPlan.totalCost ? taxiPlan.totalCost : 15
          var duration = taxiPlan && taxiPlan.totalDuration ? taxiPlan.totalDuration : '15分钟'

          tripResult = {
            destination: realDestination,
            voiceText: voiceText,
            pickupTime: '明天 ' + String(pickupHour).padStart(2,'0') + ':00',
            driver: driver,
            plate: plate,
            phone: phone,
            fee: fee,
            notified: true,
            childNotified: true,
            steps: [
              { icon: '🚕', name: '网约车来接', time: '明天 ' + String(pickupHour).padStart(2,'0') + ':00', desc: driver + ' · ' + plate },
              { icon: '📍', name: '前往' + realDestination, time: '明天 ' + String(pickupHour).padStart(2,'0') + ':' + String(Math.floor(Math.random() * 50 + 10)), desc: '预计' + duration + '到达 · ¥' + fee }
            ]
          }

          currentTrip = {
            orderId: 'ORDER_' + Date.now(),
            type: 'taxi',
            status: 'booked',
            date: tomorrow.toISOString().split('T')[0],
            from: realFrom,
            to: realDestination,
            name: '网约车',
            departureTime: String(pickupHour).padStart(2,'0') + ':00',
            arrivalTime: String(pickupHour + 1).padStart(2,'0') + ':00',
            seat: '',
            price: fee,
            plate: plate,
            driver: driver,
            driverPhone: phone,
            fromCoord: fromCoord,
            destCoord: destCoord,
            steps: [
              { type: 'taxi', name: '网约车到' + realDestination, time: String(pickupHour).padStart(2,'0') + ':00', status: 'pending', plate: plate, driver: driver, location: realFrom + ' → ' + realDestination }
            ]
          }
        }

        that.setData({
          tripResult: tripResult,
          currentTrip: currentTrip,
          isProcessing: false,
          isRecording: false
        })

        if (!app.globalData.orders) {
          app.globalData.orders = []
        }
        app.globalData.orders.push(currentTrip)

        wx.vibrateShort({ type: 'medium' })

        if (wx.speechSynthesis) {
          var speakText
          if (tripResult.isCrossCity && tripResult.trainInfo) {
            var ti = tripResult.trainInfo
            speakText = '好的，已为您安排明天去' + realDestination + '的行程。早上' + ti.startTime + '，' + driver + '开车送您去' + ti.start + '站，车牌' + plate.replace('·', '') + '。然后乘坐' + ti.type + ti.no + '次列车，' + ti.startTime + '出发，' + ti.endTime + '到达' + ti.end + '站。到站后会有车接您去' + realDestination + '。全程费用共' + tripResult.fee + '元，已通知您的子女。'
          } else {
            speakText = '好的，已为您安排明天早上8点，' + driver + '来接您去' + realDestination + '，车牌' + plate.replace('·', '') + '，预计' + (tripResult.steps && tripResult.steps[1] ? tripResult.steps[1].desc : '30分钟') + '到达，费用' + tripResult.fee + '元，已通知您的子女。'
          }
          wx.speechSynthesis.speak({
            text: speakText,
            lang: 'zh_CN',
            rate: 0.85
          })
        }

      }).catch(function(err) {
        console.error('获取路线规划失败:', err)

        const now = new Date()
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const pickupHour = 8
        const fee = Math.floor(Math.random() * 30 + 20)

        const plates = ['晋A·88888', '晋A·66666', '晋A·99999', '晋A·77777']
        const drivers = ['王师傅', '李师傅', '张师傅', '赵师傅']
        const phones = ['13800138001', '13900139001', '13700137001', '13600136001']
        const plateIndex = Math.floor(Math.random() * plates.length)
        const plate = plates[plateIndex]
        const driver = drivers[plateIndex]
        const phone = phones[plateIndex]

        const tripResult = {
          destination: realDestination,
          voiceText: voiceText,
          pickupTime: `明天 ${String(pickupHour).padStart(2,'0')}:00`,
          driver: driver,
          plate: plate,
          phone: phone,
          fee: fee,
          notified: true,
          childNotified: true,
          steps: [
            { icon: '🚕', name: '网约车来接', time: '明天 08:00', desc: driver + ' · ' + plate },
            { icon: '📍', name: '前往' + realDestination, time: '明天 08:30', desc: '已为您叫好车' }
          ]
        }

        const currentTrip = {
          orderId: 'ORDER_' + Date.now(),
          type: 'taxi',
          status: 'booked',
          date: tomorrow.toISOString().split('T')[0],
          from: realFrom,
          to: realDestination,
          name: '网约车',
          departureTime: `${String(pickupHour).padStart(2,'0')}:00`,
          arrivalTime: `${String(pickupHour + 1).padStart(2,'0')}:00`,
          seat: '',
          price: fee,
          plate: plate,
          driver: driver,
          driverPhone: phone,
          fromCoord: fromCoord,
          destCoord: destCoord,
          steps: [
            { type: 'taxi', name: '网约车到' + realDestination, time: `${String(pickupHour).padStart(2,'0')}:00`, status: 'pending', plate: plate, driver: driver, location: realFrom + ' → ' + realDestination }
          ]
        }

        that.setData({
          tripResult: tripResult,
          currentTrip: currentTrip,
          isProcessing: false,
          isRecording: false
        })

        if (!app.globalData.orders) {
          app.globalData.orders = []
        }
        app.globalData.orders.push(currentTrip)

        wx.vibrateShort({ type: 'medium' })

        if (wx.speechSynthesis) {
          wx.speechSynthesis.speak({
            text: `好的，已为您安排明天早上8点，${driver}来接您去${realDestination}，车牌${plate.replace('·', '')}，费用${fee}元，已通知您的子女。`,
            lang: 'zh_CN',
            rate: 0.85
          })
        }

      })
    }).catch(function(err) {
      console.error('POI搜索失败:', err)
      that.setData({ isProcessing: false, isRecording: false })
      wx.showToast({ title: '搜索失败，请重试', icon: 'none' })
    })
  },

  parseVoiceIntent(text) {
    // 兼容旧入口
    this.autoDispatchTrip(text)
  },

  closeVoiceModal() {
    this._resumeAIListening()
    this.setData({
      showVoiceModal: false,
      voiceResult: '',
      voiceText: '',
      isProcessing: false
    })
  },

  closeTripResult() {
    this.setData({ tripResult: null })
  },

  callResultDriver() {
    wx.makePhoneCall({ phoneNumber: this.data.tripResult.phone })
  },

  goManualPlan() {
    wx.navigateTo({ url: '/pages/agent/agent' })
  },

  goVisionLive() {
    wx.navigateTo({ url: '/pages/vision-live/vision-live' })
  },

  confirmVoiceResult() {
    const result = this.data.voiceResult
    this.closeVoiceModal()
    
    var that = this
    that.setData({ isProcessing: true })

    // 安全超时：防止POI搜索卡住
    var safetyTimeout = setTimeout(function() {
      if (that.data.isProcessing) {
        that.setData({ isProcessing: false })
        wx.showToast({ title: '查询超时，请重试', icon: 'none' })
      }
    }, 15000)
    
    amapService.searchPOI(result).then(function(poiResult) {
      clearTimeout(safetyTimeout)
      var realDestination = result
      if (poiResult.success && poiResult.data.length > 0) {
        realDestination = poiResult.data[0].name
        console.log('高德POI搜索到:', realDestination)
      }
      
      wx.navigateTo({
        url: '/pages/map-trip/map-trip?from=voice&voiceText=' + encodeURIComponent(result) + '&to=' + encodeURIComponent(realDestination)
      })
      
      that.setData({ isProcessing: false })
    }).catch(function(err) {
      clearTimeout(safetyTimeout)
      console.error('POI搜索失败:', err)
      wx.navigateTo({
        url: '/pages/map-trip/map-trip?from=voice&voiceText=' + encodeURIComponent(result)
      })
      that.setData({ isProcessing: false })
    })
  },

  // 三大场景按钮
  goHome() {
    const homeAddress = wx.getStorageSync('homeAddress')
    if (!homeAddress) {
      wx.navigateTo({ url: '/pages/address/address?field=home' })
      return
    }
    
    wx.navigateTo({
      url: '/pages/map-trip/map-trip?to=' + encodeURIComponent(homeAddress) + '&scene=home'
    })
  },

  goHospital() {
    const hospitalAddress = wx.getStorageSync('hospitalAddress')
    if (!hospitalAddress) {
      wx.navigateTo({ url: '/pages/address/address?field=hospital' })
      return
    }
    
    wx.navigateTo({
      url: '/pages/map-trip/map-trip?to=' + encodeURIComponent(hospitalAddress) + '&scene=hospital'
    })
  },

  goStation() {
    const stationAddress = wx.getStorageSync('stationAddress')
    if (!stationAddress) {
      wx.navigateTo({ url: '/pages/address/address?field=station' })
      return
    }
    
    wx.navigateTo({
      url: '/pages/map-trip/map-trip?to=' + encodeURIComponent(stationAddress) + '&scene=station'
    })
  },

  goAgent() {
    wx.navigateTo({
      url: '/pages/agent/agent'
    })
  },

  toggleMore() {
    this.setData({ showMoreFeatures: !this.data.showMoreFeatures })
  },

  goSmartTrip() {
    wx.showModal({
      title: '🎙️ 智能出行',
      content: '请说出您的目的地，例如"我要去南京"',
      showCancel: true,
      cancelText: '手动输入',
      confirmText: '开始说话',
      success: (res) => {
        if (res.confirm) {
          this.startRecord()
        } else {
          wx.navigateTo({
            url: '/pages/map-trip/map-trip'
          })
        }
      }
    })
  },

  goToMapTrip() {
    wx.navigateTo({
      url: '/pages/map-trip/map-trip'
    })
  },

  goToOrders() {
    if (this.data.role === 'family') {
      wx.navigateTo({
        url: '/pages/child/child'
      })
    } else {
      wx.navigateTo({
        url: '/pages/orders/orders'
      })
    }
  },

  goToAssist() {
    if (this.data.role === 'family') {
      wx.navigateTo({
        url: '/pages/child/child'
      })
    } else {
      wx.navigateTo({
        url: '/pages/assist/assist'
      })
    }
  },

  switchMode() {
    const newRole = this.data.role === 'elder' ? '子女端' : '长辈端'
    wx.showModal({
      title: '切换模式',
      content: `确定要切换到${newRole}吗？`,
      success: (res) => {
        if (res.confirm) {
          app.switchMode()
        }
      }
    })
  },

  goToPlan(e) {
    const parent = e.currentTarget.dataset.parent
    if (!parent) {
      wx.navigateTo({
        url: '/pages/child-plan/child-plan'
      })
      return
    }
    wx.navigateTo({
      url: `/pages/child-plan/child-plan?parentName=${encodeURIComponent(parent.name)}&parentPhone=${encodeURIComponent(parent.phone)}`
    })
  },

  goToViewTrips(e) {
    const parent = e.currentTarget.dataset.parent
    if (!parent) {
      wx.navigateTo({
        url: '/pages/child-trips/child-trips'
      })
      return
    }
    wx.navigateTo({
      url: `/pages/child-trips/child-trips?parentName=${encodeURIComponent(parent.name)}&parentPhone=${encodeURIComponent(parent.phone)}`
    })
  },

  goToMonitor() {
    wx.navigateTo({
      url: '/pages/trip-monitor/trip-monitor'
    })
  },

  goToHelpTaxi() {
    const parentAccounts = app.globalData.parentAccounts || []
    if (parentAccounts.length === 0) {
      wx.showToast({ title: '请先绑定长辈账号', icon: 'none' })
      return
    }
    const parent = parentAccounts[0]
    wx.navigateTo({
      url: `/pages/taxi/taxi?parentName=${encodeURIComponent(parent.name)}&parentPhone=${encodeURIComponent(parent.phone)}&fromParentLocation=1`
    })
  },

  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    })
  },

  goToSos() {
    wx.navigateTo({
      url: '/pages/sos/sos',
      fail: function(err) {
        console.error('导航到紧急求助页失败:', err)
        wx.redirectTo({
          url: '/pages/sos/sos',
          fail: function() {
            wx.showToast({ title: '页面打开失败', icon: 'none' })
          }
        })
      }
    })
  },

  goToVolunteer() {
    const parentAccounts = app.globalData.parentAccounts || []
    if (parentAccounts.length === 0) {
      wx.showToast({ title: '请先绑定长辈账号', icon: 'none' })
      return
    }
    const parent = parentAccounts[0]
    wx.navigateTo({
      url: `/pages/volunteer/volunteer?parentName=${encodeURIComponent(parent.name)}&parentPhone=${encodeURIComponent(parent.phone)}`
    })
  },

  toggleLocationShare() {
    const isSharing = app.globalData.isLocationSharing
    
    if (isSharing) {
      app.stopLocationSharing()
      this.setData({ isLocationSharing: false })
      showToast('已关闭位置共享', 'success')
    } else {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.userLocation']) {
            wx.authorize({
              scope: 'scope.userLocation',
              success: () => {
                this.startSharing()
              },
              fail: () => {
                wx.showModal({
                  title: '需要位置权限',
                  content: '请在设置中开启位置权限，以便子女可以查看您的位置',
                  showCancel: false
                })
              }
            })
          } else {
            this.startSharing()
          }
        }
      })
    }
  },

  startSharing() {
    app.startLocationSharing()
    this.setData({ isLocationSharing: true })
    showToast('已开启位置共享，子女可查看您的位置', 'success')
  },

  // 长辈端自动开启位置共享（静默，不打扰老人）
  autoStartLocationShare() {
    var self = this
    wx.getSetting({
      success: function(res) {
        if (res.authSetting['scope.userLocation']) {
          // 已有授权，直接开启
          app.startLocationSharing()
          self.setData({ isLocationSharing: true })
        } else {
          // 首次请求授权
          wx.authorize({
            scope: 'scope.userLocation',
            success: function() {
              app.startLocationSharing()
              self.setData({ isLocationSharing: true })
            },
            fail: function() {
              // 拒绝授权不强制弹窗，等用户手动点击开启时再提示
            }
          })
        }
      }
    })
  }
})