const app = getApp()
const { trains, buses, medals } = require('../../data/mock')
const { formatDate, generateOrderId, showToast, showModal } = require('../../utils/index')

Page({
  data: {
    ticket: {},
    type: 'train',
    date: '',
    selectedSeat: '',
    passenger: {
      name: '',
      idCard: '',
      isSenior: true
    },
    totalPrice: 0
  },

  onLoad(options) {
    const { type, id } = options
    const data = type === 'train' ? trains : buses
    const ticket = data.find(t => t.id === id)
    
    this.setData({
      ticket,
      type,
      date: formatDate(new Date())
    })
  },

  selectSeat(e) {
    const seat = e.currentTarget.dataset.seat
    this.setData({
      selectedSeat: seat.type,
      totalPrice: seat.price
    })
  },

  addPassenger() {
    wx.showModal({
      title: '添加乘车人',
      editable: true,
      placeholderText: '请输入姓名',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({
            'passenger.name': res.content,
            'passenger.idCard': '**** **** **** ****'
          })
        }
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  async submitOrder() {
    if (!this.data.selectedSeat) {
      showToast('请选择座位类型')
      return
    }
    if (!this.data.passenger.name) {
      showToast('请添加乘车人')
      return
    }

    const confirmed = await showModal('确认预订', `您即将预订\n${this.data.ticket.name || this.data.ticket.id}\n${this.data.date} ${this.data.ticket.startTime}出发\n${this.data.selectedSeat} x 1\n合计: ¥${this.data.totalPrice}`)
    
    if (confirmed) {
      const order = {
        orderId: generateOrderId(),
        type: this.data.type,
        subType: 'ticket',
        name: this.data.ticket.name || this.data.ticket.id,
        startStation: this.data.ticket.startStation,
        endStation: this.data.ticket.endStation,
        date: this.data.date,
        startTime: this.data.ticket.startTime,
        endTime: this.data.ticket.endTime,
        seatType: this.data.selectedSeat,
        passenger: this.data.passenger,
        price: this.data.totalPrice,
        status: 'booked'
      }

      app.addOrder(order)
      
      if (app.globalData.orders.length === 1) {
        app.addMedal(medals[0])
      }

      showToast('预订成功', 'success')

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/orders/orders'
        })
      }, 1500)
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