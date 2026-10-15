/**
 * 响应式适配工具
 * 根据屏幕尺寸自适应布局
 */

var systemInfo = null
var deviceType = null

function initSystemInfo() {
  if (systemInfo) return systemInfo

  try {
    var windowInfo = null
    var deviceInfo = null

    if (wx.getWindowInfo) {
      windowInfo = wx.getWindowInfo()
    }
    if (wx.getDeviceInfo) {
      deviceInfo = wx.getDeviceInfo()
    }

    if (windowInfo) {
      systemInfo = {
        screenHeight: windowInfo.screenHeight || 667,
        screenWidth: windowInfo.screenWidth || 375,
        windowWidth: windowInfo.windowWidth || 375,
        windowHeight: windowInfo.windowHeight || 603,
        statusBarHeight: windowInfo.statusBarHeight || 20,
        pixelRatio: windowInfo.pixelRatio || 2,
        safeArea: windowInfo.safeArea || { top: 20, bottom: (windowInfo.screenHeight || 667) - 50 }
      }
    } else {
      systemInfo = wx.getSystemInfoSync()
    }

    var screenHeight = systemInfo.screenHeight || 667
    var screenWidth = systemInfo.screenWidth || 375
    var safeArea = systemInfo.safeArea || { top: 20, bottom: screenHeight - 50 }

    // 判断设备类型
    if (screenHeight <= 600) {
      deviceType = 'small'
    } else if (screenHeight <= 750) {
      deviceType = 'normal'
    } else if (screenHeight <= 850) {
      deviceType = 'large'
    } else {
      deviceType = 'xlarge'
    }

    systemInfo.deviceType = deviceType
    systemInfo.statusBarHeight = systemInfo.statusBarHeight || 20
    systemInfo.safeAreaTop = safeArea.top || systemInfo.statusBarHeight
    systemInfo.safeAreaBottom = screenHeight - (safeArea.bottom || screenHeight)
    systemInfo.isFullScreen = systemInfo.safeAreaBottom > 0
    systemInfo.pixelRatio = systemInfo.pixelRatio || 2

  } catch (e) {
    systemInfo = {
      screenHeight: 667,
      screenWidth: 375,
      windowWidth: 375,
      statusBarHeight: 20,
      deviceType: 'normal',
      safeAreaTop: 20,
      safeAreaBottom: 0,
      isFullScreen: false,
      pixelRatio: 2
    }
    deviceType = 'normal'
  }

  return systemInfo
}

/**
 * 获取响应式配置
 * @param {Object} config - 各设备尺寸配置
 * @param {*} config.small - 小屏配置 (<=600px)
 * @param {*} config.normal - 普通屏配置 (<=750px)
 * @param {*} config.large - 大屏配置 (<=850px)
 * @param {*} config.xlarge - 超大屏配置 (>850px)
 */
function getResponsiveConfig(config) {
  initSystemInfo()
  return config[deviceType] || config.normal
}

/**
 * 获取安全区顶部间距（px）
 */
function getSafeTop() {
  initSystemInfo()
  return systemInfo.safeAreaTop + 44 // 状态栏 + 导航栏
}

/**
 * 获取安全区底部间距（px）
 */
function getSafeBottom() {
  initSystemInfo()
  return systemInfo.safeAreaBottom
}

/**
 * 获取tabbar总高度（rpx）
 * tabbar高度 + 安全区底部
 */
function getTabBarHeight() {
  initSystemInfo()
  var tabBarHeight = 100
  var safeBottomRpx = systemInfo.safeAreaBottom * 2
  return tabBarHeight + safeBottomRpx
}

/**
 * 根据屏幕高度计算字体缩放比例
 * 小屏缩小字体，大屏放大字体
 */
function getFontScale() {
  initSystemInfo()
  switch (deviceType) {
    case 'small': return 0.9
    case 'normal': return 1.0
    case 'large': return 1.05
    case 'xlarge': return 1.1
    default: return 1.0
  }
}

/**
 * 获取页面容器的padding-bottom
 * 确保内容不被底部元素遮挡
 */
function getContainerPaddingBottom(extraPadding) {
  initSystemInfo()
  var basePadding = 200
  var safeBottom = systemInfo.safeAreaBottom * 2
  var extra = extraPadding || 0
  return basePadding + safeBottom + extra
}

/**
 * 将固定像素转换为rpx
 */
function pxToRpx(px) {
  initSystemInfo()
  return px * 750 / systemInfo.windowWidth
}

/**
 * 将rpx转换为像素
 */
function rpxToPx(rpx) {
  initSystemInfo()
  return rpx * systemInfo.windowWidth / 750
}

/**
 * 获取设备类型
 */
function getDeviceType() {
  initSystemInfo()
  return deviceType
}

/**
 * 根据设备类型获取对应的样式类名
 */
function getDeviceClass() {
  initSystemInfo()
  return 'device-' + deviceType
}

/**
 * 适配页面 - 在page的onLoad中调用
 * @param {Object} page - 页面this
 * @param {Object} options - 配置选项
 */
function adaptPage(page, options) {
  initSystemInfo()
  var opts = options || {}

  page.setData({
    statusBarHeight: systemInfo.statusBarHeight,
    safeAreaTop: systemInfo.safeAreaTop,
    safeAreaBottom: systemInfo.safeAreaBottom,
    screenWidth: systemInfo.screenWidth,
    screenHeight: systemInfo.screenHeight,
    deviceType: deviceType,
    fontScale: getFontScale(),
    tabBarHeight: getTabBarHeight()
  })

  if (opts.onAdapt) {
    opts.onAdapt(systemInfo, deviceType)
  }
}

/**
 * 生成响应式样式字符串
 * @param {Object} styles - 样式对象
 * @returns {string} - 内联样式字符串
 */
function generateStyleString(styles) {
  if (!styles) return ''
  var parts = []
  for (var key in styles) {
    if (styles.hasOwnProperty(key)) {
      var cssKey = key.replace(/[A-Z]/g, function(match) {
        return '-' + match.toLowerCase()
      })
      parts.push(cssKey + ': ' + styles[key])
    }
  }
  return parts.join('; ')
}

module.exports = {
  initSystemInfo: initSystemInfo,
  getResponsiveConfig: getResponsiveConfig,
  getSafeTop: getSafeTop,
  getSafeBottom: getSafeBottom,
  getTabBarHeight: getTabBarHeight,
  getFontScale: getFontScale,
  getContainerPaddingBottom: getContainerPaddingBottom,
  pxToRpx: pxToRpx,
  rpxToPx: rpxToPx,
  getDeviceType: getDeviceType,
  getDeviceClass: getDeviceClass,
  adaptPage: adaptPage,
  generateStyleString: generateStyleString
}
