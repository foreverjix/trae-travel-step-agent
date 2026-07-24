const app = getApp()
const { showToast, showModal } = require('../../utils/index')

Page({
  data: {
    userInfo: null,
    orderCount: 0,
    medalCount: 0,
    assistCount: 0,
    currentTrip: null
  },

  onLoad() {
    this.loadUserData()
    this.checkCurrentTrip()
  },

  onShow() {
    this.loadUserData()
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
    
    this.setData({ currentTrip })
  },

  loadUserData() {
    this.setData({
      userInfo: app.globalData.userInfo,
      orderCount: app.globalData.orders.length,
      medalCount: app.globalData.medals.length,
      assistCount: app.globalData.assistAccounts.length
    })
  },

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  goToOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders'
    })
  },

  goToMedals() {
    wx.navigateTo({
      url: '/pages/medals/medals'
    })
  },

  goToAssist() {
    wx.navigateTo({
      url: '/pages/assist/assist'
    })
  },

  goToAgent() {
    wx.navigateTo({
      url: '/pages/agent/agent'
    })
  },

  goToSos() {
    wx.navigateTo({
      url: '/pages/sos/sos'
    })
  },

  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    })
  },

  editProfile() {
    showToast('编辑资料功能开发中')
  },

  async logout() {
    const confirmed = await showModal('退出登录', '确定要退出登录吗？')
    if (confirmed) {
      app.logout()
      showToast('已退出登录', 'success')
      this.loadUserData()
    }
  },
  onShareAppMessage() {
    return {
      title: '乐龄出行 - 专为中老年人打造的出行助手',
      path: '/pages/index/index'
    }
  },
  onShareTimeline() {
    return {
      title: '乐龄出行 - 让长辈出行更简单、更安全'
    }
  }
})