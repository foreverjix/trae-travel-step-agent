const app = getApp()
const travelService = require('../../services/travel.js')

Page({
  data: {
    parentName: '',
    parentPhone: '',
    from: '',
    to: '',
    date: '',
    plans: [],
    selectedPlanIndex: -1,
    showConfirmModal: false,
    isGettingLocation: false,
    aiAssistantEnabled: false
  },

  onLoad(options) {
    this.setData({
      parentName: options.parentName ? decodeURIComponent(options.parentName) : '',
      parentPhone: options.parentPhone ? decodeURIComponent(options.parentPhone) : '',
      date: this.formatDate(new Date()),
      isGettingLocation: true
    })
    this.getParentLocation()
  },

  onShow() {
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    app.globalData.aiPageContext = {
      page: 'child-plan',
      title: '帮订行程',
      summary: '帮长辈预订行程'
    }
  },

  getParentLocation() {
    const sharedLocation = app.getParentLocation()
    
    if (sharedLocation && app.globalData.isLocationSharing) {
      if (!Number.isFinite(sharedLocation.latitude) || !Number.isFinite(sharedLocation.longitude)) {
        this.setData({ from: '位置异常，请手动输入', isGettingLocation: false })
        return
      }
      const parentLocations = {
        '37.8706,112.5489': '太原南站附近',
        '37.8987,112.5426': '太原市杏花岭区府西街',
        '37.8587,112.5056': '山西省人民医院',
        '37.7850,112.5876': '太原武宿国际机场'
      }
      
      const key = `${sharedLocation.latitude.toFixed(4)},${sharedLocation.longitude.toFixed(4)}`
      const nearby = Object.keys(parentLocations).find(k => {
        const [pl, plng] = k.split(',').map(Number)
        return Math.abs(sharedLocation.latitude - pl) < 0.05 && Math.abs(sharedLocation.longitude - plng) < 0.05
      })
      
      const location = parentLocations[nearby] || `当前位置 (${sharedLocation.latitude.toFixed(4)}, ${sharedLocation.longitude.toFixed(4)})`

      this.setData({
        from: location,
        isGettingLocation: false
      })

      wx.showModal({
        title: '📍 已获取父母实时位置',
        content: `父母已开启位置共享，当前位置：\n${location}\n\n行程规划将以父母位置作为出发地，可手动修改。`,
        showCancel: false,
        confirmText: '知道了'
      })
    } else {
      wx.showModal({
        title: '父母未开启位置共享',
        content: '父母尚未开启位置共享，是否手动选择父母当前位置？',
        confirmText: '选择位置',
        cancelText: '使用默认地址',
        success: (res) => {
          if (res.confirm) {
            wx.chooseLocation({
              success: (res) => {
                const location = res.name || res.address
                this.setData({
                  from: location,
                  isGettingLocation: false
                })
              },
              fail: () => {
                this.useDefaultLocation()
              }
            })
          } else {
            this.useDefaultLocation()
          }
        }
      })
    }
  },

  useDefaultLocation() {
    const parentLocations = [
      '太原南站候车室A区',
      '太原市杏花岭区府西街25号',
      '太原市万柏林区千峰南路',
      '太原武宿国际机场T2航站楼'
    ]
    const randomLocation = parentLocations[Math.floor(Math.random() * parentLocations.length)]

    this.setData({
      from: randomLocation,
      isGettingLocation: false
    })

    wx.showModal({
      title: '📍 使用默认位置',
      content: `已使用默认位置：\n${randomLocation}\n\n行程规划将以父母位置作为出发地，可手动修改。`,
      showCancel: false,
      confirmText: '知道了'
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
    
    if (!from || !to) {
      wx.showToast({ title: '请输入出发地和目的地', icon: 'none' })
      return
    }

    wx.showLoading({ title: '正在规划路线...', mask: true })

    travelService.getLocalPlans(from, to).then(function(transitPlans) {
      const plans = []

      transitPlans.forEach(function(plan, index) {
        var steps = []
        var totalPrice = 0
        var totalDuration = ''

        plan.segments.forEach(function(seg) {
          var provider = ''
          var desc = ''
          var price = 0

          if (seg.type === 'taxi') {
            provider = '高德打车'
            price = seg.taxi ? seg.taxi.cost : 0
            desc = (seg.location || '') + ' · ' + (seg.taxi ? seg.taxi.desc : '')
          } else if (seg.type === 'bus' || seg.type === 'subway') {
            provider = seg.type === 'subway' ? '地铁' : '公交'
            price = seg.bus ? seg.bus.cost : 0
            desc = (seg.location || '') + ' · ' + (seg.bus ? seg.bus.desc : '')
          } else if (seg.type === 'walk') {
            provider = '步行'
            desc = seg.desc || ''
          } else if (seg.type === 'train') {
            provider = '12306'
            price = plan.totalCost || 0
            desc = (seg.location || '') + ' · ' + (seg.desc || '')
          }

          if (seg.type !== 'walk') {
            steps.push({
              type: seg.type,
              name: seg.title || seg.busName || seg.name || '',
              desc: desc,
              provider: provider
            })
            totalPrice += price
          }
        })

        totalDuration = plan.totalDuration || ''

        var tag = ''
        if (index === 0) tag = '推荐'
        if (plan.type === 'taxi') tag = '最快'

        plans.push({
          id: plan.id || 'plan' + (index + 1),
          duration: totalDuration,
          price: totalPrice > 0 ? totalPrice : (plan.totalCost || 0),
          tag: tag,
          steps: steps
        })
      })

      wx.hideLoading()
      this.setData({ plans })
    }.bind(this)).catch(function(err) {
      wx.hideLoading()
      console.error('规划路线失败:', err)

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
    }.bind(this))
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
  }
})