const app = getApp()

Page({
  data: {
    assistAccounts: []
  },

  goBack() {
    wx.navigateBack()
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const accounts = (app.globalData.assistAccounts || []).map(a => ({
      ...a,
      nameFirstChar: a.name ? a.name.charAt(0) : '?'
    }))
    this.setData({
      assistAccounts: accounts
    })
  },

  callAccount(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({ title: '呼叫失败', icon: 'none' })
      }
    })
  },

  deleteAccount(e) {
    const phone = e.currentTarget.dataset.phone
    const account = this.data.assistAccounts.find(a => a.phone === phone)

    wx.showModal({
      title: '确认删除',
      content: `确定要删除 ${account.name} 的辅助账号吗？删除后将无法恢复。`,
      success: (res) => {
        if (res.confirm) {
          app.removeAssistAccount(phone)
          this.loadData()
          wx.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  },

  goBind() {
    wx.navigateTo({
      url: '/pages/bind-assist/bind-assist'
    })
  }
})