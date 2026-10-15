// 视觉多模态服务 - 独立封装，不依赖 ai-service.js
// 提供：图片压缩 + 通义千问视觉理解调用 + 回答解析
const apiConfig = require('../config/api.js')
const baiduTts = require('./baidu-tts.js')

const DASHSCOPE_API_KEY = (apiConfig && apiConfig.DASHSCOPE_API_KEY) || ''

// 视觉模型（通义千问多模态）
const VISION_MODEL = 'qwen-vl-max'
const VISION_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

// 请求超时
const TIMEOUT_MS = 20000

function request(options) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      header: options.header,
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + JSON.stringify(res.data || {}).substring(0, 200)))
        }
      },
      fail: function(err) {
        // wx.request fail回调的err包含 errMsg 字段
        var msg = (err && err.errMsg) ? err.errMsg : ('' + err)
        console.error('[视觉导航] wx.request失败:', msg)
        reject(new Error(msg))
      }
    })
  })
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('超时(' + ms + 'ms)')) }, ms)
    })
  ])
}

// 读本地文件转 base64
function filePathToBase64(filePath) {
  return new Promise(function(resolve, reject) {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: function(res) { resolve(res.data) },
      fail: function(err) { reject(err) }
    })
  })
}

// 压缩图片并返回 {base64, mimeType}（最大边 1500px）
function compressAndToBase64(srcPath) {
  return new Promise(function(resolve, reject) {
    wx.compressImage({
      src: srcPath,
      quality: 85,
      success: function(r1) {
        var compressedPath = r1.tempFilePath
        wx.getImageInfo({
          src: compressedPath,
          success: function(info) {
            var mime = 'image/jpeg'
            if (info.type === 'png') mime = 'image/png'
            else if (info.type === 'gif') mime = 'image/gif'
            else if (info.type === 'webp') mime = 'image/webp'
            filePathToBase64(compressedPath).then(function(b64) {
              resolve({ base64: b64, mimeType: mime })
            }).catch(reject)
          },
          fail: function() {
            filePathToBase64(compressedPath).then(function(b64) {
              resolve({ base64: b64, mimeType: 'image/jpeg' })
            }).catch(reject)
          }
        })
      },
      fail: function() {
        wx.getImageInfo({
          src: srcPath,
          success: function(info) {
            var mime = 'image/jpeg'
            if (info.type === 'png') mime = 'image/png'
            filePathToBase64(srcPath).then(function(b64) {
              resolve({ base64: b64, mimeType: mime })
            }).catch(reject)
          },
          fail: function() {
            filePathToBase64(srcPath).then(function(b64) {
              resolve({ base64: b64, mimeType: 'image/jpeg' })
            }).catch(reject)
          }
        })
      }
    })
  })
}

// 构造 System Prompt（老年出行视觉导航专用）
function buildSystemPrompt() {
  return [
    '你是专为老年人服务的出行向导员。',
    '你看到的是老人举起手机拍的第一视角照片。',
    '不管是什么场景（车站、机场、街道、商场、家里、户外等），都尽力帮助老人。',
    '',
    '你必须严格按下面4个小节输出，编号必须是 1 2 3 4：',
    '【1. 我看到了什么】用一句简单的话描述场景，让老人知道你看到了什么',
    '【2. 你该怎么走】必须口语化+步数+左右，绝对不能说"向北/向东/朝南"。',
    '     例：您往前直走30步，走到头右转。',
    '     如果画面里能看到电梯/扶梯/无障碍通道：优先推荐走电梯，不要让老人走楼梯。',
    '【3. 您的目标在哪边】结合下面的老人行程信息，告诉他检票口/站台/登机口/目的地的大致方位和距离，',
    '     如果行程信息和当前场景不符，就根据画面判断最合理的方向。',
    '【4. 有什么要小心的】如果画面里有台阶/斜坡/水洼/人流密集：提醒老人慢一点。',
    '     如果路很平很安全：直接说"路很平，放心走"。',
    '',
    '回答规则（非常重要）：',
    '- 用短句，每句话最多20个字，不要复杂长句。',
    '- 不要专业术语，不要"请按照指示标志通行"这种废话，老人听不懂。',
    '- 必须用"左转/右转/直走+X步"，禁止用东南西北。',
    '- 无论什么场景都尽力回答，不要返回"看不懂"。只有在完全看不清画面内容时（比如全黑、全白、拍了模糊一团）才返回【看不懂】三个字。',
    '- 不要生成任何 Markdown、链接、表格、代码，只要纯文字。'
  ].join('\n')
}

// 把用户行程上下文拼成文字
function buildTripContextText(tripContext) {
  if (!tripContext) return '（暂无行程信息）'
  var parts = []
  if (tripContext.trainNo || tripContext.flightNo || tripContext.title) {
    parts.push('当前车次/航班：' + (tripContext.trainNo || tripContext.flightNo || tripContext.title || ''))
  }
  if (tripContext.from && tripContext.to) {
    parts.push('行程：' + tripContext.from + ' → ' + tripContext.to)
  }
  if (tripContext.departTime || tripContext.time) {
    parts.push('出发时间：' + (tripContext.departTime || tripContext.time))
  }
  if (tripContext.gate || tripContext.checkin || tripContext.seat) {
    var g = []
    if (tripContext.gate) g.push('检票口：' + tripContext.gate)
    if (tripContext.checkin) g.push('值机口：' + tripContext.checkin)
    if (tripContext.seat) g.push('座位：' + tripContext.seat)
    if (g.length) parts.push(g.join('，'))
  }
  if (tripContext.nextStep) {
    parts.push('行程里写的下一步：' + tripContext.nextStep)
  }
  if (tripContext.notes) {
    parts.push('老人注意事项：' + tripContext.notes)
  } else {
    parts.push('老人情况：65岁以上，腿脚一般，优先电梯不要楼梯')
  }
  return parts.join('\n')
}

// 调用视觉大模型
// imageBase64 可以是字符串（旧兼容）或 {base64, mimeType} 对象
function callVisionModel(imageBase64, tripContext) {
  return new Promise(function(resolve, reject) {
    if (!DASHSCOPE_API_KEY) {
      reject(new Error('未配置通义千问API Key'))
      return
    }

    var b64 = imageBase64
    var mime = 'image/jpeg'
    if (imageBase64 && typeof imageBase64 === 'object') {
      b64 = imageBase64.base64
      mime = imageBase64.mimeType || 'image/jpeg'
    }
    if (!b64) {
      reject(new Error('没有图片内容'))
      return
    }

    var userMsg = [
      { type: 'text', text: '老人当前行程信息：\n' + buildTripContextText(tripContext) + '\n\n请根据照片回答。' },
      { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } }
    ]

    var messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userMsg }
    ]

    var requestData = {
      model: VISION_MODEL,
      messages: messages,
      temperature: 0.2,
      max_tokens: 600
    }

    console.log('[视觉导航] 请求URL:', VISION_API_URL)
    console.log('[视觉导航] base64长度:', b64.length, '请求体大小估算:', Math.round(JSON.stringify(requestData).length / 1024) + 'KB')

    withTimeout(request({
      url: VISION_API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DASHSCOPE_API_KEY
      },
      data: requestData
    }), TIMEOUT_MS).then(function(result) {
      if (result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
        var rawText = result.choices[0].message.content
        console.log('[视觉AI] 原始返回:', rawText)
        console.log('[视觉AI] base64长度:', b64.length, 'MIME:', mime)
        resolve(rawText)
      } else {
        console.error('[视觉AI] 返回格式异常:', JSON.stringify(result || {}))
        reject(new Error('视觉模型返回格式异常：' + JSON.stringify(result || {}).substring(0, 200)))
      }
    }).catch(function(err) {
      // 增强错误信息
      var msg = err && err.message ? err.message : ('' + err)
      console.error('[视觉AI] 请求失败:', msg)
      if (msg.indexOf('domain') >= 0 || msg.indexOf('url not in') >= 0) {
        reject(new Error('域名未配置: 请在微信小程序后台添加 dashscope.aliyuncs.com 到request合法域名'))
      } else if (msg.indexOf('timeout') >= 0 || msg.indexOf('超时') >= 0) {
        reject(new Error('AI请求超时，请检查网络后重试'))
      } else {
        reject(new Error('AI请求失败: ' + msg))
      }
    })
  })
}

// 解析视觉回答，拆成 4 段，方便 WXML 大字展示
function parseVisionAnswer(rawText) {
  var text = (rawText || '').trim()
  if (text.indexOf('看不懂') >= 0 && text.length < 10) {
    return { unclear: true, sections: [], raw: text }
  }
  // 按【1.】【2.】【3.】【4.】切
  var sections = []
  var patterns = [
    { key: 'what', title: '我看到了什么', re: /【?1[.、]\s*我看到了什么】?[:：\s]*([\s\S]*?)(?=【?2[.、]|$)/ },
    { key: 'walk', title: '你该怎么走',   re: /【?2[.、]\s*你该怎么走】?[:：\s]*([\s\S]*?)(?=【?3[.、]|$)/ },
    { key: 'goal', title: '目标在哪边',   re: /【?3[.、]\s*您的目标在哪边】?[:：\s]*([\s\S]*?)(?=【?4[.、]|$)/ },
    { key: 'warn', title: '要小心什么',   re: /【?4[.、]\s*有什么要小心的】?[:：\s]*([\s\S]*?)(?=$)/ }
  ]
  for (var i = 0; i < patterns.length; i++) {
    var m = text.match(patterns[i].re)
    var content = (m && m[1]) ? m[1].trim().replace(/\n{2,}/g, '\n') : ''
    if (!content) continue
    sections.push({ key: patterns[i].key, title: patterns[i].title, content: content })
  }
  // 如果切失败，整块塞进去
  if (sections.length === 0) {
    sections.push({ key: 'raw', title: '回答', content: text })
  }
  return { unclear: false, sections: sections, raw: text }
}

// 总入口：拍照文件路径 + 行程上下文 → 返回结构化回答
function askVision(imagePath, tripContext) {
  return compressAndToBase64(imagePath).then(function(base64) {
    return callVisionModel(base64, tripContext)
  }).then(function(rawText) {
    return parseVisionAnswer(rawText)
  })
}

// 把回答转成连贯文字，送给 TTS 播报
function answerToSpeechText(parsed) {
  if (parsed.unclear) {
    return '没看清，您把手机对准前面的大牌子或通道方向，举高一点再拍一张，好吗？'
  }
  var parts = []
  for (var i = 0; i < parsed.sections.length; i++) {
    var s = parsed.sections[i]
    // TTS 里不要标题重复
    var c = (s.content || '').replace(/\n+/g, '，').replace(/，。/g, '。')
    if (c) parts.push(c)
  }
  return parts.join('。') + '。'
}

// 语音播报回答（优先 playQueue，失败降级 textToSpeech + 直接播放）
function speakAnswer(parsed) {
  var text = answerToSpeechText(parsed)
  if (!text) return Promise.resolve()
  if (baiduTts && baiduTts.playQueue) {
    return baiduTts.playQueue([text])
  }
  if (baiduTts && baiduTts.textToSpeech) {
    return baiduTts.textToSpeech(text).then(function(path) {
      return playAudioFile(path)
    })
  }
  return Promise.reject(new Error('TTS不可用'))
}

// 直接播放音频文件
function playAudioFile(filePath) {
  return new Promise(function(resolve, reject) {
    try {
      var audio = wx.createInnerAudioContext()
      audio.obeyMuteSwitch = false
      audio.src = filePath
      audio.onEnded(function() {
        audio.destroy()
        resolve()
      })
      audio.onError(function(err) {
        console.warn('[视觉导航] 播放失败:', err)
        audio.destroy()
        reject(err)
      })
      audio.play()
    } catch (e) {
      reject(e)
    }
  })
}

// 直接textToSpeech包装（供外部调用）
function textToSpeech(text) {
  if (!baiduTts || !baiduTts.textToSpeech) {
    return Promise.reject(new Error('百度TTS不可用'))
  }
  return baiduTts.textToSpeech(text)
}

module.exports = {
  askVision: askVision,
  callVisionModel: callVisionModel,
  compressAndToBase64: compressAndToBase64,
  parseVisionAnswer: parseVisionAnswer,
  answerToSpeechText: answerToSpeechText,
  speakAnswer: speakAnswer,
  textToSpeech: textToSpeech,
  playAudioFile: playAudioFile
}
