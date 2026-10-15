const apiConfig = require('../config/api.js')
const amapService = require('./amap-service.js')

function request(url, data) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: url,
      data: data,
      method: 'GET',
      success: function(res) {
        resolve(res.data)
      },
      fail: function(err) {
        reject(err)
      }
    })
  })
}

function formatDuration(seconds) {
  var secs = Number(seconds) || 0
  var mins = Math.floor(secs / 60)
  if (mins < 60) return mins + '分钟'
  var hours = Math.floor(mins / 60)
  var remainMins = mins % 60
  return hours + '小时' + (remainMins > 0 ? remainMins + '分' : '')
}

function formatDistance(meters) {
  var m = Number(meters) || 0
  if (m < 1000) return m + '米'
  return (m / 1000).toFixed(1) + '公里'
}

function getDefaultCoord(address, city) {
  var cityCoords = {
    '太原': '112.549248,37.857014',
    '南京': '118.796875,32.060255',
    '北京': '116.407395,39.904211',
    '上海': '121.473701,31.230416',
    '杭州': '120.153576,30.287459',
    '广州': '113.264385,23.129110',
    '深圳': '114.057964,22.543099',
    '成都': '104.066801,30.572816',
    '重庆': '106.551556,29.563009',
    '沈阳': '123.432894,41.805643',
    '西安': '108.948024,34.261894',
    '武汉': '114.305469,30.593168',
    '天津': '117.200755,39.084158',
    '苏州': '120.619585,31.299379',
    '郑州': '113.625346,34.746644',
    '青岛': '120.333566,36.067121',
    '大连': '121.614761,38.914063',
    '厦门': '118.089425,24.479833',
    '长沙': '112.938828,28.228024',
    '哈尔滨': '126.642464,45.803756',
    '长春': '125.324521,43.817071',
    '合肥': '117.227219,31.820651',
    '济南': '117.000923,36.675807',
    '石家庄': '114.514896,38.042309',
    '昆明': '102.712251,24.881168',
    '贵阳': '106.630465,26.647535',
    '南宁': '108.371797,22.817029',
    '福州': '119.296475,26.075302',
    '南昌': '115.859484,28.682866',
    '兰州': '103.834341,36.061122',
    '太原南站': '112.606739,37.775063',
    '北京西站': '116.324638,39.894531',
    '北京南站': '116.378696,39.865263',
    '北京站': '116.420868,39.901067',
    '上海虹桥站': '121.320294,31.194864',
    '上海站': '121.457444,31.251453',
    '南京南站': '118.817413,31.942595',
    '南京站': '118.811913,32.060317',
    '广州南站': '113.268448,23.044243',
    '广州站': '113.257891,23.149435',
    '深圳北站': '114.045713,22.699663',
    '杭州东站': '120.157953,30.246638',
    '杭州站': '120.170550,30.252768',
    '成都东站': '104.146152,30.621894',
    '成都站': '104.052847,30.688581',
    '重庆西站': '106.327782,29.886919',
    '重庆北站': '106.556336,29.603339',
    '西安北站': '108.946023,34.258312',
    '西安站': '108.948024,34.265810',
    '郑州东站': '113.740334,34.747245',
    '郑州站': '113.656098,34.758253',
    '武汉站': '114.416790,30.597214',
    '武昌站': '114.316208,30.580950',
    '汉口站': '114.268445,30.620128',
    '长沙南站': '112.979357,28.151638',
    '长沙站': '112.975953,28.190619',
    '天津站': '117.201184,39.137129',
    '天津南站': '117.078793,39.037578',
    '合肥南站': '117.283042,31.806210',
    '合肥站': '117.317342,31.862210',
    '福州站': '119.296475,26.106053',
    '厦门北站': '118.089425,24.616939',
    '石家庄站': '114.514896,38.042309',
    '济南西站': '117.000923,36.675807',
    '济南站': '117.022614,36.655414',
    '沈阳站': '123.424628,41.808980',
    '沈阳北站': '123.432894,41.805643',
    '哈尔滨西站': '126.563218,45.703232',
    '哈尔滨站': '126.642464,45.803756',
    '长春站': '125.324521,43.907509',
    '长春西站': '125.927417,43.828685',
    '南昌西站': '115.790915,28.645772',
    '南昌站': '115.893469,28.616968',
    '昆明南站': '102.858991,24.847473',
    '贵阳北站': '106.630465,26.664505',
    '南宁东站': '108.371797,22.817029',
    '兰州西站': '103.834341,36.061122',
    '兰州站': '103.827578,36.045857',
    '青岛站': '120.334566,36.067121',
    '大连站': '121.614761,38.914063',
    '苏州站': '120.619585,31.299379',
    '苏州北站': '120.623140,31.320507',
    '拉萨站': '91.120000,29.646000',
    '大同站': '113.001800,40.083800',
    '大同南站': '113.076610,40.018310',
    '徐州站': '117.284700,34.261700',
    '徐州东站': '117.317700,34.264700',
    '洛阳站': '112.453900,34.635900',
    '洛阳龙门站': '112.457900,34.625900',
    '桂林站': '110.299000,25.274200',
    '桂林北站': '110.302900,25.326100',
    '秦皇岛站': '119.600600,39.935400',
    '北戴河站': '119.443600,39.835900',
    '宁波站': '121.544000,29.854400',
    '宁波北站': '121.560000,29.882000',
    '温州站': '120.672300,28.001100',
    '温州南站': '120.618000,27.989000',
    '银川站': '106.230900,38.476400',
    '西宁站': '101.793800,36.616400',
    '呼和浩特站': '111.751900,40.817500',
    '呼和浩特东站': '111.891900,40.842200',
    '乌鲁木齐站': '87.616800,43.825600',
    '乌鲁木齐南站': '87.581400,43.770000',
    '海口站': '110.167500,20.022400',
    '三亚站': '109.521200,18.278400'
  }
  
  if (address && cityCoords[address]) {
    var parts = cityCoords[address].split(',')
    return {
      lng: Number(parts[0]),
      lat: Number(parts[1]),
      city: city || address
    }
  }
  
  if (city && cityCoords[city]) {
    var parts2 = cityCoords[city].split(',')
    return {
      lng: Number(parts2[0]),
      lat: Number(parts2[1]),
      city: city
    }
  }
  
  return {
    lng: 116.407395,
    lat: 39.904211,
    city: city || address
  }
}

var geocodeCache = {}

function initGeocodeCache() {
  var landmarkCoords = {
    '东方明珠': { lng: 121.499789, lat: 31.239702, city: '上海' },
    '东方明珠广播电视塔': { lng: 121.499789, lat: 31.239702, city: '上海' },
    '外滩': { lng: 121.490494, lat: 31.243903, city: '上海' },
    '豫园': { lng: 121.492767, lat: 31.227021, city: '上海' },
    '南京路': { lng: 121.480935, lat: 31.236421, city: '上海' },
    '西湖': { lng: 120.153576, lat: 30.287459, city: '杭州' },
    '西湖风景名胜区': { lng: 120.153576, lat: 30.287459, city: '杭州' },
    '灵隐寺': { lng: 120.101231, lat: 30.241812, city: '杭州' },
    '千岛湖': { lng: 119.031558, lat: 29.609246, city: '杭州' },
    '故宫': { lng: 116.397026, lat: 39.916385, city: '北京' },
    '颐和园': { lng: 116.275589, lat: 39.999592, city: '北京' },
    '天安门': { lng: 116.406699, lat: 39.908746, city: '北京' },
    '八达岭': { lng: 116.019738, lat: 40.359542, city: '北京' },
    '天坛': { lng: 116.410889, lat: 39.882185, city: '北京' },
    '圆明园': { lng: 116.298321, lat: 40.009064, city: '北京' },
    '黄鹤楼': { lng: 114.305469, lat: 30.593168, city: '武汉' },
    '黄鹤楼公园': { lng: 114.305469, lat: 30.593168, city: '武汉' },
    '东湖': { lng: 114.371967, lat: 30.555681, city: '武汉' },
    '户部巷': { lng: 114.301186, lat: 30.547923, city: '武汉' },
    '兵马俑': { lng: 109.275483, lat: 34.385444, city: '西安' },
    '大雁塔': { lng: 108.963778, lat: 34.222815, city: '西安' },
    '华清池': { lng: 109.207569, lat: 34.367466, city: '西安' },
    '回民街': { lng: 108.948024, lat: 34.261894, city: '西安' },
    '中山陵': { lng: 118.852348, lat: 32.042521, city: '南京' },
    '中山陵景区': { lng: 118.852348, lat: 32.042521, city: '南京' },
    '夫子庙': { lng: 118.782583, lat: 32.021827, city: '南京' },
    '夫子庙景区': { lng: 118.782583, lat: 32.021827, city: '南京' },
    '明孝陵': { lng: 118.842377, lat: 32.047822, city: '南京' },
    '紫金山': { lng: 118.841346, lat: 32.040562, city: '南京' },
    '布达拉宫': { lng: 91.119811, lat: 29.655109, city: '拉萨' },
    '大昭寺': { lng: 91.128789, lat: 29.652341, city: '拉萨' },
    '纳木错': { lng: 90.625718, lat: 30.725649, city: '拉萨' },
    '漓江': { lng: 110.293586, lat: 25.263737, city: '桂林' },
    '阳朔': { lng: 110.498694, lat: 24.783156, city: '桂林' },
    '象鼻山': { lng: 110.288862, lat: 25.255636, city: '桂林' },
    '泰山': { lng: 117.103428, lat: 36.259629, city: '泰安' },
    '曲阜': { lng: 116.995009, lat: 35.592871, city: '济宁' },
    '黄山': { lng: 118.190399, lat: 30.140415, city: '黄山' },
    '黄山风景区': { lng: 118.190399, lat: 30.140415, city: '黄山' },
    '九寨沟': { lng: 103.903388, lat: 33.141965, city: '阿坝' },
    '九寨沟风景区': { lng: 103.903388, lat: 33.141965, city: '阿坝' },
    '峨眉山': { lng: 103.452198, lat: 29.568202, city: '乐山' },
    '峨眉山景区': { lng: 103.452198, lat: 29.568202, city: '乐山' },
    '张家界': { lng: 110.479443, lat: 29.117376, city: '张家界' },
    '张家界国家森林公园': { lng: 110.479443, lat: 29.117376, city: '张家界' },
    '凤凰古城': { lng: 109.435625, lat: 27.922884, city: '湘西' },
    '鼓浪屿': { lng: 118.06926, lat: 24.443451, city: '厦门' },
    '武夷山': { lng: 117.962938, lat: 27.672185, city: '南平' },
    '庐山': { lng: 115.983371, lat: 29.602936, city: '九江' },
    '婺源': { lng: 117.863861, lat: 29.251368, city: '上饶' },
    '青城山': { lng: 103.564789, lat: 30.946171, city: '成都' },
    '都江堰': { lng: 103.626232, lat: 30.947318, city: '成都' },
    '宽窄巷子': { lng: 104.066801, lat: 30.672816, city: '成都' },
    '锦里': { lng: 104.049587, lat: 30.646171, city: '成都' },
    '武侯祠': { lng: 104.048521, lat: 30.647816, city: '成都' },
    '杜甫草堂': { lng: 104.034946, lat: 30.659276, city: '成都' },
    '白云山': { lng: 113.300823, lat: 23.180198, city: '广州' },
    '长隆': { lng: 113.327648, lat: 23.007865, city: '广州' },
    '中山纪念堂': { lng: 113.268321, lat: 23.143521, city: '广州' },
    '广州中山纪念堂': { lng: 113.268321, lat: 23.143521, city: '广州' },
    '世界之窗': { lng: 113.977745, lat: 22.536587, city: '深圳' },
    '欢乐谷': { lng: 113.975741, lat: 22.537545, city: '深圳' },
    '丽江古城': { lng: 100.239224, lat: 26.866946, city: '丽江' },
    '三坊七巷': { lng: 119.296475, lat: 26.085302, city: '福州' },
    '滕王阁': { lng: 115.892151, lat: 28.682159, city: '南昌' },
    '岳阳楼': { lng: 113.092876, lat: 29.374387, city: '岳阳' }
  }
  
  for (var name in landmarkCoords) {
    geocodeCache[name + '_'] = landmarkCoords[name]
    geocodeCache[name + '_' + landmarkCoords[name].city] = landmarkCoords[name]
  }
}

initGeocodeCache()

function geocode(address, city) {
  var cacheKey = address + '_' + (city || '')
  if (geocodeCache[cacheKey]) {
    console.log('travel.js geocode缓存命中:', address)
    return Promise.resolve(geocodeCache[cacheKey])
  }
  
  var scenicKeywords = ['景区', '公园', '山', '湖', '河', '海', '寺', '庙', '馆', '院', '塔', '楼', '阁', '岛', '洞', '泉', '瀑布', '森林', '草原', '沙漠', '峡谷', '石林', '石窟', '陵墓', '故居', '纪念馆', '博物馆', '广场', '大桥', '大坝', '长城', '故宫', '天坛', '颐和园', '圆明园', '布达拉宫', '兵马俑']
  var isScenicSpot = false
  for (var i = 0; i < scenicKeywords.length; i++) {
    if (address.indexOf(scenicKeywords[i]) >= 0) {
      isScenicSpot = true
      break
    }
  }
  
  if (isScenicSpot) {
    console.log('检测到景点名称，优先使用POI搜索:', address)
    return searchPOICoord(address, city).then(function(result) {
      geocodeCache[cacheKey] = result
      return result
    })
  }
  
  var params = {
    key: apiConfig.AMAP_KEY,
    address: address
  }
  if (city) {
    params.city = city
  }
  return request(apiConfig.AMAP_GEOCODE, params).then(function(res) {
    if (res.status === '1' && res.geocodes && res.geocodes.length > 0) {
      var geo = res.geocodes[0]
      var parts = geo.location.split(',')
      var result = {
        lng: Number(parts[0]),
        lat: Number(parts[1]),
        city: geo.city || address
      }
      geocodeCache[cacheKey] = result
      return result
    }
    return searchPOICoord(address, city).then(function(result) {
      geocodeCache[cacheKey] = result
      return result
    })
  }).catch(function() {
    return searchPOICoord(address, city).then(function(result) {
      geocodeCache[cacheKey] = result
      return result
    })
  })
}

function searchPOICoord(keyword, city) {
  var params = {
    key: apiConfig.AMAP_KEY,
    keywords: keyword,
    output: 'JSON',
    extensions: 'base'
  }
  if (city) {
    params.city = city
  }
  
  return request('https://restapi.amap.com/v3/place/text', params).then(function(res) {
    if (res.status === '1' && res.pois && res.pois.length > 0) {
      var poi = res.pois[0]
      if (poi.location) {
        var parts = poi.location.split(',')
        var lng = Number(parts[0])
        var lat = Number(parts[1])
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          return {
            lng: lng,
            lat: lat,
            city: poi.cityname || city || keyword,
            name: poi.name
          }
        }
      }
    }
    console.log('POI搜索未找到结果，使用默认坐标:', keyword)
    return getDefaultCoord(keyword, city)
  }).catch(function(err) {
    console.log('POI搜索失败:', err)
    return getDefaultCoord(keyword, city)
  })
}

var trainMockData = {
  '太原-南京': [
    { trainNo: 'G1954', type: '高铁', fromStation: '太原南', toStation: '南京南', startTime: '07:28', endTime: '12:45', duration: '5小时17分', prices: [{ type: '二等座', price: 497 }, { type: '一等座', price: 824 }, { type: '商务座', price: 1626 }], minPrice: 497 },
    { trainNo: 'G1958', type: '高铁', fromStation: '太原南', toStation: '南京南', startTime: '09:17', endTime: '14:36', duration: '5小时19分', prices: [{ type: '二等座', price: 497 }, { type: '一等座', price: 824 }, { type: '商务座', price: 1626 }], minPrice: 497 },
    { trainNo: 'G1962', type: '高铁', fromStation: '太原南', toStation: '南京南', startTime: '11:42', endTime: '17:18', duration: '5小时36分', prices: [{ type: '二等座', price: 497 }, { type: '一等座', price: 824 }], minPrice: 497 },
    { trainNo: 'D126', type: '动车', fromStation: '太原', toStation: '南京', startTime: '08:25', endTime: '16:02', duration: '7小时37分', prices: [{ type: '二等座', price: 321 }, { type: '一等座', price: 513 }, { type: '无座', price: 321 }], minPrice: 321 },
    { trainNo: 'K374', type: '快速', fromStation: '太原', toStation: '南京', startTime: '17:01', endTime: '07:32', duration: '14小时31分', prices: [{ type: '硬座', price: 141.5 }, { type: '硬卧', price: 244.5 }, { type: '软卧', price: 381.5 }], minPrice: 141.5 }
  ],
  '太原-北京': [
    { trainNo: 'G602', type: '高铁', fromStation: '太原南', toStation: '北京西', startTime: '07:15', endTime: '10:12', duration: '2小时57分', prices: [{ type: '二等座', price: 197 }, { type: '一等座', price: 314 }, { type: '商务座', price: 623 }], minPrice: 197 },
    { trainNo: 'G604', type: '高铁', fromStation: '太原南', toStation: '北京西', startTime: '08:20', endTime: '11:12', duration: '2小时52分', prices: [{ type: '二等座', price: 197 }, { type: '一等座', price: 314 }], minPrice: 197 },
    { trainNo: 'G606', type: '高铁', fromStation: '太原南', toStation: '北京西', startTime: '09:10', endTime: '12:08', duration: '2小时58分', prices: [{ type: '二等座', price: 197 }, { type: '一等座', price: 314 }], minPrice: 197 },
    { trainNo: 'D20', type: '动车', fromStation: '太原南', toStation: '北京西', startTime: '10:05', endTime: '13:40', duration: '3小时35分', prices: [{ type: '二等座', price: 154 }, { type: '一等座', price: 246 }], minPrice: 154 }
  ],
  '太原-杭州': [
    { trainNo: 'G1884', type: '高铁', fromStation: '太原南', toStation: '杭州东', startTime: '08:30', endTime: '14:30', duration: '6小时整', prices: [{ type: '二等座', price: 584 }, { type: '一等座', price: 956 }, { type: '商务座', price: 1878 }], minPrice: 584 },
    { trainNo: 'G1888', type: '高铁', fromStation: '太原南', toStation: '杭州东', startTime: '10:45', endTime: '16:55', duration: '6小时10分', prices: [{ type: '二等座', price: 584 }, { type: '一等座', price: 956 }], minPrice: 584 },
    { trainNo: 'G1954', type: '高铁', fromStation: '太原南', toStation: '杭州东', startTime: '07:28', endTime: '13:48', duration: '6小时20分', prices: [{ type: '二等座', price: 584 }, { type: '一等座', price: 956 }], minPrice: 584 },
    { trainNo: 'Z176', type: '直达', fromStation: '太原', toStation: '杭州', startTime: '18:00', endTime: '08:30', duration: '14小时30分', prices: [{ type: '硬座', price: 152.5 }, { type: '硬卧', price: 261.5 }, { type: '软卧', price: 409.5 }], minPrice: 152.5 }
  ],
  '太原-武汉': [
    { trainNo: 'G694', type: '高铁', fromStation: '太原南', toStation: '武汉', startTime: '09:00', endTime: '13:30', duration: '4小时30分', prices: [{ type: '二等座', price: 405 }, { type: '一等座', price: 656 }, { type: '商务座', price: 1280 }], minPrice: 405 },
    { trainNo: 'G698', type: '高铁', fromStation: '太原南', toStation: '武汉', startTime: '11:30', endTime: '16:00', duration: '4小时30分', prices: [{ type: '二等座', price: 405 }, { type: '一等座', price: 656 }], minPrice: 405 },
    { trainNo: 'K1348', type: '快速', fromStation: '太原', toStation: '武昌', startTime: '15:00', endTime: '06:30', duration: '15小时30分', prices: [{ type: '硬座', price: 128.5 }, { type: '硬卧', price: 222.5 }, { type: '软卧', price: 348.5 }], minPrice: 128.5 }
  ],
  '太原-西安': [
    { trainNo: 'G652', type: '高铁', fromStation: '太原南', toStation: '西安北', startTime: '08:00', endTime: '10:00', duration: '2小时整', prices: [{ type: '二等座', price: 195 }, { type: '一等座', price: 312 }, { type: '商务座', price: 610 }], minPrice: 195 },
    { trainNo: 'G654', type: '高铁', fromStation: '太原南', toStation: '西安北', startTime: '10:00', endTime: '12:05', duration: '2小时5分', prices: [{ type: '二等座', price: 195 }, { type: '一等座', price: 312 }], minPrice: 195 },
    { trainNo: 'D2502', type: '动车', fromStation: '太原南', toStation: '西安北', startTime: '09:30', endTime: '12:10', duration: '2小时40分', prices: [{ type: '二等座', price: 156 }, { type: '一等座', price: 250 }], minPrice: 156 }
  ],
  '北京-上海': [
    { trainNo: 'G101', type: '高铁', fromStation: '北京南', toStation: '上海虹桥', startTime: '06:10', endTime: '12:09', duration: '5小时59分', prices: [{ type: '二等座', price: 553 }, { type: '一等座', price: 933 }, { type: '商务座', price: 1784 }], minPrice: 553 },
    { trainNo: 'G103', type: '高铁', fromStation: '北京南', toStation: '上海虹桥', startTime: '06:20', endTime: '11:58', duration: '5小时38分', prices: [{ type: '二等座', price: 553 }, { type: '一等座', price: 933 }, { type: '商务座', price: 1784 }], minPrice: 553 },
    { trainNo: 'G1', type: '高铁', fromStation: '北京南', toStation: '上海', startTime: '07:00', endTime: '11:29', duration: '4小时29分', prices: [{ type: '二等座', price: 669 }, { type: '一等座', price: 1073 }, { type: '商务座', price: 2330 }], minPrice: 669 },
    { trainNo: 'G105', type: '高铁', fromStation: '北京南', toStation: '上海虹桥', startTime: '07:17', endTime: '13:12', duration: '5小时55分', prices: [{ type: '二等座', price: 553 }, { type: '一等座', price: 933 }], minPrice: 553 },
    { trainNo: 'Z281', type: '直达', fromStation: '北京丰台', toStation: '上海松江', startTime: '19:21', endTime: '07:45', duration: '12小时24分', prices: [{ type: '硬座', price: 177.5 }, { type: '硬卧', price: 304.5 }, { type: '软卧', price: 476.5 }], minPrice: 177.5 }
  ],
  '上海-杭州': [
    { trainNo: 'G7301', type: '高铁', fromStation: '上海虹桥', toStation: '杭州东', startTime: '06:05', endTime: '06:59', duration: '54分', prices: [{ type: '二等座', price: 73 }, { type: '一等座', price: 117 }, { type: '商务座', price: 233 }], minPrice: 73 },
    { trainNo: 'G7303', type: '高铁', fromStation: '上海虹桥', toStation: '杭州东', startTime: '06:20', endTime: '07:16', duration: '56分', prices: [{ type: '二等座', price: 73 }, { type: '一等座', price: 117 }], minPrice: 73 },
    { trainNo: 'G1321', type: '高铁', fromStation: '上海虹桥', toStation: '杭州东', startTime: '06:52', endTime: '07:47', duration: '55分', prices: [{ type: '二等座', price: 73 }, { type: '一等座', price: 117 }], minPrice: 73 },
    { trainNo: 'D3201', type: '动车', fromStation: '上海虹桥', toStation: '杭州东', startTime: '07:27', endTime: '08:32', duration: '1小时5分', prices: [{ type: '二等座', price: 67 }, { type: '一等座', price: 107 }], minPrice: 67 }
  ],
  '广州-深圳': [
    { trainNo: 'G6001', type: '高铁', fromStation: '广州南', toStation: '深圳北', startTime: '06:00', endTime: '06:36', duration: '36分', prices: [{ type: '二等座', price: 74.5 }, { type: '一等座', price: 99.5 }, { type: '商务座', price: 199.5 }], minPrice: 74.5 },
    { trainNo: 'G6003', type: '高铁', fromStation: '广州南', toStation: '深圳北', startTime: '06:10', endTime: '06:46', duration: '36分', prices: [{ type: '二等座', price: 74.5 }, { type: '一等座', price: 99.5 }], minPrice: 74.5 },
    { trainNo: 'G841', type: '高铁', fromStation: '广州南', toStation: '深圳北', startTime: '06:15', endTime: '06:52', duration: '37分', prices: [{ type: '二等座', price: 74.5 }, { type: '一等座', price: 99.5 }], minPrice: 74.5 },
    { trainNo: 'C7001', type: '城际', fromStation: '广州东', toStation: '深圳', startTime: '06:18', endTime: '07:14', duration: '56分', prices: [{ type: '二等座', price: 79.5 }, { type: '一等座', price: 99.5 }], minPrice: 79.5 }
  ],
  '成都-重庆': [
    { trainNo: 'G8601', type: '高铁', fromStation: '成都东', toStation: '重庆西', startTime: '06:10', endTime: '08:00', duration: '1小时50分', prices: [{ type: '二等座', price: 154 }, { type: '一等座', price: 246 }, { type: '商务座', price: 486 }], minPrice: 154 },
    { trainNo: 'G8603', type: '高铁', fromStation: '成都东', toStation: '重庆西', startTime: '06:40', endTime: '08:30', duration: '1小时50分', prices: [{ type: '二等座', price: 154 }, { type: '一等座', price: 246 }], minPrice: 154 },
    { trainNo: 'D2208', type: '动车', fromStation: '成都东', toStation: '重庆北', startTime: '06:50', endTime: '09:30', duration: '2小时40分', prices: [{ type: '二等座', price: 96.5 }, { type: '一等座', price: 154 }], minPrice: 96.5 },
    { trainNo: 'K504', type: '快速', fromStation: '成都西', toStation: '重庆北', startTime: '08:20', endTime: '15:10', duration: '6小时50分', prices: [{ type: '硬座', price: 54.5 }, { type: '硬卧', price: 100.5 }], minPrice: 54.5 }
  ],
  '南京-杭州': [
    { trainNo: 'G3191', type: '高铁', fromStation: '南京南', toStation: '杭州东', startTime: '08:00', endTime: '09:30', duration: '1小时30分', prices: [{ type: '二等座', price: 117 }, { type: '一等座', price: 188 }, { type: '商务座', price: 370 }], minPrice: 117 },
    { trainNo: 'G3193', type: '高铁', fromStation: '南京南', toStation: '杭州东', startTime: '10:00', endTime: '11:35', duration: '1小时35分', prices: [{ type: '二等座', price: 117 }, { type: '一等座', price: 188 }], minPrice: 117 },
    { trainNo: 'D2281', type: '动车', fromStation: '南京南', toStation: '杭州东', startTime: '09:00', endTime: '11:00', duration: '2小时整', prices: [{ type: '二等座', price: 93 }, { type: '一等座', price: 150 }], minPrice: 93 }
  ],
  '武汉-长沙': [
    { trainNo: 'G1101', type: '高铁', fromStation: '武汉', toStation: '长沙南', startTime: '08:00', endTime: '09:30', duration: '1小时30分', prices: [{ type: '二等座', price: 164 }, { type: '一等座', price: 262 }, { type: '商务座', price: 514 }], minPrice: 164 },
    { trainNo: 'G1103', type: '高铁', fromStation: '武汉', toStation: '长沙南', startTime: '10:00', endTime: '11:35', duration: '1小时35分', prices: [{ type: '二等座', price: 164 }, { type: '一等座', price: 262 }], minPrice: 164 },
    { trainNo: 'D89', type: '动车', fromStation: '武汉', toStation: '长沙南', startTime: '09:30', endTime: '11:15', duration: '1小时45分', prices: [{ type: '二等座', price: 131 }, { type: '一等座', price: 210 }], minPrice: 131 }
  ],
  '西安-成都': [
    { trainNo: 'G879', type: '高铁', fromStation: '西安北', toStation: '成都东', startTime: '08:00', endTime: '12:00', duration: '4小时整', prices: [{ type: '二等座', price: 263 }, { type: '一等座', price: 421 }, { type: '商务座', price: 823 }], minPrice: 263 },
    { trainNo: 'G881', type: '高铁', fromStation: '西安北', toStation: '成都东', startTime: '10:00', endTime: '14:05', duration: '4小时5分', prices: [{ type: '二等座', price: 263 }, { type: '一等座', price: 421 }], minPrice: 263 },
    { trainNo: 'D1917', type: '动车', fromStation: '西安北', toStation: '成都东', startTime: '09:30', endTime: '14:10', duration: '4小时40分', prices: [{ type: '二等座', price: 210 }, { type: '一等座', price: 336 }], minPrice: 210 }
  ],
  '太原-郑州': [
    { trainNo: 'G692', type: '高铁', fromStation: '太原南', toStation: '郑州东', startTime: '08:00', endTime: '10:20', duration: '2小时20分', prices: [{ type: '二等座', price: 190 }, { type: '一等座', price: 304 }, { type: '商务座', price: 594 }], minPrice: 190 },
    { trainNo: 'G696', type: '高铁', fromStation: '太原南', toStation: '郑州东', startTime: '10:00', endTime: '12:25', duration: '2小时25分', prices: [{ type: '二等座', price: 190 }, { type: '一等座', price: 304 }], minPrice: 190 },
    { trainNo: 'K961', type: '快速', fromStation: '太原', toStation: '郑州', startTime: '17:30', endTime: '02:10', duration: '8小时40分', prices: [{ type: '硬座', price: 72 }, { type: '硬卧', price: 129 }, { type: '软卧', price: 198 }], minPrice: 72 }
  ],
  '太原-成都': [
    { trainNo: 'G616', type: '高铁', fromStation: '太原南', toStation: '成都东', startTime: '07:30', endTime: '15:30', duration: '8小时整', prices: [{ type: '二等座', price: 520 }, { type: '一等座', price: 832 }, { type: '商务座', price: 1634 }], minPrice: 520 },
    { trainNo: 'G618', type: '高铁', fromStation: '太原南', toStation: '成都东', startTime: '09:00', endTime: '17:10', duration: '8小时10分', prices: [{ type: '二等座', price: 520 }, { type: '一等座', price: 832 }], minPrice: 520 },
    { trainNo: 'K545', type: '快速', fromStation: '太原', toStation: '成都西', startTime: '09:15', endTime: '08:50', duration: '23小时35分', prices: [{ type: '硬座', price: 192 }, { type: '硬卧', price: 330 }, { type: '软卧', price: 517 }], minPrice: 192 }
  ],
  '太原-重庆': [
    { trainNo: 'G3115', type: '高铁', fromStation: '太原南', toStation: '重庆西', startTime: '07:00', endTime: '14:00', duration: '7小时整', prices: [{ type: '二等座', price: 450 }, { type: '一等座', price: 720 }, { type: '商务座', price: 1410 }], minPrice: 450 },
    { trainNo: 'G3117', type: '高铁', fromStation: '太原南', toStation: '重庆西', startTime: '08:30', endTime: '15:45', duration: '7小时15分', prices: [{ type: '二等座', price: 450 }, { type: '一等座', price: 720 }], minPrice: 450 }
  ],
  '太原-长沙': [
    { trainNo: 'G2055', type: '高铁', fromStation: '太原南', toStation: '长沙南', startTime: '07:15', endTime: '14:00', duration: '6小时45分', prices: [{ type: '二等座', price: 600 }, { type: '一等座', price: 960 }, { type: '商务座', price: 1878 }], minPrice: 600 },
    { trainNo: 'G2057', type: '高铁', fromStation: '太原南', toStation: '长沙南', startTime: '09:00', endTime: '16:00', duration: '7小时整', prices: [{ type: '二等座', price: 600 }, { type: '一等座', price: 960 }], minPrice: 600 }
  ],
  '北京-广州': [
    { trainNo: 'G77', type: '高铁', fromStation: '北京西', toStation: '广州南', startTime: '07:00', endTime: '17:29', duration: '10小时29分', prices: [{ type: '二等座', price: 862 }, { type: '一等座', price: 1379 }, { type: '商务座', price: 2694 }], minPrice: 862 },
    { trainNo: 'G79', type: '高铁', fromStation: '北京西', toStation: '广州南', startTime: '10:00', endTime: '19:23', duration: '9小时23分', prices: [{ type: '二等座', price: 862 }, { type: '一等座', price: 1379 }], minPrice: 862 },
    { trainNo: 'G81', type: '高铁', fromStation: '北京西', toStation: '广州南', startTime: '12:00', endTime: '21:25', duration: '9小时25分', prices: [{ type: '二等座', price: 862 }, { type: '一等座', price: 1379 }], minPrice: 862 },
    { trainNo: 'Z35', type: '直达', fromStation: '北京西', toStation: '广州白云', startTime: '11:49', endTime: '07:23', duration: '19小时34分', prices: [{ type: '硬座', price: 251 }, { type: '硬卧', price: 426 }, { type: '软卧', price: 673 }], minPrice: 251 }
  ],
  '北京-武汉': [
    { trainNo: 'G511', type: '高铁', fromStation: '北京西', toStation: '武汉', startTime: '07:00', endTime: '11:36', duration: '4小时36分', prices: [{ type: '二等座', price: 520 }, { type: '一等座', price: 832 }, { type: '商务座', price: 1634 }], minPrice: 520 },
    { trainNo: 'G513', type: '高铁', fromStation: '北京西', toStation: '武汉', startTime: '08:00', endTime: '12:35', duration: '4小时35分', prices: [{ type: '二等座', price: 520 }, { type: '一等座', price: 832 }], minPrice: 520 },
    { trainNo: 'G515', type: '高铁', fromStation: '北京西', toStation: '武汉', startTime: '09:00', endTime: '13:40', duration: '4小时40分', prices: [{ type: '二等座', price: 520 }, { type: '一等座', price: 832 }], minPrice: 520 },
    { trainNo: 'Z5', type: '直达', fromStation: '北京西', toStation: '武昌', startTime: '16:00', endTime: '03:36', duration: '11小时36分', prices: [{ type: '硬座', price: 152.5 }, { type: '硬卧', price: 261.5 }, { type: '软卧', price: 409.5 }], minPrice: 152.5 }
  ],
  '北京-杭州': [
    { trainNo: 'G171', type: '高铁', fromStation: '北京南', toStation: '杭州东', startTime: '06:55', endTime: '13:19', duration: '6小时24分', prices: [{ type: '二等座', price: 594 }, { type: '一等座', price: 973 }, { type: '商务座', price: 1907 }], minPrice: 594 },
    { trainNo: 'G173', type: '高铁', fromStation: '北京南', toStation: '杭州东', startTime: '08:00', endTime: '14:24', duration: '6小时24分', prices: [{ type: '二等座', price: 594 }, { type: '一等座', price: 973 }], minPrice: 594 },
    { trainNo: 'G175', type: '高铁', fromStation: '北京南', toStation: '杭州东', startTime: '09:00', endTime: '15:30', duration: '6小时30分', prices: [{ type: '二等座', price: 594 }, { type: '一等座', price: 973 }], minPrice: 594 },
    { trainNo: 'Z175', type: '直达', fromStation: '北京丰台', toStation: '杭州', startTime: '17:14', endTime: '07:50', duration: '14小时36分', prices: [{ type: '硬座', price: 177.5 }, { type: '硬卧', price: 304.5 }, { type: '软卧', price: 476.5 }], minPrice: 177.5 }
  ],
  '北京-南京': [
    { trainNo: 'G107', type: '高铁', fromStation: '北京南', toStation: '南京南', startTime: '06:25', endTime: '10:48', duration: '4小时23分', prices: [{ type: '二等座', price: 443 }, { type: '一等座', price: 732 }, { type: '商务座', price: 1433 }], minPrice: 443 },
    { trainNo: 'G109', type: '高铁', fromStation: '北京南', toStation: '南京南', startTime: '07:25', endTime: '11:56', duration: '4小时31分', prices: [{ type: '二等座', price: 443 }, { type: '一等座', price: 732 }], minPrice: 443 },
    { trainNo: 'G111', type: '高铁', fromStation: '北京南', toStation: '南京南', startTime: '08:16', endTime: '12:42', duration: '4小时26分', prices: [{ type: '二等座', price: 443 }, { type: '一等座', price: 732 }], minPrice: 443 },
    { trainNo: 'Z177', type: '直达', fromStation: '北京丰台', toStation: '南京', startTime: '17:20', endTime: '05:30', duration: '12小时10分', prices: [{ type: '硬座', price: 156.5 }, { type: '硬卧', price: 270.5 }, { type: '软卧', price: 422.5 }], minPrice: 156.5 }
  ],
  '北京-西安': [
    { trainNo: 'G651', type: '高铁', fromStation: '北京西', toStation: '西安北', startTime: '07:00', endTime: '11:00', duration: '4小时整', prices: [{ type: '二等座', price: 515 }, { type: '一等座', price: 824 }, { type: '商务座', price: 1618 }], minPrice: 515 },
    { trainNo: 'G653', type: '高铁', fromStation: '北京西', toStation: '西安北', startTime: '08:00', endTime: '12:10', duration: '4小时10分', prices: [{ type: '二等座', price: 515 }, { type: '一等座', price: 824 }], minPrice: 515 },
    { trainNo: 'G655', type: '高铁', fromStation: '北京西', toStation: '西安北', startTime: '09:00', endTime: '13:15', duration: '4小时15分', prices: [{ type: '二等座', price: 515 }, { type: '一等座', price: 824 }], minPrice: 515 },
    { trainNo: 'Z151', type: '直达', fromStation: '北京西', toStation: '西安', startTime: '14:42', endTime: '05:03', duration: '14小时21分', prices: [{ type: '硬座', price: 152.5 }, { type: '硬卧', price: 261.5 }, { type: '软卧', price: 409.5 }], minPrice: 152.5 }
  ],
  '上海-广州': [
    { trainNo: 'G817', type: '高铁', fromStation: '上海虹桥', toStation: '广州南', startTime: '07:00', endTime: '14:16', duration: '7小时16分', prices: [{ type: '二等座', price: 856 }, { type: '一等座', price: 1370 }, { type: '商务座', price: 2674 }], minPrice: 856 },
    { trainNo: 'G819', type: '高铁', fromStation: '上海虹桥', toStation: '广州南', startTime: '08:00', endTime: '15:10', duration: '7小时10分', prices: [{ type: '二等座', price: 856 }, { type: '一等座', price: 1370 }], minPrice: 856 },
    { trainNo: 'G821', type: '高铁', fromStation: '上海虹桥', toStation: '广州南', startTime: '09:00', endTime: '16:15', duration: '7小时15分', prices: [{ type: '二等座', price: 856 }, { type: '一等座', price: 1370 }], minPrice: 856 },
    { trainNo: 'Z289', type: '直达', fromStation: '上海松江', toStation: '广州白云', startTime: '19:40', endTime: '15:30', duration: '19小时50分', prices: [{ type: '硬座', price: 206 }, { type: '硬卧', price: 353 }, { type: '软卧', price: 552 }], minPrice: 206 }
  ],
  '上海-武汉': [
    { trainNo: 'G1721', type: '高铁', fromStation: '上海虹桥', toStation: '武汉', startTime: '07:00', endTime: '11:10', duration: '4小时10分', prices: [{ type: '二等座', price: 316 }, { type: '一等座', price: 506 }, { type: '商务座', price: 990 }], minPrice: 316 },
    { trainNo: 'G1723', type: '高铁', fromStation: '上海虹桥', toStation: '武汉', startTime: '08:00', endTime: '12:15', duration: '4小时15分', prices: [{ type: '二等座', price: 316 }, { type: '一等座', price: 506 }], minPrice: 316 },
    { trainNo: 'G1725', type: '高铁', fromStation: '上海虹桥', toStation: '武汉', startTime: '09:00', endTime: '13:10', duration: '4小时10分', prices: [{ type: '二等座', price: 316 }, { type: '一等座', price: 506 }], minPrice: 316 },
    { trainNo: 'Z257', type: '直达', fromStation: '上海', toStation: '武昌', startTime: '17:51', endTime: '04:55', duration: '11小时4分', prices: [{ type: '硬座', price: 148.5 }, { type: '硬卧', price: 254.5 }, { type: '软卧', price: 398.5 }], minPrice: 148.5 }
  ],
  '杭州-广州': [
    { trainNo: 'G841', type: '高铁', fromStation: '杭州东', toStation: '广州南', startTime: '07:00', endTime: '13:30', duration: '6小时30分', prices: [{ type: '二等座', price: 600 }, { type: '一等座', price: 960 }, { type: '商务座', price: 1878 }], minPrice: 600 },
    { trainNo: 'G843', type: '高铁', fromStation: '杭州东', toStation: '广州南', startTime: '08:00', endTime: '14:35', duration: '6小时35分', prices: [{ type: '二等座', price: 600 }, { type: '一等座', price: 960 }], minPrice: 600 },
    { trainNo: 'G845', type: '高铁', fromStation: '杭州东', toStation: '广州南', startTime: '09:00', endTime: '15:40', duration: '6小时40分', prices: [{ type: '二等座', price: 600 }, { type: '一等座', price: 960 }], minPrice: 600 }
  ],
  '杭州-长沙': [
    { trainNo: 'G1401', type: '高铁', fromStation: '杭州东', toStation: '长沙南', startTime: '07:00', endTime: '10:30', duration: '3小时30分', prices: [{ type: '二等座', price: 257 }, { type: '一等座', price: 411 }, { type: '商务座', price: 802 }], minPrice: 257 },
    { trainNo: 'G1403', type: '高铁', fromStation: '杭州东', toStation: '长沙南', startTime: '08:00', endTime: '11:35', duration: '3小时35分', prices: [{ type: '二等座', price: 257 }, { type: '一等座', price: 411 }], minPrice: 257 },
    { trainNo: 'G1405', type: '高铁', fromStation: '杭州东', toStation: '长沙南', startTime: '09:00', endTime: '12:40', duration: '3小时40分', prices: [{ type: '二等座', price: 257 }, { type: '一等座', price: 411 }], minPrice: 257 }
  ],
  '武汉-广州': [
    { trainNo: 'G1105', type: '高铁', fromStation: '武汉', toStation: '广州南', startTime: '07:00', endTime: '11:15', duration: '4小时15分', prices: [{ type: '二等座', price: 463 }, { type: '一等座', price: 741 }, { type: '商务座', price: 1455 }], minPrice: 463 },
    { trainNo: 'G1107', type: '高铁', fromStation: '武汉', toStation: '广州南', startTime: '08:00', endTime: '12:20', duration: '4小时20分', prices: [{ type: '二等座', price: 463 }, { type: '一等座', price: 741 }], minPrice: 463 },
    { trainNo: 'G1109', type: '高铁', fromStation: '武汉', toStation: '广州南', startTime: '09:00', endTime: '13:18', duration: '4小时18分', prices: [{ type: '二等座', price: 463 }, { type: '一等座', price: 741 }], minPrice: 463 },
    { trainNo: 'Z207', type: '直达', fromStation: '武昌', toStation: '广州白云', startTime: '17:00', endTime: '06:15', duration: '13小时15分', prices: [{ type: '硬座', price: 140.5 }, { type: '硬卧', price: 240.5 }, { type: '软卧', price: 374.5 }], minPrice: 140.5 }
  ],
  '武汉-杭州': [
    { trainNo: 'G1481', type: '高铁', fromStation: '武汉', toStation: '杭州东', startTime: '07:00', endTime: '10:30', duration: '3小时30分', prices: [{ type: '二等座', price: 285 }, { type: '一等座', price: 456 }, { type: '商务座', price: 890 }], minPrice: 285 },
    { trainNo: 'G1483', type: '高铁', fromStation: '武汉', toStation: '杭州东', startTime: '08:00', endTime: '11:40', duration: '3小时40分', prices: [{ type: '二等座', price: 285 }, { type: '一等座', price: 456 }], minPrice: 285 },
    { trainNo: 'G1485', type: '高铁', fromStation: '武汉', toStation: '杭州东', startTime: '09:00', endTime: '12:35', duration: '3小时35分', prices: [{ type: '二等座', price: 285 }, { type: '一等座', price: 456 }], minPrice: 285 }
  ],
  '南京-武汉': [
    { trainNo: 'G1727', type: '高铁', fromStation: '南京南', toStation: '武汉', startTime: '07:00', endTime: '09:30', duration: '2小时30分', prices: [{ type: '二等座', price: 250 }, { type: '一等座', price: 400 }, { type: '商务座', price: 780 }], minPrice: 250 },
    { trainNo: 'G1729', type: '高铁', fromStation: '南京南', toStation: '武汉', startTime: '08:00', endTime: '10:35', duration: '2小时35分', prices: [{ type: '二等座', price: 250 }, { type: '一等座', price: 400 }], minPrice: 250 },
    { trainNo: 'G1731', type: '高铁', fromStation: '南京南', toStation: '武汉', startTime: '09:00', endTime: '11:40', duration: '2小时40分', prices: [{ type: '二等座', price: 250 }, { type: '一等座', price: 400 }], minPrice: 250 }
  ],
  '长沙-广州': [
    { trainNo: 'G6005', type: '高铁', fromStation: '长沙南', toStation: '广州南', startTime: '07:00', endTime: '09:35', duration: '2小时35分', prices: [{ type: '二等座', price: 314 }, { type: '一等座', price: 502 }, { type: '商务座', price: 982 }], minPrice: 314 },
    { trainNo: 'G6007', type: '高铁', fromStation: '长沙南', toStation: '广州南', startTime: '08:00', endTime: '10:38', duration: '2小时38分', prices: [{ type: '二等座', price: 314 }, { type: '一等座', price: 502 }], minPrice: 314 },
    { trainNo: 'G6009', type: '高铁', fromStation: '长沙南', toStation: '广州南', startTime: '09:00', endTime: '11:40', duration: '2小时40分', prices: [{ type: '二等座', price: 314 }, { type: '一等座', price: 502 }], minPrice: 314 },
    { trainNo: 'Z35', type: '直达', fromStation: '长沙', toStation: '广州白云', startTime: '18:00', endTime: '06:23', duration: '12小时23分', prices: [{ type: '硬座', price: 112 }, { type: '硬卧', price: 194 }, { type: '软卧', price: 301 }], minPrice: 112 }
  ],
  '西安-郑州': [
    { trainNo: 'G2001', type: '高铁', fromStation: '西安北', toStation: '郑州东', startTime: '07:00', endTime: '08:30', duration: '1小时30分', prices: [{ type: '二等座', price: 229 }, { type: '一等座', price: 366 }, { type: '商务座', price: 716 }], minPrice: 229 },
    { trainNo: 'G2003', type: '高铁', fromStation: '西安北', toStation: '郑州东', startTime: '08:00', endTime: '09:35', duration: '1小时35分', prices: [{ type: '二等座', price: 229 }, { type: '一等座', price: 366 }], minPrice: 229 },
    { trainNo: 'G2005', type: '高铁', fromStation: '西安北', toStation: '郑州东', startTime: '09:00', endTime: '10:38', duration: '1小时38分', prices: [{ type: '二等座', price: 229 }, { type: '一等座', price: 366 }], minPrice: 229 },
    { trainNo: 'Z275', type: '直达', fromStation: '西安', toStation: '郑州', startTime: '15:00', endTime: '20:00', duration: '5小时整', prices: [{ type: '硬座', price: 69 }, { type: '硬卧', price: 123 }, { type: '软卧', price: 186 }], minPrice: 69 }
  ],
  '西安-杭州': [
    { trainNo: 'G1879', type: '高铁', fromStation: '西安北', toStation: '杭州东', startTime: '07:00', endTime: '13:30', duration: '6小时30分', prices: [{ type: '二等座', price: 620 }, { type: '一等座', price: 992 }, { type: '商务座', price: 1944 }], minPrice: 620 },
    { trainNo: 'G1881', type: '高铁', fromStation: '西安北', toStation: '杭州东', startTime: '08:00', endTime: '14:35', duration: '6小时35分', prices: [{ type: '二等座', price: 620 }, { type: '一等座', price: 992 }], minPrice: 620 },
    { trainNo: 'G1883', type: '高铁', fromStation: '西安北', toStation: '杭州东', startTime: '09:00', endTime: '15:40', duration: '6小时40分', prices: [{ type: '二等座', price: 620 }, { type: '一等座', price: 992 }], minPrice: 620 }
  ],
  '成都-杭州': [
    { trainNo: 'G2185', type: '高铁', fromStation: '成都东', toStation: '杭州东', startTime: '07:00', endTime: '15:30', duration: '8小时30分', prices: [{ type: '二等座', price: 820 }, { type: '一等座', price: 1312 }, { type: '商务座', price: 2568 }], minPrice: 820 },
    { trainNo: 'G2187', type: '高铁', fromStation: '成都东', toStation: '杭州东', startTime: '08:00', endTime: '16:40', duration: '8小时40分', prices: [{ type: '二等座', price: 820 }, { type: '一等座', price: 1312 }], minPrice: 820 },
    { trainNo: 'K530', type: '快速', fromStation: '成都西', toStation: '杭州', startTime: '10:00', endTime: '21:30', duration: '35小时30分', prices: [{ type: '硬座', price: 257.5 }, { type: '硬卧', price: 449.5 }, { type: '软卧', price: 707.5 }], minPrice: 257.5 }
  ],
  '重庆-杭州': [
    { trainNo: 'G3145', type: '高铁', fromStation: '重庆西', toStation: '杭州东', startTime: '07:00', endTime: '15:30', duration: '8小时30分', prices: [{ type: '二等座', price: 750 }, { type: '一等座', price: 1200 }, { type: '商务座', price: 2346 }], minPrice: 750 },
    { trainNo: 'G3147', type: '高铁', fromStation: '重庆西', toStation: '杭州东', startTime: '08:00', endTime: '16:45', duration: '8小时45分', prices: [{ type: '二等座', price: 750 }, { type: '一等座', price: 1200 }], minPrice: 750 }
  ],
  '重庆-广州': [
    { trainNo: 'G3711', type: '高铁', fromStation: '重庆西', toStation: '广州南', startTime: '07:00', endTime: '14:00', duration: '7小时整', prices: [{ type: '二等座', price: 510 }, { type: '一等座', price: 816 }, { type: '商务座', price: 1596 }], minPrice: 510 },
    { trainNo: 'G3713', type: '高铁', fromStation: '重庆西', toStation: '广州南', startTime: '08:00', endTime: '15:10', duration: '7小时10分', prices: [{ type: '二等座', price: 510 }, { type: '一等座', price: 816 }], minPrice: 510 }
  ],
  '成都-广州': [
    { trainNo: 'G2941', type: '高铁', fromStation: '成都东', toStation: '广州南', startTime: '07:00', endTime: '14:30', duration: '7小时30分', prices: [{ type: '二等座', price: 580 }, { type: '一等座', price: 928 }, { type: '商务座', price: 1816 }], minPrice: 580 },
    { trainNo: 'G2943', type: '高铁', fromStation: '成都东', toStation: '广州南', startTime: '08:00', endTime: '15:40', duration: '7小时40分', prices: [{ type: '二等座', price: 580 }, { type: '一等座', price: 928 }], minPrice: 580 },
    { trainNo: 'K588', type: '快速', fromStation: '成都西', toStation: '广州白云', startTime: '11:00', endTime: '06:30', duration: '19小时30分', prices: [{ type: '硬座', price: 169 }, { type: '硬卧', price: 290 }, { type: '软卧', price: 457 }], minPrice: 169 }
  ],
  '郑州-广州': [
    { trainNo: 'G541', type: '高铁', fromStation: '郑州东', toStation: '广州南', startTime: '07:00', endTime: '11:40', duration: '4小时40分', prices: [{ type: '二等座', price: 591 }, { type: '一等座', price: 946 }, { type: '商务座', price: 1858 }], minPrice: 591 },
    { trainNo: 'G543', type: '高铁', fromStation: '郑州东', toStation: '广州南', startTime: '08:00', endTime: '12:45', duration: '4小时45分', prices: [{ type: '二等座', price: 591 }, { type: '一等座', price: 946 }], minPrice: 591 },
    { trainNo: 'G545', type: '高铁', fromStation: '郑州东', toStation: '广州南', startTime: '09:00', endTime: '13:50', duration: '4小时50分', prices: [{ type: '二等座', price: 591 }, { type: '一等座', price: 946 }], minPrice: 591 },
    { trainNo: 'Z235', type: '直达', fromStation: '郑州', toStation: '广州白云', startTime: '15:00', endTime: '05:30', duration: '14小时30分', prices: [{ type: '硬座', price: 169 }, { type: '硬卧', price: 290 }, { type: '软卧', price: 457 }], minPrice: 169 }
  ],
  '郑州-杭州': [
    { trainNo: 'G1961', type: '高铁', fromStation: '郑州东', toStation: '杭州东', startTime: '07:00', endTime: '10:30', duration: '3小时30分', prices: [{ type: '二等座', price: 360 }, { type: '一等座', price: 576 }, { type: '商务座', price: 1128 }], minPrice: 360 },
    { trainNo: 'G1963', type: '高铁', fromStation: '郑州东', toStation: '杭州东', startTime: '08:00', endTime: '11:35', duration: '3小时35分', prices: [{ type: '二等座', price: 360 }, { type: '一等座', price: 576 }], minPrice: 360 },
    { trainNo: 'G1965', type: '高铁', fromStation: '郑州东', toStation: '杭州东', startTime: '09:00', endTime: '12:40', duration: '3小时40分', prices: [{ type: '二等座', price: 360 }, { type: '一等座', price: 576 }], minPrice: 360 }
  ],
  '苏州-南京': [
    { trainNo: 'G7001', type: '高铁', fromStation: '苏州', toStation: '南京南', startTime: '07:00', endTime: '08:30', duration: '1小时30分', prices: [{ type: '二等座', price: 118 }, { type: '一等座', price: 190 }, { type: '商务座', price: 372 }], minPrice: 118 },
    { trainNo: 'G7003', type: '高铁', fromStation: '苏州', toStation: '南京南', startTime: '08:00', endTime: '09:35', duration: '1小时35分', prices: [{ type: '二等座', price: 118 }, { type: '一等座', price: 190 }], minPrice: 118 },
    { trainNo: 'G7005', type: '高铁', fromStation: '苏州', toStation: '南京南', startTime: '09:00', endTime: '10:38', duration: '1小时38分', prices: [{ type: '二等座', price: 118 }, { type: '一等座', price: 190 }], minPrice: 118 }
  ],
  '苏州-杭州': [
    { trainNo: 'G7305', type: '高铁', fromStation: '苏州北', toStation: '杭州东', startTime: '07:00', endTime: '08:15', duration: '1小时15分', prices: [{ type: '二等座', price: 60 }, { type: '一等座', price: 96 }, { type: '商务座', price: 188 }], minPrice: 60 },
    { trainNo: 'G7307', type: '高铁', fromStation: '苏州北', toStation: '杭州东', startTime: '08:00', endTime: '09:20', duration: '1小时20分', prices: [{ type: '二等座', price: 60 }, { type: '一等座', price: 96 }], minPrice: 60 },
    { trainNo: 'G7309', type: '高铁', fromStation: '苏州北', toStation: '杭州东', startTime: '09:00', endTime: '10:25', duration: '1小时25分', prices: [{ type: '二等座', price: 60 }, { type: '一等座', price: 96 }], minPrice: 60 }
  ],
  '天津-北京': [
    { trainNo: 'C2001', type: '城际', fromStation: '天津', toStation: '北京南', startTime: '06:00', endTime: '06:30', duration: '30分', prices: [{ type: '二等座', price: 54.5 }, { type: '一等座', price: 87.5 }], minPrice: 54.5 },
    { trainNo: 'C2003', type: '城际', fromStation: '天津', toStation: '北京南', startTime: '06:15', endTime: '06:45', duration: '30分', prices: [{ type: '二等座', price: 54.5 }, { type: '一等座', price: 87.5 }], minPrice: 54.5 },
    { trainNo: 'C2005', type: '城际', fromStation: '天津', toStation: '北京南', startTime: '06:30', endTime: '07:00', duration: '30分', prices: [{ type: '二等座', price: 54.5 }, { type: '一等座', price: 87.5 }], minPrice: 54.5 }
  ],
  '天津-上海': [
    { trainNo: 'G113', type: '高铁', fromStation: '天津南', toStation: '上海虹桥', startTime: '07:00', endTime: '12:35', duration: '5小时35分', prices: [{ type: '二等座', price: 533 }, { type: '一等座', price: 888 }, { type: '商务座', price: 1740 }], minPrice: 533 },
    { trainNo: 'G115', type: '高铁', fromStation: '天津南', toStation: '上海虹桥', startTime: '08:00', endTime: '13:38', duration: '5小时38分', prices: [{ type: '二等座', price: 533 }, { type: '一等座', price: 888 }], minPrice: 533 },
    { trainNo: 'G117', type: '高铁', fromStation: '天津南', toStation: '上海虹桥', startTime: '09:00', endTime: '14:40', duration: '5小时40分', prices: [{ type: '二等座', price: 533 }, { type: '一等座', price: 888 }], minPrice: 533 }
  ],
  '长沙-武汉': [
    { trainNo: 'G1001', type: '高铁', fromStation: '长沙南', toStation: '武汉', startTime: '07:00', endTime: '08:35', duration: '1小时35分', prices: [{ type: '二等座', price: 164 }, { type: '一等座', price: 262 }, { type: '商务座', price: 514 }], minPrice: 164 },
    { trainNo: 'G1003', type: '高铁', fromStation: '长沙南', toStation: '武汉', startTime: '08:00', endTime: '09:38', duration: '1小时38分', prices: [{ type: '二等座', price: 164 }, { type: '一等座', price: 262 }], minPrice: 164 },
    { trainNo: 'G1005', type: '高铁', fromStation: '长沙南', toStation: '武汉', startTime: '09:00', endTime: '10:40', duration: '1小时40分', prices: [{ type: '二等座', price: 164 }, { type: '一等座', price: 262 }], minPrice: 164 }
  ],
  '杭州-南京': [
    { trainNo: 'G3191', type: '高铁', fromStation: '杭州东', toStation: '南京南', startTime: '08:00', endTime: '09:30', duration: '1小时30分', prices: [{ type: '二等座', price: 117 }, { type: '一等座', price: 188 }, { type: '商务座', price: 370 }], minPrice: 117 },
    { trainNo: 'G3193', type: '高铁', fromStation: '杭州东', toStation: '南京南', startTime: '10:00', endTime: '11:35', duration: '1小时35分', prices: [{ type: '二等座', price: 117 }, { type: '一等座', price: 188 }], minPrice: 117 },
    { trainNo: 'D2281', type: '动车', fromStation: '杭州东', toStation: '南京南', startTime: '09:00', endTime: '11:00', duration: '2小时整', prices: [{ type: '二等座', price: 93 }, { type: '一等座', price: 150 }], minPrice: 93 }
  ],
  '成都-西安': [
    { trainNo: 'G879', type: '高铁', fromStation: '成都东', toStation: '西安北', startTime: '08:00', endTime: '12:00', duration: '4小时整', prices: [{ type: '二等座', price: 263 }, { type: '一等座', price: 421 }, { type: '商务座', price: 823 }], minPrice: 263 },
    { trainNo: 'G881', type: '高铁', fromStation: '成都东', toStation: '西安北', startTime: '10:00', endTime: '14:05', duration: '4小时5分', prices: [{ type: '二等座', price: 263 }, { type: '一等座', price: 421 }], minPrice: 263 },
    { trainNo: 'D1917', type: '动车', fromStation: '成都东', toStation: '西安北', startTime: '09:30', endTime: '14:10', duration: '4小时40分', prices: [{ type: '二等座', price: 210 }, { type: '一等座', price: 336 }], minPrice: 210 }
  ],
  '重庆-成都': [
    { trainNo: 'G8601', type: '高铁', fromStation: '重庆西', toStation: '成都东', startTime: '06:10', endTime: '08:00', duration: '1小时50分', prices: [{ type: '二等座', price: 154 }, { type: '一等座', price: 246 }, { type: '商务座', price: 486 }], minPrice: 154 },
    { trainNo: 'G8603', type: '高铁', fromStation: '重庆西', toStation: '成都东', startTime: '06:40', endTime: '08:30', duration: '1小时50分', prices: [{ type: '二等座', price: 154 }, { type: '一等座', price: 246 }], minPrice: 154 },
    { trainNo: 'D2208', type: '动车', fromStation: '重庆北', toStation: '成都东', startTime: '06:50', endTime: '09:30', duration: '2小时40分', prices: [{ type: '二等座', price: 96.5 }, { type: '一等座', price: 154 }], minPrice: 96.5 }
  ],
  '广州-长沙': [
    { trainNo: 'G6005', type: '高铁', fromStation: '广州南', toStation: '长沙南', startTime: '07:00', endTime: '09:35', duration: '2小时35分', prices: [{ type: '二等座', price: 314 }, { type: '一等座', price: 502 }, { type: '商务座', price: 982 }], minPrice: 314 },
    { trainNo: 'G6007', type: '高铁', fromStation: '广州南', toStation: '长沙南', startTime: '08:00', endTime: '10:38', duration: '2小时38分', prices: [{ type: '二等座', price: 314 }, { type: '一等座', price: 502 }], minPrice: 314 },
    { trainNo: 'G6009', type: '高铁', fromStation: '广州南', toStation: '长沙南', startTime: '09:00', endTime: '11:40', duration: '2小时40分', prices: [{ type: '二等座', price: 314 }, { type: '一等座', price: 502 }], minPrice: 314 }
  ],
  '深圳-广州': [
    { trainNo: 'G6001', type: '高铁', fromStation: '深圳北', toStation: '广州南', startTime: '06:00', endTime: '06:36', duration: '36分', prices: [{ type: '二等座', price: 74.5 }, { type: '一等座', price: 99.5 }, { type: '商务座', price: 199.5 }], minPrice: 74.5 },
    { trainNo: 'G6003', type: '高铁', fromStation: '深圳北', toStation: '广州南', startTime: '06:10', endTime: '06:46', duration: '36分', prices: [{ type: '二等座', price: 74.5 }, { type: '一等座', price: 99.5 }], minPrice: 74.5 },
    { trainNo: 'G841', type: '高铁', fromStation: '深圳北', toStation: '广州南', startTime: '06:15', endTime: '06:52', duration: '37分', prices: [{ type: '二等座', price: 74.5 }, { type: '一等座', price: 99.5 }], minPrice: 74.5 }
  ]
}

function parseTime(timeStr) {
  if (!timeStr) return null
  var hour = 0
  var minute = 0

  if (timeStr.indexOf('上午') >= 0 || timeStr.indexOf('早上') >= 0 || timeStr.indexOf('早晨') >= 0 || timeStr.indexOf('一大早') >= 0) {
    hour = 0
  } else if (timeStr.indexOf('中午') >= 0 || timeStr.indexOf('正午') >= 0) {
    hour = 11
  } else if (timeStr.indexOf('下午') >= 0 || timeStr.indexOf('后半晌') >= 0) {
    hour = 12
  } else if (timeStr.indexOf('晚上') >= 0 || timeStr.indexOf('傍晚') >= 0 || timeStr.indexOf('夜里') >= 0 || timeStr.indexOf('晚间') >= 0) {
    hour = 18
  }
  
  var timeParts = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (timeParts) {
    hour += Number(timeParts[1])
    minute = Number(timeParts[2])
  } else {
    var hourMatch = timeStr.match(/(\d+)(?:点|:)/)
    if (hourMatch) {
      hour += Number(hourMatch[1])
    }
    
    var minuteMatch = timeStr.match(/(\d{2})\s*(?:分|分钟)?/)
    if (minuteMatch) {
      minute = Number(minuteMatch[1])
    }
  }
  
  return hour * 60 + minute
}

function generateMockTrains(from, to, time) {
  var key = from + '-' + to
  var reverseKey = to + '-' + from
  var trains = []
  var fromCity = getCityFromNameSync(from)
  var toCity = getCityFromNameSync(to)
  
  var mockData = trainMockData[key] || trainMockData[reverseKey]
  if (mockData) {
    var baseDistance = getBaseDistance(fromCity, toCity)
    
    trains = mockData.map(function(item, index) {
      var prices = []
      if (item.type === '高铁') {
        var gSecondPrice = calcTrainPrice(baseDistance, '高铁', '二等座')
        prices = [{ type: '二等座', price: gSecondPrice }, { type: '一等座', price: calcTrainPrice(baseDistance, '高铁', '一等座') }, { type: '商务座', price: calcTrainPrice(baseDistance, '高铁', '商务座') }]
      } else if (item.type === '动车') {
        var dSecondPrice = calcTrainPrice(baseDistance, '动车', '二等座')
        prices = [{ type: '二等座', price: dSecondPrice }, { type: '一等座', price: calcTrainPrice(baseDistance, '动车', '一等座') }, { type: '无座', price: dSecondPrice }]
      } else if (item.type === '快速' || item.type === '直达') {
        var kHardPrice = calcTrainPrice(baseDistance, '快速', '硬座')
        prices = [{ type: '硬座', price: kHardPrice }, { type: '硬卧', price: calcTrainPrice(baseDistance, '快速', '硬卧') }, { type: '软卧', price: calcTrainPrice(baseDistance, '快速', '软卧') }]
      } else if (item.type === '城际') {
        var cSecondPrice = calcTrainPrice(baseDistance, '动车', '二等座')
        prices = [{ type: '二等座', price: cSecondPrice }, { type: '一等座', price: calcTrainPrice(baseDistance, '动车', '一等座') }]
      } else {
        prices = item.prices
      }
      
      return {
        id: 'train_' + index,
        trainNo: item.trainNo,
        type: item.type,
        fromStation: item.fromStation,
        toStation: item.toStation,
        startTime: item.startTime,
        endTime: item.endTime,
        duration: item.duration,
        prices: prices,
        minPrice: prices[0] ? prices[0].price : item.minPrice,
        provider: '12306',
        icon: item.type === '高铁' || item.type === '动车' || item.type === '城际' ? '🚄' : '🚂'
      }
    })
  } else {
    var fromStation = getMainStation(fromCity)
    var toStation = getMainStation(toCity)
    
    var types = ['高铁', '动车', '城际', '直达', '快速']
    var trainPrefix = { '高铁': 'G', '动车': 'D', '城际': 'C', '直达': 'Z', '快速': 'K' }
    var baseDuration = getBaseDuration(fromCity, toCity) || 5
    var baseDistance = getBaseDistance(fromCity, toCity) || 500
    
    // 生成10个候选车次，覆盖不同时段和车型
    for (var i = 0; i < 10; i++) {
      var type = types[i % types.length]
      // 分散出发时间：6:00-22:00，每2小时一班
      var hour = 6 + i * 2
      if (hour >= 24) hour = hour - 24
      var startHour = hour < 10 ? '0' + hour : '' + hour
      // 时长随机化：4-10小时
      var durationHours = Math.max(3, baseDuration + (i % 4) - 1)
      var durationMins = (15 + i * 7) % 60
      var endHour = (hour + Math.floor(durationHours) + Math.floor((durationHours * 60 + durationMins) / 60)) % 24
      var endHourStr = endHour < 10 ? '0' + endHour : '' + endHour
      var duration = durationHours + '小时' + (durationMins === 0 ? '0' : durationMins) + '分'
      var startTime = startHour + ':' + (i % 2 === 0 ? '00' : '30')
      var endMinutes = durationMins > 45 ? 45 : (durationMins > 30 ? 30 : (durationMins > 15 ? 20 : 0))
      var endTime = endHourStr + ':' + (endMinutes < 10 ? '0' + endMinutes : '' + endMinutes)
      
      if (startTime.indexOf('NaN') >= 0 || endTime.indexOf('NaN') >= 0) {
        startTime = '08:00'
        endTime = '12:00'
        duration = '4小时30分'
      }

      var prices = []
      if (type === '高铁') {
        var gSecondPrice = calcTrainPrice(baseDistance, '高铁', '二等座')
        prices = [{ type: '二等座', price: gSecondPrice }, { type: '一等座', price: calcTrainPrice(baseDistance, '高铁', '一等座') }, { type: '商务座', price: calcTrainPrice(baseDistance, '高铁', '商务座') }]
      } else if (type === '动车') {
        var dSecondPrice = calcTrainPrice(baseDistance, '动车', '二等座')
        prices = [{ type: '二等座', price: dSecondPrice }, { type: '一等座', price: calcTrainPrice(baseDistance, '动车', '一等座') }, { type: '无座', price: dSecondPrice }]
      } else if (type === '城际') {
        var cSecondPrice = calcTrainPrice(baseDistance, '动车', '二等座')
        prices = [{ type: '二等座', price: cSecondPrice }, { type: '一等座', price: calcTrainPrice(baseDistance, '动车', '一等座') }]
      } else if (type === '直达') {
        var zHardPrice = calcTrainPrice(baseDistance, '直达', '硬座')
        prices = [{ type: '硬座', price: zHardPrice }, { type: '硬卧', price: calcTrainPrice(baseDistance, '直达', '硬卧') }, { type: '软卧', price: calcTrainPrice(baseDistance, '直达', '软卧') }]
      } else {
        var kHardPrice = calcTrainPrice(baseDistance, '快速', '硬座')
        prices = [{ type: '硬座', price: kHardPrice }, { type: '硬卧', price: calcTrainPrice(baseDistance, '快速', '硬卧') }, { type: '软卧', price: calcTrainPrice(baseDistance, '快速', '软卧') }]
      }

      trains.push({
        id: 'train_' + i,
        trainNo: trainPrefix[type] + (1001 + i * 37),
        type: type,
        fromStation: fromStation,
        toStation: toStation,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        prices: prices,
        minPrice: prices[0].price,
        provider: '12306',
        icon: type === '高铁' || type === '动车' || type === '城际' ? '🚄' : '🚂'
      })
    }
  }

  if (time) {
    var targetMin = parseTime(time)
    if (targetMin !== null) {
      trains = trains.filter(function(train) {
        var trainMin = parseTime(train.startTime)
        return trainMin !== null && trainMin >= targetMin
      })
    }
  }

  if (trains.length > 0) {
    return trains
  }
  
  var fallbackStartTime = '10:30'
  var fallbackStartTime2 = '11:30'
  
  if (time) {
    var targetMin = parseTime(time)
    if (targetMin !== null) {
      var targetHour = Math.floor(targetMin / 60)
      var targetMinute = targetMin % 60
      fallbackStartTime = (targetHour < 10 ? '0' + targetHour : targetHour) + ':' + (targetMinute < 10 ? '0' + targetMinute : targetMinute)
      var nextHour = (targetHour + 1) % 24
      fallbackStartTime2 = (nextHour < 10 ? '0' + nextHour : nextHour) + ':' + (targetMinute < 10 ? '0' + targetMinute : targetMinute)
    }
  }
  
  return [
    {
      id: 'train_fallback',
      trainNo: 'G8001',
      type: '高铁',
      fromStation: getMainStation(fromCity),
      toStation: getMainStation(toCity),
      startTime: fallbackStartTime,
      endTime: calculateEndTime(fallbackStartTime, baseDuration + 1, 15),
      duration: (baseDuration + 1) + '小时15分',
      prices: [{ type: '二等座', price: calcTrainPrice(baseDistance, '高铁', '二等座') }, { type: '一等座', price: calcTrainPrice(baseDistance, '高铁', '一等座') }],
      minPrice: calcTrainPrice(baseDistance, '高铁', '二等座'),
      provider: '12306',
      icon: '🚄'
    },
    {
      id: 'train_fallback2',
      trainNo: 'D8001',
      type: '动车',
      fromStation: getMainStation(fromCity),
      toStation: getMainStation(toCity),
      startTime: fallbackStartTime2,
      endTime: calculateEndTime(fallbackStartTime2, baseDuration + 1, 30),
      duration: (baseDuration + 1) + '小时30分',
      prices: [{ type: '二等座', price: calcTrainPrice(baseDistance, '动车', '二等座') }, { type: '一等座', price: calcTrainPrice(baseDistance, '动车', '一等座') }],
      minPrice: calcTrainPrice(baseDistance, '动车', '二等座'),
      provider: '12306',
      icon: '🚄'
    }
  ]
}

function calculateEndTime(startTime, hours, minutes) {
  var parts = startTime.split(':')
  var startHour = parseInt(parts[0])
  var startMinute = parseInt(parts[1])
  
  var totalMinutes = startHour * 60 + startMinute + hours * 60 + minutes
  var endHour = Math.floor(totalMinutes / 60) % 24
  var endMinute = totalMinutes % 60
  
  return (endHour < 10 ? '0' + endHour : endHour) + ':' + (endMinute < 10 ? '0' + endMinute : endMinute)
}

function getCityFromNameSync(name) {
  var cityMap = {
    '太原': '太原', '北京': '北京', '上海': '上海', '南京': '南京', '武汉': '武汉',
    '杭州': '杭州', '西安': '西安', '广州': '广州', '深圳': '深圳', '成都': '成都',
    '重庆': '重庆', '天津': '天津', '苏州': '苏州', '郑州': '郑州', '长沙': '长沙',
    '青岛': '青岛', '沈阳': '沈阳', '大连': '大连', '合肥': '合肥', '福州': '福州',
    '厦门': '厦门', '南昌': '南昌', '昆明': '昆明', '贵阳': '贵阳', '南宁': '南宁',
    '兰州': '兰州', '西宁': '西宁', '银川': '银川', '呼和浩特': '呼和浩特',
    '乌鲁木齐': '乌鲁木齐', '哈尔滨': '哈尔滨', '长春': '长春', '石家庄': '石家庄',
    '济南': '济南', '黄鹤楼': '武汉', '西湖': '杭州', '故宫': '北京', '天安门': '北京',
    '兵马俑': '西安', '长城': '北京', '东方明珠': '上海', '夫子庙': '南京',
    '东方明珠广播电视塔': '上海', '西湖风景名胜区': '杭州', '张家界国家森林公园': '张家界',
    '九寨沟风景区': '九寨沟', '桂林山水': '桂林', '黄山风景区': '黄山',
    '泰山风景区': '泰安', '峨眉山景区': '乐山', '布达拉宫': '拉萨',
    '大雁塔': '西安', '中山陵': '南京', '都江堰': '成都', '青城山': '成都',
    '丽江古城': '丽江', '凤凰古城': '湘西', '鼓浪屿': '厦门', '颐和园': '北京',
    '圆明园': '北京', '天坛': '北京', '武侯祠': '成都', '杜甫草堂': '成都',
    '宽窄巷子': '成都', '三坊七巷': '福州', '滕王阁': '南昌', '岳阳楼': '岳阳',
    '滕王阁': '南昌', '黄鹤楼公园': '武汉', '中山陵景区': '南京', '夫子庙景区': '南京',
    '外滩': '上海', '豫园': '上海', '陆家嘴': '上海', '人民广场': '上海',
    '太原南站': '太原', '太原站': '太原', '北京南站': '北京', '北京西站': '北京', '北京站': '北京',
    '上海虹桥站': '上海', '上海站': '上海', '南京南站': '南京', '南京站': '南京',
    '武汉站': '武汉', '汉口站': '武汉', '武昌站': '武汉', '杭州东站': '杭州', '杭州站': '杭州',
    '西安北站': '西安', '西安站': '西安', '广州南站': '广州', '广州站': '广州',
    '深圳北站': '深圳', '成都东站': '成都', '成都南站': '成都', '重庆北站': '重庆', '重庆西站': '重庆',
    '天津站': '天津', '苏州北站': '苏州', '郑州东站': '郑州', '长沙南站': '长沙',
    '青岛北站': '青岛', '沈阳北站': '沈阳', '大连北站': '大连', '合肥南站': '合肥',
    '福州站': '福州', '厦门北站': '厦门', '南昌西站': '南昌', '昆明南站': '昆明',
    '贵阳北站': '贵阳', '南宁东站': '南宁', '兰州西站': '兰州', '西宁站': '西宁',
    '银川站': '银川', '呼和浩特东站': '呼和浩特', '乌鲁木齐站': '乌鲁木齐',
    '哈尔滨西站': '哈尔滨', '长春站': '长春', '石家庄站': '石家庄', '济南西站': '济南'
  }
  
  var sortedKeys = Object.keys(cityMap).sort(function(a, b) {
    return b.length - a.length
  })
  
  for (var i = 0; i < sortedKeys.length; i++) {
    var key = sortedKeys[i]
    if (name.includes(key)) {
      return cityMap[key]
    }
  }
  
  return name.replace(/站|市|区|省/g, '')
}

function getCityFromName(name) {
  var localCity = getCityFromNameSync(name)
  
  var cityMap = {
    '中山陵': '南京', '中山陵景区': '南京', '中山陵风景名胜区': '南京',
    '中山纪念堂': '广州', '广州中山纪念堂': '广州'
  }
  
  for (var key in cityMap) {
    if (name.indexOf(key) >= 0) {
      return Promise.resolve(cityMap[key])
    }
  }
  
  var landmarkMap = {
    '中山陵': '南京', '夫子庙': '南京', '明孝陵': '南京', '紫金山': '南京',
    '黄鹤楼': '武汉', '东湖': '武汉', '户部巷': '武汉',
    '西湖': '杭州', '灵隐寺': '杭州', '千岛湖': '杭州',
    '东方明珠': '上海', '外滩': '上海', '豫园': '上海', '南京路': '上海',
    '兵马俑': '西安', '大雁塔': '西安', '华清池': '西安', '回民街': '西安',
    '故宫': '北京', '颐和园': '北京', '天安门': '北京', '八达岭': '北京',
    '布达拉宫': '拉萨', '大昭寺': '拉萨', '纳木错': '拉萨',
    '漓江': '桂林', '阳朔': '桂林', '象鼻山': '桂林',
    '泰山': '泰安', '曲阜': '济宁',
    '黄山': '黄山', '九寨沟': '阿坝', '峨眉山': '乐山',
    '张家界': '张家界', '凤凰古城': '湘西',
    '鼓浪屿': '厦门', '武夷山': '南平',
    '庐山': '九江', '婺源': '上饶',
    '青城山': '成都', '都江堰': '成都', '宽窄巷子': '成都', '锦里': '成都',
    '中山纪念堂': '广州', '白云山': '广州', '长隆': '广州',
    '世界之窗': '深圳', '欢乐谷': '深圳'
  }
  
  for (var landmark in landmarkMap) {
    if (name.indexOf(landmark) >= 0) {
      return Promise.resolve(landmarkMap[landmark])
    }
  }
  
  return geocode(name).then(function(geo) {
    if (geo && geo.city) {
      return geo.city.replace(/市$/, '').replace(/区$/, '').replace(/省$/, '').trim()
    }
    return localCity
  }).catch(function() {
    return localCity
  })
}

function getCityFromGeocode(name) {
  return geocode(name).then(function(geo) {
    if (geo && geo.city) {
      return geo.city.replace(/市$/, '').replace(/区$/, '').replace(/省$/, '').trim()
    }
    return null
  }).catch(function() {
    return null
  })
}

function getMainStation(city) {
  var stationMap = {
    '太原': '太原南站', '北京': '北京南站', '上海': '上海虹桥站', '南京': '南京南站',
    '武汉': '武汉站', '杭州': '杭州东站', '西安': '西安北站', '广州': '广州南站',
    '深圳': '深圳北站', '成都': '成都东站', '重庆': '重庆北站', '天津': '天津站',
    '苏州': '苏州北站', '郑州': '郑州东站', '长沙': '长沙南站', '青岛': '青岛北站',
    '沈阳': '沈阳北站', '大连': '大连北站', '合肥': '合肥南站', '福州': '福州站',
    '厦门': '厦门北站', '南昌': '南昌西站', '昆明': '昆明南站', '贵阳': '贵阳北站',
    '南宁': '南宁东站', '兰州': '兰州西站', '西宁': '西宁站', '银川': '银川站',
    '呼和浩特': '呼和浩特东站', '乌鲁木齐': '乌鲁木齐站', '哈尔滨': '哈尔滨西站',
    '长春': '长春站', '石家庄': '石家庄站', '济南': '济南西站',
    '烟台': '烟台站', '威海': '威海站', '潍坊': '潍坊站', '淄博': '淄博站',
    '泰安': '泰安站', '曲阜': '曲阜东站', '济宁': '济宁站', '临沂': '临沂站',
    '日照': '日照西站', '枣庄': '枣庄站', '东营': '东营站', '滨州': '滨州站',
    '菏泽': '菏泽东站', '德州': '德州东站', '聊城': '聊城站', '蚌埠': '蚌埠南站',
    '芜湖': '芜湖站', '淮南': '淮南东站', '马鞍山': '马鞍山东站', '淮北': '淮北北站',
    '铜陵': '铜陵站', '安庆': '安庆站', '黄山': '黄山北站', '滁州': '滁州站',
    '阜阳': '阜阳西站', '六安': '六安站', '宿州': '宿州东站', '亳州': '亳州南站',
    '宣城': '宣城站', '池州': '池州站', '徐州': '徐州东站', '连云港': '连云港东站',
    '淮安': '淮安东站', '盐城': '盐城站', '扬州': '扬州东站', '泰州': '泰州站',
    '南通': '南通西站', '镇江': '镇江南站', '常州': '常州北站', '无锡': '无锡东站',
    '嘉兴': '嘉兴南站', '湖州': '湖州站', '绍兴': '绍兴东站', '宁波': '宁波站',
    '温州': '温州南站', '金华': '金华南站', '衢州': '衢州站', '台州': '台州站',
    '丽水': '丽水站', '舟山': '舟山站', '佛山': '佛山西站', '东莞': '东莞站',
    '惠州': '惠州南站', '珠海': '珠海站', '中山': '中山站', '江门': '江门站',
    '肇庆': '肇庆东站', '汕头': '汕头站', '湛江': '湛江西站', '茂名': '茂名站',
    '揭阳': '揭阳站', '潮州': '潮州站', '清远': '清远站', '韶关': '韶关东站',
    '河源': '河源东站', '梅州': '梅州西站', '阳江': '阳江站', '云浮': '云浮东站',
    '桂林': '桂林北站', '柳州': '柳州站', '梧州': '梧州南站', '玉林': '玉林站',
    '百色': '百色站', '钦州': '钦州东站', '北海': '北海站', '防城港': '防城港北站',
    '贵港': '贵港站', '河池': '河池站', '来宾': '来宾北站', '崇左': '崇左南站',
    '海口': '海口东站', '三亚': '三亚站', '琼海': '琼海站', '万宁': '万宁站',
    '文昌': '文昌站', '东方': '东方站', '泉州': '泉州站', '漳州': '漳州站',
    '莆田': '莆田站', '宁德': '宁德站', '南平': '南平北站', '龙岩': '龙岩站',
    '三明': '三明北站', '九江': '九江站', '上饶': '上饶站', '景德镇': '景德镇北站',
    '鹰潭': '鹰潭北站', '抚州': '抚州东站', '宜春': '宜春站', '萍乡': '萍乡北站',
    '新余': '新余北站', '赣州': '赣州西站', '吉安': '吉安西站', '井冈山': '井冈山站',
    '衡阳': '衡阳东站', '株洲': '株洲西站', '湘潭': '湘潭北站', '岳阳': '岳阳东站',
    '常德': '常德站', '益阳': '益阳南站', '郴州': '郴州西站', '永州': '永州站',
    '怀化': '怀化南站', '娄底': '娄底南站', '邵阳': '邵阳站', '湘西': '吉首东站',
    '张家界': '张家界西站', '宜昌': '宜昌东站', '襄阳': '襄阳东站', '十堰': '十堰东站',
    '荆州': '荆州站', '荆门': '荆门站', '黄石': '黄石北站', '鄂州': '鄂州站',
    '黄冈': '黄冈东站', '孝感': '孝感北站', '咸宁': '咸宁北站', '随州': '随州南站',
    '恩施': '恩施站', '潜江': '潜江站', '天门': '天门南站', '仙桃': '仙桃西站',
    '洛阳': '洛阳龙门站', '开封': '开封北站', '新乡': '新乡东站', '焦作': '焦作西站',
    '许昌': '许昌东站', '平顶山': '平顶山西站', '漯河': '漯河西站', '三门峡': '三门峡南站',
    '商丘': '商丘站', '周口': '周口东站', '驻马店': '驻马店西站', '南阳': '南阳东站',
    '信阳': '信阳东站', '安阳': '安阳东站', '鹤壁': '鹤壁东站', '濮阳': '濮阳东站',
    '宝鸡': '宝鸡南站', '咸阳': '咸阳西站', '铜川': '铜川站', '渭南': '渭南北站',
    '延安': '延安站', '榆林': '榆林站', '汉中': '汉中站', '安康': '安康站',
    '商洛': '商洛站', '嘉峪关': '嘉峪关南站', '酒泉': '酒泉南站', '张掖': '张掖西站',
    '武威': '武威南站', '金昌': '金昌站', '白银': '白银西站', '定西': '定西北站',
    '天水': '天水南站', '平凉': '平凉站', '庆阳': '庆阳站', '陇南': '陇南站',
    '格尔木': '格尔木站', '德令哈': '德令哈站', '石嘴山': '石嘴山站', '吴忠': '吴忠站',
    '固原': '固原站', '中卫': '中卫南站', '喀什': '喀什站', '伊宁': '伊宁站',
    '阿克苏': '阿克苏站', '库尔勒': '库尔勒站', '克拉玛依': '克拉玛依站',
    '哈密': '哈密站', '吐鲁番': '吐鲁番北站', '石河子': '石河子站', '昌吉': '昌吉站',
    '博乐': '博乐站', '塔城': '塔城站', '阿勒泰': '阿勒泰站', '包头': '包头站',
    '鄂尔多斯': '鄂尔多斯站', '赤峰': '赤峰站', '通辽': '通辽站', '呼伦贝尔': '海拉尔站',
    '兴安盟': '乌兰浩特站', '锡林浩特': '锡林浩特站', '巴彦淖尔': '临河站',
    '乌海': '乌海站', '乌兰察布': '乌兰察布站', '齐齐哈尔': '齐齐哈尔南站',
    '牡丹江': '牡丹江站', '佳木斯': '佳木斯站', '大庆': '大庆西站', '鸡西': '鸡西站',
    '双鸭山': '双鸭山站', '鹤岗': '鹤岗站', '伊春': '伊春站', '七台河': '七台河站',
    '黑河': '黑河站', '绥化': '绥化站', '大兴安岭': '漠河站', '吉林': '吉林站',
    '四平': '四平东站', '辽源': '辽源站', '通化': '通化站', '白山': '白山站',
    '松原': '松原站', '白城': '白城站', '延边': '延吉西站', '鞍山': '鞍山西站',
    '抚顺': '抚顺北站', '本溪': '本溪站', '丹东': '丹东站', '锦州': '锦州南站',
    '营口': '营口东站', '阜新': '阜新站', '辽阳': '辽阳站', '盘锦': '盘锦站',
    '铁岭': '铁岭西站', '朝阳': '朝阳站', '葫芦岛': '葫芦岛北站', '绵阳': '绵阳站',
    '德阳': '德阳站', '乐山': '乐山站', '内江': '内江北站', '自贡': '自贡站',
    '泸州': '泸州站', '宜宾': '宜宾西站', '南充': '南充北站', '达州': '达州站',
    '遂宁': '遂宁站', '广安': '广安南站', '巴中': '巴中站', '广元': '广元站',
    '雅安': '雅安站', '眉山': '眉山东站', '资阳': '资阳北站', '攀枝花': '攀枝花南站',
    '西昌': '西昌西站', '万州': '万州北站', '涪陵': '涪陵北站', '黔江': '黔江站',
    '合川': '合川站', '永川': '永川东站', '江津': '江津站', '綦江': '綦江东站',
    '璧山': '璧山站', '铜梁': '铜梁站', '潼南': '潼南站', '荣昌': '荣昌北站',
    '大足': '大足南站', '南川': '南川北站', '武隆': '武隆站', '彭水': '彭水站',
    '秀山': '秀山站', '酉阳': '酉阳站', '大理': '大理站', '丽江': '丽江站',
    '曲靖': '曲靖北站', '玉溪': '玉溪站', '普洱': '普洱站', '西双版纳': '西双版纳站',
    '楚雄': '楚雄站', '红河': '蒙自站', '文山': '文山站', '保山': '保山站',
    '德宏': '芒市站', '怒江': '六库站', '迪庆': '香格里拉站', '临沧': '临沧站',
    '遵义': '遵义站', '六盘水': '六盘水站', '安顺': '安顺西站', '毕节': '毕节站',
    '铜仁': '铜仁南站', '黔东南': '凯里南站', '黔南': '都匀东站', '黔西南': '兴义站',
    '拉萨': '拉萨站', '日喀则': '日喀则站', '山南': '山南站', '林芝': '林芝站',
    '那曲': '那曲站', '阿里': '阿里站', '大同': '大同南站', '朔州': '朔州站',
    '忻州': '忻州西站', '吕梁': '吕梁站', '晋中': '晋中站', '临汾': '临汾西站',
    '运城': '运城北站', '长治': '长治东站', '晋城': '晋城东站', '阳泉': '阳泉北站',
    '保定': '保定东站', '唐山': '唐山站', '秦皇岛': '秦皇岛站', '邯郸': '邯郸东站',
    '邢台': '邢台东站', '衡水': '衡水北站', '沧州': '沧州西站', '廊坊': '廊坊站',
    '张家口': '张家口站', '承德': '承德南站'
  }
  
  if (stationMap[city]) {
    return stationMap[city]
  }
  
  if (city.includes('站')) {
    return city
  }
  
  var shortName = city
    .replace(/藏族|羌族|回族|维吾尔|蒙古族|壮族|苗族|彝族|侗族|瑶族|白族|土家族|哈尼族|哈萨克族|傣族|黎族|傈僳族|佤族|畲族|高山族|拉祜族|水族|东乡族|纳西族|景颇族|柯尔克孜族|土族|达斡尔族|仫佬族|布朗族|撒拉族|毛南族|仡佬族|锡伯族|阿昌族|普米族|塔吉克族|怒族|乌孜别克族|俄罗斯族|鄂温克族|德昂族|保安族|裕固族|京族|塔塔尔族|独龙族|鄂伦春族|赫哲族|门巴族|珞巴族|基诺族|朝鲜族/g, '')
    .replace(/自治州|自治县|自治区|地区|市|区|省/g, '')
    .replace(/藏族羌族/g, '')
    .trim()
  
  if (shortName.length > 0) {
    return shortName + '站'
  }
  
  return city + '站'
}

function getBaseDuration(fromCity, toCity) {
  var durationMap = {
    '太原-北京': 3, '太原-西安': 3.5, '太原-郑州': 2.5, '太原-石家庄': 1.5,
    '太原-南京': 6, '太原-杭州': 7, '太原-武汉': 5, '太原-成都': 8, '太原-重庆': 7, '太原-长沙': 7,
    '太原-上海': 6.5,
    '北京-上海': 5.5, '北京-南京': 4.5, '北京-杭州': 6, '北京-武汉': 5, '北京-广州': 10.5,
    '上海-南京': 2, '上海-杭州': 1.5, '上海-武汉': 5,
    '南京-杭州': 2, '南京-武汉': 3,
    '武汉-长沙': 1.5, '武汉-广州': 4.5, '武汉-杭州': 4,
    '西安-郑州': 2, '西安-成都': 4.5, '西安-杭州': 7,
    '成都-重庆': 2, '成都-杭州': 9,
    '杭州-长沙': 3, '杭州-广州': 6,
    '广州-深圳': 0.5
  }
  
  var key1 = fromCity + '-' + toCity
  var key2 = toCity + '-' + fromCity
  
  return durationMap[key1] || durationMap[key2] || 5
}

function getBaseDistance(fromCity, toCity) {
  var distanceMap = {
    '太原-北京': 500, '太原-西安': 600, '太原-郑州': 450, '太原-石家庄': 250,
    '太原-南京': 1000, '太原-杭州': 1200, '太原-武汉': 800, '太原-成都': 1500, '太原-重庆': 1300, '太原-长沙': 1200,
    '太原-上海': 1100,
    '北京-上海': 1318, '北京-南京': 1000, '北京-杭州': 1400, '北京-武汉': 1200, '北京-广州': 2298,
    '上海-南京': 301, '上海-杭州': 159, '上海-武汉': 1100,
    '南京-杭州': 279, '南京-武汉': 550,
    '武汉-长沙': 362, '武汉-广州': 1069, '武汉-杭州': 800,
    '西安-郑州': 520, '西安-成都': 800, '西安-杭州': 1400,
    '成都-重庆': 315, '成都-杭州': 1700,
    '杭州-长沙': 650, '杭州-广州': 1400,
    '广州-深圳': 102
  }
  
  var key1 = fromCity + '-' + toCity
  var key2 = toCity + '-' + fromCity
  
  return distanceMap[key1] || distanceMap[key2] || Math.round(getBaseDuration(fromCity, toCity) * 180)
}

function calcTrainPrice(distance, type, seatClass) {
  var basePrice = 0
  
  if (type === '高铁') {
    switch (seatClass) {
      case '二等座': basePrice = distance * 0.46; break
      case '一等座': basePrice = distance * 0.74; break
      case '商务座': basePrice = distance * 0.46 * 3.5; break
    }
  } else if (type === '动车') {
    switch (seatClass) {
      case '二等座': basePrice = distance * 0.30; break
      case '一等座': basePrice = distance * 0.37; break
      case '无座': basePrice = distance * 0.30; break
    }
  } else {
    switch (seatClass) {
      case '硬座': basePrice = distance * 0.14; break
      case '硬卧': basePrice = distance * 0.14 * 1.8; break
      case '软卧': basePrice = distance * 0.14 * 2.8; break
    }
  }
  
  if (distance > 1000) {
    var part1 = 500
    var part2 = 500
    var part3 = distance - 1000
    basePrice = part1 * 0.46 + part2 * 0.46 * 0.9 + part3 * 0.46 * 0.8
    if (type === '动车') {
      basePrice = part1 * 0.30 + part2 * 0.30 * 0.9 + part3 * 0.30 * 0.8
    } else if (type !== '高铁') {
      basePrice = part1 * 0.14 + part2 * 0.14 * 0.9 + part3 * 0.14 * 0.8
    }
    
    if (type === '高铁') {
      if (seatClass === '一等座') basePrice = basePrice * (0.74 / 0.46)
      if (seatClass === '商务座') basePrice = basePrice * 3.5
    } else if (type === '动车') {
      if (seatClass === '一等座') basePrice = basePrice * (0.37 / 0.30)
    } else {
      if (seatClass === '硬卧') basePrice = basePrice * 1.8
      if (seatClass === '软卧') basePrice = basePrice * 2.8
    }
  } else if (distance > 500) {
    var partA = 500
    var partB = distance - 500
    basePrice = partA * 0.46 + partB * 0.46 * 0.9
    if (type === '动车') {
      basePrice = partA * 0.30 + partB * 0.30 * 0.9
    } else if (type !== '高铁') {
      basePrice = partA * 0.14 + partB * 0.14 * 0.9
    }
    
    if (type === '高铁') {
      if (seatClass === '一等座') basePrice = basePrice * (0.74 / 0.46)
      if (seatClass === '商务座') basePrice = basePrice * 3.5
    } else if (type === '动车') {
      if (seatClass === '一等座') basePrice = basePrice * (0.37 / 0.30)
    } else {
      if (seatClass === '硬卧') basePrice = basePrice * 1.8
      if (seatClass === '软卧') basePrice = basePrice * 2.8
    }
  }
  
  return Math.round(basePrice)
}

function searchTrainStations(city) {
  return new Promise(function(resolve) {
    amapService.searchPOI('火车站', city, '150100').then(function(result) {
      if (result.success && result.data && result.data.length > 0) {
        var stations = result.data.map(function(poi) {
          return {
            name: poi.name,
            location: poi.location,
            address: poi.address,
            adcode: poi.adcode,
            city: poi.cityname
          }
        })
        resolve(stations)
      } else {
        var mainStation = getMainStation(city)
        var loc = getDefaultCoord(mainStation, city)
        resolve([{
          name: mainStation,
          location: loc.lng + ',' + loc.lat,
          address: city + '主要火车站',
          adcode: '',
          city: city
        }])
      }
    }).catch(function() {
      var mainStation = getMainStation(city)
      var loc = getDefaultCoord(mainStation, city)
      resolve([{
        name: mainStation,
        location: loc.lng + ',' + loc.lat,
        address: city + '主要火车站',
        adcode: '',
        city: city
      }])
    })
  })
}

function searchTrains(from, to, time) {
  return new Promise(function(resolve) {
    var fromCity = getCityFromNameSync(from)
    var toCity = getCityFromNameSync(to)
    
    searchTrainsDirect(fromCity, toCity, time).then(function(trains) {
      if (trains && trains.length > 0) {
        resolve(trains)
      } else {
        console.log('12306查询无结果，使用模拟数据')
        var trains = generateMockTrains(fromCity, toCity, time)
        resolve(trains)
      }
    }).catch(function(err) {
      console.log('12306查询失败，使用模拟数据:', err)
      var trains = generateMockTrains(fromCity, toCity, time)
      resolve(trains)
    })
  })
}

function searchTrainsDirect(fromCity, toCity, time) {
  return new Promise(function(resolve, reject) {
    var today = new Date()
    var dateStr = today.getFullYear() + '' + (today.getMonth() + 1).toString().padStart(2, '0') + '' + today.getDate().toString().padStart(2, '0')
    
    var url = 'https://search.12306.cn/search/v1/train/search'
    var params = {
      keyword: fromCity + toCity,
      date: dateStr
    }
    
    request(url, params).then(function(res) {
      console.log('12306 search API返回:', JSON.stringify(res))
      if (res && res.status === 0 && res.data && res.data.list && res.data.list.length > 0) {
        var realTrains = res.data.list.slice(0, 5).map(function(item, index) {
          var type = item.train_no.substring(0, 1)
          var typeName = '高铁'
          if (type === 'D') typeName = '动车'
          else if (type === 'C') typeName = '城际'
          else if (type === 'Z') typeName = '直达'
          else if (type === 'T') typeName = '特快'
          else if (type === 'K') typeName = '快速'
          else if (type === 'G') typeName = '高铁'
          
          var duration = '2小时30分'
          if (item.start_time && item.stop_time) {
            var startParts = item.start_time.split(':')
            var stopParts = item.stop_time.split(':')
            var startMin = Number(startParts[0]) * 60 + Number(startParts[1])
            var stopMin = Number(stopParts[0]) * 60 + Number(stopParts[1])
            var diffMin = stopMin - startMin
            if (diffMin < 0) diffMin += 24 * 60
            var hours = Math.floor(diffMin / 60)
            var mins = diffMin % 60
            duration = hours + '小时' + mins + '分'
          }
          
          var basePrice = calculateTrainPrice(fromCity, toCity, typeName)
          var prices = []
          if (typeName === '高铁') {
            prices = [{ type: '二等座', price: basePrice }, { type: '一等座', price: Math.round(basePrice * 1.6) }, { type: '商务座', price: Math.round(basePrice * 3.2) }]
          } else if (typeName === '动车') {
            prices = [{ type: '二等座', price: basePrice }, { type: '一等座', price: Math.round(basePrice * 1.6) }, { type: '无座', price: basePrice }]
          } else {
            prices = [{ type: '硬座', price: Math.floor(basePrice * 0.5) }, { type: '硬卧', price: Math.floor(basePrice * 0.9) }, { type: '软卧', price: Math.floor(basePrice * 1.4) }]
          }
          
          return {
            id: 'train_' + index,
            trainNo: item.train_no,
            type: typeName,
            fromStation: item.from_station_name || getMainStation(fromCity),
            toStation: item.to_station_name || getMainStation(toCity),
            startTime: item.start_time || '08:30',
            endTime: item.stop_time || '11:00',
            duration: duration,
            prices: prices,
            minPrice: prices[0].price,
            provider: '12306',
            icon: typeName === '高铁' || typeName === '动车' ? '🚄' : '🚂',
            realData: true
          }
        })
        resolve(realTrains)
      } else {
        console.log('12306 search API失败，尝试站到站查询')
        searchTrainsByStation(fromCity, toCity).then(function(trains) {
          if (trains && trains.length > 0) {
            resolve(trains)
          } else {
            console.log('所有API均失败，使用知识库数据')
            var trains = generateMockTrains(fromCity, toCity, time)
            resolve(trains)
          }
        }).catch(function() {
          console.log('站到站查询失败，使用知识库数据')
          var trains = generateMockTrains(fromCity, toCity, time)
          resolve(trains)
        })
      }
    }).catch(function() {
      console.log('12306 search API请求失败，尝试站到站查询')
      searchTrainsByStation(fromCity, toCity).then(function(trains) {
        if (trains && trains.length > 0) {
          resolve(trains)
        } else {
          console.log('所有API均失败，使用知识库数据')
          var trains = generateMockTrains(fromCity, toCity, time)
          resolve(trains)
        }
      }).catch(function() {
        console.log('站到站查询失败，使用知识库数据')
        var trains = generateMockTrains(fromCity, toCity, time)
        resolve(trains)
      })
    })
  })
}

function searchTrainsByStation(fromCity, toCity) {
  return new Promise(function(resolve) {
    var today = new Date()
    var dateStr = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0')
    
    var url = 'https://kyfw.12306.cn/otn/leftTicket/query'
    var fromCode = getStationCode(fromCity)
    var toCode = getStationCode(toCity)
    
    var params = {
      'leftTicketDTO.train_date': dateStr,
      'leftTicketDTO.from_station': fromCode,
      'leftTicketDTO.to_station': toCode,
      'purpose_codes': 'ADULT'
    }
    
    request(url, params).then(function(res) {
      console.log('12306站到站API返回:', JSON.stringify(res))
      if (res && res.status === '1' && res.data && res.data.result && res.data.result.length > 0) {
        var realTrains = res.data.result.slice(0, 5).map(function(item, index) {
          var parts = item.split('|')
          var trainNo = parts[3]
          var type = trainNo.substring(0, 1)
          var typeName = '高铁'
          if (type === 'D') typeName = '动车'
          else if (type === 'C') typeName = '城际'
          else if (type === 'Z') typeName = '直达'
          else if (type === 'T') typeName = '特快'
          else if (type === 'K') typeName = '快速'
          else if (type === 'G') typeName = '高铁'
          
          var duration = parts[10]
          if (!duration || duration === '') duration = '2小时30分'
          
          var basePrice = calculateTrainPrice(fromCity, toCity, typeName)
          var prices = []
          if (typeName === '高铁') {
            prices = [{ type: '二等座', price: basePrice }, { type: '一等座', price: Math.round(basePrice * 1.6) }, { type: '商务座', price: Math.round(basePrice * 3.2) }]
          } else if (typeName === '动车') {
            prices = [{ type: '二等座', price: basePrice }, { type: '一等座', price: Math.round(basePrice * 1.6) }, { type: '无座', price: basePrice }]
          } else {
            prices = [{ type: '硬座', price: Math.floor(basePrice * 0.5) }, { type: '硬卧', price: Math.floor(basePrice * 0.9) }, { type: '软卧', price: Math.floor(basePrice * 1.4) }]
          }
          
          return {
            id: 'train_' + index,
            trainNo: trainNo,
            type: typeName,
            fromStation: parts[6],
            toStation: parts[7],
            startTime: parts[8],
            endTime: parts[9],
            duration: duration,
            prices: prices,
            minPrice: prices[0].price,
            provider: '12306',
            icon: typeName === '高铁' || typeName === '动车' ? '🚄' : '🚂',
            realData: true
          }
        })
        resolve(realTrains)
      } else {
        resolve([])
      }
    }).catch(function() {
      resolve([])
    })
  })
}

function getStationCode(city) {
  var codeMap = {
    '太原': 'TYV', '太原南': 'TYN',
    '北京': 'BJP', '北京南': 'VNP', '北京西': 'BXP',
    '上海': 'SHH', '上海虹桥': 'AOH',
    '南京': 'NJH', '南京南': 'NKP',
    '杭州': 'HZH', '杭州东': 'HGH',
    '武汉': 'WHN', '武昌': 'WCN',
    '西安': 'XAY', '西安北': 'XEY',
    '广州': 'GZQ', '广州南': 'IZQ',
    '深圳': 'SZQ', '深圳北': 'IOQ',
    '成都': 'CDW', '成都东': 'CED',
    '重庆': 'CQW', '重庆北': 'CUW',
    '天津': 'TJP', '天津南': 'TJP',
    '苏州': 'SZW', '苏州北': 'SIB',
    '郑州': 'ZZH', '郑州东': 'ZAF',
    '长沙': 'CSQ', '长沙南': 'CSN',
    '青岛': 'QDK', '青岛北': 'QYK',
    '沈阳': 'SYW', '沈阳北': 'SYP',
    '大连': 'DLD', '大连北': 'DIB',
    '合肥': 'HFH', '合肥南': 'HFN',
    '福州': 'FZS', '厦门北': 'XMN',
    '南昌': 'NCH', '南昌西': 'NCX',
    '昆明': 'KMM', '昆明南': 'KNN',
    '贵阳': 'GYM', '贵阳北': 'GYN',
    '南宁': 'NNZ', '南宁东': 'NNN',
    '兰州': 'LZZ', '兰州西': 'LXN',
    '西宁': 'XNQ', '银川': 'YCN',
    '呼和浩特': 'HHC', '呼和浩特东': 'HHD',
    '乌鲁木齐': 'WLM', '哈尔滨': 'HEB', '哈尔滨西': 'HBX',
    '长春': 'CCT', '石家庄': 'SJP'
  }
  
  var mainStation = getMainStation(city)
  return codeMap[mainStation] || codeMap[city] || 'TYV'
}

function calculateTrainPrice(fromCity, toCity, type) {
  var priceMap = {
    '太原-北京': { '高铁': 197, '动车': 154, '快速': 69 },
    '太原-西安': { '高铁': 195, '动车': 156, '快速': 69 },
    '太原-郑州': { '高铁': 190, '动车': 140, '快速': 102 },
    '太原-南京': { '高铁': 497, '动车': 321, '快速': 141.5 },
    '太原-杭州': { '高铁': 584, '动车': 380, '快速': 152.5 },
    '太原-武汉': { '高铁': 405, '动车': 280, '快速': 128.5 },
    '北京-上海': { '高铁': 553, '动车': 370, '快速': 177.5 },
    '北京-南京': { '高铁': 443, '动车': 280, '快速': 156.5 },
    '北京-杭州': { '高铁': 594, '动车': 380, '快速': 193.5 },
    '北京-武汉': { '高铁': 520, '动车': 350, '快速': 179.5 },
    '上海-南京': { '高铁': 144.5, '动车': 94.5, '快速': 46.5 },
    '上海-杭州': { '高铁': 73, '动车': 67, '快速': 23.5 },
    '上海-武汉': { '高铁': 316, '动车': 210, '快速': 148.5 },
    '南京-杭州': { '高铁': 117, '动车': 93, '快速': 51.5 },
    '南京-武汉': { '高铁': 250, '动车': 160, '快速': 107 },
    '武汉-长沙': { '高铁': 164, '动车': 131, '快速': 54.5 },
    '武汉-广州': { '高铁': 463, '动车': 340, '快速': 140.5 },
    '武汉-杭州': { '高铁': 285, '动车': 180, '快速': 105 },
    '西安-郑州': { '高铁': 229, '动车': 170, '快速': 79 },
    '西安-成都': { '高铁': 263, '动车': 210, '快速': 112 },
    '西安-杭州': { '高铁': 620, '动车': 400, '快速': 183.5 },
    '成都-重庆': { '高铁': 154, '动车': 96.5, '快速': 54.5 },
    '成都-杭州': { '高铁': 820, '动车': 520, '快速': 257.5 },
    '杭州-长沙': { '高铁': 257, '动车': 180, '快速': 102 },
    '杭州-广州': { '高铁': 600, '动车': 400, '快速': 194.5 },
    '广州-深圳': { '高铁': 74.5, '动车': 74.5, '快速': 23.5 },
    '长沙-广州': { '高铁': 314, '动车': 220, '快速': 112 }
  }
  
  var key1 = fromCity + '-' + toCity
  var key2 = toCity + '-' + fromCity
  
  var priceInfo = priceMap[key1] || priceMap[key2]
  
  if (priceInfo) {
    return priceInfo[type] || priceInfo['高铁'] || 200
  }
  
  var duration = getBaseDuration(fromCity, toCity)
  var basePrice = Math.round(duration * (type === '高铁' ? 100 : type === '动车' ? 70 : 35))
  
  return Math.max(basePrice, 50)
}

var cityBusData = {
  '太原': [
    { name: '807路', stops: 8, from: '火车站', to: '南站' },
    { name: '824路', stops: 12, from: '广场', to: '南站' },
    { name: '861路', stops: 6, from: '五一广场', to: '南站' }
  ],
  '南京': [
    { name: '地铁1号线', stops: 5, from: '南京站', to: '新街口' },
    { name: '33路', stops: 10, from: '南京南站', to: '夫子庙' },
    { name: '地铁3号线', stops: 7, from: '南京南站', to: '玄武湖' }
  ],
  '北京': [
    { name: '地铁4号线', stops: 6, from: '北京西站', to: '西单' },
    { name: '52路', stops: 14, from: '北京西站', to: '天安门' },
    { name: '地铁9号线', stops: 4, from: '北京西站', to: '国家图书馆' }
  ],
  '上海': [
    { name: '地铁2号线', stops: 8, from: '虹桥站', to: '人民广场' },
    { name: '941路', stops: 12, from: '虹桥枢纽', to: '上海火车站' },
    { name: '地铁10号线', stops: 6, from: '虹桥站', to: '南京东路' }
  ],
  '杭州': [
    { name: '地铁1号线', stops: 5, from: '杭州东站', to: '西湖' },
    { name: 'K7路', stops: 9, from: '城站火车站', to: '断桥' },
    { name: 'B1路', stops: 7, from: '杭州东站', to: '武林广场' }
  ],
  '广州': [
    { name: '地铁2号线', stops: 6, from: '广州南站', to: '公园前' },
    { name: '301路', stops: 11, from: '广州南站', to: '天河客运站' },
    { name: '地铁7号线', stops: 4, from: '广州南站', to: '大学城南' }
  ],
  '深圳': [
    { name: '地铁4号线', stops: 7, from: '深圳北站', to: '会展中心' },
    { name: 'M343路', stops: 10, from: '深圳北站', to: '世界之窗' },
    { name: '地铁5号线', stops: 5, from: '深圳北站', to: '前海湾' }
  ],
  '成都': [
    { name: '地铁7号线', stops: 6, from: '成都东站', to: '春熙路' },
    { name: '2路', stops: 13, from: '成都东站', to: '天府广场' },
    { name: '地铁2号线', stops: 8, from: '成都东站', to: '犀浦' }
  ],
  '重庆': [
    { name: '轨道交通3号线', stops: 7, from: '重庆北站', to: '观音桥' },
    { name: 'BRT01路', stops: 9, from: '重庆北站', to: '解放碑' },
    { name: '轨道交通10号线', stops: 5, from: '重庆北站', to: '江北机场' }
  ]
}

function calcTaxiPrice(lng1, lat1, lng2, lat2) {
  if (!Number.isFinite(lng1) || !Number.isFinite(lat1) ||
      !Number.isFinite(lng2) || !Number.isFinite(lat2)) {
    return { cost: 15, distance: 3, duration: '15分钟' }
  }
  var dx = (lng2 - lng1) * 111 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180)
  var dy = (lat2 - lat1) * 111
  var dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 300) {
    return { cost: 0, distance: Math.round(dist), duration: '', crossCity: true }
  }

  var cost = 0
  if (dist <= 3) {
    cost = 13
  } else if (dist <= 15) {
    cost = 13 + (dist - 3) * 2.3
  } else if (dist <= 50) {
    cost = 13 + 12 * 2.3 + (dist - 15) * 3.45
  } else {
    cost = 13 + 12 * 2.3 + 35 * 3.45 + (dist - 50) * 2.5
  }

  cost = Math.round(cost)
  if (cost > 300) cost = 300

  var durationMins = Math.max(5, Math.round(dist * 1.2))
  var duration = durationMins + '分钟'
  if (durationMins >= 60) {
    duration = Math.floor(durationMins / 60) + '小时' + (durationMins % 60 > 0 ? (durationMins % 60) + '分' : '')
  }
  return { cost: cost, distance: Math.round(dist), duration: duration }
}

function getLocalTransit(from, to, city) {
  var realCity = getCityFromNameSync(city)
  
  var fromCoord = getDefaultCoord(from, realCity)
  var toCoord = getDefaultCoord(to, realCity)
  var taxiInfo = calcTaxiPrice(fromCoord.lng, fromCoord.lat, toCoord.lng, toCoord.lat)

  var cityBuses = cityBusData[realCity] || [
    { name: '101路', stops: Math.floor(Math.random() * 6 + 4), from: '市中心', to: to },
    { name: '205路', stops: Math.floor(Math.random() * 8 + 5), from: from, to: '市中心' }
  ]

  var busLines = cityBuses.map(function(b, i) {
    return {
      name: b.name,
      stops: b.stops,
      from: b.from,
      to: b.to
    }
  })

  var busDuration = Math.max(10, Math.round(taxiInfo.distance * 3 + 10))
  var busCost = cityBuses.length > 0 && cityBuses[0].name.indexOf('地铁') >= 0 ? Math.min(8, Math.max(2, Math.round(taxiInfo.distance / 10))) : Math.min(5, Math.max(2, Math.round(taxiInfo.distance / 15)))

  var subwayLines = getSubwayLines(realCity)
  var subwayDuration = subwayLines.length > 0 ? Math.max(8, Math.round(taxiInfo.distance * 2.5 + 8)) : 0
  var subwayCost = subwayLines.length > 0 ? Math.min(7, Math.max(3, Math.round(taxiInfo.distance / 12))) : 0

  return {
    success: true,
    taxi: {
      cost: taxiInfo.cost,
      duration: taxiInfo.duration
    },
    bus: {
      cost: busCost,
      duration: busDuration + '分钟',
      lines: busLines
    },
    subway: subwayLines.length > 0 ? {
      cost: subwayCost,
      duration: subwayDuration + '分钟',
      lines: subwayLines
    } : null
  }
}

function getAMAPTransit(from, to, city) {
  return new Promise(function(resolve) {
    amapService.geocode(from, city).then(function(fromResult) {
      var fromGeo = fromResult.success ? { lng: Number(fromResult.data.location.split(',')[0]), lat: Number(fromResult.data.location.split(',')[1]), city: fromResult.data.city || city } : getDefaultCoord(from, city)
      
      amapService.geocode(to, city).then(function(toResult) {
        var toGeo = toResult.success ? { lng: Number(toResult.data.location.split(',')[0]), lat: Number(toResult.data.location.split(',')[1]), city: toResult.data.city || city } : getDefaultCoord(to, city)
        
        var fromCoord = fromGeo.lng + ',' + fromGeo.lat
        var toCoord = toGeo.lng + ',' + toGeo.lat
        var realCity = city || fromGeo.city || getCityFromNameSync(from)
        
        amapService.getRoutePlan(fromCoord, toCoord, 'transit', realCity).then(function(transitResult) {
          console.log('高德公交API返回:', JSON.stringify(transitResult))
          
          if (transitResult.success && transitResult.data.route && transitResult.data.route.transits && transitResult.data.route.transits.length > 0) {
            var transit = transitResult.data.route.transits[0]
            var busLines = []
            var subwayLines = []
            var hasSubway = false
            var walkSegments = []
            
            if (transit.segments) {
              transit.segments.forEach(function(seg) {
                if (seg.walking && seg.walking.distance && Number(seg.walking.distance) > 0) {
                  walkSegments.push({
                    type: 'walk',
                    distance: Number(seg.walking.distance)
                  })
                }
                
                if (seg.bus && seg.bus.buslines && seg.bus.buslines.length > 0) {
                  seg.bus.buslines.forEach(function(line) {
                    var isSubway = line.name && (line.name.indexOf('地铁') >= 0 || line.name.indexOf('轨道交通') >= 0 || line.name.indexOf('轻轨') >= 0)
                    var stopCount = line.via_num ? Number(line.via_num) : 0
                    var fromStop = line.departure_stop ? line.departure_stop.name : (seg.departure_stop ? seg.departure_stop.name : from)
                    var toStop = line.arrival_stop ? line.arrival_stop.name : (seg.arrival_stop ? seg.arrival_stop.name : to)
                    var busName = line.name || '公交线路'
                    
                    if (busName.indexOf('(') > 0) {
                      busName = busName.substring(0, busName.indexOf('('))
                    }
                    if (busName.indexOf('（') > 0) {
                      busName = busName.substring(0, busName.indexOf('（'))
                    }
                    
                    var item = {
                      name: busName,
                      stops: stopCount > 0 ? stopCount : Math.floor(Math.random() * 5 + 3),
                      from: fromStop,
                      to: toStop,
                      type: isSubway ? 'subway' : 'bus'
                    }
                    if (isSubway) {
                      subwayLines.push(item)
                      hasSubway = true
                    } else {
                      busLines.push(item)
                    }
                  })
                }
              })
            }
            
            var duration = transit.duration ? formatDuration(transit.duration) : Math.floor(Math.random() * 40 + 20) + '分钟'
            var cost = Number(transit.cost) || Math.floor(Math.random() * 5 + 2)
            
            var taxiCost = transitResult.data.route.taxi_cost ? Number(transitResult.data.route.taxi_cost) : null
            if (!taxiCost || taxiCost <= 0) {
              var taxiPriceInfo = calcTaxiPrice(fromGeo.lng, fromGeo.lat, toGeo.lng, toGeo.lat)
              taxiCost = taxiPriceInfo.cost
            }
            var taxiDuration = transit.duration ? formatDuration(Math.round(Number(transit.duration) * 0.6)) : (taxiPriceInfo ? taxiPriceInfo.duration : '15分钟')
            
            resolve({
              success: true,
              taxi: {
                cost: taxiCost,
                duration: taxiDuration
              },
              bus: {
                cost: cost,
                duration: duration,
                lines: busLines.length > 0 ? busLines : [{ name: '公交', stops: Math.floor(Math.random() * 5 + 3), from: from, to: to, type: 'bus' }],
                walkSegments: walkSegments
              },
              subway: hasSubway ? {
                cost: cost,
                duration: duration,
                lines: subwayLines,
                walkSegments: walkSegments
              } : null,
              fromCoord: fromCoord,
              toCoord: toCoord,
              city: realCity
            })
          } else {
            console.log('高德公交API失败，使用模拟数据')
            resolve(getLocalTransit(from, to, city))
          }
        }).catch(function() {
          console.log('高德公交API请求失败')
          resolve(getLocalTransit(from, to, city))
        })
      }).catch(function() {
        resolve(getLocalTransit(from, to, city))
      })
    }).catch(function() {
      resolve(getLocalTransit(from, to, city))
    })
  })
}

function getSubwayLines(city) {
  var subwayData = {
    '太原': [{ name: '地铁2号线', stops: Math.floor(Math.random() * 5 + 3), from: city + '北站', to: '市中心站' }],
    '北京': [{ name: '地铁1号线', stops: Math.floor(Math.random() * 8 + 5), from: city + '西站', to: '王府井站' }],
    '上海': [{ name: '地铁1号线', stops: Math.floor(Math.random() * 10 + 6), from: city + '南站', to: '人民广场站' }],
    '南京': [{ name: '地铁1号线', stops: Math.floor(Math.random() * 6 + 4), from: city + '站', to: '新街口站' }],
    '武汉': [{ name: '地铁2号线', stops: Math.floor(Math.random() * 7 + 4), from: city + '站', to: '光谷广场站' }],
    '杭州': [{ name: '地铁1号线', stops: Math.floor(Math.random() * 6 + 4), from: city + '东站', to: '武林广场站' }],
    '西安': [{ name: '地铁2号线', stops: Math.floor(Math.random() * 5 + 3), from: city + '北站', to: '钟楼站' }]
  }
  
  return subwayData[city] || []
}

function generateTripPlans(from, to, date, time) {
  return new Promise(function(resolve) {
    var fromCity = getCityFromNameSync(from)
    var toCity = getCityFromNameSync(to)
    
    Promise.all([
      searchTrainStations(fromCity),
      searchTrainStations(toCity)
    ]).then(function(stationsResult) {
      var fromStations = stationsResult[0]
      var toStations = stationsResult[1]
      
      var trains = generateMockTrains(from, to, time)
      var plans = []
      var maxPlans = Math.min(trains.length, 4)

      if (maxPlans === 0) {
        resolve(plans)
        return
      }

      var processQueue = Promise.resolve()

      trains.slice(0, maxPlans).forEach(function(train, index) {
        var fromStationInfo = fromStations.find(function(s) { return s.name === train.fromStation }) || fromStations[0]
        var toStationInfo = toStations.find(function(s) { return s.name === train.toStation }) || toStations[0]

        processQueue = processQueue.then(function() {
          return getAMAPTransit(from, fromStationInfo.name, fromCity).then(function(startToStation) {
            return getAMAPTransit(toStationInfo.name, to, toCity).then(function(endToDestination) {
              var segments = [
                {
                  type: 'local',
                  icon: '🚕',
                  title: '出发地 → ' + train.fromStation,
                  location: from + ' → ' + train.fromStation,
                  taxi: {
                    cost: startToStation.taxi.cost,
                    duration: startToStation.taxi.duration,
                    desc: '打车 · 约' + startToStation.taxi.duration + ' · ¥' + startToStation.taxi.cost
                  },
                  bus: {
                    cost: startToStation.bus.cost,
                    duration: startToStation.bus.duration,
                    desc: '公交 · 约' + startToStation.bus.duration + ' · ¥' + startToStation.bus.cost,
                    lines: startToStation.bus.lines
                  },
                  subway: startToStation.subway ? {
                    cost: startToStation.subway.cost,
                    duration: startToStation.subway.duration,
                    desc: '地铁 · 约' + startToStation.subway.duration + ' · ¥' + startToStation.subway.cost,
                    lines: startToStation.subway.lines
                  } : null
                },
                {
                  type: 'train',
                  icon: '🚄',
                  title: train.type + ' ' + train.trainNo,
                  desc: train.startTime + ' - ' + train.endTime + ' · ' + train.duration,
                  location: train.fromStation + ' → ' + train.toStation,
                  train: train
                },
                {
                  type: 'local',
                  icon: '🚕',
                  title: train.toStation + ' → ' + to,
                  location: train.toStation + ' → ' + to,
                  taxi: {
                    cost: endToDestination.taxi.cost,
                    duration: endToDestination.taxi.duration,
                    desc: '打车 · 约' + endToDestination.taxi.duration + ' · ¥' + endToDestination.taxi.cost
                  },
                  bus: {
                    cost: endToDestination.bus.cost,
                    duration: endToDestination.bus.duration,
                    desc: '公交 · 约' + endToDestination.bus.duration + ' · ¥' + endToDestination.bus.cost,
                    lines: endToDestination.bus.lines
                  },
                  subway: endToDestination.subway ? {
                    cost: endToDestination.subway.cost,
                    duration: endToDestination.subway.duration,
                    desc: '地铁 · 约' + endToDestination.subway.duration + ' · ¥' + endToDestination.subway.cost,
                    lines: endToDestination.subway.lines
                  } : null
                }
              ]

              var taxiTotalCost = Number(train.minPrice) + Number(startToStation.taxi.cost) + Number(endToDestination.taxi.cost)
              var busTotalCost = Number(train.minPrice) + Number(startToStation.bus.cost) + Number(endToDestination.bus.cost)

              plans.push({
                id: 'plan_' + index,
                train: train,
                segments: segments,
                taxiTotalCost: taxiTotalCost,
                busTotalCost: busTotalCost,
                totalCost: taxiTotalCost,
                totalDuration: '',
                startTime: train.startTime,
                endTime: train.endTime,
                isRecommended: index === 0,
                isCheapest: index === maxPlans - 1,
                fromStation: fromStationInfo,
                toStation: toStationInfo
              })
            }).catch(function() {})
          }).catch(function() {})
        })
      })

      processQueue.then(function() {
        resolve(plans)
      })
    }).catch(function() {
      var trains = generateMockTrains(from, to, time)
      var plans = []
      var maxPlans = Math.min(trains.length, 4)

      if (maxPlans === 0) {
        resolve(plans)
        return
      }

      var processQueue = Promise.resolve()

      trains.slice(0, maxPlans).forEach(function(train, index) {
        var fromCity = getCityFromNameSync(from)
        var toCity = getCityFromNameSync(to)

        processQueue = processQueue.then(function() {
          return getAMAPTransit(from, train.fromStation, fromCity).then(function(startToStation) {
            return getAMAPTransit(train.toStation, to, toCity).then(function(endToDestination) {
              var segments = [
                {
                  type: 'local',
                  icon: '🚕',
                  title: '出发地 → ' + train.fromStation,
                  location: from + ' → ' + train.fromStation,
                  taxi: {
                    cost: startToStation.taxi.cost,
                    duration: startToStation.taxi.duration,
                    desc: '打车 · 约' + startToStation.taxi.duration + ' · ¥' + startToStation.taxi.cost
                  },
                  bus: {
                    cost: startToStation.bus.cost,
                    duration: startToStation.bus.duration,
                    desc: '公交 · 约' + startToStation.bus.duration + ' · ¥' + startToStation.bus.cost,
                    lines: startToStation.bus.lines
                  },
                  subway: startToStation.subway ? {
                    cost: startToStation.subway.cost,
                    duration: startToStation.subway.duration,
                    desc: '地铁 · 约' + startToStation.subway.duration + ' · ¥' + startToStation.subway.cost,
                    lines: startToStation.subway.lines
                  } : null
                },
                {
                  type: 'train',
                  icon: '🚄',
                  title: train.type + ' ' + train.trainNo,
                  desc: train.startTime + ' - ' + train.endTime + ' · ' + train.duration,
                  location: train.fromStation + ' → ' + train.toStation,
                  train: train
                },
                {
                  type: 'local',
                  icon: '🚕',
                  title: train.toStation + ' → ' + to,
                  location: train.toStation + ' → ' + to,
                  taxi: {
                    cost: endToDestination.taxi.cost,
                    duration: endToDestination.taxi.duration,
                    desc: '打车 · 约' + endToDestination.taxi.duration + ' · ¥' + endToDestination.taxi.cost
                  },
                  bus: {
                    cost: endToDestination.bus.cost,
                    duration: endToDestination.bus.duration,
                    desc: '公交 · 约' + endToDestination.bus.duration + ' · ¥' + endToDestination.bus.cost,
                    lines: endToDestination.bus.lines
                  },
                  subway: endToDestination.subway ? {
                    cost: endToDestination.subway.cost,
                    duration: endToDestination.subway.duration,
                    desc: '地铁 · 约' + endToDestination.subway.duration + ' · ¥' + endToDestination.subway.cost,
                    lines: endToDestination.subway.lines
                  } : null
                }
              ]

              var taxiTotalCost = Number(train.minPrice) + Number(startToStation.taxi.cost) + Number(endToDestination.taxi.cost)
              var busTotalCost = Number(train.minPrice) + Number(startToStation.bus.cost) + Number(endToDestination.bus.cost)

              plans.push({
                id: 'plan_' + index,
                train: train,
                segments: segments,
                taxiTotalCost: taxiTotalCost,
                busTotalCost: busTotalCost,
                totalCost: taxiTotalCost,
                totalDuration: '',
                startTime: train.startTime,
                endTime: train.endTime,
                isRecommended: index === 0,
                isCheapest: index === maxPlans - 1
              })
            }).catch(function() {})
          }).catch(function() {})
        })
      })

      processQueue.then(function() {
        resolve(plans)
      })
    })
  })
}

function getTransit(from, to) {
  return geocode(from).then(function(fromGeo) {
    if (!fromGeo || !Number.isFinite(fromGeo.lng) || !Number.isFinite(fromGeo.lat)) {
      console.warn('getTransit: 起点地理编码失败', from)
      return { error: '起点位置解析失败' }
    }
    return geocode(to).then(function(toGeo) {
      if (!toGeo || !Number.isFinite(toGeo.lng) || !Number.isFinite(toGeo.lat)) {
        console.warn('getTransit: 终点地理编码失败', to)
        return { error: '终点位置解析失败' }
      }
      
      var fromCoord = fromGeo.lng + ',' + fromGeo.lat
      var toCoord = toGeo.lng + ',' + toGeo.lat

      var params = {
        key: apiConfig.AMAP_KEY,
        origin: fromCoord,
        destination: toCoord,
        city: fromGeo.city || from,
        strategy: 0,
        extensions: 'all',
        output: 'json'
      }

      if (fromGeo.city !== toGeo.city) {
        params.cityd = toGeo.city || to
      }

      return request(apiConfig.AMAP_TRANSIT, params).then(function(res) {
        var taxiCost = res && res.route && res.route.taxi_cost ? Number(res.route.taxi_cost) : null
        var taxiDistance = res && res.route && res.route.distance ? Number(res.route.distance) : 0
        var taxiDuration = taxiDistance ? formatDuration(taxiDistance * 0.09) : ''
        
        if (!taxiCost || taxiCost <= 0) {
          var taxiInfo = calcTaxiPrice(
            Number(fromGeo.lng), Number(fromGeo.lat),
            Number(toGeo.lng), Number(toGeo.lat)
          )
          taxiCost = taxiInfo.cost
          if (!taxiDuration) taxiDuration = taxiInfo.duration
        }

        var busRoutes = []
        if (res && res.route && res.route.transits) {
          res.route.transits.forEach(function(transit, index) {
            if (index >= 3) return
            var segments = []
            var segList = transit.segments || []
            segList.forEach(function(seg) {
              if (seg.walking && seg.walking.distance && Number(seg.walking.distance) > 0) {
                segments.push({
                  type: 'walk',
                  icon: '🚶',
                  desc: '步行' + formatDistance(seg.walking.distance),
                  distance: Number(seg.walking.distance)
                })
              }
              if (seg.bus && seg.bus.buslines && seg.bus.buslines.length > 0) {
                seg.bus.buslines.forEach(function(line) {
                  var stopCount = line.via_num ? Number(line.via_num) : 0
                  var fromStop = line.departure_stop ? line.departure_stop.name : ''
                  var toStop = line.arrival_stop ? line.arrival_stop.name : ''
                  var busName = line.name || ''
                  var busType = 'bus'
                  if (busName.indexOf('地铁') >= 0 || busName.indexOf('轨道交通') >= 0) {
                    busType = 'subway'
                  }

                  if (busName.indexOf('(') > 0) {
                    busName = busName.substring(0, busName.indexOf('('))
                  }
                  if (busName.indexOf('（') > 0) {
                    busName = busName.substring(0, busName.indexOf('（'))
                  }

                  var icon = busType === 'subway' ? '🚇' : '🚌'

                  segments.push({
                    type: busType,
                    icon: icon,
                    busName: busName,
                    fromStop: fromStop,
                    toStop: toStop,
                    stopCount: stopCount,
                    desc: '乘坐' + busName + (stopCount > 0 ? '(' + stopCount + '站)' : '') + '从' + fromStop + '到' + toStop,
                    lineColor: seg.bus && seg.bus.line_color ? seg.bus.line_color : '#E63946'
                  })
                })
              }
              if (seg.railway && seg.railway.trains && seg.railway.trains.length > 0) {
                var train = seg.railway.trains[0]
                segments.push({
                  type: 'train',
                  icon: '🚄',
                  busName: train.name || '',
                  fromStop: train.departure_stop ? train.departure_stop.name : '',
                  toStop: train.arrival_stop ? train.arrival_stop.name : '',
                  stopCount: 0,
                  desc: train.name + ' ' + (train.departure_time || '') + ' - ' + (train.arrival_time || ''),
                  duration: formatDuration(seg.railway.duration)
                })
              }
            })

            busRoutes.push({
              id: 'bus_' + index,
              duration: formatDuration(transit.duration),
              cost: transit.cost || '未知',
              walkingDistance: formatDistance(transit.walking_distance),
              distance: formatDistance(transit.distance),
              segments: segments,
              isRecommended: index === 0,
              walkingSteps: transit.walking_steps || 0
            })
          })
        }

        return {
          taxiCost: taxiCost,
          taxiDistance: taxiDistance,
          taxiDuration: taxiDuration,
          busRoutes: busRoutes,
          fromCoord: fromCoord,
          toCoord: toCoord,
          fromCity: fromGeo.city,
          toCity: toGeo.city,
          routes: res && res.route ? res.route : null
        }
      })
    })
  }).catch(function(err) {
    console.error('高德API调用失败:', err)
    var fromCoord = getDefaultCoord(from)
    var toCoord = getDefaultCoord(to)
    var fromCoordStr = fromCoord.lng + ',' + fromCoord.lat
    var toCoordStr = toCoord.lng + ',' + toCoord.lat

    var taxiInfo = calcTaxiPrice(fromCoord.lng, fromCoord.lat, toCoord.lng, toCoord.lat)
    var taxiCost = taxiInfo.cost
    var taxiDistance = Math.round(Math.sqrt(
      Math.pow((toCoord.lng - fromCoord.lng) * 111 * Math.cos((fromCoord.lat + toCoord.lat) / 2 * Math.PI / 180), 2) +
      Math.pow((toCoord.lat - fromCoord.lat) * 111, 2)
    ))
    var taxiDuration = taxiInfo.duration

    var busRoutes = [
      {
        id: 'bus_0',
        duration: '1小时20分',
        cost: '4',
        walkingDistance: '800米',
        distance: '12.5公里',
        segments: [
          { type: 'walk', icon: '🚶', desc: '步行800米到' + from + '站', distance: 800 },
          { type: 'bus', icon: '🚌', busName: '101路', fromStop: from + '站', toStop: '中心广场站', stopCount: 6, desc: '乘坐101路(6站)从' + from + '站到中心广场站' },
          { type: 'walk', icon: '🚶', desc: '步行500米到' + to, distance: 500 }
        ],
        isRecommended: true
      },
      {
        id: 'bus_1',
        duration: '1小时45分',
        cost: '6',
        walkingDistance: '400米',
        distance: '15.2公里',
        segments: [
          { type: 'walk', icon: '🚶', desc: '步行400米到' + from + '北站', distance: 400 },
          { type: 'bus', icon: '🚌', busName: '205路', fromStop: from + '北站', toStop: '人民公园站', stopCount: 4, desc: '乘坐205路(4站)从' + from + '北站到人民公园站' },
          { type: 'bus', icon: '🚌', busName: '302路', fromStop: '人民公园站', toStop: to + '南站', stopCount: 8, desc: '乘坐302路(8站)从人民公园站到' + to + '南站' },
          { type: 'walk', icon: '🚶', desc: '步行300米到' + to, distance: 300 }
        ],
        isRecommended: false
      }
    ]

    return {
      taxiCost: taxiCost,
      taxiDistance: taxiDistance + '000',
      taxiDuration: taxiDuration,
      busRoutes: busRoutes,
      fromCoord: fromCoordStr,
      toCoord: toCoordStr,
      fromCity: fromCoord.city,
      toCity: toCoord.city,
      routes: null
    }
  })
}

function getTripPlans(from, to, date, time) {
  return generateTripPlans(from, to, date, time)
}

function calculateArrivalTime(durationStr) {
  var now = new Date()
  var match = durationStr.match(/(\d+)(?:小时|时)?\s*(\d+)?(?:分钟|分)?/)
  var minutes = 0
  if (match) {
    if (match[2]) {
      minutes = Number(match[1]) * 60 + Number(match[2])
    } else {
      minutes = Number(match[1])
    }
  }
  var arrival = new Date(now.getTime() + minutes * 60 * 1000)
  var hours = arrival.getHours()
  var mins = arrival.getMinutes()
  return (hours < 10 ? '0' : '') + hours + ':' + (mins < 10 ? '0' : '') + mins
}

function getLocalPlans(from, to, time) {
  return getTransit(from, to).then(function(transit) {
    var plans = []
    var fromCity = transit.fromCity || from
    var toCity = transit.toCity || to
    var isCrossCity = fromCity !== toCity && fromCity && toCity

    if (!isCrossCity) {
      var taxiCost = transit.taxiCost
      var taxiDuration = transit.taxiDuration
      if (!taxiCost || taxiCost <= 0) {
        var fromCoord = getDefaultCoord(from, fromCity)
        var toCoord = getDefaultCoord(to, toCity)
        var taxiInfo = calcTaxiPrice(fromCoord.lng, fromCoord.lat, toCoord.lng, toCoord.lat)
        if (taxiInfo.crossCity) {
          isCrossCity = true
        } else {
          taxiCost = taxiInfo.cost
          taxiDuration = taxiInfo.duration
        }
      }
    }

    if (!isCrossCity) {
      var taxiArrivalTime = calculateArrivalTime(taxiDuration)

      plans.push({
        id: 'plan_taxi',
        type: 'taxi',
        segments: [{
          type: 'taxi',
          icon: '🚕',
          title: '打车',
          desc: '约' + taxiDuration + ' · ¥' + taxiCost + ' · 预计' + taxiArrivalTime + '到达',
          location: from + ' → ' + to,
          taxi: {
            cost: taxiCost,
            duration: taxiDuration,
            arrivalTime: taxiArrivalTime,
            desc: '打车 · 约' + taxiDuration + ' · ¥' + taxiCost
          }
        }],
        taxiTotalCost: taxiCost,
        busTotalCost: taxiCost,
        totalCost: taxiCost,
        totalDuration: taxiDuration,
        arrivalTime: taxiArrivalTime,
        startTime: '',
        endTime: '',
        isRecommended: true,
        isCheapest: false,
        fromCity: fromCity,
        toCity: toCity
      })

      if (transit.busRoutes && transit.busRoutes.length > 0) {
        transit.busRoutes.forEach(function(busRoute, index) {
          var busSegments = []
          busRoute.segments.forEach(function(seg) {
            if (seg.type === 'walk') {
              busSegments.push({
                type: 'walk',
                icon: '🚶',
                title: '步行',
                desc: seg.desc || '步行前往',
                location: '',
                distance: seg.distance
              })
            } else {
              var busType = seg.type === 'subway' ? 'subway' : 'bus'
              busSegments.push({
                type: busType,
                icon: seg.icon || (busType === 'subway' ? '🚇' : '🚌'),
                title: seg.busName || (busType === 'subway' ? '地铁' : '公交'),
                desc: seg.desc || '乘坐公共交通',
                location: (seg.fromStop || '') + ' → ' + (seg.toStop || ''),
                bus: {
                  cost: busRoute.cost,
                  duration: busRoute.duration,
                  desc: busType === 'subway' ? '地铁 · 约' + busRoute.duration + ' · ¥' + busRoute.cost : '公交 · 约' + busRoute.duration + ' · ¥' + busRoute.cost,
                  lines: [{ name: seg.busName, stops: seg.stopCount, from: seg.fromStop, to: seg.toStop, type: busType }]
                },
                subway: busType === 'subway' ? {
                  cost: busRoute.cost,
                  duration: busRoute.duration,
                  desc: '地铁 · 约' + busRoute.duration + ' · ¥' + busRoute.cost,
                  lines: [{ name: seg.busName, stops: seg.stopCount, from: seg.fromStop, to: seg.toStop, type: busType }]
                } : null
              })
            }
          })

          plans.push({
            id: 'plan_bus_' + index,
            type: 'bus',
            segments: busSegments,
            taxiTotalCost: Number(busRoute.cost) + 20,
            busTotalCost: Number(busRoute.cost),
            totalCost: Number(busRoute.cost),
            totalDuration: busRoute.duration,
            arrivalTime: calculateArrivalTime(busRoute.duration),
            startTime: '',
            endTime: '',
            isRecommended: index === 0,
            isCheapest: index === transit.busRoutes.length - 1,
            fromCity: fromCity,
            toCity: toCity
          })
        })
      } else {
        var busCost = 2
        var busDuration = '45分钟'
        plans.push({
          id: 'plan_bus_0',
          type: 'bus',
          segments: [{
            type: 'bus',
            icon: '🚌',
            title: '公交',
            desc: '约' + busDuration + ' · ¥' + busCost,
            location: from + ' → ' + to,
            bus: {
              cost: busCost,
              duration: busDuration,
              desc: '公交 · 约' + busDuration + ' · ¥' + busCost,
              lines: [{ name: '101路', stops: Math.floor(Math.random() * 6 + 4), from: from + '站', to: to + '站', type: 'bus' }]
            },
            subway: null
          }],
          taxiTotalCost: busCost + 20,
          busTotalCost: busCost,
          totalCost: busCost,
          totalDuration: busDuration,
          arrivalTime: calculateArrivalTime(busDuration),
          startTime: '',
          endTime: '',
          isRecommended: false,
          isCheapest: true,
          fromCity: fromCity,
          toCity: toCity
        })
      }
    }

    if (isCrossCity) {
      return searchTrains(fromCity, toCity, time).then(function(trains) {
        var filteredTrains = trains.slice(0, 5)
        
        var processQueue = Promise.resolve()
        
        filteredTrains.forEach(function(train, index) {
          processQueue = processQueue.then(function() {
            return getAMAPTransit(from, train.fromStation, fromCity).then(function(startToStation) {
              return getAMAPTransit(train.toStation, to, toCity).then(function(endToDestination) {
                if (!startToStation.success || !endToDestination.success) {
                  console.warn('部分公交查询失败，使用模拟数据:', startToStation.error, endToDestination.error)
                  startToStation = getLocalTransit(from, train.fromStation, fromCity)
                  endToDestination = getLocalTransit(train.toStation, to, toCity)
                }
                
                var segments = [
                  {
                    type: 'local',
                    icon: '🚕',
                    title: '出发地 → ' + train.fromStation,
                    location: from + ' → ' + train.fromStation,
                    taxi: {
                      cost: startToStation.taxi.cost,
                      duration: startToStation.taxi.duration,
                      desc: '打车 · 约' + startToStation.taxi.duration + ' · ¥' + startToStation.taxi.cost
                    },
                    bus: {
                      cost: startToStation.bus.cost,
                      duration: startToStation.bus.duration,
                      desc: '公交 · 约' + startToStation.bus.duration + ' · ¥' + startToStation.bus.cost,
                      lines: startToStation.bus.lines
                    },
                    subway: startToStation.subway ? {
                      cost: startToStation.subway.cost,
                      duration: startToStation.subway.duration,
                      desc: '地铁 · 约' + startToStation.subway.duration + ' · ¥' + startToStation.subway.cost,
                      lines: startToStation.subway.lines
                    } : null
                  },
                  {
                    type: 'train',
                    icon: '🚄',
                    title: train.type + ' ' + train.trainNo,
                    desc: train.startTime + ' - ' + train.endTime + ' · ' + train.duration,
                    location: train.fromStation + ' → ' + train.toStation,
                    train: train
                  },
                  {
                    type: 'local',
                    icon: '🚕',
                    title: train.toStation + ' → ' + to,
                    location: train.toStation + ' → ' + to,
                    taxi: {
                      cost: endToDestination.taxi.cost,
                      duration: endToDestination.taxi.duration,
                      desc: '打车 · 约' + endToDestination.taxi.duration + ' · ¥' + endToDestination.taxi.cost
                    },
                    bus: {
                      cost: endToDestination.bus.cost,
                      duration: endToDestination.bus.duration,
                      desc: '公交 · 约' + endToDestination.bus.duration + ' · ¥' + endToDestination.bus.cost,
                      lines: endToDestination.bus.lines
                    },
                    subway: endToDestination.subway ? {
                      cost: endToDestination.subway.cost,
                      duration: endToDestination.subway.duration,
                      desc: '地铁 · 约' + endToDestination.subway.duration + ' · ¥' + endToDestination.subway.cost,
                      lines: endToDestination.subway.lines
                    } : null
                  }
                ]

                var taxiTotalCost = Number(train.minPrice) + Number(startToStation.taxi.cost) + Number(endToDestination.taxi.cost)
                var busTotalCost = Number(train.minPrice) + Number(startToStation.bus.cost) + Number(endToDestination.bus.cost)

                var sanitizeTime = function(t) {
                  if (!t || typeof t !== 'string' || t.indexOf('NaN') >= 0 || t.indexOf('undefined') >= 0) {
                    return '--:--'
                  }
                  return t
                }
                var pStartTime = sanitizeTime(train.startTime)
                var pEndTime = sanitizeTime(train.endTime)

                plans.push({
                  id: 'plan_train_' + index,
                  type: 'train',
                  train: train,
                  segments: segments,
                  taxiTotalCost: taxiTotalCost,
                  busTotalCost: busTotalCost,
                  totalCost: taxiTotalCost,
                  totalDuration: train.duration,
                  arrivalTime: pEndTime,
                  startTime: pStartTime,
                  endTime: pEndTime,
                  isRecommended: index === 0,
                  isCheapest: index === filteredTrains.length - 1 && index < 3,
                  fromCity: fromCity,
                  toCity: toCity
                })
              }).catch(function(err) {
                console.error('公交查询异常:', err)
                var startToStation = getLocalTransit(from, train.fromStation, fromCity)
                var endToDestination = getLocalTransit(train.toStation, to, toCity)
                
                var segments = [
                  {
                    type: 'local',
                    icon: '🚕',
                    title: '出发地 → ' + train.fromStation,
                    location: from + ' → ' + train.fromStation,
                    taxi: {
                      cost: startToStation.taxi.cost,
                      duration: startToStation.taxi.duration,
                      desc: '打车 · 约' + startToStation.taxi.duration + ' · ¥' + startToStation.taxi.cost
                    },
                    bus: {
                      cost: startToStation.bus.cost,
                      duration: startToStation.bus.duration,
                      desc: '公交 · 约' + startToStation.bus.duration + ' · ¥' + startToStation.bus.cost,
                      lines: startToStation.bus.lines
                    },
                    subway: startToStation.subway ? {
                      cost: startToStation.subway.cost,
                      duration: startToStation.subway.duration,
                      desc: '地铁 · 约' + startToStation.subway.duration + ' · ¥' + startToStation.subway.cost,
                      lines: startToStation.subway.lines
                    } : null
                  },
                  {
                    type: 'train',
                    icon: '🚄',
                    title: train.type + ' ' + train.trainNo,
                    desc: train.startTime + ' - ' + train.endTime + ' · ' + train.duration,
                    location: train.fromStation + ' → ' + train.toStation,
                    train: train
                  },
                  {
                    type: 'local',
                    icon: '🚕',
                    title: train.toStation + ' → ' + to,
                    location: train.toStation + ' → ' + to,
                    taxi: {
                      cost: endToDestination.taxi.cost,
                      duration: endToDestination.taxi.duration,
                      desc: '打车 · 约' + endToDestination.taxi.duration + ' · ¥' + endToDestination.taxi.cost
                    },
                    bus: {
                      cost: endToDestination.bus.cost,
                      duration: endToDestination.bus.duration,
                      desc: '公交 · 约' + endToDestination.bus.duration + ' · ¥' + endToDestination.bus.cost,
                      lines: endToDestination.bus.lines
                    },
                    subway: endToDestination.subway ? {
                      cost: endToDestination.subway.cost,
                      duration: endToDestination.subway.duration,
                      desc: '地铁 · 约' + endToDestination.subway.duration + ' · ¥' + endToDestination.subway.cost,
                      lines: endToDestination.subway.lines
                    } : null
                  }
                ]

                var taxiTotalCost = Number(train.minPrice) + Number(startToStation.taxi.cost) + Number(endToDestination.taxi.cost)
                var busTotalCost = Number(train.minPrice) + Number(startToStation.bus.cost) + Number(endToDestination.bus.cost)

                var sanitizeTime = function(t) {
                  if (!t || typeof t !== 'string' || t.indexOf('NaN') >= 0 || t.indexOf('undefined') >= 0) {
                    return '--:--'
                  }
                  return t
                }
                var pStartTime = sanitizeTime(train.startTime)
                var pEndTime = sanitizeTime(train.endTime)

                plans.push({
                  id: 'plan_train_' + index,
                  type: 'train',
                  train: train,
                  segments: segments,
                  taxiTotalCost: taxiTotalCost,
                  busTotalCost: busTotalCost,
                  totalCost: taxiTotalCost,
                  totalDuration: train.duration,
                  arrivalTime: pEndTime,
                  startTime: pStartTime,
                  endTime: pEndTime,
                  isRecommended: index === 0,
                  isCheapest: index === filteredTrains.length - 1 && index < 3,
                  fromCity: fromCity,
                  toCity: toCity
                })
              })
            }).catch(function(err) {
              console.error('公交查询异常:', err)
              var startToStation = getLocalTransit(from, train.fromStation, fromCity)
              var endToDestination = getLocalTransit(train.toStation, to, toCity)
              
              var segments = [
                {
                  type: 'local',
                  icon: '🚕',
                  title: '出发地 → ' + train.fromStation,
                  location: from + ' → ' + train.fromStation,
                  taxi: {
                    cost: startToStation.taxi.cost,
                    duration: startToStation.taxi.duration,
                    desc: '打车 · 约' + startToStation.taxi.duration + ' · ¥' + startToStation.taxi.cost
                  },
                  bus: {
                    cost: startToStation.bus.cost,
                    duration: startToStation.bus.duration,
                    desc: '公交 · 约' + startToStation.bus.duration + ' · ¥' + startToStation.bus.cost,
                    lines: startToStation.bus.lines
                  },
                  subway: startToStation.subway ? {
                    cost: startToStation.subway.cost,
                    duration: startToStation.subway.duration,
                    desc: '地铁 · 约' + startToStation.subway.duration + ' · ¥' + startToStation.subway.cost,
                    lines: startToStation.subway.lines
                  } : null
                },
                {
                  type: 'train',
                  icon: '🚄',
                  title: train.type + ' ' + train.trainNo,
                  desc: train.startTime + ' - ' + train.endTime + ' · ' + train.duration,
                  location: train.fromStation + ' → ' + train.toStation,
                  train: train
                },
                {
                  type: 'local',
                  icon: '🚕',
                  title: train.toStation + ' → ' + to,
                  location: train.toStation + ' → ' + to,
                  taxi: {
                    cost: endToDestination.taxi.cost,
                    duration: endToDestination.taxi.duration,
                    desc: '打车 · 约' + endToDestination.taxi.duration + ' · ¥' + endToDestination.taxi.cost
                  },
                  bus: {
                    cost: endToDestination.bus.cost,
                    duration: endToDestination.bus.duration,
                    desc: '公交 · 约' + endToDestination.bus.duration + ' · ¥' + endToDestination.bus.cost,
                    lines: endToDestination.bus.lines
                  },
                  subway: endToDestination.subway ? {
                    cost: endToDestination.subway.cost,
                    duration: endToDestination.subway.duration,
                    desc: '地铁 · 约' + endToDestination.subway.duration + ' · ¥' + endToDestination.subway.cost,
                    lines: endToDestination.subway.lines
                  } : null
                }
              ]

              var taxiTotalCost = Number(train.minPrice) + Number(startToStation.taxi.cost) + Number(endToDestination.taxi.cost)
              var busTotalCost = Number(train.minPrice) + Number(startToStation.bus.cost) + Number(endToDestination.bus.cost)

              plans.push({
                id: 'plan_train_' + index,
                type: 'train',
                train: train,
                segments: segments,
                taxiTotalCost: taxiTotalCost,
                busTotalCost: busTotalCost,
                totalCost: taxiTotalCost,
                totalDuration: train.duration,
                arrivalTime: train.endTime,
                startTime: train.startTime,
                endTime: train.endTime,
                isRecommended: index === 0,
                isCheapest: index === filteredTrains.length - 1 && index < 3,
                fromCity: fromCity,
                toCity: toCity
              })
            })
          })
        })
        
        return processQueue.then(function() {
          return agentRecommend(plans, time, from, to)
        })
      })
    } else {
      if (transit.busRoutes.length === 0) {
        transit.busRoutes = [{
          id: 'bus_0',
          duration: '50分钟',
          cost: 4,
          walkingDistance: '600米',
          distance: '10公里',
          segments: [
            { type: 'walk', icon: '🚶', desc: '步行600米到' + from + '地铁站' },
            { type: 'bus', icon: '🚇', busName: '地铁2号线', fromStop: from + '地铁站', toStop: to + '站', stopCount: 5, desc: '乘坐地铁2号线(5站)从' + from + '地铁站到' + to + '站' }
          ],
          isRecommended: true
        }, {
          id: 'bus_1',
          duration: '1小时10分',
          cost: 2,
          walkingDistance: '1000米',
          distance: '12公里',
          segments: [
            { type: 'walk', icon: '🚶', desc: '步行400米到' + from + '北站' },
            { type: 'bus', icon: '🚌', busName: '101路', fromStop: from + '北站', toStop: '中心广场站', stopCount: 8, desc: '乘坐101路(8站)从' + from + '北站到中心广场站' },
            { type: 'walk', icon: '🚶', desc: '步行600米到' + to }
          ],
          isRecommended: false
        }, {
          id: 'bus_2',
          duration: '1小时20分',
          cost: 4,
          walkingDistance: '700米',
          distance: '15公里',
          segments: [
            { type: 'walk', icon: '🚶', desc: '步行300米到' + from + '南站' },
            { type: 'bus', icon: '🚌', busName: '205路', fromStop: from + '南站', toStop: '人民公园站', stopCount: 6, desc: '乘坐205路(6站)从' + from + '南站到人民公园站' },
            { type: 'bus', icon: '🚌', busName: '302路', fromStop: '人民公园站', toStop: to + '站', stopCount: 4, desc: '乘坐302路(4站)从人民公园站到' + to + '站' }
          ],
          isRecommended: false
        }]
      }

      transit.busRoutes.forEach(function(busRoute, index) {
        var busCost = busRoute.cost === '未知' ? 2 : Number(busRoute.cost)
        var busArrivalTime = calculateArrivalTime(busRoute.duration)
        var segments = []
        busRoute.segments.forEach(function(seg) {
          if (seg.type === 'walk') {
            segments.push({
              type: 'walk',
              icon: seg.icon,
              title: '步行',
              desc: seg.desc,
              location: ''
            })
          } else if (seg.type === 'bus' || seg.type === 'subway') {
            var segIcon = seg.icon || (seg.type === 'subway' ? '🚇' : '🚌')
            segments.push({
              type: seg.type === 'subway' ? 'bus' : seg.type,
              icon: segIcon,
              title: seg.busName,
              desc: seg.desc,
              location: seg.fromStop + ' → ' + seg.toStop,
              bus: {
                cost: busCost,
                duration: busRoute.duration,
                arrivalTime: busArrivalTime,
                desc: '公交 · 约' + busRoute.duration + ' · ¥' + busCost,
                lines: [{ name: seg.busName, stops: seg.stopCount, from: seg.fromStop, to: seg.toStop }]
              }
            })
          }
        })

        plans.push({
          id: 'plan_bus_' + index,
          type: 'bus',
          segments: segments,
          taxiTotalCost: busCost,
          busTotalCost: busCost,
          totalCost: busCost,
          totalDuration: busRoute.duration,
          arrivalTime: busArrivalTime,
          startTime: '',
          endTime: '',
          isRecommended: busRoute.isRecommended,
          isCheapest: index === transit.busRoutes.length - 1,
          fromCity: fromCity,
          toCity: toCity
        })
      })

      return agentRecommend(plans, time, from, to)
    }
  }).catch(function() {
    var fromCity = getCityFromNameSync(from)
    var toCity = getCityFromNameSync(to)
    var isCrossCity = fromCity !== toCity && fromCity && toCity
    
    var fromCoord = getDefaultCoord(from, fromCity)
    var toCoord = getDefaultCoord(to, toCity)
    var taxiInfo = calcTaxiPrice(fromCoord.lng, fromCoord.lat, toCoord.lng, toCoord.lat)
    var taxiCost = taxiInfo.cost
    var taxiDuration = taxiInfo.duration
    var taxiArrivalTime = calculateArrivalTime(taxiDuration)

    var plans = [{
      id: 'plan_taxi',
      type: 'taxi',
      segments: [{
        type: 'taxi',
        icon: '🚕',
        title: '打车',
        desc: '约' + taxiDuration + ' · ¥' + taxiCost + ' · 预计' + taxiArrivalTime + '到达',
        location: from + ' → ' + to,
        taxi: {
          cost: taxiCost,
          duration: taxiDuration,
          arrivalTime: taxiArrivalTime,
          desc: '打车 · 约' + taxiDuration + ' · ¥' + taxiCost
        }
      }],
      taxiTotalCost: taxiCost,
      busTotalCost: taxiCost,
      totalCost: taxiCost,
      totalDuration: taxiDuration,
      arrivalTime: taxiArrivalTime,
      startTime: '',
      endTime: '',
      isRecommended: !isCrossCity,
      isCheapest: false,
      fromCity: fromCity,
      toCity: toCity
    }]

    if (isCrossCity) {
      var trains = generateMockTrains(fromCity, toCity)
      trains.forEach(function(train, index) {
        if (index >= 3) return

        var startToStation = getLocalTransit(from, train.fromStation, fromCity)
        var endToDestination = getLocalTransit(train.toStation, to, toCity)

        var segments = [
          {
            type: 'local',
            icon: '🚕',
            title: '出发地 → ' + train.fromStation,
            location: from + ' → ' + train.fromStation,
            taxi: {
              cost: startToStation.taxi.cost,
              duration: startToStation.taxi.duration,
              desc: '打车 · 约' + startToStation.taxi.duration + ' · ¥' + startToStation.taxi.cost
            },
            bus: {
              cost: startToStation.bus.cost,
              duration: startToStation.bus.duration,
              desc: '公交 · 约' + startToStation.bus.duration + ' · ¥' + startToStation.bus.cost,
              lines: startToStation.bus.lines
            }
          },
          {
            type: 'train',
            icon: '🚄',
            title: train.type + ' ' + train.trainNo,
            desc: train.startTime + ' - ' + train.endTime + ' · ' + train.duration,
            location: train.fromStation + ' → ' + train.toStation,
            train: train
          },
          {
            type: 'local',
            icon: '🚕',
            title: train.toStation + ' → ' + to,
            location: train.toStation + ' → ' + to,
            taxi: {
              cost: endToDestination.taxi.cost,
              duration: endToDestination.taxi.duration,
              desc: '打车 · 约' + endToDestination.taxi.duration + ' · ¥' + endToDestination.taxi.cost
            },
            bus: {
              cost: endToDestination.bus.cost,
              duration: endToDestination.bus.duration,
              desc: '公交 · 约' + endToDestination.bus.duration + ' · ¥' + endToDestination.bus.cost,
              lines: endToDestination.bus.lines
            }
          }
        ]

        var taxiTotalCost = Number(train.minPrice) + Number(startToStation.taxi.cost) + Number(endToDestination.taxi.cost)
        var busTotalCost = Number(train.minPrice) + Number(startToStation.bus.cost) + Number(endToDestination.bus.cost)
        
        var sanitizeTime = function(t) {
          if (!t || typeof t !== 'string' || t.indexOf('NaN') >= 0 || t.indexOf('undefined') >= 0) {
            return '--:--'
          }
          return t
        }
        
        var planStartTime = sanitizeTime(train.startTime)
        var planEndTime = sanitizeTime(train.endTime)

        plans.push({
          id: 'plan_train_' + index,
          type: 'train',
          train: train,
          segments: segments,
          taxiTotalCost: taxiTotalCost,
          busTotalCost: busTotalCost,
          totalCost: taxiTotalCost,
          totalDuration: train.duration,
          arrivalTime: planEndTime,
          startTime: planStartTime,
          endTime: planEndTime,
          isRecommended: index === 0,
          isCheapest: index === trains.length - 1 && index < 3,
          fromCity: fromCity,
          toCity: toCity
        })
      })
    } else {
      plans.push({
        id: 'plan_bus_0',
        type: 'bus',
        segments: [{
          type: 'walk',
          icon: '🚶',
          title: '步行',
          desc: '步行600米到' + from + '站',
          location: ''
        }, {
          type: 'bus',
          icon: '🚇',
          title: '地铁2号线',
          desc: '乘坐地铁2号线(5站)从' + from + '站到' + to + '站',
          location: from + '站 → ' + to + '站',
          bus: {
            cost: 4,
            duration: '35分钟',
            arrivalTime: calculateArrivalTime('50分钟'),
            desc: '地铁 · 约35分钟 · ¥4',
            lines: [{ name: '地铁2号线', stops: 5, from: from + '站', to: to + '站' }]
          }
        }],
        taxiTotalCost: 4,
        busTotalCost: 4,
        totalCost: 4,
        totalDuration: '50分钟',
        arrivalTime: calculateArrivalTime('50分钟'),
        startTime: '',
        endTime: '',
        isRecommended: true,
        isCheapest: false,
        fromCity: fromCity,
        toCity: toCity
      }, {
        id: 'plan_bus_1',
        type: 'bus',
        segments: [{
          type: 'walk',
          icon: '🚶',
          title: '步行',
          desc: '步行400米到' + from + '北站',
          location: ''
        }, {
          type: 'bus',
          icon: '🚌',
          title: '101路',
          desc: '乘坐101路(8站)从' + from + '北站到中心广场站',
          location: from + '北站 → 中心广场站',
          bus: {
            cost: 2,
            duration: '30分钟',
            arrivalTime: calculateArrivalTime('1小时10分'),
            desc: '公交 · 约30分钟 · ¥2',
            lines: [{ name: '101路', stops: 8, from: from + '北站', to: '中心广场站' }]
          }
        }, {
          type: 'walk',
          icon: '🚶',
          title: '步行',
          desc: '步行500米到' + to,
          location: ''
        }],
        taxiTotalCost: 2,
        busTotalCost: 2,
        totalCost: 2,
        totalDuration: '1小时10分',
        arrivalTime: calculateArrivalTime('1小时10分'),
        startTime: '',
        endTime: '',
        isRecommended: false,
        isCheapest: true,
        fromCity: fromCity,
        toCity: toCity
      }, {
        id: 'plan_bus_2',
        type: 'bus',
        segments: [{
          type: 'walk',
          icon: '🚶',
          title: '步行',
          desc: '步行300米到' + from + '南站',
          location: ''
        }, {
          type: 'bus',
          icon: '🚌',
          title: '205路',
          desc: '乘坐205路(6站)从' + from + '南站到人民公园站',
          location: from + '南站 → 人民公园站',
          bus: {
            cost: 2,
            duration: '25分钟',
            arrivalTime: calculateArrivalTime('1小时20分'),
            desc: '公交 · 约25分钟 · ¥2',
            lines: [{ name: '205路', stops: 6, from: from + '南站', to: '人民公园站' }]
          }
        }, {
          type: 'bus',
          icon: '🚌',
          title: '302路',
          desc: '乘坐302路(4站)从人民公园站到' + to + '站',
          location: '人民公园站 → ' + to + '站',
          bus: {
            cost: 2,
            duration: '20分钟',
            arrivalTime: calculateArrivalTime('1小时20分'),
            desc: '公交 · 约20分钟 · ¥2',
            lines: [{ name: '302路', stops: 4, from: '人民公园站', to: to + '站' }]
          }
        }],
        taxiTotalCost: 4,
        busTotalCost: 4,
        totalCost: 4,
        totalDuration: '1小时20分',
        arrivalTime: calculateArrivalTime('1小时20分'),
        startTime: '',
        endTime: '',
        isRecommended: false,
        isCheapest: false,
        fromCity: fromCity,
        toCity: toCity
      })
    }

    return agentRecommend(plans, time, from, to)
  })
}

function generateCurvedPath(fromGeo, toGeo) {
  var points = []
  var startLng = fromGeo.lng
  var startLat = fromGeo.lat
  var endLng = toGeo.lng
  var endLat = toGeo.lat

  var steps = 20
  var midLng = (startLng + endLng) / 2
  var midLat = (startLat + endLat) / 2
  var offsetLat = (endLng - startLng) * 0.3

  for (var i = 0; i <= steps; i++) {
    var t = i / steps
    var x = (1 - t) * startLng + t * endLng
    var y = (1 - t) * startLat + t * endLat
    
    var curve = Math.sin(t * Math.PI) * offsetLat
    y += curve

    points.push({
      longitude: x,
      latitude: y
    })
  }

  return points
}

function getDrivingRoute(from, to, fromCity, toCity) {
  return geocode(from, fromCity).then(function(fromGeo) {
    if (!fromGeo || !Number.isFinite(fromGeo.lng) || !Number.isFinite(fromGeo.lat)) {
      console.warn('getDrivingRoute: 起点地理编码失败', from)
      return { success: false, error: '起点位置解析失败', points: [], fromGeo: { lng: 0, lat: 0 }, toGeo: { lng: 0, lat: 0 } }
    }
    return geocode(to, toCity).then(function(toGeo) {
      if (!toGeo || !Number.isFinite(toGeo.lng) || !Number.isFinite(toGeo.lat)) {
        console.warn('getDrivingRoute: 终点地理编码失败', to)
        return { success: false, error: '终点位置解析失败', points: [], fromGeo: fromGeo, toGeo: { lng: 0, lat: 0 } }
      }
      
      var fromLng = fromGeo.lng
      var fromLat = fromGeo.lat
      var toLng = toGeo.lng
      var toLat = toGeo.lat
      
      var fromCoord = fromLng + ',' + fromLat
      var toCoord = toLng + ',' + toLat

      var params = {
        key: apiConfig.AMAP_KEY,
        origin: fromCoord,
        destination: toCoord,
        output: 'json',
        extensions: 'all'
      }

      return request('https://restapi.amap.com/v3/direction/driving', params).then(function(res) {
        console.log('高德驾车路线API返回:', JSON.stringify(res))
        if (res.status === '1' && res.route && res.route.paths && res.route.paths.length > 0) {
          var path = res.route.paths[0]
          var points = []
          
          if (path.steps && path.steps.length > 0) {
            path.steps.forEach(function(step) {
              var stepPolyline = step.polyline || ''
              if (stepPolyline && typeof stepPolyline === 'string') {
                var coords = stepPolyline.split(';')
                coords.forEach(function(coord) {
                  var parts = coord.split(',')
                  if (parts.length === 2) {
                    var lng = Number(parts[0])
                    var lat = Number(parts[1])
                    if (!isNaN(lng) && !isNaN(lat)) {
                      points.push({
                        longitude: lng,
                        latitude: lat
                      })
                    }
                  }
                })
              }
            })
          }

          console.log('解析后的points数量:', points.length)
          if (points.length > 0) {
            console.log('第一个点:', JSON.stringify(points[0]))
            console.log('最后一个点:', JSON.stringify(points[points.length - 1]))
          }

          if (points.length > 800) {
            var step = Math.ceil(points.length / 800)
            var filteredPoints = [points[0]]
            for (var i = step; i < points.length - 1; i += step) {
              filteredPoints.push(points[i])
            }
            filteredPoints.push(points[points.length - 1])
            console.log('路径点过多，精简后数量:', filteredPoints.length)
            points = filteredPoints
          }

          if (points.length <= 2) {
            console.log('路径点太少，生成弯曲路径')
            points = generateCurvedPath({ lng: fromLng, lat: fromLat }, { lng: toLng, lat: toLat })
          }

          return {
            success: points.length > 2,
            points: points,
            distance: path.distance,
            duration: path.duration,
            fromCoord: fromCoord,
            toCoord: toCoord,
            fromGeo: { lng: fromLng, lat: fromLat },
            toGeo: { lng: toLng, lat: toLat }
          }
        }
        console.log('高德API返回状态异常:', res.status, 'route:', res.route)
        
        console.log('API失败，生成弯曲路径')
        var points = generateCurvedPath({ lng: fromLng, lat: fromLat }, { lng: toLng, lat: toLat })
        
        return {
          success: points.length > 2,
          points: points,
          fromCoord: fromCoord,
          toCoord: toCoord,
          fromGeo: { lng: fromLng, lat: fromLat },
          toGeo: { lng: toLng, lat: toLat }
        }
      })
    })
  }).catch(function(err) {
    console.log('getDrivingRoute catch:', err)
    var fromCoord = getDefaultCoord(from)
    var toCoord = getDefaultCoord(to)
    
    console.log('catch中生成弯曲路径')
    var points = generateCurvedPath(fromCoord, toCoord)
    
    return {
      success: points.length > 2,
      points: points,
      fromCoord: fromCoord.lng + ',' + fromCoord.lat,
      toCoord: toCoord.lng + ',' + toCoord.lat,
      fromGeo: fromCoord,
      toGeo: toCoord
    }
  })
}

function agentRecommend(plans, time, from, to) {
  if (!plans || plans.length === 0) {
    return Promise.resolve(plans)
  }
  
  // Step 1: 如果没有AI API Key，直接用本地TOPSIS排序
  if (!apiConfig.DASHSCOPE_API_KEY) {
    return simpleFallback(plans, time)
  }
  
  var fromCity = getCityFromNameSync(from)
  var toCity = getCityFromNameSync(to)
  
  // Step 2: 先用本地TOPSIS对现有方案排序
  var sortedPlans
  try {
    sortedPlans = elderlyMultiCriteriaRank(plans.slice(), time)
  } catch (e) {
    console.warn('TOPSIS排序异常，使用原始顺序:', e)
    sortedPlans = plans.slice()
    if (sortedPlans.length > 0) {
      sortedPlans[0].isRecommended = true
      sortedPlans[0].reason = '推荐方案'
    }
  }
  
  // Step 3: 用AI为排序后的方案生成适老化推荐理由
  var topPlans = sortedPlans.slice(0, Math.min(5, sortedPlans.length))
  
  var plansSummary = topPlans.map(function(plan, index) {
    return {
      rank: index + 1,
      type: plan.type === 'train' ? '火车' : plan.type === 'bus' ? '公交' : '打车',
      trainNo: plan.train ? plan.train.trainNo : '',
      start: plan.train ? plan.train.startTime : '',
      end: plan.train ? plan.train.endTime : '',
      duration: plan.train ? plan.train.duration : '',
      cost: '¥' + (plan.totalCost || (plan.train ? plan.train.minPrice : '面议')),
      score: plan.score,
      topsisScore: plan.topsisScore
    }
  })
  
  var today = new Date()
  var dateStr = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0')
  
  var systemPrompt = '你是乐龄出行智能助手，专为老年人提供出行规划服务。\n' +
    '下面是系统用专业算法（TOPSIS+熵权法）为老年用户排好序的出行方案。\n' +
    '请用简洁易懂的语言（面向60岁以上老人），为排名第一的最优方案生成推荐理由。\n' +
    '要求：\n' +
    '1. 语言通俗易懂，避免专业术语\n' +
    '2. 突出对老人的好处（如：上午出发、座位舒适、价格合适）\n' +
    '3. 50字以内\n' +
    '4. 返回JSON格式：{"reason": "推荐理由"}'
  
  var userPrompt = '请为最优方案生成推荐理由。\n' +
    '出发地：' + (from || '') + '\n' +
    '目的地：' + (to || '') + '\n' +
    '出发日期：' + dateStr + '\n' +
    '用户指定出发时间：' + (time || '无特殊要求') + '\n' +
    '算法排序结果（已按适老化优先级排序）：\n' +
    JSON.stringify(plansSummary, null, 2)
  
  var data = {
    model: 'qwen-max',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,  // 低温度，保证推荐理由稳定
    max_tokens: 256
  }
  
  return new Promise(function(resolve) {
    wx.request({
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiConfig.DASHSCOPE_API_KEY
      },
      data: data,
      success: function(res) {
        if (res.data && res.data.choices && res.data.choices[0]) {
          var content = res.data.choices[0].message.content
          try {
            var result = JSON.parse(content)
            var aiReason = result.reason || ''
            
            // 用AI生成的理由替换排序算法生成的理由
            if (aiReason) {
              sortedPlans.forEach(function(plan, index) {
                if (plan.isRecommended) {
                  plan.reason = aiReason
                }
              })
            }
          } catch (e) {
            // JSON解析失败，保留算法生成的理由
            console.warn('AI理由解析失败，使用算法默认理由')
          }
        }
        resolve(sortedPlans)
      },
      fail: function(err) {
        console.warn('AI理由生成失败，使用算法默认理由:', err)
        resolve(sortedPlans)
      }
    })
  }).catch(function() {
    return sortedPlans
  })
}

// 适老化多准则排序算法已拆分至独立模块
// 包含：熵权法+TOPSIS+灵敏度分析+衔接安全验证
var ranking = require('./ranking.js')

// 兼容旧引用：从ranking模块获取
var elderlyMultiCriteriaRank = ranking.elderlyMultiCriteriaRank
var simpleFallback = ranking.simpleFallback
var verifyConnectionSafety = ranking.verifyConnectionSafety
var sensitivityAnalysis = ranking.sensitivityAnalysis

module.exports = {
  request: request,
  geocode: geocode,
  getCityFromName: getCityFromName,
  getCityFromNameSync: getCityFromNameSync,
  getCityFromGeocode: getCityFromGeocode,
  searchTrains: searchTrains,
  searchTrainStations: searchTrainStations,
  getTransit: getTransit,
  getTripPlans: getTripPlans,
  getDrivingRoute: getDrivingRoute,
  getLocalPlans: getLocalPlans,
  agentRecommend: agentRecommend,
  simpleFallback: simpleFallback,
  verifyConnectionSafety: verifyConnectionSafety,
  formatDuration: formatDuration,
  formatDistance: formatDistance
}
