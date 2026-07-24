const trainStations = [
  { id: '1', name: '北京西站', code: 'BXP' },
  { id: '2', name: '北京南站', code: 'BNP' },
  { id: '3', name: '上海虹桥站', code: 'SHQ' },
  { id: '4', name: '上海站', code: 'SHZ' },
  { id: '5', name: '广州南站', code: 'GNP' },
  { id: '6', name: '广州站', code: 'GZ' },
  { id: '7', name: '深圳北站', code: 'SBP' },
  { id: '8', name: '武汉站', code: 'WH' },
  { id: '9', name: '郑州东站', code: 'ZZD' },
  { id: '10', name: '西安北站', code: 'XAP' },
  { id: '11', name: '成都东站', code: 'CDD' },
  { id: '12', name: '重庆北站', code: 'CQN' },
  { id: '13', name: '杭州东站', code: 'HZD' },
  { id: '14', name: '南京南站', code: 'NNP' },
  { id: '15', name: '天津站', code: 'TJ' }
]

const busStations = [
  { id: 'b1', name: '北京长途汽车站', address: '北京市丰台区' },
  { id: 'b2', name: '上海长途客运站', address: '上海市静安区' },
  { id: 'b3', name: '广州汽车客运站', address: '广州市越秀区' },
  { id: 'b4', name: '深圳福田汽车站', address: '深圳市福田区' },
  { id: 'b5', name: '武汉宏基客运站', address: '武汉市武昌区' }
]

const trains = [
  {
    id: 'G101',
    name: 'G101',
    type: '高铁',
    startStation: '北京南站',
    endStation: '上海虹桥站',
    startTime: '06:10',
    endTime: '12:09',
    duration: '5小时59分',
    price: 576,
    seats: [
      { type: '二等座', count: 120, price: 576 },
      { type: '一等座', count: 40, price: 933 },
      { type: '商务座', count: 10, price: 1748 }
    ]
  },
  {
    id: 'G103',
    name: 'G103',
    type: '高铁',
    startStation: '北京南站',
    endStation: '上海虹桥站',
    startTime: '06:20',
    endTime: '12:18',
    duration: '5小时58分',
    price: 576,
    seats: [
      { type: '二等座', count: 80, price: 576 },
      { type: '一等座', count: 20, price: 933 },
      { type: '商务座', count: 5, price: 1748 }
    ]
  },
  {
    id: 'G105',
    name: 'G105',
    type: '高铁',
    startStation: '北京南站',
    endStation: '上海虹桥站',
    startTime: '07:17',
    endTime: '13:12',
    duration: '5小时55分',
    price: 576,
    seats: [
      { type: '二等座', count: 150, price: 576 },
      { type: '一等座', count: 50, price: 933 },
      { type: '商务座', count: 15, price: 1748 }
    ]
  },
  {
    id: 'D1',
    name: 'D1',
    type: '动车',
    startStation: '北京南站',
    endStation: '上海站',
    startTime: '17:17',
    endTime: '07:31',
    duration: '14小时14分',
    price: 317,
    seats: [
      { type: '二等座', count: 200, price: 317 },
      { type: '一等座', count: 30, price: 499 },
      { type: '动卧', count: 50, price: 600 }
    ]
  },
  {
    id: 'Z281',
    name: 'Z281',
    type: '直达',
    startStation: '北京西站',
    endStation: '杭州东站',
    startTime: '19:21',
    endTime: '08:05',
    duration: '12小时44分',
    price: 192,
    seats: [
      { type: '硬座', count: 100, price: 192 },
      { type: '硬卧', count: 80, price: 335 },
      { type: '软卧', count: 30, price: 527 }
    ]
  }
]

const buses = [
  {
    id: 'BUS001',
    startStation: '北京长途汽车站',
    endStation: '天津站',
    startTime: '07:00',
    endTime: '09:30',
    duration: '2小时30分',
    price: 65,
    seats: 45,
    operator: '北京长途客运公司'
  },
  {
    id: 'BUS002',
    startStation: '北京长途汽车站',
    endStation: '石家庄长途客运站',
    startTime: '08:00',
    endTime: '12:00',
    duration: '4小时',
    price: 120,
    seats: 40,
    operator: '北京长途客运公司'
  },
  {
    id: 'BUS003',
    startStation: '上海长途客运站',
    endStation: '南京长途汽车站',
    startTime: '07:30',
    endTime: '10:30',
    duration: '3小时',
    price: 95,
    seats: 45,
    operator: '上海长途客运公司'
  },
  {
    id: 'BUS004',
    startStation: '广州汽车客运站',
    endStation: '深圳福田汽车站',
    startTime: '07:00',
    endTime: '09:30',
    duration: '2小时30分',
    price: 75,
    seats: 48,
    operator: '广州长途客运公司'
  }
]

const taxiDrivers = [
  { id: 'T001', name: '张师傅', phone: '13800138001', rating: 4.9, trips: 2856, avatar: '' },
  { id: 'T002', name: '李师傅', phone: '13800138002', rating: 4.8, trips: 1987, avatar: '' },
  { id: 'T003', name: '王师傅', phone: '13800138003', rating: 4.9, trips: 3210, avatar: '' },
  { id: 'T004', name: '赵师傅', phone: '13800138004', rating: 4.7, trips: 1567, avatar: '' },
  { id: 'T005', name: '刘师傅', phone: '13800138005', rating: 4.8, trips: 2134, avatar: '' }
]

const medals = [
  { id: 'm1', name: '首次出行', icon: '', description: '完成首次出行预订', points: 100 },
  { id: 'm2', name: '出行达人', icon: '', description: '累计出行10次', points: 500 },
  { id: 'm3', name: '安全卫士', icon: '', description: '连续安全出行30天', points: 300 },
  { id: 'm4', name: '爱心传递', icon: '', description: '邀请亲友注册', points: 200 },
  { id: 'm5', name: '智慧出行', icon: '', description: '使用智能推荐完成出行', points: 150 },
  { id: 'm6', name: '风雨无阻', icon: '', description: '恶劣天气坚持出行', points: 250 },
  { id: 'm7', name: '长途跋涉', icon: '', description: '单次行程超过500公里', points: 400 },
  { id: 'm8', name: '月度之星', icon: '', description: '月度出行次数最多', points: 800 }
]

const emergencyContacts = [
  { id: 'ec1', name: '110', type: 'police', desc: '报警电话' },
  { id: 'ec2', name: '120', type: 'ambulance', desc: '急救电话' },
  { id: 'ec3', name: '119', type: 'fire', desc: '火警电话' },
  { id: 'ec4', name: '96110', type: 'anti-fraud', desc: '反诈专线' }
]

const travelPlans = [
  {
    id: 'plan1',
    name: '经济快捷方案',
    description: '高铁+网约车组合出行',
    totalPrice: 650,
    totalTime: '6小时30分',
    segments: [
      { type: 'train', name: 'G101', start: '北京南站', end: '上海虹桥站', time: '06:10-12:09', price: 576 },
      { type: 'taxi', name: '网约车', start: '上海虹桥站', end: '目的地', time: '12:15-12:40', price: 74 }
    ]
  },
  {
    id: 'plan2',
    name: '舒适省心方案',
    description: '高铁一等座+专车接送',
    totalPrice: 1050,
    totalTime: '6小时20分',
    segments: [
      { type: 'train', name: 'G103', start: '北京南站', end: '上海虹桥站', time: '06:20-12:18', price: 933 },
      { type: 'taxi', name: '专车', start: '上海虹桥站', end: '目的地', time: '12:20-12:40', price: 117 }
    ]
  },
  {
    id: 'plan3',
    name: '夜间出行方案',
    description: '动车卧铺+清晨到达',
    totalPrice: 380,
    totalTime: '14小时30分',
    segments: [
      { type: 'train', name: 'D1', start: '北京南站', end: '上海站', time: '17:17-07:31', price: 317 },
      { type: 'taxi', name: '网约车', start: '上海站', end: '目的地', time: '07:40-08:00', price: 63 }
    ]
  }
]

const hotRoutes = [
  { start: '北京', end: '上海', count: 12580 },
  { start: '北京', end: '广州', count: 8960 },
  { start: '上海', end: '杭州', count: 7820 },
  { start: '广州', end: '深圳', count: 6540 },
  { start: '成都', end: '重庆', count: 5230 },
  { start: '武汉', end: '长沙', count: 4120 }
]

module.exports = {
  trainStations,
  busStations,
  trains,
  buses,
  taxiDrivers,
  medals,
  emergencyContacts,
  travelPlans,
  hotRoutes
}