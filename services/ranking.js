// 适老化多准则排序算法模块
// 包含：熵权法+TOPSIS+灵敏度分析+衔接安全验证

var aiService
try { aiService = require('./ai-service.js') } catch (e) { aiService = null }

// 时间字符串解析为分钟数
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

// 维度归一化（Min-Max标准化到0-1）
function normalizeDimension(values) {
  var min = Math.min.apply(null, values)
  var max = Math.max.apply(null, values)
  if (max === min) {
    return values.map(function() { return 1 })
  }
  return values.map(function(v) {
    return (v - min) / (max - min)
  })
}

// 熵权法：从数据中自动提取客观权重
// 原理：某维度数据变异越大 → 熵值越小 → 信息量越多 → 权重越高
function entropyWeightMethod(normalizedMatrix) {
  var n = normalizedMatrix.length
  var m = normalizedMatrix[0].length

  // Step 1: 计算比例 p_ij
  var p = []
  for (var i = 0; i < n; i++) {
    p[i] = []
    for (var j = 0; j < m; j++) {
      var sum = 0
      for (var k = 0; k < n; k++) {
        sum += normalizedMatrix[k][j]
      }
      p[i][j] = sum === 0 ? 0 : normalizedMatrix[i][j] / sum
    }
  }

  // Step 2: 计算熵值 e_j = -k * Σ(p_ij * ln(p_ij))
  var k = 1 / Math.log(n)
  var entropy = []
  for (var j = 0; j < m; j++) {
    var e = 0
    for (var i = 0; i < n; i++) {
      if (p[i][j] > 0) {
        e -= p[i][j] * Math.log(p[i][j])
      }
    }
    entropy.push(e * k)
  }

  // Step 3: 计算冗余度 d_j = 1 - e_j
  var redundancy = entropy.map(function(e) { return 1 - e })

  // Step 4: 归一化得到客观权重
  var sumD = 0
  for (var j = 0; j < m; j++) sumD += redundancy[j]
  return redundancy.map(function(d) { return d / sumD })
}

// 组合权重 = α * 主观权重 + (1-α) * 客观权重
// α = 0.6：适老化主观需求占主导
function combineWeights(subjectiveWeights, objectiveWeights, alpha) {
  alpha = alpha || 0.6
  var keys = Object.keys(subjectiveWeights)
  var combined = {}
  for (var i = 0; i < keys.length; i++) {
    combined[keys[i]] = alpha * subjectiveWeights[keys[i]] + (1 - alpha) * objectiveWeights[i]
  }
  return combined
}

// 解析时长字符串为分钟数（"5小时17分" → 317）
function parseDurationToMinutes(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0
  var hours = 0
  var minutes = 0
  var hMatch = durationStr.match(/(\d+)小时/)
  if (hMatch) hours = Number(hMatch[1])
  var mMatch = durationStr.match(/(\d+)分/)
  if (mMatch) minutes = Number(mMatch[1])
  return hours * 60 + minutes
}

// 适老化权重矩阵
var ELDERLY_WEIGHTS = {
  timeMatch: 0.20,    // 出发时间匹配度
  economy: 0.25,      // 价格经济性
  duration: 0.15,     // 行程时长
  comfort: 0.30,      // 舒适度（车型+座位等级）
  departureSuit: 0.10 // 出发时段适宜度（避免太早/太晚）
}

// 出发时段适宜度评分（老人不宜太早出发或太晚到达）
function scoreDepartureSuitability(startTime, endTime) {
  var startMin = parseTime(startTime)
  var endMin = parseTime(endTime)
  if (startMin === null) return 0.5

  var startScore = 0
  if (startMin >= 420 && startMin <= 600) {
    startScore = 1.0  // 7:00-10:00 最佳
  } else if (startMin >= 360 && startMin < 420) {
    startScore = 0.6  // 6:00-7:00 较早
  } else if (startMin > 600 && startMin <= 720) {
    startScore = 0.7  // 10:00-12:00 尚可
  } else if (startMin > 720 && startMin <= 900) {
    startScore = 0.4  // 12:00-15:00 一般
  } else {
    startScore = 0.2  // 太早或太晚
  }

  var endScore = 1.0
  if (endMin !== null) {
    if (endMin > 1320) endScore = 0.2      // 22:00后到达
    else if (endMin > 1200) endScore = 0.5 // 20:00后到达
  }

  return (startScore + endScore) / 2
}

// 舒适度评分：车型等级 + 座位可用性
function scoreComfort(train) {
  if (!train) return 0.3
  var typeScore = 0
  switch (train.type) {
    case '高铁': typeScore = 1.0; break
    case '动车': typeScore = 0.8; break
    case '城际': typeScore = 0.7; break
    case '直达': typeScore = 0.5; break
    case '快速': typeScore = 0.3; break
    default: typeScore = 0.4
  }
  var seatBonus = 0
  if (train.prices) {
    for (var i = 0; i < train.prices.length; i++) {
      if (train.prices[i].type === '一等座' || train.prices[i].type === '商务座') {
        seatBonus = 0.1
        break
      }
    }
  }
  return Math.min(1.0, typeScore + seatBonus)
}

// 多目标排序主函数
function elderlyMultiCriteriaRank(plans, time) {
  if (!plans || plans.length === 0) return plans
  if (plans.length === 1) {
    plans[0].isRecommended = true
    plans[0].reason = '唯一可选方案'
    plans[0].score = 1.0
    return plans
  }

  var rawTimeMatch = []
  var rawEconomy = []
  var rawDuration = []
  var rawComfort = []
  var rawDepartSuit = []

  var targetMin = time ? parseTime(time) : null

  for (var i = 0; i < plans.length; i++) {
    var plan = plans[i]
    var train = plan.train

    if (targetMin !== null && train && train.startTime) {
      var planMin = parseTime(train.startTime)
      if (planMin !== null) {
        rawTimeMatch.push(Math.abs(planMin - targetMin))
      } else {
        rawTimeMatch.push(9999)
      }
    } else {
      rawTimeMatch.push(0)
    }

    rawEconomy.push(plan.totalCost || 9999)

    if (train && train.duration) {
      rawDuration.push(parseDurationToMinutes(train.duration))
    } else {
      rawDuration.push(9999)
    }

    rawComfort.push(scoreComfort(train))

    rawDepartSuit.push(scoreDepartureSuitability(
      train ? train.startTime : null,
      train ? train.endTime : null
    ))
  }

  // 归一化（时间差、费用、时长越小越好需反转）
  var normTimeMatch = normalizeDimension(rawTimeMatch).map(function(v) { return 1 - v })
  var normEconomy = normalizeDimension(rawEconomy).map(function(v) { return 1 - v })
  var normDuration = normalizeDimension(rawDuration).map(function(v) { return 1 - v })
  var normComfort = normalizeDimension(rawComfort)
  var normDepartSuit = normalizeDimension(rawDepartSuit)

  // 加权综合评分
  var scores = []
  for (var j = 0; j < plans.length; j++) {
    var score =
      normTimeMatch[j] * ELDERLY_WEIGHTS.timeMatch +
      normEconomy[j] * ELDERLY_WEIGHTS.economy +
      normDuration[j] * ELDERLY_WEIGHTS.duration +
      normComfort[j] * ELDERLY_WEIGHTS.comfort +
      normDepartSuit[j] * ELDERLY_WEIGHTS.departureSuit
    scores.push(score)
  }

  // 找到最优方案并生成推荐理由
  var bestIndex = 0
  var bestScore = scores[0]
  for (var k = 1; k < scores.length; k++) {
    if (scores[k] > bestScore) {
      bestScore = scores[k]
      bestIndex = k
    }
  }

  var reasons = []
  var best = plans[bestIndex]
  var bestTrain = best.train

  if (bestTrain) {
    if (normComfort[bestIndex] >= 0.8) {
      reasons.push(bestTrain.type + '舒适度高')
    }
    if (normEconomy[bestIndex] >= 0.7) {
      reasons.push('价格实惠¥' + (best.totalCost || ''))
    }
    if (normTimeMatch[bestIndex] >= 0.8 && targetMin !== null) {
      reasons.push(bestTrain.startTime + '出发时间匹配')
    }
    if (normDepartSuit[bestIndex] >= 0.8) {
      reasons.push('出发时段适宜')
    }
    if (normDuration[bestIndex] >= 0.7) {
      reasons.push('行程用时较短')
    }
  }
  var reason = reasons.length > 0 ? reasons.join('，') : '综合最优选择'

  plans.forEach(function(plan, index) {
    plan.isRecommended = index === bestIndex
    plan.reason = index === bestIndex ? reason : ''
    plan.score = scores[index].toFixed(3)
  })

  // TOPSIS理想解距离
  var topsisScores = calculateTopsisScore(normTimeMatch, normEconomy, normDuration, normComfort, normDepartSuit, ELDERLY_WEIGHTS)
  for (var idx = 0; idx < plans.length; idx++) {
    plans[idx].topsisScore = topsisScores[idx].toFixed(3)
  }

  return plans
}

// TOPSIS理想解距离计算
function calculateTopsisScore(normTime, normEcon, normDur, normComf, normDept, weights) {
  var n = normTime.length
  var w = weights || ELDERLY_WEIGHTS

  var weighted = []
  for (var i = 0; i < n; i++) {
    weighted[i] = [
      normTime[i] * w.timeMatch,
      normEcon[i] * w.economy,
      normDur[i] * w.duration,
      normComf[i] * w.comfort,
      normDept[i] * w.departureSuit
    ]
  }

  var idealBest = []
  var idealWorst = []

  for (var j = 0; j < 5; j++) {
    var col = []
    for (var i = 0; i < n; i++) col.push(weighted[i][j])
    idealBest.push(Math.max.apply(null, col))
    idealWorst.push(Math.min.apply(null, col))
  }

  var scores = []
  for (var i = 0; i < n; i++) {
    var dPlusSq = 0
    var dMinusSq = 0
    for (var j = 0; j < 5; j++) {
      dPlusSq += Math.pow(weighted[i][j] - idealBest[j], 2)
      dMinusSq += Math.pow(weighted[i][j] - idealWorst[j], 2)
    }
    var dPlus = Math.sqrt(dPlusSq)
    var dMinus = Math.sqrt(dMinusSq)
    scores.push(dMinus / (dPlus + dMinus))
  }

  return scores
}

// 灵敏度分析
function sensitivityAnalysis(plans, time) {
  if (!plans || plans.length < 2) return { stable: true, message: '方案不足，无需分析' }

  var perturbations = [
    { name: '舒适度+20%', weights: { comfort: 0.36, economy: 0.23, timeMatch: 0.18, duration: 0.13, departureSuit: 0.10 } },
    { name: '经济性+20%', weights: { comfort: 0.25, economy: 0.30, timeMatch: 0.19, duration: 0.16, departureSuit: 0.10 } },
    { name: '时间匹配+20%', weights: { comfort: 0.28, economy: 0.24, timeMatch: 0.25, duration: 0.13, departureSuit: 0.10 } },
    { name: '时长+20%', weights: { comfort: 0.28, economy: 0.24, timeMatch: 0.19, duration: 0.20, departureSuit: 0.09 } }
  ]

  var basePlan = plans[0]
  var stableCount = 0
  var results = []

  for (var p = 0; p < perturbations.length; p++) {
    var perturbed = elderlyMultiCriteriaRank(plans.slice(), time, perturbations[p].weights)
    if (perturbed[0].isRecommended) stableCount++
    results.push({
      perturbation: perturbations[p].name,
      topPlan: perturbed[0].train ? perturbed[0].train.type + perturbed[0].train.startTime : '无',
      score: perturbed[0].score
    })
  }

  return {
    stable: stableCount >= 3,
    stabilityRate: stableCount / perturbations.length,
    results: results,
    message: stableCount >= 3 ? '排序结果稳定，推荐方案可信度高' : '排序结果对权重敏感，建议人工确认'
  }
}

// 简单降级排序
function simpleFallback(plans, time) {
  try {
    return elderlyMultiCriteriaRank(plans, time)
  } catch (e) {
    console.warn('排序算法异常，使用简单排序:', e)
    if (plans && plans.length > 0) {
      plans[0].isRecommended = true
      plans[0].reason = '推荐方案'
    }
    return plans
  }
}

// ===== 行程衔接时间窗口安全验证 =====

var ELDERLY_BUFFER = {
  stationArrival: 30,
  stationDeparture: 20,
  transferWalk: 25,
  safetyMargin: 10
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null
  var match = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (match) {
    return Number(match[1]) * 60 + Number(match[2])
  }
  return null
}

function minutesToTime(min) {
  if (min === null || min === undefined || isNaN(min)) return '--:--'
  var h = Math.floor(min / 60) % 24
  var m = min % 60
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m
}

function parseDurationMinutes(str) {
  if (!str) return 0
  if (typeof str === 'number') return str
  var minMatch = str.match(/(\d+)\s*分钟/)
  if (minMatch) return Number(minMatch[1])
  var hourMatch = str.match(/(\d+)\s*小时/)
  var minMatch2 = str.match(/(\d+)\s*分/)
  var hours = hourMatch ? Number(hourMatch[1]) : 0
  var mins = minMatch2 ? Number(minMatch2[1]) : 0
  return hours * 60 + mins
}

// 衔接安全验证主函数
function verifyConnectionSafety(segments) {
  if (!segments || segments.length === 0) return null

  var warnings = []
  var connectionPoints = []
  var latestDepartureTime = null

  var trainSegment = null
  var trainIndex = -1
  for (var i = 0; i < segments.length; i++) {
    if (segments[i].type === 'train') {
      trainSegment = segments[i]
      trainIndex = i
      break
    }
  }

  if (!trainSegment || !trainSegment.train) {
    return { warnings: [], connectionPoints: [], latestDepartureTime: null }
  }

  var trainStartMin = timeToMinutes(trainSegment.train.startTime)
  var trainEndMin = timeToMinutes(trainSegment.train.endTime)

  // 验证第1段衔接：出发地 → 车站
  if (trainIndex > 0) {
    var firstSegment = segments[0]
    var taxiDuration = 0
    if (firstSegment.taxi && firstSegment.taxi.duration) {
      taxiDuration = parseDurationMinutes(firstSegment.taxi.duration)
    }

    if (taxiDuration > 0 && trainStartMin !== null) {
      var bufferNeeded = ELDERLY_BUFFER.stationArrival + ELDERLY_BUFFER.safetyMargin
      latestDepartureTime = trainStartMin - taxiDuration - bufferNeeded

      var availableTime = trainStartMin - latestDepartureTime
      var requiredTime = taxiDuration + bufferNeeded
      var safetyRatio = availableTime / requiredTime

      var status = 'safe'
      var statusText = '时间充裕'
      if (safetyRatio < 1.0) {
        status = 'danger'
        statusText = '时间紧张'
        var bufferLeft = availableTime - taxiDuration
        // 本地规则检测 → AI二次分析生成人性化文案（confidence<0.7或失败时回落到下面message）
        if (aiService && aiService.analyzeSafetyAlert) {
          aiService.analyzeSafetyAlert('connection', {
            status: 'danger',
            fromStation: firstSegment.title || '出发地',
            toStation: trainSegment.train.fromStation,
            trainDepartureTime: trainSegment.train.startTime,
            taxiDuration: taxiDuration,
            bufferNeeded: bufferNeeded,
            bufferLeft: Math.max(0, Math.round(bufferLeft)),
            safetyRatio: safetyRatio.toFixed(2)
          }).then(function(analysis) {
            if (analysis && (analysis.confidence || 0) >= 0.7 && analysis.desc) {
              warnings.push({
                type: 'tight_connection',
                segment: 0,
                aiTitle: analysis.title,
                aiDesc: analysis.desc,
                suggestion: analysis.suggestion,
                aiAnalyzed: true,
                message: analysis.desc + (analysis.suggestion ? '｜' + analysis.suggestion : '')
              })
            }
          })
        }
        if (warnings.length === 0 || !warnings.some(function(w){return w.type==='tight_connection'})) {
          warnings.push({
            type: 'tight_connection',
            segment: 0,
            message: '从出发地到' + trainSegment.train.fromStation + '的时间较紧张，建议提前' + Math.ceil(bufferNeeded + 10) + '分钟出门'
          })
        }
      } else if (safetyRatio < 1.2) {
        status = 'warning'
        statusText = '时间尚可'
        // 本地规则触发 → AI二次分析
        var wBufferLeft = availableTime - taxiDuration
        if (aiService && aiService.analyzeSafetyAlert) {
          aiService.analyzeSafetyAlert('connection', {
            status: 'warning',
            fromStation: firstSegment.title || '出发地',
            toStation: trainSegment.train.fromStation,
            trainDepartureTime: trainSegment.train.startTime,
            taxiDuration: taxiDuration,
            bufferNeeded: bufferNeeded,
            bufferLeft: Math.max(0, Math.round(wBufferLeft)),
            safetyRatio: safetyRatio.toFixed(2)
          }).then(function(analysis) {
            if (analysis && (analysis.confidence || 0) >= 0.7 && analysis.desc) {
              warnings.push({
                type: 'caution', segment: 0,
                aiTitle: analysis.title, aiDesc: analysis.desc,
                suggestion: analysis.suggestion, aiAnalyzed: true,
                message: analysis.desc + (analysis.suggestion ? '｜' + analysis.suggestion : '')
              })
            }
          })
        }
        if (warnings.length === 0 || !warnings.some(function(w){return w.type==='caution'})) {
          warnings.push({
            type: 'caution',
            segment: 0,
            message: '建议至少提前' + Math.ceil(bufferNeeded) + '分钟出门，预留检票时间'
          })
        }
      }

      connectionPoints.push({
        from: firstSegment.title || '出发地',
        to: trainSegment.train.fromStation,
        taxiDuration: taxiDuration,
        bufferNeeded: bufferNeeded,
        latestDepartureTime: minutesToTime(latestDepartureTime),
        trainDepartureTime: trainSegment.train.startTime,
        status: status,
        statusText: statusText,
        safetyRatio: safetyRatio.toFixed(2)
      })
    }
  }

  // 验证第2段衔接：到站 → 目的地
  if (trainIndex >= 0 && trainIndex < segments.length - 1 && trainEndMin !== null) {
    var lastSegment = segments[segments.length - 1]
    var endTaxiDuration = 0
    if (lastSegment.taxi && lastSegment.taxi.duration) {
      endTaxiDuration = parseDurationMinutes(lastSegment.taxi.duration)
    }

    var endBuffer = ELDERLY_BUFFER.stationDeparture + ELDERLY_BUFFER.safetyMargin
    var arrivalAtDestination = trainEndMin + endBuffer + endTaxiDuration

    connectionPoints.push({
      from: trainSegment.train.toStation,
      to: lastSegment.title || '目的地',
      taxiDuration: endTaxiDuration,
      bufferNeeded: endBuffer,
      estimatedArrivalTime: minutesToTime(arrivalAtDestination),
      trainArrivalTime: trainSegment.train.endTime,
      status: 'safe',
      statusText: '正常到达'
    })

    if (arrivalAtDestination > 22 * 60) {
      // 本地规则检测 → AI二次分析到站晚预警
      var lateCtx = {
        arrivalTime: minutesToTime(arrivalAtDestination),
        station: trainSegment.train.toStation,
        toDestination: lastSegment.title || '目的地',
        taxiDuration: endTaxiDuration,
        bufferNeeded: endBuffer
      }
      if (aiService && aiService.analyzeSafetyAlert) {
        aiService.analyzeSafetyAlert('late_arrival', lateCtx).then(function(analysis) {
          if (analysis && (analysis.confidence || 0) >= 0.7 && analysis.desc) {
            warnings.push({
              type: 'late_arrival', segment: segments.length - 1,
              aiTitle: analysis.title, aiDesc: analysis.desc,
              suggestion: analysis.suggestion, aiAnalyzed: true,
              message: analysis.desc + (analysis.suggestion ? '｜' + analysis.suggestion : '')
            })
          }
        })
      }
      if (warnings.length === 0 || !warnings.some(function(w){return w.type==='late_arrival'})) {
        warnings.push({
          type: 'late_arrival',
          segment: segments.length - 1,
          message: '预计' + minutesToTime(arrivalAtDestination) + '到达目的地，天色较晚，请注意安全'
        })
      }
    }
  }

  return {
    latestDepartureTime: latestDepartureTime !== null ? minutesToTime(latestDepartureTime) : null,
    latestDepartureMinutes: latestDepartureTime,
    connectionPoints: connectionPoints,
    warnings: warnings,
    overallStatus: warnings.length === 0 ? 'safe' : (warnings.some(function(w) { return w.type === 'tight_connection' }) ? 'danger' : 'warning')
  }
}

module.exports = {
  parseTime: parseTime,
  elderlyMultiCriteriaRank: elderlyMultiCriteriaRank,
  simpleFallback: simpleFallback,
  sensitivityAnalysis: sensitivityAnalysis,
  verifyConnectionSafety: verifyConnectionSafety,
  normalizeDimension: normalizeDimension,
  entropyWeightMethod: entropyWeightMethod,
  combineWeights: combineWeights,
  ELDERLY_WEIGHTS: ELDERLY_WEIGHTS,
  ELDERLY_BUFFER: ELDERLY_BUFFER
}
