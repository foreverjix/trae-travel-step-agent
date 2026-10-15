const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const SUBWAY_DATA = [
  {
    line_name: '1号线',
    line_color: '#E63946',
    city: '太原',
    stations: ['西山矿务局', '西铭路', '铁东路', '西宫', '理工大', '太原站', '南内环', '下元', '南中环', '晋阳街', '龙兴街', '龙城大街', '武宿机场'],
    first_time: '06:00',
    last_time: '22:00',
    price_range: '2-6',
    status: 'active'
  },
  {
    line_name: '2号线',
    line_color: '#FF8C42',
    city: '太原',
    stations: ['尖草坪', '涧河', '胜利街', '大北门', '缉虎营', '府西街', '钟楼街', '开化寺街', '大南门', '体育馆', '南内环', '双塔西街', '南十方街', '龙城大街', '嘉节', '西桥'],
    first_time: '06:00',
    last_time: '22:00',
    price_range: '2-5',
    status: 'active'
  },
  {
    line_name: '3号线',
    line_color: '#457B9D',
    city: '太原',
    stations: ['东峰', '东峰南', '长风东街', '学府街东', '太原南站', '晋阳街', '长治路', '王村南街', '体育馆', '双塔西街', '桃园路', '滨河西路', '漪汾街', '北中环', '尖草坪'],
    first_time: '06:00',
    last_time: '22:00',
    price_range: '2-6',
    status: 'active'
  }
]

const BUS_DATA = [
  {
    line_name: '101路',
    line_number: '101',
    city: '太原',
    start_station: '尖草坪',
    end_station: '火车站',
    stations: ['尖草坪', '胜利桥东站', '北大街', '解放北路', '大北门', '解放南路', '钟楼街', '柳巷', '桥头街', '火车站'],
    first_time: '06:00',
    last_time: '21:30',
    price: 2,
    interval: '8-12分钟',
    status: 'active'
  },
  {
    line_name: '102路',
    line_number: '102',
    city: '太原',
    start_station: '尖草坪',
    end_station: '火车站',
    stations: ['尖草坪', '胜利桥西', '胜利桥东', '北大街', '解放路', '大北门', '府西街', '钟楼街', '开化寺', '大南门', '体育馆', '南内环', '火车站'],
    first_time: '06:00',
    last_time: '21:30',
    price: 2,
    interval: '8-12分钟',
    status: 'active'
  },
  {
    line_name: '801路',
    line_number: '801',
    city: '太原',
    start_station: '公交童星幼儿园',
    end_station: '火车站',
    stations: ['公交童星幼儿园', '西宫', '和平北路', '漪汾街', '桃园路', '府西街', '钟楼街', '柳巷', '火车站'],
    first_time: '06:15',
    last_time: '21:00',
    price: 2,
    interval: '10-15分钟',
    status: 'active'
  },
  {
    line_name: '805路',
    line_number: '805',
    city: '太原',
    start_station: '建南汽车站',
    end_station: '胜利桥东',
    stations: ['建南汽车站', '南内环', '大营盘', '并州路', '广场', '钟楼街', '府西街', '漪汾街', '胜利桥东'],
    first_time: '06:00',
    last_time: '21:00',
    price: 2,
    interval: '10-15分钟',
    status: 'active'
  },
  {
    line_name: '901路',
    line_number: '901',
    city: '太原',
    start_station: '太原火车站',
    end_station: '晋中公交南场',
    stations: ['太原火车站', '并州路', '南内环', '大营盘', '太榆路', '使赵', '晋中公交南场'],
    first_time: '06:00',
    last_time: '20:00',
    price: 3,
    interval: '15-20分钟',
    status: 'active'
  }
]

async function clearCollection(collectionName) {
  try {
    const result = await db.collection(collectionName).get()
    if (result.data.length > 0) {
      const batchDelete = db.batch()
      result.data.forEach(item => {
        batchDelete.remove({
          _id: item._id
        })
      })
      await batchDelete.commit()
      console.log(`已清空集合 ${collectionName}`)
    }
  } catch (error) {
    console.error(`清空集合 ${collectionName} 失败:`, error)
  }
}

async function initSubwayData() {
  try {
    await clearCollection('subway_lines')
    
    for (const line of SUBWAY_DATA) {
      await db.collection('subway_lines').add({
        data: {
          ...line,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
    }
    
    console.log('地铁线路数据初始化完成')
    return { success: true, count: SUBWAY_DATA.length }
  } catch (error) {
    console.error('地铁线路数据初始化失败:', error)
    return { success: false, error: error.message }
  }
}

async function initBusData() {
  try {
    await clearCollection('bus_lines')
    
    for (const line of BUS_DATA) {
      await db.collection('bus_lines').add({
        data: {
          ...line,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
    }
    
    console.log('公交线路数据初始化完成')
    return { success: true, count: BUS_DATA.length }
  } catch (error) {
    console.error('公交线路数据初始化失败:', error)
    return { success: false, error: error.message }
  }
}

exports.main = async (event, context) => {
  console.log('开始初始化数据...')
  
  const results = []
  
  if (event.type === 'subway' || !event.type) {
    results.push({ type: 'subway', result: await initSubwayData() })
  }
  
  if (event.type === 'bus' || !event.type) {
    results.push({ type: 'bus', result: await initBusData() })
  }
  
  console.log('数据初始化完成')
  return {
    success: results.every(r => r.result.success),
    results: results
  }
}