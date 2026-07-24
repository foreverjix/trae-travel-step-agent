const app = getApp()

Page({
  data: {
    emergencyContacts: [],
    currentLocation: '正在获取位置...'
  },

  onLoad() {
    this.loadContacts()
    this.getLocation()
  },

  loadContacts() {
    const contacts = (app.globalData.assistAccounts || []).map(a => ({
      ...a,
      nameFirstChar: a.name ? a.name.charAt(0) : '?'
    }))
    this.setData({
      emergencyContacts: contacts
    })
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.request({
          url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${res.latitude},${res.longitude}&key=YOUR_KEY`,
          success: (result) => {
            if (result.data.result && result.data.result.address) {
              this.setData({
                currentLocation: result.data.result.address
              })
            }
          },
          fail: () => {
            this.setData({
              currentLocation: `纬度: ${res.latitude}, 经度: ${res.longitude}`
            })
          }
        })
      },
      fail: () => {
        this.setData({
          currentLocation: '无法获取位置信息'
        })
      }
    })
  },

  callEmergency() {
    wx.makePhoneCall({
      phoneNumber: '110',
      fail: () => {
        wx.showToast({ title: '呼叫失败', icon: 'none' })
      }
    })
  },

  callAmbulance() {
    wx.makePhoneCall({
      phoneNumber: '120',
      fail: () => {
        wx.showToast({ title: '呼叫失败', icon: 'none' })
      }
    })
  },

  callContact(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({ title: '呼叫失败', icon: 'none' })
      }
    })
  },

  sendMessage(e) {
    const phone = e.currentTarget.dataset.phone
    wx.showModal({
      title: '发送短信',
      content: `确定向 ${phone} 发送求助短信吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '短信已发送', icon: 'success' })
        }
      }
    })
  },

  shareLocation() {
    if (this.data.emergencyContacts.length === 0) {
      wx.showToast({ title: '请先添加紧急联系人', icon: 'none' })
      return
    }
    
    wx.showActionSheet({
      itemList: this.data.emergencyContacts.map(c => `${c.name} (${c.phone})`),
      success: (res) => {
        const contact = this.data.emergencyContacts[res.tapIndex]
        wx.showToast({ 
          title: `已向 ${contact.name} 分享位置`, 
          icon: 'success' 
        })
      }
    })
  },

  updateLocation() {
    this.setData({ currentLocation: '正在获取位置...' })
    this.getLocation()
  },

  goToManage() {
    wx.navigateTo({
      url: '/pages/assist-manage/assist-manage'
    })
  },

  helpFall() {
    this.sendHelpMessage('摔倒求助')
  },

  helpLost() {
    this.sendHelpMessage('迷路求助')
  },

  helpTraffic() {
    this.sendHelpMessage('交通事故')
  },

  helpHealth() {
    this.sendHelpMessage('突发疾病')
  },

  sendHelpMessage(type) {
    if (this.data.emergencyContacts.length === 0) {
      wx.showToast({ title: '请先添加紧急联系人', icon: 'none' })
      return
    }

    wx.showModal({
      title: `${type}`,
      content: `确定向紧急联系人发送"${type}"求助信息吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '求助信息已发送', icon: 'success' })
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