<template>
  <div class="min-h-screen bg-slate-900 text-slate-200">
    <header class="border-b border-slate-700 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-cyan-400">蒙特卡洛模拟与统计假设检验平台</h1>
        <p class="text-sm text-slate-500 mt-1">随机采样模拟 · 6种MC场景 · 假设检验 · 置信区间可视化 · <span class="text-amber-400">自定义指标工坊</span></p>
      </div>
      <div class="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
        <button @click="activeTab = 'simulate'" :class="['px-4 py-1.5 rounded text-sm font-medium transition-all', activeTab === 'simulate' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200']">🎲 模拟与检验</button>
        <button @click="activeTab = 'workshop'" :class="['px-4 py-1.5 rounded text-sm font-medium transition-all', activeTab === 'workshop' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200']">🛠 自定义指标工坊</button>
      </div>
    </header>

    <div v-if="activeTab === 'simulate'" class="flex flex-col lg:flex-row gap-4 p-4">
      <div class="lg:w-1/4 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">模拟场景</h3>
          <div class="space-y-1">
            <div v-for="s in SCENARIOS" :key="s.id" @click="store.setScenario(s)"
              :class="['cursor-pointer p-2 rounded border text-sm transition-all', store.currentScenario.id === s.id ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400' : 'border-slate-700 text-slate-300 hover:border-slate-500']">
              <div class="font-bold">{{ s.name }}</div>
              <div class="text-xs text-slate-500 mt-0.5">{{ s.description }}</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">参数控制</h3>
          <label class="text-xs text-slate-500">迭代次数: {{ store.iterations }}</label>
          <input type="range" min="100" max="5000" step="100" v-model.number="store.iterations" class="w-full mt-1 mb-3 accent-cyan-500" />
          <button @click="store.runSimulation" :disabled="store.isRunning" class="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-sm font-bold">
            {{ store.isRunning ? '运行中...' : '▶ 开始模拟' }}
          </button>
        </div>
        <div v-if="store.result" class="bg-slate-800 rounded-lg p-4 border border-slate-700 text-sm">
          <h3 class="text-sm font-bold text-slate-400 mb-3">模拟结果</h3>
          <div class="space-y-2">
            <div class="flex justify-between"><span class="text-slate-500">估算值</span><span class="text-cyan-400 font-bold font-mono">{{ store.result.estimate.toFixed(6) }}</span></div>
            <div v-if="store.result.trueValue !== undefined" class="flex justify-between"><span class="text-slate-500">真实值</span><span class="text-green-400 font-mono">{{ store.result.trueValue.toFixed(6) }}</span></div>
            <div v-if="store.result.error !== undefined" class="flex justify-between"><span class="text-slate-500">误差</span><span class="text-orange-400 font-mono">{{ store.result.error.toFixed(6) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">样本数</span><span class="text-slate-300">{{ store.result.iterations }}</span></div>
          </div>
        </div>
      </div>
      <div class="lg:w-3/4 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">收敛过程</h3>
          <div ref="convergenceRef" class="w-full rounded" style="height:240px;background:#0f172a;"></div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">样本分布直方图</h3>
          <div ref="histogramRef" class="w-full rounded" style="height:220px;background:#0f172a;"></div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">假设检验 (独立样本 T 检验)</h3>
          <div class="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label class="text-xs text-slate-500">样本组A (逗号分隔)</label>
              <textarea v-model="group1Input" rows="2" class="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500 resize-none"></textarea>
            </div>
            <div>
              <label class="text-xs text-slate-500">样本组B (逗号分隔)</label>
              <textarea v-model="group2Input" rows="2" class="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500 resize-none"></textarea>
            </div>
          </div>
          <button @click="runTest" class="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm">执行T检验</button>
          <div v-if="store.testResult" class="mt-3 grid grid-cols-4 gap-3 text-sm">
            <div class="bg-slate-900 rounded p-2 text-center"><div class="text-xs text-slate-500 mb-1">统计量 t</div><div class="text-cyan-400 font-bold font-mono">{{ store.testResult.statistic }}</div></div>
            <div class="bg-slate-900 rounded p-2 text-center"><div class="text-xs text-slate-500 mb-1">p 值</div><div class="font-bold font-mono" :class="store.testResult.significant ? 'text-red-400' : 'text-green-400'">{{ store.testResult.pValue }}</div></div>
            <div class="bg-slate-900 rounded p-2 text-center"><div class="text-xs text-slate-500 mb-1">自由度 df</div><div class="text-slate-300 font-mono">{{ store.testResult.df }}</div></div>
            <div class="bg-slate-900 rounded p-2 text-center"><div class="text-xs text-slate-500 mb-1">显著性</div><div class="text-xs font-bold" :class="store.testResult.significant ? 'text-red-400' : 'text-green-400'">{{ store.testResult.significant ? '显著(p<0.05)' : '不显著' }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="p-4 space-y-4">
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div class="xl:col-span-3 space-y-4">
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">📦 统计量库 <span class="text-xs text-slate-500 font-normal">点击插入表达式</span></h3>
            <div class="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              <div v-for="(items, cat) in statCategories" :key="cat" class="space-y-1.5">
                <div class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <span v-if="cat === 'simulation'">🎯</span><span v-else-if="cat === 'sample'">📊</span><span v-else-if="cat === 'hypothesis'">🔬</span><span v-else>🧮</span>
                  {{ categoryNames[cat] }} ({{ items.length }})
                </div>
                <div class="grid grid-cols-1 gap-1">
                  <div v-for="s in items" :key="s.id" @click="insertStat(s)"
                    class="cursor-pointer p-2 rounded border text-xs bg-slate-900/50 transition-all group flex items-center justify-between"
                    :class="store.currentStatValues[s.id] != null ? 'border-slate-600 hover:border-amber-500 hover:bg-amber-900/20' : 'border-slate-700/50 opacity-60'">
                    <div class="min-w-0">
                      <div class="font-mono font-bold text-slate-200 group-hover:text-amber-400 flex items-center gap-1.5">
                        <span class="text-amber-300">{{ s.symbol }}</span>
                        <span>{{ s.id }}</span>
                      </div>
                      <div class="text-slate-500 truncate">{{ s.name }}{{ s.description ? ' · ' + s.description : '' }}</div>
                    </div>
                    <div v-if="store.currentStatValues[s.id] != null" class="text-cyan-400 font-mono text-[11px] ml-2 shrink-0 bg-slate-800 px-1.5 py-0.5 rounded">
                      {{ formatNumber(store.currentStatValues[s.id]!) }}
                    </div>
                    <div v-else class="text-slate-600 text-[11px] ml-2 shrink-0">—</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-3">📐 运算与函数</h3>
            <div class="grid grid-cols-4 gap-1.5 mb-2">
              <button v-for="op in operators" :key="op" @click="insertText(op)" class="py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-600 rounded text-xs font-mono font-bold text-cyan-300">{{ op }}</button>
            </div>
            <div class="grid grid-cols-3 gap-1.5 mb-2">
              <button v-for="c in constants" :key="c.sym" @click="insertText(c.sym)" class="py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-600 rounded text-[11px] font-mono text-purple-300" :title="c.name">{{ c.sym }}</button>
            </div>
            <div class="grid grid-cols-4 gap-1.5">
              <button v-for="fn in functions" :key="fn" @click="insertText(fn + '(')" class="py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-600 rounded text-[11px] font-mono text-green-300">{{ fn }}(</button>
            </div>
          </div>
        </div>

        <div class="xl:col-span-5 space-y-4">
          <div class="bg-slate-800 rounded-lg p-4 border border-amber-700/50">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-amber-400">✍️ 指标编辑器</h3>
              <span v-if="form.id" class="text-xs text-slate-500">编辑中</span>
              <span v-else class="text-xs text-slate-500">新建</span>
            </div>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-500">指标名称 *</label>
                  <input v-model="form.name" type="text" placeholder="如：信噪比、精度..." class="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label class="text-xs text-slate-500">描述（可选）</label>
                  <input v-model="form.description" type="text" placeholder="指标用途说明" class="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between">
                  <label class="text-xs text-slate-500">表达式 * <span class="text-amber-500/70">（使用统计量ID + 运算符/函数）</span></label>
                  <button @click="clearForm" class="text-xs text-slate-500 hover:text-red-400">清空</button>
                </div>
                <div class="relative mt-1">
                  <input ref="exprInputRef" v-model="form.expression" @input="onExprInput" type="text" placeholder="例: (estimate - trueValue) / std * 100"
                    class="w-full bg-slate-900 border rounded px-3 py-3 font-mono text-sm focus:outline-none transition-all"
                    :class="exprValid ? 'border-slate-600 focus:border-amber-500' : 'border-red-500 focus:border-red-400'" />
                </div>
                <div class="mt-2 flex items-start gap-2 flex-wrap">
                  <div v-if="exprError" class="text-xs text-red-400 flex items-center gap-1">⚠ {{ exprError }}</div>
                  <div v-else-if="form.expression && exprValid && livePreview != null" class="text-xs text-green-400 flex items-center gap-1">
                    ✅ 实时预览结果: <span class="font-mono font-bold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded">{{ formatNumber(livePreview) }}</span>
                  </div>
                  <div v-else-if="form.expression && exprValid" class="text-xs text-yellow-400 flex items-center gap-1">
                    ℹ️ 表达式合法（部分统计量暂无数据）
                  </div>
                  <div v-else-if="!form.expression" class="text-xs text-slate-500">💡 点击左侧统计量或下方按钮插入</div>
                </div>
              </div>
              <div class="flex gap-2 pt-1">
                <button v-if="!form.id" @click="handleSave" :disabled="!canSave" class="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-bold">➕ 创建指标</button>
                <template v-else>
                  <button @click="handleUpdate" :disabled="!canSave" class="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-bold">💾 保存修改</button>
                  <button @click="resetForm" class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">取消编辑</button>
                </template>
              </div>
            </div>
          </div>

          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-slate-400">📚 我的自定义指标 ({{ store.customMetrics.length }})</h3>
              <button v-if="store.customMetrics.length" @click="handleClearAll" class="text-xs text-slate-500 hover:text-red-400">🗑 清空全部</button>
            </div>
            <div v-if="store.customMetrics.length === 0" class="text-center py-10 text-slate-500">
              <div class="text-4xl mb-3 opacity-40">🧪</div>
              <div class="text-sm">还没有自定义指标</div>
              <div class="text-xs mt-1 opacity-70">使用上方编辑器创建你的第一个专属观察指标</div>
            </div>
            <div v-else class="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              <div v-for="m in store.customMetrics" :key="m.id" class="bg-slate-900/60 rounded-lg p-3 border border-slate-700 hover:border-slate-600 transition-all">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="font-bold text-slate-200 flex items-center gap-2">
                      <span class="text-amber-400">🧩</span>{{ m.name }}
                      <button @click="handleEdit(m)" class="text-xs text-slate-500 hover:text-cyan-400">编辑</button>
                    </div>
                    <div class="font-mono text-xs text-cyan-300 mt-1 bg-slate-800 px-2 py-1 rounded break-all border border-slate-700">{{ m.expression }}</div>
                    <div v-if="m.description" class="text-xs text-slate-500 mt-1">{{ m.description }}</div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-xs text-slate-500 mb-1">当前值</div>
                    <template v-if="store.metricEvalResults[m.id] && store.metricEvalResults[m.id].value != null">
                      <div class="text-cyan-400 font-bold font-mono text-lg">{{ formatNumber(store.metricEvalResults[m.id].value!) }}</div>
                    </template>
                    <template v-else-if="store.metricEvalResults[m.id] && store.metricEvalResults[m.id].error">
                      <div class="text-red-400 text-xs">{{ store.metricEvalResults[m.id].error }}</div>
                    </template>
                    <template v-else>
                      <div class="text-slate-600 text-sm">—</div>
                    </template>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800 flex-wrap">
                  <button @click="handleDuplicate(m.id)" class="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-400 hover:text-slate-200">📋 复制</button>
                  <button @click="selectForChart(m.id)" :class="['text-[11px] px-2 py-1 border rounded', selectedMetricId === m.id ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-slate-200']">📈 {{ selectedMetricId === m.id ? '已选' : '查看趋势' }}</button>
                  <button v-if="store.metricHistory[m.id]?.length" @click="store.clearHistory(m.id)" class="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-400 hover:text-orange-400">清除历史({{ store.metricHistory[m.id].length }})</button>
                  <div class="flex-1"></div>
                  <button @click="handleDelete(m.id)" class="text-[11px] px-2 py-1 bg-slate-800 hover:bg-red-900/40 border border-slate-700 hover:border-red-800 rounded text-slate-400 hover:text-red-400">🗑 删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="xl:col-span-4 space-y-4">
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-3">📈 指标趋势图 {{ selectedMetric ? '· ' + selectedMetric.name : '' }}</h3>
            <div ref="trendRef" class="w-full rounded" style="height:260px;background:#0f172a;"></div>
            <div v-if="!selectedMetric" class="text-xs text-slate-500 mt-2 text-center">💡 点击指标卡片的「查看趋势」显示历史走势（每次模拟自动记录）</div>
            <div v-else-if="!store.metricHistory[selectedMetric.id]?.length" class="text-xs text-slate-500 mt-2 text-center">暂无历史数据，运行模拟后自动记录</div>
          </div>
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-slate-400">📊 指标汇总面板</h3>
              <button v-if="countEvaluableMetrics" @click="store.evaluateAllMetrics" class="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-400">刷新</button>
            </div>
            <div v-if="store.customMetrics.length === 0" class="text-center py-6 text-slate-500 text-xs">创建指标后在此查看所有计算结果</div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div v-for="m in store.customMetrics" :key="'card-' + m.id" @click="selectForChart(m.id)"
                class="bg-slate-900/60 rounded-lg p-3 border cursor-pointer transition-all hover:-translate-y-0.5"
                :class="selectedMetricId === m.id ? 'border-cyan-500 shadow-lg shadow-cyan-900/20' : 'border-slate-700 hover:border-slate-600'">
                <div class="flex items-center justify-between mb-1">
                  <div class="text-xs text-slate-500 truncate pr-2">{{ m.name }}</div>
                  <span v-if="store.metricEvalResults[m.id]?.value != null" class="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                  <span v-else class="w-2 h-2 rounded-full bg-slate-600 shrink-0"></span>
                </div>
                <template v-if="store.metricEvalResults[m.id]?.value != null">
                  <div class="text-xl font-bold font-mono text-cyan-400">{{ formatNumber(store.metricEvalResults[m.id].value!) }}</div>
                </template>
                <template v-else>
                  <div class="text-xs text-red-400">{{ store.metricEvalResults[m.id]?.error || '无数据' }}</div>
                </template>
                <div class="text-[10px] text-slate-600 font-mono mt-1 truncate">= {{ m.expression }}</div>
              </div>
            </div>
          </div>
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-3">💡 配方灵感 · 快速模板</h3>
            <div class="space-y-1.5">
              <button v-for="tpl in templates" :key="tpl.name" @click="applyTemplate(tpl)" class="w-full text-left p-2.5 bg-slate-900/50 hover:bg-amber-900/20 border border-slate-700 hover:border-amber-600 rounded transition-all group">
                <div class="text-sm font-bold text-amber-300 group-hover:text-amber-400">{{ tpl.name }}</div>
                <div class="text-[11px] text-slate-500 mt-0.5">{{ tpl.desc }}</div>
                <div class="text-[11px] font-mono text-cyan-500/80 mt-1">{{ tpl.expr }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useMCStore, SCENARIOS, STATISTICS, type StatisticDef, type CustomMetric } from './store/mc'

const store = useMCStore()
const convergenceRef = ref<HTMLDivElement | null>(null)
const histogramRef = ref<HTMLDivElement | null>(null)
const trendRef = ref<HTMLDivElement | null>(null)
const exprInputRef = ref<HTMLInputElement | null>(null)
const group1Input = ref('5.1,4.8,5.3,4.9,5.2,5.0,4.7,5.1,5.4,4.8')
const group2Input = ref('4.6,4.2,4.9,4.3,4.5,4.7,4.4,4.8,4.1,4.6')
let convChart: echarts.ECharts | null = null
let histChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null

const activeTab = ref<'simulate' | 'workshop'>('simulate')
const selectedMetricId = ref<string | null>(null)
const selectedMetric = computed<CustomMetric | null>(() => store.customMetrics.find(m => m.id === selectedMetricId.value) || null)

const form = ref({ id: '' as string, name: '', expression: '', description: '' })
const exprValid = ref(true)
const exprError = ref('')
const livePreview = ref<number | null>(null)

const categoryNames: Record<string, string> = { simulation: '模拟输出', sample: '样本统计', hypothesis: '假设检验', derived: '派生指标' }
const statCategories = computed(() => store.statisticsByCategory())
const operators = ['+', '-', '*', '/', '%', '(', ')', '^2']
const constants = [{ sym: 'PI', name: 'π ≈ 3.14159' }, { sym: 'E', name: 'e ≈ 2.71828' }, { sym: 'LN2', name: 'ln2' }, { sym: 'LN10', name: 'ln10' }, { sym: 'SQRT2', name: '√2' }, { sym: '2', name: '数字2' }, { sym: '100', name: '数字100' }, { sym: '0.5', name: '0.5' }]
const functions = ['sqrt', 'abs', 'pow', 'exp', 'log', 'log10', 'log2', 'sin', 'cos', 'tan', 'ceil', 'floor', 'round', 'sign', 'max', 'min']

const templates = [
  { name: '🎯 相对误差百分比', desc: '误差占真实值比例（%）', expr: '(error / trueValue) * 100', description: '衡量估算偏离真实值的百分比程度' },
  { name: '📐 变异系数', desc: '标准差/均值，离散度指标', expr: 'std / mean', description: '无量纲的离散程度度量，便于跨分布比较' },
  { name: '📊 信噪比 SNR', desc: '均值/标准差', expr: 'mean / std', description: '信号强度与噪声水平的比值' },
  { name: '📏 标准化估算', desc: '(估算-均值)/标准差', expr: '(estimate - mean) / std', description: '估算值相对样本分布的Z分数' },
  { name: '🎪 极值范围比', desc: '极差/标准差', expr: 'range / std', description: '反映样本分布的尾部厚度' },
  { name: '⚖️ 误差精度指数', desc: '1 - 相对误差（越大越好）', expr: 'max(0, 1 - error / trueValue)', description: '综合精度评估，取值0-1' },
  { name: '🔬 显著性指标', desc: '-log10(p值)', expr: '-log10(p_value)', description: '假设检验显著性强度，越大越显著' },
  { name: '🎭 偏峰综合指标', desc: '偏度平方+峰度', expr: 'pow(skewness, 2) + kurtosis', description: '综合衡量分布偏离正态的程度' }
]

const canSave = computed(() => {
  return form.value.name.trim().length > 0 && form.value.expression.trim().length > 0 && exprValid.value
})

const countEvaluableMetrics = computed(() => {
  return store.customMetrics.filter(m => store.metricEvalResults[m.id]?.value != null).length
})

function initCharts() {
  if (convergenceRef.value) convChart = echarts.init(convergenceRef.value, 'dark')
  if (histogramRef.value) histChart = echarts.init(histogramRef.value, 'dark')
  if (trendRef.value) trendChart = echarts.init(trendRef.value, 'dark')
}

function updateCharts() {
  if (convChart && store.convergenceData.length > 0) {
    convChart.setOption({
      backgroundColor: '#0f172a',
      grid: { top: 20, bottom: 35, left: 65, right: 20 },
      xAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      series: [{ type: 'line', data: store.convergenceData, smooth: true, lineStyle: { color: '#06b6d4', width: 2 }, areaStyle: { color: 'rgba(6,182,212,0.1)' }, symbol: 'none' }],
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#475569' }
    })
  }
  if (histChart && store.histogramData.xAxis.length > 0) {
    histChart.setOption({
      backgroundColor: '#0f172a',
      grid: { top: 15, bottom: 40, left: 55, right: 15 },
      xAxis: { type: 'category', data: store.histogramData.xAxis, axisLabel: { color: '#94a3b8', fontSize: 9, rotate: 30 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      series: [{ type: 'bar', data: store.histogramData.data, itemStyle: { color: '#8b5cf6' } }],
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#475569' }
    })
  }
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChart) return
  if (!selectedMetric.value || !store.metricHistory[selectedMetric.value.id]?.length) {
    trendChart.setOption({ backgroundColor: '#0f172a', title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#475569', fontSize: 14, fontWeight: 'normal' } }, grid: { top: 10, bottom: 10, left: 10, right: 10 }, xAxis: { show: false }, yAxis: { show: false }, series: [] })
    return
  }
  const data = store.metricHistory[selectedMetric.value.id]
  const chartData: [number, number][] = data.map((v, i) => [i, Number(v.toFixed(6))])
  trendChart.setOption({
    backgroundColor: '#0f172a',
    grid: { top: 20, bottom: 35, left: 55, right: 20 },
    tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#475569', formatter: (params: any) => {
      const p = Array.isArray(params) ? params[0] : params
      return `第${p.data[0] + 1}次模拟<br/><span style="color:#f59e0b;font-weight:bold">${selectedMetric.value?.name}：${formatNumber(p.data[1])}</span>`
    } },
    xAxis: { type: 'value', name: '运行次数', nameTextStyle: { color: '#64748b', fontSize: 10 }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
    yAxis: { type: 'value', scale: true, axisLabel: { color: '#94a3b8', fontSize: 10 } },
    series: [{
      type: 'line',
      data: chartData,
      smooth: true,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#f59e0b', width: 2.5 },
      itemStyle: { color: '#f59e0b', borderColor: '#fcd34d', borderWidth: 1.5 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(245,158,11,0.35)' }, { offset: 1, color: 'rgba(245,158,11,0.02)' }] } }
    }]
  })
}

function runTest() {
  const g1 = group1Input.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
  const g2 = group2Input.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
  if (g1.length > 1 && g2.length > 1) store.runTest(g1, g2)
}

function formatNumber(n: number): string {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs === 0) return '0'
  if (abs >= 1e6 || abs < 1e-4) return n.toExponential(4)
  if (abs >= 100) return n.toFixed(2)
  if (abs >= 1) return n.toFixed(4)
  return n.toFixed(6)
}

function insertStat(s: StatisticDef) {
  insertText(s.id)
}

function insertText(text: string) {
  const el = exprInputRef.value
  if (!el) { form.value.expression += text; onExprInput(); return }
  const start = el.selectionStart ?? form.value.expression.length
  const end = el.selectionEnd ?? form.value.expression.length
  const before = form.value.expression.slice(0, start)
  const after = form.value.expression.slice(end)
  const paddedBefore = before && !/[+\-*/%^(\s]$/.test(before.slice(-1)) ? before + ' ' : before
  const paddedAfter = after && !/[+\-*/%^)\s]/.test(after[0]) ? ' ' + after : after
  form.value.expression = paddedBefore + text + paddedAfter
  nextTick(() => {
    const pos = paddedBefore.length + text.length
    el.focus()
    el.setSelectionRange(pos, pos)
  })
  onExprInput()
}

function onExprInput() {
  if (!form.value.expression.trim()) { exprValid.value = true; exprError.value = ''; livePreview.value = null; return }
  const r = store.evaluateExpression(form.value.expression)
  const v = store.validateExpression(form.value.expression)
  if (!v.valid) { exprValid.value = false; exprError.value = v.error || '表达式无效'; livePreview.value = null; return }
  exprValid.value = true
  exprError.value = ''
  livePreview.value = r.value
}

function handleSave() {
  if (!canSave.value) return
  const m = store.addMetric(form.value.name.trim(), form.value.expression.trim(), form.value.description.trim())
  if (m) { clearForm() }
}

function handleUpdate() {
  if (!canSave.value || !form.value.id) return
  const ok = store.updateMetric(form.value.id, { name: form.value.name.trim(), expression: form.value.expression.trim(), description: form.value.description.trim() })
  if (ok) { resetForm() }
}

function handleEdit(m: CustomMetric) {
  form.value = { id: m.id, name: m.name, expression: m.expression, description: m.description }
  onExprInput()
  nextTick(() => { exprInputRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
}

function handleDelete(id: string) {
  if (!confirm('确定删除此自定义指标？')) return
  store.deleteMetric(id)
  if (selectedMetricId.value === id) selectedMetricId.value = null
  if (form.value.id === id) resetForm()
}

function handleDuplicate(id: string) {
  store.duplicateMetric(id)
}

function handleClearAll() {
  if (!confirm('确定清空全部自定义指标？此操作不可撤销')) return
  const ids = [...store.customMetrics.map(m => m.id)]
  ids.forEach(id => store.deleteMetric(id))
  selectedMetricId.value = null
  resetForm()
}

function clearForm() {
  form.value = { id: '', name: '', expression: '', description: '' }
  exprValid.value = true; exprError.value = ''; livePreview.value = null
}

function resetForm() { clearForm() }

function selectForChart(id: string) {
  selectedMetricId.value = selectedMetricId.value === id ? null : id
  nextTick(() => updateTrendChart())
}

function applyTemplate(tpl: { name: string; expr: string; description: string }) {
  form.value = { id: '', name: tpl.name, expression: tpl.expr, description: tpl.description }
  onExprInput()
  nextTick(() => { exprInputRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }); exprInputRef.value?.focus() })
}

onMounted(() => {
  initCharts()
  store.runSimulation()
  store.evaluateAllMetrics()
  window.addEventListener('resize', () => {
    convChart?.resize(); histChart?.resize(); trendChart?.resize()
  })
})

watch(() => store.result, () => { updateCharts() }, { deep: true })
watch(selectedMetricId, () => { nextTick(() => updateTrendChart()) })
watch(() => store.metricHistory, () => { nextTick(() => updateTrendChart()) }, { deep: true })
</script>
