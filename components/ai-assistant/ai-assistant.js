const app = getApp()
const asrService = require('../../services/baidu-asr.js')
const aiService = require('../../services/ai-service.js')
const ttsService = require('../../services/baidu-tts.js')

const recorderManager = wx.getRecorderManager()
let isRecorderReady = false
let _cardAutoHideTimer = null
// 当前活跃的组件实例指针（recorderManager 是全局单例，回调只注册一次，
// 用此指针确保回调里的 this 指向当前正在录音的页面组件，而非第一个注册的页面）
let _activeInstance = null
// VAD 静音检测参数
const VAD_SILENCE_THRESHOLD = 55   // 音量阈值（0-255，低于此值视为静音，适当提高避免环境噪音误判）
const VAD_SILENCE_MS = 600         // 连续静音超过多少毫秒就认为说完了（0.6秒，更及时）
const VAD_MIN_SPEAK_MS = 500       // 至少说这么久才算有效语音（0.5秒，避免刚开口就断）
const RECORD_MAX_MS = 20000        // 单次录音最长 20 秒兜底
const VAD_GRACE_MS = 600           // 录音启动后前 600ms 不做 VAD 检测，避免 TTS 回声被误判为用户说话

// Promise超时工具
function withAITimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('AI调用超时(' + ms + 'ms)')) }, ms)
    })
  ])
}
// 合并两个对象（b覆盖a的重复键）
function mergeObjects(a, b) {
  var result = {}
  if (a) for (var k in a) result[k] = a[k]
  if (b) for (var k in b) result[k] = b[k]
  return result
}

Component({
  properties: {
    aiEnabled: {
      type: Boolean,
      value: false
    }
  },

  data: {
    ballLeft: 650,
    ballTop: 400,
    isDragging: false,
    isWorking: false,      // 整个对话是否处于开启状态
    // idle | listening | thinking | speaking
    workStatus: 'idle',
    replyText: '',
    userText: '',
    statusTip: '',
    showCard: false,
    cardStyle: ''
  },

  lifetimes: {
    attached() {
      this._chatHistory = []
      this._isRecording = false
      this._timers = []
      this._resumeHandled = false
      this._vadReset()
      this._initRecorder()
      try {
        var winInfo = wx.getWindowInfo()
        var ratio = 750 / winInfo.windowWidth
        var left = 750 - 120 - 24
        var top = winInfo.windowHeight * ratio - 120 - 220
        this.setData({ ballLeft: left, ballTop: top })
        this._updateCardPosition(left, top)
      } catch (e) {}
    },
    detached() {
      this._clearAllTimers()
      this._endSession()
      // 组件销毁时清理全局活跃实例指针
      if (_activeInstance === this) _activeInstance = null
    }
  },

  pageLifetimes: {
    show() {
      this._updateCardPosition(this.data.ballLeft, this.data.ballTop)
      // 先检查AI主动跳转的恢复
      this._checkAutoResume()
      // 自动播报页面操作指南（_checkAutoResume 已处理则跳过）
      var that = this
      this._addTimer(function() {
        that._autoAnnouncePage()
      }, 300)
    }
  },

  methods: {
    // 检查并执行自动恢复会话（页面跳转后）
    _checkAutoResume() {
      if (!app.globalData.aiAutoResume) return
      app.globalData.aiAutoResume = false
      this._resumeHandled = true  // 标记此次由 _checkAutoResume 处理，避免 _autoAnnouncePage 重复
      var guideText = app.globalData.aiAutoResumeGuide || ''
      var savedHistory = app.globalData.aiAutoResumeHistory || []
      app.globalData.aiAutoResumeGuide = ''
      app.globalData.aiAutoResumeHistory = null

      var that = this
      this._addTimer(function() {
        // 恢复会话
        that._chatHistory = savedHistory
        that.setData({
          isWorking: true,
          workStatus: 'speaking',
          replyText: '',
          userText: ''
        })
        that._showCard()
        try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
        if (guideText) {
          that.setData({ replyText: guideText })
          ttsService.playQueue([guideText]).then(function() {
            if (that.data.isWorking) that._startListening()
          }).catch(function() {
            if (that.data.isWorking) that._startListening()
          })
        } else {
          that._startListening()
        }
      }, 300) // 等页面渲染完成
    },

    // 定时器管理方法
    _addTimer(fn, delay) {
      var id = setTimeout(fn, delay)
      this._timers.push(id)
      return id
    },
    _clearAllTimers() {
      if (this._timers) {
        this._timers.forEach(function(id) { clearTimeout(id) })
        this._timers = []
      }
    },

    _vadReset() {
      this._vadSilenceStartTs = 0
      this._vadFirstSpeakTs = 0
      this._vadHasSpoken = false
      this._vadStartTs = 0
    },

    _initRecorder() {
      if (isRecorderReady) return
      isRecorderReady = true

      // 帧级别回调（用于 VAD 静音检测），必须在 start 时指定 frameSize
      recorderManager.onFrameRecorded((res) => {
        const self = _activeInstance
        if (!self || !self._isRecording) return
        // 检查互斥标志：首页大麦克风录音时AI助手暂停
        if (app.globalData.aiPausedByMainMic) {
          console.log('[AI助手] 检测到大麦克风录音，停止AI录音')
          self._isRecording = false
          try { recorderManager.stop() } catch (e) {}
          self._vadReset()
          return
        }
        // VAD 宽限期：录音刚启动时跳过 TTS 回声
        var nowTs = Date.now()
        if (self._vadStartTs && nowTs < self._vadStartTs) return
        const frameBuffer = res.frameBuffer
        if (!frameBuffer || frameBuffer.byteLength < 2) return
        // 计算当前帧 RMS 音量（16bit PCM 小端）
        const view = new Int16Array(frameBuffer)
        let sumSq = 0
        const step = Math.max(1, Math.floor(view.length / 128))
        for (let i = 0; i < view.length; i += step) {
          const s = view[i]
          sumSq += s * s
        }
        const rms = Math.sqrt(sumSq / (view.length / step))
        // 映射到 0-255
        const volume = Math.min(255, Math.round((rms / 32768) * 255 * 4))
        if (volume > VAD_SILENCE_THRESHOLD) {
          // 有声音
          if (!self._vadHasSpoken) {
            self._vadHasSpoken = true
            self._vadFirstSpeakTs = nowTs
          }
          self._vadSilenceStartTs = 0
        } else {
          // 静音
          if (self._vadHasSpoken) {
            if (!self._vadSilenceStartTs) {
              self._vadSilenceStartTs = nowTs
            } else if (nowTs - self._vadSilenceStartTs >= VAD_SILENCE_MS) {
              // 连续静音超过阈值 → 说完了，自动停止
              console.log('[VAD] 检测到静音结束，停止录音，已静音', nowTs - self._vadSilenceStartTs, 'ms')
              self._stopRecording(true)
            }
          }
        }
      })

      recorderManager.onStop((res) => {
        const self = _activeInstance
        console.log('[AI助手] 录音结束:', res.tempFilePath, '时长:', res.duration, '会话中:', self ? self.data.isWorking : '无实例')
        if (!self) return
        self._isRecording = false
        if (res.duration > 500) {
          // 有有效录音：无论会话是否已关闭，都执行识别并回填表单
          self._recognizeAndReply(res.tempFilePath)
        } else if (self.data.isWorking) {
          // 太短，对话还开着 → 重新监听
          self._setIdle('没听到，您再说一遍')
          self._addTimer(function() { self._startListening() }, 1000)
        } else {
          // 手动关闭且录音太短，清理实例
          _activeInstance = null
        }
      })

      recorderManager.onError((err) => {
        console.error('[AI助手] 录音错误:', err)
        const self = _activeInstance
        if (!self) return
        self._isRecording = false
        if (self.data.isWorking) {
          self._setIdle('录音失败，请检查麦克风权限')
          self._addTimer(function() { self._startListening() }, 1500)
        } else {
          self._setIdle('录音失败，请检查麦克风权限')
        }
      })
    },

    _updateCardPosition(ballLeft, ballTop) {
      var cardW = 460
      var cardH = 260
      var left = ballLeft + 60 - cardW / 2
      if (left < 20) left = 20
      if (left + cardW > 730) left = 730 - cardW
      var top = ballTop - cardH - 30
      var style = 'left:' + left + 'rpx;top:' + top + 'rpx;width:' + cardW + 'rpx;'
      this.setData({ cardStyle: style })
    },

    _setIdle(tip) {
      this.setData({
        workStatus: 'idle',
        statusTip: tip || ''
      })
      if (tip) {
        this._showCard()
        if (!this.data.isWorking) this._resetAutoHide(6000)
      }
    },

    _showCard() {
      this._clearAutoHideTimer()
      this._updateCardPosition(this.data.ballLeft, this.data.ballTop)
      this.setData({ showCard: true })
      // 对话关闭状态才用自动隐藏；开着的时候一直显示，方便老人看
      if (!this.data.isWorking) this._resetAutoHide(8000)
    },

    closeCard() {
      this._clearAutoHideTimer()
      this.setData({
        showCard: false,
        replyText: '',
        userText: '',
        statusTip: ''
      })
    },

    _clearAutoHideTimer() {
      if (_cardAutoHideTimer) {
        clearTimeout(_cardAutoHideTimer)
        _cardAutoHideTimer = null
      }
    },

    _resetAutoHide(ms) {
      this._clearAutoHideTimer()
      var that = this
      _cardAutoHideTimer = this._addTimer(function() {
        that.closeCard()
      }, ms || 10000)
    },

    onBallTouchStart(e) {
      this.startX = e.touches[0].clientX
      this.startY = e.touches[0].clientY
      this.ballStartLeft = this.data.ballLeft
      this.ballStartTop = this.data.ballTop
      this.setData({ isDragging: false })
    },

    onBallTouchMove(e) {
      const dx = e.touches[0].clientX - this.startX
      const dy = e.touches[0].clientY - this.startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.setData({ isDragging: true })
      }
      const windowInfo = wx.getWindowInfo()
      const ratio = 750 / windowInfo.windowWidth
      const newLeft = Math.max(0, Math.min(750 - 120, this.ballStartLeft + dx * ratio))
      const newTop = Math.max(80, Math.min(windowInfo.windowHeight * ratio - 220, this.ballStartTop + dy * ratio))
      this.setData({ ballLeft: newLeft, ballTop: newTop })
      this._updateCardPosition(newLeft, newTop)
    },

    onBallTouchEnd() {
      const wasDragging = this.data.isDragging
      var that = this
      this._addTimer(function() { that.setData({ isDragging: false }) }, 100)
      if (wasDragging) return

      // 核心：点击悬浮球 = 开启/关闭整个对话会话
      if (!this.data.isWorking) {
        // 没开 → 开启会话 → 先TTS播一句欢迎+引导 → 自动开始监听
        this._startSession()
      } else {
        // 已开 → 结束整个会话
        this._endSession()
      }
    },

    // ========== 持续对话模式 ==========
    _startSession() {
      this._chatHistory = []
      this._vadReset()
      ttsService.stopPlay()

      this.setData({
        isWorking: true,
        workStatus: 'speaking',
        replyText: '',
        userText: ''
      })
      this._showCard()
      try { wx.vibrateShort({ type: 'light' }) } catch (e) {}

      // 启动会话超时
      this._resetSessionTimeout()

      var ctx = this._buildPageContext()
      // 手动点击：如果此页面已经播报过欢迎语，只说短提示，不再重复长引导
      var greeting = ''
      if (app.globalData.aiLastAnnouncedPage === ctx.page) {
        greeting = '我在，请说'
      } else {
        greeting = this._buildPageGreeting()
      }
      app.globalData.aiLastAnnouncedPage = ctx.page

      this.setData({ replyText: greeting })
      var that = this
      ttsService.playQueue([greeting]).then(function() {
        // 播报完 → 自动开始监听下一句
        that._startListening()
      }).catch(function() {
        that._startListening()
      })
    },

    // 根据当前页面生成操作引导语
    _buildPageGreeting() {
      var ctx = this._buildPageContext()
      var role = app.globalData.role || 'elder'
      var isFamily = role === 'family'
      var locWord = isFamily ? '您父母的位置' : '您现在的位置'
      var hint = '需要帮助时，点一下我就能说话'
      var greeting = '我是您的语音助手，' + hint
      if (ctx.page === 'index')         greeting = '我是您的语音助手，想坐车、打车、查行程，直接跟我说就行'
      else if (ctx.page === 'ticket')   greeting = '您在买票页。出发地已经帮您定位好了，您只要说去哪、哪天走，我帮您填，然后点底部蓝色按钮就能查车次'
      else if (ctx.page === 'taxi')     greeting = '您在打车页。上方是' + locWord + '，您只要说去哪，我帮您填好目的地，然后点底部红色按钮就能叫车'
      else if (ctx.page === 'orders')   greeting = '您在行程页。这里能看到您订过的所有行程。' + hint
      else if (ctx.page === 'map-trip') greeting = '您在行程规划页。告诉我从哪到哪、几点走，我帮您填好，点底部按钮就能看到多种出行方案'
      else if (ctx.page === 'trip-monitor') greeting = '您在行程监控页。' + hint + '，可以问我"爸妈到哪了"，或者说"联系爸妈"'
      else if (ctx.page === 'address')  greeting = '您在地址管理页。这里能保存家里、医院、车站这些常用地址，下次用直接选，不用再输入。' + hint
      else if (ctx.page === 'profile')  greeting = '您在个人中心。这里能看您的信息、绑定的账号、常去地址。' + hint
      else if (ctx.page === 'passenger') greeting = '您在乘客信息页。这里填坐车人的姓名和身份证，填一次以后就不用再填了。' + hint
      else if (ctx.page === 'child')    greeting = '您在子女端首页。这里能看爸妈现在的位置和行程，也能帮他们订票叫车。' + hint
      else if (ctx.page === 'child-trips') greeting = '您在长辈行程页。这里能看到爸妈的出行记录，有异常会自动提醒您。' + hint
      else if (ctx.page === 'child-plan') greeting = '您在帮订行程页。帮长辈买票或打车，告诉我去哪、哪天走就行。' + hint
      else if (ctx.page === 'volunteer') greeting = '您在志愿者帮助页。这里能联系到志愿者，出行遇到困难可以求助。' + hint
      else greeting = '您在' + (ctx.title || '当前页面') + '。' + hint

      return greeting
    },

    // 自动播报页面操作指南（每次进入新页面时触发）
    _autoAnnouncePage() {
      // 如果是AI主动跳转的恢复，跳过（由 _checkAutoResume 处理）
      if (this._resumeHandled) {
        this._resumeHandled = false
        return
      }
      // AI助手功能禁用时不播报
      if (!app.globalData.aiAssistantEnabled) return

      var ctx = this._buildPageContext()

      // 首页欢迎语：只播报一次，永久去重
      if (ctx.page === 'index' || ctx.page === 'pages/index/index') {
        if (app.globalData.aiHomeAnnounced) {
          console.log('[AI助手] 首页欢迎语已播报过，跳过')
          return
        }
        app.globalData.aiHomeAnnounced = true
      }

      // 其他页面：2秒内去重（防止生命周期重复触发），超过2秒允许重新播报
      var now = Date.now()
      if (app.globalData.aiLastAnnouncedPage === ctx.page && app.globalData.aiLastAnnouncedTs && (now - app.globalData.aiLastAnnouncedTs < 2000)) return
      app.globalData.aiLastAnnouncedPage = ctx.page
      app.globalData.aiLastAnnouncedTs = now

      var greeting = this._buildPageGreeting()

      // 只有票务页和打车页自动启动录音，其他页面只播报欢迎语
      var allowAutoListen = (ctx.page === 'ticket' || ctx.page === 'taxi')
      if (!allowAutoListen) {
        app.globalData.aiPageListenDisabled = true
      } else {
        app.globalData.aiPageListenDisabled = false
      }

      // 开启会话并播报页面引导
      this._chatHistory = []
      this._vadReset()
      ttsService.stopPlay()

      this.setData({
        isWorking: true,
        workStatus: 'speaking',
        replyText: greeting,
        userText: ''
      })
      this._showCard()
      try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
      this._resetSessionTimeout()

      var that = this
      ttsService.playQueue([greeting]).then(function() {
        // 只有票务页和打车页自动监听，其他页面只播报欢迎语后结束会话
        if (app.globalData.aiPageListenDisabled) {
          console.log('[AI助手] 当前页面只播报不监听，结束会话')
          that._endSession()
        } else if (that.data.isWorking) {
          that._startListening()
        }
      }).catch(function() {
        if (app.globalData.aiPageListenDisabled) {
          that._endSession()
        } else if (that.data.isWorking) {
          that._startListening()
        }
      })
    },

    _endSession() {
      this._clearAutoHideTimer()
      this._clearSessionTimeout()
      // 手动关闭会话：如果正在录音，先停止录音让 onStop 回调能识别回填
      // 注意：不清 _activeInstance，让 onStop 回调能找到本实例完成识别
      if (this._isRecording) {
        this._isRecording = false
        try { recorderManager.stop() } catch (e) {}
      } else {
        // 没在录音，可以直接清理
        if (_activeInstance === this) _activeInstance = null
      }
      ttsService.stopPlay()
      this._vadReset()
      this.setData({
        isWorking: false,
        workStatus: 'idle',
        replyText: '',
        userText: '',
        statusTip: '',
        showCard: false
      })
      try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    },

    _startListening() {
      if (!this.data.isWorking) return
      // 检查互斥标志：首页大麦克风录音时AI助手暂停
      if (app.globalData.aiPausedByMainMic) return
      this._vadReset()
      this._resetSessionTimeout()
      this.setData({
        workStatus: 'listening',
        replyText: '',
        userText: '',
        statusTip: '正在录音，请说话…'
      })
      this._showCard()
      this._startRecording()
    },

    _startRecording() {
      if (this._isRecording) return
      // 检查互斥标志：首页大麦克风录音时AI助手暂停
      if (app.globalData.aiPausedByMainMic) return
      // 每次开始录音前重新注册 onStop/onError 回调
      // 因为页面的大麦克风 initRecorder() 会覆盖全局 recorderManager 的回调
      this._registerRecorderCallbacks()
      this._isRecording = true
      _activeInstance = this  // 记录当前活跃实例，确保全局回调能找到正确的组件
      this._vadStartTs = Date.now() + VAD_GRACE_MS  // VAD 宽限期：避免 TTS 回声被误判
      recorderManager.start({
        duration: RECORD_MAX_MS,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'pcm',
        frameSize: 4        // 每 4ms 一帧，用于 VAD
      })
    },

    // 重新注册录音器回调（覆盖页面大麦克风的回调）
    _registerRecorderCallbacks() {
      recorderManager.onFrameRecorded((res) => {
        const self = _activeInstance
        if (!self || !self._isRecording) return
        if (app.globalData.aiPausedByMainMic) {
          console.log('[AI助手] 检测到大麦克风录音，停止AI录音')
          self._isRecording = false
          try { recorderManager.stop() } catch (e) {}
          self._vadReset()
          return
        }
        // VAD 宽限期：录音刚启动时跳过 TTS 回声
        var now = Date.now()
        if (self._vadStartTs && now < self._vadStartTs) return
        if (!res || !res.frameBuffer) return

        var volume = 0
        var buf = res.frameBuffer
        if (buf && buf.byteLength) {
          var dataView = new DataView(buf)
          var sum = 0
          var count = Math.min(dataView.byteLength, 160)
          for (var i = 0; i < count; i += 2) {
            var sample = dataView.getInt16(i, true)
            sum += Math.abs(sample)
          }
          volume = Math.floor(sum / (count / 2))
        }

        var now = Date.now()
        if (volume > VAD_SILENCE_THRESHOLD) {
          if (!self._vadHasSpoken) {
            self._vadHasSpoken = true
            self._vadFirstSpeakTs = now
          }
          self._vadSilenceStartTs = 0
        } else {
          if (self._vadHasSpoken) {
            if (!self._vadSilenceStartTs) {
              self._vadSilenceStartTs = now
            } else if (now - self._vadSilenceStartTs >= VAD_SILENCE_MS) {
              console.log('[VAD] 检测到静音结束，停止录音，已静音', now - self._vadSilenceStartTs, 'ms')
              self._stopRecording(true)
            }
          }
        }
      })

      recorderManager.onStop((res) => {
        const self = _activeInstance
        console.log('[AI助手] 录音结束:', res.tempFilePath, '时长:', res.duration, '会话中:', self ? self.data.isWorking : '无实例')
        if (!self) return
        self._isRecording = false
        if (res.duration > 500) {
          // 有有效录音：无论会话是否已关闭，都执行识别并回填表单
          self._recognizeAndReply(res.tempFilePath)
        } else if (self.data.isWorking) {
          self._setIdle('没听到，您再说一遍')
          self._addTimer(function() { self._startListening() }, 1000)
        } else {
          _activeInstance = null
        }
      })

      recorderManager.onError((err) => {
        console.error('[AI助手] 录音错误:', err)
        const self = _activeInstance
        if (!self) return
        self._isRecording = false
        if (self.data.isWorking) {
          self._setIdle('录音失败，请检查麦克风权限')
          self._addTimer(function() { self._startListening() }, 1500)
        } else {
          self._setIdle('录音失败，请检查麦克风权限')
        }
      })
    },

    _stopRecording(byVad) {
      if (!this._isRecording) return
      // 如果是 VAD 触发的，保证至少说了最短时间
      if (byVad && this._vadHasSpoken && this._vadFirstSpeakTs) {
        const spoken = Date.now() - this._vadFirstSpeakTs
        if (spoken < VAD_MIN_SPEAK_MS) return  // 说太短，继续等
      }
      this._isRecording = false
      try { recorderManager.stop() } catch (e) {}
      this.setData({ workStatus: 'thinking', statusTip: '正在识别…' })
    },

    // 强制停止AI录音（供首页大麦克风互斥调用）
    forceStopRecording() {
      if (!this._isRecording) return
      this._isRecording = false
      try { recorderManager.stop() } catch (e) {}
      this._vadReset()
    },

    // 语音识别 + AI回复 + TTS → 播完自动继续听（或任务完成自动结束）
    // 核心策略：ASR一出来立即本地NLP填表单（0延迟），AI回复异步获取后只更新播报
    async _recognizeAndReply(audioFilePath) {
      this.setData({ workStatus: 'thinking', statusTip: '正在识别…', userText: '' })
      this._resetSessionTimeout()

      try {
        // 第1步：ASR语音识别
        console.log('[AI助手] 开始ASR识别')
        var asrResult = await asrService.recognizeSpeech(audioFilePath)
        var userText = (asrResult && asrResult.text) || ''
        console.log('[AI助手] ASR识别结果:', userText)

        if (!userText) {
          this._replyAndContinue('没听清，请再说一遍', false, null, '')
          return
        }

        this.setData({ userText: userText, statusTip: '正在处理…' })
        var ctx = this._buildPageContext()

        // 第2步：立即本地NLP提取实体填表单（0网络延迟，瞬间回填）
        var localResult = this._localNLPFallback(userText, ctx)
        var hasLocalFill = localResult.fillFields && Object.keys(localResult.fillFields).length > 0
        if (hasLocalFill) {
          console.log('[AI助手] 快速本地回填表单:', JSON.stringify(localResult.fillFields))
          this._dispatchFillFields(localResult.fillFields)
          this.setData({ statusTip: '已为您填入信息' })
          try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
        }

        // 本地检测到操作指令或信息查询时，跳过AI请求，直接执行
        var localTriggerAction = localResult.triggerAction || ''
        var localInfoReply = localResult.reply || ''

        // 第3步：请求DashScope AI获取更自然回复（8秒超时，不阻塞回填）
        var replyText = hasLocalFill ? '好的，我帮您填好了' : '好的，我记下了'
        var taskComplete = false
        var fillFields = hasLocalFill ? localResult.fillFields : null
        var triggerAction = ''

        // 本地已检测到操作指令或信息查询，跳过AI请求
        if (localTriggerAction) {
          triggerAction = localTriggerAction
          replyText = ''
        } else if (localInfoReply && !hasLocalFill && localInfoReply !== '好的，我记下了') {
          replyText = localInfoReply
        } else {
          try {
            var aiResult = await withAITimeout(
              aiService.callPageGuideAI(userText, ctx, this._chatHistory),
              8000
            )
            console.log('[AI助手] AI完整结果:', JSON.stringify(aiResult))

            if (aiResult && aiResult.reply) {
              replyText = aiResult.reply
              taskComplete = aiResult.taskComplete === true
              triggerAction = aiResult.triggerAction || ''
              if (aiResult.fillFields && Object.keys(aiResult.fillFields).length > 0) {
                fillFields = this._mergeObjects(fillFields || {}, aiResult.fillFields)
                console.log('[AI助手] AI优化回填:', JSON.stringify(fillFields))
                this._dispatchFillFields(fillFields)
              }
              this._chatHistory.push({ role: 'user', content: userText })
              this._chatHistory.push({ role: 'assistant', content: replyText })
            }
          } catch (aiErr) {
            console.log('[AI助手] AI调用失败，使用本地结果:', aiErr.message || aiErr)
          }
        }

        console.log('[AI助手] 最终：填表单:', JSON.stringify(fillFields), '触发操作:', triggerAction)

        if (triggerAction) {
          this._dispatchTriggerAction(triggerAction)
          // 操作类指令执行后直接结束会话（不需要再播报和监听）
          if (triggerAction === 'go_back' || triggerAction === 'call_parent' ||
              triggerAction === 'call_driver' || triggerAction === 'go_volunteer' ||
              triggerAction === 'ticket' || triggerAction === 'taxi' ||
              triggerAction === 'orders' || triggerAction === 'plan') {
            taskComplete = true
          }
        }

        this._replyAndContinue(replyText, taskComplete, fillFields, triggerAction)

      } catch (err) {
        console.error('[AI助手] 对话错误:', err)
        try {
          var asrResult2 = await asrService.recognizeSpeech(audioFilePath)
          var userText2 = (asrResult2 && asrResult2.text) || ''
          if (userText2) {
            var ctx2 = this._buildPageContext()
            var fallback2 = this._localNLPFallback(userText2, ctx2)
            if (fallback2.fillFields && Object.keys(fallback2.fillFields).length > 0) {
              this._dispatchFillFields(fallback2.fillFields)
            }
            this._replyAndContinue(fallback2.reply, false, fallback2.fillFields, '')
            return
          }
        } catch (e2) { console.error('[AI助手] 兜底也失败:', e2) }
        this._replyAndContinue('出了点问题，请再说一遍', false, null, '')
      }
    },

    // 本地NLP兜底：提取实体填表单 + 检测语音操作指令
    _localNLPFallback(userText, pageContext) {
      var nlpService = require('../../services/ai-service.js')
      var nlpResult = nlpService.parseNLP && nlpService.parseNLP(userText, []) || { destination: '', date: '' }
      console.log('[AI助手] NLP解析:', userText, '→', JSON.stringify(nlpResult))
      var fillFields = {}
      var formFields = (pageContext && pageContext.formFields) || []
      console.log('[AI助手] 页面formFields:', JSON.stringify(formFields))

      if (formFields.indexOf('目的地') >= 0 && nlpResult.destination) {
        fillFields['目的地'] = nlpResult.destination
      }
      if (formFields.indexOf('出发日期') >= 0 && nlpResult.date) {
        fillFields['出发日期'] = nlpResult.date
      }

      var hasFill = Object.keys(fillFields).length > 0

      // ===== 语音操作指令检测（所有页面通用）=====
      var triggerAction = this._detectActionCommand(userText, pageContext)
      if (triggerAction) {
        console.log('[AI助手] 检测到操作指令:', triggerAction)
        return { reply: '', fillFields: fillFields, triggerAction: triggerAction }
      }

      // ===== 信息查询检测 =====
      var infoReply = this._detectInfoQuery(userText, pageContext)
      if (infoReply) {
        console.log('[AI助手] 检测到信息查询，回复:', infoReply)
        return { reply: infoReply, fillFields: fillFields }
      }

      var reply = hasFill ? '好的，我帮您填好了' : '好的，我记下了'
      console.log('[AI助手] 本地回填结果:', JSON.stringify(fillFields), 'reply:', reply)

      return { reply: reply, fillFields: fillFields }
    },

    // 检测语音操作指令（打电话、返回、刷新等）
    _detectActionCommand(text, ctx) {
      if (!text) return ''
      var t = text.toLowerCase().replace(/\s/g, '')

      // 通用：返回/退出
      if (/(返回|回去|退出|关闭页面|回到首页|回首页)/.test(t)) return 'go_back'

      // 通用：导航到其他页面
      if (/(买票|订票|查车次|查票|火车票|高铁票)/.test(t)) return 'ticket'
      if (/(打车|叫车|网约车)/.test(t)) return 'taxi'
      if (/(查行程|我的行程|行程列表|看行程)/.test(t)) return 'orders'
      if (/(规划|路线|出行方案|怎么去)/.test(t)) return 'plan'

      // trip-monitor 页面专用指令
      if (ctx && ctx.page === 'trip-monitor') {
        if (/(联系爸妈|联系父母|打电话给爸妈|打给爸妈|打给父母|给爸妈打电话)/.test(t)) return 'call_parent'
        if (/(联系司机|打给司机|给司机打电话|打电话给司机)/.test(t)) return 'call_driver'
        if (/(志愿者|找人帮忙|求助)/.test(t)) return 'go_volunteer'
        if (/(刷新|更新位置|重新定位)/.test(t)) return 'refresh_location'
        if (/(分享|分享位置|分享位置给)/.test(t)) return 'share_location'
      }

      // 通用：朗读当前页面内容
      if (/(读一下|朗读|读行程|念一下|说说什么情况|讲讲)/.test(t)) return 'read_page_info'

      return ''
    },

    // 检测信息查询（"爸妈到哪了"等）
    _detectInfoQuery(text, ctx) {
      if (!text || !ctx) return ''
      var t = text.toLowerCase().replace(/\s/g, '')

      if (ctx.page === 'trip-monitor') {
        // 查询父母位置
        if (/(到哪了|在哪|现在什么位置|位置在哪|到哪|走到哪|到没到|到站没)/.test(t)) {
          var pages = getCurrentPages()
          var cur = pages[pages.length - 1]
          if (cur && cur.data) {
            var locName = cur.data.locationName || ''
            var trip = cur.data.currentTrip
            if (locName && locName !== '定位中...') {
              var tripInfo = trip ? ('行程是' + (trip.fromShort || trip.from || '') + '到' + (trip.toShort || trip.to || '')) : ''
              return '父母现在在' + locName + '。' + (tripInfo ? tripInfo + '，' : '') + '状态是' + (cur.data.monitorStatusText || '监控中')
            }
            return '正在定位中，请稍等'
          }
        }
        // 查询行程详情
        if (/(车次|座位|几点出发|几点到|出发时间|到达时间|行程详情|行程信息)/.test(t)) {
          var pages2 = getCurrentPages()
          var cur2 = pages2[pages2.length - 1]
          if (cur2 && cur2.data && cur2.data.currentTrip) {
            var tr = cur2.data.currentTrip
            return '车次' + (tr.name || '') + '，' + (tr.departureTime || '') + '出发，' + (tr.arrivalTime || '') + '到达，座位是' + (tr.seat || '未分配')
          }
        }
      }

      if (ctx.page === 'orders' || ctx.page === 'child-trips') {
        if (/(几个行程|什么行程|有哪些|行程)/.test(t)) {
          var orders = app.globalData.orders || []
          if (orders.length === 0) return '目前还没有行程记录'
          var latest = orders[orders.length - 1]
          return '您有' + orders.length + '个行程，最新一个是' + (latest.from || '') + '到' + (latest.to || '') + '，' + (latest.departureTime || '') + '出发'
        }
      }

      return ''
    },

    // 派发填表单事件到页面（含视觉强化）
    _dispatchFillFields(fillFields) {
      try {
        console.log('[AI助手] _dispatchFillFields调用, aiFillCallback存在:', !!app.globalData.aiFillCallback, 'fields:', JSON.stringify(fillFields))
        if (app.globalData.aiFillCallback && typeof app.globalData.aiFillCallback === 'function') {
          console.log('[AI助手] 调用aiFillCallback')
          app.globalData.aiFillCallback({ fields: fillFields })
        } else {
          console.log('[AI助手] aiFillCallback不存在，尝试通过getCurrentPages直接调用')
          var pages = getCurrentPages()
          if (pages && pages.length > 0) {
            var currentPage = pages[pages.length - 1]
            if (currentPage && typeof currentPage._handleAIFill === 'function') {
              console.log('[AI助手] 直接调用页面_handleAIFill:', currentPage.route || '')
              currentPage._handleAIFill(fillFields)
            } else {
              console.log('[AI助手] 页面无_handleAIFill方法')
            }
          }
        }
        // 视觉强化：通知页面高亮被填写的字段
        this._dispatchHighlight(Object.keys(fillFields || {}))
        wx.event && wx.event.emit && wx.event.emit('aiFillFields', { fields: fillFields })
        console.log('[AI助手] 派发填表单完成:', JSON.stringify(fillFields))
      } catch (e) {
        console.error('[AI助手] 派发填表单失败:', e)
      }
    },

    // 派发视觉强化：高亮指定字段
    _dispatchHighlight(fieldNames) {
      if (!fieldNames || !fieldNames.length) return
      try {
        if (app.globalData.aiHighlightCallback && typeof app.globalData.aiHighlightCallback === 'function') {
          app.globalData.aiHighlightCallback({ fields: fieldNames })
        }
        wx.event && wx.event.emit && wx.event.emit('aiHighlight', { fields: fieldNames })
      } catch (e) {}
    },

    // 合并两个对象（b覆盖a的重复键）
    _mergeObjects(a, b) {
      var result = {}
      if (a) for (var k in a) result[k] = a[k]
      if (b) for (var k2 in b) result[k2] = b[k2]
      return result
    },

    // 派发触发操作事件到页面
    _dispatchTriggerAction(action) {
      try {
        var self = this
        var postJumpGuide = ''

        // 页面跳转类指令
        if (action === 'ticket') {
          postJumpGuide = '我帮您打开了买票页，您可以直接说要去哪、哪天走'
          this._autoStartAfterJump('/pages/ticket/ticket', postJumpGuide)
          return
        }
        if (action === 'taxi') {
          postJumpGuide = '我帮您打开了打车页，您可以直接说要去哪'
          this._autoStartAfterJump('/pages/taxi/taxi', postJumpGuide)
          return
        }
        if (action === 'orders' || action === 'trips') {
          this._autoStartAfterJump('/pages/orders/orders', '我帮您打开了行程页，想看哪个行程直接说')
          return
        }
        if (action === 'plan') {
          this._autoStartAfterJump('/pages/map-trip/map-trip', '我帮您打开了规划页，告诉我从哪到哪')
          return
        }

        // 页面内操作类指令：直接调用当前页面的方法
        var pages = getCurrentPages()
        var curPage = pages && pages.length > 0 ? pages[pages.length - 1] : null

        if (action === 'go_back') {
          if (curPage && typeof curPage.goBack === 'function') {
            curPage.goBack()
          } else {
            wx.navigateBack({ fail: function() { wx.reLaunch({ url: '/pages/index/index' }) } })
          }
          return
        }

        if (action === 'call_parent' && curPage && typeof curPage.callParent === 'function') {
          this._replyBeforeAction('好的，正在为您拨打父母电话')
          curPage.callParent()
          return
        }
        if (action === 'call_driver' && curPage && typeof curPage.callDriver === 'function') {
          this._replyBeforeAction('好的，正在为您联系司机')
          curPage.callDriver()
          return
        }
        if (action === 'go_volunteer' && curPage && typeof curPage.goToVolunteer === 'function') {
          this._replyBeforeAction('好的，帮您找志愿者')
          curPage.goToVolunteer()
          return
        }
        if (action === 'refresh_location' && curPage && typeof curPage.refreshLocation === 'function') {
          this._replyBeforeAction('好的，正在刷新位置')
          curPage.refreshLocation()
          return
        }
        if (action === 'share_location' && curPage && typeof curPage.shareLocation === 'function') {
          this._replyBeforeAction('好的，正在分享位置')
          curPage.shareLocation()
          return
        }
        if (action === 'read_page_info') {
          this._readPageInfoAloud(curPage)
          return
        }

        // 通过 globalData 回调让页面处理
        if (app.globalData.aiActionCallback && typeof app.globalData.aiActionCallback === 'function') {
          app.globalData.aiActionCallback({ action: action })
        }
        wx.event && wx.event.emit && wx.event.emit('aiTriggerAction', { action: action })
        console.log('[AI助手] 派发触发操作:', action)
      } catch (e) {
        console.error('[AI助手] 派发触发操作失败:', e)
      }
    },

    // 执行操作前先播报一句
    _replyBeforeAction(text) {
      try {
        var ttsService = require('../../services/tts-service.js')
        ttsService.playQueue && ttsService.playQueue([text])
      } catch (e) {}
    },

    // 朗读当前页面信息
    _readPageInfoAloud(curPage) {
      var text = '当前页面没有可朗读的信息'
      if (curPage && curPage.data) {
        var d = curPage.data
        if (d.currentTrip) {
          var t = d.currentTrip
          text = '当前行程：' + (t.fromShort || t.from || '') + '到' + (t.toShort || t.to || '') +
            '，车次' + (t.name || '') + '，' + (t.departureTime || '') + '出发，' + (t.arrivalTime || '') + '到达'
          if (t.seat) text += '，座位' + t.seat
          if (d.locationName && d.locationName !== '定位中...') text += '。父母现在在' + d.locationName
          if (d.monitorStatusText) text += '，状态：' + d.monitorStatusText
        } else if (d.tripResult) {
          var r = d.tripResult
          text = '您的行程：去' + (r.destination || '') + '，' + (r.pickupTime || '') + '出发'
          if (r.fee) text += '，费用' + r.fee + '元'
          if (r.driver) text += '，司机' + r.driver
          if (r.plate) text += '，车牌' + r.plate
        }
      }
      this._replyAndContinue(text, true, null, '')
    },

    // 跳转页面后自动恢复AI会话
    _autoStartAfterJump(url, guideText) {
      var self = this
      // 存储当前会话状态
      self._savedChatHistory = self._chatHistory ? self._chatHistory.slice() : []
      self._jumpGuideText = guideText

      // 先设置全局标记，确保目标页 onShow 时能读到
      app.globalData.aiAutoResume = true
      app.globalData.aiAutoResumeGuide = guideText
      app.globalData.aiAutoResumeHistory = self._savedChatHistory

      wx.navigateTo({
        url: url,
        success: function() {
          // 确保标记仍然有效
          app.globalData.aiAutoResume = true
          app.globalData.aiAutoResumeGuide = guideText
          app.globalData.aiAutoResumeHistory = self._savedChatHistory
        },
        fail: function() {
          // navigateTo可能因页面栈满失败，改用reLaunch
          wx.reLaunch({
            url: url,
            success: function() {
              app.globalData.aiAutoResume = true
              app.globalData.aiAutoResumeGuide = guideText
              app.globalData.aiAutoResumeHistory = self._savedChatHistory
            }
          })
        }
      })
    },

    // 构建丰富的页面上下文
    _buildPageContext() {
      var ctx = app.globalData.aiPageContext || { page: 'unknown', title: '当前页面' }
      // 如果页面已经设置了丰富的上下文（含actions/formFields/formData），直接用
      // 否则用基本信息
      return ctx
    },

    // 播放回复，播完自动进入下一轮监听（或任务完成自动结束）
    _replyAndContinue(text, taskComplete, fillFields, triggerAction) {
      // 会话已关闭（手动关闭后识别回填场景）：只回填表单和播报，不重新显示卡片
      if (!this.data.isWorking) {
        if (_activeInstance === this) _activeInstance = null
        // 如果有填表单需求，已在 _recognizeAndReply 中派发
        // 仅播报回复（轻量），不弹卡片
        if (text) ttsService.playQueue([text])
        return
      }

      this.setData({
        workStatus: 'speaking',
        replyText: text
      })
      this._showCard()

      var that = this
      ttsService.playQueue([text]).then(function() {
        if (!that.data.isWorking) return
        if (taskComplete) {
          // 任务完成，自动结束会话
          that._addTimer(function() {
            that._endSession()
          }, 1000)
        } else {
          that.setData({ workStatus: 'idle' })
          // 播完 600ms 后自动开始下一轮监听
          that._addTimer(function() {
            if (that.data.isWorking) that._startListening()
          }, 600)
        }
      }).catch(function() {
        if (!that.data.isWorking) return
        if (taskComplete) {
          that._addTimer(function() {
            that._endSession()
          }, 1000)
        } else {
          that.setData({ workStatus: 'idle' })
          that._addTimer(function() {
            if (that.data.isWorking) that._startListening()
          }, 600)
        }
      })
    },

    // 会话超时管理：长时间无有效交互自动结束
    _resetSessionTimeout() {
      this._clearSessionTimeout()
      var that = this
      this._sessionTimeoutId = this._addTimer(function() {
        console.log('[AI助手] 会话超时，自动结束')
        if (that.data.isWorking) {
          that.setData({
            workStatus: 'speaking',
            replyText: '长时间没听到您说话，我先退下了，需要时再点我'
          })
          that._showCard()
          ttsService.playQueue(['长时间没听到您说话，我先退下了，需要时再点我']).then(function() {
            that._endSession()
          }).catch(function() {
            that._endSession()
          })
        }
      }, 60000) // 60秒无交互自动结束
    },
    _clearSessionTimeout() {
      if (this._sessionTimeoutId) {
        clearTimeout(this._sessionTimeoutId)
        this._sessionTimeoutId = null
      }
    }
  }
})
