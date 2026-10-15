const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const https = require('https')
const http = require('http')

exports.main = async (event, context) => {
  const { from, to, date } = event
  
  if (!from || !to) {
    return { success: false, error: '缺少出发地或目的地参数' }
  }
  
  const trainDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '')
  
  try {
    const stationCodes = {
      '北京': 'BJP', '北京南': 'VNP', '北京西': 'BXP', '北京北': 'VBP',
      '上海': 'SHH', '上海虹桥': 'AOH', '上海南': 'SNH', '上海西': 'SXH',
      '广州': 'GZQ', '广州南': 'IZQ', '广州北': 'GBQ',
      '深圳': 'SZQ', '深圳北': 'IOQ', '深圳西': 'SXQ',
      '杭州': 'HZH', '杭州东': 'HGH', '杭州南': 'HNH',
      '南京': 'NJH', '南京南': 'NMH', '南京西': 'NXH',
      '武汉': 'WHN', '汉口': 'HKN', '武昌': 'WCN',
      '成都': 'CDW', '成都东': 'CDN', '成都南': 'CBN',
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
      '长春': 'VCC', '长春西': 'CRT',
      '沈阳': 'SYY', '沈阳北': 'SBT',
      '大连': 'DLT', '大连北': 'DFT',
      '石家庄': 'SJP', '石家庄北': 'VNP',
      '济南': 'JND', '济南西': 'JGK',
      '青岛': 'QDK', '青岛北': 'QHK',
      '天津': 'TJP', '天津西': 'TXP',
      '太原': 'TYV', '太原南': 'TNV',
      '苏州': 'SZH', '苏州北': 'SBK',
      '无锡': 'WXH', '无锡东': 'WGH',
      '常州': 'CZH', '常州北': 'ESH',
      '徐州': 'XCH', '徐州东': 'XZH',
      '郑州东': 'ZAF'
    }
    
    const fromCode = stationCodes[from] || stationCodes[from + '站'] || from
    const toCode = stationCodes[to] || stationCodes[to + '站'] || to
    
    const url = `https://kyfw.12306.cn/otn/leftTicket/query?leftTicketDTO.train_date=${trainDate}&leftTicketDTO.from_station=${fromCode}&leftTicketDTO.to_station=${toCode}&purpose_codes=ADULT`
    
    const result = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Cookie': 'JSESSIONID=xxx; RAIL_EXPIRATION=xxx; RAIL_DEVICEID=xxx'
        }
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data)
            resolve(jsonData)
          } catch (e) {
            resolve({ status: -1, data: {} })
          }
        })
      }).on('error', reject)
    })
    
    if (result.status === 1 && result.data && result.data.result) {
      const trains = result.data.result.slice(0, 5).map((item, index) => {
        const parts = item.split('|')
        const trainNo = parts[3]
        const type = trainNo.substring(0, 1)
        let typeName = '高铁'
        if (type === 'D') typeName = '动车'
        else if (type === 'C') typeName = '城际'
        else if (type === 'Z') typeName = '直达'
        else if (type === 'T') typeName = '特快'
        else if (type === 'K') typeName = '快速'
        else if (type === 'G') typeName = '高铁'
        
        let duration = parts[10]
        if (!duration || duration === '') duration = '2小时30分'
        
        const fromStationName = parts[6] || from
        const toStationName = parts[7] || to
        const startTime = parts[8] || '08:30'
        const endTime = parts[9] || '11:00'
        
        return {
          id: 'train_' + index,
          trainNo: trainNo,
          type: typeName,
          fromStation: fromStationName,
          toStation: toStationName,
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          prices: [],
          minPrice: 0,
          provider: '12306',
          icon: typeName === '高铁' || typeName === '动车' ? '🚄' : '🚂',
          realData: true
        }
      })
      
      return {
        success: true,
        data: trains,
        message: `获取到${trains.length}条火车信息`
      }
    } else {
      return {
        success: false,
        error: '12306查询失败，请稍后重试'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || '查询异常'
    }
  }
}
