<template>
  <div class="editor-page">
    <div class="editor-panel">
      <h2>🖼️ 场景热点坐标编辑器</h2>
      <p class="editor-desc">点击图片上物品所在位置来设置热点坐标</p>

      <!-- 选择案例 -->
      <div class="controls-row">
        <div class="control-group">
          <label>案例：</label>
          <select v-model="selectedCase" @change="onCaseChange">
            <option value="">-- 选择案例 --</option>
            <option v-for="c in cases" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="control-group" v-if="selectedCase">
          <label>场景：</label>
          <select v-model="selectedSceneIndex" @change="onSceneChange">
            <option v-for="(s, i) in loadedScenes" :key="s.sceneId" :value="i">
              {{ s.sceneName }}
            </option>
          </select>
        </div>

        <div class="control-group" v-if="currentScene">
          <label>选择热点：</label>
          <select v-model="selectedHotspotIndex">
            <option v-for="(h, i) in currentScene.hotspots" :key="h.hotspotId" :value="i">
              {{ h.hotspotId }} - {{ h.tooltip }}
            </option>
          </select>
        </div>
      </div>

      <!-- 图片 + 坐标显示 -->
      <div class="editor-area" v-if="currentScene">
        <div class="image-click-zone" ref="imageZoneRef">
          <img
            :src="currentScene.imageUrl"
            :alt="currentScene.sceneName"
            class="editor-image"
            ref="editorImageRef"
            @load="onImageLoad"
            @click="onImageClick"
          />

          <!-- 所有热点标记 -->
          <div
            v-for="(h, i) in currentScene.hotspots"
            :key="h.hotspotId"
            class="hotspot-marker"
            :class="{ 'marker-active': selectedHotspotIndex === i }"
            :style="{
              left: h.x + '%',
              top: h.y + '%',
              width: h.width + '%',
              height: h.height + '%'
            }"
            @click.stop="selectHotspot(i)"
          >
            <div class="marker-dot" :class="{ 'dot-active': selectedHotspotIndex === i }">
              {{ i + 1 }}
            </div>
          </div>
        </div>

        <!-- 坐标面板 -->
        <div class="coord-panel" v-if="selectedHotspot">
          <h3>{{ selectedHotspot.hotspotId }}</h3>
          <p class="hotspot-hint">{{ selectedHotspot.tooltip }}</p>

          <div class="coord-grid">
            <div class="coord-item">
              <label>X (%)</label>
              <input type="number" v-model.number="selectedHotspot.x" step="1" min="0" max="100"
                     @input="onCoordChange" />
              <span class="coord-hint">距左</span>
            </div>
            <div class="coord-item">
              <label>Y (%)</label>
              <input type="number" v-model.number="selectedHotspot.y" step="1" min="0" max="100"
                     @input="onCoordChange" />
              <span class="coord-hint">距顶</span>
            </div>
            <div class="coord-item">
              <label>W (%)</label>
              <input type="number" v-model.number="selectedHotspot.width" step="1" min="2" max="30"
                     @input="onCoordChange" />
              <span class="coord-hint">宽度</span>
            </div>
            <div class="coord-item">
              <label>H (%)</label>
              <input type="number" v-model.number="selectedHotspot.height" step="1" min="2" max="30"
                     @input="onCoordChange" />
              <span class="coord-hint">高度</span>
            </div>
          </div>

          <div class="hotspot-preview" v-if="selectedHotspot">
            对应线索：<strong>{{ getClueInfo(selectedHotspot.clueId) }}</strong>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-row" v-if="currentScene">
        <button class="btn-copy" @click="copyCoordinates">
          📋 复制坐标 JSON
        </button>
        <span class="copy-status" v-if="copyStatus">{{ copyStatus }}</span>
      </div>

      <!-- 坐标输出预览 -->
      <div class="output-section" v-if="outputJSON">
        <h3>当前坐标数据 (可直接替换 JSON 中 hotspots 数组)</h3>
        <pre class="json-output">{{ outputJSON }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import lungCancer from '@/data/cases/lung_cancer.json'
import stomachCancer from '@/data/cases/stomach_cancer.json'
import colorectalCancer from '@/data/cases/colorectal_cancer.json'

interface Hotspot {
  hotspotId: string
  x: number
  y: number
  width: number
  height: number
  clueId: string
  tooltip: string
  isHidden: boolean
}

interface Scene {
  sceneId: string
  sceneName: string
  description: string
  imageUrl: string
  hotspots: Hotspot[]
}

interface Clue {
  clueId: string
  name: string
  description: string
}

interface CaseData {
  clues: Clue[]
  scenes: Scene[]
}

const cases = [
  { id: 'lung_cancer', name: '🫁 肺癌 - 出租车司机的咳嗽' },
  { id: 'stomach_cancer', name: '🍽️ 胃癌 - 管理者的胃痛' },
  { id: 'colorectal_cancer', name: '🏢 结直肠癌 - 职员的便血' },
]

const caseDataMap: Record<string, CaseData> = {
  lung_cancer: lungCancer as CaseData,
  stomach_cancer: stomachCancer as CaseData,
  colorectal_cancer: colorectalCancer as CaseData,
}

const selectedCase = ref('')
const selectedSceneIndex = ref(0)
const selectedHotspotIndex = ref(0)
const copyStatus = ref('')

const loadedScenes = ref<Scene[]>([])
const caseClues = ref<Clue[]>([])
const editorImageRef = ref<HTMLImageElement | null>(null)
const imageZoneRef = ref<HTMLDivElement | null>(null)

const currentScene = computed(() => {
  if (loadedScenes.value.length === 0) return null
  return loadedScenes.value[selectedSceneIndex.value] || null
})

const selectedHotspot = computed(() => {
  if (!currentScene.value) return null
  return currentScene.value.hotspots[selectedHotspotIndex.value] || null
})

const outputJSON = computed(() => {
  if (!currentScene.value) return ''
  return JSON.stringify(currentScene.value.hotspots, null, 2)
})

const getClueInfo = (clueId: string) => {
  const clue = caseClues.value.find((c: any) => c.clueId === clueId)
  return clue ? `${clue.name} - ${clue.description}` : clueId
}

const onCaseChange = () => {
  if (!selectedCase.value) {
    loadedScenes.value = []
    caseClues.value = []
    return
  }

  const caseData = caseDataMap[selectedCase.value]
  if (!caseData) {
    console.error('未找到案例：', selectedCase.value)
    return
  }
  caseClues.value = caseData.clues
  // 深拷贝，避免直接修改原始数据
  loadedScenes.value = caseData.scenes.map(s => ({
    ...s,
    hotspots: s.hotspots.map(h => ({ ...h }))
  }))
  selectedSceneIndex.value = 0
  selectedHotspotIndex.value = 0
  copyStatus.value = ''
}

const onSceneChange = () => {
  selectedHotspotIndex.value = 0
  copyStatus.value = ''
}

const selectHotspot = (index: number) => {
  selectedHotspotIndex.value = index
}

const onCoordChange = () => {
  // 触发响应式更新
  copyStatus.value = ''
}

const onImageLoad = () => {
  // 图片加载完成
}

const onImageClick = (e: MouseEvent) => {
  if (!editorImageRef.value || !currentScene.value || selectedHotspotIndex.value === null) return

  const img = editorImageRef.value
  const rect = img.getBoundingClientRect()

  // 计算点击位置相对于图片的百分比
  const clickX = ((e.clientX - rect.left) / rect.width) * 100
  const clickY = ((e.clientY - rect.top) / rect.height) * 100

  // 更新当前选中热点的坐标
  const hotspot = currentScene.value.hotspots[selectedHotspotIndex.value]
  if (hotspot) {
    hotspot.x = Math.round(clickX)
    hotspot.y = Math.round(clickY)
    copyStatus.value = '✅ 坐标已更新'
  }
}

// 生成完整的 hotspots JSON 输出（带注释）
const copyCoordinates = () => {
  if (!currentScene.value) return

  const jsonStr = JSON.stringify(currentScene.value.hotspots, null, 2)
  navigator.clipboard.writeText(jsonStr).then(() => {
    copyStatus.value = '✅ 已复制到剪贴板！请粘贴到对应 JSON 文件'
    setTimeout(() => { copyStatus.value = '' }, 5000)
  }).catch(() => {
    copyStatus.value = '❌ 复制失败，请手动复制下方 JSON'
  })
}
</script>

<style scoped>
.editor-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a1a 0%, #16213e 50%, #1a1a2e 100%);
  padding: 1.5rem;
  color: #e0e0ff;
}

.editor-panel {
  max-width: 1400px;
  margin: 0 auto;
}

.editor-panel h2 {
  color: #8af5c3;
  font-size: 1.5rem;
  margin-bottom: 0.3rem;
}

.editor-desc {
  color: #606080;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.controls-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-group label {
  color: #a0a0cc;
  font-size: 0.85rem;
  min-width: 50px;
}

.control-group select {
  background: #1a1a2e;
  color: #e0e0ff;
  border: 1px solid #533483;
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.editor-area {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.image-click-zone {
  position: relative;
  flex: 1;
  max-width: 1000px;
  border: 2px solid #533483;
  border-radius: 12px;
  overflow: hidden;
  cursor: crosshair;
  box-shadow: 0 0 30px rgba(83, 52, 131, 0.5);
}

.editor-image {
  width: 100%;
  display: block;
}

/* 热点标记 */
.hotspot-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.marker-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 100, 100, 0.7);
  border: 2px solid rgba(255, 200, 200, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(255, 100, 100, 0.5);
}

.marker-dot.dot-active {
  background: rgba(138, 245, 195, 0.9);
  border-color: #8af5c3;
  transform: scale(1.3);
  box-shadow: 0 0 20px rgba(138, 245, 195, 0.7);
}

.hotspot-marker:hover .marker-dot {
  transform: scale(1.2);
}

/* 坐标面板 */
.coord-panel {
  width: 320px;
  flex-shrink: 0;
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid #533483;
  border-radius: 12px;
  padding: 1.5rem;
  position: sticky;
  top: 1.5rem;
}

.coord-panel h3 {
  color: #8af5c3;
  font-size: 1.1rem;
  margin-bottom: 0.3rem;
}

.hotspot-hint {
  color: #606080;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.coord-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.coord-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.coord-item label {
  color: #a0a0cc;
  font-size: 0.75rem;
  font-weight: 600;
}

.coord-item input {
  background: #0a0a1a;
  color: #8af5c3;
  border: 1px solid #533483;
  border-radius: 6px;
  padding: 0.4rem;
  font-size: 0.9rem;
  text-align: center;
  width: 80px;
  font-family: monospace;
}

.coord-item input:focus {
  outline: none;
  border-color: #8af5c3;
  box-shadow: 0 0 10px rgba(138, 245, 195, 0.3);
}

.coord-hint {
  color: #606080;
  font-size: 0.7rem;
}

.hotspot-preview {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(83, 52, 131, 0.15);
  border-radius: 8px;
  font-size: 0.8rem;
  color: #a0a0cc;
  line-height: 1.5;
}

.hotspot-preview strong {
  color: #e0e0ff;
}

/* 操作行 */
.action-row {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-copy {
  background: #533483;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.btn-copy:hover {
  background: #6b44a8;
  transform: translateY(-1px);
}

.copy-status {
  color: #8af5c3;
  font-size: 0.85rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 输出区域 */
.output-section {
  margin-top: 1.5rem;
}

.output-section h3 {
  color: #a0a0cc;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.json-output {
  background: #0a0a1a;
  border: 1px solid #533483;
  border-radius: 8px;
  padding: 1rem;
  color: #8af5c3;
  font-size: 0.8rem;
  font-family: 'Consolas', 'Monaco', monospace;
  overflow-x: auto;
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 500px;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .editor-area {
    flex-direction: column;
  }

  .coord-panel {
    width: 100%;
    position: relative;
    top: 0;
  }
}
</style>
