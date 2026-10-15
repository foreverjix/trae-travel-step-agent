const apiConfig = require('../config/api.js')
const amapService = require('./amap-service.js')

const DASHSCOPE_API_KEY = apiConfig.DASHSCOPE_API_KEY || ''

// ===== 适老化语音语义纠偏预处理引擎 =====
// 在ASR识别结果和AI理解之间增加一层预处理
// 针对老年人说话特点：重复、语序颠倒、句子不完整、口头语多

// 1. 去重复：连续重复的词/短语只保留一次
// "去南京去南京" → "去南京"
// "明天明天我去北京" → "明天我去北京"
function removeRepetition(text) {
  if (!text) return text
  var result = text
  // 2-6字短语的连续重复
  for (var len = 6; len >= 2; len--) {
    var regex = new RegExp('(.{' + len + '})\\1+', 'g')
    result = result.replace(regex, '$1')
  }
  return result
}

// 2. 去口头语：老人常见的无意义填充词
function removeFillers(text) {
  if (!text) return text
  var fillers = [
    '那个', '那个啊', '这个', '这个嘛', '就是', '就是说',
    '嗯', '啊', '呃', '诶', '唉', '哦',
    '然后然后', '然后', '对对对', '对',
    '我想一下', '让我想想'
  ]
  var result = text
  for (var i = 0; i < fillers.length; i++) {
    // 只去掉句首和词间的口头语，保留有语义的
    var regex = new RegExp('^' + fillers[i] + '[，。、\\s]*', 'g')
    result = result.replace(regex, '')
    var regex2 = new RegExp('[，。、\\s]' + fillers[i] + '[，。、\\s]', 'g')
    result = result.replace(regex2, '，')
  }
  // 清理多余标点
  result = result.replace(/[，]{2,}/g, '，')
  result = result.replace(/^[，。、\s]+/, '')
  return result.trim()
}

// 3. 语序修正：识别时间/地点/动作的乱序并重排
// "看孙子明天去南京" → "明天去南京看孙子"
// "去医院下午三点我" → "我下午三点去医院"
function reorderSentence(text) {
  if (!text || text.length < 4) return text

  // 提取时间短语
  var timePhrase = ''
  var timePatterns = [
    /(明天|后天|今天|大后天)/,
    /(上午|下午|晚上|早晨|中午)/,
    /(\d{1,2}点\d{0,2})/,
    /(\d{1,2}:\d{2})/,
    /(周六|周日|周一|周二|周三|周四|周五)/
  ]
  var textWithoutTime = text
  for (var i = 0; i < timePatterns.length; i++) {
    var match = text.match(timePatterns[i])
    if (match) {
      timePhrase = match[0]
      textWithoutTime = textWithoutTime.replace(match[0], '')
      break
    }
  }

  // 提取动作短语（看孙子/去医院/回家/游玩等）
  var actionPhrase = ''
  var actionPatterns = [
    /(看\w{1,3})/,
    /(回\w{0,2})/,
    /(去\w{1,4}看病)/,
    /(游玩|旅游|观光|参观)/,
    /(就医|看病|复诊|挂号|体检)/
  ]
  var textWithoutAction = textWithoutTime
  for (var j = 0; j < actionPatterns.length; j++) {
    var actMatch = textWithoutTime.match(actionPatterns[j])
    if (actMatch) {
      actionPhrase = actMatch[0]
      textWithoutAction = textWithoutAction.replace(actMatch[0], '')
      break
    }
  }

  // 清理剩余文本
  var remaining = textWithoutAction.replace(/[，。、\s]+/g, '').trim()

  // 如果检测到了时间或动作的错位，重组为标准语序
  if (timePhrase || actionPhrase) {
    var parts = []
    // 标准语序：时间 + 主体(我) + 去目的地 + 动作
    if (timePhrase) parts.push(timePhrase)
    if (remaining && remaining !== '我') parts.push(remaining)
    if (remaining !== '我' && remaining.indexOf('去') < 0) {
      // 如果剩余部分没有"去"字，补一个
    }
    if (actionPhrase) parts.push(actionPhrase)

    var reordered = parts.join('')
    // 如果重组后的内容比原文更有序，返回重组结果
    if (reordered.length >= text.length * 0.6) {
      return reordered
    }
  }

  return text
}

// 4. 上下文补全：从对话历史中补全省略信息
// 前文："去南京" → 当前："几点" → 补全为 "去南京几点"
function fillFromContext(text, chatHistory) {
  if (!text || !chatHistory || chatHistory.length === 0) return text

  // 如果当前输入太短（可能是省略语），从历史补全
  if (text.length <= 6) {
    // 找最近一条用户消息
    for (var i = chatHistory.length - 1; i >= 0; i--) {
      if (chatHistory[i].role === 'user') {
        var prevText = chatHistory[i].content || ''
        // 提取前文中的目的地
        var destMatch = prevText.match(/去(.+?)[，。？、]|到(.+?)[，。？、]/)
        if (destMatch) {
          var prevDest = (destMatch[1] || destMatch[2] || '').trim()
          // 当前输入是时间相关词，补全目的地
          if (/(几点|什么时候|上午|下午|明天|后天)/.test(text) && prevDest) {
            return prevDest + text
          }
          // 当前输入是动作，补全目的地
          if (/(游玩|回家|看病)/.test(text) && prevDest) {
            return '去' + prevDest + text
          }
        }
        break
      }
    }
  }

  return text
}

// 语义纠偏主函数
function correctElderlySpeech(rawText, chatHistory) {
  if (!rawText) return rawText

  console.log('[语义纠偏] 原始输入:', rawText)

  var step1 = removeRepetition(rawText)
  var step2 = removeFillers(step1)
  var step3 = reorderSentence(step2)
  var step4 = fillFromContext(step3, chatHistory || [])

  console.log('[语义纠偏] 去重复:', step1)
  console.log('[语义纠偏] 去口头语:', step2)
  console.log('[语义纠偏] 语序修正:', step3)
  console.log('[语义纠偏] 上下文补全:', step4)

  return step4
}

// System Prompt（使用数组 join 避免 ES6 模板字符串，兼容微信小程序编译器）
var SYSTEM_PROMPT = [
  '你是乐龄出行智能助手，专为老年人提供出行规划服务。',
  '',
  '【核心能力：语义理解与实体提取】',
  '老人说话随意、不完整、有方言，你必须从一句话中精准提取以下实体：',
  '- 日期(date)：今天/明天/后天/大后天/明儿个/今儿个/后儿个/周X/几月几号',
  '- 时间(time)：早上X点/上午X点/中午/下午X点/晚上X点/X点/X点半/X点X分',
  '- 目的地(to)：具体地点名称（医院名/车站名/城市名/POI）',
  '- 目的(purpose)：看病/接人/送人/旅游/看孙子/回老家/购物等',
  '- 出行方式(transport)：打车/火车/高铁/公交/地铁/飞机',
  '',
  '【实体提取规则】',
  '1. 日期：支持口语化表达，"明儿个"="明天"，"后儿"="后天"，"今儿"="今天"',
  '2. 时间：支持"早上8点"="上午8点"，"后半晌"="下午"，"傍晚"="晚上"',
  '3. 目的地：从"去xxx"、"到xxx"、"前往xxx"中提取，支持模糊纠错（"伤害"="上海"）',
  '4. 目的：从上下文中推断（"看病"→就医，"看孙子"→探亲）',
  '5. 如果一句话里同时有日期和时间（如"明天早上8点"），都要提取出来',
  '6. 如果只有日期没有时间，date填日期，time留空，不要追问',
  '7. 如果只有时间没有日期，date填"今天"，time填时间',
  '',
  '【你的任务】',
  '1. 理解用户的出行意图',
  '2. 从用户话语中提取所有能提取的实体（日期、时间、目的地、目的、出行方式）',
  '3. 信息不全时智能追问（只缺什么问什么）',
  '4. 信息齐全后生成结构化出行指令',
  '',
  '重要规则：',
  '- "游玩"、"旅游"、"观光"不是目的地，是活动类型',
  '- "回家"、"回去"时，目的地to填"家"',
  '- 必须结合对话历史理解上下文',
  '- params.to必须是具体地点名称',
  '',
  '输出格式要求（必须返回JSON）：',
  '{',
  '  "action": "string",',
  '  "params": {',
  '    "to": "目的地",',
  '    "date": "日期（今天/明天/后天/周X/具体日期）",',
  '    "time": "时间（早上8点/下午3点半/晚上/上午）",',
  '    "purpose": "目的（看病/接人/旅游等）",',
  '    "transport": ["出行方式偏好"]',
  '  },',
  '  "reply": "自然语言回复"',
  '}',
  '',
  'action类型：',
  '- "greeting": 问候',
  '- "go_home": 回家，params.to=家的地址',
  '- "go_hospital": 去医院，params.to=医院名',
  '- "go_station": 去车站，params.to=车站名',
  '- "ask_time": 问时间',
  '- "ask_weather": 问天气',
  '- "cancel": 取消',
  '- "ask_question": 追问，params.question=追问内容',
  '- "call_tool": 调用工具，params.tool=工具名, params.tool_params=工具参数',
  '- "route_plan": 生成方案，params需包含to/date/time/recommend',
  '- "unknown": 无法理解',
  '',
  '【Function Calling 工具调用规则】',
  '当用户明确要去某地且信息齐全时，必须返回 call_tool：',
  '- 跨城市出行 → train_search',
  '- 市内短途 → taxi_order',
  '- 信息不全 → ask_question 追问',
  '',
  '可用工具：',
  '1. train_search: {"from":"出发城市","to":"目的城市","date":"出行日期"}',
  '2. taxi_order: {"from":"出发地","to":"目的地"}',
  '',
  '工具调用流程：',
  '第一轮：AI返回 call_tool → 系统执行工具返回数据',
  '第二轮：AI基于真实数据返回 route_plan + 适老化推荐理由',
  '',
  'reply字段：语气亲切温暖，适合老年人，简短明了',
  '',
  '示例1 - 完整提取：',
  '用户："明儿个早上8点去上海看孙子"',
  '输出：{"action":"call_tool","params":{"tool":"train_search","tool_params":{"from":"太原","to":"上海","date":"明天"}},"reply":"好的，我帮您查明儿个早上去上海的火车。"}',
  '',
  '示例2 - 只有日期：',
  '用户："后天去南京"',
  '输出：{"action":"call_tool","params":{"tool":"train_search","tool_params":{"from":"太原","to":"南京","date":"后天"}},"reply":"好的，我帮您查后天去南京的火车。"}',
  '',
  '示例3 - 只有时间：',
  '用户："下午3点去医院"',
  '输出：{"action":"route_plan","params":{"to":"医院","date":"今天","time":"下午3点","purpose":"看病"},"reply":"好的，我帮您规划今天下午3点去医院的路线。"}',
  '',
  '示例4 - 需要追问：',
  '用户："去西湖"',
  '输出：{"action":"ask_question","params":{"question":"出行日期和时间"},"reply":"好的，我来帮您规划去西湖的路线。请问您想什么时候出发呢？"}',
  '',
  '示例5 - 方言纠错：',
  '用户："明儿个我想去伤害看病"',
  '输出：{"action":"route_plan","params":{"to":"上海","date":"明天","time":"","purpose":"看病"},"reply":"好的，我帮您规划明天去上海看病的路线。"}',
  '',
  '示例6 - 市内打车：',
  '用户："帮我叫个车去省人民医院"',
  '输出：{"action":"call_tool","params":{"tool":"taxi_order","tool_params":{"from":"当前位置","to":"省人民医院"}},"reply":"好的，我帮您查一下去省人民医院的打车信息。"}'
].join('\n')

function request(options) {
  return new Promise((resolve, reject) => {
    var settled = false
    var timeoutMs = options.timeout || 10000
    var timer = setTimeout(function() {
      if (settled) return
      settled = true
      reject(new Error('请求超时(' + timeoutMs + 'ms)'))
    }, timeoutMs)
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      header: options.header || {},
      data: options.data || {},
      timeout: timeoutMs,
      success: (res) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error('HTTP ' + res.statusCode))
        }
      },
      fail: (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err)
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

async function callDashScopeAPI(message, chatHistory, toolResult) {
  if (!DASHSCOPE_API_KEY) {
    console.log('未配置通义千问API Key，使用本地NLP')
    return null
  }

  try {
    const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatHistory.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: message }
    ]

    // Function Calling 第二轮：把工具执行结果作为 system 消息注入，让 AI 基于真实数据生成推荐
    if (toolResult) {
      messages.push({ role: 'assistant', content: JSON.stringify({ action: 'call_tool', params: toolResult.toolCall }) })
      messages.push({
        role: 'user',
        content: '【工具执行结果】以下是 ' + toolResult.toolName + ' 工具返回的真实数据，请基于这些数据生成 route_plan 推荐方案，并在 recommend 字段给出适老化推荐理由（考虑老人体力、作息、安全）：\n' + JSON.stringify(toolResult.data)
      })
    }

    const result = await request({
      url: url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DASHSCOPE_API_KEY
      },
      data: {
        model: 'qwen-turbo',
        input: {
          messages: messages
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 1024
        }
      }
    })

    console.log('通义千问API结果:', JSON.stringify(result))

    if (result.output && result.output.text) {
      return result.output.text
    }

    return null
  } catch (error) {
    console.error('通义千问API调用失败:', error)
    return null
  }
}

// ===== Function Calling 工具实现 =====
// 工具定义：AI 通过 call_tool action 调用以下工具获取真实数据
// 当前因 12306 / 网约车 API 需政府/企业授权，使用本地模拟数据
// 获得授权后，只需替换 callTrainSearchTool / callTaxiOrderTool 内部的请求实现即可

// 火车票查询工具（模拟 12306 API）
// 真实对接时替换为：https://kyfw.12306.cn/otn/leftTicket/query?leftTicketDTO=...
async function callTrainSearchTool(toolParams) {
  var from = toolParams.from || '太原'
  var to = toolParams.to || ''
  var date = toolParams.date || '今天'

  console.log('[工具调用] train_search:', from, '→', to, '日期:', date)

  if (!to) {
    return { success: false, error: '缺少目的地' }
  }

  // TODO: 获得授权后，替换为真实 12306 API 调用
  // const res = await request({
  //   url: 'https://kyfw.12306.cn/otn/leftTicket/query',
  //   method: 'GET',
  //   data: { 'leftTicketDTO.train_date': dateStr, 'leftTicketDTO.from_station': fromCode, 'leftTicketDTO.to_station': toCode, purpose_codes: 'ADULT' }
  // })

  // 当前使用本地模拟数据（基于真实车次格式）
  var trains = generateMockTrainList(from, to, date)

  return {
    success: true,
    toolName: 'train_search',
    toolCall: { tool: 'train_search', tool_params: toolParams },
    data: {
      from: from,
      to: to,
      date: date,
      trains: trains,
      total: trains.length
    }
  }
}

// 打车查询工具（模拟网约车平台 API）
// 真实对接时替换为：滴滴/高德打车开放平台 API
async function callTaxiOrderTool(toolParams) {
  var from = toolParams.from || '当前位置'
  var to = toolParams.to || ''

  console.log('[工具调用] taxi_order:', from, '→', to)

  if (!to) {
    return { success: false, error: '缺少目的地' }
  }

  // TODO: 获得授权后，替换为真实网约车 API 调用
  // const res = await request({
  //   url: 'https://api.xiaojukeji.com/v2/estimatePrice',
  //   data: { start_lat, start_lng, end_lat, end_lng }
  // })

  // 当前使用本地模拟数据
  var options = [
    { type: '快车', price: 18, duration: '约15分钟', eta: '3分钟到', seats: 4, desc: '经济实惠' },
    { type: '优享', price: 25, duration: '约15分钟', eta: '4分钟到', seats: 4, desc: '车型更好' },
    { type: '专车', price: 38, duration: '约15分钟', eta: '5分钟到', seats: 4, desc: '专车服务' }
  ]

  return {
    success: true,
    toolName: 'taxi_order',
    toolCall: { tool: 'taxi_order', tool_params: toolParams },
    data: {
      from: from,
      to: to,
      distance: '约5.2公里',
      options: options,
      total: options.length
    }
  }
}

// 工具分发器：根据 AI 返回的 tool 名称调用对应工具
async function callTool(toolName, toolParams) {
  console.log('[Function Calling] 调用工具:', toolName, '参数:', toolParams)
  switch (toolName) {
    case 'train_search':
      return await callTrainSearchTool(toolParams)
    case 'taxi_order':
      return await callTaxiOrderTool(toolParams)
    default:
      console.warn('[Function Calling] 未知工具:', toolName)
      return { success: false, error: '未知工具: ' + toolName }
  }
}

// 生成模拟火车票列表（格式与 12306 真实返回一致，便于未来替换）
function generateMockTrainList(from, to, date) {
  var mainStations = {
    '北京': '北京南站', '上海': '上海虹桥站', '南京': '南京南站',
    '杭州': '杭州东站', '广州': '广州南站', '深圳': '深圳北站',
    '西安': '西安北站', '成都': '成都东站', '武汉': '武汉站',
    '天津': '天津西站', '太原': '太原南站'
  }
  var fromStation = mainStations[from] || (from + '站')
  var toStation = mainStations[to] || (to + '站')

  return [
    { trainNo: 'G1954', type: '高铁', fromStation: fromStation, toStation: toStation, departTime: '09:20', arriveTime: '14:10', duration: '4小时50分', price: 353, seatType: '二等座', tickets: '有' },
    { trainNo: 'G1862', type: '高铁', fromStation: fromStation, toStation: toStation, departTime: '11:35', arriveTime: '16:40', duration: '5小时05分', price: 353, seatType: '二等座', tickets: '有' },
    { trainNo: 'Z268', type: '直达', fromStation: fromStation, toStation: toStation, departTime: '19:00', arriveTime: '次日06:30', duration: '11小时30分', price: 180, seatType: '硬卧', tickets: '有' }
  ]
}

// 从 AI 回复中提取 JSON 结构化结果
function parseAIReply(reply) {
  if (!reply) return null
  try {
    var jsonMatch = reply.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.log('[AI回复解析] JSON解析失败，走NLP fallback')
  }
  return null
}

async function callAI(message, chatHistory) {
  // 适老化语义纠偏预处理
  var correctedMessage = correctElderlySpeech(message, chatHistory || [])

  // ===== 第一轮：AI 理解意图，判断是否需要调用工具 =====
  const aiReply = await callDashScopeAPI(correctedMessage, chatHistory || [])

  if (aiReply) {
    var parsedResult = parseAIReply(aiReply)

    if (parsedResult) {
      // 修正活动类型误判为目的地
      if (parsedResult.params && parsedResult.params.to &&
          ['游玩', '旅游', '观光', '游览', '回家', '回去'].indexOf(parsedResult.params.to) >= 0) {
        console.log('AI返回的to字段是活动类型，需要修正')
        var correctedResult = parseNLP(message, chatHistory || [])
        if (correctedResult.destination && correctedResult.destination !== parsedResult.params.to) {
          parsedResult.params.to = correctedResult.destination
        }
      }

      // ===== Function Calling 工具调用循环 =====
      // 当 AI 返回 call_tool 时：执行工具 → 拿到真实数据 → 第二轮 AI 调用生成适老化推荐
      if (parsedResult.action === 'call_tool' && parsedResult.params && parsedResult.params.tool) {
        var toolName = parsedResult.params.tool
        var toolParams = parsedResult.params.tool_params || {}
        console.log('[Function Calling] AI请求调用工具:', toolName)

        var toolResult = await callTool(toolName, toolParams)

        if (toolResult && toolResult.success) {
          console.log('[Function Calling] 工具执行成功，进行第二轮AI调用生成推荐')
          // 第二轮：把工具结果交给 AI，生成带适老化推荐理由的 route_plan
          var secondReply = await callDashScopeAPI(correctedMessage, chatHistory || [], toolResult)
          if (secondReply) {
            var secondResult = parseAIReply(secondReply)
            if (secondResult) {
              // 附加工具返回的原始数据，供前端展示车次/打车详情
              secondResult.toolResult = toolResult.data
              secondResult.usedTool = toolName
              return secondResult
            }
          }
          // 第二轮 AI 失败，返回工具数据 + 第一轮回复兜底
          var nlpBackup2 = parseNLP(message, chatHistory || [])
          return {
            action: 'route_plan',
            params: {
              to: toolParams.to || nlpBackup2.destination || '',
              date: toolParams.date || nlpBackup2.date || '',
              time: nlpBackup2.time || '',
              purpose: nlpBackup2.purpose || ''
            },
            reply: parsedResult.reply || '已为您查询到相关信息',
            toolResult: toolResult.data,
            usedTool: toolName
          }
        } else {
          // 工具执行失败
          console.warn('[Function Calling] 工具执行失败:', toolResult)
          return {
            action: 'unknown',
            params: {},
            reply: '抱歉，查询信息时出了点问题，请稍后再试。'
          }
        }
      }

      // 非 call_tool，用 NLP 结果补全 AI 缺失的字段
      var nlpBackup = parseNLP(message, chatHistory || [])
      if (parsedResult.params) {
        if (!parsedResult.params.date && nlpBackup.date) {
          parsedResult.params.date = nlpBackup.date
          console.log('[AI] NLP补全date:', nlpBackup.date)
        }
        if (!parsedResult.params.time && nlpBackup.time) {
          parsedResult.params.time = nlpBackup.time
          console.log('[AI] NLP补全time:', nlpBackup.time)
        }
        if (!parsedResult.params.to && nlpBackup.destination) {
          parsedResult.params.to = nlpBackup.destination
          console.log('[AI] NLP补全to:', nlpBackup.destination)
        }
        if (!parsedResult.params.purpose && nlpBackup.purpose) {
          parsedResult.params.purpose = nlpBackup.purpose
          console.log('[AI] NLP补全purpose:', nlpBackup.purpose)
        }
      }
      return parsedResult
    }

    // JSON 解析失败，走 NLP fallback
    var nlpResult2 = parseNLP(message, chatHistory || [])
    var destination = nlpResult2.destination || ''

    if (destination && ['游玩', '旅游', '观光', '游览', '回家', '回去', '家'].indexOf(destination) < 0) {
      var poiResult = await amapService.searchPOI(destination)
      if (poiResult.success && poiResult.data.length > 0) {
        destination = poiResult.data[0].name
        console.log('高德POI搜索到:', destination)
      }
    }

    return {
      action: nlpResult2.intent,
      params: {
        to: destination,
        date: nlpResult2.date || '',
        time: nlpResult2.time || '',
        purpose: nlpResult2.purpose || ''
      },
      reply: aiReply
    }
  }

  return await generateFallbackResponse(message, chatHistory || [])
}

async function planTrip(tripPlan) {
  return {
    success: true,
    routes: generateRoutes(tripPlan),
    trip_plan: tripPlan
  }
}

async function generateFallbackResponse(message, chatHistory) {
  const nlpResult = parseNLP(message, chatHistory || [])
  var destination = nlpResult.destination || ''

  if (destination && nlpResult.intent === 'route_plan' &&
      !['游玩', '旅游', '观光', '游览', '回家', '回去', '家'].includes(destination)) {
    var poiResult = await amapService.searchPOI(destination)
    if (poiResult.success && poiResult.data.length > 0) {
      destination = poiResult.data[0].name
      console.log('高德POI搜索到:', destination)
    }
  }

  const patterns = [
    { regex: /去.*(北京|上海|广州|深圳|成都|杭州|西安|南京|武汉|天津|重庆)/, response: "好的，您想去$1，我帮您规划行程！" },
    { regex: /(订|买|规划).*(车票|火车票|高铁|飞机)/, response: "好的，我来帮您查询并预订！" },
    { regex: /(医院|看病|就诊)/, response: "好的，我帮您规划去医院的路线！" },
    { regex: /(打车|叫车)/, response: "好的，我帮您叫车！" },
    { regex: /(帮助|帮忙|怎么)/, response: "我可以帮您规划行程、订火车票、打车、查询公交路线等。" },
    { regex: /(你好|您好|嗨)/, response: "您好！我是您的出行小助手，请问您想去哪里？" }
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern.regex)
    if (match) {
      let response = pattern.response
      if (match[1]) {
        response = response.replace('$1', match[1])
      }
      return {
        action: 'route_plan',
        params: { to: destination || match[1] || '' },
        reply: response
      }
    }
  }

  if (nlpResult.intent === 'route_plan' && destination) {
    return {
      action: 'route_plan',
      params: { to: destination },
      reply: '好的，我来帮您规划去' + destination + '的路线。请问您想什么时候出发呢？'
    }
  }

  if (nlpResult.activity === '游玩' && destination) {
    return {
      action: 'route_plan',
      params: { to: destination },
      reply: '好的，我来帮您规划去' + destination + '游玩的路线。请问您想什么时候出发呢？'
    }
  }

  if (nlpResult.intent === 'go_home' && destination) {
    return {
      action: 'go_home',
      params: { to: destination },
      reply: '好的，我来帮您规划回家的路线。请问您想什么时候出发呢？'
    }
  }

  return {
    action: 'unknown',
    params: {},
    reply: "抱歉，我不太明白您的意思。您可以说：我想去北京、帮我订明天去医院的车、查询后天去上海的火车票。"
  }
}

function generateRoutes(tripPlan) {
  const travelTypes = {
    'train': '火车',
    'high_speed': '高铁',
    'plane': '飞机',
    'taxi': '打车',
    'bus': '公交',
    'subway': '地铁'
  }

  const type = tripPlan.travel_type || 'high_speed'

  if (type === 'taxi') {
    return [
      { type: 'taxi', name: '快车', departure: '当前位置', arrival: tripPlan.destination, duration: '约25分钟', price: 35, status: '立即接单' },
      { type: 'taxi', name: '优享', departure: '当前位置', arrival: tripPlan.destination, duration: '约25分钟', price: 45, status: '立即接单' },
      { type: 'taxi', name: '专车', departure: '当前位置', arrival: tripPlan.destination, duration: '约25分钟', price: 65, status: '立即接单' }
    ]
  } else if (type === 'bus') {
    return [
      { type: 'bus', name: '101路', departure: '府西街口', arrival: tripPlan.destination, duration: '约40分钟', price: 2, stops: 12, status: '运营中' },
      { type: 'bus', name: '102路', departure: '鼓楼街', arrival: tripPlan.destination, duration: '约45分钟', price: 2, stops: 15, status: '运营中' }
    ]
  } else if (type === 'plane') {
    return [
      { type: 'plane', name: 'CA1234', departure: '太原武宿', arrival: tripPlan.destination + '机场', departure_time: '09:00', arrival_time: '11:00', duration: '2小时', price: 800, status: '有票' },
      { type: 'plane', name: 'MU5678', departure: '太原武宿', arrival: tripPlan.destination + '机场', departure_time: '14:00', arrival_time: '16:00', duration: '2小时', price: 900, status: '有票' }
    ]
  } else {
    return [
      { type: 'high_speed', name: 'G101次', departure: '太原南', arrival: tripPlan.destination + '北', departure_time: '08:00', arrival_time: '12:30', duration: '4小时30分', price: 350, seats: '二等座', status: '有票' },
      { type: 'high_speed', name: 'G103次', departure: '太原南', arrival: tripPlan.destination + '北', departure_time: '10:30', arrival_time: '15:00', duration: '4小时30分', price: 350, seats: '二等座', status: '有票' },
      { type: 'train', name: 'Z101次', departure: '太原', arrival: tripPlan.destination, departure_time: '19:00', arrival_time: '次日07:00', duration: '12小时', price: 180, seats: '硬卧', status: '有票' }
    ]
  }
}

function _extractDestination(text) {
  if (!text) return ''
  var normalized = correctElderlySpeech(text, []) || text

  // Step 1：先尝试精确匹配 去/到/前往 + 直到 时间词/标点/句子尾
  // 例 "我明天早上想去南京" → 先找 "想去南京"
  var patterns = [
    /(?:我|我们)?\s*(?:想|要|想要|打算|准备)?\s*(?:去|到|前往|赶去|出发去|去一下|去往)\s*([\u4e00-\u9fa5A-Za-z0-9·\-（）()《》]+?)\s*(?:[，。？、,!！；;~~\s]|明天|后天|今天|大后天|周六|周日|周一|周二|周三|周四|周五|上午|下午|晚上|早晨|早上|中午|夜晚|晚间|傍晚|点|:|$)/,
    /(?:从|由)[\u4e00-\u9fa5A-Za-z0-9]+?(?:出发|走|去)?\s*(?:到|去|前往)\s*([\u4e00-\u9fa5A-Za-z0-9·\-（）()《》]+)/
  ]
  for (var i = 0; i < patterns.length; i++) {
    var m = normalized.match(patterns[i])
    if (m && m[1]) {
      var cand = m[1].trim()
      if (cand && cand.length >= 2) {
        var cleaned = _cleanDestination(cand)
        if (cleaned && cleaned.length >= 2) return cleaned
      }
    }
  }

  // Step 2：没有前缀，取整个句子剔除 时间/助词/前缀词 后的剩余部分
  var stripped = normalized
  stripped = stripped.replace(/^(我|我们|俺|咱|咱们|他|她|它|爸|妈|爸媽|爸妈|父亲|母亲|爷爷|奶奶|外公|外婆|孩子|小孩|老伴儿?|朋友|同事)\s*/, '')
  stripped = stripped.replace(/^(要|想|想要|打算|准备|需要|给|帮我|帮咱?|请|麻烦|看|查|找|订|买|叫|打|约|安排|规划|走|出发|坐车|乘车|去一下)\s*/, '')
  stripped = stripped.replace(/(明天|后天|今天|大后天|周六|周日|周一|周二|周三|周四|周五)/g, '')
  stripped = stripped.replace(/(上午|下午|晚上|早晨|早上|中午|夜晚|晚间|傍晚)/g, '')
  stripped = stripped.replace(/\d+\s*(?:点|:)\s*\d*/g, '')
  stripped = stripped.replace(/[，。？、,!！；;~~\s]+/g, '')
  stripped = _cleanDestination(stripped)
  if (stripped && stripped.length >= 2) return stripped
  return ''
}

function parseNLP(text, chatHistory) {
  var result = {
    intent: 'route_plan',
    destination: '',
    date: '',
    time: '',
    activity: ''
  }

  if (!text) return result

  if (/你好|您好|哈喽|hi|hello|嘿|嗨/i.test(text)) {
    result.intent = 'greeting'
    return result
  }

  if (/取消|退出|结束|重来|算了/i.test(text)) {
    result.intent = 'cancel'
    return result
  }

  if (/几点|时间|现在几点|现在时间/i.test(text)) {
    result.intent = 'ask_time'
    return result
  }

  if (/天气|下雨|晴天|温度|冷|热/i.test(text)) {
    result.intent = 'ask_weather'
    return result
  }

  var dateMatch = text.match(/(明天|后天|今天|大后天|周六|周日|周一|周二|周三|周四|周五)/)
  if (dateMatch) {
    result.date = dateMatch[1]
  }

  var timeMatch = text.match(/(上午|下午|晚上|早晨|中午|早上)?\s*(\d+点\d*|\d+:\d+)/) || text.match(/(\d+点\d*|\d+:\d+)/) || text.match(/(上午|下午|晚上|早晨|中午|早上|傍晚)/)
  if (timeMatch) {
    if (timeMatch[2]) {
      result.time = (timeMatch[1] || '') + timeMatch[2]
    } else {
      result.time = timeMatch[1] || timeMatch[0]
    }
  }

  var activityKeywords = ['游玩', '旅游', '观光', '游览', '参观', '度假']
  var homeKeywords = ['回家', '回家里', '我家', '家里', '回去']
  var hospitalKeywords = ['医院', '就医', '看病', '挂号', '复诊', '体检', '就诊']
  var stationKeywords = ['车站', '火车站', '动车站', '高铁站', '火车', '动车', '高铁']
  var airportKeywords = ['机场', '飞机', '航班', '航站楼']

  var isHomeOnly = homeKeywords.some(function(k){ return text.indexOf(k)>=0 })
  var isHospitalOnly = hospitalKeywords.some(function(k){ return text.indexOf(k)>=0 })
  var isStationOnly = stationKeywords.some(function(k){ return text.indexOf(k)>=0 })
  var isAirportOnly = airportKeywords.some(function(k){ return text.indexOf(k)>=0 })

  // Step 1：优先用正则+截断策略提取目的地（解决"我明天早上想去南京"变成"我"的问题）
  var dest = _extractDestination(text)

  // Step 2：特殊高频词兜底
  if (!dest || dest.length < 2) {
    if (isHospitalOnly) {
      var hospitalMatch = text.match(/(省人民医院|市人民医院|中医院|中心医院|第一医院|第二医院|妇幼保健院|儿童医院|[\u4e00-\u9fa5]+?(?:人民)?医院)/)
      dest = hospitalMatch ? hospitalMatch[1] : '医院'
    } else if (isStationOnly) {
      var stationMatch = text.match(/([\u4e00-\u9fa5]{2,}(?:南站|北站|西站|东站|车站|火车站|高铁站|动车站)?火车站|[\u4e00-\u9fa5]{2,}(?:南|北|西|东)?站)/)
      dest = stationMatch ? stationMatch[1] : '火车站'
    } else if (isAirportOnly) {
      var airportMatch = text.match(/([\u4e00-\u9fa5]{2,}(?:国际)?机场|[\u4e00-\u9fa5]{2,}(?:国际)?航站)/)
      dest = airportMatch ? airportMatch[1] : '机场'
    } else if (isHomeOnly) {
      dest = '家'
      result.intent = 'go_home'
    }
  }

  // Step 3：历史对话兜底
  if ((!dest || dest.length < 2) && chatHistory && chatHistory.length > 0) {
    for (var i = chatHistory.length - 1; i >= 0; i--) {
      var msg = chatHistory[i]
      if (msg.role === 'user') {
        var prev = _extractDestination(msg.content || msg.message || '')
        if (prev && prev.length >= 2) { dest = prev; break }
      }
    }
  }

  if (dest) result.destination = dest

  if (activityKeywords.some(function(k){return text.indexOf(k)>=0}) && !result.destination) {
    result.activity = '游玩'
  }

  return result
}

// ===== 页面操作指导 AI =====
// 专门用于AI助手悬浮球，读取页面内容并指导老人操作
// 增强版：支持丰富页面上下文、任务完成检测、自动填表单/触发操作

async function callPageGuideAI(userMessage, pageContext, chatHistory) {
  if (!DASHSCOPE_API_KEY) {
    return getPageGuideFallback(userMessage, pageContext)
  }

  // 构建丰富的页面上下文描述
  var contextDesc = '当前页面：' + (pageContext.title || '某个') + '。'
  if (pageContext.summary) contextDesc += '页面功能：' + pageContext.summary + '。'
  if (pageContext.actions && pageContext.actions.length > 0) {
    contextDesc += '页面上的按钮和操作有：' + pageContext.actions.join('、') + '。'
  }
  if (pageContext.formFields && pageContext.formFields.length > 0) {
    contextDesc += '页面上的输入框有：' + pageContext.formFields.join('、') + '。'
  }
  if (pageContext.formData) {
    var formDataDesc = []
    for (var key in pageContext.formData) {
      if (pageContext.formData[key]) {
        formDataDesc.push(key + '已填"' + pageContext.formData[key] + '"')
      } else {
        formDataDesc.push(key + '未填')
      }
    }
    if (formDataDesc.length > 0) contextDesc += '当前表单状态：' + formDataDesc.join('，') + '。'
  }
  if (pageContext.tips) {
    contextDesc += '操作提示：' + pageContext.tips + '。'
  }

  var pageGuidePrompt = [
    '你是乐龄出行的语音助手，像真人助理一样帮助老年人使用手机小程序。',
    '',
    '【你的角色】',
    '你是一个耐心、温暖、专业的语音助手。老人通过语音和你对话，你不仅要告诉老人怎么操作，更要帮老人完成操作。',
    '',
    '【当前页面信息】',
    contextDesc,
    '',
    '【你的能力】',
    '1. 理解老人说的话，提取其中的时间、地点等信息',
    '2. 如果页面有输入框，可以直接帮老人把信息填进去（设置fillFields）',
    '3. 如果信息都填完了，可以直接触发查询/叫车等操作（设置triggerAction）',
    '4. 告诉老人你已经做了什么，不用老人自己动手',
    '',
    '【对话规则】',
    '1. reply回复必须简短（30字以内），用大白话，像说话一样自然',
    '2. 不要说"我帮您填了"，要说"我已经帮您填好了"；不要说"请点击"，要说"您直接看结果就行"',
    '3. 提取到的信息填到fillFields，key是输入框名称（从页面信息里的输入框列表选），value是内容',
    '4. triggerAction支持的值：search（查询）、confirm（确认）、call（叫车）、plan（规划）',
    '5. 如果老人说谢谢、知道了、明白了、好了等结束语，taskComplete设为true',
    '6. 如果老人的问题已经回答清楚，且没有追问，认为任务完成',
    '',
    '【输出格式】',
    '必须返回JSON：',
    '{"reply":"语音回复","fillFields":{},"triggerAction":"","taskComplete":false}',
    '- fillFields和triggerAction没有就留空字符串或空对象',
    '',
    '【示例 - 票务页】',
    '老人："明天去北京"',
    '→ {"reply":"好的，我帮您填好了，明天去北京，对吗？","fillFields":{"目的地":"北京","出发日期":"明天"},"triggerAction":"","taskComplete":false}',
    '',
    '老人："查一下"',
    '→ {"reply":"好的，这就帮您查","fillFields":{},"triggerAction":"search","taskComplete":false}',
    '',
    '老人："好的谢谢"',
    '→ {"reply":"不客气，有问题再叫我","fillFields":{},"triggerAction":"","taskComplete":true}',
    '',
    '【示例 - 打车页】',
    '老人："打车去省人民医院"',
    '→ {"reply":"好的，我帮您填好了，去省人民医院，对吗？","fillFields":{"目的地":"省人民医院"},"triggerAction":"","taskComplete":false}',
    '',
    '老人："叫车"',
    '→ {"reply":"好的，正在帮您叫车，请稍等","fillFields":{},"triggerAction":"call","taskComplete":false}',
    '',
    '【示例 - 首页】',
    '老人："我想买票"',
    '→ {"reply":"好的，我帮您打开买票页面","fillFields":{},"triggerAction":"ticket","taskComplete":false}',
    '',
    '老人："我要打车"',
    '→ {"reply":"好的，我帮您打开打车页面","fillFields":{},"triggerAction":"taxi","taskComplete":false}'
  ].join('\n')

  try {
    const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

    var messages = [
      { role: 'system', content: pageGuidePrompt },
      ...((chatHistory || []).slice(-6).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }))),
      { role: 'user', content: userMessage }
    ]

    const result = await withTimeout(request({
      url: url,
      method: 'POST',
      timeout: 8000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DASHSCOPE_API_KEY
      },
      data: {
        model: 'qwen-turbo',
        input: { messages: messages },
        parameters: { temperature: 0.5, max_tokens: 400 }
      }
    }), 8000)

    if (result.output && result.output.text) {
      var parsed = parseAIReply(result.output.text)
      if (parsed && parsed.reply) {
        return {
          reply: parsed.reply,
          fillFields: parsed.fillFields || {},
          triggerAction: parsed.triggerAction || '',
          taskComplete: parsed.taskComplete === true
        }
      }
      // JSON解析失败，直接用文本
      return { reply: result.output.text, fillFields: {}, triggerAction: '', taskComplete: false }
    }
    return getPageGuideFallback(userMessage, pageContext)
  } catch (e) {
    console.log('[页面指导AI] 调用失败，使用本地fallback:', e)
    return getPageGuideFallback(userMessage, pageContext)
  }
}

// ===== 多维度AI安全预警分析 =====
// 流程：本地规则引擎负责检测（快、准、不依赖网络）
//       AI agent负责二次分析（基于老人画像、时间、天气、路段特征生成人性化风险说明与处置建议）
// 适用场景：轨迹偏离、长时间静止、错过站点、衔接时间紧张、位置异常

var SAFETY_ANALYZE_SYSTEM_PROMPT = [
  '你是乐龄出行的安全预警分析师，专为老年出行人子女提供风险说明。',
  '输出严格JSON格式：{"riskLevel":"high|medium|low","title":"不超10字的预警标题","desc":"不超40字的人性化描述，包含具体数值，站在子女视角说人话","suggestion":"不超30字的处置建议","confidence":0.85}',
  'riskLevel标准：偏离>800m/错过站→high；500-800m/静止>15min→medium；<500m/静止<15min→low',
  '说明中要包含具体数值（如偏离距离、静止时长、缓冲时间剩余），不要空泛。'
].join('\n')

function _getDefaultSafetyAlert(alertType, ctx) {
  var now = new Date()
  var timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  switch (alertType) {
    case 'deviation':
      return {
        riskLevel: 'high', title: '轨迹偏离警告',
        desc: '检测到父母当前位置偏离规划路线超过' + (ctx.deviationMeters || 500) + '米，请确认是否安全',
        suggestion: '建议立即联系父母确认位置', time: timeStr, confidence: 0.6
      }
    case 'stationary':
      return {
        riskLevel: 'medium', title: '长时间静止提醒',
        desc: '父母已在同一位置停留超过' + (ctx.stationaryMinutes || 15) + '分钟，可能遇到困难',
        suggestion: '建议联系父母询问是否需要帮助', time: timeStr, confidence: 0.6
      }
    case 'missed_station':
      return {
        riskLevel: 'high', title: '错过站点警告',
        desc: '检测到父母可能错过' + (ctx.stationName || '目标站') + '，请确认是否需要帮助',
        suggestion: '立即联系父母并查看站点后续车次', time: timeStr, confidence: 0.6
      }
    case 'connection':
      if (ctx.status === 'danger') {
        return {
          riskLevel: 'high', title: '衔接时间紧张',
          desc: '从出发地到车站仅剩缓冲时间' + (ctx.bufferLeft || 0) + '分钟，建议提前' + Math.ceil((ctx.bufferNeeded || 40) + 10) + '分钟出门',
          suggestion: '尽快出门并预留充足检票时间', time: timeStr, confidence: 0.6
        }
      } else {
        return {
          riskLevel: 'medium', title: '衔接时间尚可',
          desc: '预计还剩' + (ctx.bufferLeft || 0) + '分钟缓冲，建议至少提前' + (ctx.bufferNeeded || 30) + '分钟出门',
          suggestion: '按计划出门即可，注意检票提醒', time: timeStr, confidence: 0.6
        }
      }
    case 'late_arrival':
      return {
        riskLevel: 'medium', title: '到站时间较晚',
        desc: '预计' + (ctx.arrivalTime || '22:00') + '到达目的地，天色较晚',
        suggestion: '提醒父母注意安全，到站后及时联系', time: timeStr, confidence: 0.6
      }
    default:
      return {
        riskLevel: 'medium', title: '安全提醒',
        desc: '检测到异常，请及时确认老人状态',
        suggestion: '立即联系老人确认', time: timeStr, confidence: 0.5
      }
  }
}

async function analyzeSafetyAlert(alertType, ctx) {
  if (!alertType) return _getDefaultSafetyAlert('deviation', ctx || {})
  var context = ctx || {}
  var fallback = _getDefaultSafetyAlert(alertType, context)

  if (!DASHSCOPE_API_KEY) {
    console.log('[安全预警] 未配置通义千问API Key，使用本地兜底')
    return fallback
  }

  try {
    var userPrompt =
      '预警类型：' + alertType + '\n' +
      '上下文数据：' + JSON.stringify(context) + '\n' +
      '请基于以上数据输出JSON，title字段不要超过10个字，desc不超过40字必须含具体数值，suggestion要可执行不超30字。'

    const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    const messages = [
      { role: 'system', content: SAFETY_ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]

    var result = await withTimeout(request({
      url: url, method: 'POST',
      header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DASHSCOPE_API_KEY },
      data: {
        model: 'qwen-turbo',
        input: { messages: messages },
        parameters: { temperature: 0.3, max_tokens: 384 }
      }
    }), 3000)

    var text = result && result.output && result.output.text ? result.output.text : ''
    if (!text) {
      console.warn('[安全预警] AI无返回，使用本地兜底')
      return fallback
    }

    var parsed = parseAIReply(text)
    if (parsed && parsed.title) {
      var now = new Date()
      return {
        riskLevel: parsed.riskLevel || fallback.riskLevel,
        title: parsed.title || fallback.title,
        desc: parsed.desc || fallback.desc,
        suggestion: parsed.suggestion || fallback.suggestion,
        confidence: Number(parsed.confidence) || 0.9,
        time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
      }
    }

    return fallback
  } catch (e) {
    console.warn('[安全预警] AI分析失败，使用本地兜底:', e && e.message)
    return fallback
  }
}

// 本地兜底：根据页面类型给出操作指导（含 fillFields 提取）
function getPageGuideFallback(userMessage, pageContext) {
  var page = pageContext.page || ''
  var msg = (userMessage || '').toLowerCase()
  var reply = ''
  var taskComplete = false
  var fillFields = {}

  // 先用本地NLP提取实体（目的地、日期、时间）
  var nlpResult = parseNLP(userMessage || '', [])
  var destination = nlpResult.destination || ''
  var date = nlpResult.date || ''
  var time = nlpResult.time || ''

  // 任务完成检测：老人说结束语
  if (/谢谢|感谢|知道了|明白了|好了|行了|不用了|没了|可以了|妥了|收到/.test(msg)) {
    taskComplete = true
    return { reply: '不客气，有问题随时叫我，我先退下了', taskComplete: true, fillFields: {} }
  }

  // 通用意图识别
  var wantsHelp = /怎么|如何|不会|不懂|帮|什么|哪|咋/.test(msg)
  var wantsBuy = /买|订|订票|购票|车票|票/.test(msg)
  var wantsGo = /去|到|走|出发/.test(msg)
  var wantsCheck = /查看|查|看|我的|列表/.test(msg)

  // 构建 fillFields：将NLP提取的实体映射到页面字段
  var formFields = pageContext.formFields || []
  if (formFields.indexOf('目的地') >= 0 && destination) {
    fillFields['目的地'] = destination
  }
  if (formFields.indexOf('出发日期') >= 0 && date) {
    fillFields['出发日期'] = date
  }
  if (formFields.indexOf('出发地') >= 0) {
    // 出发地通常已有定位，不主动覆盖；除非用户明确说了
  }

  if (page === 'ticket') {
    if (wantsBuy || wantsGo) {
      var destMatch = msg.match(/去(.{2,6})/) || msg.match(/到(.{2,6})/)
      if (destMatch && !destination) {
        destination = destMatch[1]
        fillFields['目的地'] = destination
      }
      if (destination) {
        reply = '好的，我帮您填好了，' + destination + '，' + (date ? date : '') + '，您直接看结果就行'
      } else {
        reply = '买票很简单：先看出发地（已自动定位），再在目的地框输入您想去的地方，最后点底部蓝色按钮查车次'
      }
    } else if (wantsHelp) {
      reply = '这是买票页面。上面是出发地（已自动定位），中间输入目的地，下面选日期，最后点蓝色按钮查车次'
    } else {
      reply = '您在买票页面，告诉我您想去哪里，我教您怎么操作'
    }
  } else if (page === 'taxi') {
    if (wantsGo) {
      var destMatch2 = msg.match(/去(.{2,8})/) || msg.match(/到(.{2,8})/)
      if (destMatch2 && !destination) {
        destination = destMatch2[1]
        fillFields['目的地'] = destination
      }
      if (destination) {
        reply = '好的，我帮您填好了目的地，您直接点底部按钮叫车就行'
      } else {
        reply = '打车很简单：上面是您的位置（已定位），在目的地框输入要去的地方，点底部"立即呼叫"就行'
      }
    } else if (wantsHelp) {
      reply = '这是打车页面。上方显示您的当前位置，中间输入目的地，下面会显示价格，最后点"立即呼叫"按钮'
    } else {
      reply = '您在打车页面，告诉我您想去哪里，我告诉您怎么操作'
    }
  } else if (page === 'orders') {
    if (wantsCheck) {
      reply = '这是您的行程列表，每个卡片就是一个行程。点击任意卡片可以查看详情，里面有车次、时间、座位号等信息'
    } else if (wantsHelp) {
      reply = '这是行程页面。这里显示您所有的行程，点哪个就看哪个的详情'
    } else {
      reply = '您在行程页面，这里能看到您所有的行程记录'
    }
  } else if (page === 'index') {
    if (wantsBuy || wantsGo) {
      reply = '请点页面中间的"买票"按钮，进去后输入目的地就能买票了'
    } else if (/打车|叫车|出租车/.test(msg)) {
      reply = '请点页面中间的"打车"按钮，进去后输入目的地就能叫车了'
    } else if (wantsCheck) {
      reply = '请点页面下方的"行程"按钮，就能看到您的所有行程了'
    } else if (wantsHelp) {
      reply = '这是首页。中间有买票、打车、行程等按钮，点哪个就进哪个功能'
    } else {
      reply = '您在首页，中间有买票、打车、行程等入口，想做什么就点对应的按钮'
    }
  } else if (page === 'map-trip') {
    if (wantsHelp) {
      reply = '这是行程规划页。输入出发地和目的地，点"开始规划"就能看到多种出行方案'
    } else {
      reply = '您在行程规划页，告诉我您想去哪里，我教您怎么查路线'
    }
  } else if (page === 'trip-monitor') {
    if (wantsHelp) {
      reply = '这是行程监控页。这里能看到长辈的实时位置和行程进度，有异常会自动提醒您'
    } else {
      reply = '您在行程监控页，这里显示长辈的实时出行状态'
    }
  } else if (page === 'profile') {
    if (wantsHelp) {
      reply = '这是个人中心页面。这里能查看您的信息、绑定的账号、地址管理等'
    } else {
      reply = '您在个人中心，可以查看和管理您的账号信息'
    }
  } else if (page === 'address') {
    if (wantsHelp) {
      reply = '这是地址管理页。点击"添加地址"可以保存常用的家、医院、车站等地址'
    } else {
      reply = '您在地址管理页，可以添加和管理常用地址'
    }
  } else {
    reply = '您在' + (pageContext.title || '当前') + '页面，有什么需要帮忙的请告诉我'
  }

  return { reply: reply, taskComplete: false, fillFields: fillFields }
}

// 清理目的地字符串：去除日期/时间/语气助词等非目的地内容
function _cleanDestination(dest) {
  if (!dest) return ''
  var cleaned = dest
  // 去除句尾的时间词（只删除结尾位置的，避免从中间截断把前面的目的地也删了）
  cleaned = cleaned.replace(/(明天|后天|今天|大后天|周六|周日|周一|周二|周三|周四|周五|上午|下午|晚上|早晨|早上|中午|夜晚|晚间|傍晚|凌晨|大早)[，。？、\s]*$/g, '')
  cleaned = cleaned.replace(/\d+\s*(?:点|:)\s*\d*[，。？、\s]*$/g, '')
  // 去除语气助词/冗余词（同样只从尾部删除，防止截断"南京"）
  cleaned = cleaned.replace(/(嗯|啊|呢|吧|哦|呀|了|走|出发|坐|坐车|买票|订票|购票|去|回|来|看看|办事|办点事|看看去|一趟|一下)[，。？、\s]*$/g, '')
  // 如果剩余的是纯时间词（如"明天""早上"），单独剔除
  cleaned = cleaned.replace(/^(明天|后天|今天|大后天|周六|周日|周一|周二|周三|周四|周五|上午|下午|晚上|早晨|早上|中午|夜晚|晚间|傍晚)$/, '')
  cleaned = cleaned.replace(/[，。？、,!！；;~~\s]+/g, '').trim()
  return cleaned
}

module.exports = {
  callAI: callAI,
  callPageGuideAI: callPageGuideAI,
  planTrip: planTrip,
  correctElderlySpeech: correctElderlySpeech,
  parseNLP: parseNLP,
  _cleanDestination: _cleanDestination,
  getPageGuideFallback: getPageGuideFallback,
  // Function Calling 工具（获得授权后可单独调用真实 API）
  callTool: callTool,
  callTrainSearchTool: callTrainSearchTool,
  callTaxiOrderTool: callTaxiOrderTool,
  // 安全预警AI分析：本地规则检测 + AI二次输出人性化文案 + 处置建议
  analyzeSafetyAlert: analyzeSafetyAlert,
  _getDefaultSafetyAlert: _getDefaultSafetyAlert
}
