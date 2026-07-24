Component({
  properties: {
    currentPath: {
      type: String,
      value: ''
    }
  },

  data: {
    tabs: [
      { path: '/pages/index/index', text: '首页', icon: '🏠' },
      { path: '/pages/ticket/ticket', text: '票务', icon: '🎫' },
      { path: '/pages/taxi/taxi', text: '打车', icon: '🚕' },
      { path: '/pages/orders/orders', text: '行程', icon: '📋' },
      { path: '/pages/profile/profile', text: '我的', icon: '👤' }
    ]
  },

  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path
      if (path === this.properties.currentPath) return
      wx.reLaunch({ url: path })
    }
  }
})