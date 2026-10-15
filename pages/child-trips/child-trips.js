const app = getApp()

Page({
  data: {
    parentName: '',
    parentPhone: '',
    trips: [],
    aiAssistantEnabled: false
  },

  onLoad(options) {
    this.setData({
      parentName: options.parentName ? decodeURIComponent(options.parentName) : '',
      parentPhone: options.parentPhone ? decodeURIComponent(options.parentPhone) : ''
    })
    this.loadTrips()
  },

  onShow() {
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    app.globalData.aiPageContext = {
      page: 'child-trips',
      title: '长辈行程',
      summary: '查看长辈实时行程'
    }
    this.loadTrips()
  },

  goBack() {
    wx.navigateBack()
  },

  loadTrips() {
    const trips = [
      {
        id: 'T001',
        date: '2026-07-08',
        status: 'pending',
        title: '太原 → 南京',
        desc: '高铁 G1954 · 8:30发车',
        totalPrice: 720,
        steps: [
          { type: 'taxi', typeIcon: '🚕', name: '花小猪打车', time: '07:30', status: 'pending' },
          { type: 'train', typeIcon: '🚄', name: '高铁G1954', time: '08:30', status: 'pending' },
          { type: 'taxi', typeIcon: '🚕', name: '高德打车', time: '13:20', status: 'pending' }
        ]
      },
      {
        id: 'T002',
        date: '2026-07-05',
        status: 'completed',
        title: '太原 → 北京',
        desc: '高铁 G602 · 9:00发车',
        totalPrice: 206,
        steps: [
          { type: 'taxi', typeIcon: '🚕', name: '花小猪打车', time: '08:00', status: 'completed' },
          { type: 'train', typeIcon: '🚄', name: '高铁G602', time: '09:00', status: 'completed' },
          { type: 'taxi', typeIcon: '🚕', name: '高德打车', time: '11:30', status: 'completed' }
        ]
      },
      {
        id: 'T003',
        date: '2026-07-03',
        status: 'completed',
        title: '太原 → 西安',
        desc: '火车 K604 · 14:00发车',
        totalPrice: 86,
        steps: [
          { type: 'bus', typeIcon: '🚌', name: '公交', time: '13:00', status: 'completed' },
          { type: 'train', typeIcon: '🚄', name: '火车K604', time: '14:00', status: 'completed' },
          { type: 'taxi', typeIcon: '🚕', name: '花小猪打车', time: '21:00', status: 'completed' }
        ]
      }
    ]

    this.setData({ trips })
  },

  getStatusText(status) {
    const texts = {
      pending: '待出行',
      inProgress: '进行中',
      completed: '已完成',
      cancelled: '已取消'
    }
    return texts[status] || status
  },

  getStatusColor(status) {
    const colors = {
      pending: '#FF8C42',
      inProgress: '#118AB2',
      completed: '#06D6A0',
      cancelled: '#6B7280'
    }
    return colors[status] || '#6B7280'
  },

  viewDetail(e) {
    const trip = e.currentTarget.dataset.trip
    wx.navigateTo({
      url: '/pages/trip-monitor/trip-monitor'
    })
  }
})