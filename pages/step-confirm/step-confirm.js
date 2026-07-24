const app = getApp()
const { generateOrderId, showToast } = require('../../utils/index')

Page({
  data: {
    from: '',
    to: '',
    date: '',
    planId: '',
    plan: {},
    steps: [
      { title: '大交通' },
      { title: '接驳车' },
      { title: '总确认' }
    ],
    currentStep: 0,
    isLastStep: false,
    currentStepData: {},
    confirmedSteps: []
  },

  onLoad(options) {
    const { from, to, date, planId } = options
    const plan = this.getPlan(planId, from, to)
    const currentStepData = this.buildStepData(plan, 0)
    const steps = plan.steps.map((s, i) => ({
      title: s.icon === '🚕' ? '接驳车' : '大交通'
    }))

    this.setData({
      from,
      to,
      date,
      planId,
      plan,
      steps,
      currentStepData,
      isLastStep: plan.steps.length === 1
    })
  },

  getPlan(planId, from, to) {
    const plans = {
      plan1: {
        totalTime: '约5小时30分',
        totalPrice: 620,
        steps: [
          { icon: '🚄', name: '高铁 G1954', detail: `${from}南站 → ${to}南站 · 约4小时50分 · ¥520`, price: 520 },
          { icon: '🚕', name: '网约车接送', detail: `${to}南站 → 目的地 · 约40分钟 · ¥100`, price: 100 }
        ]
      },
      plan2: {
        totalTime: '约8小时',
        totalPrice: 380,
        steps: [
          { icon: '🚄', name: '普通火车 K1808', detail: `${from}站 → ${to}站 · 约7小时 · ¥280`, price: 280 },
          { icon: '🚕', name: '网约车接送', detail: `${to}站 → 目的地 · 约1小时 · ¥100`, price: 100 }
        ]
      },
      plan3: {
        totalTime: '约2小时30分',
        totalPrice: 980,
        steps: [
          { icon: '✈️', name: '航班 MU2750', detail: `${from}机场 → ${to}机场 · 约2小时 · ¥880`, price: 880 },
          { icon: '🚕', name: '网约车接送', detail: `${to}机场 → 目的地 · 约30分钟 · ¥100`, price: 100 }
        ]
      }
    }
    return plans[planId] || plans.plan1
  },

  buildStepData(plan, stepIndex) {
    const step = plan.steps[stepIndex]
    if (!step) return {}

    const isTransport = step.icon === '🚄' || step.icon === '✈️'
    return {
      icon: step.icon,
      title: isTransport ? '确认大交通' : '确认接驳车',
      subtitle: step.name,
      route: step.detail.split('·')[0].trim(),
      time: step.detail.split('·')[1] ? step.detail.split('·')[1].trim() : '',
      price: step.price,
      seat: isTransport ? '二等座（靠过道，方便出入）' : '',
      driver: isTransport ? '' : '王师傅 · 4.9分 · 5年驾龄'
    }
  },

  confirmStep() {
    const { plan, currentStep, currentStepData, confirmedSteps } = this.data

    wx.showModal({
      title: '请再次确认',
      content: `确认${currentStepData.title}信息无误吗？`,
      cancelText: '再想想',
      confirmText: '确认',
      success: (res) => {
        if (!res.confirm) return

        const newConfirmed = [...confirmedSteps, currentStepData]
        const nextStep = currentStep + 1

        if (nextStep >= plan.steps.length) {
          this.submitOrder(newConfirmed)
        } else {
          this.setData({
            confirmedSteps: newConfirmed,
            currentStep: nextStep,
            currentStepData: this.buildStepData(plan, nextStep),
            isLastStep: nextStep === plan.steps.length - 1
          })
          showToast('已确认，请继续', 'success')
        }
      }
    })
  },

  submitOrder(confirmedSteps) {
    const from = this.data.from
    const to = this.data.to
    const date = this.data.date
    const plan = this.data.plan
    const totalPrice = confirmedSteps.reduce((sum, s) => sum + s.price, 0)

    // 解析出每一段的关键信息
    const steps = confirmedSteps.map((s, index) => {
      const step = plan.steps[index]
      const isTransport = step.icon === '🚄' || step.icon === '✈️'
      const base = {
        icon: step.icon,
        name: step.name,
        detail: step.detail,
        price: s.price,
        time: s.time
      }
      if (isTransport) {
        // 大交通：生成车次号、座位、出发时间
        const trainName = step.name
        base.type = step.icon === '🚄' ? 'train' : 'flight'
        base.departureTime = (index === 0 ? '08:30' : '14:00')
        base.arrivalTime = (index === 0 ? '13:20' : '14:40')
        base.seat = '二等座 05车 12A'
        base.platform = '3站台'
        base.gate = '3A检票口'
        base.trainNo = step.name
        base.carriage = '05车'
        base.startStation = from + (step.icon === '🚄' ? '南站' : '机场')
        base.endStation = to + (step.icon === '🚄' ? '南站' : '机场')
      } else {
        // 网约车
        base.type = 'taxi'
        base.plate = (index === 0 ? '晋A·88888' : '苏A·66666')
        base.driver = '王师傅'
        base.driverPhone = '13800138000'
        base.start = (index === 0 ? from + '南站' : '目的地')
        base.end = (index === 0 ? to + '南站' : '目的地')
      }
      return base
    })

    const mainStep = steps.find(s => s.type === 'train' || s.type === 'flight') || steps[0]

    const order = {
      orderId: generateOrderId(),
      type: 'map-trip',
      name: from + ' → ' + to,
      start: from,
      end: to,
      date: date,
      price: totalPrice,
      status: 'booked',
      steps: steps,
      totalTime: plan.totalTime,
      createTime: new Date().toLocaleString(),
      // 首页灵动岛和订单详情需要用到的关键信息
      departureTime: mainStep.departureTime || '08:30',
      arrivalTime: mainStep.arrivalTime || '13:20',
      seat: mainStep.seat || '',
      platform: mainStep.platform || '',
      gate: mainStep.gate || '',
      trainNo: mainStep.trainNo || '',
      carriage: mainStep.carriage || '',
      plate: steps.find(s => s.type === 'taxi') ? steps.find(s => s.type === 'taxi').plate : '',
      driver: steps.find(s => s.type === 'taxi') ? { name: '王师傅', phone: '13800138000' } : null,
      startStation: mainStep.startStation || from,
      endStation: mainStep.endStation || to
    }

    app.addOrder(order)

    wx.showModal({
      title: '预订成功',
      content: '您的全程出行方案已预订成功，订单号：' + order.orderId + '。\n\n小提示：点击右上角「···」添加到「我的小程序」，以后微信下拉就能快速找到我！',
      showCancel: true,
      cancelText: '保存卡片',
      confirmText: '查看行程',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/orders/orders' })
        } else {
          // 保存卡片
          wx.navigateTo({ url: '/pages/order-detail/order-detail?orderId=' + order.orderId })
        }
      }
    })

    setTimeout(() => {
      wx.showModal({
        title: '🔔 开启微信提醒',
        content: '开启后，出发前微信会提醒您，再也不怕忘啦！\n\n点击「去开启」→ 选择「总是保持以上选择」→ 「允许」',
        showCancel: true,
        cancelText: '不用了',
        confirmText: '去开启',
        success: (r) => {
          if (r.confirm) {
            wx.requestSubscribeMessage({
              tmplIds: ['trip_reminder_demo'],
              success: () => {
                showToast('已开启提醒', 'success')
              },
              fail: () => {
                wx.showModal({
                  title: '手动开启',
                  content: '点击右上角「···」→「设置」→「订阅消息」→ 打开接收',
                  showCancel: false,
                  confirmText: '知道了'
                })
              }
            })
          }
        }
      })
    }, 1000)

    setTimeout(() => {
      wx.showModal({
        title: '添加到手机桌面',
        content: '把「乐龄出行」添加到手机桌面，一键就能打开，更方便！',
        showCancel: true,
        cancelText: '不用了',
        confirmText: '去添加',
        success: (r) => {
          if (r.confirm) {
            wx.saveAppToDesktop && wx.saveAppToDesktop({
              success: () => {
                showToast('已添加到桌面', 'success')
              },
              fail: () => {
                wx.showModal({
                  title: '手动添加',
                  content: '请点击右上角「···」→「添加到桌面」',
                  showCancel: false,
                  confirmText: '知道了'
                })
              }
            })
          }
        }
      })
    }, 3000)
  },

  goBack() {
    wx.navigateBack()
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