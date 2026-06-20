import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export interface MCScenario {
  id: string
  name: string
  description: string
  params: Record<string, number>
  category: string
}

export interface MCResult {
  scenario: string
  iterations: number
  estimate: number
  trueValue?: number
  error?: number
  samples: number[]
  convergence: number[]
}

export interface HypTestResult {
  testType: string
  statistic: number
  pValue: number
  significant: boolean
  alpha: number
  df?: number
}

export interface StatisticDef {
  id: string
  name: string
  symbol: string
  description: string
  category: 'simulation' | 'sample' | 'hypothesis' | 'derived'
  compute: (r: MCResult | null, t: HypTestResult | null, samples: number[]) => number | null
}

export interface CustomMetric {
  id: string
  name: string
  expression: string
  description: string
  createdAt: number
}

export interface MetricEvalResult {
  metricId: string
  value: number | null
  error?: string
}

function normalRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function runMC(scenario: MCScenario, n: number): MCResult {
  const samples: number[] = []
  const convergence: number[] = []

  if (scenario.id === 'pi') {
    let inside = 0
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1
      if (x * x + y * y <= 1) inside++
      samples.push(x * x + y * y <= 1 ? 1 : 0)
      convergence.push((inside / (i + 1)) * 4)
    }
    const estimate = (inside / n) * 4
    return { scenario: 'pi', iterations: n, estimate, trueValue: Math.PI, error: Math.abs(estimate - Math.PI), samples, convergence }
  }
  if (scenario.id === 'brownian') {
    let pos = 0
    const dt = scenario.params.dt || 0.01
    for (let i = 0; i < n; i++) { pos += normalRandom() * Math.sqrt(dt); samples.push(pos) }
    convergence.push(...samples.slice(0, 200))
    return { scenario: 'brownian', iterations: n, estimate: pos, samples, convergence }
  }
  if (scenario.id === 'option') {
    const { S0 = 100, K = 105, r = 0.05, sigma = 0.2, T = 1 } = scenario.params
    let payoffSum = 0
    for (let i = 0; i < n; i++) {
      const ST = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * normalRandom())
      const p = Math.max(ST - K, 0); payoffSum += p; samples.push(p)
      if ((i + 1) % 50 === 0) convergence.push((payoffSum / (i + 1)) * Math.exp(-r * T))
    }
    return { scenario: 'option', iterations: n, estimate: (payoffSum / n) * Math.exp(-r * T), samples, convergence }
  }
  if (scenario.id === 'random_walk') {
    let pos = 0
    for (let i = 0; i < n; i++) { pos += Math.random() > 0.5 ? 1 : -1; samples.push(pos) }
    convergence.push(...samples.slice(0, 200))
    return { scenario: 'random_walk', iterations: n, estimate: pos, samples, convergence }
  }
  if (scenario.id === 'diffusion') {
    const { D = 1, dt = 0.01 } = scenario.params
    let x = 0, y = 0
    for (let i = 0; i < n; i++) {
      x += normalRandom() * Math.sqrt(2 * D * dt); y += normalRandom() * Math.sqrt(2 * D * dt)
      samples.push(Math.sqrt(x * x + y * y))
    }
    convergence.push(...samples.slice(0, 200))
    return { scenario: 'diffusion', iterations: n, estimate: Math.sqrt(x * x + y * y), samples, convergence }
  }
  const { p = 0.45, bankroll = 50, goal = 100 } = scenario.params
  let ruinCount = 0
  for (let i = 0; i < n; i++) {
    let money = bankroll
    let steps = 0
    while (money > 0 && money < goal && steps < 10000) { money += Math.random() < p ? 1 : -1; steps++ }
    if (money <= 0) ruinCount++
    samples.push(money <= 0 ? 0 : 1)
    convergence.push(ruinCount / (i + 1))
  }
  return { scenario: 'gambler', iterations: n, estimate: ruinCount / n, samples, convergence }
}

export const SCENARIOS: MCScenario[] = [
  { id: 'pi', name: '圆周率π估算', description: '随机投点估算π值，观察收敛过程', params: {}, category: '基础' },
  { id: 'brownian', name: '布朗运动模拟', description: '粒子热运动随机路径模拟', params: { dt: 0.01 }, category: '物理' },
  { id: 'option', name: '欧式期权定价', description: 'Black-Scholes期权价格蒙特卡洛估算', params: { S0: 100, K: 105, r: 0.05, sigma: 0.2, T: 1 }, category: '金融' },
  { id: 'random_walk', name: '随机游走', description: '一维离散随机游走轨迹模拟', params: {}, category: '基础' },
  { id: 'diffusion', name: '粒子扩散', description: '二维粒子随机扩散位移分析', params: { D: 1, dt: 0.01 }, category: '物理' },
  { id: 'gambler', name: '赌徒破产', description: '不利赌局下资金耗尽概率估算', params: { p: 0.45, bankroll: 50, goal: 100 }, category: '概率' }
]

function sampleMean(s: number[]): number {
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0
}

function sampleVariance(s: number[]): number {
  if (s.length < 2) return 0
  const m = sampleMean(s)
  return s.reduce((acc, x) => acc + (x - m) ** 2, 0) / (s.length - 1)
}

function sampleStd(s: number[]): number {
  return Math.sqrt(sampleVariance(s))
}

function sampleMin(s: number[]): number {
  return s.length ? Math.min(...s) : 0
}

function sampleMax(s: number[]): number {
  return s.length ? Math.max(...s) : 0
}

function sampleMedian(s: number[]): number {
  if (!s.length) return 0
  const sorted = [...s].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function sampleSkewness(s: number[]): number {
  if (s.length < 3) return 0
  const m = sampleMean(s)
  const sd = sampleStd(s)
  if (sd === 0) return 0
  const n = s.length
  return (n / ((n - 1) * (n - 2))) * s.reduce((acc, x) => acc + ((x - m) / sd) ** 3, 0)
}

function sampleKurtosis(s: number[]): number {
  if (s.length < 4) return 0
  const m = sampleMean(s)
  const sd = sampleStd(s)
  if (sd === 0) return 0
  const n = s.length
  const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))
  const term2 = s.reduce((acc, x) => acc + ((x - m) / sd) ** 4, 0)
  const term3 = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
  return term1 * term2 - term3
}

export const STATISTICS: StatisticDef[] = [
  { id: 'estimate', name: '估算值', symbol: 'θ̂', description: '蒙特卡洛模拟的输出估算值', category: 'simulation', compute: (r) => r?.estimate ?? null },
  { id: 'trueValue', name: '真实值', symbol: 'θ', description: '理论真实值（仅部分场景有）', category: 'simulation', compute: (r) => r?.trueValue ?? null },
  { id: 'error', name: '绝对误差', symbol: 'ε', description: '估算值与真实值的绝对差', category: 'simulation', compute: (r) => r?.error ?? null },
  { id: 'iterations', name: '迭代次数', symbol: 'N', description: '模拟采样的总次数', category: 'simulation', compute: (r) => r?.iterations ?? null },
  { id: 'mean', name: '样本均值', symbol: 'x̄', description: '所有样本的算术平均值', category: 'sample', compute: (r, _, s) => s.length ? sampleMean(s) : null },
  { id: 'variance', name: '样本方差', symbol: 's²', description: '样本方差（无偏估计）', category: 'sample', compute: (r, _, s) => s.length ? sampleVariance(s) : null },
  { id: 'std', name: '样本标准差', symbol: 's', description: '样本标准差', category: 'sample', compute: (r, _, s) => s.length ? sampleStd(s) : null },
  { id: 'min', name: '最小值', symbol: 'min', description: '样本中的最小值', category: 'sample', compute: (r, _, s) => s.length ? sampleMin(s) : null },
  { id: 'max', name: '最大值', symbol: 'max', description: '样本中的最大值', category: 'sample', compute: (r, _, s) => s.length ? sampleMax(s) : null },
  { id: 'median', name: '中位数', symbol: 'M', description: '样本中位数', category: 'sample', compute: (r, _, s) => s.length ? sampleMedian(s) : null },
  { id: 'range', name: '极差', symbol: 'R', description: '最大值减最小值', category: 'derived', compute: (r, _, s) => s.length ? sampleMax(s) - sampleMin(s) : null },
  { id: 'cv', name: '变异系数', symbol: 'CV', description: '标准差/均值（无量纲离散度）', category: 'derived', compute: (r, _, s) => {
      if (!s.length) return null
      const m = sampleMean(s)
      if (m === 0) return null
      return sampleStd(s) / m
    }
  },
  { id: 'skewness', name: '偏度', symbol: 'S', description: '样本分布偏度（三阶矩）', category: 'sample', compute: (r, _, s) => s.length ? sampleSkewness(s) : null },
  { id: 'kurtosis', name: '峰度', symbol: 'K', description: '样本分布峰度（四阶矩）', category: 'sample', compute: (r, _, s) => s.length ? sampleKurtosis(s) : null },
  { id: 't_stat', name: 'T统计量', symbol: 't', description: '假设检验的T统计量', category: 'hypothesis', compute: (_, t) => t?.statistic ?? null },
  { id: 'p_value', name: 'P值', symbol: 'p', description: '假设检验的P值', category: 'hypothesis', compute: (_, t) => t?.pValue ?? null },
  { id: 'df', name: '自由度', symbol: 'df', description: '假设检验的自由度', category: 'hypothesis', compute: (_, t) => t?.df ?? null },
  { id: 're', name: '相对误差', symbol: 'RE', description: '绝对误差/真实值（百分比）', category: 'derived', compute: (r) => {
      if (r?.error == null || r?.trueValue == null || r.trueValue === 0) return null
      return (r.error / r.trueValue) * 100
    }
  }
]

const SAFE_FUNCTIONS = {
  abs: Math.abs, sqrt: Math.sqrt, pow: Math.pow, exp: Math.exp, log: Math.log,
  log2: Math.log2, log10: Math.log10, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, ceil: Math.ceil, floor: Math.floor,
  round: Math.round, sign: Math.sign, max: Math.max, min: Math.min
}

const SAFE_CONSTANTS: Record<string, number> = {
  PI: Math.PI, E: Math.E, LN2: Math.LN2, LN10: Math.LN10, SQRT2: Math.SQRT2, SQRT1_2: Math.SQRT1_2
}

function safeEval(expression: string, values: Record<string, number | null>): { value: number | null; error?: string } {
  try {
    const nullVars: string[] = []
    const varObj: Record<string, number> = {}
    for (const [k, v] of Object.entries(values)) {
      if (v == null || isNaN(v)) { nullVars.push(k) } else { varObj[k] = v }
    }
    if (nullVars.length > 0) {
      const usedInExpr = nullVars.filter(k => new RegExp(`\\b${k}\\b`).test(expression))
      if (usedInExpr.length > 0) {
        return { value: null, error: `统计量 [${usedInExpr.join(', ')}] 暂无数据` }
      }
    }
    const sanitized = expression
      .replace(/\bsqrt\(/g, '__fn_sqrt(')
      .replace(/\babs\(/g, '__fn_abs(')
      .replace(/\bpow\(/g, '__fn_pow(')
      .replace(/\bexp\(/g, '__fn_exp(')
      .replace(/\blog\(/g, '__fn_log(')
      .replace(/\blog2\(/g, '__fn_log2(')
      .replace(/\blog10\(/g, '__fn_log10(')
      .replace(/\bsin\(/g, '__fn_sin(')
      .replace(/\bcos\(/g, '__fn_cos(')
      .replace(/\btan\(/g, '__fn_tan(')
      .replace(/\basin\(/g, '__fn_asin(')
      .replace(/\bacos\(/g, '__fn_acos(')
      .replace(/\batan\(/g, '__fn_atan(')
      .replace(/\bceil\(/g, '__fn_ceil(')
      .replace(/\bfloor\(/g, '__fn_floor(')
      .replace(/\bround\(/g, '__fn_round(')
      .replace(/\bsign\(/g, '__fn_sign(')
      .replace(/\bmax\(/g, '__fn_max(')
      .replace(/\bmin\(/g, '__fn_min(')
    if (/[^a-zA-Z0-9_+\-*/%().\s,]/g.test(sanitized.replace(/__fn_[a-z0-9]+/gi, ''))) {
      return { value: null, error: '表达式包含非法字符' }
    }
    const fnArgs: string[] = Object.keys(varObj).concat(Object.keys(SAFE_CONSTANTS))
    const fnVals: unknown[] = Object.values(varObj).concat(Object.values(SAFE_CONSTANTS))
    for (const k of Object.keys(SAFE_FUNCTIONS)) { fnArgs.push(`__fn_${k}`); fnVals.push(SAFE_FUNCTIONS[k as keyof typeof SAFE_FUNCTIONS] as unknown) }
    const body = `'use strict'; return (${sanitized});`
    const result = new Function(...fnArgs, body)(...fnVals)
    if (typeof result !== 'number' || !isFinite(result)) return { value: null, error: '计算结果无效' }
    return { value: result }
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : '表达式语法错误' }
  }
}

function buildStatValuesMap(result: MCResult | null, testResult: HypTestResult | null, samples: number[]): Record<string, number | null> {
  const map: Record<string, number | null> = {}
  for (const s of STATISTICS) { map[s.id] = s.compute(result, testResult, samples) }
  return map
}

const STORAGE_KEY = 'mc_custom_metrics_v1'
const HISTORY_KEY = 'mc_custom_metrics_history_v1'

function loadMetrics(): CustomMetric[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function loadHistory(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export const useMCStore = defineStore('mc', () => {
  const currentScenario = ref<MCScenario>(SCENARIOS[0])
  const iterations = ref(1000)
  const result = ref<MCResult | null>(null)
  const testResult = ref<HypTestResult | null>(null)
  const isRunning = ref(false)

  const customMetrics = ref<CustomMetric[]>(loadMetrics())
  const metricHistory = ref<Record<string, number[]>>(loadHistory())
  const metricEvalResults = ref<Record<string, MetricEvalResult>>({})

  watch(customMetrics, (v) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch {}
  }, { deep: true })

  watch(metricHistory, (v) => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(v)) } catch {}
  }, { deep: true })

  function runSimulation() {
    isRunning.value = true
    setTimeout(() => {
      result.value = runMC(currentScenario.value, iterations.value)
      isRunning.value = false
      evaluateAllMetrics()
      appendHistory()
    }, 10)
  }

  function runTest(g1: number[], g2: number[]) {
    const n1 = g1.length, n2 = g2.length
    const m1 = g1.reduce((a, b) => a + b, 0) / n1
    const m2 = g2.reduce((a, b) => a + b, 0) / n2
    const v1 = g1.reduce((s, x) => s + (x - m1) ** 2, 0) / (n1 - 1)
    const v2 = g2.reduce((s, x) => s + (x - m2) ** 2, 0) / (n2 - 1)
    const se = Math.sqrt(v1 / n1 + v2 / n2)
    const t = (m1 - m2) / se
    const df = Math.round((v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1)))
    const pValue = 2 * (1 - Math.min(0.9999, Math.abs(t) / (Math.abs(t) + Math.sqrt(df))))
    testResult.value = { testType: 'Welch T检验', statistic: Math.round(t * 1000) / 1000, pValue: Math.round(pValue * 10000) / 10000, significant: pValue < 0.05, alpha: 0.05, df }
    evaluateAllMetrics()
  }

  function setScenario(s: MCScenario) { currentScenario.value = s; result.value = null }

  function evaluateAllMetrics() {
    const values = buildStatValuesMap(result.value, testResult.value, result.value?.samples ?? [])
    const res: Record<string, MetricEvalResult> = {}
    for (const m of customMetrics.value) {
      const r = safeEval(m.expression, values)
      res[m.id] = { metricId: m.id, value: r.value, error: r.error }
    }
    metricEvalResults.value = res
  }

  function evaluateMetric(metric: CustomMetric): MetricEvalResult {
    const values = buildStatValuesMap(result.value, testResult.value, result.value?.samples ?? [])
    const r = safeEval(metric.expression, values)
    return { metricId: metric.id, value: r.value, error: r.error }
  }

  function evaluateExpression(expr: string): { value: number | null; error?: string } {
    const values = buildStatValuesMap(result.value, testResult.value, result.value?.samples ?? [])
    return safeEval(expr, values)
  }

  function validateExpression(expr: string): { valid: boolean; error?: string } {
    const dummy: Record<string, number | null> = {}
    for (const s of STATISTICS) dummy[s.id] = 1
    const r = safeEval(expr, dummy)
    if (r.error && r.error.includes('暂无数据')) return { valid: true }
    if (r.error) return { valid: false, error: r.error }
    return { valid: true }
  }

  function addMetric(name: string, expression: string, description: string): CustomMetric | null {
    const v = validateExpression(expression)
    if (!v.valid) return null
    const m: CustomMetric = { id: 'cm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, expression, description, createdAt: Date.now() }
    customMetrics.value.push(m)
    evaluateAllMetrics()
    return m
  }

  function updateMetric(id: string, patch: Partial<Pick<CustomMetric, 'name' | 'expression' | 'description'>>): boolean {
    if (patch.expression) {
      const v = validateExpression(patch.expression)
      if (!v.valid) return false
    }
    const idx = customMetrics.value.findIndex(m => m.id === id)
    if (idx < 0) return false
    customMetrics.value[idx] = { ...customMetrics.value[idx], ...patch }
    evaluateAllMetrics()
    return true
  }

  function deleteMetric(id: string) {
    customMetrics.value = customMetrics.value.filter(m => m.id !== id)
    delete metricEvalResults.value[id]
    delete metricHistory.value[id]
  }

  function duplicateMetric(id: string): CustomMetric | null {
    const m = customMetrics.value.find(x => x.id === id)
    if (!m) return null
    const copy: CustomMetric = { ...m, id: 'cm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: m.name + ' (副本)', createdAt: Date.now() }
    customMetrics.value.push(copy)
    evaluateAllMetrics()
    return copy
  }

  function appendHistory() {
    const maxHistory = 50
    for (const m of customMetrics.value) {
      const r = metricEvalResults.value[m.id]
      if (r && r.value != null) {
        if (!metricHistory.value[m.id]) metricHistory.value[m.id] = []
        metricHistory.value[m.id].push(r.value)
        if (metricHistory.value[m.id].length > maxHistory) metricHistory.value[m.id] = metricHistory.value[m.id].slice(-maxHistory)
      }
    }
  }

  function clearHistory(id?: string) {
    if (id) { delete metricHistory.value[id] }
    else { metricHistory.value = {} }
  }

  function statisticsByCategory() {
    const groups: Record<string, StatisticDef[]> = { simulation: [], sample: [], hypothesis: [], derived: [] }
    for (const s of STATISTICS) groups[s.category].push(s)
    return groups
  }

  const currentStatValues = computed(() => buildStatValuesMap(result.value, testResult.value, result.value?.samples ?? []))

  const convergenceData = computed(() => {
    if (!result.value) return [] as [number, number][]
    return result.value.convergence.slice(0, 200).map((v, i): [number, number] => [i, Math.round(v * 100000) / 100000])
  })

  const histogramData = computed(() => {
    if (!result.value) return { xAxis: [] as number[], data: [] as number[] }
    const s = result.value.samples.slice(0, 1000)
    const mn = Math.min(...s), mx = Math.max(...s)
    const bins = 20, bs = (mx - mn) / bins || 1
    const counts = new Array(bins).fill(0)
    s.forEach(v => { counts[Math.min(bins - 1, Math.floor((v - mn) / bs))]++ })
    return { xAxis: Array.from({ length: bins }, (_, i) => Math.round((mn + i * bs) * 100) / 100), data: counts }
  })

  return {
    currentScenario, iterations, result, testResult, isRunning,
    customMetrics, metricHistory, metricEvalResults,
    convergenceData, histogramData, currentStatValues,
    runSimulation, runTest, setScenario,
    addMetric, updateMetric, deleteMetric, duplicateMetric,
    evaluateMetric, evaluateExpression, validateExpression,
    evaluateAllMetrics, clearHistory, statisticsByCategory
  }
})
