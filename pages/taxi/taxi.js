const app = getApp()
const { taxiDrivers } = require('../../data/mock')
const { formatDate, generateOrderId, showToast, showModal, validatePhone } = require('../../utils/index')

Page({
  data: {
    from: '',
    to: '',
    area: 'city',
    distance: 0,
    duration: '',
    price: 0,
    drivers: [],
    phone: '',
    time: '',
    passengers: 1,
    currentTrip: null
  },

  onLoad() {
    this.initDrivers()
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

  initDrivers() {
    const drivers = taxiDrivers.map(d => ({
      ...d,
      distance: (Math.random() * 3 + 0.5).toFixed(1)
    }))
    this.setData({
      drivers
    })
  },

  onFromInput(e) {
    this.setData({
      from: e.detail.value
    })
    this.calculatePrice()
  },

  onToInput(e) {
    this.setData({
      to: e.detail.value
    })
    this.calculatePrice()
  },

  useCurrentLocation() {
    wx.showLoading({ title: '获取位置中...' })
    setTimeout(() => {
      wx.hideLoading()
      this.setData({
        from: '北京市朝阳区建国路88号'
      })
      showToast('已定位到当前位置')
      this.calculatePrice()
    }, 1500)
  },

  switchArea(e) {
    const area = e.currentTarget.dataset.area
    this.setData({
      area
    })
    this.calculatePrice()
  },

  calculatePrice() {
    if (!this.data.from || !this.data.to) {
      this.setData({
        distance: 0,
        duration: '',
        price: 0
      })
      return
    }

    const distance = (Math.random() * 10 + 3).toFixed(1)
    const basePrice = this.data.area === 'remote' ? 50 : 8
    const perKm = this.data.area === 'remote' ? 4 : 2.5
    const price = Math.round(basePrice + (distance - 3) * perKm)

    this.setData({
      distance,
      duration: `${Math.round(distance * 2)}分钟`,
      price
    })
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    })
  },

  onPassengersInput(e) {
    this.setData({
      passengers: e.detail.value
    })
  },

  showTimePicker() {
    const today = new Date()
    wx.showActionSheet({
      itemList: [
        `${formatDate(today)} ${today.getHours()}:30`,
        `${formatDate(today)} ${today.getHours() + 1}:00`,
        `${formatDate(today)} ${today.getHours() + 2}:00`,
        `${formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))} 09:00`
      ],
      success: (res) => {
        const times = [
          `${formatDate(today)} ${today.getHours()}:30`,
          `${formatDate(today)} ${today.getHours() + 1}:00`,
          `${formatDate(today)} ${today.getHours() + 2}:00`,
          `${formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))} 09:00`
        ]
        this.setData({
          time: times[res.tapIndex]
        })
      }
    })
  },

  async callTaxi() {
    if (!this.data.from) {
      showToast('请输入出发地')
      return
    }
    if (!this.data.to) {
      showToast('请输入目的地')
      return
    }

    if (this.data.area === 'remote') {
      if (!this.data.phone || !validatePhone(this.data.phone)) {
        showToast('请输入正确的联系电话')
        return
      }
      if (!this.data.time) {
        showToast('请选择用车时间')
        return
      }

      const confirmed = await showModal('确认预约', `您即将预约偏远地区用车\n出发地: ${this.data.from}\n目的地: ${this.data.to}\n用车时间: ${this.data.time}\n乘客人数: ${this.data.passengers}\n预估费用: ¥${this.data.price}\n我们将尽快为您联系车辆`)
      
      if (confirmed) {
        const order = {
          orderId: generateOrderId(),
          type: 'taxi',
          subType: 'remote',
          start: this.data.from,
          end: this.data.to,
          phone: this.data.phone,
          time: this.data.time,
          passengers: this.data.passengers,
          price: this.data.price,
          status: 'waiting'
        }

        app.addOrder(order)
        showToast('预约成功，我们将尽快联系您', 'success')
        
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/orders/orders'
          })
        }, 1500)
      }
    } else {
      const confirmed = await showModal('确认呼叫', `您即将呼叫网约车\n出发地: ${this.data.from}\n目的地: ${this.data.to}\n预估距离: ${this.data.distance}公里\n预估费用: ¥${this.data.price}`)
      
      if (confirmed) {
        wx.showLoading({ title: '正在呼叫司机...' })
        
        setTimeout(() => {
          wx.hideLoading()
          
          const randomDriver = this.data.drivers[Math.floor(Math.random() * this.data.drivers.length)]
          const order = {
            orderId: generateOrderId(),
            type: 'taxi',
            subType: 'online',
            start: this.data.from,
            end: this.data.to,
            driver: randomDriver,
            distance: this.data.distance,
            duration: this.data.duration,
            price: this.data.price,
            status: 'picking'
          }

          app.addOrder(order)
          
          wx.navigateTo({
            url: `/pages/taxi-detail/taxi-detail?orderId=${order.orderId}`
          })
        }, 2000)
      }
    }
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