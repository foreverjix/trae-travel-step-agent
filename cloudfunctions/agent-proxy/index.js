const cloud = require('wx-server-sdk')
const https = require('https')
const zlib = require('zlib')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const SYSTEM_PROMPT = `
你是乐龄出行智能助手，专为老年人提供出行规划服务。

你可以使用以下工具来帮助用户：
1. search_trains: 查询12306真实火车信息
   - 参数: from(出发城市), to(目的城市), date(日期，格式YYYYMMDD)
   - 返回: 车次列表，包含车次号、出发时间、到达时间、票价等

工作流程：
1. 理解用户的出行意图
2. 如果需要查询火车信息，调用 search_trains 工具
3. 基于工具返回的真实数据，为用户推荐最合适的方案
4. 推荐时考虑出发时间、价格、行程时长等因素

输出格式要求：
必须返回JSON格式，包含以下字段：
{
  "action": "string",
  "params": {},
  "reply": "string"
}

action类型：
- "greeting": 用户问候
- "go_home": 用户要回家
- "go_hospital": 用户要去医院
- "route_plan": 用户要规划路线
- "recommend_plan": 推荐方案
- "ask_question": 需要追问用户
- "tool_call": 调用工具，params需包含toolName和toolArgs
- "tool_result": 工具执行结果
- "unknown": 无法理解

注意：
- 在回答用户关于火车、行程的问题时，你应该主动调用 search_trains 工具查询真实数据
- 然后基于真实数据给出推荐
- 推荐理由要简明易懂，适合老年人理解
- 回复语气要亲切、温暖
`

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_trains',
      description: '查询12306真实火车信息，获取车次、时间、票价等数据',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: '出发城市，如：太原、北京、上海'
          },
          to: {
            type: 'string',
            description: '目的城市，如：西安、杭州、广州'
          },
          date: {
            type: 'string',
            description: '出发日期，格式为YYYYMMDD，如：20240728'
          }
        },
        required: ['from', 'to']
      }
    }
  }
]

const STATION_CODES = {
  '北京': 'BJP', '北京南': 'VNP', '北京西': 'BXP', '北京北': 'VBP',
  '上海': 'SHH', '上海虹桥': 'AOH', '上海南': 'SNH',
  '广州': 'GZQ', '广州南': 'IZQ',
  '深圳': 'SZQ', '深圳北': 'IOQ',
  '杭州': 'HZH', '杭州东': 'HGH',
  '南京': 'NJH', '南京南': 'NMH',
  '武汉': 'WHN', '汉口': 'HKN', '武昌': 'WCN',
  '成都': 'CDW', '成都东': 'CDN',
  '重庆': 'CQW', '重庆北': 'VNP', '重庆西': 'CXW',
  '西安': 'XAY', '西安北': 'EAY',
  '郑州': 'ZZF', '郑州东': 'ZAF',
  '长沙': 'CSQ', '长沙南': 'CSG',
  '合肥': 'HFH', '合肥南': 'ENH',
  '福州': 'FZY', '福州南': 'FZS',
  '厦门': 'XMS', '厦门北': 'XBS',
  '南昌': 'NCG', '南昌西': 'NXG',
  '昆明': 'KMZ', '昆明南': 'KMG',
  '贵阳': 'GYW', '贵阳北': 'KQW',
  '南宁': 'NNZ', '南宁东': 'NFZ',
  '兰州': 'LZH', '兰州西': 'LAJ',
  '西宁': 'XNN',
  '银川': 'YIF',
  '呼和浩特': 'HHC', '呼和浩特东': 'NDC',
  '乌鲁木齐': 'WMR',
  '哈尔滨': 'VBB', '哈尔滨西': 'VAB',
  '长春': 'VCC',
  '沈阳': 'SYY', '沈阳北': 'SBT',
  '大连': 'DLT', '大连北': 'DFT',
  '石家庄': 'SJP',
  '济南': 'JND', '济南西': 'JGK',
  '青岛': 'QDK', '青岛北': 'QHK',
  '天津': 'TJP', '天津西': 'TXP',
  '太原': 'TYV', '太原南': 'TNV',
  '苏州': 'SZH', '苏州北': 'SBK',
  '无锡': 'WXH',
  '常州': 'CZH',
  '徐州': 'XCH', '徐州东': 'XZH'
}

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', (chunk) => { chunks.push(chunk) })
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        const encoding = res.headers['content-encoding']
        
        let decompressed = buffer
        if (encoding === 'gzip') {
          decompressed = zlib.gunzipSync(buffer)
        } else if (encoding === 'deflate') {
          decompressed = zlib.inflateSync(buffer)
        }
        
        const body = decompressed.toString('utf-8')
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          resolve({ body: body })
        }
      })
    })
    req.on('error', (err) => reject(err))
    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

function searchTrainsTool(from, to, date) {
  return new Promise((resolve) => {
    const trainDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '')
    const fromCode = STATION_CODES[from] || from
    const toCode = STATION_CODES[to] || to
    
    const url = `https://kyfw.12306.cn/otn/leftTicket/query?leftTicketDTO.train_date=${trainDate}&leftTicketDTO.from_station=${fromCode}&leftTicketDTO.to_station=${toCode}&purpose_codes=ADULT`
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          if (jsonData.status === 1 && jsonData.data && jsonData.data.result) {
            const trains = jsonData.data.result.slice(0, 5).map(item => {
              const parts = item.split('|')
              const trainNo = parts[3]
              const type = trainNo.substring(0, 1)
              let typeName = '高铁'
              if (type === 'D') typeName = '动车'
              else if (type === 'C') typeName = '城际'
              else if (type === 'Z') typeName = '直达'
              else if (type === 'T') typeName = '特快'
              else if (type === 'K') typeName = '快速'
              
              return {
                trainNo: trainNo,
                type: typeName,
                fromStation: parts[6] || from,
                toStation: parts[7] || to,
                startTime: parts[8] || '',
                endTime: parts[9] || '',
                duration: parts[10] || '',
                seats: parts[30] || '',
                price: parts[26] || '暂无'
              }
            })
            resolve({
              success: true,
              data: trains,
              count: trains.length
            })
          } else {
            resolve({ success: false, error: '查询结果为空' })
          }
        } catch (e) {
          resolve({ success: false, error: '数据解析失败' })
        }
      })
    }).on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })
}

async function callDashScopeWithTools(message, history) {
  const apiKey = process.env.DASHSCOPE_API_KEY
  
  if (!apiKey || apiKey.length === 0) {
    return parseIntent(message)
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
    { role: 'user', content: message }
  ]

  const options = {
    hostname: 'dashscope.aliyuncs.com',
    path: '/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    }
  }

  const data = {
    model: 'qwen-max',
    messages: messages,
    tools: TOOLS,
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2048
  }

  try {
    const response = await httpRequest(options, data)
    
    let content = null
    let toolCalls = null
    
    if (response.choices && response.choices[0]) {
      const choice = response.choices[0]
      if (choice.message) {
        content = choice.message.content
        toolCalls = choice.message.tool_calls
      }
    }
    
    if (toolCalls && toolCalls.length > 0) {
      const toolResults = []
      
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name
        const toolArgs = JSON.parse(toolCall.function.arguments)
        
        if (toolName === 'search_trains') {
          const result = await searchTrainsTool(
            toolArgs.from,
            toolArgs.to,
            toolArgs.date
          )
          toolResults.push({
            toolCallId: toolCall.id,
            result: JSON.stringify(result)
          })
        }
      }
      
      const toolMessages = [
        ...messages,
        { role: 'assistant', content: content || '', tool_calls: toolCalls },
        ...toolResults.map(r => ({
          role: 'tool',
          content: r.result,
          tool_call_id: r.toolCallId
        }))
      ]
      
      const secondData = {
        model: 'qwen-max',
        messages: toolMessages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2048
      }
      
      const secondResponse = await httpRequest(options, secondData)
      
      if (secondResponse.choices && secondResponse.choices[0] && secondResponse.choices[0].message) {
        const secondContent = secondResponse.choices[0].message.content
        try {
          return JSON.parse(secondContent)
        } catch (e) {
          return { action: 'unknown', params: {}, reply: secondContent }
        }
      }
      
      return { action: 'unknown', params: {}, reply: '查询完成' }
    }
    
    if (content) {
      try {
        return JSON.parse(content)
      } catch (e) {
        return { action: 'unknown', params: {}, reply: content }
      }
    }
    
    return parseIntent(message)
  } catch (error) {
    console.error('DashScope API error:', error)
    return parseIntent(message)
  }
}

function parseIntent(text) {
  if (/你好|您好|哈喽|hi|hello/i.test(text)) {
    return { action: 'greeting', params: {}, reply: '您好！我是您的出行小助手，请问您想去哪里？' }
  }
  
  if (/去|到|前往|出发/i.test(text)) {
    const toMatch = text.match(/去(.+?)[，。？\s]/) || text.match(/到(.+?)[，。？\s]/)
    const to = toMatch ? toMatch[1] : '目的地'
    return { action: 'route_plan', params: { to: to }, reply: '好的，我来帮您规划去' + to + '的路线。请问您想什么时候出发呢？' }
  }
  
  return { action: 'unknown', params: {}, reply: '抱歉，我没听懂您的意思。' }
}

exports.main = async (event, context) => {
  console.log('Received event:', JSON.stringify(event))
  
  const { message, history } = event
  
  try {
    const response = await callDashScopeWithTools(message, history || [])
    
    return {
      success: true,
      data: response
    }
  } catch (error) {
    console.error('Agent proxy error:', error)
    return {
      success: false,
      error: error.message,
      data: {
        action: 'unknown',
        params: {},
        reply: '抱歉，我现在有点忙，请稍后再试。'
      }
    }
  }
}
