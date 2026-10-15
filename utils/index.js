const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')
  
  const map = {
    'YYYY': year,
    'MM': month,
    'DD': day,
    'HH': hour,
    'mm': minute,
    'ss': second
  }
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => map[match])
}

const formatTime = (date, format = 'HH:mm') => {
  return formatDate(date, format)
}

const generateOrderId = () => {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substr(2, 8).toUpperCase()
  return timestamp + random
}

const debounce = (fn, delay = 300) => {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

const throttle = (fn, delay = 500) => {
  let lastTime = 0
  return function(...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({
    title,
    icon,
    duration
  })
}

const showModal = (title, content, confirmText = '确定', cancelText = '取消') => {
  return new Promise((resolve) => {
    // 页面切换/销毁时调用 wx.showModal 会导致 __subPageFrameEndTime__ of null 错误
    if (getCurrentPages().length === 0) {
      resolve(false)
      return
    }
    try {
      wx.showModal({
        title,
        content,
        confirmText,
        cancelText,
        success: (res) => {
          resolve(res.confirm)
        },
        fail: () => {
          resolve(false)
        }
      })
    } catch (e) {
      resolve(false)
    }
  })
}

const getDistance = (lat1, lng1, lat2, lng2) => {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) ||
      !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return 0
  }
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return (R * c).toFixed(2)
}

const getAge = (birthDate) => {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

const validatePhone = (phone) => {
  const regex = /^1[3-9]\d{9}$/
  return regex.test(phone)
}

const validateCode = (code) => {
  const regex = /^\d{6}$/
  return regex.test(code)
}

const getLocation = () => {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 8000,
      timeout: 12000,
      success: (res) => {
        resolve(res)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

const isEmpty = (value) => {
  return value === null || value === undefined || value === '' || 
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
}

const calculatePrice = (distance, basePrice = 8, perKm = 2.5) => {
  if (distance <= 3) return basePrice
  return basePrice + (distance - 3) * perKm
}

const getOrderStatusText = (status) => {
  const map = {
    'pending': '待处理',
    'confirmed': '已确认',
    'processing': '处理中',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunded': '已退款',
    'booked': '已订票',
    'checked': '已检票',
    'boarding': '已上车',
    'arrived': '已到达',
    'waiting': '等待接单',
    'picking': '司机接单中',
    'onway': '行程中',
    'paid': '已支付',
    'unpaid': '待支付'
  }
  return map[status] || status
}

const getOrderStatusColor = (status) => {
  const map = {
    'pending': '#5B8DEF',
    'confirmed': '#4A7AD9',
    'processing': '#4A7AD9',
    'completed': '#6B9BCE',
    'cancelled': '#7A8BA0',
    'refunded': '#7A8BA0',
    'booked': '#5B8DEF',
    'checked': '#5B8DEF',
    'boarding': '#5B8DEF',
    'arrived': '#6B9BCE',
    'waiting': '#5B8DEF',
    'picking': '#3A6BC4',
    'onway': '#3A6BC4',
    'paid': '#6B9BCE',
    'unpaid': '#A5B5CE'
  }
  return map[status] || '#7A8BA0'
}

module.exports = {
  formatDate,
  formatTime,
  generateOrderId,
  debounce,
  throttle,
  showToast,
  showModal,
  getDistance,
  getAge,
  validatePhone,
  validateCode,
  getLocation,
  isEmpty,
  calculatePrice,
  getOrderStatusText,
  getOrderStatusColor
}