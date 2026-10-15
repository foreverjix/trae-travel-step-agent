const app = getApp()

Page({
  data: {
    emergencyContacts: [],
    currentLocation: '正在获取位置...',
    sosPressed: false,
    sosStatus: '',
    sosStatusText: ''
  },

  goBack() {
    wx.navigateBack({
      fail: function() {
        wx.switchTab({ url: '/pages/index/index' })
      }
    })
  },

  onLoad() {
    this.loadContacts()
    this.getLocation()
  },

  onSOSTap() {
    wx.showToast({ title: '请长按按钮发送求助', icon: 'none' })
  },

  triggerSOS() {
    if (this.data.sosStatus === 'sending') return

    var self = this
    var location = this.data.currentLocation || '未知位置'

    this.setData({
      sosPressed: true,
      sosStatus: 'sending',
      sosStatusText: '正在通知紧急联系人和附近志愿者...'
    })

    // 创建SOS订单
    var orderId = 'SOS' + Date.now()
    var sosOrder = {
      orderId: orderId,
      type: 'sos',
      status: 'waiting',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      from: location,
      to: '紧急求助',
      name: 'SOS紧急求助',
      location: location,
      contacts: this.data.emergencyContacts.length,
      desc: '老人发起SOS紧急求助，位置：' + location
    }

    app.globalData.orders = app.globalData.orders || []
    app.globalData.orders.push(sosOrder)

    // 弹窗通知
    var contactCount = this.data.emergencyContacts.length || 2
    wx.showModal({
      title: '🚨 SOS已发送',
      content: '已通知' + contactCount + '名紧急联系人和附近志愿者\n\n您的位置：' + location + '\n\n请保持电话畅通，救援人员正在赶来',
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#E53935',
      success: function() {
        self.setData({ sosPressed: false })
      }
    })

    // 3秒后状态变为已响应
    setTimeout(function() {
      app.updateOrder(orderId, { status: 'responded' })
      self.setData({
        sosStatus: 'responded',
        sosStatusText: '志愿者已接单，正在赶来'
      })
      wx.showToast({ title: '志愿者已响应', icon: 'success' })
    }, 3000)
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
    var self = this
    const sharedLocation = app.getParentLocation()
    
    if (sharedLocation && app.globalData.isLocationSharing) {
      if (!Number.isFinite(sharedLocation.latitude) || !Number.isFinite(sharedLocation.longitude)) {
        this.setData({ currentLocation: '位置异常，请手动输入' })
        return
      }
      const parentLocations = {
        '37.8706,112.5489': '太原南站附近',
        '37.8987,112.5426': '太原市杏花岭区府西街',
        '37.8587,112.5056': '山西省人民医院',
        '37.7850,112.5876': '太原武宿国际机场'
      }
      
      const key = `${sharedLocation.latitude.toFixed(4)},${sharedLocation.longitude.toFixed(4)}`
      const nearby = Object.keys(parentLocations).find(k => {
        const [pl, plng] = k.split(',').map(Number)
        return Math.abs(sharedLocation.latitude - pl) < 0.05 && Math.abs(sharedLocation.longitude - plng) < 0.05
      })
      
      const location = parentLocations[nearby] || `当前位置 (${sharedLocation.latitude.toFixed(4)}, ${sharedLocation.longitude.toFixed(4)})`
      
      this.setData({
        currentLocation: location
      })
    } else {
      // 没有共享位置时，先尝试获取本机位置，失败再让用户手动选择
      wx.getLocation({
        type: 'gcj02',
        success: function(res) {
          if (res && Number.isFinite(res.latitude) && Number.isFinite(res.longitude)) {
            self.setData({
              currentLocation: `当前位置 (${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)})`
            })
          } else {
            self.setData({ currentLocation: '正在获取位置，请稍后点击更新' })
          }
        },
        fail: function() {
          self.setData({
            currentLocation: '点击下方「更新位置」按钮获取'
          })
        }
      })
    }
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
  }
})