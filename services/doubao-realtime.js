// 豆包端到端实时语音大模型API服务
// 文档：https://www.volcengine.com/docs/6561/1594356
// 需要在火山引擎控制台开通服务获取 APP ID 和 Access Token

const config = {
  appId: '',        // TODO: 填入豆包语音 APP ID
  accessToken: '',  // TODO: 填入豆包语音 Access Token
  model: '1.2.1.1', // 端到端模型版本
  speaker: 'zh_female_vv_jupiter_bigtts' // vv音色
}

let wsConnection = null
let isConnected = false

// 初始化WebSocket连接（预留）
function connect() {
  return new Promise((resolve, reject) => {
    if (!config.appId || !config.accessToken) {
      reject(new Error('豆包API未配置，使用模拟模式'))
      return
    }
    // TODO: 实际接入时实现WebSocket连接
    // const wsUrl = 'wss://openspeech.bytedance.com/api/v3/sse/dialogue'
    // wsConnection = wx.connectSocket({ url: wsUrl })
    reject(new Error('WebSocket连接尚未实现'))
  })
}

// 发送音频数据（预留）
function sendAudio(audioBase64) {
  if (!wsConnection || !isConnected) return
  // TODO: 发送音频数据
}

// 根据页面上下文生成回复（模拟）
function generateContextReply(pageContext) {
  if (!pageContext) return '您好，有什么可以帮您？'

  const page = pageContext.page
  const summary = pageContext.summary || ''

  const replies = {
    'index': '您好，我是AI出行助手。您可以说"我要去北京"规划行程，或者说"查我的行程"查看已订的票',
    'ticket': '您正在购票页面。告诉我目的地城市，我帮您查合适的车次。比如说"我要去上海"',
    'taxi': '您正在打车页面。告诉我您要去哪里，我帮您叫车。比如说"去省人民医院"',
    'orders': summary || '这是您的行程列表。需要查看哪个行程的详情，直接告诉我',
    'trip-monitor': summary || '正在监控长辈出行，一切正常。有异常我会第一时间提醒您',
    'map-trip': '您正在行程规划页面。告诉我出发时间和目的地，我帮您规划路线',
    'profile': '这是您的个人中心。需要查看什么信息？',
    'address': '这是地址管理页面。需要设置哪个常用地址？'
  }

  return replies[page] || summary || '您好，有什么可以帮您？'
}

// 断开连接
function disconnect() {
  if (wsConnection) {
    wsConnection.close()
    wsConnection = null
    isConnected = false
  }
}

module.exports = {
  config,
  connect,
  sendAudio,
  disconnect,
  generateContextReply
}
