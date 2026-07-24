const app = getApp()
const { getOrderStatusText, getOrderStatusColor, showToast, showModal } = require('../../utils/index')

Page({
  data: {
    currentTab: 'all',
    orders: [],
    filteredOrders: [],
    emptyText: '',
    currentTrip: null
  },

  onLoad() {
    this.loadOrders()
    this.checkCurrentTrip()
  },

  onShow() {
    this.loadOrders()
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

  loadOrders() {
    const orders = app.globalData.orders.map(o => ({
      ...o,
      orderIcon: this.getOrderIcon(o.type),
      orderTitle: this.getOrderTitle(o),
      statusText: getOrderStatusText(o.status),
      statusColor: getOrderStatusColor(o.status)
    }))
    this.setData({ orders })
    this.updateFilteredOrders()
  },

  updateFilteredOrders() {
    const { orders, currentTab } = this.data
    let filtered = orders
    
    if (currentTab === 'pending') {
      filtered = orders.filter(o => ['booked', 'waiting', 'picking', 'onway'].includes(o.status))
    } else if (currentTab === 'completed') {
      filtered = orders.filter(o => o.status === 'completed')
    } else if (currentTab === 'cancelled') {
      filtered = orders.filter(o => o.status === 'cancelled')
    }
    
    const emptyTexts = {
      all: '暂无订单，快去预订吧',
      pending: '暂无进行中的订单',
      completed: '暂无已完成的订单',
      cancelled: '暂无已取消的订单'
    }
    
    this.setData({
      filteredOrders: filtered,
      emptyText: emptyTexts[currentTab] || '暂无订单'
    })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })
    this.updateFilteredOrders()
  },

  getOrderIcon(type) {
    const icons = {
      train: '🚄',
      bus: '🚌',
      taxi: '🚕'
    }
    return icons[type] || '📋'
  },

  getOrderTitle(order) {
    if (order.type === 'train') {
      return `${order.name} 火车票`
    }
    if (order.type === 'bus') {
      return `${order.name || order.id} 汽车票`
    }
    if (order.type === 'taxi') {
      return order.subType === 'remote' ? '偏远地区用车预约' : '网约车订单'
    }
    return '出行订单'
  },

  goToDetail(e) {
    const order = e.currentTarget.dataset.order
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${order.orderId}`
    })
  },

  goBook() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  async handleAction(e) {
    const { action, order } = e.currentTarget.dataset
    
    if (action === 'change') {
      showToast('功能开发中')
    } else if (action === 'cancel') {
      const confirmed = await showModal('取消订单', '确定要取消此订单吗？')
      if (confirmed) {
        app.updateOrder(order.orderId, { status: 'cancelled' })
        showToast('订单已取消', 'success')
        this.loadOrders()
      }
    } else if (action === 'confirm') {
      const confirmed = await showModal('确认完成', '确认此订单已完成？')
      if (confirmed) {
        showToast('感谢您的使用', 'success')
      }
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