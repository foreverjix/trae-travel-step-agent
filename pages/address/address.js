Page({
  data: {
    homeAddress: '',
    hospitalAddress: '',
    stationAddress: ''
  },

  onLoad() {
    this.loadAddresses()
  },

  onShow() {
    this.loadAddresses()
  },

  loadAddresses() {
    this.setData({
      homeAddress: wx.getStorageSync('homeAddress') || '',
      hospitalAddress: wx.getStorageSync('hospitalAddress') || '',
      stationAddress: wx.getStorageSync('stationAddress') || ''
    })
  },

  onHomeAddressChange(e) {
    this.setData({ homeAddress: e.detail.value })
  },

  onHospitalAddressChange(e) {
    this.setData({ hospitalAddress: e.detail.value })
  },

  onStationAddressChange(e) {
    this.setData({ stationAddress: e.detail.value })
  },

  saveAddresses() {
    wx.setStorageSync('homeAddress', this.data.homeAddress)
    wx.setStorageSync('hospitalAddress', this.data.hospitalAddress)
    wx.setStorageSync('stationAddress', this.data.stationAddress)

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
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