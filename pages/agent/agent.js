const app = getApp()
const { travelPlans, medals } = require('../../data/mock')
const { formatDate, showToast } = require('../../utils/index')

Page({
  data: {
    from: '',
    to: '',
    date: '',
    preferences: [],
    prefFast: false,
    prefCheap: false,
    prefComfortable: false,
    plans: [],
    showEmpty: false
  },

  onLoad() {
    this.setData({
      date: formatDate(new Date())
    })
  },

  onFromInput(e) {
    this.setData({
      from: e.detail.value
    })
  },

  onToInput(e) {
    this.setData({
      to: e.detail.value
    })
  },

  showDatePicker() {
    const today = new Date()
    wx.showActionSheet({
      itemList: [
        `${formatDate(today)} (今天)`,
        `${formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))} (明天)`,
        `${formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000))} (后天)`
      ],
      success: (res) => {
        const dates = [
          formatDate(today),
          formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000)),
          formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000))
        ]
        this.setData({
          date: dates[res.tapIndex]
        })
      }
    })
  },

  togglePreference(e) {
    const pref = e.currentTarget.dataset.pref
    const preferences = [...this.data.preferences]
    const index = preferences.indexOf(pref)
    if (index === -1) {
      preferences.push(pref)
    } else {
      preferences.splice(index, 1)
    }
    this.setData({
      preferences,
      prefFast: preferences.includes('fast'),
      prefCheap: preferences.includes('cheap'),
      prefComfortable: preferences.includes('comfortable')
    })
  },

  getRecommendations() {
    if (!this.data.from) {
      showToast('请输入出发地')
      return
    }
    if (!this.data.to) {
      showToast('请输入目的地')
      return
    }
    if (!this.data.date) {
      showToast('请选择出行日期')
      return
    }

    wx.showLoading({ title: '智能推荐中...' })

    setTimeout(() => {
      wx.hideLoading()

      let plans = [...travelPlans]

      if (this.data.preferences.includes('cheap')) {
        plans.sort((a, b) => a.totalPrice - b.totalPrice)
        plans[0].recommend = true
      } else if (this.data.preferences.includes('fast')) {
        plans.sort((a, b) => {
          const timeA = parseInt(a.totalTime)
          const timeB = parseInt(b.totalTime)
          return timeA - timeB
        })
        plans[0].recommend = true
      } else if (this.data.preferences.includes('comfortable')) {
        plans.sort((a, b) => b.totalPrice - a.totalPrice)
        plans[0].recommend = true
      } else {
        plans[0].recommend = true
      }

      this.setData({
        plans,
        showEmpty: true
      })

      app.addMedal(medals[4])
    }, 1500)
  },

  selectPlan(e) {
    const plan = e.currentTarget.dataset.plan
    showToast(`已选择: ${plan.name}`)
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/ticket/ticket'
      })
    }, 1000)
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