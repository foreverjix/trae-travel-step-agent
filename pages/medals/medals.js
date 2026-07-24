const app = getApp()
const { medals: mockMedals } = require('../../data/mock.js')

Page({
  data: {
    medals: [],
    allMedals: [],
    totalTrips: 0,
    totalDistance: 0
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const medals = app.globalData.medals || []
    const orders = app.globalData.orders || []
    
    const totalTrips = orders.filter(o => o.status === 'completed').length
    const totalDistance = orders.reduce((sum, o) => {
      return sum + (o.distance || 0)
    }, 0)
    
    const medalIds = medals.map(m => m.id)
    const allMedalsWithStatus = mockMedals.map(m => ({
      ...m,
      unlocked: medalIds.includes(m.id)
    }))

    this.setData({
      medals,
      allMedals: allMedalsWithStatus,
      totalTrips,
      totalDistance: totalDistance.toFixed(1)
    })
  },

  showMedalDetail(e) {
    const medal = e.currentTarget.dataset.medal

    wx.showModal({
      title: medal.name,
      content: medal.unlocked
        ? `${medal.description}\n\n获得时间：${medal.obtainTime || '未知'}`
        : `${medal.description}\n\n解锁条件：${medal.condition}`,
      showCancel: false,
      confirmText: '知道了'
    })
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