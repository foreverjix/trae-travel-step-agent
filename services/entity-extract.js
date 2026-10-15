// ===== 实体提取服务：从老人语音中提取时间、地点、意图 =====
// 解决老人说话随意（"明天早上8点去省人民医院看病"）导致识别不准的问题

var entityExtractor = {

  // 主入口：提取所有实体
  extract: function(text) {
    // 先做ASR纠错（百度方言识别容易出错）
    text = this.correctASR(text)
    return {
      time: this.extractTime(text),
      date: this.extractDate(text),
      destination: this.extractDestination(text),
      purpose: this.extractPurpose(text),
      transport: this.extractTransport(text)
    }
  },

  // ASR方言识别纠错
  correctASR: function(text) {
    var corrections = [
      { from: /伤害/g, to: '上海' },
      { from: /北金/g, to: '北京' },
      { from: /广洲/g, to: '广州' },
      { from: /深镇/g, to: '深圳' },
      { from: /杭洲/g, to: '杭州' },
      { from: /成嘟/g, to: '成都' }
    ]
    for (var i = 0; i < corrections.length; i++) {
      text = text.replace(corrections[i].from, corrections[i].to)
    }
    return text
  },

  // ===== 时间提取 =====
  extractTime: function(text) {
    var time = ''

    // 精确时间：8点、8点半、8点30、8:30、八点、八点半
    var patterns = [
      /(\d{1,2})点(\d{1,2})分?/,          // 8点30分
      /(\d{1,2})点半/,                      // 8点半
      /(\d{1,2})点(\d{1,2})/,               // 8点30
      /(\d{1,2})点/,                        // 8点
      /(\d{1,2}):(\d{2})/,                  // 8:30
      /([零一二三四五六七八九十百]+)点([零一二三四五六七八九十百]+)分?/,  // 八点三十分
      /([零一二三四五六七八九十百]+)点半/,   // 八点半
      /([零一二三四五六七八九十百]+)点/      // 八点
    ]

    for (var i = 0; i < patterns.length; i++) {
      var match = text.match(patterns[i])
      if (match) {
        time = match[0]
        break
      }
    }

    // 时段词
    var period = ''
    if (/早上|早晨|一大早|上午/i.test(text)) {
      period = '早上'
    } else if (/中午|正午|午间/i.test(text)) {
      period = '中午'
    } else if (/下午|后半晌/i.test(text)) {
      period = '下午'
    } else if (/晚上|傍晚|夜里|晚间/i.test(text)) {
      period = '晚上'
    }

    if (period && !time) {
      time = period
    } else if (period && time) {
      time = period + time
    }

    return time
  },

  // ===== 日期提取 =====
  extractDate: function(text) {
    // 相对日期（含方言/口语）
    if (/大后天|大后日/i.test(text)) return '大后天'
    if (/后天|后日|后儿个|后儿/i.test(text)) return '后天'
    if (/明天|明日|明儿个|明儿|明个/i.test(text)) return '明天'
    if (/今天|今日|今儿个|今儿|今个/i.test(text)) return '今天'

    // 星期
    var weekMatch = text.match(/(本周|下周)?(周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日|礼拜[一二三四五六日天])/)
    if (weekMatch) return weekMatch[0]

    // 具体日期：3月15号、三月十五、3月15日
    var dateMatch = text.match(/(\d{1,2})月(\d{1,2})[号日]/)
    if (dateMatch) return dateMatch[1] + '月' + dateMatch[2] + '号'

    // 中文日期
    var cnDateMatch = text.match(/([一二三四五六七八九十]+)月([一二三四五六七八九十百]+)[号日]/)
    if (cnDateMatch) return cnDateMatch[1] + '月' + cnDateMatch[2] + '号'

    return ''
  },

  // ===== 目的地提取 =====
  extractDestination: function(text) {
    // 1. 回家
    if (/回家|回趟家|回老家|回屋|回去$/i.test(text)) {
      return { type: 'home', name: '家' }
    }

    // 2. 医院类
    var hospitalPatterns = [
      /(省人民医院|市人民医院|省立医院|市中心医院|区中心医院)/,
      /(中医院|中医医院|中西医结合医院)/,
      /(第一医院|第二医院|第三医院|人民医院|中心医院)/,
      /(妇幼保健院|儿童医院|眼科医院|骨科医院|口腔医院|精神医院)/,
      /(.+?医院)/,
      /(.+?卫生院)/
    ]
    for (var i = 0; i < hospitalPatterns.length; i++) {
      var match = text.match(hospitalPatterns[i])
      if (match) return { type: 'hospital', name: match[1] }
    }
    if (/医院|就医|看病|挂号|复诊|体检|就诊|打针|拿药|开药/i.test(text)) {
      return { type: 'hospital', name: '医院' }
    }

    // 3. 车站类
    var stationPatterns = [
      /(太原南站|太原站|太原东站|太原西站)/,
      /(大同站|大同南站|晋中站|忻州站|阳泉站|临汾站|运城站)/,
      /(南京南站|南京站|北京南站|北京站|上海虹桥站|上海站)/,
      /(.+?南站)/,
      /(.+?火车站)/,
      /(.+?高铁站)/,
      /(.+?动车站)/
    ]
    for (var i = 0; i < stationPatterns.length; i++) {
      var match = text.match(stationPatterns[i])
      if (match) return { type: 'station', name: match[1] }
    }
    if (/火车站|高铁站|动车站|车站|坐火车|坐高铁|坐动车/i.test(text)) {
      return { type: 'station', name: '火车站' }
    }

    // 4. 机场类
    var airportPatterns = [
      /(太原武宿机场|武宿机场|太原机场)/,
      /(北京首都机场|北京大兴机场|上海浦东机场|上海虹桥机场|南京禄口机场)/,
      /(.+?机场)/
    ]
    for (var i = 0; i < airportPatterns.length; i++) {
      var match = text.match(airportPatterns[i])
      if (match) return { type: 'airport', name: match[1] }
    }
    if (/机场|坐飞机|飞机/i.test(text)) {
      return { type: 'airport', name: '机场' }
    }

    // 5. 城市名（去南京、到北京）
    var cities = ['北京','上海','南京','广州','深圳','杭州','成都','重庆','武汉','西安','天津','苏州','长沙','郑州','济南','青岛','大连','哈尔滨','长春','沈阳','石家庄','太原','呼和浩特','乌鲁木齐','兰州','西宁','银川','拉萨','海口','南宁','贵阳','昆明','合肥','南昌','福州','厦门','宁波','无锡','常州','南通','扬州','镇江','泰州','盐城','淮安','宿迁','连云港','徐州','黄山']
    for (var i = 0; i < cities.length; i++) {
      if (text.indexOf('去' + cities[i]) !== -1 || text.indexOf('到' + cities[i]) !== -1) {
        return { type: 'city', name: cities[i] }
      }
    }

    // 6. 通用地点：去xxx、到xxx、前往xxx
    var toMatch = text.match(/去(.+?)(?:的|看|办|找|接|送|参加|赶|$|[，。？！、])/)
    if (toMatch) {
      var dest = toMatch[1].trim()
      // 过滤掉非地点词
      if (dest.length >= 2 && dest.length <= 15 && !/几点|时候|怎么|如何|多少|什么|哪个/i.test(dest)) {
        return { type: 'poi', name: dest }
      }
    }

    var toMatch2 = text.match(/到(.+?)(?:的|看|办|找|接|送|参加|赶|$|[，。？！、])/)
    if (toMatch2) {
      var dest2 = toMatch2[1].trim()
      if (dest2.length >= 2 && dest2.length <= 15 && !/几点|时候|怎么|如何|多少|什么|哪个/i.test(dest2)) {
        return { type: 'poi', name: dest2 }
      }
    }

    return null
  },

  // ===== 出行目的提取 =====
  extractPurpose: function(text) {
    if (/看病|就医|就诊|挂号|复诊|体检|打针|拿药|开药|检查/i.test(text)) return '看病'
    if (/接人|接.*回来|接.*到家/i.test(text)) return '接人'
    if (/送人|送.*去/i.test(text)) return '送人'
    if (/旅游|玩|逛|旅游|度假/i.test(text)) return '旅游'
    if (/上班|工作|开会/i.test(text)) return '上班'
    if (/买菜|购物|买东西|超市/i.test(text)) return '购物'
    if (/吃饭|聚餐|赴宴|喝喜酒/i.test(text)) return '吃饭'
    if (/看孙子|看孙女|看孩子|看外孙|看外孙女/i.test(text)) return '看孩子'
    if (/回老家|回乡|返乡/i.test(text)) return '回老家'
    return ''
  },

  // ===== 出行方式提取 =====
  extractTransport: function(text) {
    var prefs = []
    if (/打车|出租车|网约车|叫车|滴滴/i.test(text)) prefs.push('taxi')
    if (/地铁/i.test(text)) prefs.push('subway')
    if (/公交|公交车|巴士/i.test(text)) prefs.push('bus')
    if (/火车|高铁|动车/i.test(text)) prefs.push('train')
    if (/飞机/i.test(text)) prefs.push('plane')
    return prefs
  }
}

module.exports = entityExtractor
