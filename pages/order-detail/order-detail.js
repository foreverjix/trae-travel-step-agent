const app = getApp()
const { getOrderStatusText, showToast, showModal } = require('../../utils/index')
const ttsService = require('../../services/baidu-tts.js')

Page({
  data: {
    order: {},
    statusText: '',
    statusIcon: '',
    statusBg: '',
    showCancel: false,
    showChange: false,
    showConfirm: false,
    isPlaying: false,
    role: 'elder'
  },

  onLoad(options) {
    this.setData({ role: app.globalData.role || 'elder' })
    const { orderId } = options
    const orders = app.globalData.orders || []
    const order = orders.find(o => o.orderId === orderId)
    
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
    } else {
      wx.showToast({ title: '未找到行程信息', icon: 'none', duration: 2000 })
      setTimeout(function() {
        wx.navigateBack({ fail: function() {
          wx.reLaunch({ url: '/pages/index/index' })
        }})
      }, 1500)
    }
  },

  onUnload() {
    if (this.data.isPlaying) {
      ttsService.stopPlay()
      this.setData({ isPlaying: false })
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  getStatusConfig(status) {
    const configs = {
      booked: { statusText: '已订票', statusIcon: '🎫', statusBg: '#FF8C42', showCancel: true, showChange: true, showConfirm: false },
      waiting: { statusText: '等待接单', statusIcon: '⏳', statusBg: '#faad14', showCancel: true, showChange: false, showConfirm: false },
      picking: { statusText: '司机接单中', statusIcon: '🚕', statusBg: '#FF8C42', showCancel: true, showChange: false, showConfirm: false },
      onway: { statusText: '行程中', statusIcon: '🚗', statusBg: '#FF8C42', showCancel: false, showChange: false, showConfirm: false },
      completed: { statusText: '已完成', statusIcon: '✅', statusBg: '#52c41a', showCancel: false, showChange: false, showConfirm: true },
      cancelled: { statusText: '已取消', statusIcon: '❌', statusBg: '#999999', showCancel: false, showChange: false, showConfirm: false }
    }
    return configs[status] || { statusText: getOrderStatusText(status), statusIcon: '📋', statusBg: '#999999' }
  },

  getOrderIcon(type) {
    return { train: '🚄', bus: '🚌', taxi: '🚕' }[type] || '📋'
  },

  getOrderTitle(order) {
    if (order.type === 'train') return `${order.name} 火车票`
    if (order.type === 'bus') return `${order.name || order.id} 汽车票`
    if (order.type === 'taxi') return order.subType === 'remote' ? '偏远地区用车预约' : '网约车订单'
    return '出行订单'
  },

  // 🚶 开始行程 - 进入导航地图页面
  startTrip() {
    const order = this.data.order
    if (!order || !order.from && !order.start) {
      showToast('暂无行程信息')
      return
    }
    wx.navigateTo({
      url: `/pages/map-trip/map-trip?from=${encodeURIComponent(order.from || order.startStation || '')}&to=${encodeURIComponent(order.to || order.endStation || '')}`
    })
  },

  // 🔊 语音播报 - 朗读行程关键信息
  toggleVoice() {
    if (this.data.isPlaying) {
      ttsService.stopPlay()
      this.setData({ isPlaying: false })
      showToast('已停止播报')
      return
    }
    const order = this.data.order
    const texts = []
    if (order.type === 'train' || order.type === 'bus') {
      texts.push(`您好，请准时乘车。`)
      texts.push(`出发站：${order.startStation || order.from}`)
      texts.push(`到达站：${order.endStation || order.to}`)
      texts.push(`车次：${order.name}`)
      if (order.departureTime) texts.push(`发车时间：${order.departureTime}`)
      if (order.seat) texts.push(`座位号：${order.seat}`)
      if (order.platform) texts.push(`检票口：${order.platform}`)
    } else if (order.type === 'taxi') {
      texts.push(`您好，网约车已为您安排。`)
      texts.push(`出发地：${order.start || order.from}`)
      texts.push(`目的地：${order.end || order.to}`)
      if (order.plate) texts.push(`车牌号：${order.plate}`)
      if (order.driver && order.driver.name) texts.push(`司机：${order.driver.name}`)
    }
    this.setData({ isPlaying: true })
    ttsService.announceTripLoop(texts, () => {
      this.setData({ isPlaying: false })
    })
    showToast('开始语音播报')
  },

  // 🗺️ 地图导航
  openNavigation() {
    const order = this.data.order
    const from = order.from || order.start || order.startStation
    const to = order.to || order.end || order.endStation
    if (!from || !to) {
      showToast('暂无地址信息，无法导航')
      return
    }
    wx.showModal({
      title: '打开导航',
      content: `将为您打开地图导航\n\n路线：${from} → ${to}\n\n请确保手机已安装地图应用`,
      confirmText: '打开导航',
      success: (res) => {
        if (res.confirm) {
          if (order.fromCoord && order.toCoord) {
            wx.openLocation({
              latitude: order.toCoord.lat || 39.9087,
              longitude: order.toCoord.lng || 116.3975,
              name: to,
              address: to,
              scale: 16
            })
          } else {
            wx.showToast({ title: '正在打开地图...', icon: 'none' })
            setTimeout(() => {
              wx.openLocation({
                latitude: 39.9087,
                longitude: 116.3975,
                name: to,
                address: to,
                scale: 16
              })
            }, 500)
          }
        }
      }
    })
  },

  // 📞 呼叫司机
  callDriver() {
    const order = this.data.order
    const phone = order.driver ? order.driver.phone : '400-888-8888'
    wx.showModal({
      title: '拨打电话',
      content: `即将拨打：${phone}\n\n请在通话中说明您的行程信息`,
      confirmText: '立即拨打',
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: phone,
            fail: () => {
              showToast('拨打失败，请手动拨打')
            }
          })
        }
      }
    })
  },

  // 🎫 显示电子票
  showTicketBarcode() {
    const order = this.data.order
    if (!order || !order.orderId) {
      showToast('暂无电子票')
      return
    }
    wx.showModal({
      title: '电子检票',
      content: `检票信息\n\n车次：${order.name || 'D8011'}\n发车：${order.departureTime || '08:30'}\n到达站：${order.endStation || order.to}\n检票口：${order.platform || '3A'}\n座位：${order.seat || '03A'}`,
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        showToast('已显示电子票，请向工作人员出示', 'none')
      }
    })
  },

  // 👨‍👩‍👧 分享给子女
  shareToChild() {
    const order = this.data.order
    const shareText = `【行程通知】\n\n您好，您的${order.orderTitle || '出行订单'}已安排：\n\n🚗 ${order.from || order.startStation || '出发'} → ${order.to || order.endStation || '到达'}\n⏰ 时间：${order.departureTime || order.date || '已定'}\n🎫 订单号：${order.orderId}\n\n请您留意行程，如需帮助请联系子女。`
    
    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showModal({
          title: '已复制行程信息',
          content: '行程详情已复制到剪贴板，请打开微信粘贴发送给子女',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  // ❓ 询问子女
  askForHelp() {
    const order = this.data.order
    const orderInfo = `${order.from || order.startStation || '出发'} → ${order.to || order.endStation || '到达'}`
    const timeInfo = order.departureTime || order.date || '待定'
    
    wx.showActionSheet({
      itemList: ['📞 打电话问子女', '💬 微信发消息', '📋 复制行程信息'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '打电话给子女',
            content: `关于行程：\n${orderInfo}\n时间：${timeInfo}\n\n是否拨打子女电话？`,
            confirmText: '拨打电话',
            confirmColor: '#4CAF50',
            success: (r) => {
              if (r.confirm) {
                wx.makePhoneCall({
                  phoneNumber: '10086',
                  fail: () => {
                    wx.showModal({
                      title: '温馨提示',
                      content: '请在手机通讯录中找到子女电话拨打',
                      showCancel: false
                    })
                  }
                })
              }
            }
          })
        } else if (res.tapIndex === 1) {
          const text = `【行程咨询】\n\n您好，我有一趟行程想咨询：\n\n🚗 ${orderInfo}\n⏰ 时间：${timeInfo}${order.name ? '\n🚄 车次：' + order.name : ''}${order.seat ? '\n💺 座位：' + order.seat : ''}\n\n请问需要注意什么？`
          wx.setClipboardData({
            data: text,
            success: () => {
              wx.showModal({
                title: '已复制',
                content: '行程咨询信息已复制，请打开微信粘贴发送给子女',
                showCancel: false,
                confirmText: '知道了'
              })
            }
          })
        } else if (res.tapIndex === 2) {
          const text = `【行程通知】\n\n行程：${orderInfo}\n时间：${timeInfo}${order.name ? '\n车次：' + order.name : ''}${order.seat ? '\n座位：' + order.seat : ''}\n订单号：${order.orderId}\n\n请留意行程。`
          wx.setClipboardData({
            data: text,
            success: () => {
              wx.showToast({
                title: '已复制，请到微信粘贴',
                icon: 'none',
                duration: 2000
              })
            }
          })
        }
      }
    })
  },

  async cancelOrder() {
    const confirmed = await showModal('取消订单', '确定要取消此订单吗？')
    if (confirmed) {
      app.updateOrder(this.data.order.orderId, { status: 'cancelled' })
      showToast('订单已取消', 'success')
      setTimeout(() => { wx.navigateBack() }, 1500)
    }
  },

  changeOrder() {
    wx.showModal({
      title: '改签',
      content: '改签功能需要联系客服处理，请拨打客服电话：400-888-8888',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  async confirmOrder() {
    const confirmed = await showModal('确认完成', '确认此订单已完成？')
    if (confirmed) {
      showToast('感谢您的使用', 'success')
      setTimeout(() => { wx.navigateBack() }, 1500)
    }
  },

  // 💾 保存行程卡片
  saveTripCard() {
    const order = this.data.order
    if (!order || !order.orderId) {
      showToast('暂无行程信息')
      return
    }
    wx.showLoading({ title: '生成卡片中...' })
    const ctx = wx.createCanvasContext('tripCard')
    const w = 750, h = 1000

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
    ctx.moveTo(80, 240); ctx.lineTo(w - 80, 240)
    ctx.stroke()
    ctx.setFillStyle('#2D3142')
    ctx.setFontSize(64)
    ctx.setTextAlign('center')
    ctx.fillText((order.startStation || order.start || order.from) + ' →', w / 2, 330)
    ctx.fillText((order.endStation || order.end || order.to), w / 2, 410)
    ctx.setFillStyle('#FF8C42')
    ctx.setFontSize(52)
    ctx.fillText(order.name || order.plate || '', w / 2, 500)

    const infos = []
    if (order.departureTime) infos.push({ label: '出发时间', value: order.departureTime })
    if (order.seat) infos.push({ label: '座位号', value: order.seat })
    if (order.plate) infos.push({ label: '车牌号', value: order.plate })
    if (order.platform) infos.push({ label: '检票口', value: order.platform })

    const infoY = 580, boxW = 180, boxH = 140, gap = 30
    const startX = (w - (boxW * 3 + gap * 2)) / 2
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
                  content: '行程卡片已保存到相册，可在微信聊天中查看或发送给亲友。',
                  showCancel: false,
                  confirmText: '知道了'
                })
              },
              fail: function(err) {
                wx.hideLoading()
                if (err.errMsg && err.errMsg.indexOf('auth deny') > -1) {
                  wx.showModal({
                    title: '需要授权',
                    content: '请允许保存到相册权限。',
                    confirmText: '去设置',
                    success: function(r) { if (r.confirm) wx.openSetting() }
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
  }
})
