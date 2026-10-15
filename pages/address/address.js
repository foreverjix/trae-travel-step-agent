const app = getApp()
const amapService = require('../../services/amap-service.js')

Page({
  data: {
    homeAddress: '',
    hospitalAddress: '',
    stationAddress: '',
    currentField: '',
    showMapPicker: false,
    showSearchPanel: false,
    searchKeyword: '',
    searchResults: [],
    mapCenter: { latitude: 37.8706, longitude: 112.5489 },
    mapScale: 14,
    markers: [],
    selectedLocation: null,
    selectedAddress: '',
    isSearching: false,
    searchTimer: null,
    lastSearchTime: 0,
    aiAssistantEnabled: false
  },

  onLoad() {
    this.loadAddresses()
  },

  onShow() {
    this.setData({ aiAssistantEnabled: app.globalData.aiAssistantEnabled })
    app.globalData.aiPageContext = {
      page: 'address',
      title: '地址',
      summary: '地址管理'
    }
    this.loadAddresses()
  },

  goBack() {
    wx.navigateBack()
  },

  loadAddresses() {
    var homeAddress = wx.getStorageSync('homeAddress')
    var hospitalAddress = wx.getStorageSync('hospitalAddress')
    var stationAddress = wx.getStorageSync('stationAddress')

    if (!homeAddress) {
      homeAddress = '太原市杏花岭区府西街25号'
      wx.setStorageSync('homeAddress', homeAddress)
    }
    if (!hospitalAddress) {
      hospitalAddress = '山西省人民医院'
      wx.setStorageSync('hospitalAddress', hospitalAddress)
    }
    if (!stationAddress) {
      stationAddress = '太原南站'
      wx.setStorageSync('stationAddress', stationAddress)
    }

    this.setData({
      homeAddress: homeAddress,
      hospitalAddress: hospitalAddress,
      stationAddress: stationAddress
    })
  },

  // 点击输入框 → 打开搜索面板
  onFieldTap(e) {
    var field = e.currentTarget.dataset.field
    var existingValue = this.data[field + 'Address'] || ''
    this.setData({
      currentField: field,
      searchKeyword: existingValue,
      showSearchPanel: true,
      searchResults: []
    })
    this.doSearch(existingValue)
  },

  onKeywordInput(e) {
    var keyword = e.detail.value
    this.setData({ searchKeyword: keyword })

    var now = Date.now()
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }
    var that = this
    this.setData({
      searchTimer: setTimeout(function() {
        that.doSearch(keyword)
      }, 400)
    })
  },

  async doSearch(keyword) {
    if (!keyword || keyword.length < 1) {
      this.setData({ searchResults: [], isSearching: false })
      return
    }
    this.setData({ isSearching: true })

    try {
      var result = await amapService.searchPOI(keyword, '太原')
      if (result && result.success && result.data) {
        var pois = result.data.slice(0, 10).map(function(poi) {
          var loc = poi.location || ''
          var parts = loc.split(',')
          return {
            id: poi.id,
            name: poi.name,
            address: poi.address || poi.district || '',
            district: poi.district || '',
            location: loc,
            latitude: parts[1] ? parseFloat(parts[1]) : 0,
            longitude: parts[0] ? parseFloat(parts[0]) : 0,
            type: poi.type || ''
          }
        })
        this.setData({ searchResults: pois, isSearching: false })
      } else {
        this.setData({ searchResults: [], isSearching: false })
      }
    } catch (err) {
      console.error('POI搜索失败:', err)
      this.setData({ searchResults: [], isSearching: false })
    }
  },

  selectSearchResult(e) {
    var poi = e.currentTarget.dataset.poi
    var field = this.data.currentField
    var updateData = {}
    updateData[field + 'Address'] = poi.name
    this.setData(updateData)
    this.closeSearchPanel()
    wx.showToast({ title: '已选择：' + poi.name, icon: 'success', duration: 1500 })
  },

  closeSearchPanel() {
    this.setData({
      showSearchPanel: false,
      searchResults: [],
      searchKeyword: ''
    })
  },

  // 使用当前位置
  useCurrentLocation() {
    var that = this
    wx.showLoading({ title: '定位中...', mask: true })
    wx.getLocation({
      type: 'gcj02',
      success: function(res) {
        var lng = res.longitude
        var lat = res.latitude
        amapService.reverseGeocode(lng + ',' + lat).then(function(result) {
          wx.hideLoading()
          if (result && result.success && result.data) {
            var addr = result.data.address || ('当前位置 ' + lat.toFixed(4) + ',' + lng.toFixed(4))
            var field = that.data.currentField || 'home'
            var updateData = {}
            updateData[field + 'Address'] = addr
            that.setData(updateData)
            wx.showToast({ title: '已定位', icon: 'success', duration: 1500 })
          } else {
            wx.showToast({ title: '定位成功，但地址解析失败', icon: 'none' })
          }
        }).catch(function() {
          wx.hideLoading()
          wx.showToast({ title: '网络异常，请重试', icon: 'none' })
        })
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '获取位置失败，请检查权限', icon: 'none' })
      }
    })
  },

  // 打开地图选点
  openMapPicker() {
    if (!this.data.markers || this.data.markers.length === 0) {
      var field = this.data.currentField
      var currentVal = this.data[field + 'Address'] || ''
      if (currentVal) {
        this.searchAndCenter(currentVal)
      }
    }
    this.setData({ showMapPicker: true, showSearchPanel: false })
  },

  searchAndCenter(keyword) {
    var that = this
    amapService.searchPOI(keyword, '太原').then(function(result) {
      if (result && result.success && result.data && result.data.length > 0) {
        var poi = result.data[0]
        var parts = (poi.location || '').split(',')
        if (parts.length === 2) {
          var lat = parseFloat(parts[1])
          var lng = parseFloat(parts[0])
          that.setData({
            mapCenter: { latitude: lat, longitude: lng },
            selectedLocation: { latitude: lat, longitude: lng },
            selectedAddress: poi.name + ' ' + (poi.address || '')
          })
        }
      }
    })
  },

  onMapTap(e) {
    var lat = e.detail.latitude
    var lng = e.detail.longitude
    var that = this

    this.setData({
      selectedLocation: { latitude: lat, longitude: lng },
      markers: [{
        id: 1,
        latitude: lat,
        longitude: lng,
        iconPath: '',
        width: 32,
        height: 32
      }]
    })

    amapService.reverseGeocode(lng + ',' + lat).then(function(result) {
      if (result && result.success && result.data) {
        var addr = result.data.address || ''
        that.setData({ selectedAddress: addr })
      } else {
        that.setData({ selectedAddress: lat.toFixed(6) + ', ' + lng.toFixed(6) })
      }
    }).catch(function() {
      that.setData({ selectedAddress: lat.toFixed(6) + ', ' + lng.toFixed(6) })
    })
  },

  onRegionChange(e) {
    if (e.type === 'end') {
      this.setData({
        mapCenter: {
          latitude: e.detail.latitude,
          longitude: e.detail.longitude
        }
      })
    }
  },

  confirmMapPick() {
    if (!this.data.selectedAddress) {
      wx.showToast({ title: '请在地图上选择一个位置', icon: 'none' })
      return
    }
    var field = this.data.currentField
    var updateData = {}
    updateData[field + 'Address'] = this.data.selectedAddress
    this.setData(updateData)
    this.setData({ showMapPicker: false })
    wx.showToast({ title: '已选择位置', icon: 'success', duration: 1500 })
  },

  cancelMapPick() {
    this.setData({ showMapPicker: false })
  },

  onHomeAddressChange(e) {
    this.setData({ homeAddress: e.detail.value })
  },

  onHospitalAddressChange(e) {
    this.setData({ hospitalAddress: e.detail.value })
  },

  onStationAddressChange(e) {
    this.setData({ stationAddress: e.detail.value })
  },

  saveAddresses() {
    wx.setStorageSync('homeAddress', this.data.homeAddress)
    wx.setStorageSync('hospitalAddress', this.data.hospitalAddress)
    wx.setStorageSync('stationAddress', this.data.stationAddress)

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })

    setTimeout(function() {
      wx.navigateBack()
    }, 1500)
  }
})
