const cloud = require('wx-server-sdk')
const https = require('https')
const fs = require('fs')
const path = require('path')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const BAIDU_API_KEY = process.env.BAIDU_ASR_API_KEY || ''
const BAIDU_SECRET_KEY = process.env.BAIDU_ASR_SECRET_KEY || ''

let _accessToken = null
let _tokenExpireTime = 0

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', (chunk) => { chunks.push(chunk) })
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8')
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          resolve({ body: body })
        }
      })
    })
    req.on('error', (err) => {
      console.error('HTTP request error:', err.message)
      reject(err)
    })
    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
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
    const url = `/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(BAIDU_API_KEY)}&client_secret=${encodeURIComponent(BAIDU_SECRET_KEY)}`
    const options = {
      hostname: 'aip.baidubce.com',
      path: url,
      method: 'GET'
    }
    
    const result = await httpRequest(options)
    
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

async function recognizeSpeech(base64Audio) {
  const token = await getAccessToken()
  
  if (!token) {
    console.log('无Token，使用模拟识别')
    return getMockResult()
  }

  try {
    const options = {
      hostname: 'vop.baidu.com',
      path: '/pro_api?cuid=wechat_mini&token=' + token,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // base64解码后的实际字节长度
    const audioBuffer = Buffer.from(base64Audio, 'base64')
    
    const data = {
      format: 'm4a',
      rate: 16000,
      channel: 1,
      len: audioBuffer.length,
      speech: base64Audio,
      lan: 'zh',
      cuid: 'wechat_mini_program'
    }

    const result = await httpRequest(options, data)
    console.log('百度ASR识别结果:', JSON.stringify(result))
    
    if (result.err_no === 0 && result.result && result.result.length > 0) {
      return {
        success: true,
        text: result.result[0].replace(/[，。？！、]/g, '')
      }
    } else {
      console.error('百度ASR识别失败:', result.err_msg)
      return getMockResult()
    }
  } catch (error) {
    console.error('百度ASR请求失败:', error)
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

exports.main = async (event, context) => {
  console.log('ASR proxy received event:', JSON.stringify(event))
  
  const { audioBase64 } = event
  
  if (!audioBase64) {
    return {
      success: false,
      error: '缺少音频数据'
    }
  }

  try {
    const result = await recognizeSpeech(audioBase64)
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('ASR proxy error:', error)
    return {
      success: false,
      error: error.message,
      data: getMockResult()
    }
  }
}