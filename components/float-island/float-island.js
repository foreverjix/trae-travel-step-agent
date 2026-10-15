const app = getApp()
const { reverseGeocode } = require('../../services/amap-service.js')
const ttsService = require('../../services/baidu-tts.js')
const responsive = require('../../utils/responsive.js')

var cityCoords = {
  // 华北
  '北京': { lng: 116.407395, lat: 39.904211 },
  '北京西': { lng: 116.322056, lat: 39.893611 },
  '北京南': { lng: 116.378512, lat: 39.865251 },
  '北京北': { lng: 116.357944, lat: 39.943168 },
  '北京丰台': { lng: 116.287556, lat: 39.851833 },
  '天津': { lng: 117.201012, lat: 39.084158 },
  '天津西': { lng: 117.158833, lat: 39.152833 },
  '天津南': { lng: 117.073278, lat: 39.063306 },
  '石家庄': { lng: 114.514859, lat: 38.042306 },
  '石家庄北': { lng: 114.469944, lat: 38.061917 },
  '太原': { lng: 112.549248, lat: 37.857014 },
  '太原南': { lng: 112.553757, lat: 37.718404 },
  '大同': { lng: 113.298027, lat: 40.076816 },
  '阳泉北': { lng: 113.573611, lat: 38.214167 },
  '呼和浩特': { lng: 111.751990, lat: 40.841490 },
  '呼和浩特东': { lng: 111.797778, lat: 40.854444 },
  // 东北
  '沈阳': { lng: 123.429040, lat: 41.796768 },
  '沈阳北': { lng: 123.426722, lat: 41.824722 },
  '沈阳南': { lng: 123.430278, lat: 41.713889 },
  '大连': { lng: 121.614682, lat: 38.914003 },
  '大连北': { lng: 121.583611, lat: 39.021944 },
  '长春': { lng: 125.324500, lat: 43.886841 },
  '长春西': { lng: 125.282222, lat: 43.862222 },
  '吉林': { lng: 126.549572, lat: 43.837883 },
  '哈尔滨': { lng: 126.535800, lat: 45.802281 },
  '哈尔滨西': { lng: 126.510833, lat: 45.734444 },
  '哈尔滨北': { lng: 126.604167, lat: 45.803056 },
  // 华东
  '上海': { lng: 121.473701, lat: 31.230416 },
  '上海虹桥': { lng: 121.436116, lat: 31.197924 },
  '上海南': { lng: 121.431667, lat: 31.154167 },
  '上海西': { lng: 121.418056, lat: 31.254444 },
  '南京': { lng: 118.796875, lat: 32.060255 },
  '南京南': { lng: 118.796875, lat: 31.970000 },
  '南京东': { lng: 118.853611, lat: 32.094444 },
  '苏州': { lng: 120.585315, lat: 31.298886 },
  '苏州北': { lng: 120.608056, lat: 31.330833 },
  '无锡': { lng: 120.311910, lat: 31.491169 },
  '无锡东': { lng: 120.403333, lat: 31.579167 },
  '常州': { lng: 119.973987, lat: 31.811693 },
  '常州北': { lng: 119.976389, lat: 31.858333 },
  '镇江': { lng: 119.452753, lat: 32.204402 },
  '徐州': { lng: 117.284124, lat: 34.205768 },
  '徐州东': { lng: 117.321111, lat: 34.276944 },
  '杭州': { lng: 120.153576, lat: 30.287459 },
  '杭州东': { lng: 120.213220, lat: 30.290920 },
  '杭州南': { lng: 120.305000, lat: 30.169444 },
  '宁波': { lng: 121.544026, lat: 29.868336 },
  '宁波站': { lng: 121.589444, lat: 29.821667 },
  '温州': { lng: 120.699277, lat: 27.993836 },
  '温州南': { lng: 120.730278, lat: 27.929444 },
  '合肥': { lng: 117.227239, lat: 31.820567 },
  '合肥南': { lng: 117.311944, lat: 31.803611 },
  '芜湖': { lng: 118.376265, lat: 31.326319 },
  '蚌埠': { lng: 117.363228, lat: 32.915477 },
  '蚌埠南': { lng: 117.378611, lat: 32.889444 },
  '南昌': { lng: 115.858197, lat: 28.682892 },
  '南昌西': { lng: 115.863611, lat: 28.654167 },
  '福州': { lng: 119.296494, lat: 26.074508 },
  '福州南': { lng: 119.318056, lat: 26.046111 },
  '厦门': { lng: 118.089425, lat: 24.479834 },
  '厦门北': { lng: 118.037222, lat: 24.572778 },
  '济南': { lng: 117.000923, lat: 36.675807 },
  '济南西': { lng: 116.919722, lat: 36.654167 },
  '济南东': { lng: 117.061667, lat: 36.698333 },
  '青岛': { lng: 120.382640, lat: 36.067082 },
  '青岛北': { lng: 120.371389, lat: 36.170556 },
  '青岛西': { lng: 120.095000, lat: 35.960278 },
  '烟台': { lng: 121.447935, lat: 37.463822 },
  // 华中
  '郑州': { lng: 113.625368, lat: 34.746558 },
  '郑州东': { lng: 113.779444, lat: 34.754444 },
  '洛阳': { lng: 112.454040, lat: 34.619684 },
  '龙门': { lng: 112.485278, lat: 34.569444 },
  '武汉': { lng: 114.305539, lat: 30.592849 },
  '武汉站': { lng: 114.415556, lat: 30.526944 },
  '汉口': { lng: 114.264167, lat: 30.596667 },
  '武昌': { lng: 114.316111, lat: 30.528611 },
  '长沙': { lng: 112.938814, lat: 28.228209 },
  '长沙南': { lng: 113.063333, lat: 28.168333 },
  '岳阳': { lng: 113.128958, lat: 29.356277 },
  '岳阳东': { lng: 113.175833, lat: 29.359167 },
  // 华南
  '广州': { lng: 113.264385, lat: 23.129110 },
  '广州南': { lng: 113.266801, lat: 23.005828 },
  '广州东': { lng: 113.314444, lat: 23.151944 },
  '广州北': { lng: 113.229444, lat: 23.391111 },
  '深圳': { lng: 114.057964, lat: 22.543099 },
  '深圳北': { lng: 114.027800, lat: 22.610700 },
  '深圳东': { lng: 114.116667, lat: 22.596111 },
  '深圳西': { lng: 113.819722, lat: 22.533333 },
  '福田': { lng: 114.065278, lat: 22.606667 },
  '珠海': { lng: 113.576680, lat: 22.270715 },
  '珠海站': { lng: 113.541944, lat: 22.229444 },
  '佛山': { lng: 113.122784, lat: 23.028762 },
  '佛山西': { lng: 113.047222, lat: 23.080556 },
  '东莞': { lng: 113.751793, lat: 23.020672 },
  '东莞东': { lng: 114.136667, lat: 23.019167 },
  '南宁': { lng: 108.366943, lat: 22.817002 },
  '南宁东': { lng: 108.449444, lat: 22.829444 },
  '桂林': { lng: 110.290195, lat: 25.273566 },
  '桂林北': { lng: 110.305556, lat: 25.313889 },
  '柳州': { lng: 109.428397, lat: 24.326003 },
  '海口': { lng: 110.331199, lat: 20.031797 },
  '海口东': { lng: 110.361944, lat: 20.029444 },
  '三亚': { lng: 109.508267, lat: 18.247872 },
  // 西南
  '成都': { lng: 104.066801, lat: 30.572816 },
  '成都东': { lng: 104.137840, lat: 30.630500 },
  '成都南': { lng: 104.068611, lat: 30.541667 },
  '成都西': { lng: 103.983333, lat: 30.588333 },
  '重庆': { lng: 106.551556, lat: 29.563009 },
  '重庆北': { lng: 106.551570, lat: 29.577920 },
  '重庆西': { lng: 106.428889, lat: 29.476111 },
  '贵阳': { lng: 106.713478, lat: 26.578343 },
  '贵阳北': { lng: 106.648333, lat: 26.651111 },
  '贵阳东': { lng: 106.716667, lat: 26.615556 },
  '昆明': { lng: 102.712251, lat: 25.040609 },
  '昆明南': { lng: 102.746944, lat: 24.908333 },
  '大理': { lng: 100.225668, lat: 25.589449 },
  '丽江': { lng: 100.233026, lat: 26.872108 },
  '拉萨': { lng: 91.132212, lat: 29.660361 },
  // 西北
  '西安': { lng: 108.939840, lat: 34.341273 },
  '西安北': { lng: 108.943889, lat: 34.381111 },
  '西安南': { lng: 108.971111, lat: 34.092222 },
  '宝鸡': { lng: 107.144870, lat: 34.362980 },
  '宝鸡南': { lng: 107.165556, lat: 34.336111 },
  '汉中': { lng: 107.023323, lat: 33.067840 },
  '兰州': { lng: 103.834170, lat: 36.061380 },
  '兰州西': { lng: 103.733333, lat: 36.073333 },
  '天水': { lng: 105.724864, lat: 34.580862 },
  '天水南': { lng: 105.759444, lat: 34.572222 },
  '西宁': { lng: 101.778228, lat: 36.617144 },
  '西宁站': { lng: 101.781944, lat: 36.622222 },
  '银川': { lng: 106.230909, lat: 38.487194 },
  '银川站': { lng: 106.218611, lat: 38.491944 },
  '乌鲁木齐': { lng: 87.616824, lat: 43.825377 },
  '乌鲁木齐南': { lng: 87.604444, lat: 43.768333 },
  '吐鲁番北': { lng: 89.174444, lat: 43.075278 },
  // 其他地级市
  '保定': { lng: 115.464556, lat: 38.873891 },
  '唐山': { lng: 118.180194, lat: 39.630601 },
  '秦皇岛': { lng: 119.600492, lat: 39.935385 },
  '邯郸': { lng: 114.539084, lat: 36.630291 },
  '沧州': { lng: 116.838667, lat: 38.303663 },
  '廊坊': { lng: 116.683752, lat: 39.538047 },
  '衡水': { lng: 115.665817, lat: 37.735617 },
  '邢台': { lng: 114.504844, lat: 37.070589 },
  '张家口': { lng: 114.887543, lat: 40.824418 },
  '承德': { lng: 117.939152, lat: 40.976204 },
  '运城': { lng: 111.003857, lat: 35.022852 },
  '临汾': { lng: 111.517976, lat: 36.084145 },
  '晋中': { lng: 112.752898, lat: 37.687431 },
  '长治': { lng: 113.116291, lat: 36.195386 },
  '晋城': { lng: 112.851273, lat: 35.490498 },
  '朔州': { lng: 112.432648, lat: 39.331531 },
  '忻州': { lng: 112.733671, lat: 38.416663 },
  '吕梁': { lng: 111.144266, lat: 37.517717 },
  '阳泉': { lng: 113.577812, lat: 37.855971 },
  '包头': { lng: 109.840345, lat: 40.658061 },
  '赤峰': { lng: 118.889106, lat: 42.252303 },
  '通辽': { lng: 122.243825, lat: 43.652490 },
  '鄂尔多斯': { lng: 109.990608, lat: 39.817553 },
  '鞍山': { lng: 122.994252, lat: 41.108648 },
  '抚顺': { lng: 123.957208, lat: 41.880872 },
  '锦州': { lng: 121.127011, lat: 41.095567 },
  '营口': { lng: 122.235418, lat: 40.667499 },
  '盘锦': { lng: 122.069676, lat: 41.124272 },
  '丹东': { lng: 124.354414, lat: 40.000534 },
  '葫芦岛': { lng: 120.836549, lat: 40.711861 },
  '本溪': { lng: 123.766747, lat: 41.294094 },
  '阜新': { lng: 121.648309, lat: 42.011796 },
  '辽阳': { lng: 123.172085, lat: 41.273542 },
  '铁岭': { lng: 123.844286, lat: 42.286219 },
  '朝阳': { lng: 120.451556, lat: 41.568814 },
  '通化': { lng: 125.939697, lat: 41.727697 },
  '四平': { lng: 124.350517, lat: 43.166488 },
  '松原': { lng: 124.823805, lat: 45.141348 },
  '白城': { lng: 122.841085, lat: 45.619536 },
  '延吉': { lng: 129.509736, lat: 42.891253 },
  '牡丹江': { lng: 129.633368, lat: 44.551810 },
  '佳木斯': { lng: 130.317768, lat: 46.799557 },
  '大庆': { lng: 125.103775, lat: 46.587525 },
  '齐齐哈尔': { lng: 123.917375, lat: 47.354305 },
  '绍兴': { lng: 120.580232, lat: 30.029828 },
  '嘉兴': { lng: 120.755393, lat: 30.746138 },
  '湖州': { lng: 120.094526, lat: 30.895444 },
  '金华': { lng: 119.647091, lat: 29.078469 },
  '衢州': { lng: 118.875842, lat: 28.941464 },
  '台州': { lng: 121.428641, lat: 28.655888 },
  '丽水': { lng: 119.922896, lat: 28.451696 },
  '舟山': { lng: 122.107053, lat: 30.016103 },
  '义乌': { lng: 120.075058, lat: 29.306841 },
  '台州西': { lng: 121.408056, lat: 28.644444 },
  '绍兴北': { lng: 120.601944, lat: 30.085556 },
  '湖州南': { lng: 120.103611, lat: 30.852222 },
  '扬州': { lng: 119.412966, lat: 32.394406 },
  '盐城': { lng: 120.163267, lat: 33.347770 },
  '南通': { lng: 120.864710, lat: 32.016206 },
  '连云港': { lng: 119.221611, lat: 34.596819 },
  '淮安': { lng: 119.021282, lat: 33.594937 },
  '宿迁': { lng: 118.275398, lat: 33.963103 },
  '泰州': { lng: 119.922922, lat: 32.455312 },
  '盐城大丰': { lng: 120.445278, lat: 33.200278 },
  '淮南': { lng: 117.018706, lat: 32.647574 },
  '马鞍山': { lng: 118.508019, lat: 31.689627 },
  '淮北': { lng: 116.794486, lat: 33.970841 },
  '铜陵': { lng: 117.812478, lat: 30.944538 },
  '安庆': { lng: 117.063754, lat: 30.543492 },
  '黄山': { lng: 118.337665, lat: 29.714689 },
  '阜阳': { lng: 115.814205, lat: 32.890124 },
  '亳州': { lng: 115.782709, lat: 33.869339 },
  '宿州': { lng: 116.964355, lat: 33.646252 },
  '六安': { lng: 116.507665, lat: 31.752886 },
  '滁州': { lng: 118.316624, lat: 32.303018 },
  '池州': { lng: 117.491566, lat: 30.664790 },
  '宣城': { lng: 118.758816, lat: 30.940718 },
  '九江': { lng: 116.001779, lat: 29.705018 },
  '赣州': { lng: 114.935029, lat: 25.831294 },
  '吉安': { lng: 114.986336, lat: 27.111699 },
  '宜春': { lng: 114.391092, lat: 27.804345 },
  '抚州': { lng: 116.358176, lat: 27.948205 },
  '上饶': { lng: 117.943468, lat: 28.454822 },
  '景德镇': { lng: 117.178524, lat: 29.268702 },
  '萍乡': { lng: 113.854184, lat: 27.622738 },
  '新余': { lng: 114.917337, lat: 27.817554 },
  '鹰潭': { lng: 117.069393, lat: 28.260197 },
  '莆田': { lng: 119.007777, lat: 25.431012 },
  '泉州': { lng: 118.589421, lat: 24.908853 },
  '漳州': { lng: 117.661801, lat: 24.510897 },
  '龙岩': { lng: 117.017417, lat: 25.075513 },
  '三明': { lng: 117.638974, lat: 26.263710 },
  '南平': { lng: 118.178458, lat: 26.643559 },
  '宁德': { lng: 119.527925, lat: 26.665617 },
  '泉州站': { lng: 118.609444, lat: 24.876389 },
  '漳州站': { lng: 117.728611, lat: 24.498611 },
  '淄博': { lng: 118.054827, lat: 36.813149 },
  '潍坊': { lng: 119.107078, lat: 36.709250 },
  '济宁': { lng: 116.587099, lat: 35.415393 },
  '临沂': { lng: 118.354465, lat: 35.104749 },
  '德州': { lng: 116.357464, lat: 37.434093 },
  '聊城': { lng: 115.985529, lat: 36.455763 },
  '滨州': { lng: 117.968288, lat: 37.406118 },
  '菏泽': { lng: 115.480487, lat: 35.234038 },
  '泰安': { lng: 117.089349, lat: 36.199278 },
  '威海': { lng: 122.120422, lat: 37.513485 },
  '日照': { lng: 119.526962, lat: 35.382615 },
  '东营': { lng: 118.674767, lat: 37.433867 },
  '枣庄': { lng: 117.557890, lat: 34.855467 },
  '莱芜': { lng: 117.677736, lat: 36.213843 },
  '开封': { lng: 114.341587, lat: 34.797369 },
  '新乡': { lng: 113.883546, lat: 35.302465 },
  '安阳': { lng: 114.392359, lat: 36.097500 },
  '焦作': { lng: 113.241823, lat: 35.215189 },
  '许昌': { lng: 113.852333, lat: 34.035741 },
  '平顶山': { lng: 113.192337, lat: 33.766169 },
  '信阳': { lng: 114.091343, lat: 32.146949 },
  '南阳': { lng: 112.528321, lat: 32.990833 },
  '商丘': { lng: 115.656237, lat: 34.414171 },
  '周口': { lng: 114.649717, lat: 33.620748 },
  '驻马店': { lng: 114.022765, lat: 32.980021 },
  '濮阳': { lng: 115.029215, lat: 35.762105 },
  '三门峡': { lng: 111.200209, lat: 34.773367 },
  '漯河': { lng: 114.026598, lat: 33.575829 },
  '宜昌': { lng: 111.290843, lat: 30.702336 },
  '襄阳': { lng: 112.144166, lat: 32.049405 },
  '荆州': { lng: 112.238731, lat: 30.326786 },
  '黄石': { lng: 115.038520, lat: 30.199535 },
  '十堰': { lng: 109.741038, lat: 32.629541 },
  '荆门': { lng: 112.199249, lat: 31.035423 },
  '孝感': { lng: 113.926722, lat: 30.926407 },
  '黄冈': { lng: 114.872446, lat: 30.453905 },
  '咸宁': { lng: 114.322374, lat: 29.841343 },
  '随州': { lng: 113.382616, lat: 31.690129 },
  '恩施': { lng: 109.488172, lat: 30.272167 },
  '株洲': { lng: 113.133875, lat: 27.827445 },
  '湘潭': { lng: 112.944223, lat: 27.829745 },
  '衡阳': { lng: 112.607393, lat: 26.900358 },
  '常德': { lng: 111.691347, lat: 29.040623 },
  '益阳': { lng: 112.355276, lat: 28.553860 },
  '郴州': { lng: 113.014718, lat: 25.770508 },
  '永州': { lng: 111.612227, lat: 26.420892 },
  '怀化': { lng: 110.040849, lat: 27.550055 },
  '娄底': { lng: 112.008430, lat: 27.728180 },
  '邵阳': { lng: 111.469318, lat: 27.237831 },
  '张家界': { lng: 110.479191, lat: 29.117096 },
  '中山': { lng: 113.392781, lat: 22.517646 },
  '江门': { lng: 113.082366, lat: 22.579018 },
  '肇庆': { lng: 112.465881, lat: 23.046913 },
  '清远': { lng: 113.051026, lat: 23.685022 },
  '韶关': { lng: 113.591595, lat: 24.801422 },
  '河源': { lng: 114.697802, lat: 23.746213 },
  '梅州': { lng: 116.117582, lat: 24.299187 },
  '潮州': { lng: 116.632472, lat: 23.661701 },
  '揭阳': { lng: 116.372939, lat: 23.549708 },
  '汕头': { lng: 116.682249, lat: 23.353514 },
  '汕尾': { lng: 115.375931, lat: 22.786836 },
  '阳江': { lng: 111.982123, lat: 21.857958 },
  '茂名': { lng: 110.919229, lat: 21.663023 },
  '湛江': { lng: 110.358220, lat: 21.270288 },
  '云浮': { lng: 112.044405, lat: 22.929835 },
  '惠州': { lng: 114.412899, lat: 23.079538 },
  '梧州': { lng: 111.279115, lat: 23.476962 },
  '北海': { lng: 109.119254, lat: 21.473340 },
  '防城港': { lng: 108.346330, lat: 21.614520 },
  '钦州': { lng: 108.654357, lat: 21.967292 },
  '贵港': { lng: 109.602150, lat: 23.093623 },
  '玉林': { lng: 110.154756, lat: 22.631359 },
  '百色': { lng: 106.616285, lat: 23.897712 },
  '贺州': { lng: 111.552597, lat: 24.414141 },
  '河池': { lng: 108.062105, lat: 24.692631 },
  '来宾': { lng: 109.221465, lat: 23.750306 },
  '崇左': { lng: 107.353926, lat: 22.404108 },
  '三亚站': { lng: 109.509444, lat: 18.252778 },
  '东方': { lng: 108.653669, lat: 19.095320 },
  '万宁': { lng: 110.389526, lat: 18.795247 },
  '陵水': { lng: 110.037636, lat: 18.505064 },
  '琼海': { lng: 110.474708, lat: 19.258120 },
  '文昌': { lng: 110.753811, lat: 19.543522 },
  '自贡': { lng: 104.773446, lat: 29.352465 },
  '攀枝花': { lng: 101.718837, lat: 26.582347 },
  '泸州': { lng: 105.443548, lat: 28.889138 },
  '德阳': { lng: 104.398051, lat: 31.127992 },
  '绵阳': { lng: 104.679620, lat: 31.467750 },
  '广元': { lng: 105.829557, lat: 32.435435 },
  '遂宁': { lng: 105.592856, lat: 30.532847 },
  '内江': { lng: 105.058433, lat: 29.580157 },
  '乐山': { lng: 103.771838, lat: 29.552690 },
  '资阳': { lng: 104.627836, lat: 30.122458 },
  '宜宾': { lng: 104.630825, lat: 28.760894 },
  '南充': { lng: 106.110712, lat: 30.837414 },
  '达州': { lng: 107.468056, lat: 31.209571 },
  '雅安': { lng: 103.001033, lat: 29.980479 },
  '阿坝': { lng: 102.221489, lat: 31.899793 },
  '甘孜': { lng: 101.962811, lat: 30.049520 },
  '凉山': { lng: 102.264023, lat: 27.892841 },
  '广安': { lng: 106.633321, lat: 30.474140 },
  '巴中': { lng: 106.747477, lat: 31.869193 },
  '眉山': { lng: 103.848698, lat: 30.075861 },
  '遵义': { lng: 106.927389, lat: 27.725654 },
  '六盘水': { lng: 104.833549, lat: 26.594310 },
  '安顺': { lng: 105.946200, lat: 26.253660 },
  '毕节': { lng: 105.284737, lat: 27.301880 },
  '铜仁': { lng: 109.189598, lat: 27.730740 },
  '曲靖': { lng: 103.797851, lat: 25.501557 },
  '玉溪': { lng: 102.545068, lat: 24.351818 },
  '保山': { lng: 99.167133, lat: 25.111802 },
  '昭通': { lng: 103.717216, lat: 27.338257 },
  '丽江站': { lng: 100.231944, lat: 26.871111 },
  '普洱': { lng: 100.966397, lat: 22.825220 },
  '临沧': { lng: 100.092689, lat: 23.886565 },
  '德宏': { lng: 98.584481, lat: 24.436422 },
  '怒江': { lng: 98.854394, lat: 25.850944 },
  '迪庆': { lng: 99.706453, lat: 27.819083 },
  '楚雄': { lng: 101.528012, lat: 25.045032 },
  '红河': { lng: 103.375595, lat: 23.363130 },
  '文山': { lng: 104.244728, lat: 23.369400 },
  '西双版纳': { lng: 100.797941, lat: 22.007240 },
  '咸阳': { lng: 108.708991, lat: 34.329605 },
  '渭南': { lng: 109.502882, lat: 34.499381 },
  '铜川': { lng: 109.075636, lat: 35.085844 },
  '延安': { lng: 109.489727, lat: 36.585455 },
  '榆林': { lng: 109.734573, lat: 38.285390 },
  '安康': { lng: 109.029273, lat: 32.690374 },
  '商洛': { lng: 109.940563, lat: 33.870623 },
  '杨陵': { lng: 108.073056, lat: 34.271111 },
  '渭南北': { lng: 109.525278, lat: 34.513333 },
  '宝鸡南': { lng: 107.165556, lat: 34.336111 },
  '咸阳秦都': { lng: 108.685556, lat: 34.338333 },
  '嘉峪关': { lng: 98.277304, lat: 39.786529 },
  '金昌': { lng: 102.187888, lat: 38.514238 },
  '白银': { lng: 104.138937, lat: 36.544744 },
  '武威': { lng: 102.638544, lat: 37.928318 },
  '张掖': { lng: 100.449810, lat: 38.925875 },
  '平凉': { lng: 106.665240, lat: 35.542829 },
  '酒泉': { lng: 98.494023, lat: 39.732085 },
  '庆阳': { lng: 107.638022, lat: 35.734219 },
  '定西': { lng: 104.626274, lat: 35.580662 },
  '陇南': { lng: 104.921770, lat: 33.400672 },
  '临夏': { lng: 103.210538, lat: 35.601352 },
  '甘南': { lng: 102.910937, lat: 35.000449 },
  '海东': { lng: 102.103710, lat: 36.502730 },
  '海北': { lng: 100.901023, lat: 36.954413 },
  '黄南': { lng: 102.015247, lat: 35.517744 },
  '海南州': { lng: 100.619103, lat: 36.286409 },
  '果洛': { lng: 100.244688, lat: 34.480417 },
  '玉树': { lng: 97.008786, lat: 33.004249 },
  '海西': { lng: 97.370785, lat: 37.374528 },
  '石嘴山': { lng: 106.376173, lat: 38.984389 },
  '吴忠': { lng: 106.199067, lat: 37.986165 },
  '固原': { lng: 106.285241, lat: 36.004561 },
  '中卫': { lng: 105.196517, lat: 37.514918 },
  '克拉玛依': { lng: 84.873937, lat: 45.595886 },
  '吐鲁番': { lng: 89.189643, lat: 42.951018 },
  '哈密': { lng: 93.513454, lat: 42.833248 },
  '昌吉': { lng: 87.308225, lat: 44.014577 },
  '博乐': { lng: 82.074856, lat: 44.853441 },
  '库尔勒': { lng: 86.151004, lat: 41.764203 },
  '阿克苏': { lng: 80.260604, lat: 41.168677 },
  '阿图什': { lng: 76.168394, lat: 39.716120 },
  '喀什': { lng: 75.989755, lat: 39.467744 },
  '和田': { lng: 79.922413, lat: 37.112198 },
  '伊宁': { lng: 81.329372, lat: 43.912935 },
  '塔城': { lng: 82.985676, lat: 46.745361 },
  '阿勒泰': { lng: 88.139633, lat: 47.848393 },
  '石河子': { lng: 86.041075, lat: 44.302271 },
  '阿拉尔': { lng: 81.285884, lat: 40.541914 },
  '图木舒克': { lng: 79.068992, lat: 39.867254 },
  '五家渠': { lng: 87.543025, lat: 44.167410 },
  '北屯': { lng: 87.824275, lat: 47.353323 },
  '铁门关': { lng: 85.676175, lat: 41.827158 },
  '双河': { lng: 82.353456, lat: 44.840080 },
  '可克达拉': { lng: 80.636011, lat: 43.944959 },
  '昆玉': { lng: 79.286972, lat: 37.209421 },
  '胡杨河': { lng: 84.827562, lat: 44.692886 },
  '新星': { lng: 94.895260, lat: 42.404640 }
}

function getCoord(name) {
  if (!name) return null
  var cleanName = name.replace(/站$/, '').trim()
  return cityCoords[cleanName] || cityCoords[name] || null
}

var cityNameCache = null

function buildCityNameCache() {
  if (cityNameCache) return cityNameCache
  cityNameCache = {}
  for (var name in cityCoords) {
    if (name.indexOf('站') >= 0) continue
    if (name.indexOf('火车站') >= 0) continue
    if (/[东南西北]$/.test(name) && name.length > 2) {
      var baseName = name.replace(/[东南西北]$/, '')
      if (cityCoords[baseName]) continue
    }
    if (name === '丰台' || name === '龙门' || name === '福田' || name === '杨陵' || name === '秦都') continue
    cityNameCache[name] = true
  }
  return cityNameCache
}

function isCityName(name) {
  if (!name) return false
  var cache = buildCityNameCache()
  return cache[name] === true
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) ||
      !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return 0
  }
  var R = 6371
  var dLat = (lat2 - lat1) * Math.PI / 180
  var dLng = (lng2 - lng1) * Math.PI / 180
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

Component({
  properties: {
    trip: {
      type: Object,
      value: null,
      observer: function(newVal) {
        if (newVal) {
          var lockedStatuses = ['booked', 'waiting', 'picking', 'onway', 'responded', 'completed']
          var isLocked = newVal.status && lockedStatuses.indexOf(newVal.status) >= 0
          this.setData({
            hasTrip: true,
            visible: true,
            expanded: !this.data.defaultCollapsed,
            isLocked: isLocked
          })
          this.checkUrgentTrip()
          this.buildProgressData(newVal)
        } else {
          this.setData({
            hasTrip: false,
            visible: false
          })
        }
      }
    },
    showExitReminder: {
      type: Boolean,
      value: true
    },
    defaultCollapsed: {
      type: Boolean,
      value: true
    }
  },

  data: {
    visible: false,
    expanded: false,
    hasTrip: false,
    isLocked: false,
    statusBarHeight: 0,
    safeAreaBottom: 0,
    deviceType: 'normal',
    isUrgent: false,
    showExitModal: false,
    segments: [],
    currentSegment: -1,
    currentStepIndex: -1,
    currentStepText: '',
    currentLocation: '',
    lastAnnouncedNode: -1,
    processedTrip: null,
    originalTrip: null,
    currentLat: null,
    currentLng: null,
    firstSegmentType: 'taxi',
    monitorTimer: null,
    lastMoveTime: null,
    lastLat: null,
    lastLng: null,
    stationEnterTime: null,
    alertedEvents: {},
    isTtsPlaying: false,
    isTtsAuto: false
  },

  lifetimes: {
    attached: function() {
      this.getStatusBarHeight()
    },
    detached: function() {
      this.data._destroyed = true
      if (this._progressTimer) {
        clearInterval(this._progressTimer)
        this._progressTimer = null
      }
      this.stopMonitor()
    }
  },

  pageLifetimes: {
    show: function() {
      if (this.data.hasTrip) {
        this.setData({
          visible: true,
          expanded: !this.data.defaultCollapsed
        })
        this.checkUrgentTrip()
        if (this.data.processedTrip && !this._monitorTimer) {
          this.startMonitor()
        }
      }
    },
    hide: function() {
      if (this.data.hasTrip && this.data.showExitReminder) {
        this.triggerExitReminder()
      }
      this.stopMonitor()
    }
  },

  methods: {
    getStatusBarHeight: function() {
      var systemInfo = responsive.initSystemInfo()
      var topOffset = systemInfo.safeAreaTop + 125
      this.setData({
        statusBarHeight: topOffset,
        safeAreaBottom: systemInfo.safeAreaBottom,
        deviceType: systemInfo.deviceType
      })
    },

    buildProgressData: function(trip) {
      if (!trip || !trip.steps || !trip.steps.length) return
      var processedSteps = this.processSteps(trip.steps)
      var processedTrip = Object.assign({}, trip, { steps: processedSteps })
      this.setData({ 
        processedTrip: processedTrip,
        originalTrip: trip,
        firstSegmentType: 'taxi',
        alertedEvents: {},
        stationEnterTime: null,
        lastMoveTime: null,
        lastLat: null,
        lastLng: null,
        lastAnnouncedNode: -1
      })
      // 首次构建时，根据当前时间初始化 lastAnnouncedNode，不播报已过去的节点
      this._skipInitialAnnounce = true
      this.updateProgress(processedTrip)
      this._skipInitialAnnounce = false
      this.startProgressTimer(processedTrip)
      this.startMonitor()
      this.locateSelf()
    },

    rebuildTripWithLocation: function(locationLat, locationLng, locationName) {
      var originalTrip = this.data.originalTrip
      if (!originalTrip || !originalTrip.steps || !originalTrip.steps.length) return
      
      var firstStep = originalTrip.steps[0]
      if (!firstStep) return
      
      var firstStationName = ''
      if (firstStep.location) {
        var parts = firstStep.location.split('→')
        firstStationName = parts[parts.length - 1].trim()
      }
      if (!firstStationName) {
        firstStationName = firstStep.name || '车站'
      }
      
      var stationCoord = getCoord(firstStationName)
      if (!stationCoord) {
        var cleanName = firstStationName.replace(/站$/, '')
        stationCoord = getCoord(cleanName + '站') || getCoord(cleanName)
      }
      
      var distKm = 0
      if (stationCoord) {
        distKm = haversineDistance(locationLat, locationLng, stationCoord.lat, stationCoord.lng)
      }
      
      var firstSegmentType = this.data.firstSegmentType || 'taxi'
      var firstSegment = this.buildFirstSegment(firstSegmentType, locationName, firstStationName, distKm, firstStep.time)
      
      var restSteps = []
      var firstStepIsStationTrip = firstStep.type === 'taxi' || firstStep.type === 'bus' || firstStep.type === 'subway'
      if (firstStepIsStationTrip) {
        restSteps = originalTrip.steps.slice(1)
      } else {
        restSteps = originalTrip.steps
      }
      
      var newSteps = [firstSegment].concat(restSteps)
      var processedSteps = this.processSteps(newSteps)
      var newFrom = locationName || originalTrip.from
      var processedTrip = Object.assign({}, originalTrip, { steps: processedSteps, from: newFrom })
      
      this.setData({ processedTrip: processedTrip })
      this.updateProgress(processedTrip)
    },

    _randomPlate: function(prefix) {
      prefix = prefix || '晋A'
      var letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
      var digits = '0123456789'
      var chars = []
      for (var i = 0; i < 5; i++) {
        if (Math.random() < 0.25) {
          chars.push(letters.charAt(Math.floor(Math.random() * letters.length)))
        } else {
          chars.push(digits.charAt(Math.floor(Math.random() * digits.length)))
        }
      }
      return prefix + '·' + chars.join('')
    },

    buildFirstSegment: function(type, fromName, toStation, distKm, departTime) {
      var dist = Math.max(1, Math.round(distKm))
      var price = 0
      var duration = 0
      var name = ''
      var plate = ''
      
      if (type === 'taxi') {
        price = dist * 3 + 10
        duration = dist * 3 + 10
        name = '打车到' + toStation
        plate = this._randomPlate('晋A')
      } else {
        price = 2
        duration = dist * 5 + 15
        name = '公交到' + toStation
        plate = '约' + duration + '分钟'
      }
      
      var departMinutes = 0
      if (departTime) {
        var timeParts = departTime.match(/(\d{1,2}):(\d{2})/)
        if (timeParts) {
          departMinutes = Number(timeParts[1]) * 60 + Number(timeParts[2])
        }
      }
      
      var startMinutes = departMinutes - duration
      if (startMinutes < 0) startMinutes = 0
      var startHour = Math.floor(startMinutes / 60)
      var startMin = startMinutes % 60
      var startTimeStr = (startHour < 10 ? '0' : '') + startHour + ':' + (startMin < 10 ? '0' : '') + startMin
      
      return {
        type: type,
        name: name,
        time: startTimeStr,
        status: 'pending',
        plate: plate,
        location: fromName + ' → ' + toStation,
        isFirstSegment: true
      }
    },

    switchFirstSegment: function(e) {
      var type = e.currentTarget.dataset.type
      if (type === this.data.firstSegmentType) return
      
      this.setData({ firstSegmentType: type })
      
      if (this.data.currentLat && this.data.currentLng) {
        var locationName = this.data.currentLocation || '当前位置'
        this.rebuildTripWithLocation(this.data.currentLat, this.data.currentLng, locationName)
      }
    },

    processSteps: function(steps) {
      var typeNames = { taxi: '打车', bus: '公交', train: '火车', subway: '地铁', walk: '步行' }
      var result = []
      for (var i = 0; i < steps.length; i++) {
        var step = Object.assign({}, steps[i])
        step.typeName = typeNames[step.type] || '出行'
        if (step.location) {
          var parts = step.location.split('→')
          step.endLocation = parts[parts.length - 1].trim()
        } else {
          step.endLocation = ''
        }
        if (step.plate) {
          step.subText = step.plate
        } else if (step.platform) {
          step.subText = step.platform
        } else {
          step.subText = step.name || ''
        }
        result.push(step)
      }
      return result
    },

    updateProgress: function(trip) {
      if (!trip || !trip.steps || !trip.steps.length) return

      var now = new Date()
      var nowMinutes = now.getHours() * 60 + now.getMinutes()
      var steps = trip.steps
      var totalSteps = steps.length
      var completedSteps = 0
      var currentStepIndex = -1
      var currentStepText = ''

      for (var i = 0; i < totalSteps; i++) {
        var step = steps[i]
        if (step.time) {
          var timeParts = step.time.match(/(\d{1,2}):(\d{2})/)
          if (timeParts) {
            var stepMinutes = Number(timeParts[1]) * 60 + Number(timeParts[2])
            if (nowMinutes >= stepMinutes) {
              completedSteps = i + 1
              currentStepIndex = i
            } else if (currentStepIndex < 0) {
              currentStepIndex = i
            }
          }
        }
      }

      if (currentStepIndex >= 0 && currentStepIndex < totalSteps) {
        var step = steps[currentStepIndex]
        var typeNames = { taxi: '打车', bus: '公交', train: '火车', subway: '地铁', walk: '步行' }
        var typeName = typeNames[step.type] || '出行'
        if (completedSteps > currentStepIndex) {
          currentStepText = '已完成：' + typeName + ' · ' + step.name
        } else {
          currentStepText = '当前：' + typeName + ' · ' + step.name + '（' + step.time + '）'
        }
      }

      this.setData({
        currentStepIndex: currentStepIndex,
        currentStepText: currentStepText
      })

      if (completedSteps !== this.data.lastAnnouncedNode) {
        if (this._skipInitialAnnounce) {
          // 首次构建时只更新标记，不播报已过去的节点
          this.setData({ lastAnnouncedNode: completedSteps })
        } else {
          this.announceNode(completedSteps, trip)
          this.setData({ lastAnnouncedNode: completedSteps })
        }
      }
    },

    announceNode: function(completedIdx, trip) {
      var steps = trip.steps || []
      var message = ''

      if (completedIdx === 0) {
        message = '从' + trip.from + '出发，祝您旅途愉快'
      } else if (completedIdx <= steps.length) {
        var step = steps[completedIdx - 1]
        if (step && step.location) {
          var parts = step.location.split('→')
          var dest = parts[parts.length - 1].trim()
          var typeNames = { taxi: '打车', bus: '公交', train: '火车', subway: '地铁', walk: '步行' }
          
          if (completedIdx === steps.length) {
            message = '已到达目的地' + dest + '，行程结束'
          } else {
            var nextStep = steps[completedIdx]
            var nextType = nextStep ? (typeNames[nextStep.type] || '下一段') : '下一段'
            message = '已到达' + dest + '，请换乘' + nextType
          }
        }
      }

      if (!message) return

      if (wx.vibrateShort) wx.vibrateShort()
      if (wx.showToast) {
        wx.showToast({
          title: message,
          icon: 'none',
          duration: 3000
        })
      }
      
      if (this.data.isTtsAuto) {
        var autoPlan = this._buildPlanFromTrip(trip)
        ttsService.announceTrip(autoPlan)
      }
    },
    
    toggleTtsPlay: function() {
      var trip = this.data.processedTrip
      if (!trip) {
        wx.showToast({ title: '暂无行程', icon: 'none' })
        return
      }
      
      if (this.data.isTtsPlaying) {
        ttsService.stopPlay()
        this.setData({ isTtsPlaying: false })
        wx.showToast({ title: '已停止播报', icon: 'none' })
      } else {
        var plan = this._buildPlanFromTrip(trip)
        ttsService.announceTrip(plan)
        this.setData({ isTtsPlaying: true })
        wx.showToast({ title: '语音播报中', icon: 'none', duration: 1500 })
      }
    },
    
    toggleTtsAuto: function() {
      var newAuto = !this.data.isTtsAuto
      this.setData({ isTtsAuto: newAuto })
      
      if (newAuto) {
        wx.showToast({ title: '开启行进播报', icon: 'none', duration: 1500 })
        var trip = this.data.processedTrip
        if (trip) {
          var plan = this._buildPlanFromTrip(trip)
          ttsService.announceTrip(plan)
          this.setData({ isTtsPlaying: true })
        }
      } else {
        ttsService.stopPlay()
        this.setData({ isTtsPlaying: false })
        wx.showToast({ title: '关闭行进播报', icon: 'none', duration: 1500 })
      }
    },
    
    _buildPlanFromTrip: function(trip) {
      if (!trip) return {}
      var self = this
      var segments = []

      if (trip.steps) {
        trip.steps.forEach(function(step) {
          if (step.type === 'train') {
            var locParts = (step.location || '').split('→')
            var fromStation = locParts[0] ? locParts[0].trim() : ''
            var toStation = locParts[1] ? locParts[1].trim() : ''
            var trainType = '火车'
            if (trip.name && trip.name.indexOf('G') === 0) trainType = '高铁'
            else if (trip.name && trip.name.indexOf('D') === 0) trainType = '动车'
            else if (trip.name && trip.name.indexOf('C') === 0) trainType = '城际'
            segments.push({
              type: 'train',
              train: {
                trainNo: trip.name || step.name || '',
                type: trainType,
                fromStation: fromStation,
                toStation: toStation,
                startTime: trip.departureTime || step.time || '',
                endTime: trip.arrivalTime || '',
                minPrice: trip.price || 0,
                seat: trip.seat || step.seat || ''
              }
            })
          } else if (step.type === 'taxi' || step.type === 'bus' || step.type === 'subway') {
            var seg = { type: 'local', location: step.location || '' }
            var transport = { duration: '', cost: '' }
            if (step.type === 'taxi') {
              transport.desc = step.plate ? '车牌' + step.plate : ''
              seg.taxi = transport
            } else if (step.type === 'bus') {
              seg.bus = transport
            } else {
              seg.subway = transport
            }
            segments.push(seg)
          } else if (step.type === 'walk') {
            segments.push({ type: 'walk', distance: step.distance || '500' })
          }
        })
      }

      return {
        from: trip.from || '',
        to: trip.to || '',
        totalCost: trip.price || trip.totalCost || 0,
        totalDuration: trip.totalDuration || '',
        segments: segments
      }
    },

    locateSelf: function() {
      var that = this
      var currentLoc = this.data.currentLocation || ''
      
      if (currentLoc.indexOf('未授权') >= 0) {
        if (wx.openSetting) {
          wx.openSetting({
            success: function(res) {
              if (res.authSetting['scope.userLocation']) {
                that.doLocate()
              } else {
                wx.showToast({
                  title: '请开启位置权限',
                  icon: 'none'
                })
              }
            }
          })
        }
        return
      }
      this.doLocate()
    },

    doLocate: function() {
      var that = this
      this.setData({ currentLocation: '定位中...' })

      if (wx.getLocation) {
        wx.getLocation({
          type: 'gcj02',
          isHighAccuracy: true,
          highAccuracyExpireTime: 4000,
          success: function(res) {
            var lat = res.latitude
            var lng = res.longitude

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              that.setData({ currentLocation: '定位失败' })
              return
            }

            reverseGeocode(lng + ',' + lat).then(function(result) {
              var locationName = ''
              if (result.success && result.data && result.data.address) {
                locationName = result.data.address
              } else {
                locationName = that.findNearestCity(lat, lng) || '已定位'
              }

              that.setData({ 
                currentLocation: locationName,
                currentLat: lat,
                currentLng: lng
              })
              try { wx.setStorageSync('last_location', locationName) } catch (e) {}
              try { wx.setStorageSync('last_lat', lat) } catch (e) {}
              try { wx.setStorageSync('last_lng', lng) } catch (e) {}
              if (that.data.originalTrip && that.data.originalTrip.steps) {
                that.rebuildTripWithLocation(lat, lng, locationName)
              }
            }).catch(function() {
              var nearest = that.findNearestCity(lat, lng)
              that.setData({ 
                currentLocation: nearest || '已定位',
                currentLat: lat,
                currentLng: lng
              })
              try { wx.setStorageSync('last_location', nearest || '已定位') } catch (e) {}
              try { wx.setStorageSync('last_lat', lat) } catch (e) {}
              try { wx.setStorageSync('last_lng', lng) } catch (e) {}
              if (that.data.originalTrip && that.data.originalTrip.steps) {
                that.rebuildTripWithLocation(lat, lng, nearest)
              }
            })
          },
          fail: function() {
            if (wx.getSetting) {
              wx.getSetting({
                success: function(res) {
                  if (!res.authSetting['scope.userLocation']) {
                    that.setData({ currentLocation: '未授权定位，点击授权' })
                  } else {
                    that.setData({ currentLocation: '定位失败，点击重试' })
                  }
                },
                fail: function() {
                  that.setData({ currentLocation: '定位失败，点击重试' })
                }
              })
            } else {
              that.setData({ currentLocation: '定位失败，点击重试' })
            }
          }
        })
      } else {
        this.setData({ currentLocation: '不支持定位' })
      }
    },

    findNearestCity: function(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return '位置未知'
      }
      var minCityDist = 999999
      var nearestCityName = ''
      var minStationDist = 999999
      var nearestStationName = ''

      for (var name in cityCoords) {
        var coord = cityCoords[name]
        var dist = haversineDistance(lat, lng, coord.lat, coord.lng)
        if (isCityName(name)) {
          if (dist < minCityDist) {
            minCityDist = dist
            nearestCityName = name
          }
        } else {
          if (dist < minStationDist) {
            minStationDist = dist
            nearestStationName = name
          }
        }
      }

      if (minCityDist < 80) {
        if (minCityDist < 5) {
          return nearestCityName + '市内'
        } else {
          return nearestCityName + '（约' + Math.round(minCityDist) + '公里）'
        }
      }

      if (minStationDist < 30) {
        return nearestStationName + '站（约' + Math.round(minStationDist) + '公里）'
      }

      return '附近（' + lat.toFixed(4) + ',' + lng.toFixed(4) + '）'
    },

    startProgressTimer: function(trip) {
      var that = this
      if (this._progressTimer) clearInterval(this._progressTimer)
      this._progressTimer = setInterval(function() {
        if (!that || that.data._destroyed) {
          clearInterval(that._progressTimer)
          that._progressTimer = null
          return
        }
        that.updateProgress(trip)
      }, 30000)
    },

    startMonitor: function() {
      var that = this
      this.stopMonitor()
      this._monitorTimer = setInterval(function() {
        if (!that || that.data._destroyed) {
          clearInterval(that._monitorTimer)
          that._monitorTimer = null
          return
        }
        that.doMonitorCheck()
      }, 60000)
      this.doMonitorCheck()
    },

    stopMonitor: function() {
      if (this._monitorTimer) {
        clearInterval(this._monitorTimer)
        this._monitorTimer = null
      }
    },

    doMonitorCheck: function() {
      var that = this
      var trip = this.data.processedTrip
      if (!trip) return

      if (wx.getLocation) {
        wx.getLocation({
          type: 'gcj02',
          isHighAccuracy: false,
          success: function(res) {
            var lat = res.latitude
            var lng = res.longitude
            that.checkAllAnomalies(lat, lng)
          }
        })
      }
    },

    checkAllAnomalies: function(lat, lng) {
      var trip = this.data.processedTrip
      if (!trip || !trip.steps || !trip.steps.length) return

      var now = new Date()
      var nowMinutes = now.getHours() * 60 + now.getMinutes()
      var alerted = this.data.alertedEvents

      var moveDist = 0
      if (this.data.lastLat && this.data.lastLng) {
        moveDist = haversineDistance(lat, lng, this.data.lastLat, this.data.lastLng)
      }

      if (moveDist > 0.1) {
        this.setData({
          lastMoveTime: now.getTime(),
          lastLat: lat,
          lastLng: lng
        })
      }

      var firstStep = trip.steps[0]
      var firstStepTime = this.parseTime(firstStep.time)
      var timeToFirst = firstStepTime - nowMinutes

      if (timeToFirst > 0 && timeToFirst <= 30 && !alerted['late_to_station']) {
        var firstStationName = firstStep.endLocation || '车站'
        var distToStation = this.calcDistanceToStep(lat, lng, 0)
        if (distToStation > 2) {
          this.recordAnomaly('late_to_station', '可能赶不上车', 
            '距离' + firstStationName + '还有' + Math.round(distToStation) + '公里，离发车只剩' + timeToFirst + '分钟')
          alerted['late_to_station'] = true
        }
      }

      var currentIdx = this.data.currentStepIndex || 0
      var currentStep = trip.steps[currentIdx]
      if (currentStep && currentStep.endLocation) {
        var stationName = currentStep.endLocation
        var distToCurrent = this.calcDistanceToStep(lat, lng, currentIdx)
        if (distToCurrent < 1.5) {
          if (!this.data.stationEnterTime) {
            this.setData({ stationEnterTime: now.getTime() })
          } else {
            var stayMinutes = (now.getTime() - this.data.stationEnterTime) / 60000
            if (stayMinutes > 120 && !alerted['station_stay_long']) {
              this.recordAnomaly('station_stay_long', '在车站停留过久',
                '在' + stationName + '已停留' + Math.round(stayMinutes) + '分钟，可能迷路了')
              alerted['station_stay_long'] = true
            }
          }
        } else {
          if (this.data.stationEnterTime) {
            this.setData({ stationEnterTime: null })
          }
        }
      }

      if (this.data.lastMoveTime) {
        var noMoveMinutes = (now.getTime() - this.data.lastMoveTime) / 60000
        if (noMoveMinutes > 90 && !alerted['no_move_long']) {
          this.recordAnomaly('no_move_long', '长时间未移动',
            '已' + Math.round(noMoveMinutes) + '分钟没有移动，可能需要帮助')
          alerted['no_move_long'] = true
        }
      }

      var lastStep = trip.steps[trip.steps.length - 1]
      if (lastStep && lastStep.time) {
        var arriveTime = this.parseTime(lastStep.time)
        if (arriveTime >= 0 && nowMinutes > arriveTime + 30 && currentIdx < trip.steps.length - 1 && !alerted['should_arrive']) {
          this.recordAnomaly('should_arrive', '应到达未到达',
            '已超时' + (nowMinutes - arriveTime) + '分钟，请联系父母确认情况')
          alerted['should_arrive'] = true
        }
      }

      try {
        var deviceInfo = wx.getDeviceInfo()
        if (deviceInfo.batteryLevel !== undefined && deviceInfo.batteryLevel <= 20 && !alerted['low_battery']) {
          this.recordAnomaly('low_battery', '手机电量低',
            '手机电量仅剩' + deviceInfo.batteryLevel + '%，可能很快关机')
          alerted['low_battery'] = true
        }
      } catch (e) {}

      this.setData({ alertedEvents: alerted })
    },

    parseTime: function(timeStr) {
      if (!timeStr) return -1
      var parts = timeStr.match(/(\d{1,2}):(\d{2})/)
      if (!parts) return -1
      var h = Number(parts[1])
      var m = Number(parts[2])
      if (isNaN(h) || isNaN(m)) return -1
      return h * 60 + m
    },

    calcDistanceToStep: function(lat, lng, stepIdx) {
      var trip = this.data.processedTrip
      if (!trip || !trip.steps || !trip.steps[stepIdx]) return 999
      var step = trip.steps[stepIdx]
      var locName = step.endLocation || step.location
      if (!locName) return 999
      var coord = getCoord(locName)
      if (!coord) return 999
      return haversineDistance(lat, lng, coord.lat, coord.lng)
    },

    recordAnomaly: function(type, title, desc) {
      var now = new Date()
      var timeStr = now.getFullYear() + '-' + 
        ((now.getMonth() + 1) < 10 ? '0' : '') + (now.getMonth() + 1) + '-' +
        (now.getDate() < 10 ? '0' : '') + now.getDate() + ' ' +
        (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' +
        (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()

      var event = {
        id: type + '_' + now.getTime(),
        type: type,
        title: title,
        desc: desc,
        time: timeStr,
        lat: this.data.currentLat,
        lng: this.data.currentLng,
        location: this.data.currentLocation || '未知位置',
        read: false
      }

      var events = wx.getStorageSync('monitor_events') || []
      events.unshift(event)
      if (events.length > 50) events = events.slice(0, 50)
      wx.setStorageSync('monitor_events', events)

      var app = getApp()
      if (app && app.globalData && app.globalData.monitorCallback) {
        app.globalData.monitorCallback(event)
      }

      if (getCurrentPages().length === 0) return
      try {
        wx.showModal({
          title: '⚠️ ' + title,
          content: desc + '\n\n需要联系亲友帮忙吗？',
          confirmText: '联系亲友',
          cancelText: '我没事',
          success: function(res) {
            if (res.confirm) {
              var accounts = (app && app.globalData && app.globalData.assistAccounts) || []
              if (accounts.length > 0) {
                wx.makePhoneCall({
                  phoneNumber: accounts[0].phone,
                  fail: function() {}
                })
              }
            }
          }
        })
      } catch (e) {}
    },

    checkUrgentTrip: function() {
      const trip = this.properties.trip
      if (!trip || !trip.departureTime) return

      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTime = currentHour * 60 + currentMinute

      const parts = trip.departureTime.split(':')
      const depHour = Number(parts[0])
      const depMinute = Number(parts[1])
      const depTime = depHour * 60 + depMinute
      const diff = depTime - currentTime

      this.setData({
        isUrgent: diff > 0 && diff <= 120
      })
    },

    triggerExitReminder: function() {
      const trip = this.properties.trip
      if (!trip) return

      const now = new Date()
      const today = now.toISOString().split('T')[0]
      if (trip.date !== today) return

      const key = 'exit_remind_' + trip.orderId + '_' + today
      if (wx.getStorageSync(key)) return

      wx.setStorageSync(key, true)

      if (getCurrentPages().length === 0) return
      try {
        wx.showModal({
          title: '📋 今日行程提醒',
          content: trip.name + '\n' + trip.from + ' → ' + trip.to + '\n\n出发时间：' + (trip.departureTime || '') + '\n座位号：' + (trip.seat || '请查看详情') + '\n接站车牌：' + (trip.plate || (trip.steps && trip.steps[0] && trip.steps[0].plate) || '请查看详情') + '\n\n请提前做好出行准备！',
          showCancel: true,
          cancelText: '保存卡片',
          confirmText: '我知道了',
          success: (res) => {
            if (!res.confirm) {
              wx.navigateTo({
                url: '/pages/order-detail/order-detail?orderId=' + trip.orderId
              })
            }
          }
        })
      } catch (e) {}
    },

    toggleExpand: function() {
      if (!this.data.hasTrip) return
      this.setData({
        expanded: !this.data.expanded
      })
    },

    goToDetail: function() {
      const trip = this.properties.trip
      if (!trip) return

      var url = '/pages/order-detail/order-detail?orderId=' + (trip.orderId || '')
      wx.navigateTo({
        url: url,
        fail: function(err) {
          console.error('[float-island] navigateTo失败:', err)
          wx.redirectTo({
            url: url,
            fail: function() {
              wx.showToast({ title: '页面打开失败', icon: 'none' })
            }
          })
        }
      })
      this.setData({
        expanded: false
      })
    },

    saveCard: function() {
      const trip = this.properties.trip
      if (!trip) return

      var url = '/pages/order-detail/order-detail?orderId=' + (trip.orderId || '')
      var self = this
      wx.navigateTo({
        url: url,
        fail: function(err) {
          console.error('[float-island] navigateTo失败:', err)
          // 页面栈满时用redirectTo
          wx.redirectTo({
            url: url,
            fail: function(err2) {
              console.error('[float-island] redirectTo也失败:', err2)
              wx.showToast({ title: '页面打开失败', icon: 'none' })
            }
          })
        }
      })
      this.setData({
        expanded: false
      })
    },

    closeIsland: function() {
      this.setData({
        expanded: false
      })
    },

    subscribeReminder: function() {
      const trip = this.properties.trip
      if (!trip) return

      wx.showModal({
        title: '🔔 开启消息提醒',
        content: '订阅后，出发前微信会提醒您，就不怕忘啦！\n\n点击「允许」即可开启提醒',
        showCancel: true,
        cancelText: '不用了',
        confirmText: '去开启',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({
              title: '已开启提醒',
              icon: 'success'
            })
          }
        }
      })
    }
  }
})
