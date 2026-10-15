// 实时视频导航页 - 独立页面，定时截帧送给视觉AI
const visionService = require('../../services/vision-service.js')

Page({
  data: {
    tripContext: null,
    isStreaming: false,
    isAnalyzing: false,
    lastAnswer: null,
    statusMsg: '',
    errorMsg: ''
  },

  _cameraFrameTimer: null,
  _lastAnalyzeTime: 0,
  _isAnalyzing: false,
  _cameraContext: null,
  _photoTimeoutTimer: null,

  onLoad(options) {
    try {
      if (options && options.trip) {
        var ctx = JSON.parse(decodeURIComponent(options.trip))
        this.setData({ tripContext: ctx })
      }
    } catch (e) {
      try {
        var app = getApp()
        if (app && app.globalData && app.globalData.currentTripContext) {
          this.setData({ tripContext: app.globalData.currentTripContext })
        }
      } catch (e2) {}
    }
  },

  onUnload() {
    this.stopStreaming()
  },

  onHide() {
    this.stopStreaming()
  },

  onCameraError(e) {
    console.error('[视觉导航] 摄像头错误:', e)
    this.setData({ errorMsg: '摄像头启动失败，请检查权限' })
  },

  toggleStreaming() {
    if (this.data.isStreaming) {
      this.stopStreaming()
    } else {
      this.startStreaming()
    }
  },

  startStreaming() {
    var self = this
    if (self.data.isStreaming) return

    self.setData({ isStreaming: true, lastAnswer: null, errorMsg: '', statusMsg: '正在启动摄像头...' })

    // 延迟创建context，确保camera组件初始化完成
    setTimeout(function() {
      if (!self.data.isStreaming) return

      self._cameraContext = wx.createCameraContext()
      self._lastAnalyzeTime = 0
      self._cameraInitRetries = 0

      console.log('[视觉导航] camera context已创建')
      self.setData({ statusMsg: '摄像头启动中...' })

      // 测试一次截帧确认摄像头可用
      self._testCameraAndStart()
    }, 2000)
  },

  // 测试摄像头，成功后开始定时截帧
  _testCameraAndStart() {
    var self = this
    if (!self.data.isStreaming) return

    var tryTest = function() {
      self._cameraContext.takePhoto({
        quality: 'compressed',
        success: function(res) {
          if (res && res.tempImagePath) {
            console.log('[视觉导航] 摄像头测试成功, 开始定时截帧')
            self.setData({ statusMsg: '摄像头已就绪' })
            // 立即截一帧，然后每4秒截一帧
            self.scheduleCapture()
            self._cameraFrameTimer = setInterval(function() {
              self.scheduleCapture()
            }, 4000)
          } else {
            self._retryCameraInit()
          }
        },
        fail: function(err) {
          console.warn('[视觉导航] 摄像头测试失败:', err)
          self._retryCameraInit()
        }
      })
    }
    tryTest()
  },

  _retryCameraInit() {
    var self = this
    self._cameraInitRetries = (self._cameraInitRetries || 0) + 1
    if (self._cameraInitRetries > 5) {
      console.error('[视觉导航] 摄像头初始化失败，已重试5次')
      self.setData({ errorMsg: '摄像头启动失败，请检查权限后重试', statusMsg: '' })
      self.stopStreaming()
      return
    }
    console.log('[视觉导航] 摄像头初始化重试 ' + self._cameraInitRetries + '/5')
    self.setData({ statusMsg: '摄像头启动中... (' + self._cameraInitRetries + '/5)' })
    setTimeout(function() {
      if (self.data.isStreaming) self._testCameraAndStart()
    }, 1000)
  },

  scheduleCapture() {
    var self = this
    if (!self.data.isStreaming) return
    if (self._isAnalyzing) return
    if (!self._cameraContext) return

    var now = Date.now()
    if (now - self._lastAnalyzeTime < 3500) return

    self._isAnalyzing = true
    self.setData({ isAnalyzing: true, errorMsg: '', statusMsg: '正在识别画面...' })

    // 5秒超时保护：如果takePhoto没回调就跳过这次
    var timeoutId = setTimeout(function() {
      if (self._isAnalyzing) {
        console.warn('[视觉导航] takePhoto超时，跳过本次')
        self._isAnalyzing = false
        self.setData({ isAnalyzing: false, statusMsg: '' })
      }
    }, 5000)

    self._cameraContext.takePhoto({
      quality: 'compressed',
      success: function(photoRes) {
        clearTimeout(timeoutId)
        if (!self._isAnalyzing) return

        if (!photoRes || !photoRes.tempImagePath) {
          console.warn('[视觉导航] takePhoto返回空路径')
          self._isAnalyzing = false
          self.setData({ isAnalyzing: false })
          return
        }
        console.log('[视觉导航] 截帧成功:', photoRes.tempImagePath)
        self.analyzeFrame(photoRes.tempImagePath, now)
      },
      fail: function(err) {
        clearTimeout(timeoutId)
        console.warn('[视觉导航] takePhoto失败:', err)
        self._isAnalyzing = false
        self.setData({ isAnalyzing: false, statusMsg: '' })
      }
    })
  },

  stopStreaming() {
    if (this._cameraFrameTimer) {
      clearInterval(this._cameraFrameTimer)
      this._cameraFrameTimer = null
    }
    if (this._photoTimeoutTimer) {
      clearTimeout(this._photoTimeoutTimer)
      this._photoTimeoutTimer = null
    }
    this._cameraContext = null
    this._isAnalyzing = false
    this.setData({ isStreaming: false, isAnalyzing: false, statusMsg: '', errorMsg: '' })
  },

  analyzeFrame(imagePath, timestamp) {
    var self = this
    if (!imagePath) {
      console.warn('[视觉导航] imagePath为空')
      self._isAnalyzing = false
      self.setData({ isAnalyzing: false })
      return
    }

    console.log('[视觉导航] 开始分析, imagePath:', imagePath)
    self.setData({ statusMsg: '正在压缩图片...' })

    visionService.compressAndToBase64(imagePath).then(function(imgData) {
      console.log('[视觉导航] 图片压缩完成, base64长度:', imgData.base64 ? imgData.base64.length : 0, 'mime:', imgData.mimeType)
      if (!imgData.base64 || imgData.base64.length < 100) {
        throw new Error('图片数据为空或太短')
      }
      self.setData({ statusMsg: 'AI正在分析...' })
      console.log('[视觉导航] 调用视觉模型...')
      return visionService.callVisionModel(imgData, self.data.tripContext)
    }).then(function(rawText) {
      console.log('[视觉导航] AI返回成功, 长度:', rawText ? rawText.length : 0)
      console.log('[视觉导航] AI前200字:', rawText ? rawText.substring(0, 200) : '空')
      if (!rawText) throw new Error('AI返回为空')
      self.setData({ statusMsg: '正在整理回答...' })
      return visionService.parseVisionAnswer(rawText)
    }).then(function(parsed) {
      self._lastAnalyzeTime = timestamp
      self._isAnalyzing = false
      self.setData({ isAnalyzing: false, lastAnswer: parsed, statusMsg: '' })
      console.log('[视觉导航] 解析完成, sections:', parsed.sections ? parsed.sections.length : 0, 'unclear:', parsed.unclear)

      // 自动播报 - 失败时显示文字提示
      var speechText = visionService.answerToSpeechText(parsed)
      console.log('[视觉导航] 准备播报:', speechText ? speechText.substring(0, 80) : '空')
      if (speechText) {
        visionService.speakAnswer(parsed).then(function() {
          console.log('[视觉导航] 播报完成')
        }).catch(function(e) {
          console.warn('[视觉导航] TTS播报失败:', e && e.message)
          self.setData({ errorMsg: '语音播报失败，请看屏幕文字' })
          // 尝试直接播放百度TTS
          visionService.textToSpeech(speechText).then(function(path) {
            var audio = wx.createInnerAudioContext()
            audio.obeyMuteSwitch = false
            audio.src = path
            audio.onError(function(err) { console.warn('[视觉导航] 音频播放错误:', err) })
            audio.play()
          }).catch(function(e2) {
            console.warn('[视觉导航] 备用TTS也失败:', e2 && e2.message)
          })
        })
      }
    }).catch(function(err) {
      var msg = err && err.message ? err.message : ('' + err)
      console.error('[视觉导航] 分析失败:', msg)
      self._isAnalyzing = false
      self.setData({ isAnalyzing: false, statusMsg: '', errorMsg: '分析失败: ' + msg.substring(0, 80) })
    })
  },

  pickFromAlbum() {
    var self = this
    if (self._isAnalyzing) {
      wx.showToast({ title: '正在分析中，请稍等', icon: 'none' })
      return
    }
    console.log('[视觉导航] 打开相册选图')
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        console.log('[视觉导航] 选图成功:', res)
        if (res && res.tempFilePaths && res.tempFilePaths[0]) {
          self._isAnalyzing = true
          self.setData({ isAnalyzing: true, errorMsg: '', statusMsg: '正在分析选中的图片...' })
          self.analyzeFrame(res.tempFilePaths[0], Date.now())
        }
      },
      fail: function(err) {
        console.warn('[视觉导航] 选图失败:', err)
        wx.showToast({ title: '选图取消或失败', icon: 'none' })
      }
    })
  },

  goBack() {
    this.stopStreaming()
    wx.navigateBack({ delta: 1, fail: function() {
      wx.switchTab({ url: '/pages/index/index' })
    }})
  }
})
