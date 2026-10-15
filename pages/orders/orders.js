const app = getApp()
const { getOrderStatusText, getOrderStatusColor, showToast, showModal } = require('../../utils/index')

Page({
  data: {
    currentTab: 'all',
    orders: [],
    filteredOrders: [],
    emptyText: '',
    role: 'elder'
  },

  onLoad() {
    this.setData({ role: app.globalData.role || 'elder' })
    this.loadOrders()
  },

  onShow() {
    this.setData({ role: app.globalData.role || 'elder' })
    this.loadOrders()
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    // 设置AI页面上下文（丰富版）
    app.globalData.aiPageContext = {
      page: 'orders',
      title: '行程',
      summary: '我的行程列表',
      actions: ['查看行程详情', '取消行程', '换时间', '问子女'],
      formFields: [],
      formData: {},
      tips: '这里显示所有行程，点任意卡片查看详情'
    }
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
    this.setData({ currentTab: tab })
    this.updateFilteredOrders()
  },

  getOrderIcon(type) {
    const icons = { train: '🚄', bus: '🚌', taxi: '🚕' }
    return icons[type] || '📋'
  },

  getOrderTitle(order) {
    if (order.type === 'train') return (order.name || '火车票') + ' 火车票'
    if (order.type === 'bus') return (order.name || order.id || '') + ' 汽车票'
    if (order.type === 'taxi') return order.subType === 'remote' ? '偏远地区用车' : '网约车'
    return '出行订单'
  },

  goToDetail(e) {
    const order = e.currentTarget.dataset.order
    wx.navigateTo({
      url: '/pages/order-detail/order-detail?orderId=' + order.orderId
    })
  },

  goBook() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  quickContactChild() {
    wx.showActionSheet({
      itemList: ['📞 拨打电话给子女', '💬 微信发送消息', '📋 复制出行信息'],
      success: function(res) {
        if (res.tapIndex === 0) {
          wx.makePhoneCall({
            phoneNumber: '10086',
            fail: function() {
              wx.showToast({ title: '请手动拨打', icon: 'none' })
            }
          })
        } else if (res.tapIndex === 1) {
          wx.setClipboardData({
            data: '【出行通知】您好，我正在使用乐龄出行安排行程，如有疑问请联系我。',
            success: function() {
              wx.showToast({ title: '已复制到剪贴板', icon: 'none' })
            }
          })
        } else if (res.tapIndex === 2) {
          const orders = this.data.filteredOrders
          let text = '【我的出行行程】\n\n'
          orders.slice(0, 3).forEach(function(o, i) {
            text += (i + 1) + '. ' + (o.startStation || o.start) + ' → ' + (o.endStation || o.end) + '\n'
          })
          wx.setClipboardData({
            data: text,
            success: function() {
              wx.showToast({ title: '已复制行程', icon: 'none' })
            }
          })
        }
      }.bind(this)
    })
  },

  handleAction(e) {
    const action = e.currentTarget.dataset.action
    const order = e.currentTarget.dataset.order

    if (action === 'change') {
      wx.showModal({
        title: '换时间',
        content: '改签请联系客服：400-888-8888',
        showCancel: false,
        confirmText: '知道了'
      })
    } else if (action === 'cancel') {
      wx.showModal({
        title: '取消订单',
        content: '确定要取消此订单吗？',
        success: function(res) {
          if (res.confirm) {
            app.updateOrder(order.orderId, { status: 'cancelled' })
            wx.showToast({ title: '订单已取消', icon: 'success' })
            this.loadOrders()
          }
        }.bind(this)
      })
    } else if (action === 'confirm') {
      wx.showToast({ title: '感谢您的使用', icon: 'success' })
    }
  }
})
