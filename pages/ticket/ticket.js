const app = getApp()
const { trainStations, busStations, trains, buses } = require('../../data/mock')
const { formatDate, showToast } = require('../../utils/index')

Page({
  data: {
    currentTab: 'train',
    today: formatDate(new Date()),
    searchForm: {
      from: '',
      to: '',
      date: formatDate(new Date())
    },
    results: [],
    sortBy: 'time',
    hotStations: [],
    showPicker: false,
    pickerTitle: '',
    pickerType: '',
    searchKeyword: '',
    filteredStations: [],
    currentTrip: null
  },

  onLoad() {
    const today = formatDate(new Date())
    this.setData({
      today,
      searchForm: {
        from: '',
        to: '',
        date: today
      },
      hotStations: trainStations.slice(0, 8)
    })
    this.checkCurrentTrip()
  },

  onShow() {
    this.checkCurrentTrip()
  },

  onHide() {
    this.showExitReminder()
  },

  showExitReminder() {
    const trip = this.data.currentTrip
    if (!trip) return

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    if (trip.date !== today) return

    const key = 'exit_remind_' + trip.orderId + '_' + today
    if (wx.getStorageSync(key)) return

    wx.setStorageSync(key, true)

    const firstStep = trip.steps && trip.steps[0]
    const plate = trip.plate || (firstStep && firstStep.plate) || '请查看详情'

    wx.showModal({
      title: '📋 今日行程提醒',
      content: trip.name + '\n' + trip.from + ' → ' + trip.to + '\n\n⏰ 出发时间：' + (trip.departureTime || '') + '\n💺 座位号：' + (trip.seat || '请查看详情') + '\n🚗 接站车牌：' + plate + '\n\n请提前做好出行准备！',
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

  checkCurrentTrip() {
    const orders = app.globalData.orders || []
    const today = new Date().toISOString().split('T')[0]
    
    let currentTrip = orders.find(o => {
      return o.date === today && ['booked', 'waiting', 'picking', 'onway'].includes(o.status)
    })
    
    if (!currentTrip) {
      const hasShownDemo = wx.getStorageSync('demoTripShown')
      if (!hasShownDemo) {
        currentTrip = {
          orderId: 'DEMO001',
          type: 'train',
          status: 'booked',
          date: today,
          from: '太原',
          to: '南京',
          name: 'G1954',
          departureTime: '08:30',
          arrivalTime: '13:20',
          seat: '二等座 05车 12A',
          price: 590,
          steps: [
            { type: 'taxi', name: '网约车到太原南站', time: '07:30', status: 'pending', plate: '晋A·88888', driver: '王师傅' },
            { type: 'train', name: '高铁 G1954', time: '08:30', status: 'pending', seat: '二等座 05车 12A', platform: '3站台' },
            { type: 'taxi', name: '网约车到目的地', time: '13:30', status: 'pending', plate: '苏A·66666', driver: '李师傅' }
          ]
        }
      }
    }
    
    this.setData({ currentTrip })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab,
      hotStations: tab === 'train' ? trainStations.slice(0, 8) : busStations.slice(0, 8),
      results: []
    })
  },

  onFromInput(e) {
    this.setData({
      'searchForm.from': e.detail.value
    })
  },

  onToInput(e) {
    this.setData({
      'searchForm.to': e.detail.value
    })
  },

  swapRoute() {
    const { from, to } = this.data.searchForm
    this.setData({
      'searchForm.from': to,
      'searchForm.to': from
    })
  },

  onDateChange(e) {
    this.setData({
      'searchForm.date': e.detail.value
    })
  },

  searchTickets() {
    const { from, to, date } = this.data.searchForm
    if (!from) {
      showToast('请输入出发地')
      return
    }
    if (!to) {
      showToast('请输入目的地')
      return
    }
    if (!date) {
      showToast('请选择出发日期')
      return
    }

    let results = this.data.currentTab === 'train' ? trains : buses
    results = results.filter(item => 
      item.startStation.includes(from) && item.endStation.includes(to)
    )
    
    if (this.data.sortBy === 'price') {
      results.sort((a, b) => a.price - b.price)
    } else {
      results.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }

    this.setData({
      results
    })
  },

  setSort(e) {
    const sort = e.currentTarget.dataset.sort
    this.setData({
      sortBy: sort
    })
    this.searchTickets()
  },

  showStationPicker(e) {
    const type = e.currentTarget.dataset.type
    const stations = this.data.currentTab === 'train' ? trainStations : busStations
    this.setData({
      showPicker: true,
      pickerTitle: type === 'from' ? '选择出发地' : '选择目的地',
      pickerType: type,
      filteredStations: stations,
      searchKeyword: ''
    })
  },

  hidePicker() {
    this.setData({
      showPicker: false
    })
  },

  onSearchKeyword(e) {
    const keyword = e.detail.value
    const stations = this.data.currentTab === 'train' ? trainStations : busStations
    const filtered = stations.filter(item => item.name.includes(keyword))
    this.setData({
      searchKeyword: keyword,
      filteredStations: filtered
    })
  },

  confirmStation(e) {
    const name = e.currentTarget.dataset.name
    const type = this.data.pickerType
    this.setData({
      [`searchForm.${type}`]: name,
      showPicker: false
    })
  },

  selectStation(e) {
    const name = e.currentTarget.dataset.name
    const { from, to } = this.data.searchForm
    if (!from) {
      this.setData({
        'searchForm.from': name
      })
    } else if (!to) {
      this.setData({
        'searchForm.to': name
      })
    } else {
      this.setData({
        'searchForm.from': name,
        'searchForm.to': ''
      })
    }
  },

  goToTicketDetail(e) {
    const ticket = e.currentTarget.dataset.ticket
    const type = this.data.currentTab
    wx.navigateTo({
      url: `/pages/ticket-detail/ticket-detail?type=${type}&id=${ticket.id}`
    })
  },

  preventBubble() {
    // 阻止事件冒泡，点击弹窗内容时不关闭弹窗
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