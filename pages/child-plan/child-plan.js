const app = getApp()

Page({
  data: {
    parentName: '',
    parentPhone: '',
    from: '太原',
    to: '',
    date: '',
    plans: [],
    selectedPlanIndex: -1,
    showConfirmModal: false
  },

  onLoad(options) {
    this.setData({
      parentName: options.parentName || '',
      parentPhone: options.parentPhone || '',
      date: this.formatDate(new Date())
    })
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  onFromInput(e) {
    this.setData({ from: e.detail.value })
  },

  onToInput(e) {
    this.setData({ to: e.detail.value })
  },

  onDateInput(e) {
    this.setData({ date: e.detail.value })
  },

  generatePlans() {
    const { from, to, date } = this.data
    
    if (!to) {
      wx.showToast({ title: '请输入目的地', icon: 'none' })
      return
    }

    const plans = [
      {
        id: 'plan1',
        duration: '约6小时30分',
        price: 720,
        tag: '推荐',
        steps: [
          { type: 'taxi', name: '网约车到车站', desc: from + ' → ' + from + '南站 · 约20分钟 · ¥30', provider: '花小猪' },
          { type: 'train', name: '高铁 G1954', desc: from + '南站 → ' + to + '南站 · 约4小时50分 · ¥590', provider: '12306' },
          { type: 'taxi', name: '网约车到目的地', desc: to + '南站 → 目的地 · 约40分钟 · ¥100', provider: '高德打车' }
        ]
      },
      {
        id: 'plan2',
        duration: '约9小时',
        price: 350,
        tag: '',
        steps: [
          { type: 'bus', name: '公交到车站', desc: from + ' → ' + from + '站 · 约50分钟 · ¥2', provider: '公交' },
          { type: 'train', name: '火车 K2502', desc: from + '站 → ' + to + '站 · 约7小时30分 · ¥288', provider: '12306' },
          { type: 'taxi', name: '网约车到目的地', desc: to + '站 → 目的地 · 约40分钟 · ¥60', provider: '花小猪' }
        ]
      },
      {
        id: 'plan3',
        duration: '约3小时',
        price: 1200,
        tag: '最快',
        steps: [
          { type: 'taxi', name: '网约车到机场', desc: from + ' → ' + from + '武宿机场 · 约30分钟 · ¥40', provider: '高德打车' },
          { type: 'flight', name: '航班 MU5132', desc: from + '武宿机场 → ' + to + '浦东机场 · 约2小时', provider: '去哪儿' },
          { type: 'taxi', name: '网约车到目的地', desc: to + '浦东机场 → 目的地 · 约60分钟 · ¥150', provider: '花小猪' }
        ]
      }
    ]

    this.setData({ plans })
  },

  selectPlan(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ selectedPlanIndex: index })
  },

  confirmPlan() {
    if (this.data.selectedPlanIndex < 0) {
      wx.showToast({ title: '请先选择一个方案', icon: 'none' })
      return
    }

    this.setData({ showConfirmModal: true })
  },

  sendPlan() {
    const plan = this.data.plans[this.data.selectedPlanIndex]
    
    wx.showModal({
      title: '发送成功',
      content: `已将行程方案发送给${this.data.parentName}，等待确认`,
      showCancel: false,
      success: () => {
        this.setData({ showConfirmModal: false })
        wx.navigateBack()
      }
    })
  },

  cancelSend() {
    this.setData({ showConfirmModal: false })
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