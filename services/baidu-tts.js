// 密钥统一从 config/api.js 读取，请在该文件中自行填入
const apiConfig = require('../config/api.js')
const BAIDU_TTS_API_KEY = apiConfig.BAIDU_ASR_API_KEY || ''
const BAIDU_TTS_SECRET_KEY = apiConfig.BAIDU_ASR_SECRET_KEY || ''

let cachedToken = null
let tokenExpireTime = 0

function getToken() {
  return new Promise((resolve, reject) => {
    if (cachedToken && Date.now() < tokenExpireTime) {
      resolve(cachedToken)
      return
    }
    
    const url = 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' + BAIDU_TTS_API_KEY + '&client_secret=' + BAIDU_TTS_SECRET_KEY
    
    wx.request({
      url: url,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.access_token) {
          cachedToken = res.data.access_token
          tokenExpireTime = Date.now() + (res.data.expires_in - 300) * 1000
          resolve(cachedToken)
        } else {
          reject(new Error('获取TTS Token失败'))
        }
      },
      fail: reject
    })
  })
}

function textToSpeech(text) {
  return new Promise((resolve, reject) => {
    if (!text) {
      reject(new Error('文本为空'))
      return
    }

    getToken().then((token) => {
      var url = 'https://tsn.baidu.com/text2audio'

      wx.request({
        url: url,
        method: 'POST',
        responseType: 'arraybuffer',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: {
          tex: text,
          tok: token,
          cuid: 'elder_app',
          ctp: 1,
          lan: 'zh',
          per: 0
        },
        success: function(res) {
          if (res.statusCode === 200 && res.data) {
            var fs = wx.getFileSystemManager()
            var filePath = wx.env.USER_DATA_PATH + '/tts_' + Date.now() + '.mp3'
            // 写入前清理旧 tts 文件，避免超出10MB存储限制
            try {
              var files = fs.readdirSync(wx.env.USER_DATA_PATH)
              files.forEach(function(f) {
                if (f.indexOf('tts_') === 0 && f.endsWith('.mp3')) {
                  try { fs.unlinkSync(wx.env.USER_DATA_PATH + '/' + f) } catch (e) {}
                }
              })
            } catch (e) {}
            fs.writeFile({
              filePath: filePath,
              data: res.data,
              encoding: 'binary',
              success: function() {
                resolve(filePath)
              },
              fail: function(err) {
                console.error('写入音频文件失败:', err)
                reject(new Error('写入音频文件失败'))
              }
            })
          } else {
            console.error('TTS请求失败:', res.statusCode)
            reject(new Error('TTS请求失败'))
          }
        },
        fail: function(err) {
          console.error('TTS网络请求失败:', err)
          reject(err)
        }
      })
    }).catch(reject)
  })
}

const audioQueue = []
let loopItems = null
let isPlaying = false
let innerAudioContext = null
let isAutoLoop = false
let autoLoopTimer = null

var _playResolve = null
var _playReject = null

function playQueue(items) {
  stopPlay()
  audioQueue.length = 0
  items.forEach(item => audioQueue.push(item))
  isAutoLoop = false
  return new Promise(function(resolve, reject) {
    _playResolve = resolve
    _playReject = reject
    playNext()
  })
}

function playQueueAutoLoop(items) {
  stopPlay()
  loopItems = items.slice()
  audioQueue.length = 0
  items.forEach(item => audioQueue.push(item))
  isAutoLoop = true
  playNext()
}

function playNext() {
  if (audioQueue.length === 0) {
    if (isAutoLoop && loopItems && loopItems.length > 0) {
      autoLoopTimer = setTimeout(function() {
        audioQueue.length = 0
        loopItems.forEach(function(item) { audioQueue.push(item) })
        playNext()
      }, 2000)
    } else {
      isPlaying = false
      // 播放完成，resolve Promise
      if (_playResolve) {
        var r = _playResolve
        _playResolve = null
        _playReject = null
        r()
      }
    }
    return
  }

  isPlaying = true
  var currentText = audioQueue.shift()

  if (innerAudioContext) {
    innerAudioContext.destroy()
  }

  textToSpeech(currentText).then(function(audioPath) {
    innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.src = audioPath
    innerAudioContext.playbackRate = 1.0
    innerAudioContext.obeyMuteSwitch = false
    innerAudioContext.onEnded(function() {
      playNext()
    })
    innerAudioContext.onError(function(err) {
      console.error('音频播放错误:', err)
      playNext()
    })
    innerAudioContext.play()
  }).catch(function(err) {
    console.error('TTS转换失败:', err)
    playNext()
  })
}

function stopPlay() {
  if (autoLoopTimer) {
    clearTimeout(autoLoopTimer)
    autoLoopTimer = null
  }
  if (innerAudioContext) {
    innerAudioContext.stop()
    innerAudioContext.destroy()
    innerAudioContext = null
  }
  audioQueue.length = 0
  isPlaying = false
  isAutoLoop = false
  // 清理回调
  if (_playResolve) {
    var r = _playResolve
    _playResolve = null
    _playReject = null
    r()
  }
}

function isCurrentlyPlaying() {
  return isPlaying
}

function buildTripAnnouncements(plan) {
  const announcements = []
  
  if (!plan || !plan.segments) return announcements

  const totalCost = plan.totalCost || plan.taxiTotalCost || 0
  
  announcements.push('为您规划好行程，共' + (plan.segments.length) + '段路程')
  
  plan.segments.forEach((segment, index) => {
    if (segment.type === 'walk') {
      const distance = segment.distance || '500'
      announcements.push('步行约' + distance + '米到达')
    } else if (segment.type === 'local') {
      var segMode = ''
      if (plan._confirmedModes && plan._confirmedModes[index]) {
        segMode = plan._confirmedModes[index]
      }
      var transport = null
      var modeLabel = '网约车'
      if (segMode === 'bus' && segment.bus) {
        transport = segment.bus
        modeLabel = '公交'
      } else if (segMode === 'subway' && segment.subway) {
        transport = segment.subway
        modeLabel = '地铁'
      } else if (segment.taxi) {
        transport = segment.taxi
        modeLabel = '网约车'
      } else if (segment.bus) {
        transport = segment.bus
        modeLabel = '公交'
      } else if (segment.subway) {
        transport = segment.subway
        modeLabel = '地铁'
      }

      if (!transport && segment.taxi) {
        transport = segment.taxi
        modeLabel = '网约车'
      }

      if (transport) {
        var tDuration = transport.duration || ''
        var tCost = transport.cost || ''
        var parts = []

        if (index === 0) {
          parts.push('第一步，从' + (plan.from || '出发地') + '出发')
        } else if (index === plan.segments.length - 1) {
          parts.push('最后')
        } else {
          parts.push('中间转乘')
        }

        parts.push('乘坐' + modeLabel)
        if (tDuration) parts.push('约' + tDuration)
        if (index === plan.segments.length - 1 && plan.to) {
          parts.push('到达' + plan.to)
        }
        if (tCost && tCost !== '起步价') {
          parts.push('费用约' + tCost + '元')
        }
        announcements.push(parts.join('，'))
      }
    } else if (segment.type === 'train') {
      const trainInfo = segment.train || plan.train || {}
      const trainNo = trainInfo.trainNo || ''
      const fromStation = trainInfo.fromStation || ''
      const toStation = trainInfo.toStation || ''
      const departTime = trainInfo.startTime || ''
      const arriveTime = trainInfo.endTime || ''
      const price = trainInfo.minPrice || ''
      const seat = trainInfo.seat || (trainInfo.prices && trainInfo.prices[0] ? trainInfo.prices[0].seat + '座' : '二等座')
      
      if (trainNo && fromStation && toStation) {
        var trainAnn = '第二步，乘坐' + trainInfo.type + trainNo
        if (departTime) trainAnn += '，' + departTime + '从' + fromStation + '出发'
        if (arriveTime) trainAnn += '，' + arriveTime + '到达' + toStation
        announcements.push(trainAnn)
        
        if (seat || price) {
          var seatInfo = ''
          if (seat) seatInfo = seat
          if (price) {
            if (seatInfo) seatInfo += '，票价'
            else seatInfo += '票价'
            seatInfo += price + '元'
          }
          announcements.push(seatInfo)
        }
      }
    }
  })

  var trainPrice = 0
  if (plan.train && plan.train.minPrice) {
    trainPrice = Number(plan.train.minPrice) || 0
  }
  var otherCost = Number(totalCost) - trainPrice
  if (otherCost < 0) otherCost = 0
  announcements.push('全程费用约' + totalCost + '元，祝您旅途愉快')
  
  return announcements
}

function announceTrip(plan) {
  const items = buildTripAnnouncements(plan)
  playQueue(items)
  return items
}

function announceTripLoop(plan) {
  const items = buildTripAnnouncements(plan)
  playQueueAutoLoop(items)
  return items
}

module.exports = {
  textToSpeech: textToSpeech,
  playQueue: playQueue,
  announceTrip: announceTrip,
  announceTripLoop: announceTripLoop,
  stopPlay: stopPlay,
  isCurrentlyPlaying: isCurrentlyPlaying,
  buildTripAnnouncements: buildTripAnnouncements
}
