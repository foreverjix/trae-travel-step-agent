const app = getApp()

Page({
  data: {
    parentName: '',
    parentLocation: null,
    volunteers: [],
    selectedVolunteer: null,
    showHelpModal: false,
    helpType: '',
    helpDesc: '',
    lovePoints: 0,
    loveRank: [],
    myLevel: '爱心新人',
    achievements: [],
    radarRadius: 200,
    nearbyCount: 0,
    serviceCount: 0,
    aiAssistantEnabled: false
  },

  onLoad(options) {
    const userRank = app.globalData.loveRank.find(r => r.name === app.globalData.userInfo?.name)
    this.setData({
      parentName: options.parentName ? decodeURIComponent(options.parentName) : '',
      lovePoints: app.globalData.lovePoints,
      loveRank: app.globalData.loveRank,
      myLevel: app.getLevel(app.globalData.lovePoints),
      serviceCount: userRank ? userRank.serviceCount : 0
    })
    this.loadVolunteers()
    this.loadAchievements()
    this.updateParentLocation()
  },

  onShow() {
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    app.globalData.aiPageContext = {
      page: 'volunteer',
      title: '志愿者',
      summary: '志愿者服务大厅'
    }
    this.updateParentLocation()
  },

  updateParentLocation() {
    const sharedLocation = app.getParentLocation()
    if (sharedLocation && app.globalData.isLocationSharing) {
      this.setData({
        parentLocation: sharedLocation
      })
      this.loadVolunteersByLocation(sharedLocation)
    }
  },

  loadVolunteersByLocation(location) {
    const areaNames = ['太原', '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '南京', '武汉', '天津', '重庆', '苏州', '郑州', '长沙']
    const matchedArea = areaNames.find(name => location.name.includes(name)) || '太原'
    
    const universityMap = {
      '太原': [
        { name: '山西大学', avatar: '山大' },
        { name: '太原理工', avatar: '理工' },
        { name: '中北大学', avatar: '中北' },
        { name: '山西财大', avatar: '财大' },
        { name: '山西医科', avatar: '医科' },
        { name: '太原师范', avatar: '师范' }
      ],
      '北京': [
        { name: '北京大学', avatar: '北大' },
        { name: '清华大学', avatar: '清华' },
        { name: '人民大学', avatar: '人大' },
        { name: '北京师范', avatar: '北师' },
        { name: '北京邮电', avatar: '北邮' },
        { name: '北京理工', avatar: '北理' }
      ],
      '上海': [
        { name: '复旦大学', avatar: '复旦' },
        { name: '上海交大', avatar: '上交' },
        { name: '同济大学', avatar: '同济' },
        { name: '华东师范', avatar: '华师' },
        { name: '华东理工', avatar: '华理' },
        { name: '上海大学', avatar: '上大' }
      ],
      '广州': [
        { name: '中山大学', avatar: '中山' },
        { name: '华南理工', avatar: '华工' },
        { name: '暨南大学', avatar: '暨南' },
        { name: '华南师范', avatar: '华师' },
        { name: '广东外语', avatar: '广外' },
        { name: '华南农业', avatar: '华农' }
      ],
      '深圳': [
        { name: '深圳大学', avatar: '深大' },
        { name: '南方科技', avatar: '南科' },
        { name: '香港中文', avatar: '港中深' },
        { name: '深圳技术', avatar: '深技' },
        { name: '深圳职业', avatar: '深职' },
        { name: '深圳信息', avatar: '深信' }
      ],
      '成都': [
        { name: '四川大学', avatar: '川大' },
        { name: '电子科大', avatar: '电科' },
        { name: '西南交大', avatar: '西南交' },
        { name: '四川农大', avatar: '川农' },
        { name: '西南财大', avatar: '西财' },
        { name: '成都理工', avatar: '成理' }
      ],
      '杭州': [
        { name: '浙江大学', avatar: '浙大' },
        { name: '浙江工大', avatar: '浙工大' },
        { name: '杭州电子', avatar: '杭电' },
        { name: '浙江理工', avatar: '浙理' },
        { name: '中国美院', avatar: '国美' },
        { name: '杭州师范', avatar: '杭师' }
      ],
      '西安': [
        { name: '西安交大', avatar: '西交' },
        { name: '西北工大', avatar: '西工大' },
        { name: '西北大学', avatar: '西大' },
        { name: '西安电子', avatar: '西电' },
        { name: '陕西师大', avatar: '陕师' },
        { name: '长安大学', avatar: '长安' }
      ],
      '南京': [
        { name: '南京大学', avatar: '南大' },
        { name: '东南大学', avatar: '东大' },
        { name: '南京理工', avatar: '南理' },
        { name: '南京航空', avatar: '南航' },
        { name: '河海大学', avatar: '河海' },
        { name: '南京师范', avatar: '南师' }
      ],
      '武汉': [
        { name: '武汉大学', avatar: '武大' },
        { name: '华中科大', avatar: '华科' },
        { name: '华中师大', avatar: '华师' },
        { name: '武汉理工', avatar: '武理' },
        { name: '华中农大', avatar: '华农' },
        { name: '中国地大', avatar: '地大' }
      ],
      '天津': [
        { name: '南开大学', avatar: '南开' },
        { name: '天津大学', avatar: '天大' },
        { name: '天津医科', avatar: '天医' },
        { name: '天津理工', avatar: '天理' },
        { name: '天津师范', avatar: '天师' },
        { name: '天津工业', avatar: '天工' }
      ],
      '重庆': [
        { name: '重庆大学', avatar: '重大' },
        { name: '西南大学', avatar: '西南' },
        { name: '重庆邮电', avatar: '重邮' },
        { name: '重庆医科', avatar: '重医' },
        { name: '重庆工商', avatar: '重工商' },
        { name: '重庆理工', avatar: '重理工' }
      ],
      '苏州': [
        { name: '苏州大学', avatar: '苏大' },
        { name: '苏州科技', avatar: '苏科' },
        { name: '苏州职业', avatar: '苏职' },
        { name: '常熟理工', avatar: '常理工' },
        { name: '昆山杜克', avatar: '昆杜' },
        { name: '西交利物浦', avatar: '西浦' }
      ],
      '郑州': [
        { name: '郑州大学', avatar: '郑大' },
        { name: '河南大学', avatar: '河大' },
        { name: '郑州轻工', avatar: '郑轻' },
        { name: '河南理工', avatar: '河理' },
        { name: '华北水利', avatar: '华水' },
        { name: '河南科技', avatar: '河科' }
      ],
      '长沙': [
        { name: '湖南大学', avatar: '湖大' },
        { name: '中南大学', avatar: '中南' },
        { name: '湖南师大', avatar: '湖师' },
        { name: '长沙理工', avatar: '长理' },
        { name: '湖南农大', avatar: '湖农' },
        { name: '湖南科技', avatar: '湖科' }
      ]
    }
    
    const universities = universityMap[matchedArea] || universityMap['太原']
    const surnames = ['李', '张', '王', '赵', '孙', '周', '吴', '郑', '刘', '陈']
    const serviceTypes = [
      ['接站', '送站', '陪诊'],
      ['接站', '送站', '陪同购物'],
      ['陪诊', '陪同购物', '日常陪伴'],
      ['接站', '送站', '接送就医'],
      ['陪诊', '日常陪伴'],
      ['接送就医', '日常陪伴']
    ]
    
    const volunteers = universities.map((uni, index) => ({
      id: index + 1,
      name: '小' + surnames[index],
      phone: `13${8 + index}0013${8 + index}002`,
      avatar: uni.avatar.substring(0, 1),
      distance: (0.3 + index * 0.2).toFixed(1),
      address: uni.name,
      serviceType: serviceTypes[index],
      rating: (4.5 + Math.random() * 0.5).toFixed(1),
      completedCount: Math.floor(50 + Math.random() * 200),
      isOnline: index % 3 !== 2,
      angle: (index * 60) % 360
    }))
    
    const volunteersWithPosition = volunteers.map(v => {
      const radian = v.angle * Math.PI / 180
      const radius = v.distance * 120
      const left = 50 + Math.cos(radian) * radius
      const top = 50 + Math.sin(radian) * radius
      return { ...v, left, top }
    })
    
    this.setData({ 
      volunteers: volunteersWithPosition,
      nearbyCount: volunteers.filter(v => v.isOnline).length
    })
  },

  loadVolunteers() {
    const surnames = ['李', '张', '王', '赵', '孙', '周']
    const serviceTypes = [
      ['接站', '送站', '陪诊'],
      ['接站', '送站', '陪同购物'],
      ['陪诊', '陪同购物', '日常陪伴'],
      ['接站', '送站', '接送就医'],
      ['陪诊', '日常陪伴'],
      ['接送就医', '日常陪伴']
    ]
    
    const volunteers = surnames.map((surname, index) => ({
      id: index + 1,
      name: '小' + surname,
      phone: `13${8 + index}0013${8 + index}002`,
      avatar: surname,
      distance: (0.3 + index * 0.2).toFixed(1),
      address: '山西大学',
      serviceType: serviceTypes[index],
      rating: (4.5 + Math.random() * 0.5).toFixed(1),
      completedCount: Math.floor(50 + Math.random() * 200),
      isOnline: index % 3 !== 2,
      angle: (index * 60) % 360
    }))

    const volunteersWithPosition = volunteers.map(v => {
      const radian = v.angle * Math.PI / 180
      const radius = v.distance * 120
      const left = 50 + Math.cos(radian) * radius
      const top = 50 + Math.sin(radian) * radius
      return { ...v, left, top }
    })

    this.setData({ 
      volunteers: volunteersWithPosition,
      nearbyCount: volunteers.filter(v => v.isOnline).length
    })
  },

  loadAchievements() {
    const achievements = [
      { id: 1, name: '初次相助', desc: '完成第一次志愿者服务', icon: '🌟', unlocked: false, points: 100 },
      { id: 2, name: '爱心小天使', desc: '累计获得100爱心值', icon: '👼', unlocked: false, points: 200 },
      { id: 3, name: '温暖使者', desc: '累计获得2000爱心值', icon: '🌞', unlocked: false, points: 500 },
      { id: 4, name: '陪诊达人', desc: '完成10次陪诊服务', icon: '🏥', unlocked: false, points: 300 },
      { id: 5, name: '接站能手', desc: '完成20次接站服务', icon: '🚄', unlocked: false, points: 300 },
      { id: 6, name: '助人为乐', desc: '帮助超过5位不同老人', icon: '❤️', unlocked: false, points: 400 },
      { id: 7, name: '连续奉献', desc: '连续7天参与服务', icon: '🔥', unlocked: false, points: 600 },
      { id: 8, name: '爱心大使', desc: '累计获得3000爱心值', icon: '👑', unlocked: false, points: 1000 }
    ]

    const points = app.globalData.lovePoints
    achievements.forEach(a => {
      if (points >= a.points) {
        a.unlocked = true
      }
    })

    this.setData({ achievements })
  },

  selectVolunteer(e) {
    const volunteer = e.currentTarget.dataset.volunteer
    this.setData({ selectedVolunteer: volunteer })
  },

  closeVolunteerDetail() {
    this.setData({ selectedVolunteer: null })
  },

  stopPropagation() {},

  callVolunteer() {
    if (!this.data.selectedVolunteer) return
    wx.makePhoneCall({
      phoneNumber: this.data.selectedVolunteer.phone,
      fail: () => {
        wx.showToast({ title: '呼叫失败', icon: 'none' })
      }
    })
  },

  startHelp() {
    if (!this.data.selectedVolunteer) {
      wx.showToast({ title: '请先选择志愿者', icon: 'none' })
      return
    }
    this.setData({ showHelpModal: true })
  },

  selectHelpType(e) {
    this.setData({ helpType: e.currentTarget.dataset.type })
  },

  onHelpDescInput(e) {
    this.setData({ helpDesc: e.detail.value })
  },

  submitHelp() {
    if (!this.data.helpType) {
      wx.showToast({ title: '请选择服务类型', icon: 'none' })
      return
    }

    if (!this.data.selectedVolunteer) {
      wx.showToast({ title: '请先选择志愿者', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认发起求助',
      content: `为${this.data.parentName}发起${this.data.helpType}求助\n服务描述：${this.data.helpDesc || '无'}\n志愿者：${this.data.selectedVolunteer.name}`,
      confirmText: '确认发起',
      success: (res) => {
        if (res.confirm) {
          this.setData({ showHelpModal: false, selectedVolunteer: null })
          wx.showToast({ title: '求助已发送，志愿者将尽快联系', icon: 'success' })
        }
      }
    })
  },

  cancelHelp() {
    this.setData({ showHelpModal: false, helpType: '', helpDesc: '' })
  },

  goToRank() {
    wx.showToast({ title: '当前爱心值：' + this.data.lovePoints, icon: 'none' })
  },

  shareToFriend() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    wx.showToast({ title: '邀请好友一起帮助老人，各得50爱心值', icon: 'none' })
  },

  completeService() {
    const points = app.getPointsForService(this.data.helpType)
    const level = app.addLovePoints(points, this.data.helpType)
    const userRank = app.globalData.loveRank.find(r => r.name === app.globalData.userInfo?.name)
    this.setData({
      lovePoints: app.globalData.lovePoints,
      loveRank: app.globalData.loveRank,
      myLevel: level,
      serviceCount: userRank ? userRank.serviceCount : 0
    })
    this.loadAchievements()
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  redeemReward() {
    wx.showToast({ title: '兑换成功！券码已发送到您的账户', icon: 'success' })
  }
})
