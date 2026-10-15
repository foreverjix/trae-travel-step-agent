const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// ===== 位置上报（父母端调用） =====
// 参数: { latitude, longitude, address, accuracy }
exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // ===== 上报位置 =====
    if (action === 'upload') {
      const { latitude, longitude, address, accuracy } = event
      const now = new Date()

      // 查找是否已有记录
      const existRes = await db.collection('parent_locations')
        .where({ openid: openid })
        .get()

      if (existRes.data.length > 0) {
        // 更新已有记录
        await db.collection('parent_locations').doc(existRes.data[0]._id).update({
          data: {
            latitude: latitude,
            longitude: longitude,
            address: address || '',
            accuracy: accuracy || 0,
            updateTime: now,
            updateTimeStr: now.toISOString()
          }
        })
      } else {
        // 新建记录
        await db.collection('parent_locations').add({
          data: {
            openid: openid,
            latitude: latitude,
            longitude: longitude,
            address: address || '',
            accuracy: accuracy || 0,
            updateTime: now,
            updateTimeStr: now.toISOString()
          }
        })
      }

      return { success: true, message: '位置已上报' }
    }

    // ===== 查询位置（子女端调用） =====
    if (action === 'query') {
      const { parentOpenid } = event
      const queryOpenid = parentOpenid || openid

      const res = await db.collection('parent_locations')
        .where({ openid: queryOpenid })
        .get()

      if (res.data.length > 0) {
        const loc = res.data[0]
        return {
          success: true,
          data: {
            latitude: loc.latitude,
            longitude: loc.longitude,
            address: loc.address,
            updateTime: loc.updateTimeStr,
            accuracy: loc.accuracy
          }
        }
      }

      return { success: false, message: '暂无位置信息' }
    }

    // ===== 获取位置列表（子女端查看所有绑定的父母位置） =====
    if (action === 'list') {
      const { parentOpenids } = event
      if (!parentOpenids || parentOpenids.length === 0) {
        return { success: true, data: [] }
      }

      const res = await db.collection('parent_locations')
        .where({
          openid: _.in(parentOpenids)
        })
        .get()

      return {
        success: true,
        data: res.data.map(loc => ({
          openid: loc.openid,
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address,
          updateTime: loc.updateTimeStr,
          accuracy: loc.accuracy
        }))
      }
    }

    return { success: false, message: '未知操作' }
  } catch (err) {
    console.error('parent-location error:', err)
    return { success: false, message: err.message }
  }
}
