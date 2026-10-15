// 视觉导航页 - 独立页面，不侵入其他业务代码
const visionService = require('../../services/vision-service.js')

Page({
  data: {
    tripContext: null,       // 从上游页面传进来的行程信息
    photoPath: '',           // 刚拍的照片临时路径
    loading: false,
    showAnswer: false,
    parsedAnswer: null,
    errorText: ''
  },

  onLoad(options) {
    // 接收参数两种方式：
    // 方式1：URL 上带 trip=encodeURIComponent(JSON.stringify({...}))
    // 方式2：传过来的是字符串，手动解析
    var ctx = null
    try {
      if (options && options.trip) {
        ctx = JSON.parse(decodeURIComponent(options.trip))
      }
    } catch (e) {
      ctx = null
    }
    // 方式3：从全局数据里读（如果其他页面有 setGlobal 存放当前行程）
    if (!ctx) {
      try {
        var app = getApp()
        if (app && app.globalData && app.globalData.currentTripContext) {
          ctx = app.globalData.currentTripContext
        }
      } catch (e2) {}
    }
    this.setData({ tripContext: ctx })
  },

  showError(text, duration) {
    var self = this
    self.setData({ errorText: text })
    setTimeout(function() {
      if (self.data.errorText === text) {
        self.setData({ errorText: '' })
      }
    }, duration || 2500)
  },

  // 拍照 + 问路 核心流程
  takePhotoAndAsk() {
    var self = this
    if (self.data.loading) return

    // 1. 直接调起后置摄像头拍照，不给老人选，减少操作
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      camera: 'back',
      sizeType: ['compressed'],
      success: function(res) {
        if (!res || !res.tempFiles || !res.tempFiles[0]) {
          self.showError('拍照失败，再试一次')
          return
        }
        var filePath = res.tempFiles[0].tempFilePath
        self.setData({ photoPath: filePath })

        // 2. 调用视觉服务（内部会压缩+base64+调大模型+解析）
        self.setData({ loading: true })
        wx.showLoading({ title: '正在问路...', mask: true })

        visionService.askVision(filePath, self.data.tripContext).then(function(parsed) {
          wx.hideLoading()
          self.setData({
            loading: false,
            showAnswer: true,
            parsedAnswer: parsed
          })
          // 3. 自动播报
          visionService.speakAnswer(parsed).catch(function() {})
        }).catch(function(err) {
          wx.hideLoading()
          self.setData({ loading: false })
          console.error('问路失败:', err)

          // 4. 超时或失败 → 走 GPS 兜底
          var msg = (err && err.message) ? err.message : '问路失败'
          if (msg.indexOf('超时') >= 0) {
            wx.showModal({
              title: 'AI有点慢',
              content: '是否改用 GPS 地图导航给您指路？',
              confirmText: '用地图',
              cancelText: '再试一次',
              confirmColor: '#FF8C42',
              success: function(r) {
                if (r.confirm) {
                  self.openMapFallback()
                } else {
                  self.takePhotoAndAsk()
                }
              }
            })
          } else if (msg.indexOf('API Key') >= 0) {
            self.showError('还没开通 AI 问路服务，请先联系管理员配置')
          } else {
            self.showError('问路过出错：' + msg)
          }
        })
      },
      fail: function() {
        // 用户取消或摄像头失败
        self.showError('没拍成功，再点一下按钮试试')
      }
    })
  },

  // 重新播报
  replayAnswer() {
    var self = this
    if (!self.data.parsedAnswer) return
    wx.showToast({ title: '正在播报', icon: 'none', duration: 1000 })
    visionService.speakAnswer(self.data.parsedAnswer).catch(function(err) {
      console.error('播报失败', err)
    })
  },

  // GPS 兜底：打开高德/微信地图导航
  openMapFallback() {
    var self = this
    self.setData({ showAnswer: false })
    var ctx = self.data.tripContext || {}
    var lat = Number(ctx.targetLat)
    var lng = Number(ctx.targetLng)
    var name = ctx.to || ctx.targetName || '目标位置'
    var addr = ctx.address || name

    if (lat && lng) {
      wx.openLocation({
        latitude: lat,
        longitude: lng,
        name: name,
        address: addr,
        scale: 18,
        fail: function() {
          self.showError('暂时打不开地图，请检查定位权限')
        }
      })
    } else {
      // 没有坐标的话，至少打开地图选点
      wx.chooseLocation({
        success: function(r) {
          wx.openLocation({
            latitude: r.latitude,
            longitude: r.longitude,
            name: r.name,
            address: r.address,
            scale: 18
          })
        },
        fail: function() {
          self.showError('需要定位权限才能用地图导航')
        }
      })
    }
  },

  // 关闭弹窗
  closeAnswer() {
    this.setData({ showAnswer: false })
  },
  stopBubble() {
    // 阻止弹窗内点击穿透
  }
})
