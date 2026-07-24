const app = getApp()

Component({
  properties: {
    trip: {
      type: Object,
      value: null,
      observer: function(newVal) {
        if (newVal) {
          this.setData({
            hasTrip: true,
            visible: true,
            expanded: !this.data.defaultCollapsed
          })
          this.checkUrgentTrip()
        } else {
          this.setData({
            hasTrip: false,
            visible: false
          })
        }
      }
    },
    showExitReminder: {
      type: Boolean,
      value: true
    },
    defaultCollapsed: {
      type: Boolean,
      value: true
    }
  },

  data: {
    visible: false,
    expanded: false,
    hasTrip: false,
    statusBarHeight: 0,
    isUrgent: false,
    showExitModal: false
  },

  lifetimes: {
    attached: function() {
      this.getStatusBarHeight()
    },
    detached: function() {}
  },

  pageLifetimes: {
    show: function() {
      if (this.data.hasTrip) {
        this.setData({
          visible: true,
          expanded: !this.data.defaultCollapsed
        })
        this.checkUrgentTrip()
      }
    },
    hide: function() {
      if (this.data.hasTrip && this.data.showExitReminder) {
        this.triggerExitReminder()
      }
    }
  },

  methods: {
    getStatusBarHeight: function() {
      const systemInfo = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: systemInfo.statusBarHeight || 44
      })
    },

    checkUrgentTrip: function() {
      const trip = this.properties.trip
      if (!trip || !trip.departureTime) return

      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTime = currentHour * 60 + currentMinute

      const parts = trip.departureTime.split(':')
      const depHour = Number(parts[0])
      const depMinute = Number(parts[1])
      const depTime = depHour * 60 + depMinute
      const diff = depTime - currentTime

      this.setData({
        isUrgent: diff > 0 && diff <= 120
      })
    },

    triggerExitReminder: function() {
      const trip = this.properties.trip
      if (!trip) return

      const now = new Date()
      const today = now.toISOString().split('T')[0]
      if (trip.date !== today) return

      const key = 'exit_remind_' + trip.orderId + '_' + today
      if (wx.getStorageSync(key)) return

      wx.setStorageSync(key, true)

      wx.showModal({
        title: '📋 今日行程提醒',
        content: trip.name + '\n' + trip.from + ' → ' + trip.to + '\n\n出发时间：' + (trip.departureTime || '') + '\n座位号：' + (trip.seat || '请查看详情') + '\n接站车牌：' + (trip.plate || (trip.steps && trip.steps[0] && trip.steps[0].plate) || '请查看详情') + '\n\n请提前做好出行准备！',
        showCancel: true,
        cancelText: '保存卡片',
        confirmText: '我知道了',
        success: (res) => {
          if (!res.confirm) {
            wx.navigateTo({
              url: '/pages/order-detail/order-detail?orderId=' + trip.orderId
            })
          }
        }
      })
    },

    toggleExpand: function() {
      if (!this.data.hasTrip) return
      this.setData({
        expanded: !this.data.expanded
      })
    },

    goToDetail: function() {
      const trip = this.properties.trip
      if (!trip) return

      wx.navigateTo({
        url: '/pages/order-detail/order-detail?orderId=' + trip.orderId
      })
      this.setData({
        expanded: false
      })
    },

    saveCard: function() {
      const trip = this.properties.trip
      if (!trip) return

      wx.navigateTo({
        url: '/pages/order-detail/order-detail?orderId=' + trip.orderId
      })
      this.setData({
        expanded: false
      })
    },

    closeIsland: function() {
      this.setData({
        expanded: false
      })
    },

    subscribeReminder: function() {
      const trip = this.properties.trip
      if (!trip) return

      wx.showModal({
        title: '🔔 开启消息提醒',
        content: '订阅后，出发前微信会提醒您，就不怕忘啦！\n\n点击「允许」即可开启提醒',
        showCancel: true,
        cancelText: '不用了',
        confirmText: '去开启',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({
              title: '已开启提醒',
              icon: 'success'
            })
          }
        }
      })
    }
  }
})