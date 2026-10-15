App({
  globalData: {
    userInfo: null,
    token: '',
    isLogin: false,
    role: 'elder',
    assistAccounts: [],
    parentAccounts: [],
    orders: [],
    cloudEnv: '',
    tripPlan: null,
    pairCode: '',
    parentLocation: null,
    isLocationSharing: false,
    lovePoints: 0,
    volunteerServices: [],
    loveRank: [],
    _cloudReady: false,
    aiAssistantEnabled: true,  // AI助手默认启用
    aiPageContext: null,         // 当前页面上下文 {page, title, summary, data}
    aiLastAnnouncedPage: '',     // 记录上次自动播报的页面，避免重复播报
    aiHomeAnnounced: false,      // 首页欢迎语是否已播报过（永久去重）
    aiPageListenDisabled: false  // 某些页面（如行程规划页）只播报不监听
  },

  _locationTimer: null,

  onLaunch() {
    this.initCloud() // 尽力初始化云开发（本地功能不依赖）
    this.checkLoginStatus()
    this.loadUserData()
    this.startTripReminder()
  },

  // 设置AI助手页面上下文（供各页面调用）
  setAIPageContext(ctx) {
    this.globalData.aiPageContext = ctx
  },

  // 启用/禁用AI助手
  enableAIAssistant(enabled) {
    this.globalData.aiAssistantEnabled = enabled
    // 通知所有页面更新
    const pages = getCurrentPages()
    pages.forEach(page => {
      if (page.setData) {
        page.setData({ aiAssistantEnabled: enabled })
      }
    })
  },

  initCloud() {
    if (!wx.cloud) {
      return
    }
    try {
      wx.cloud.init({
        env: 'cloud1-d3gdnlh2841ba9d8e',
        traceUser: true
      })
      this.globalData._cloudReady = true
    } catch (e) {
      // 云开发未开启不影响本地功能，静默失败
    }
  },

  startTripReminder() {
    // 每分钟检查一次即将到来的行程
    this._tripReminderTimer = setInterval(() => {
      try {
        this.checkUpcomingTrips()
      } catch (e) {
        console.error('行程提醒检查失败:', e)
      }
    }, 60000)
    // 立即检查一次
    this.checkUpcomingTrips()
  },

  checkUpcomingTrips() {
    var pages = getCurrentPages()
    if (!pages || pages.length === 0) return  // 没有活动页面时不弹窗

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    this.globalData.orders.forEach(order => {
      if (order.date !== today) return
      if (!['booked', 'waiting', 'picking'].includes(order.status)) return

      // 检查是否有出发时间
      const departureTime = order.departureTime
      if (!departureTime) return

      const parts = departureTime.split(':')
      const depHour = Number(parts[0])
      const depMinute = Number(parts[1])
      const depTime = depHour * 60 + depMinute
      const diff = depTime - currentTime

      // 出发前30分钟提醒
      if (diff > 25 && diff <= 30) {
        const key = 'remind_30_' + order.orderId
        if (!wx.getStorageSync(key)) {
          wx.setStorageSync(key, true)
          wx.showModal({
            title: '⏰ 出发提醒',
            content: '您今天' + departureTime + '的' + (order.name || '') + '即将出发，请提前准备！\n\n座位：' + (order.seat || '请查看详情') + '\n车牌：' + (order.plate || '请查看详情'),
            showCancel: false,
            confirmText: '我知道了'
          })
        }
      }

      // 出发前5分钟提醒
      if (diff > 0 && diff <= 5) {
        const key = 'remind_5_' + order.orderId
        if (!wx.getStorageSync(key)) {
          wx.setStorageSync(key, true)
          wx.showModal({
            title: '🚨 马上出发',
            content: '您今天' + departureTime + '的' + (order.name || '') + '即将出发！\n\n请立即前往出发地点！',
            showCancel: false,
            confirmText: '我知道了'
          })
        }
      }
    })
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    const role = wx.getStorageSync('role')
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      this.globalData.isLogin = true
      this.globalData.role = role || 'elder'
    } else {
      const defaultUserInfo = {
        name: '张大爷',
        phone: '13800138000'
      }
      const defaultToken = 'token_' + Date.now()
      this.globalData.userInfo = defaultUserInfo
      this.globalData.token = defaultToken
      this.globalData.isLogin = true
      this.globalData.role = 'elder'
      wx.setStorageSync('userInfo', defaultUserInfo)
      wx.setStorageSync('token', defaultToken)
      wx.setStorageSync('role', 'elder')
    }
  },

  loadUserData() {
    let assistAccounts = wx.getStorageSync('assistAccounts') || []
    let parentAccounts = wx.getStorageSync('parentAccounts') || []
    const orders = wx.getStorageSync('orders') || []
    const pairCode = wx.getStorageSync('pairCode') || ''
    
    if (assistAccounts.length === 0) {
      assistAccounts = [{
        name: '子女-小张',
        phone: '13900139000',
        relation: '儿子'
      }]
      wx.setStorageSync('assistAccounts', assistAccounts)
    }
    
    if (parentAccounts.length === 0) {
      parentAccounts = [{
        name: '父亲-张大爷',
        phone: '13800138000',
        relation: '父亲'
      }, {
        name: '母亲-李阿姨',
        phone: '13700137000',
        relation: '母亲'
      }]
      wx.setStorageSync('parentAccounts', parentAccounts)
    }
    
    this.globalData.assistAccounts = assistAccounts
    this.globalData.parentAccounts = parentAccounts
    this.globalData.orders = orders
    this.globalData.pairCode = pairCode

    const lovePoints = wx.getStorageSync('lovePoints') || 0
    this.globalData.lovePoints = lovePoints

    const volunteerServices = wx.getStorageSync('volunteerServices') || []
    if (volunteerServices.length === 0) {
      const defaultServices = [
        { id: 1, type: '接站', points: 50 },
        { id: 2, type: '送站', points: 50 },
        { id: 3, type: '陪诊', points: 100 },
        { id: 4, type: '陪同购物', points: 80 },
        { id: 5, type: '日常陪伴', points: 120 },
        { id: 6, type: '接送就医', points: 150 }
      ]
      wx.setStorageSync('volunteerServices', defaultServices)
      this.globalData.volunteerServices = defaultServices
    } else {
      this.globalData.volunteerServices = volunteerServices
    }

    const loveRank = wx.getStorageSync('loveRank') || []
    if (loveRank.length === 0) {
      const defaultRank = [
        { name: '李阿姨', avatar: '李', points: 2850, level: '爱心大使', serviceCount: 48 },
        { name: '张师傅', avatar: '张', points: 2100, level: '温暖使者', serviceCount: 35 },
        { name: '王大姐', avatar: '王', points: 1850, level: '温暖使者', serviceCount: 32 },
        { name: '赵大哥', avatar: '赵', points: 1200, level: '爱心志愿者', serviceCount: 20 },
        { name: '子女-小张', avatar: '张', points: 0, level: '爱心新人', serviceCount: 0 }
      ]
      wx.setStorageSync('loveRank', defaultRank)
      this.globalData.loveRank = defaultRank
    } else {
      this.globalData.loveRank = loveRank
    }
  },

  saveUserData() {
    wx.setStorageSync('userInfo', this.globalData.userInfo)
    wx.setStorageSync('token', this.globalData.token)
    wx.setStorageSync('role', this.globalData.role)
    wx.setStorageSync('assistAccounts', this.globalData.assistAccounts)
    wx.setStorageSync('parentAccounts', this.globalData.parentAccounts)
    wx.setStorageSync('orders', this.globalData.orders)
    wx.setStorageSync('pairCode', this.globalData.pairCode)
    wx.setStorageSync('lovePoints', this.globalData.lovePoints)
    wx.setStorageSync('volunteerServices', this.globalData.volunteerServices)
    wx.setStorageSync('loveRank', this.globalData.loveRank)
  },

  addLovePoints(points, serviceType) {
    this.globalData.lovePoints += points
    
    const userRank = this.globalData.loveRank.find(r => r.name === this.globalData.userInfo?.name)
    if (userRank) {
      userRank.points += points
      userRank.serviceCount += 1
      userRank.level = this.getLevel(userRank.points)
    }

    this.globalData.loveRank.sort((a, b) => b.points - a.points)
    
    this.saveUserData()
    
    const level = this.getLevel(this.globalData.lovePoints)
    wx.showToast({ 
      title: `+${points}爱心值，升级为${level}！`, 
      icon: 'success' 
    })
    
    return level
  },

  getLevel(points) {
    if (points >= 5000) return '爱心巨匠'
    if (points >= 3000) return '爱心大使'
    if (points >= 2000) return '温暖使者'
    if (points >= 1000) return '爱心志愿者'
    if (points >= 500) return '爱心新星'
    if (points >= 100) return '爱心小天使'
    return '爱心新人'
  },

  getPointsForService(type) {
    const service = this.globalData.volunteerServices.find(s => s.type === type)
    return service ? service.points : 50
  },

  login(userInfo, token) {
    this.globalData.userInfo = userInfo
    this.globalData.token = token
    this.globalData.isLogin = true
    this.saveUserData()
  },

  logout() {
    this.globalData.userInfo = null
    this.globalData.token = ''
    this.globalData.isLogin = false
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('assistAccounts')
    wx.removeStorageSync('orders')
  },

  addOrder(order) {
    this.globalData.orders.unshift(order)
    this.saveUserData()
  },

  updateOrder(orderId, updates) {
    const index = this.globalData.orders.findIndex(o => o.orderId === orderId)
    if (index !== -1) {
      this.globalData.orders[index] = { ...this.globalData.orders[index], ...updates }
      this.saveUserData()
    }
  },

  addAssistAccount(account) {
    if (!this.globalData.assistAccounts.find(a => a.phone === account.phone)) {
      this.globalData.assistAccounts.push(account)
      this.saveUserData()
    }
  },

  removeAssistAccount(phone) {
    this.globalData.assistAccounts = this.globalData.assistAccounts.filter(a => a.phone !== phone)
    this.saveUserData()
  },

  addParentAccount(account) {
    if (!this.globalData.parentAccounts.find(a => a.phone === account.phone)) {
      this.globalData.parentAccounts.push(account)
      this.saveUserData()
    }
  },

  removeParentAccount(phone) {
    this.globalData.parentAccounts = this.globalData.parentAccounts.filter(a => a.phone !== phone)
    this.saveUserData()
  },

  setRole(role) {
    this.globalData.role = role
    wx.setStorageSync('role', role)
  },

  generatePairCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    this.globalData.pairCode = code
    wx.setStorageSync('pairCode', code)
    return code
  },

  bindByPairCode(code) {
    if (code === this.globalData.pairCode) {
      return true
    }
    return false
  },

  startLocationSharing() {
    if (this._locationTimer) {
      clearInterval(this._locationTimer)
    }

    this.globalData.isLocationSharing = true

    const updateLocation = () => {
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 5000,
        timeout: 10000,
        success: (res) => {
          this.globalData.parentLocation = {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            time: Date.now()
          }
          // 上报位置到云数据库，子女端可跨设备获取
          if (this.globalData._cloudReady && wx.cloud) {
            try {
              var db = wx.cloud.database()
              var phone = this.globalData.userInfo ? this.globalData.userInfo.phone : ''
              if (phone) {
                db.collection('parent_locations').where({ phone: phone }).get({
                  success: function(existRes) {
                    try {
                      if (existRes.data.length > 0) {
                        db.collection('parent_locations').doc(existRes.data[0]._id).update({
                          data: {
                            latitude: res.latitude,
                            longitude: res.longitude,
                            accuracy: res.accuracy || 0,
                            updateTime: new Date()
                          }
                        })
                      } else {
                        db.collection('parent_locations').add({
                          data: {
                            phone: phone,
                            latitude: res.latitude,
                            longitude: res.longitude,
                            accuracy: res.accuracy || 0,
                            updateTime: new Date()
                          }
                        })
                      }
                    } catch (e) { /* 云操作失败静默 */ }
                  },
                  fail: function() { /* 云查询失败静默 */ }
                })
              }
            } catch (e) { /* 云初始化失败不影响本地功能 */ }
          }
        },
        fail: () => {
          console.error('位置共享获取失败')
        }
      })
    }

    updateLocation()

    this._locationTimer = setInterval(() => {
      try { updateLocation() } catch (e) { console.error('位置更新失败:', e) }
    }, 30000)
  },

  stopLocationSharing() {
    if (this._locationTimer) {
      clearInterval(this._locationTimer)
      this._locationTimer = null
    }
    this.globalData.isLocationSharing = false
  },

  getParentLocation() {
    return this.globalData.parentLocation
  },

  // 从云数据库获取父母位置（子女端跨设备使用，用手机号查询）
  getParentLocationFromCloud(parentPhone) {
    return new Promise((resolve, reject) => {
      if (!this.globalData._cloudReady || !wx.cloud) {
        reject(new Error('云开发未初始化'))
        return
      }
      try {
        // 如果没有指定手机号，查所有父母账号的位置
        var phone = parentPhone || ''
        var db = wx.cloud.database()
        var query = {}
        if (phone) {
          query.phone = phone
        } else {
          // 子女端：查所有已绑定的父母手机号
          var parentPhones = (this.globalData.parentAccounts || []).map(function(a) { return a.phone })
          if (parentPhones.length > 0) {
            query.phone = db.command.in(parentPhones)
          } else {
            reject(new Error('未绑定父母账号'))
            return
          }
        }
        db.collection('parent_locations').where(query).get({
          success: function(res) {
            if (res.data && res.data.length > 0) {
              var loc = res.data[0]
              resolve({
                latitude: loc.latitude,
                longitude: loc.longitude,
                address: loc.address || '',
                updateTime: loc.updateTime,
                accuracy: loc.accuracy || 0
              })
            } else {
              reject(new Error('暂无位置信息'))
            }
          },
          fail: function(err) {
            reject(err)
          }
        })
      } catch (e) {
        reject(e)
      }
    })
  },

  // ===== 行程异常检测与自动预警引擎 =====
  // 三维异常检测：偏航检测 + 停留异常 + 行程停滞
  // 检测到异常自动通知子女端，无需子女主动查看

  _anomalyTimer: null,
  _lastAnomalyLocation: null,
  _lastAnomalyTime: 0,
  _anomalyAlertedKeys: {},

  // 启动异常检测（行程开始时调用）
  startAnomalyDetection(tripData) {
    if (this._anomalyTimer) {
      clearInterval(this._anomalyTimer)
    }

    this._activeTrip = tripData
    this._lastAnomalyLocation = null
    this._lastAnomalyTime = 0
    this._anomalyAlertedKeys = {}

    // 每30秒检测一次
    this._anomalyTimer = setInterval(() => {
      try { this.checkTripAnomaly() } catch (e) { console.error('异常检测失败:', e) }
    }, 30000)

    console.log('行程异常检测已启动')
  },

  // 停止异常检测
  stopAnomalyDetection() {
    if (this._anomalyTimer) {
      clearInterval(this._anomalyTimer)
      this._anomalyTimer = null
    }
    this._activeTrip = null
    console.log('行程异常检测已停止')
  },

  // 异常检测主函数
  checkTripAnomaly() {
    if (!this._activeTrip || !this.globalData.parentLocation) return

    var loc = this.globalData.parentLocation
    var now = Date.now()
    var trip = this._activeTrip

    // 1. 偏航检测：当前坐标偏离预设路线
    if (trip.stationCoord) {
      var deviation = this._calcDistance(
        loc.latitude, loc.longitude,
        trip.stationCoord.lat, trip.stationCoord.lng
      )
      // 偏离预设路线超过2公里
      if (deviation > 2.0) {
        this._triggerAnomalyAlert('deviation', {
          deviation: deviation.toFixed(1),
          message: '检测到位置偏离路线' + deviation.toFixed(1) + '公里，可能走错路'
        })
      }
    }

    // 2. 停留异常：在同一非车站区域停留超过15分钟
    if (this._lastAnomalyLocation) {
      var moveDist = this._calcDistance(
        loc.latitude, loc.longitude,
        this._lastAnomalyLocation.latitude,
        this._lastAnomalyLocation.longitude
      )
      var timeDiff = (now - this._lastAnomalyTime) / 1000 / 60 // 分钟

      // 移动距离小于100米且超过15分钟 → 停留异常
      if (moveDist < 0.1 && timeDiff > 15) {
        // 排除在车站的情况（在车站停留是正常的）
        var isAtStation = false
        if (trip.stationCoord) {
          var distToStation = this._calcDistance(
            loc.latitude, loc.longitude,
            trip.stationCoord.lat, trip.stationCoord.lng
          )
          if (distToStation < 0.5) isAtStation = true
        }

        if (!isAtStation) {
          this._triggerAnomalyAlert('stay', {
            duration: Math.round(timeDiff),
            message: '在当前位置停留已超过' + Math.round(timeDiff) + '分钟，是否需要帮助？'
          })
        }
      } else if (moveDist > 0.5) {
        // 移动超过500米，重置停留计时
        this._lastAnomalyLocation = { latitude: loc.latitude, longitude: loc.longitude }
        this._lastAnomalyTime = now
      }
    } else {
      this._lastAnomalyLocation = { latitude: loc.latitude, longitude: loc.longitude }
      this._lastAnomalyTime = now
    }

    // 3. 行程停滞：应该在火车上但GPS显示在移动
    if (trip.expectedOnTrain && trip.trainStartTime) {
      var trainStartMin = this._timeStrToMin(trip.trainStartTime)
      var currentTimeMin = new Date().getHours() * 60 + new Date().getMinutes()
      // 发车后30分钟，如果GPS还在移动（不在火车上）
      if (currentTimeMin > trainStartMin + 30 && currentTimeMin < trainStartMin + 30 + 600) {
        if (this._lastAnomalyLocation && moveDist && moveDist > 0.5) {
          this._triggerAnomalyAlert('stagnation', {
            message: '您应该在' + trip.trainStartTime + '的火车上，但位置仍在移动，可能误车'
          })
        }
      }
    }
  },

  // 触发异常预警（去重：同一类型30分钟内只触发一次）
  _triggerAnomalyAlert(type, data) {
    var key = type + '_' + new Date().toISOString().split('T')[0] + '_' + Math.floor(Date.now() / 1800000)
    if (this._anomalyAlertedKeys[key]) return
    this._anomalyAlertedKeys[key] = true

    console.warn('行程异常预警:', type, data.message)

    // 写入全局数据，子女端可读取
    if (!this.globalData.tripAlerts) {
      this.globalData.tripAlerts = []
    }
    this.globalData.tripAlerts.push({
      type: type,
      message: data.message,
      time: Date.now(),
      location: this.globalData.parentLocation ? {
        lat: this.globalData.parentLocation.latitude,
        lng: this.globalData.parentLocation.longitude
      } : null
    })

    // 弹窗提醒老人（检查页面栈，避免页面切换时报错）
    var pages = getCurrentPages()
    if (!pages || pages.length === 0) return
    wx.showModal({
      title: '行程提醒',
      content: data.message + '\n\n是否需要联系子女？',
      confirmText: '联系子女',
      cancelText: '不用',
      success: (res) => {
        if (res.confirm) {
          this._notifyFamily(data)
        }
      }
    })
  },

  // 通知子女端
  _notifyFamily(data) {
    var assistAccounts = this.globalData.assistAccounts || []
    if (assistAccounts.length > 0) {
      var phone = assistAccounts[0].phone
      wx.makePhoneCall({
        phoneNumber: phone,
        fail: () => {
          wx.showToast({ title: '已复制电话号码', icon: 'success' })
          wx.setClipboardData({ data: phone })
        }
      })
    }
  },

  // Haversine距离计算（公里）
  _calcDistance(lat1, lng1, lat2, lng2) {
    var R = 6371
    var dLat = (lat2 - lat1) * Math.PI / 180
    var dLng = (lng2 - lng1) * Math.PI / 180
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  },

  // 时间字符串转分钟
  _timeStrToMin(str) {
    if (!str) return 0
    var m = str.match(/(\d{1,2}):(\d{2})/)
    if (m) return Number(m[1]) * 60 + Number(m[2])
    return 0
  },

  switchMode() {
    const newRole = this.globalData.role === 'elder' ? 'family' : 'elder'
    this.setRole(newRole)
    
    // 根据角色更新用户名
    const newName = newRole === 'elder' ? '张大爷' : '小张'
    this.globalData.userInfo.name = newName
    wx.setStorageSync('userInfo', this.globalData.userInfo)
    
    wx.reLaunch({
      url: '/pages/index/index'
    })
  }
})