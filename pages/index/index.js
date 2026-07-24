const app = getApp()
const { hotRoutes } = require('../../data/mock')
const { getOrderStatusText, getOrderStatusColor, showToast } = require('../../utils/index')

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
    statusBarHeight: 44
  },

  onLoad() {
    this.initStatusBar()
    this.initData()
    this.initDate()
  },

  onShow() {
    this.initData()
    this.checkCurrentTrip()
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
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 44
    })
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
    
    const homeAddress = wx.getStorageSync('homeAddress')
    const hospitalAddress = wx.getStorageSync('hospitalAddress')
    const stationAddress = wx.getStorageSync('stationAddress')
    
    const updateData = {
      userName: userInfo ? userInfo.name : '长辈'
    }
    
    if (homeAddress) updateData.homeName = homeAddress
    if (hospitalAddress) updateData.hospitalName = hospitalAddress
    if (stationAddress) updateData.stationName = stationAddress
    
    this.setData(updateData)
  },

  checkCurrentTrip() {
    // 从全局订单中查找今天进行中的行程
    const orders = app.globalData.orders || []
    const today = new Date().toISOString().split('T')[0]
    
    // 模拟一个今天的行程（如果没有的话，用于演示）
    let currentTrip = orders.find(o => {
      return o.date === today && ['booked', 'waiting', 'picking', 'onway'].includes(o.status)
    })
    
    // 如果没有找到今天的行程，使用模拟数据展示功能
    if (!currentTrip) {
      // 检查是否已经播报过今天的模拟行程
      const hasShownDemo = wx.getStorageSync('demoTripShown')
      if (!hasShownDemo) {
        currentTrip = this.createDemoTrip()
        wx.setStorageSync('demoTripShown', true)
      }
    }
    
    if (currentTrip) {
      this.setData({ currentTrip })
      this.announceNextStep(currentTrip)
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
        { type: 'taxi', name: '网约车到太原南站', time: '07:30', status: 'pending', plate: '晋A·88888', driver: '王师傅' },
        { type: 'train', name: '高铁 G1954', time: '08:30', status: 'pending', seat: '二等座 05车 12A', platform: '3站台' },
        { type: 'taxi', name: '网约车到目的地', time: '13:30', status: 'pending', plate: '苏A·66666', driver: '李师傅' }
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
        
        wx.showModal({
          title: '📢 行程提醒',
          content: message,
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            wx.setStorageSync(announceKey, true)
          }
        })
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
    this.setData({
      isRecording: true,
      showVoiceModal: true,
      voiceText: '正在听您说...',
      voiceResult: ''
    })
    
    // 开始录音
    const recorderManager = wx.getRecorderManager()
    recorderManager.start({
      duration: 10000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
    
    recorderManager.onStop((res) => {
      this.handleVoiceResult(res.tempFilePath)
    })
    
    recorderManager.onError((err) => {
      console.error('录音失败：', err)
      this.setData({
        isRecording: false,
        voiceText: '录音失败了，请重试',
        isRecognizing: false
      })
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
    // TODO: 对接语音识别API（讯飞/腾讯云）
    // 讯飞语音识别支持晋语等方言
    // 以下为模拟演示，实际使用时替换为真实API调用
    
    setTimeout(() => {
      // 模拟识别结果
      const mockResults = [
        '我要去县医院',
        '我要回家',
        '我要去火车站',
        '我要去南京'
      ]
      const result = mockResults[Math.floor(Math.random() * mockResults.length)]
      
      this.setData({
        isRecognizing: false,
        voiceResult: result,
        voiceText: '识别完成'
      })
      
      // 自动解析意图
      this.parseVoiceIntent(result)
    }, 1500)
  },

  parseVoiceIntent(text) {
    // 解析语音意图
    const patterns = {
      hospital: /医院|看病|就医|诊所|卫生院|大夫/,
      home: /回家|家里|回去|回.*家/,
      station: /车站|火车站|高铁站|汽车站|机场/
    }
    
    if (patterns.hospital.test(text)) {
      this.goHospital()
      this.closeVoiceModal()
    } else if (patterns.home.test(text)) {
      this.goHome()
      this.closeVoiceModal()
    } else if (patterns.station.test(text)) {
      this.goStation()
      this.closeVoiceModal()
    }
  },

  closeVoiceModal() {
    this.setData({
      showVoiceModal: false,
      voiceResult: '',
      voiceText: ''
    })
  },

  confirmVoiceResult() {
    const result = this.data.voiceResult
    this.closeVoiceModal()
    
    // 跳转到地图规划页面
    wx.navigateTo({
      url: '/pages/map-trip/map-trip?from=voice&voiceText=' + encodeURIComponent(result)
    })
  },

  // 三大场景按钮
  goHome() {
    const homeAddress = wx.getStorageSync('homeAddress')
    if (!homeAddress) {
      wx.showModal({
        title: '设置家庭地址',
        content: '您还未设置家庭地址，是否现在设置？',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/profile/profile' })
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/map-trip/map-trip?to=' + encodeURIComponent(homeAddress) + '&scene=home'
    })
  },

  goHospital() {
    const hospitalAddress = wx.getStorageSync('hospitalAddress')
    if (!hospitalAddress) {
      wx.showModal({
        title: '设置就医地址',
        content: '您还未设置常去医院，是否现在设置？',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/profile/profile' })
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/map-trip/map-trip?to=' + encodeURIComponent(hospitalAddress) + '&scene=hospital'
    })
  },

  goStation() {
    const stationAddress = wx.getStorageSync('stationAddress')
    if (!stationAddress) {
      wx.showModal({
        title: '设置车站地址',
        content: '您还未设置常去车站，是否现在设置？',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/profile/profile' })
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/map-trip/map-trip?to=' + encodeURIComponent(stationAddress) + '&scene=station'
    })
  },

  // 底部导航
  goToMapTrip() {
    wx.navigateTo({
      url: '/pages/map-trip/map-trip'
    })
  },

  goToOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders'
    })
  },

  goToAssist() {
    wx.navigateTo({
      url: '/pages/assist/assist'
    })
  },

  goToSos() {
    wx.navigateTo({
      url: '/pages/sos/sos'
    })
  },

  onShareAppMessage() {
    return {
      title: '乐龄出行 - 专为中老年人打造的出行助手',
      path: '/pages/index/index',
      imageUrl: ''
    }
  },

  onShareTimeline() {
    return {
      title: '乐龄出行 - 让长辈出行更简单、更安全'
    }
  }
})