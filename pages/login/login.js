const app = getApp()
const { showToast, validatePhone, validateCode } = require('../../utils/index')

Page({
  data: {
    phone: '',
    code: '',
    name: '',
    checked: true,
    countdown: 0
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    })
  },

  onCodeInput(e) {
    this.setData({
      code: e.detail.value
    })
  },

  onNameInput(e) {
    this.setData({
      name: e.detail.value
    })
  },

  toggleAgreement() {
    this.setData({
      checked: !this.data.checked
    })
  },

  sendCode() {
    if (this.data.countdown > 0) return
    
    if (!validatePhone(this.data.phone)) {
      showToast('请输入正确的手机号')
      return
    }

    this.setData({
      countdown: 60
    })

    const timer = setInterval(() => {
      this.setData({
        countdown: this.data.countdown - 1
      })
      
      if (this.data.countdown <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    showToast('验证码已发送')
  },

  login() {
    if (!validatePhone(this.data.phone)) {
      showToast('请输入正确的手机号')
      return
    }

    if (!validateCode(this.data.code)) {
      showToast('请输入6位验证码')
      return
    }

    if (!this.data.name) {
      showToast('请输入姓名')
      return
    }

    if (!this.data.checked) {
      showToast('请同意用户服务协议')
      return
    }

    const userInfo = {
      name: this.data.name,
      phone: this.data.phone
    }

    const token = 'token_' + Date.now()

    app.login(userInfo, token)
    showToast('登录成功', 'success')

    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  goToBindAssist() {
    wx.navigateTo({
      url: '/pages/bind-assist/bind-assist'
    })
  }
})