const db = wx.cloud.database()

try {
  var amapService = require('./amap-service.js')
} catch (e) {
  console.log('amap-service not available, using local data only')
}

async function addFamilyRelation(data) {
  try {
    const result = await db.collection('family_relations').add({
      data: {
        parent_openid: data.parent_openid,
        parent_name: data.parent_name || '',
        parent_phone: data.parent_phone || '',
        child_openid: data.child_openid,
        child_name: data.child_name || '',
        child_phone: data.child_phone || '',
        relation_type: data.relation_type || 'parent_child',
        status: data.status || 'active',
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('添加家庭关系失败:', error)
    return { success: false, error: error.message }
  }
}

async function getFamilyRelations(openid) {
  try {
    const result = await db.collection('family_relations')
      .where(db.command.or([
        { parent_openid: openid },
        { child_openid: openid }
      ]))
      .get()
    return { success: true, data: result.data }
  } catch (error) {
    console.error('查询家庭关系失败:', error)
    return { success: false, error: error.message }
  }
}

async function updateFamilyRelation(id, data) {
  try {
    const result = await db.collection('family_relations')
      .doc(id)
      .update({
        data: {
          ...data,
          updated_at: db.serverDate()
        }
      })
    return { success: true, data: result }
  } catch (error) {
    console.error('更新家庭关系失败:', error)
    return { success: false, error: error.message }
  }
}

async function deleteFamilyRelation(id) {
  try {
    const result = await db.collection('family_relations')
      .doc(id)
      .remove()
    return { success: true, data: result }
  } catch (error) {
    console.error('删除家庭关系失败:', error)
    return { success: false, error: error.message }
  }
}

async function addSubwayLine(data) {
  try {
    const result = await db.collection('subway_lines').add({
      data: {
        line_name: data.line_name,
        line_color: data.line_color || '#E63946',
        city: data.city || '太原',
        stations: data.stations || [],
        first_time: data.first_time || '06:00',
        last_time: data.last_time || '22:00',
        price_range: data.price_range || '2-6',
        status: data.status || 'active',
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('添加地铁线路失败:', error)
    return { success: false, error: error.message }
  }
}

async function getSubwayLines(city = '太原') {
  if (amapService) {
    try {
      const result = await amapService.getSubwayInfo(city)
      if (result.success && result.data.length > 0) {
        return result
      }
    } catch (error) {
      console.log('高德地铁API调用失败，使用本地数据:', error.message)
    }
  }
  
  try {
    const result = await db.collection('subway_lines')
      .where({ city, status: 'active' })
      .get()
    return { success: true, data: result.data }
  } catch (error) {
    console.error('查询地铁线路失败:', error)
    return { success: false, error: error.message }
  }
}

async function getSubwayLineById(id) {
  try {
    const result = await db.collection('subway_lines')
      .doc(id)
      .get()
    return { success: true, data: result.data }
  } catch (error) {
    console.error('查询地铁线路失败:', error)
    return { success: false, error: error.message }
  }
}

async function addBusLine(data) {
  try {
    const result = await db.collection('bus_lines').add({
      data: {
        line_name: data.line_name,
        line_number: data.line_number,
        city: data.city || '太原',
        start_station: data.start_station,
        end_station: data.end_station,
        stations: data.stations || [],
        first_time: data.first_time || '06:00',
        last_time: data.last_time || '22:00',
        price: data.price || 2,
        interval: data.interval || '10-15分钟',
        status: data.status || 'active',
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('添加公交线路失败:', error)
    return { success: false, error: error.message }
  }
}

async function getBusLines(city = '太原') {
  if (amapService) {
    try {
      const result = await amapService.searchBusLines('', city)
      if (result.success && result.data.length > 0) {
        return result
      }
    } catch (error) {
      console.log('高德公交API调用失败，使用本地数据:', error.message)
    }
  }
  
  try {
    const result = await db.collection('bus_lines')
      .where({ city, status: 'active' })
      .get()
    return { success: true, data: result.data }
  } catch (error) {
    console.error('查询公交线路失败:', error)
    return { success: false, error: error.message }
  }
}

async function searchBusLines(keyword, city = '太原') {
  if (amapService) {
    try {
      const result = await amapService.searchBusLines(keyword, city)
      if (result.success && result.data.length > 0) {
        return result
      }
    } catch (error) {
      console.log('高德公交搜索API调用失败，使用本地数据:', error.message)
    }
  }
  
  try {
    const result = await db.collection('bus_lines')
      .where(db.command.or([
        { line_name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { line_number: db.RegExp({ regexp: keyword, options: 'i' }) },
        { start_station: db.RegExp({ regexp: keyword, options: 'i' }) },
        { end_station: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]))
      .where({ city, status: 'active' })
      .get()
    return { success: true, data: result.data }
  } catch (error) {
    console.error('搜索公交线路失败:', error)
    return { success: false, error: error.message }
  }
}

async function getBusLineById(id) {
  try {
    const result = await db.collection('bus_lines')
      .doc(id)
      .get()
    return { success: true, data: result.data }
  } catch (error) {
    console.error('查询公交线路失败:', error)
    return { success: false, error: error.message }
  }
}

async function addTripRecord(data) {
  try {
    const result = await db.collection('trip_records').add({
      data: {
        user_openid: data.user_openid,
        user_name: data.user_name || '',
        trip_type: data.trip_type || 'route_plan',
        destination: data.destination || '',
        origin: data.origin || '',
        date: data.date || '',
        time: data.time || '',
        routes: data.routes || [],
        selected_route: data.selected_route || null,
        status: data.status || 'planned',
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('添加行程记录失败:', error)
    return { success: false, error: error.message }
  }
}

async function getTripRecords(user_openid) {
  try {
    const result = await db.collection('trip_records')
      .where({ user_openid })
      .orderBy('created_at', 'desc')
      .get()
    return { success: true, data: result.data }
  } catch (error) {
    console.error('查询行程记录失败:', error)
    return { success: false, error: error.message }
  }
}

async function updateTripRecord(id, data) {
  try {
    const result = await db.collection('trip_records')
      .doc(id)
      .update({
        data: {
          ...data,
          updated_at: db.serverDate()
        }
      })
    return { success: true, data: result }
  } catch (error) {
    console.error('更新行程记录失败:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  addFamilyRelation: addFamilyRelation,
  getFamilyRelations: getFamilyRelations,
  updateFamilyRelation: updateFamilyRelation,
  deleteFamilyRelation: deleteFamilyRelation,
  addSubwayLine: addSubwayLine,
  getSubwayLines: getSubwayLines,
  getSubwayLineById: getSubwayLineById,
  addBusLine: addBusLine,
  getBusLines: getBusLines,
  searchBusLines: searchBusLines,
  getBusLineById: getBusLineById,
  addTripRecord: addTripRecord,
  getTripRecords: getTripRecords,
  updateTripRecord: updateTripRecord
}