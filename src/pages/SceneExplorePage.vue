<template>
  <div class="scene-explore-page">
    <!-- 调查档案栏 -->
    <InvestigationFileBar v-if="caseData.clues" :caseData="caseData" :gameState="safeGameState" @show-clues="showAllClues = true" />
    
    <!-- 加载中 -->
    <div v-if="!caseData.clues" class="loading-container">
      <p class="loading-text">正在加载场景...</p>
    </div>
    
    <!-- 场景显示区域 -->
    <div v-else class="scene-container">
      <!-- 场景图片 -->
      <div class="scene-image-wrapper">
        <img 
          v-if="!imageError"
          :key="currentScene.sceneId"
          :src="currentScene.imageUrl" 
          :alt="currentScene.sceneName"
          class="scene-image"
          @error="imageError = true"
          @load="imageError = false"
        />
        <!-- 图片加载失败时的 CSS 占位图 -->
        <div v-if="imageError" class="scene-image-fallback">
          <div class="fallback-icon">🖼️</div>
          <div class="fallback-title">{{ currentScene.sceneName }}</div>
          <div class="fallback-desc">{{ currentScene.description }}</div>
        </div>
        
        <!-- 光点热点 -->
        <div
          v-for="hotspot in visibleHotspots"
          :key="hotspot.hotspotId"
          class="glow-hotspot"
          :class="{ 
            'hotspot-discovered': isHotspotDiscovered(hotspot),
            'hotspot-hover': hoveredHotspot === hotspot.hotspotId
          }"
          :style="{
            left: hotspot.x + '%',
            top: hotspot.y + '%',
            width: hotspot.width + '%',
            height: hotspot.height + '%'
          }"
          @click="discoverClueFromHotspot(hotspot)"
          @mouseenter="hoveredHotspot = hotspot.hotspotId"
          @mouseleave="hoveredHotspot = ''"
        >
          <!-- 脉冲光圈 -->
          <div class="pulse-ring" v-if="!isHotspotDiscovered(hotspot)"></div>
          <div class="pulse-ring pulse-ring-2" v-if="!isHotspotDiscovered(hotspot)"></div>
          
          <!-- 中心光点 -->
          <div class="glow-dot" :class="{ 'dot-found': isHotspotDiscovered(hotspot) }">
            <span v-if="!isHotspotDiscovered(hotspot)" class="dot-question">?</span>
            <span v-else class="dot-check">✓</span>
          </div>
          
          <!-- 悬停提示气泡 -->
          <div v-if="hoveredHotspot === hotspot.hotspotId" class="hotspot-tooltip">
            <span class="tooltip-dot"></span>
            {{ isHotspotDiscovered(hotspot) ? '已调查' : hotspot.tooltip }}
          </div>
        </div>
      </div>
      
      <!-- 线索发现提示 -->
      <transition name="slide-up">
        <div v-if="showClueCard" class="clue-discovery-card">
          <div class="clue-card-header">
            <span class="clue-type-badge" :class="'type-' + discoveredClue.type">
              {{ getClueTypeText(discoveredClue.type) }}
            </span>
            <button class="close-btn" @click="showClueCard = false">&times;</button>
          </div>
          <h3 class="clue-name">{{ discoveredClue.name }}</h3>
          <p class="clue-description">{{ discoveredClue.description }}</p>
          <button class="collect-button pixel-button" @click="collectClue">
            收集线索
          </button>
        </div>
      </transition>
    </div>
    
    <!-- 底部：已发现线索栏 -->
    <div class="clue-bar">
      <div class="clue-bar-header">
        <span class="clue-count">已发现线索：{{ discoveredClues.length }}/{{ totalClues }}</span>
        <button class="view-all-btn" @click="showAllClues = true">
          查看全部
        </button>
      </div>
      <div class="clue-list">
        <div 
          v-for="clueId in discoveredClues.slice(-5)" 
          :key="clueId"
          class="clue-mini-card"
          @click="viewClueDetail(clueId)"
        >
          <span class="clue-mini-name">{{ getClueName(clueId) }}</span>
        </div>
      </div>
    </div>
    
    <!-- 所有线索模态框 -->
    <div v-if="showAllClues" class="modal-overlay" @click="showAllClues = false">
      <div class="modal-content" @click.stop>
        <h2>调查档案 - 所有线索</h2>
        <div v-if="allDiscoveredClues.length > 0" class="all-clues-list">
          <div 
            v-for="clue in allDiscoveredClues" 
            :key="clue.clueId"
            class="clue-detail-card"
          >
            <span class="clue-type-badge" :class="'type-' + clue.type">
              {{ getClueTypeText(clue.type) }}
            </span>
            <h3>{{ clue.name }}</h3>
            <p>{{ clue.description }}</p>
          </div>
        </div>
        <div v-else class="all-clues-empty">
          <p>尚未发现任何线索，请在场景中探索并收集线索。</p>
        </div>
        <button class="close-button" @click="showAllClues = false">关闭</button>
      </div>
    </div>
    
    <!-- 继续调查/做出决策按钮 -->
    <div class="action-bar">
      <button 
        v-if="canMakeDecision" 
        class="decision-button pixel-button"
        @click="goToDecision"
      >
        做出决策
      </button>
      <button 
        v-else 
        class="continue-button pixel-button"
        @click="nextScene"
      >
        继续调查
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import InvestigationFileBar from '@/components/game/InvestigationFileBar.vue'
import type { CaseData, SceneData, ClueData } from '@/types/case'
import { playClick, playClueFound, playTransition } from '@/composables/useSound'
import { loadCaseData } from '@/data/caseLoader'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const caseId = route.params.caseId as string

const caseData = ref<CaseData>({} as CaseData)
const currentScene = ref<SceneData>({} as SceneData)
const showClueCard = ref(false)
const discoveredClue = ref<ClueData>({} as ClueData)
const hoveredHotspot = ref('')
const showAllClues = ref(false)
const selectedHotspot = ref<any>(null)
const imageError = ref(false)

const safeGameState = computed(() => gameStore.gameState ?? {})

const syncCurrentScene = (targetSceneId: string) => {
  const scenes = caseData.value.scenes
  if (!scenes || scenes.length === 0) return
  const scene = scenes.find(s => s.sceneId === targetSceneId)
  if (scene) {
    currentScene.value = scene
    imageError.value = false
    gameStore.setCurrentSceneId(targetSceneId)
  }
}

onMounted(async () => {
  try {
    caseData.value = loadCaseData(caseId)

    if (!gameStore.isGameInitialized || gameStore.currentCase?.caseId !== caseData.value.caseId) {
      gameStore.initGame(caseData.value)
    }

    // 自动检测 localStorage 恢复标记，注入场景线索（重新调查场景）
    gameStore.recoverCluesAfterReset(caseId)
    
    syncCurrentScene(route.params.sceneId as string)
  } catch (error) {
    console.error('加载场景数据失败：', error)
  }
})

watch(() => route.params.sceneId, (newSceneId) => {
  if (newSceneId) syncCurrentScene(newSceneId as string)
})

const discoveredClues = computed(() => {
  return gameStore.discoveredClues || []
})

const totalClues = computed(() => {
  return caseData.value.clues?.length || 0
})

const allDiscoveredClues = computed(() => {
  if (!caseData.value.clues) return []
  return caseData.value.clues.filter(clue => 
    discoveredClues.value.includes(clue.clueId)
  )
})

const visibleHotspots = computed(() => {
  if (!currentScene.value.hotspots) return []
  return currentScene.value.hotspots.filter(h => {
    if (h.isHidden) return canShowHotspot(h)
    return true
  })
})

const canMakeDecision = computed(() => {
  return discoveredClues.value.length >= 2
})

const isHotspotDiscovered = (hotspot: any) => {
  return discoveredClues.value.includes(hotspot.clueId)
}

const canShowHotspot = (hotspot: any) => {
  const clue = caseData.value.clues.find((c: any) => c.clueId === hotspot.clueId)
  if (!clue) return false
  
  if (clue.prerequisites.length > 0) {
    return clue.prerequisites.every((preId: string) => 
      discoveredClues.value.includes(preId)
    )
  }
  
  return true
}

const discoverClueFromHotspot = (hotspot: any) => {
  if (hotspot.isHidden && !canShowHotspot(hotspot)) return
  
  const clue = caseData.value.clues.find((c: any) => c.clueId === hotspot.clueId)
  if (!clue) return
  
  if (discoveredClues.value.includes(clue.clueId)) {
    playClick()
    viewClueDetail(clue.clueId)
    return
  }
  
  playClueFound()
  discoveredClue.value = clue
  selectedHotspot.value = hotspot
  showClueCard.value = true
}

const collectClue = () => {
  if (!discoveredClue.value) return
  
  playClick()
  gameStore.discoverClue(discoveredClue.value.clueId)
  showClueCard.value = false
}

const viewClueDetail = (clueId: string) => {
  const clue = caseData.value.clues.find((c: any) => c.clueId === clueId)
  if (clue) {
    discoveredClue.value = clue
    showClueCard.value = true
  }
}

const getClueName = (clueId: string) => {
  const clue = caseData.value.clues.find((c: any) => c.clueId === clueId)
  return clue ? clue.name : '未知线索'
}

const getClueTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'normal': '普通线索',
    'key': '关键线索',
    'hidden': '隐藏线索'
  }
  return typeMap[type] || '未知'
}

const nextScene = () => {
  playTransition()
  const scenes = caseData.value.scenes
  if (!scenes || scenes.length === 0) return
  const currentSceneId = currentScene.value.sceneId
  const currentIndex = scenes.findIndex(s => s.sceneId === currentSceneId)
  
  if (currentIndex < scenes.length - 1) {
    const targetScene = scenes[currentIndex + 1]
    router.push({
      name: 'scene-explore',
      params: {
        caseId: caseId,
        sceneId: targetScene.sceneId
      }
    })
  } else {
    goToDecision()
  }
}

const goToDecision = () => {
  playTransition()
  if (gameStore.gameState) {
    const snapshot = {
      discoveredClues: [...gameStore.gameState.investigationFile.discoveredClues],
      investigationPoints: gameStore.gameState.investigationFile.investigationPoints,
      completedChecks: [...gameStore.gameState.investigationFile.completedChecks],
      currentAge: gameStore.gameState.investigationFile.currentAge,
    }
    gameStore.saveSceneSnapshot(snapshot)
    // localStorage 备份：防止页面刷新导致重新调查时线索丢失
    try {
      localStorage.setItem(`scene_snapshot_${caseId}`, JSON.stringify(snapshot))
    } catch { /* ignore */ }
  }
  const firstDecision = caseData.value.decisionPoints?.[0]
  if (firstDecision) {
    router.push({
      name: 'decision',
      params: {
        caseId: caseId,
        decisionId: firstDecision.decisionId
      }
    })
  } else {
    router.push({ name: 'ending', params: { caseId: caseId } })
  }
}
</script>

<style scoped>
.scene-explore-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a1a 0%, #16213e 50%, #1a1a2e 100%);
}

.loading-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  color: #a0a0cc;
  font-size: 1.2rem;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.scene-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.scene-image-wrapper {
  position: relative;
  max-width: 1200px;
  width: 100%;
  height: 100%;
  border: 2px solid #533483;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(83, 52, 131, 0.5);
}

.scene-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scene-image-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1c2e 0%, #16213e 50%, #1a1a2e 100%);
  gap: 1rem;
}

.fallback-icon { font-size: 4rem; opacity: 0.6; }
.fallback-title { color: #8af5c3; font-size: 1.5rem; font-weight: 600; }
.fallback-desc { color: #606080; font-size: 0.95rem; max-width: 80%; text-align: center; }

/* ===== 光点热点 ===== */
.glow-hotspot {
  position: absolute;
  cursor: pointer;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
}

/* 脉冲光圈 */
.pulse-ring {
  position: absolute;
  width: clamp(28px, 8vw, 40px);
  height: clamp(28px, 8vw, 40px);
  border-radius: 50%;
  border: 2px solid rgba(138, 245, 195, 0.6);
  animation: pulse-expand 2s ease-out infinite;
  pointer-events: none;
}

.pulse-ring-2 {
  animation-delay: 1s;
}

@keyframes pulse-expand {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.glow-hotspot.hotspot-discovered .pulse-ring {
  animation: none;
  opacity: 0;
}

/* 中心光点 */
.glow-dot {
  width: clamp(22px, 6vw, 30px);
  height: clamp(22px, 6vw, 30px);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(138, 245, 195, 1), rgba(0, 200, 150, 0.6));
  box-shadow: 
    0 0 10px rgba(138, 245, 195, 0.8),
    0 0 25px rgba(138, 245, 195, 0.4),
    0 0 50px rgba(0, 200, 150, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

.glow-dot .dot-question {
  font-size: 0.7rem;
  font-weight: 700;
  color: #1a1a2e;
}

.glow-dot .dot-check {
  font-size: 0.75rem;
  color: #1a1a2e;
  font-weight: 700;
}

.glow-hotspot:hover .glow-dot {
  transform: scale(1.3);
  box-shadow: 
    0 0 15px rgba(138, 245, 195, 1),
    0 0 35px rgba(138, 245, 195, 0.6),
    0 0 60px rgba(0, 200, 150, 0.3);
}

.glow-dot.dot-found {
  background: radial-gradient(circle, rgba(138, 245, 195, 0.5), rgba(0, 200, 150, 0.3));
  box-shadow: 
    0 0 5px rgba(138, 245, 195, 0.4),
    0 0 12px rgba(138, 245, 195, 0.2);
}

/* 悬停提示 */
.hotspot-tooltip {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26, 26, 46, 0.95);
  border: 1px solid #8af5c3;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: #e0e0ff;
  font-size: 1rem;
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 0 15px rgba(138, 245, 195, 0.3);
}

.hotspot-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(138, 245, 195, 0.7);
}

.tooltip-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8af5c3;
  margin-right: 6px;
  vertical-align: middle;
  animation: dot-pulse 1s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* ===== 线索发现卡片 ===== */
.clue-discovery-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(26, 26, 46, 0.98);
  border: 2px solid #8af5c3;
  border-radius: 12px;
  padding: clamp(1.2rem, 3vw, 2rem);
  min-width: min(400px, 90%);
  max-width: 90%;
  box-shadow: 0 0 30px rgba(138, 245, 195, 0.5);
  z-index: 200;
}

.clue-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.clue-type-badge {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.clue-type-badge.type-normal {
  background: rgba(107, 225, 255, 0.2);
  color: #6be1ff;
}

.clue-type-badge.type-key {
  background: rgba(255, 201, 92, 0.2);
  color: #ffc95c;
}

.clue-type-badge.type-hidden {
  background: rgba(255, 194, 203, 0.2);
  color: #ffc2cb;
}

.close-btn {
  background: transparent;
  border: none;
  color: #a0a0cc;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.4rem;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clue-name {
  font-size: 1.5rem;
  color: #e0e0ff;
  margin-bottom: 0.8rem;
}

.clue-description {
  color: #a0a0cc;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.collect-button {
  display: block;
  margin: 0 auto;
}

/* ===== 底部线索栏 ===== */
.clue-bar {
  background: rgba(10, 10, 26, 0.95);
  border-top: 2px solid #533483;
  padding: 1rem;
}

.clue-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.clue-count {
  color: #a0a0cc;
  font-size: 0.9rem;
}

.view-all-btn {
  background: transparent;
  border: 1px solid #533483;
  color: #8af5c3;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  min-height: 36px;
}

.view-all-btn:hover {
  background: rgba(83, 52, 131, 0.3);
}

.clue-list {
  display: flex;
  gap: 0.8rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.clue-mini-card {
  background: rgba(83, 52, 131, 0.2);
  border: 1px solid #533483;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-height: 40px;
  display: flex;
  align-items: center;
}

.clue-mini-card:hover {
  background: rgba(83, 52, 131, 0.4);
  border-color: #8af5c3;
}

.clue-mini-name {
  color: #e0e0ff;
  font-size: 0.9rem;
}

/* ===== 模态框 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a2e;
  border: 2px solid #533483;
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h2 {
  color: #e0e0ff;
  margin-bottom: 1.5rem;
  text-align: center;
}

.all-clues-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.clue-detail-card {
  background: rgba(83, 52, 131, 0.1);
  border: 1px solid #533483;
  border-radius: 8px;
  padding: 1rem;
}

.clue-detail-card h3 {
  color: #e0e0ff;
  margin: 0.5rem 0;
}

.clue-detail-card p {
  color: #a0a0cc;
  font-size: 0.9rem;
  line-height: 1.5;
}

.all-clues-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: #606080;
  font-size: 0.95rem;
}

.close-button {
  background: #533483;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  cursor: pointer;
  display: block;
  margin: 0 auto;
}

/* ===== 底部操作栏 ===== */
.action-bar {
  padding: 1rem;
  display: flex;
  justify-content: center;
  background: rgba(10, 10, 26, 0.95);
  border-top: 1px solid rgba(83, 52, 131, 0.3);
}

.decision-button, .continue-button {
  font-size: 1.1rem;
  padding: 0.8rem 2.5rem;
}

/* ===== 过渡动画 ===== */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .clue-discovery-card {
    min-width: 90%;
    padding: 1.2rem;
  }
  
  .scene-image-wrapper {
    height: 60vh;
  }

  /* 移动端光点放大到触摸目标 */
  .glow-dot {
    min-width: 44px;
    min-height: 44px;
  }

  .glow-hotspot {
    /* 增大热点可点击区域 */
    padding: 8px;
  }

  .hotspot-tooltip {
    font-size: 0.9rem;
    bottom: calc(100% + 10px);
  }
}
</style>
