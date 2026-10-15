const app = getApp()
const { showToast, showModal } = require('../../utils/index')

Page({
  data: {
    order: {},
    vehiclePlate: '',
    step: 2,
    progress: 20,
    statusIcon: '🚕',
    statusText: '司机接单中',
    statusDesc: '司机正在赶来，请耐心等待'
  },

  onLoad(options) {
    const { orderId } = options
    const order = app.globalData.orders.find(o => o.orderId === orderId)
    
    if (order) {
      this.setData({
        order,
        vehiclePlate: this.generatePlate()
      })
      this.simulateProgress()
    }
  },

  generatePlate() {
    const provinces = ['京', '沪', '粤', '浙', '苏']
    const letters = ['A', 'B', 'C', 'D', 'E']
    const numbers = Math.floor(Math.random() * 90000 + 10000)
    return `${provinces[Math.floor(Math.random() * provinces.length)]}${letters[Math.floor(Math.random() * letters.length)]}${numbers}`
  },

  simulateProgress() {
    const intervals = [
      { delay: 3000, step: 3, progress: 50, statusText: '司机已到达', statusDesc: '司机已在出发地等候' },
      { delay: 3000, step: 4, progress: 75, statusText: '行程中', statusDesc: '正在前往目的地' },
      { delay: 5000, step: 5, progress: 100, statusText: '已到达', statusDesc: '请确认到达目的地' }
    ]

    intervals.forEach((item, index) => {
      setTimeout(() => {
        this.setData({
          step: item.step,
          progress: item.progress,
          statusText: item.statusText,
          statusDesc: item.statusDesc
        })
        
        if (item.step === 5) {
          app.updateOrder(this.data.order.orderId, { status: 'completed' })
        }
      }, item.delay * (index + 1))
    })
  },

  callDriver() {
    wx.showModal({
      title: '呼叫司机',
      content: `即将拨打 ${this.data.order.driver.phone}`,
      success: (res) => {
        if (res.confirm) {
          showToast('正在呼叫...')
        }
      }
    })
  },

  async cancelOrder() {
    const confirmed = await showModal('取消订单', '确定要取消此订单吗？')
    
    if (confirmed) {
      app.updateOrder(this.data.order.orderId, { status: 'cancelled' })
      showToast('订单已取消', 'success')
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/orders/orders'
        })
      }, 1500)
    }
  },

  startTrip() {
    this.setData({
      step: 4,
      progress: 75,
      statusText: '行程中',
      statusDesc: '正在前往目的地'
    })
    app.updateOrder(this.data.order.orderId, { status: 'onway' })
    showToast('已确认上车', 'success')
  },

  endTrip() {
    this.setData({
      step: 5,
      progress: 100,
      statusText: '已到达',
      statusDesc: '请确认到达目的地'
    })
    app.updateOrder(this.data.order.orderId, { status: 'completed' })
    showToast('行程已完成', 'success')

    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/orders/orders'
      })
    }, 1500)
  }
})