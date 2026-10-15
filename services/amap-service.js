const apiConfig = require('../config/api.js')
const AMAP_KEY = apiConfig.AMAP_KEY

const GEOCODE_CACHE = {}
const POI_CACHE = {}
const ROUTE_CACHE = {}
const REQUEST_INTERVAL = 300
const inflightRequests = new Map()

function isValidCoord(lng, lat) {
  return Number.isFinite(lng) && Number.isFinite(lat) &&
    lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}

function parseLocation(location) {
  if (!location || typeof location !== 'string') return null
  var parts = location.split(',')
  if (parts.length !== 2) return null
  var lng = parseFloat(parts[0])
  var lat = parseFloat(parts[1])
  if (!isValidCoord(lng, lat)) return null
  return { lng: lng, lat: lat }
}

function getDefaultLocation(keyword) {
  var locations = {
    '北京': '116.407413,39.904211',
    '上海': '121.473701,31.230416',
    '南京': '118.796875,32.060255',
    '武汉': '114.305564,30.592755',
    '杭州': '120.153576,30.287459',
    '西安': '108.948024,34.261998',
    '广州': '113.264385,23.12911',
    '深圳': '114.057964,22.543099',
    '成都': '104.066801,30.572816',
    '重庆': '106.551556,29.563009',
    '天津': '117.200983,39.084158',
    '苏州': '120.619585,31.325152',
    '郑州': '113.624232,34.746592',
    '长沙': '112.938822,28.228043',
    '青岛': '120.33166,36.067125',
    '沈阳': '123.432866,41.805555',
    '大连': '121.614692,38.914066',
    '合肥': '117.227239,31.820637',
    '福州': '119.296493,26.075302',
    '厦门': '118.194637,24.479833',
    '南昌': '115.892151,28.682159',
    '昆明': '102.712251,24.881192',
    '贵阳': '106.630771,26.651246',
    '南宁': '108.356443,22.82402',
    '兰州': '103.83417,36.0611',
    '西宁': '101.778178,36.623178',
    '银川': '106.232499,38.486449',
    '呼和浩特': '111.751989,40.84149',
    '乌鲁木齐': '87.616881,43.825653',
    '哈尔滨': '126.642464,45.803756',
    '长春': '125.323529,43.817071',
    '石家庄': '114.502464,38.045474',
    '太原': '112.549248,37.857014',
    '济南': '117.000923,36.675807',
    '太原南站': '112.623408,37.805138',
    '太原站': '112.586796,37.878674',
    '黄鹤楼': '114.305469,30.593168',
    '西湖': '120.153576,30.287459',
    '故宫': '116.397026,39.916042',
    '天安门': '116.406699,39.908746',
    '兵马俑': '109.270333,34.392206',
    '长城': '116.024067,40.349499',
    '东方明珠': '121.515963,31.239702',
    '夫子庙': '118.771764,32.027898',
    '大雁塔': '108.954418,34.225061',
    '中山陵': '118.801669,32.046616',
    '上海外滩': '121.499898,31.239042',
    '洪崖洞': '106.584477,29.565131',
    '宽窄巷子': '104.059897,30.662596',
    '橘子洲': '112.938822,28.228043',
    '长白山': '127.607816,41.960573',
    '桂林山水': '110.299334,25.274108',
    '张家界': '110.475196,29.114056',
    '九寨沟': '103.903388,33.141965',
    '黄山': '118.190399,30.140415',
    '泰山': '117.103428,36.259629',
    '峨眉山': '103.452198,29.568202',
    '都江堰': '103.626232,30.947318',
    '青城山': '103.564789,30.946171',
    '丽江古城': '100.239224,26.866946',
    '凤凰古城': '109.435625,27.922884',
    '鼓浪屿': '118.06926,24.443451',
    '颐和园': '116.275589,39.999592',
    '圆明园': '116.206689,40.004327',
    '天坛': '116.403874,39.882255',
    '布达拉宫': '91.173208,29.654088',
    '武侯祠': '104.056808,30.646171',
    '杜甫草堂': '104.034946,30.659276',
    '成都南站': '104.075326,30.547037',
    '长沙南站': '113.002787,28.222416',
    '郑州东站': '113.756321,34.745152',
    '重庆北站': '106.583908,29.616843',
    '重庆西站': '106.435231,29.456978',
    '北京南站': '116.378318,39.851754',
    '北京西站': '116.321657,39.894981',
    '北京站': '116.420485,39.912747',
    '上海虹桥站': '121.308252,31.198795',
    '上海站': '121.453846,31.240308',
    '南京南站': '118.789573,31.985278',
    '南京站': '118.799154,32.081165',
    '杭州东站': '120.202739,30.279315',
    '杭州站': '120.140298,30.268996',
    '武汉站': '114.388342,30.574651',
    '汉口站': '114.287933,30.595114',
    '武昌站': '114.361263,30.528297',
    '西安北站': '108.954657,34.323977',
    '西安站': '108.963046,34.270918',
    '成都东站': '104.131477,30.562711',
    '成都站': '104.056808,30.646171',
    '广州南站': '113.280637,23.105505',
    '广州站': '113.262486,23.147269',
    '深圳北站': '114.023379,22.624813',
    '家': '112.549248,37.857014'
  }
  
  for (var key in locations) {
    if (keyword.includes(key)) {
      return locations[key]
    }
  }
  
  return null
}

function preCacheLocations() {
  var locations = {
    '北京': '116.407413,39.904211',
    '上海': '121.473701,31.230416',
    '南京': '118.796875,32.060255',
    '武汉': '114.305564,30.592755',
    '杭州': '120.153576,30.287459',
    '西安': '108.948024,34.261998',
    '广州': '113.264385,23.12911',
    '深圳': '114.057964,22.543099',
    '成都': '104.066801,30.572816',
    '重庆': '106.551556,29.563009',
    '天津': '117.200983,39.084158',
    '苏州': '120.619585,31.325152',
    '郑州': '113.624232,34.746592',
    '长沙': '112.938822,28.228043',
    '青岛': '120.33166,36.067125',
    '沈阳': '123.432866,41.805555',
    '大连': '121.614692,38.914066',
    '合肥': '117.227239,31.820637',
    '福州': '119.296493,26.075302',
    '厦门': '118.194637,24.479833',
    '南昌': '115.892151,28.682159',
    '昆明': '102.712251,24.881192',
    '贵阳': '106.630771,26.651246',
    '南宁': '108.356443,22.82402',
    '兰州': '103.83417,36.0611',
    '西宁': '101.778178,36.623178',
    '银川': '106.232499,38.486449',
    '呼和浩特': '111.751989,40.84149',
    '乌鲁木齐': '87.616881,43.825653',
    '哈尔滨': '126.642464,45.803756',
    '长春': '125.323529,43.817071',
    '石家庄': '114.502464,38.045474',
    '太原': '112.549248,37.857014',
    '济南': '117.000923,36.675807',
    '太原南站': '112.623408,37.805138',
    '太原站': '112.586796,37.878674',
    '黄鹤楼': '114.305469,30.593168',
    '西湖': '120.153576,30.287459',
    '故宫': '116.397026,39.916042',
    '天安门': '116.406699,39.908746',
    '兵马俑': '109.270333,34.392206',
    '长城': '116.024067,40.349499',
    '东方明珠': '121.515963,31.239702',
    '夫子庙': '118.771764,32.027898',
    '大雁塔': '108.954418,34.225061',
    '中山陵': '118.801669,32.046616',
    '上海外滩': '121.499898,31.239042',
    '洪崖洞': '106.584477,29.565131',
    '宽窄巷子': '104.059897,30.662596',
    '橘子洲': '112.938822,28.228043',
    '长白山': '127.607816,41.960573',
    '桂林山水': '110.299334,25.274108',
    '张家界': '110.475196,29.114056',
    '九寨沟': '103.903388,33.141965',
    '黄山': '118.190399,30.140415',
    '泰山': '117.103428,36.259629',
    '峨眉山': '103.452198,29.568202',
    '都江堰': '103.626232,30.947318',
    '青城山': '103.564789,30.946171',
    '丽江古城': '100.239224,26.866946',
    '凤凰古城': '109.435625,27.922884',
    '鼓浪屿': '118.06926,24.443451',
    '颐和园': '116.275589,39.999592',
    '圆明园': '116.206689,40.004327',
    '天坛': '116.403874,39.882255',
    '布达拉宫': '91.173208,29.654088',
    '武侯祠': '104.056808,30.646171',
    '杜甫草堂': '104.034946,30.659276',
    '成都南站': '104.075326,30.547037',
    '长沙南站': '113.002787,28.222416',
    '郑州东站': '113.756321,34.745152',
    '重庆北站': '106.583908,29.616843',
    '重庆西站': '106.435231,29.456978',
    '北京南站': '116.378318,39.851754',
    '北京西站': '116.321657,39.894981',
    '北京站': '116.420485,39.912747',
    '上海虹桥站': '121.308252,31.198795',
    '上海站': '121.453846,31.240308',
    '南京南站': '118.789573,31.985278',
    '南京站': '118.799154,32.081165',
    '杭州东站': '120.202739,30.279315',
    '杭州站': '120.140298,30.268996',
    '武汉站': '114.388342,30.574651',
    '汉口站': '114.287933,30.595114',
    '武昌站': '114.361263,30.528297',
    '西安北站': '108.954657,34.323977',
    '西安站': '108.963046,34.270918',
    '成都东站': '104.131477,30.562711',
    '成都站': '104.056808,30.646171',
    '广州南站': '113.280637,23.105505',
    '广州站': '113.262486,23.147269',
    '深圳北站': '114.023379,22.624813',
    '家': '112.549248,37.857014'
  }
  
  for (var name in locations) {
    var entry = {
      success: true,
      data: {
        address: name,
        location: locations[name],
        adcode: '',
        citycode: '',
        province: '',
        city: '',
        district: '',
        township: '',
        neighborhood: ''
      }
    }
    GEOCODE_CACHE[name] = entry
    GEOCODE_CACHE[name + '_'] = entry
    if (name !== '家') {
      GEOCODE_CACHE[name + '_' + name] = entry
    }
  }
}

preCacheLocations()

let lastRequestTime = 0

function serialRequest(url) {
  if (inflightRequests.has(url)) {
    return inflightRequests.get(url)
  }

  const requestPromise = new Promise((resolve, reject) => {
    const now = Date.now()
    const elapsed = now - lastRequestTime
    const waitTime = elapsed >= REQUEST_INTERVAL ? 0 : REQUEST_INTERVAL - elapsed
    
    setTimeout(() => {
      lastRequestTime = Date.now()
      wx.request({
        url: url,
        method: 'GET',
        timeout: 10000,
        success: (res) => {
          inflightRequests.delete(url)
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        },
        fail: (err) => {
          inflightRequests.delete(url)
          reject(err)
        }
      })
    }, waitTime)
  })

  inflightRequests.set(url, requestPromise)
  return requestPromise
}

async function geocode(address, city = '太原') {
  const cacheKey = `${address}_${city}`
  if (GEOCODE_CACHE[cacheKey]) {
    console.log('地理编码缓存命中:', address)
    return GEOCODE_CACHE[cacheKey]
  }
  
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: false, error: '无API密钥' }
  }
  
  const scenicKeywords = ['景区', '公园', '山', '湖', '河', '海', '寺', '庙', '馆', '院', '塔', '楼', '阁', '岛', '洞', '泉', '瀑布', '森林', '草原', '沙漠', '峡谷', '石林', '石窟', '陵墓', '故居', '纪念馆', '博物馆', '广场', '大桥', '大坝', '长城', '故宫', '天坛', '颐和园', '圆明园', '布达拉宫', '兵马俑']
  var isScenicSpot = false
  for (var i = 0; i < scenicKeywords.length; i++) {
    if (address.indexOf(scenicKeywords[i]) >= 0) {
      isScenicSpot = true
      break
    }
  }
  
  if (isScenicSpot) {
    console.log('检测到景点名称，优先使用POI搜索:', address)
    const poiResult = await searchPOI(address, city, '110000')
    if (poiResult.success && poiResult.data.length > 0) {
      const poi = poiResult.data[0]
      const data = {
        success: true,
        data: {
          address: poi.address || poi.name,
          location: poi.location,
          adcode: poi.adcode,
          citycode: '',
          province: '',
          city: poi.cityname,
          district: poi.district,
          township: '',
          neighborhood: '',
          name: poi.name,
          typecode: poi.typecode
        }
      }
      GEOCODE_CACHE[cacheKey] = data
      return data
    }
    console.log('景点POI搜索无结果，尝试地理编码')
  }
  
  const MAX_RETRIES = 2
  
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    try {
      const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}&output=JSON`
      console.log('高德地理编码URL:', url)
      const result = await serialRequest(url)
      
      if (result.status === '1' && result.geocodes && result.geocodes.length > 0) {
        const geo = result.geocodes[0]
        const data = {
          success: true,
          data: {
            address: geo.formatted_address,
            location: geo.location,
            adcode: geo.adcode,
            citycode: geo.citycode,
            province: geo.province,
            city: geo.city,
            district: geo.district,
            township: geo.township,
            neighborhood: geo.neighborhood
          }
        }
        GEOCODE_CACHE[cacheKey] = data
        return data
      } else if (result.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT' && retry < MAX_RETRIES) {
        console.warn('QPS超限，第' + (retry + 1) + '次重试...')
        continue
      } else {
        console.error('高德地理编码失败:', result.info)
        const poiResult = await searchPOI(address, city)
        if (poiResult.success && poiResult.data.length > 0) {
          const poi = poiResult.data[0]
          const data = {
            success: true,
            data: {
              address: poi.address || address,
              location: poi.location,
              adcode: poi.adcode,
              citycode: '',
              province: '',
              city: poi.cityname,
              district: poi.district,
              township: '',
              neighborhood: ''
            }
          }
          GEOCODE_CACHE[cacheKey] = data
          return data
        }
        return { success: false, error: result.info || '地理编码失败' }
      }
    } catch (error) {
      console.error('地理编码失败:', error)
      if (retry < MAX_RETRIES) {
        console.warn('网络错误，第' + (retry + 1) + '次重试...')
        continue
      }
      try {
        const poiResult = await searchPOI(address, city)
        if (poiResult.success && poiResult.data.length > 0) {
          const poi = poiResult.data[0]
          const data = {
            success: true,
            data: {
              address: poi.address || address,
              location: poi.location,
              adcode: poi.adcode,
              citycode: '',
              province: '',
              city: poi.cityname,
              district: poi.district,
              township: '',
              neighborhood: ''
            }
          }
          GEOCODE_CACHE[cacheKey] = data
          return data
        }
      } catch (poiError) {
        console.error('POI搜索也失败:', poiError)
      }
      return { success: false, error: error.message || '地理编码失败' }
    }
  }
  
  return { success: false, error: '地理编码失败' }
}

async function searchNearbyPOI(location, types = '', radius = 5000) {
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: false, error: '无API密钥' }
  }

  const MAX_RETRIES = 2

  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    try {
      let url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${encodeURIComponent(location)}&output=JSON&extensions=all&radius=${radius}&sortrule=distance&offset=20`

      if (types) {
        url += `&types=${encodeURIComponent(types)}`
      }

      console.log('高德周边搜索URL:', url)

      const result = await serialRequest(url)

      console.log('高德周边搜索返回:', JSON.stringify(result))

      if (result.status === '1') {
        const data = {
          success: true,
          data: result.pois ? result.pois.map(poi => ({
            id: poi.id,
            name: poi.name,
            type: poi.type,
            typecode: poi.typecode,
            address: poi.address,
            location: poi.location,
            tel: poi.tel,
            adcode: poi.adcode,
            cityname: poi.cityname,
            district: poi.adname,
            distance: poi.distance,
            rating: poi.biz_ext ? poi.biz_ext.rating : '',
            cost: poi.biz_ext ? poi.biz_ext.cost : ''
          })) : []
        }
        return data
      } else if (result.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT' && retry < MAX_RETRIES) {
        console.warn('QPS超限，第' + (retry + 1) + '次重试...')
        continue
      } else {
        console.error('周边搜索失败:', result.info)
        return { success: false, error: result.info || '周边搜索失败' }
      }
    } catch (error) {
      console.error('周边搜索失败:', error)
      if (retry < MAX_RETRIES) {
        console.warn('网络错误，第' + (retry + 1) + '次重试...')
        continue
      }
      return { success: false, error: error.message || '周边搜索失败' }
    }
  }

  return { success: false, error: '周边搜索失败' }
}

async function searchPOI(keyword, city = '', types = '') {
  const cacheKey = `${keyword}_${city}_${types}`
  if (POI_CACHE[cacheKey]) {
    console.log('POI缓存命中:', keyword)
    return POI_CACHE[cacheKey]
  }
  
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: false, error: '无API密钥' }
  }
  
  const MAX_RETRIES = 2
  
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    try {
      let url = `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&output=JSON&extensions=all`
      
      if (city) {
        url += `&city=${encodeURIComponent(city)}`
      }
      
      if (types) {
        url += `&types=${encodeURIComponent(types)}`
      }
      
      console.log('高德POI搜索URL:', url)
      
      const result = await serialRequest(url)
      
      console.log('高德POI搜索返回:', JSON.stringify(result))
      
      if (result.status === '1') {
        const data = {
          success: true,
          data: result.pois ? result.pois.map(poi => ({
            id: poi.id,
            name: poi.name,
            type: poi.type,
            typecode: poi.typecode,
            address: poi.address,
            location: poi.location,
            tel: poi.tel,
            adcode: poi.adcode,
            cityname: poi.cityname,
            district: poi.adname,
            distance: poi.distance,
            rating: poi.biz_ext ? poi.biz_ext.rating : '',
            cost: poi.biz_ext ? poi.biz_ext.cost : ''
          })) : []
        }
        POI_CACHE[cacheKey] = data
        return data
      } else if (result.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT' && retry < MAX_RETRIES) {
        console.warn('QPS超限，第' + (retry + 1) + '次重试...')
        continue
      } else {
        console.error('高德POI搜索失败:', result.info)
        return { success: false, error: result.info || 'POI搜索失败' }
      }
    } catch (error) {
      console.error('POI搜索失败:', error)
      if (retry < MAX_RETRIES) {
        console.warn('网络错误，第' + (retry + 1) + '次重试...')
        continue
      }
      return { success: false, error: error.message || 'POI搜索失败' }
    }
  }
  
  return { success: false, error: 'POI搜索失败' }
}

async function getRoutePlan(origin, destination, type = 'transit', city = '太原') {
  var originParsed = parseLocation(origin)
  var destParsed = parseLocation(destination)
  if (!originParsed || !destParsed) {
    console.warn('getRoutePlan: 坐标无效', origin, '→', destination)
    return { success: false, error: '坐标无效，请先进行地理编码' }
  }
  
  const cacheKey = `${origin}_${destination}_${type}_${city}`
  if (ROUTE_CACHE[cacheKey]) {
    console.log('路线规划缓存命中:', origin, '→', destination)
    return ROUTE_CACHE[cacheKey]
  }
  
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: false, error: '无API密钥' }
  }
  
  const MAX_RETRIES = 2
  
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    try {
      let url = ''
      if (type === 'transit') {
        url = `https://restapi.amap.com/v3/direction/transit/integrated?key=${AMAP_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&city=${encodeURIComponent(city)}&output=JSON`
      } else if (type === 'drive') {
        url = `https://restapi.amap.com/v3/direction/driving?key=${AMAP_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&output=JSON`
      } else if (type === 'walk') {
        url = `https://restapi.amap.com/v3/direction/walking?key=${AMAP_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&output=JSON`
      } else if (type === 'bus') {
        url = `https://restapi.amap.com/v3/direction/transit/integrated?key=${AMAP_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&city=${encodeURIComponent(city)}&output=JSON`
      }
      
      console.log('高德路线规划URL:', url)
      
      const result = await serialRequest(url)
      
      console.log('高德路线规划返回:', JSON.stringify(result))
      
      if (result.status === '1') {
        const data = {
          success: true,
          data: result
        }
        ROUTE_CACHE[cacheKey] = data
        return data
      } else if (result.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT' && retry < MAX_RETRIES) {
        console.warn('QPS超限，第' + (retry + 1) + '次重试...')
        continue
      } else {
        console.error('路线规划失败:', result.info)
        return { success: false, error: result.info || '路线规划失败' }
      }
    } catch (error) {
      console.error('路线规划失败:', error)
      if (retry < MAX_RETRIES) {
        console.warn('网络错误，第' + (retry + 1) + '次重试...')
        continue
      }
      return { success: false, error: error.message || '路线规划失败' }
    }
  }
  
  return { success: false, error: '路线规划失败' }
}

function getMockRoutePlan(origin, destination, type) {
  const transitData = {
    route: {
      transits: [{
        duration: 4800,
        cost: 4,
        segments: [{
          walking: { distance: 300 },
          bus: {
            buslines: [{
              name: '101路',
              via_num: 5,
              departure_stop: { name: '起点站' },
              arrival_stop: { name: '终点站' }
            }]
          }
        }]
      }],
      taxi_cost: 25
    }
  }
  
  return {
    success: true,
    data: transitData
  }
}

async function reverseGeocode(location) {
  var parsed = parseLocation(location)
  if (!parsed) {
    console.warn('reverseGeocode: 坐标无效', location)
    return {
      success: false,
      error: '坐标无效',
      data: {
        address: '坐标无效',
        province: '',
        city: '',
        district: ''
      }
    }
  }
  
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return getMockReverseGeocode(location)
  }
  
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${encodeURIComponent(location)}&output=JSON`
    const result = await serialRequest(url)
    
    if (result.status === '1' && result.regeocode) {
      return {
        success: true,
        data: {
          address: result.regeocode.formatted_address,
          province: result.regeocode.addressComponent.province,
          city: result.regeocode.addressComponent.city,
          district: result.regeocode.addressComponent.district,
          township: result.regeocode.addressComponent.township,
          neighborhood: result.regeocode.addressComponent.neighborhood,
          building: result.regeocode.addressComponent.building
        }
      }
    } else {
      console.error('高德逆地理编码失败:', result.info)
      return getMockReverseGeocode(location)
    }
  } catch (error) {
    console.error('逆地理编码失败:', error)
    return getMockReverseGeocode(location)
  }
}

async function searchBusLines(keyword, city = '太原') {
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key，使用本地数据')
    return getMockBusLines(keyword, city)
  }
  
  try {
    const cleanKeyword = keyword ? keyword.trim().replace(/\s+/g, '') : ''
    const url = `https://restapi.amap.com/v3/bus/linename?key=${AMAP_KEY}&keywords=${encodeURIComponent(cleanKeyword)}&city=${encodeURIComponent(city)}&output=JSON`
    console.log('搜索公交线路URL:', url)
    const result = await serialRequest(url)
    
    if (result.status === '1') {
      return {
        success: true,
        data: result.buslines ? result.buslines.map(line => ({
          line_name: line.name,
          line_number: line.name,
          city: city,
          start_station: line.start_stop,
          end_station: line.end_stop,
          stations: line.busstops ? line.busstops.map(s => s.name) : [],
          first_time: line.start_time || '06:00',
          last_time: line.end_time || '22:00',
          price: line.price ? parseFloat(line.price) : 2,
          interval: '',
          distance: line.distance || '',
          polyline: line.polyline || ''
        })) : []
      }
    } else {
      console.error('搜索公交线路失败:', result.info, 'infocode:', result.infocode)
      return { success: false, error: result.info || '查询失败', infocode: result.infocode }
    }
  } catch (error) {
    console.error('搜索公交线路异常:', error)
    return { success: false, error: error.message || '网络请求失败' }
  }
}

function getMockBusLines(keyword, city) {
  return {
    success: true,
    data: [{
      line_name: keyword + '路',
      line_number: keyword + '路',
      city: city,
      start_station: '起点站',
      end_station: '终点站',
      stations: ['站1', '站2', '站3', '站4', '站5'],
      first_time: '06:00',
      last_time: '22:00',
      price: 2,
      interval: '',
      distance: '',
      polyline: ''
    }]
  }
}

async function searchBusStations(keyword, city = '太原') {
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: true, data: [] }
  }
  
  try {
    const cleanKeyword = keyword.trim().replace(/\s+/g, '')
    const url = `https://restapi.amap.com/v3/bus/stopname?key=${AMAP_KEY}&keywords=${encodeURIComponent(cleanKeyword)}&city=${encodeURIComponent(city)}&output=JSON`
    console.log('搜索公交站点URL:', url)
    const result = await serialRequest(url)
    
    if (result.status === '1') {
      return {
        success: true,
        data: result.busstops ? result.busstops.map(stop => ({
          id: stop.id,
          name: stop.name,
          location: stop.location,
          adcode: stop.adcode,
          citycode: stop.citycode,
          buslines: stop.buslines ? stop.buslines.map(b => ({
            id: b.id,
            name: b.name,
            start_stop: b.start_stop,
            end_stop: b.end_stop
          })) : []
        })) : []
      }
    } else {
      console.error('搜索公交站点失败:', result.info, 'infocode:', result.infocode)
      return { success: false, error: result.info || '查询失败', infocode: result.infocode }
    }
  } catch (error) {
    console.error('搜索公交站点异常:', error)
    return { success: false, error: error.message || '网络请求失败' }
  }
}

async function getBusStationById(stationId) {
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: false, error: '无API密钥' }
  }
  
  if (!stationId) {
    return { success: false, error: '缺少公交站ID' }
  }
  
  try {
    const url = `https://restapi.amap.com/v3/bus/stopid?key=${AMAP_KEY}&id=${stationId}&output=JSON`
    console.log('查询公交站详情URL:', url)
    const result = await serialRequest(url)
    
    if (result.status === '1') {
      const stops = result.busstops || []
      if (stops.length > 0) {
        const stop = stops[0]
        return {
          success: true,
          data: {
            id: stop.id,
            name: stop.name,
            location: stop.location,
            adcode: stop.adcode,
            citycode: stop.citycode,
            buslines: stop.buslines ? stop.buslines.map(b => ({
              id: b.id,
              name: b.name,
              location: b.location,
              start_stop: b.start_stop,
              end_stop: b.end_stop
            })) : []
          }
        }
      }
      return { success: false, error: '未找到该公交站' }
    } else {
      console.error('查询公交站详情失败:', result.info, 'infocode:', result.infocode)
      return { success: false, error: result.info || '查询失败', infocode: result.infocode }
    }
  } catch (error) {
    console.error('查询公交站详情异常:', error)
    return { success: false, error: error.message || '网络请求失败' }
  }
}

async function getBusLineDetail(lineId) {
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: false, error: '无API密钥' }
  }
  
  if (!lineId) {
    return { success: false, error: '缺少公交线路ID' }
  }
  
  try {
    const url = `https://restapi.amap.com/v3/bus/lineid?key=${AMAP_KEY}&id=${lineId}&output=JSON&extensions=all`
    console.log('查询公交线路详情URL:', url)
    const result = await serialRequest(url)
    
    if (result.status === '1') {
      const line = result.buslines && result.buslines[0]
      if (line) {
        return {
          success: true,
          data: {
            line_name: line.name,
            line_number: line.name,
            start_station: line.start_stop,
            end_station: line.end_stop,
            stations: line.busstops ? line.busstops.map(s => s.name) : [],
            station_details: line.busstops ? line.busstops.map(s => ({
              name: s.name,
              location: s.location,
              sequence: s.sequence
            })) : [],
            first_time: line.start_time || '06:00',
            last_time: line.end_time || '22:00',
            price: line.price ? parseFloat(line.price) : 2,
            distance: line.distance || '',
            polyline: line.polyline || '',
            type: line.type || ''
          }
        }
      }
      return { success: false, error: '未找到该公交线路' }
    }
    console.error('查询公交线路详情失败:', result.info, 'infocode:', result.infocode)
    return { success: false, error: result.info || '查询失败', infocode: result.infocode }
  } catch (error) {
    console.error('查询公交线路详情异常:', error)
    return { success: false, error: error.message || '网络请求失败' }
  }
}

async function getSubwayInfo(city = '太原') {
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: true, data: [] }
  }
  
  try {
    const url = `https://restapi.amap.com/v3/subway/line?key=${AMAP_KEY}&city=${encodeURIComponent(city)}&output=JSON`
    const result = await serialRequest(url)
    
    if (result.status === '1') {
      return {
        success: true,
        data: result.lines ? result.lines.map(line => ({
          line_name: line.name,
          line_color: line.color || '#E63946',
          city: city,
          stations: line.stations ? line.stations.map(s => s.name) : [],
          station_details: line.stations ? line.stations.map(s => ({
            name: s.name,
            location: s.location,
            sequence: s.sequence
          })) : [],
          first_time: line.start_time || '06:00',
          last_time: line.end_time || '22:00',
          price_range: line.price || '2-6',
          distance: line.distance || '',
          polyline: line.polyline || ''
        })) : []
      }
    } else {
      return { success: false, error: result.info || '查询失败' }
    }
  } catch (error) {
    console.error('查询地铁信息失败:', error)
    return { success: false, error: error.message }
  }
}

async function getSubwayStation(stationName, city = '太原') {
  if (!AMAP_KEY || AMAP_KEY === '') {
    console.log('无高德API Key')
    return { success: true, data: [] }
  }
  
  try {
    const url = `https://restapi.amap.com/v3/subway/station?key=${AMAP_KEY}&name=${encodeURIComponent(stationName)}&city=${encodeURIComponent(city)}&output=JSON`
    const result = await serialRequest(url)
    
    if (result.status === '1') {
      return {
        success: true,
        data: result.stations ? result.stations.map(station => ({
          name: station.name,
          location: station.location,
          line_name: station.line_name,
          line_id: station.line_id,
          sequence: station.sequence
        })) : []
      }
    } else {
      return { success: false, error: result.info || '查询失败' }
    }
  } catch (error) {
    console.error('查询地铁站点失败:', error)
    return { success: false, error: error.message }
  }
}

async function searchScenicSpot(keyword, city = '') {
  return searchPOI(keyword, city, '110000')
}

async function getCurrentLocation() {
  const MAX_RETRIES = 2
  
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    try {
      const location = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          isHighAccuracy: true,
          highAccuracyExpireTime: 10000,
          success: (res) => {
            resolve(res)
          },
          fail: (err) => {
            reject(err)
          }
        })
      })
      
      console.log('wx.getLocation成功:', {
        longitude: location.longitude,
        latitude: location.latitude,
        accuracy: location.accuracy,
        retry: retry
      })
      
      if (!isValidCoord(location.longitude, location.latitude)) {
        console.warn('getCurrentLocation: 坐标无效', location.longitude, location.latitude)
        continue
      }
      
      const locationStr = `${location.longitude},${location.latitude}`
      
      try {
        const regeoResult = await reverseGeocode(locationStr)
        if (regeoResult.success) {
          return {
            success: true,
            longitude: location.longitude,
            latitude: location.latitude,
            address: regeoResult.data.address,
            city: regeoResult.data.city || '',
            district: regeoResult.data.district || '',
            accuracy: location.accuracy || 0
          }
        } else {
          console.warn('逆地理编码返回失败:', regeoResult.error)
        }
      } catch (regeoErr) {
        console.log('逆地理编码异常，使用原始坐标')
      }
      
      return {
        success: true,
        longitude: location.longitude,
        latitude: location.latitude,
        address: `当前位置(${location.longitude.toFixed(4)},${location.latitude.toFixed(4)})`,
        city: '',
        district: '',
        accuracy: location.accuracy || 0
      }
    } catch (err) {
      console.log(`定位第${retry + 1}次失败:`, err.errMsg || err)
      
      if (err.errMsg && err.errMsg.indexOf('auth') >= 0) {
        return {
          success: false,
          error: '定位权限未开启，请在设置中开启位置权限'
        }
      }
      
      if (retry >= MAX_RETRIES) {
        return {
          success: false,
          error: '定位失败，请检查网络或GPS'
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return {
    success: false,
    error: '定位失败'
  }
}

function getMockGeocode(address, city) {
  var location = getDefaultLocation(address)
  if (location === '112.549248,37.857014' && city) {
    location = getDefaultLocation(city)
  }
  
  var cityMap = {
    '太原': { adcode: '140100', citycode: '351', province: '山西省', city: '太原市', district: '杏花岭区' },
    '北京': { adcode: '110100', citycode: '10', province: '北京市', city: '北京市', district: '东城区' },
    '上海': { adcode: '310100', citycode: '21', province: '上海市', city: '上海市', district: '黄浦区' },
    '南京': { adcode: '320100', citycode: '25', province: '江苏省', city: '南京市', district: '玄武区' },
    '武汉': { adcode: '420100', citycode: '27', province: '湖北省', city: '武汉市', district: '武昌区' },
    '杭州': { adcode: '330100', citycode: '571', province: '浙江省', city: '杭州市', district: '西湖区' },
    '西安': { adcode: '610100', citycode: '29', province: '陕西省', city: '西安市', district: '新城区' },
    '广州': { adcode: '440100', citycode: '20', province: '广东省', city: '广州市', district: '天河区' },
    '深圳': { adcode: '440300', citycode: '755', province: '广东省', city: '深圳市', district: '福田区' },
    '成都': { adcode: '510100', citycode: '28', province: '四川省', city: '成都市', district: '锦江区' },
    '重庆': { adcode: '500000', citycode: '23', province: '重庆市', city: '重庆市', district: '渝中区' },
    '天津': { adcode: '120100', citycode: '22', province: '天津市', city: '天津市', district: '和平区' },
    '苏州': { adcode: '320500', citycode: '512', province: '江苏省', city: '苏州市', district: '姑苏区' },
    '郑州': { adcode: '410100', citycode: '371', province: '河南省', city: '郑州市', district: '金水区' },
    '长沙': { adcode: '430100', citycode: '731', province: '湖南省', city: '长沙市', district: '芙蓉区' },
    '青岛': { adcode: '370200', citycode: '532', province: '山东省', city: '青岛市', district: '市南区' },
    '沈阳': { adcode: '210100', citycode: '24', province: '辽宁省', city: '沈阳市', district: '和平区' },
    '大连': { adcode: '210200', citycode: '411', province: '辽宁省', city: '大连市', district: '中山区' },
    '合肥': { adcode: '340100', citycode: '551', province: '安徽省', city: '合肥市', district: '蜀山区' },
    '福州': { adcode: '350100', citycode: '591', province: '福建省', city: '福州市', district: '鼓楼区' },
    '厦门': { adcode: '350200', citycode: '592', province: '福建省', city: '厦门市', district: '思明区' },
    '南昌': { adcode: '360100', citycode: '791', province: '江西省', city: '南昌市', district: '东湖区' },
    '昆明': { adcode: '530100', citycode: '871', province: '云南省', city: '昆明市', district: '五华区' },
    '贵阳': { adcode: '520100', citycode: '851', province: '贵州省', city: '贵阳市', district: '云岩区' },
    '南宁': { adcode: '450100', citycode: '771', province: '广西壮族自治区', city: '南宁市', district: '青秀区' },
    '兰州': { adcode: '620100', citycode: '931', province: '甘肃省', city: '兰州市', district: '城关区' },
    '西宁': { adcode: '630100', citycode: '971', province: '青海省', city: '西宁市', district: '城东区' },
    '银川': { adcode: '640100', citycode: '951', province: '宁夏回族自治区', city: '银川市', district: '兴庆区' },
    '呼和浩特': { adcode: '150100', citycode: '471', province: '内蒙古自治区', city: '呼和浩特市', district: '新城区' },
    '乌鲁木齐': { adcode: '650100', citycode: '991', province: '新疆维吾尔自治区', city: '乌鲁木齐市', district: '天山区' },
    '哈尔滨': { adcode: '230100', citycode: '451', province: '黑龙江省', city: '哈尔滨市', district: '道里区' },
    '长春': { adcode: '220100', citycode: '431', province: '吉林省', city: '长春市', district: '朝阳区' },
    '石家庄': { adcode: '130100', citycode: '311', province: '河北省', city: '石家庄市', district: '桥西区' },
    '济南': { adcode: '370100', citycode: '531', province: '山东省', city: '济南市', district: '历下区' }
  }
  
  var cityInfo = cityMap[city] || { adcode: '', citycode: '', province: '', city: city || '未知城市', district: '' }
  
  return {
    success: true,
    data: {
      address: address,
      location: location,
      adcode: cityInfo.adcode,
      citycode: cityInfo.citycode,
      province: cityInfo.province,
      city: cityInfo.city,
      district: cityInfo.district,
      township: '',
      neighborhood: ''
    }
  }
}

function getMockReverseGeocode(location) {
  var coords = location.split(',')
  var lng = parseFloat(coords[0])
  var lat = parseFloat(coords[1])

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return {
      success: false,
      error: '坐标无效',
      data: {
        address: '坐标无效',
        province: '',
        city: '',
        district: '',
        township: '',
        neighborhood: '',
        building: ''
      }
    }
  }

  // 精确站点映射：高铁线路上的关键点（比城市级cityMap更细）
  var stationPois = [
    { name: '太原南站', lng: 112.6167, lat: 37.7854, province: '山西省', city: '太原市', district: '小店区', township: '黄陵街道', neighborhood: '北营社区', building: '太原南站' },
    // 太原南 → 石家庄 段
    { name: '阳泉北站', lng: 113.5290, lat: 37.9576, province: '山西省', city: '阳泉市', district: '盂县', township: '秀水镇', neighborhood: '南关村', building: '阳泉北站' },
    { name: '娘子关站', lng: 113.7330, lat: 37.9500, province: '山西省', city: '阳泉市', district: '平定县', township: '娘子关镇', neighborhood: '娘子关村', building: '娘子关站' },
    { name: '井陉北站', lng: 114.0500, lat: 38.0500, province: '河北省', city: '石家庄市', district: '井陉县', township: '秀林镇', neighborhood: '秀林村', building: '井陉北站' },
    { name: '高邑西站', lng: 114.6200, lat: 37.6000, province: '河北省', city: '石家庄市', district: '高邑县', township: '大营镇', neighborhood: '大营村', building: '高邑西站' },
    { name: '石家庄站', lng: 114.5170, lat: 38.0387, province: '河北省', city: '石家庄市', district: '桥西区', township: '汇通街道', neighborhood: '塔坛社区', building: '石家庄站' },
    // 石家庄 → 郑州东 段
    { name: '邢台东站', lng: 114.5040, lat: 37.0650, province: '河北省', city: '邢台市', district: '邢台县', township: '东汪镇', neighborhood: '郝家村', building: '邢台东站' },
    { name: '邯郸东站', lng: 114.5400, lat: 36.6200, province: '河北省', city: '邯郸市', district: '丛台区', township: '兼庄乡', neighborhood: '东辛庄村', building: '邯郸东站' },
    { name: '安阳东站', lng: 114.3955, lat: 36.1170, province: '河南省', city: '安阳市', district: '文峰区', township: '中华路街道', neighborhood: '小营村', building: '安阳东站' },
    { name: '鹤壁东站', lng: 114.2745, lat: 35.7414, province: '河南省', city: '鹤壁市', district: '淇滨区', township: '长江路街道', neighborhood: '牛庄村', building: '鹤壁东站' },
    { name: '新乡东站', lng: 113.9217, lat: 35.3614, province: '河南省', city: '新乡市', district: '红旗区', township: '洪门镇', neighborhood: '关堤村', building: '新乡东站' },
    { name: '郑州东站', lng: 113.6254, lat: 34.7458, province: '河南省', city: '郑州市', district: '金水区', township: '祭城路街道', neighborhood: '祭城社区', building: '郑州东站' },
    // 郑州东 → 南京南 段
    { name: '开封北站', lng: 114.2810, lat: 34.8276, province: '河南省', city: '开封市', district: '龙亭区', township: '水稻乡', neighborhood: '沙门村', building: '开封北站' },
    { name: '商丘站', lng: 115.6640, lat: 34.4452, province: '河南省', city: '商丘市', district: '梁园区', township: '建设街道', neighborhood: '李庄村', building: '商丘站' },
    { name: '亳州南站', lng: 115.7790, lat: 33.8200, province: '安徽省', city: '亳州市', district: '谯城区', township: '十八里镇', neighborhood: '十八里村', building: '亳州南站' },
    { name: '阜阳西站', lng: 115.8140, lat: 32.8900, province: '安徽省', city: '阜阳市', district: '颍州区', township: '颍西街道', neighborhood: '清河社区', building: '阜阳西站' },
    { name: '蚌埠南站', lng: 117.3954, lat: 32.8678, province: '安徽省', city: '蚌埠市', district: '龙子湖区', township: '李楼乡', neighborhood: '汪圩村', building: '蚌埠南站' },
    { name: '徐州东站', lng: 117.3821, lat: 34.2821, province: '江苏省', city: '徐州市', district: '贾汪区', township: '大庙街道', neighborhood: '后坝村', building: '徐州东站' },
    { name: '宿州东站', lng: 117.1170, lat: 33.6440, province: '安徽省', city: '宿州市', district: '埇桥区', township: '朱仙庄镇', neighborhood: '朱仙庄村', building: '宿州东站' },
    { name: '滁州站', lng: 118.2780, lat: 32.3030, province: '安徽省', city: '滁州市', district: '南谯区', township: '腰铺镇', neighborhood: '姑塘村', building: '滁州站' },
    { name: '南京南站', lng: 118.7969, lat: 32.0584, province: '江苏省', city: '南京市', district: '雨花台区', township: '雨花街道', neighborhood: '丁墙社区', building: '南京南站' }
  ]

  // 站点优先：2km范围内匹配为精确站点
  for (var s = 0; s < stationPois.length; s++) {
    var sp = stationPois[s]
    var dxS = (sp.lng - lng) * 111 * Math.cos((sp.lat + lat) / 2 * Math.PI / 180)
    var dyS = (sp.lat - lat) * 111
    var stationDist = Math.sqrt(dxS * dxS + dyS * dyS)
    if (stationDist <= 2) {
      return {
        success: true,
        data: {
          address: sp.province + sp.city + sp.district + (sp.neighborhood || '') + sp.building,
          province: sp.province,
          city: sp.city,
          district: sp.district,
          township: sp.township || '',
          neighborhood: sp.neighborhood || '',
          building: sp.building || ''
        }
      }
    }
  }

  // 12km范围内：匹配最近的站点，直接返回站名
  var nearestStation = null
  var minStationDist = Infinity
  for (var s2 = 0; s2 < stationPois.length; s2++) {
    var sp2 = stationPois[s2]
    var dxS2 = (sp2.lng - lng) * 111 * Math.cos((sp2.lat + lat) / 2 * Math.PI / 180)
    var dyS2 = (sp2.lat - lat) * 111
    var sDist = Math.sqrt(dxS2 * dxS2 + dyS2 * dyS2)
    if (sDist < minStationDist) {
      minStationDist = sDist
      nearestStation = sp2
    }
  }
  if (nearestStation && minStationDist <= 12) {
    return {
      success: true,
      data: {
        address: nearestStation.province + nearestStation.city + nearestStation.district + nearestStation.name,
        province: nearestStation.province,
        city: nearestStation.city,
        district: nearestStation.district,
        township: nearestStation.township || '',
        neighborhood: nearestStation.neighborhood || '',
        building: nearestStation.name
      }
    }
  }

  var cityMap = {
    '太原': { lng: 112.55, lat: 37.86, address: '山西省太原市杏花岭区', province: '山西省', city: '太原市', district: '杏花岭区', township: '杏花岭街道', neighborhood: '西华门社区', building: '' },
    '北京': { lng: 116.41, lat: 39.90, address: '北京市东城区', province: '北京市', city: '北京市', district: '东城区', township: '东华门街道', neighborhood: '东厂社区', building: '' },
    '上海': { lng: 121.47, lat: 31.23, address: '上海市黄浦区', province: '上海市', city: '上海市', district: '黄浦区', township: '外滩街道', neighborhood: '山西社区', building: '' },
    '南京': { lng: 118.80, lat: 32.06, address: '江苏省南京市玄武区', province: '江苏省', city: '南京市', district: '玄武区', township: '梅园新村街道', neighborhood: '汉府雅苑社区', building: '' },
    '武汉': { lng: 114.31, lat: 30.59, address: '湖北省武汉市武昌区', province: '湖北省', city: '武汉市', district: '武昌区', township: '积玉桥街道', neighborhood: '尚隆苑社区', building: '' },
    '杭州': { lng: 120.15, lat: 30.29, address: '浙江省杭州市西湖区', province: '浙江省', city: '杭州市', district: '西湖区', township: '北山街道', neighborhood: '曲苑社区', building: '' },
    '西安': { lng: 108.95, lat: 34.26, address: '陕西省西安市新城区', province: '陕西省', city: '西安市', district: '新城区', township: '西一路街道', neighborhood: '民乐社区', building: '' },
    '广州': { lng: 113.26, lat: 23.13, address: '广东省广州市天河区', province: '广东省', city: '广州市', district: '天河区', township: '天河南街道', neighborhood: '天河社区', building: '' },
    '深圳': { lng: 114.06, lat: 22.54, address: '广东省深圳市福田区', province: '广东省', city: '深圳市', district: '福田区', township: '福田街道', neighborhood: '福安社区', building: '' },
    '成都': { lng: 104.07, lat: 30.57, address: '四川省成都市锦江区', province: '四川省', city: '成都市', district: '锦江区', township: '春熙路街道', neighborhood: '总府路社区', building: '' },
    '重庆': { lng: 106.55, lat: 29.56, address: '重庆市渝中区', province: '重庆市', city: '重庆市', district: '渝中区', township: '解放碑街道', neighborhood: '邹容路社区', building: '' },
    '天津': { lng: 117.20, lat: 39.08, address: '天津市和平区', province: '天津市', city: '天津市', district: '和平区', township: '劝业场街道', neighborhood: '南京路社区', building: '' },
    '苏州': { lng: 120.62, lat: 31.33, address: '江苏省苏州市姑苏区', province: '江苏省', city: '苏州市', district: '姑苏区', township: '观前街道', neighborhood: '察院场社区', building: '' },
    '郑州': { lng: 113.62, lat: 34.75, address: '河南省郑州市金水区', province: '河南省', city: '郑州市', district: '金水区', township: '经八路街道', neighborhood: '体育社区', building: '' },
    '长沙': { lng: 112.94, lat: 28.23, address: '湖南省长沙市芙蓉区', province: '湖南省', city: '长沙市', district: '芙蓉区', township: '定王台街道', neighborhood: '黄泥街社区', building: '' },
    '青岛': { lng: 120.33, lat: 36.07, address: '山东省青岛市市南区', province: '山东省', city: '青岛市', district: '市南区', township: '中山路街道', neighborhood: '浙江路社区', building: '' },
    '沈阳': { lng: 123.43, lat: 41.81, address: '辽宁省沈阳市和平区', province: '辽宁省', city: '沈阳市', district: '和平区', township: '太原街街道', neighborhood: '中华路社区', building: '' },
    '大连': { lng: 121.61, lat: 38.91, address: '辽宁省大连市中山区', province: '辽宁省', city: '大连市', district: '中山区', township: '青泥洼桥街道', neighborhood: '天津街社区', building: '' },
    '合肥': { lng: 117.23, lat: 31.82, address: '安徽省合肥市蜀山区', province: '安徽省', city: '合肥市', district: '蜀山区', township: '三里庵街道', neighborhood: '竹荫里社区', building: '' },
    '福州': { lng: 119.30, lat: 26.08, address: '福建省福州市鼓楼区', province: '福建省', city: '福州市', district: '鼓楼区', township: '东街街道', neighborhood: '军门社区', building: '' },
    '厦门': { lng: 118.19, lat: 24.48, address: '福建省厦门市思明区', province: '福建省', city: '厦门市', district: '思明区', township: '中华街道', neighborhood: '霞溪社区', building: '' },
    '南昌': { lng: 115.89, lat: 28.68, address: '江西省南昌市东湖区', province: '江西省', city: '南昌市', district: '东湖区', township: '百花洲街道', neighborhood: '刘将军庙社区', building: '' },
    '昆明': { lng: 102.71, lat: 24.88, address: '云南省昆明市五华区', province: '云南省', city: '昆明市', district: '五华区', township: '护国街道', neighborhood: '威远街社区', building: '' },
    '贵阳': { lng: 106.63, lat: 26.65, address: '贵州省贵阳市云岩区', province: '贵州省', city: '贵阳市', district: '云岩区', township: '中华社区', neighborhood: '圆通街社区', building: '' },
    '南宁': { lng: 108.36, lat: 22.82, address: '广西壮族自治区南宁市青秀区', province: '广西壮族自治区', city: '南宁市', district: '青秀区', township: '建政街道', neighborhood: '广园社区', building: '' },
    '兰州': { lng: 103.83, lat: 36.06, address: '甘肃省兰州市城关区', province: '甘肃省', city: '兰州市', district: '城关区', township: '张掖路街道', neighborhood: '山字石社区', building: '' },
    '西宁': { lng: 101.78, lat: 36.62, address: '青海省西宁市城东区', province: '青海省', city: '西宁市', district: '城东区', township: '东关大街街道', neighborhood: '东关社区', building: '' },
    '银川': { lng: 106.23, lat: 38.49, address: '宁夏回族自治区银川市兴庆区', province: '宁夏回族自治区', city: '银川市', district: '兴庆区', township: '新华街街道', neighborhood: '正丰社区', building: '' },
    '呼和浩特': { lng: 111.75, lat: 40.84, address: '内蒙古自治区呼和浩特市新城区', province: '内蒙古自治区', city: '呼和浩特市', district: '新城区', township: '东街街道', neighborhood: '河西社区', building: '' },
    '乌鲁木齐': { lng: 87.62, lat: 43.83, address: '新疆维吾尔自治区乌鲁木齐市天山区', province: '新疆维吾尔自治区', city: '乌鲁木齐市', district: '天山区', township: '解放北路街道', neighborhood: '文化路社区', building: '' },
    '哈尔滨': { lng: 126.64, lat: 45.80, address: '黑龙江省哈尔滨市道里区', province: '黑龙江省', city: '哈尔滨市', district: '道里区', township: '兆麟街道', neighborhood: '柳树街社区', building: '' },
    '长春': { lng: 125.32, lat: 43.82, address: '吉林省长春市朝阳区', province: '吉林省', city: '长春市', district: '朝阳区', township: '重庆街道', neighborhood: '光明路社区', building: '' },
    '石家庄': { lng: 114.50, lat: 38.05, address: '河北省石家庄市桥西区', province: '河北省', city: '石家庄市', district: '桥西区', township: '东华街道', neighborhood: '裕光社区', building: '' },
    '济南': { lng: 117.00, lat: 36.68, address: '山东省济南市历下区', province: '山东省', city: '济南市', district: '历下区', township: '泉城路街道', neighborhood: '贡院墙根社区', building: '' }
  }

  var nearestCity = '太原'
  var minDist = Infinity

  for (var city in cityMap) {
    var dist = Math.sqrt(Math.pow(lng - cityMap[city].lng, 2) + Math.pow(lat - cityMap[city].lat, 2))
    if (dist < minDist) {
      minDist = dist
      nearestCity = city
    }
  }

  var cityInfo = cityMap[nearestCity]

  return {
    success: true,
    error: '',
    data: {
      address: cityInfo.address,
      province: cityInfo.province,
      city: cityInfo.city,
      district: cityInfo.district,
      township: cityInfo.township || '',
      neighborhood: cityInfo.neighborhood || '',
      building: cityInfo.building || ''
    }
  }
}

function getMockPOI(keyword, city) {
  var mockData = getMockPOIData(keyword)
  
  if (!mockData) {
    mockData = [{
      id: 'mock_1',
      name: keyword,
      type: '未知类型',
      typecode: '',
      address: (city || '未知城市') + '的' + keyword,
      location: getDefaultLocation(keyword),
      tel: '',
      adcode: '',
      cityname: city || '未知城市',
      district: '',
      distance: '',
      rating: '',
      cost: ''
    }]
  }
  
  return { success: true, data: mockData }
}

function getMockPOIData(keyword) {
  var POI_DATA = {
    '黄鹤楼': [
      { id: '1', name: '黄鹤楼', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '湖北省武汉市武昌区蛇山西山坡特1号', location: '114.353596,30.552314', tel: '027-88875096', adcode: '420106', cityname: '武汉市', district: '武昌区', distance: '', rating: '4.7', cost: '70' }
    ],
    '故宫': [
      { id: '1', name: '故宫博物院', type: '旅游景点;博物馆;历史博物馆', typecode: '110200', address: '北京市东城区景山前街4号', location: '116.397026,39.916385', tel: '010-85007422', adcode: '110101', cityname: '北京市', district: '东城区', distance: '', rating: '4.8', cost: '60' }
    ],
    '西湖': [
      { id: '1', name: '西湖风景名胜区', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '浙江省杭州市西湖区龙井路1号', location: '120.153576,30.287459', tel: '0571-87179686', adcode: '330106', cityname: '杭州市', district: '西湖区', distance: '', rating: '4.8', cost: '' }
    ],
    '天安门': [
      { id: '1', name: '天安门', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '北京市东城区天安门广场北侧', location: '116.397228,39.908722', tel: '', adcode: '110101', cityname: '北京市', district: '东城区', distance: '', rating: '4.7', cost: '' }
    ],
    '兵马俑': [
      { id: '1', name: '秦始皇兵马俑博物馆', type: '旅游景点;博物馆;历史博物馆', typecode: '110200', address: '陕西省西安市临潼区秦俑馆公路', location: '109.275483,34.385444', tel: '029-81199174', adcode: '610115', cityname: '西安市', district: '临潼区', distance: '', rating: '4.8', cost: '150' }
    ],
    '长城': [
      { id: '1', name: '八达岭长城', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '北京市延庆区八达岭镇', location: '115.987066,40.366449', tel: '010-69121383', adcode: '110119', cityname: '北京市', district: '延庆区', distance: '', rating: '4.7', cost: '40' }
    ],
    '东方明珠': [
      { id: '1', name: '东方明珠广播电视塔', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '上海市浦东新区世纪大道1号', location: '121.506377,31.245477', tel: '021-58791888', adcode: '310115', cityname: '上海市', district: '浦东新区', distance: '', rating: '4.5', cost: '120' }
    ],
    '夫子庙': [
      { id: '1', name: '夫子庙', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '江苏省南京市秦淮区贡院街152号', location: '118.782583,32.021827', tel: '025-86628631', adcode: '320104', cityname: '南京市', district: '秦淮区', distance: '', rating: '4.6', cost: '' }
    ],
    '大雁塔': [
      { id: '1', name: '大雁塔', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '陕西省西安市雁塔区慈恩路1号', location: '108.954418,34.225061', tel: '029-85513971', adcode: '610113', cityname: '西安市', district: '雁塔区', distance: '', rating: '4.7', cost: '30' }
    ],
    '中山陵': [
      { id: '1', name: '中山陵', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '江苏省南京市玄武区中山陵园风景区', location: '118.801669,32.046616', tel: '', adcode: '320102', cityname: '南京市', district: '玄武区', distance: '', rating: '4.7', cost: '' }
    ],
    '上海外滩': [
      { id: '1', name: '外滩', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '上海市黄浦区中山东一路', location: '121.499898,31.239042', tel: '', adcode: '310101', cityname: '上海市', district: '黄浦区', distance: '', rating: '4.7', cost: '' }
    ],
    '重庆洪崖洞': [
      { id: '1', name: '洪崖洞民俗风貌区', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '重庆市渝中区嘉陵江滨江路88号', location: '106.584477,29.565131', tel: '023-63030566', adcode: '500103', cityname: '重庆市', district: '渝中区', distance: '', rating: '4.7', cost: '' }
    ],
    '成都宽窄巷子': [
      { id: '1', name: '宽窄巷子', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '四川省成都市青羊区金河宾馆东侧', location: '104.059897,30.662596', tel: '', adcode: '510105', cityname: '成都市', district: '青羊区', distance: '', rating: '4.6', cost: '' }
    ],
    '长沙橘子洲': [
      { id: '1', name: '橘子洲景区', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '湖南省长沙市岳麓区橘子洲头', location: '112.938822,28.228043', tel: '0731-88614640', adcode: '430104', cityname: '长沙市', district: '岳麓区', distance: '', rating: '4.6', cost: '' }
    ],
    '长白山': [
      { id: '1', name: '长白山风景区', type: '旅游景点;风景名胜;景点', typecode: '110000', address: '吉林省延边朝鲜族自治州安图县', location: '127.607816,41.960573', tel: '0433-5742286', adcode: '222426', cityname: '延边朝鲜族自治州', district: '安图县', distance: '', rating: '4.7', cost: '214' }
    ],
    '北京南站': [
      { id: '1', name: '北京南站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '北京市丰台区永定门外大街', location: '116.378318,39.851754', tel: '010-12306', adcode: '110106', cityname: '北京市', district: '丰台区', distance: '', rating: '4.4', cost: '' }
    ],
    '北京西站': [
      { id: '1', name: '北京西站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '北京市丰台区莲花池东路', location: '116.321657,39.894981', tel: '010-12306', adcode: '110106', cityname: '北京市', district: '丰台区', distance: '', rating: '4.4', cost: '' }
    ],
    '北京站': [
      { id: '1', name: '北京站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '北京市东城区毛家湾胡同甲13号', location: '116.420485,39.912747', tel: '010-12306', adcode: '110101', cityname: '北京市', district: '东城区', distance: '', rating: '4.4', cost: '' }
    ],
    '上海虹桥站': [
      { id: '1', name: '上海虹桥站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '上海市闵行区申虹路1000号', location: '121.308252,31.198795', tel: '021-12306', adcode: '310112', cityname: '上海市', district: '闵行区', distance: '', rating: '4.5', cost: '' }
    ],
    '上海站': [
      { id: '1', name: '上海站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '上海市静安区秣陵路303号', location: '121.453846,31.240308', tel: '021-12306', adcode: '310106', cityname: '上海市', district: '静安区', distance: '', rating: '4.4', cost: '' }
    ],
    '南京南站': [
      { id: '1', name: '南京南站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '江苏省南京市雨花台区玉兰路98号', location: '118.789573,31.985278', tel: '025-12306', adcode: '320114', cityname: '南京市', district: '雨花台区', distance: '', rating: '4.5', cost: '' }
    ],
    '南京站': [
      { id: '1', name: '南京站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '江苏省南京市玄武区龙蟠路111号', location: '118.799154,32.081165', tel: '025-12306', adcode: '320102', cityname: '南京市', district: '玄武区', distance: '', rating: '4.4', cost: '' }
    ],
    '杭州东站': [
      { id: '1', name: '杭州东站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '浙江省杭州市江干区天城路1号', location: '120.202739,30.279315', tel: '0571-12306', adcode: '330104', cityname: '杭州市', district: '江干区', distance: '', rating: '4.5', cost: '' }
    ],
    '杭州站': [
      { id: '1', name: '杭州站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '浙江省杭州市上城区环城东路1号', location: '120.140298,30.268996', tel: '0571-12306', adcode: '330102', cityname: '杭州市', district: '上城区', distance: '', rating: '4.4', cost: '' }
    ],
    '武汉站': [
      { id: '1', name: '武汉站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '湖北省武汉市洪山区白云路', location: '114.388342,30.574651', tel: '027-12306', adcode: '420111', cityname: '武汉市', district: '洪山区', distance: '', rating: '4.5', cost: '' }
    ],
    '汉口站': [
      { id: '1', name: '汉口站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '湖北省武汉市江汉区发展大道', location: '114.287933,30.595114', tel: '027-12306', adcode: '420103', cityname: '武汉市', district: '江汉区', distance: '', rating: '4.4', cost: '' }
    ],
    '武昌站': [
      { id: '1', name: '武昌站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '湖北省武汉市武昌区中山路', location: '114.361263,30.528297', tel: '027-12306', adcode: '420106', cityname: '武汉市', district: '武昌区', distance: '', rating: '4.4', cost: '' }
    ],
    '西安北站': [
      { id: '1', name: '西安北站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '陕西省西安市未央区元朔路', location: '108.954657,34.323977', tel: '029-12306', adcode: '610112', cityname: '西安市', district: '未央区', distance: '', rating: '4.5', cost: '' }
    ],
    '西安站': [
      { id: '1', name: '西安站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '陕西省西安市新城区环城北路', location: '108.963046,34.270918', tel: '029-12306', adcode: '610102', cityname: '西安市', district: '新城区', distance: '', rating: '4.4', cost: '' }
    ],
    '成都东站': [
      { id: '1', name: '成都东站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '四川省成都市成华区青衣江路', location: '104.131477,30.562711', tel: '028-12306', adcode: '510108', cityname: '成都市', district: '成华区', distance: '', rating: '4.5', cost: '' }
    ],
    '成都站': [
      { id: '1', name: '成都站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '四川省成都市金牛区二环路北二段', location: '104.056808,30.646171', tel: '028-12306', adcode: '510106', cityname: '成都市', district: '金牛区', distance: '', rating: '4.4', cost: '' }
    ],
    '广州南站': [
      { id: '1', name: '广州南站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '广东省广州市番禺区石壁街道', location: '113.280637,23.105505', tel: '020-12306', adcode: '440113', cityname: '广州市', district: '番禺区', distance: '', rating: '4.5', cost: '' }
    ],
    '广州站': [
      { id: '1', name: '广州站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '广东省广州市越秀区环市西路', location: '113.262486,23.147269', tel: '020-12306', adcode: '440104', cityname: '广州市', district: '越秀区', distance: '', rating: '4.4', cost: '' }
    ],
    '深圳北站': [
      { id: '1', name: '深圳北站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '广东省深圳市龙华区致远中路', location: '114.023379,22.624813', tel: '0755-12306', adcode: '440309', cityname: '深圳市', district: '龙华区', distance: '', rating: '4.5', cost: '' }
    ],
    '太原站': [
      { id: '1', name: '太原站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '山西省太原市杏花岭区建设北路2号', location: '112.586796,37.878674', tel: '0351-2233611', adcode: '140107', cityname: '太原市', district: '杏花岭区', distance: '', rating: '4.3', cost: '' }
    ],
    '太原南站': [
      { id: '1', name: '太原南站', type: '交通设施服务;火车站;火车站', typecode: '150100', address: '山西省太原市小店区北营北路', location: '112.623408,37.805138', tel: '0351-2233611', adcode: '140105', cityname: '太原市', district: '小店区', distance: '', rating: '4.5', cost: '' }
    ],
    '山西省人民医院': [
      { id: '1', name: '山西省人民医院', type: '医疗保健服务;综合医院;综合医院', typecode: '090100', address: '山西省太原市迎泽区解放南路85号', location: '112.562768,37.856957', tel: '0351-4960130', adcode: '140106', cityname: '太原市', district: '迎泽区', distance: '', rating: '4.5', cost: '' }
    ],
    '山西省中医院': [
      { id: '1', name: '山西省中医院', type: '医疗保健服务;中医医院;中医医院', typecode: '090200', address: '山西省太原市杏花岭区并州西街16号', location: '112.576073,37.867619', tel: '0351-4668013', adcode: '140107', cityname: '太原市', district: '杏花岭区', distance: '', rating: '4.4', cost: '' }
    ],
    '太原市人民医院': [
      { id: '1', name: '太原市人民医院', type: '医疗保健服务;综合医院;综合医院', typecode: '090100', address: '山西省太原市杏花岭区府西街13号', location: '112.549248,37.867619', tel: '0351-5656000', adcode: '140107', cityname: '太原市', district: '杏花岭区', distance: '', rating: '4.4', cost: '' }
    ],
    '家': [
      { id: '1', name: '用户家', type: '住宅;住宅小区;住宅小区', typecode: '120200', address: '山西省太原市', location: '112.549248,37.857014', tel: '', adcode: '140100', cityname: '太原市', district: '', distance: '', rating: '', cost: '' }
    ]
  }
  
  for (var key in POI_DATA) {
    if (keyword.includes(key) || key.includes(keyword)) {
      return POI_DATA[key]
    }
  }
  
  return null
}

module.exports = {
  geocode: geocode,
  searchPOI: searchPOI,
  searchNearbyPOI: searchNearbyPOI,
  getRoutePlan: getRoutePlan,
  reverseGeocode: reverseGeocode,
  searchBusLines: searchBusLines,
  searchBusStations: searchBusStations,
  getBusStationById: getBusStationById,
  getBusLineDetail: getBusLineDetail,
  getSubwayInfo: getSubwayInfo,
  getSubwayStation: getSubwayStation,
  searchScenicSpot: searchScenicSpot,
  getCurrentLocation: getCurrentLocation
}