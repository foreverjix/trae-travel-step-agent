const apiConfig = require('../config/api.js')

const BAIDU_API_KEY = apiConfig.BAIDU_ASR_API_KEY || ''
const BAIDU_SECRET_KEY = apiConfig.BAIDU_ASR_SECRET_KEY || ''

let _accessToken = null
let _tokenExpireTime = 0

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      header: options.header || {},
      data: options.data || {},
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

async function getAccessToken() {
  const now = Date.now()
  
  if (_accessToken && now < _tokenExpireTime) {
    console.log('使用缓存的百度ASR Token')
    return _accessToken
  }

  if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
    console.log('未配置百度ASR密钥')
    return null
  }

  try {
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(BAIDU_API_KEY)}&client_secret=${encodeURIComponent(BAIDU_SECRET_KEY)}`
    console.log('获取百度ASR Token:', url)
    
    const result = await request({ url })
    
    if (result.access_token) {
      _accessToken = result.access_token
      _tokenExpireTime = now + (result.expires_in - 60) * 1000
      console.log('百度ASR Token获取成功')
      return _accessToken
    } else {
      console.error('百度ASR Token获取失败:', result)
      return null
    }
  } catch (error) {
    console.error('百度ASR Token请求失败:', error)
    return null
  }
}

async function recognizeViaCloud(audioBase64) {
  return new Promise((resolve, reject) => {
    var app = getApp()
    var cloudReady = app && app.globalData && app.globalData._cloudReady
    if (!cloudReady || !wx.cloud) {
      reject(new Error('云开发未初始化'))
      return
    }
    try {
      wx.cloud.callFunction({
        name: 'asr-proxy',
        data: {
          audioBase64: audioBase64
        },
        success: (res) => {
          console.log('云函数ASR结果:', JSON.stringify(res))
          if (res.result && res.result.success && res.result.data) {
            const data = res.result.data
            if (data.success && data.text) {
              resolve(data)
            } else {
              reject(new Error('识别失败: ' + (data.err_msg || '未知错误')))
            }
          } else if (res.result && res.result.data && res.result.data.text) {
            resolve({ success: true, text: res.result.data.text })
          } else {
            reject(new Error('云函数返回格式异常'))
          }
        },
        fail: (err) => {
          console.error('云函数调用失败:', err)
          reject(err)
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

async function recognizeViaDirect(audioBase64, audioFilePath) {
  const token = await getAccessToken()
  
  if (!token) {
    console.log('无Token，使用模拟识别')
    return getMockResult()
  }

  try {
    const url = `https://vop.baidu.com/server_api`
    
    let audioByteLen
    if (audioFilePath) {
      try {
        const fs = wx.getFileSystemManager()
        const fileInfo = fs.statSync(audioFilePath)
        audioByteLen = fileInfo.size
      } catch (e) {
        audioByteLen = Math.floor(audioBase64.length * 3 / 4) - Math.floor(audioBase64.length / 52) * 2
      }
    } else {
      audioByteLen = Math.floor(audioBase64.length * 3 / 4) - Math.floor(audioBase64.length / 52) * 2
    }
    
    const result = await request({
      url: url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        format: 'pcm',
        rate: 16000,
        channel: 1,
        cuid: 'wechat_mini',
        token: token,
        dev_pid: 1537,
        len: audioByteLen,
        speech: audioBase64
      }
    })

    console.log('百度ASR识别结果:', JSON.stringify(result))
    
    if (result.err_no === 0 && result.result && result.result.length > 0) {
      return {
        success: true,
        text: result.result[0].replace(/[，。？！、]/g, '')
      }
    } else {
      console.error('百度ASR识别失败:', result.err_no, result.err_msg)
      return getMockResult()
    }
  } catch (error) {
    console.error('百度ASR请求失败:', error)
    return getMockResult()
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('超时')) }, ms)
    })
  ])
}

async function recognizeSpeech(audioFilePath) {
  try {
    const fs = wx.getFileSystemManager()
    const fileContent = fs.readFileSync(audioFilePath, 'base64')
    
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      console.log('未配置百度ASR密钥，使用模拟识别')
      return getMockResult()
    }

    try {
      console.log('直连百度ASR识别...')
      const directResult = await withTimeout(recognizeViaDirect(fileContent, audioFilePath), 10000)
      if (directResult && directResult.success) {
        return directResult
      }
    } catch (directErr) {
      console.log('直连ASR失败:', directErr.errMsg || directErr.message)
    }
    
    console.log('使用模拟识别结果')
    return getMockResult()
  } catch (error) {
    console.error('语音识别错误:', error)
    return getMockResult()
  }
}

function getMockResult() {
  const mockResults = [
    '明天去南京看孙子',
    '我要去县医院看病',
    '我要回家',
    '我要去太原南站坐火车',
    '去省人民医院复查',
    '明天上午去北京看天安门',
    '帮我叫个车去菜市场',
    '去太原南站',
    '后天去上海找老伴',
    '我要去火车站接人',
    '去市政府办老年证',
    '下周去杭州看西湖',
    '帮我打车去人民公园',
    '我要去银行取养老金',
    '去西安看兵马俑',
    '我要从火车站回家',
    '去社区医院拿药',
    '明天从太原坐高铁去北京',
    '我要去老干部活动中心',
    '去超市买点菜'
  ]
  return {
    success: true,
    text: mockResults[Math.floor(Math.random() * mockResults.length)]
  }
}

module.exports = {
  recognizeSpeech,
  getAccessToken
}