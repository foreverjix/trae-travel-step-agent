const app = getApp()
const { showToast } = require('../../utils/index')

Page({
  data: {
    assistAccounts: []
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const accounts = app.globalData.assistAccounts.map(a => ({
      ...a,
      nameFirstChar: a.name ? a.name.charAt(0) : '?'
    }))
    this.setData({
      assistAccounts: accounts
    })
  },

  goToBind() {
    wx.navigateTo({
      url: '/pages/bind-assist/bind-assist'
    })
  },

  goToManage() {
    wx.navigateTo({
      url: '/pages/assist-manage/assist-manage'
    })
  },

  shareLocation() {
    showToast('正在分享位置...')
    setTimeout(() => {
      showToast('位置已分享给亲友', 'success')
    }, 1500)
  },

  requestHelp() {
    const accounts = app.globalData.assistAccounts
    if (accounts.length === 0) {
      showToast('请先绑定亲友账号')
      return
    }

    wx.showActionSheet({
      itemList: accounts.map(a => `${a.name} (${a.relation})`),
      success: (res) => {
        const account = accounts[res.tapIndex]
        showToast(`正在呼叫 ${account.name}...`)
      }
    })
  },

  callFamily(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({ title: '呼叫失败', icon: 'none' })
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