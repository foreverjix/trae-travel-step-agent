const app = getApp()
const { showToast, showModal } = require('../../utils/index')

Page({
  data: {
    userInfo: null,
    orderCount: 0,
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
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    // 设置AI页面上下文
    app.globalData.aiPageContext = {
      page: 'profile',
      title: '我的',
      summary: '个人中心'
    }
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
    
    this.setData({ currentTrip: currentTrip || null })
  },

  loadUserData() {
    this.setData({
      userInfo: app.globalData.userInfo,
      orderCount: app.globalData.orders.length,
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

  goToAssist() {
    wx.navigateTo({
      url: '/pages/assist/assist'
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

  goToPassenger() {
    wx.navigateTo({
      url: '/pages/passenger/passenger'
    })
  },

  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    })
  },

  editProfile() {
    wx.showModal({
      title: '编辑资料',
      editable: true,
      placeholderText: '请输入姓名',
      content: this.data.userInfo ? this.data.userInfo.name : '',
      success: (res) => {
        if (res.confirm && res.content) {
          const userInfo = { ...this.data.userInfo, name: res.content }
          app.globalData.userInfo = userInfo
          wx.setStorageSync('userInfo', userInfo)
          this.setData({ userInfo })
          showToast('修改成功', 'success')
        }
      }
    })
  },

  async logout() {
    const confirmed = await showModal('退出登录', '确定要退出登录吗？')
    if (confirmed) {
      app.logout()
      showToast('已退出登录', 'success')
      this.loadUserData()
    }
  }
})