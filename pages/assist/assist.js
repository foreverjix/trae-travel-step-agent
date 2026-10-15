const app = getApp()
const { showToast } = require('../../utils/index')

var typeIcons = {
  'late_to_station': '⏰',
  'station_stay_long': '🧭',
  'no_move_long': '🚶',
  'should_arrive': '❓',
  'low_battery': '🔋',
  'off_route': '🔀'
}

var statusTexts = {
  'booked': '待出发',
  'waiting': '候车中',
  'onway': '行程中',
  'completed': '已完成'
}

Page({
  data: {
    assistAccounts: [],
    currentTrip: null,
    currentLocation: '',
    anomalyEvents: [],
    unreadCount: 0,
    isMonitoring: false
  },

  goBack() {
    wx.navigateBack()
  },

  onLoad() {
    this.loadData()
    this.startAutoRefresh()
  },

  onShow() {
    this.loadData()
  },

  onUnload() {
    this._destroyed = true
    this.stopAutoRefresh()
  },

  onHide() {
    this.stopAutoRefresh()
  },

  startAutoRefresh() {
    var that = this
    this._refreshTimer = setInterval(function() {
      if (!that || that._destroyed) {
        clearInterval(that._refreshTimer)
        that._refreshTimer = null
        return
      }
      that.loadData()
    }, 30000)
  },

  stopAutoRefresh() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer)
      this._refreshTimer = null
    }
  },

  loadData() {
    var accounts = app.globalData.assistAccounts.map(a => ({
      ...a,
      nameFirstChar: a.name ? a.name.charAt(0) : '?'
    }))

    var orders = app.globalData.orders || []
    var today = new Date().toISOString().split('T')[0]
    var currentTrip = null
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i]
      if (order.date === today && ['booked', 'waiting', 'onway'].includes(order.status)) {
        currentTrip = {
          ...order,
          statusText: statusTexts[order.status] || '进行中'
        }
        break
      }
    }

    if (!currentTrip) {
      var hasShownDemo = wx.getStorageSync('demoTripShown')
      if (!hasShownDemo) {
        var demoTrip = wx.getStorageSync('demo_trip')
        if (demoTrip) {
          currentTrip = {
            ...demoTrip,
            statusText: '待出发'
          }
        }
      }
    }

    var events = wx.getStorageSync('monitor_events') || []
    events = events.map(function(e) {
      return {
        ...e,
        icon: typeIcons[e.type] || '⚠️'
      }
    })

    var unreadCount = events.filter(function(e) { return !e.read }).length

    var currentLocation = wx.getStorageSync('last_location') || ''

    this.setData({
      assistAccounts: accounts,
      currentTrip: currentTrip,
      anomalyEvents: events,
      unreadCount: unreadCount,
      currentLocation: currentLocation,
      isMonitoring: !!currentTrip
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

  refreshLocation() {
    var that = this
    showToast('正在获取位置...')
    if (wx.getLocation) {
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        success: function(res) {
          var lat = res.latitude
          var lng = res.longitude
          var cityCoords = require('../../components/float-island/float-island.js').cityCoords || {}
          var minDist = 999999
          var nearestName = ''
          for (var name in cityCoords) {
            var coord = cityCoords[name]
            var dLat = coord.lat - lat
            var dLng = coord.lng - lng
            var dist = Math.sqrt(dLat * dLat + dLng * dLng)
            if (dist < minDist) {
              minDist = dist
              nearestName = name
            }
          }
          var locationText = minDist < 1.5 ? nearestName + '附近' : nearestName + '（约' + (minDist * 111).toFixed(0) + '公里）'
          wx.setStorageSync('last_location', locationText)
          that.setData({ currentLocation: locationText })
          showToast('位置已更新', 'success')
        },
        fail: function() {
          showToast('获取位置失败')
        }
      })
    } else {
      showToast('不支持定位')
    }
  },

  callForHelp() {
    var accounts = app.globalData.assistAccounts
    if (accounts.length === 0) {
      showToast('请先绑定亲友账号')
      return
    }

    wx.showActionSheet({
      itemList: accounts.map(a => a.name + ' (' + a.relation + ')'),
      success: function(res) {
        var account = accounts[res.tapIndex]
        wx.makePhoneCall({
          phoneNumber: account.phone,
          fail: function() {
            showToast('呼叫失败')
          }
        })
      }
    })
  },

  viewEvent(e) {
    var event = e.currentTarget.dataset.event
    var events = this.data.anomalyEvents
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === event.id) {
        events[i].read = true
      }
    }

    var storedEvents = wx.getStorageSync('monitor_events') || []
    for (var j = 0; j < storedEvents.length; j++) {
      if (storedEvents[j].id === event.id) {
        storedEvents[j].read = true
      }
    }
    wx.setStorageSync('monitor_events', storedEvents)

    var unreadCount = events.filter(function(e) { return !e.read }).length
    this.setData({
      anomalyEvents: events,
      unreadCount: unreadCount
    })

    wx.showModal({
      title: event.title,
      content: event.desc + '\n\n时间：' + event.time + '\n位置：' + event.location,
      showCancel: true,
      cancelText: '知道了',
      confirmText: '联系本人',
      success: function(res) {
        if (res.confirm) {
          var accounts = app.globalData.assistAccounts
          if (accounts.length > 0) {
            wx.makePhoneCall({
              phoneNumber: accounts[0].phone,
              fail: function() {}
            })
          }
        }
      }
    })
  },

  markAllRead() {
    var events = this.data.anomalyEvents.map(function(e) {
      return { ...e, read: true }
    })

    var storedEvents = wx.getStorageSync('monitor_events') || []
    storedEvents = storedEvents.map(function(e) {
      return { ...e, read: true }
    })
    wx.setStorageSync('monitor_events', storedEvents)

    this.setData({
      anomalyEvents: events,
      unreadCount: 0
    })
    showToast('已全部标为已读', 'success')
  }
})