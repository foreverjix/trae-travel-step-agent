const app = getApp()
const { getOrderStatusText, showToast, showModal } = require('../../utils/index')

Page({
  data: {
    order: {},
    statusText: '',
    statusIcon: '',
    statusBg: '',
    showCancel: false,
    showChange: false,
    showConfirm: false
  },

  onLoad(options) {
    const { orderId } = options
    const order = app.globalData.orders.find(o => o.orderId === orderId)
    
    if (order) {
      const orderWithExtras = {
        ...order,
        orderIcon: this.getOrderIcon(order.type),
        orderTitle: this.getOrderTitle(order)
      }
      this.setData({
        order: orderWithExtras,
        ...this.getStatusConfig(order.status)
      })
    }
  },

  getStatusConfig(status) {
    const configs = {
      booked: {
        statusText: '已订票',
        statusIcon: '🎫',
        statusBg: '#FF8C42',
        showCancel: true,
        showChange: true,
        showConfirm: false
      },
      waiting: {
        statusText: '等待接单',
        statusIcon: '⏳',
        statusBg: '#faad14',
        showCancel: true,
        showChange: false,
        showConfirm: false
      },
      picking: {
        statusText: '司机接单中',
        statusIcon: '🚕',
        statusBg: '#FF8C42',
        showCancel: true,
        showChange: false,
        showConfirm: false
      },
      onway: {
        statusText: '行程中',
        statusIcon: '🚗',
        statusBg: '#FF8C42',
        showCancel: false,
        showChange: false,
        showConfirm: false
      },
      completed: {
        statusText: '已完成',
        statusIcon: '✅',
        statusBg: '#52c41a',
        showCancel: false,
        showChange: false,
        showConfirm: true
      },
      cancelled: {
        statusText: '已取消',
        statusIcon: '❌',
        statusBg: '#999999',
        showCancel: false,
        showChange: false,
        showConfirm: false
      }
    }
    return configs[status] || {
      statusText: getOrderStatusText(status),
      statusIcon: '📋',
      statusBg: '#999999'
    }
  },

  getOrderIcon(type) {
    const icons = {
      train: '🚄',
      bus: '🚌',
      taxi: '🚕'
    }
    return icons[type] || '📋'
  },

  getOrderTitle(order) {
    if (order.type === 'train') {
      return `${order.name} 火车票`
    }
    if (order.type === 'bus') {
      return `${order.name || order.id} 汽车票`
    }
    if (order.type === 'taxi') {
      return order.subType === 'remote' ? '偏远地区用车预约' : '网约车订单'
    }
    return '出行订单'
  },

  callDriver() {
    wx.showModal({
      title: '呼叫司机',
      content: `即将拨打 ${this.data.order.driver.phone}`,
      success: (res) => {
        if (res.confirm) {
          showToast('正在呼叫...')
        }
      }
    })
  },

  async cancelOrder() {
    const confirmed = await showModal('取消订单', '确定要取消此订单吗？')
    if (confirmed) {
      app.updateOrder(this.data.order.orderId, { status: 'cancelled' })
      showToast('订单已取消', 'success')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  changeOrder() {
    showToast('功能开发中')
  },

  async confirmOrder() {
    const confirmed = await showModal('确认完成', '确认此订单已完成？')
    if (confirmed) {
      showToast('感谢您的使用', 'success')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  saveTripCard() {
    const order = this.data.order
    if (!order || !order.orderId) {
      showToast('暂无行程信息')
      return
    }

    wx.showLoading({ title: '生成卡片中...' })

    const ctx = wx.createCanvasContext('tripCard')
    const w = 750
    const h = 1000

    const drawRoundRect = function(c, x, y, width, height, radius) {
      c.beginPath()
      c.moveTo(x + radius, y)
      c.lineTo(x + width - radius, y)
      c.quadraticCurveTo(x + width, y, x + width, y + radius)
      c.lineTo(x + width, y + height - radius)
      c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      c.lineTo(x + radius, y + height)
      c.quadraticCurveTo(x, y + height, x, y + height - radius)
      c.lineTo(x, y + radius)
      c.quadraticCurveTo(x, y, x + radius, y)
      c.closePath()
    }

    ctx.setFillStyle('#FF8C42')
    ctx.fillRect(0, 0, w, h)

    ctx.setFillStyle('#FFB627')
    ctx.beginPath()
    ctx.arc(w / 2, -100, 400, 0, 2 * Math.PI)
    ctx.fill()

    ctx.setFillStyle('#ffffff')
    drawRoundRect(ctx, 40, 120, w - 80, h - 240, 30)
    ctx.fill()

    ctx.setFillStyle('#2D3142')
    ctx.setFontSize(48)
    ctx.setTextAlign('center')
    ctx.fillText('乐龄出行 · 行程单', w / 2, 200)

    ctx.setStrokeStyle('#FFE9D6')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.moveTo(80, 240)
    ctx.lineTo(w - 80, 240)
    ctx.stroke()

    ctx.setFillStyle('#2D3142')
    ctx.setFontSize(64)
    ctx.setTextAlign('center')
    ctx.fillText((order.startStation || order.start || order.from) + ' →', w / 2, 330)
    ctx.fillText((order.endStation || order.end || order.to), w / 2, 410)

    ctx.setFillStyle('#FF8C42')
    ctx.setFontSize(52)
    ctx.fillText(order.name || order.plate || '', w / 2, 500)

    const infoY = 580
    const boxW = 180
    const boxH = 140
    const gap = 30
    const startX = (w - (boxW * 3 + gap * 2)) / 2

    const infos = []
    if (order.departureTime) {
      infos.push({ label: '出发时间', value: order.departureTime })
    }
    if (order.seat) {
      infos.push({ label: '座位号', value: order.seat })
    }
    if (order.plate) {
      infos.push({ label: '车牌号', value: order.plate })
    }
    if (order.platform) {
      infos.push({ label: '检票口', value: order.platform })
    }

    infos.forEach(function(info, i) {
      const x = startX + (boxW + gap) * i
      ctx.setFillStyle('#FFF2E6')
      drawRoundRect(ctx, x, infoY, boxW, boxH, 16)
      ctx.fill()
      ctx.setFillStyle('#9A5B2E')
      ctx.setFontSize(28)
      ctx.setTextAlign('center')
      ctx.fillText(info.label, x + boxW / 2, infoY + 50)
      ctx.setFillStyle('#2D3142')
      ctx.setFontSize(36)
      ctx.setTextAlign('center')
      ctx.fillText(info.value, x + boxW / 2, infoY + 100)
    })

    ctx.setFillStyle('#6B7280')
    ctx.setFontSize(32)
    ctx.setTextAlign('center')
    ctx.fillText('出行日期：' + (order.date || ''), w / 2, 800)

    ctx.setFillStyle('#9CA3AF')
    ctx.setFontSize(24)
    ctx.setTextAlign('center')
    ctx.fillText('订单号：' + order.orderId, w / 2, 860)

    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(28)
    ctx.setTextAlign('center')
    ctx.fillText('乐龄出行 · 让老人出行更简单', w / 2, 950)

    ctx.draw(false, function() {
      setTimeout(function() {
        wx.canvasToTempFilePath({
          canvasId: 'tripCard',
          success: function(res) {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: function() {
                wx.hideLoading()
                wx.showModal({
                  title: '保存成功',
                  content: '行程卡片已保存到相册，您可以在微信聊天中随时查看或发送给亲友。',
                  showCancel: false,
                  confirmText: '知道了'
                })
              },
              fail: function(err) {
                wx.hideLoading()
                if (err.errMsg && err.errMsg.indexOf('auth deny') > -1) {
                  wx.showModal({
                    title: '需要授权',
                    content: '请允许保存到相册权限，方便您随时查看行程。',
                    confirmText: '去设置',
                    success: function(r) {
                      if (r.confirm) {
                        wx.openSetting()
                      }
                    }
                  })
                } else {
                  showToast('保存失败，请重试')
                }
              }
            })
          },
          fail: function() {
            wx.hideLoading()
            showToast('生成卡片失败')
          }
        })
      }, 300)
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