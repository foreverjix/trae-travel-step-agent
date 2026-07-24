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
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

const getDistance = (lat1, lng1, lat2, lng2) => {
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
    'pending': '#faad14',
    'confirmed': '#FF8C42',
    'processing': '#FF8C42',
    'completed': '#06D6A0',
    'cancelled': '#9CA3AF',
    'refunded': '#9CA3AF',
    'booked': '#FF8C42',
    'checked': '#FF8C42',
    'boarding': '#FFB627',
    'arrived': '#06D6A0',
    'waiting': '#FFB627',
    'picking': '#FF8C42',
    'onway': '#FF8C42',
    'paid': '#06D6A0',
    'unpaid': '#EF476F'
  }
  return map[status] || '#999999'
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