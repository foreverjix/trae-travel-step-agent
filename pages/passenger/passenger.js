const app = getApp()

Page({
  data: {
    name: '',
    idCard: '',
    phone: '',
    saved: false,
    aiAssistantEnabled: false
  },

  onLoad() {
    this.loadPassenger()
  },

  onShow() {
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    app.globalData.aiPageContext = {
      page: 'passenger',
      title: '乘客',
      summary: '乘客信息管理'
    }
  },

  loadPassenger() {
    var info = wx.getStorageSync('passenger_info')
    if (info) {
      this.setData({
        name: info.name || '',
        idCard: info.idCard || '',
        phone: info.phone || '',
        saved: true
      })
    } else {
      // 默认预填并保存，方便演示
      var defaultInfo = { name: '张大爷', idCard: '140107195503150011', phone: '13800138000' }
      wx.setStorageSync('passenger_info', defaultInfo)
      this.setData({
        name: '张大爷',
        idCard: '140107195503150011',
        phone: '13800138000',
        saved: true
      })
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onIdCardInput(e) {
    this.setData({ idCard: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  savePassenger() {
    var name = this.data.name.trim()
    var idCard = this.data.idCard.trim()
    var phone = this.data.phone.trim()

    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!idCard || idCard.length < 15) {
      wx.showToast({ title: '请输入正确的身份证号', icon: 'none' })
      return
    }
    if (!phone || phone.length < 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    var info = { name: name, idCard: idCard, phone: phone }
    wx.setStorageSync('passenger_info', info)
    this.setData({ saved: true })
    wx.showToast({ title: '保存成功', icon: 'success' })
  },

  goBack() {
    wx.navigateBack()
  }
})
