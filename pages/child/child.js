const app = getApp()

Page({
  data: {
    parentAccounts: [],
    userName: ''
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const userInfo = app.globalData.userInfo
    const accounts = (app.globalData.parentAccounts || []).map(a => ({
      ...a,
      nameFirstChar: a.name ? a.name.charAt(0) : '?'
    }))
    
    this.setData({
      parentAccounts: accounts,
      userName: userInfo ? userInfo.name : ''
    })
  },

  goToPlan(e) {
    const parent = e.currentTarget.dataset.parent
    wx.navigateTo({
      url: `/pages/child-plan/child-plan?parentName=${encodeURIComponent(parent.name)}&parentPhone=${encodeURIComponent(parent.phone)}`
    })
  },

  goToViewTrips(e) {
    const parent = e.currentTarget.dataset.parent
    wx.navigateTo({
      url: `/pages/child-trips/child-trips?parentName=${encodeURIComponent(parent.name)}&parentPhone=${encodeURIComponent(parent.phone)}`
    })
  },

  goToBindParent() {
    wx.navigateTo({
      url: '/pages/bind-assist/bind-assist?mode=child'
    })
  },

  callParent(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({ title: '呼叫失败', icon: 'none' })
      }
    })
  },

  deleteParent(e) {
    const phone = e.currentTarget.dataset.phone
    const account = this.data.parentAccounts.find(a => a.phone === phone)

    wx.showModal({
      title: '确认删除',
      content: `确定要解除与 ${account.name} 的绑定吗？`,
      success: (res) => {
        if (res.confirm) {
          app.removeParentAccount(phone)
          this.loadData()
          wx.showToast({ title: '已解除绑定', icon: 'success' })
        }
      }
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