App({
  globalData: {
    userInfo: null,
    token: '',
    isLogin: false,
    assistAccounts: [],
    parentAccounts: [],
    orders: [],
    medals: []
  },

  onLaunch() {
    this.checkLoginStatus()
    this.loadUserData()
    this.startTripReminder()
  },

  startTripReminder() {
    // 每分钟检查一次即将到来的行程
    setInterval(() => {
      this.checkUpcomingTrips()
    }, 60000)
    // 立即检查一次
    this.checkUpcomingTrips()
  },

  checkUpcomingTrips() {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    this.globalData.orders.forEach(order => {
      if (order.date !== today) return
      if (!['booked', 'waiting', 'picking'].includes(order.status)) return

      // 检查是否有出发时间
      const departureTime = order.departureTime
      if (!departureTime) return

      const parts = departureTime.split(':')
      const depHour = Number(parts[0])
      const depMinute = Number(parts[1])
      const depTime = depHour * 60 + depMinute
      const diff = depTime - currentTime

      // 出发前30分钟提醒
      if (diff > 25 && diff <= 30) {
        const key = 'remind_30_' + order.orderId
        if (!wx.getStorageSync(key)) {
          wx.setStorageSync(key, true)
          wx.showModal({
            title: '⏰ 出发提醒',
            content: '您今天' + departureTime + '的' + (order.name || '') + '即将出发，请提前准备！\n\n座位：' + (order.seat || '请查看详情') + '\n车牌：' + (order.plate || '请查看详情'),
            showCancel: false,
            confirmText: '我知道了'
          })
        }
      }

      // 出发前5分钟提醒
      if (diff > 0 && diff <= 5) {
        const key = 'remind_5_' + order.orderId
        if (!wx.getStorageSync(key)) {
          wx.setStorageSync(key, true)
          wx.showModal({
            title: '🚨 马上出发',
            content: '您今天' + departureTime + '的' + (order.name || '') + '即将出发！\n\n请立即前往出发地点！',
            showCancel: false,
            confirmText: '我知道了'
          })
        }
      }
    })
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      this.globalData.isLogin = true
    }
  },

  loadUserData() {
    const assistAccounts = wx.getStorageSync('assistAccounts') || []
    const parentAccounts = wx.getStorageSync('parentAccounts') || []
    const orders = wx.getStorageSync('orders') || []
    const medals = wx.getStorageSync('medals') || []
    this.globalData.assistAccounts = assistAccounts
    this.globalData.parentAccounts = parentAccounts
    this.globalData.orders = orders
    this.globalData.medals = medals
  },

  saveUserData() {
    wx.setStorageSync('userInfo', this.globalData.userInfo)
    wx.setStorageSync('token', this.globalData.token)
    wx.setStorageSync('assistAccounts', this.globalData.assistAccounts)
    wx.setStorageSync('parentAccounts', this.globalData.parentAccounts)
    wx.setStorageSync('orders', this.globalData.orders)
    wx.setStorageSync('medals', this.globalData.medals)
  },

  login(userInfo, token) {
    this.globalData.userInfo = userInfo
    this.globalData.token = token
    this.globalData.isLogin = true
    this.saveUserData()
  },

  logout() {
    this.globalData.userInfo = null
    this.globalData.token = ''
    this.globalData.isLogin = false
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('assistAccounts')
    wx.removeStorageSync('orders')
    wx.removeStorageSync('medals')
  },

  addOrder(order) {
    this.globalData.orders.unshift(order)
    this.saveUserData()
  },

  updateOrder(orderId, updates) {
    const index = this.globalData.orders.findIndex(o => o.orderId === orderId)
    if (index !== -1) {
      this.globalData.orders[index] = { ...this.globalData.orders[index], ...updates }
      this.saveUserData()
    }
  },

  addMedal(medal) {
    if (!this.globalData.medals.find(m => m.id === medal.id)) {
      this.globalData.medals.push(medal)
      this.saveUserData()
    }
  },

  addAssistAccount(account) {
    if (!this.globalData.assistAccounts.find(a => a.phone === account.phone)) {
      this.globalData.assistAccounts.push(account)
      this.saveUserData()
    }
  },

  removeAssistAccount(phone) {
    this.globalData.assistAccounts = this.globalData.assistAccounts.filter(a => a.phone !== phone)
    this.saveUserData()
  },

  addParentAccount(account) {
    if (!this.globalData.parentAccounts.find(a => a.phone === account.phone)) {
      this.globalData.parentAccounts.push(account)
      this.saveUserData()
    }
  },

  removeParentAccount(phone) {
    this.globalData.parentAccounts = this.globalData.parentAccounts.filter(a => a.phone !== phone)
    this.saveUserData()
  }
})