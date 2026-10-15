const app = getApp()

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      code: ''
    },
    relations: ['儿子', '女儿', '其他'],
    relationIndex: 0,
    canSendCode: true,
    countdown: 60,
    mode: 'parent'
  },

  goBack() {
    wx.navigateBack()
  },

  onLoad(options) {
    if (options && options.mode === 'child') {
      this.setData({ 
        mode: 'child',
        relations: ['父亲', '母亲', '其他']
      })
    }
  },

  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    })
  },

  onRelationChange(e) {
    this.setData({
      relationIndex: e.detail.value
    })
  },

  onCodeInput(e) {
    this.setData({
      'formData.code': e.detail.value
    })
  },

  sendCode() {
    const { phone } = this.data.formData
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ canSendCode: false })
    wx.showToast({ title: '验证码已发送', icon: 'success' })

    const timer = setInterval(() => {
      const { countdown } = this.data
      if (countdown <= 1) {
        clearInterval(timer)
        this.setData({ canSendCode: true, countdown: 60 })
      } else {
        this.setData({ countdown: countdown - 1 })
      }
    }, 1000)
  },

  bindAccount() {
    const { name, phone, code } = this.data.formData
    const relation = this.data.relations[this.data.relationIndex]

    if (!name) {
      wx.showToast({ title: '请输入子女姓名', icon: 'none' })
      return
    }
    if (!phone) {
      wx.showToast({ title: '请输入子女手机号', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!code) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    const account = {
      name,
      phone,
      relation,
      bindTime: new Date().toLocaleString()
    }

    if (this.data.mode === 'child') {
      app.addParentAccount(account)
      wx.showModal({
        title: '绑定成功',
        content: `${name} 已成功绑定为您的父母账号`,
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    } else {
      app.addAssistAccount(account)
      wx.showModal({
        title: '绑定成功',
        content: `${name} 已成功绑定为您的辅助账号`,
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    }
  }
})