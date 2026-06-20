<template>
  <div class="investigation-file-bar">
    <!-- 左侧：案例名称和当前场景 -->
    <div class="file-left">
      <div class="case-name">{{ caseData.caseName }}</div>
      <div class="current-scene">{{ currentSceneName }}</div>
    </div>
    
    <!-- 中间：调查档案信息 -->
    <div class="file-center">
      <!-- 当前年龄 -->
      <div class="file-item">
        <span class="file-label">年龄</span>
        <span class="file-value age">{{ gameState?.investigationFile?.currentAge ?? '--' }}岁</span>
      </div>
      
      <!-- 剩余调查点数 -->
      <div class="file-item" :title="pointsTooltip">
        <span class="file-label">调查点数</span>
        <div class="points-bar">
          <div 
            class="points-fill" 
            :style="{ width: ((gameState?.investigationFile?.investigationPoints ?? 0) / 10 * 100) + '%' }"
          ></div>
          <span class="points-text">{{ gameState?.investigationFile?.investigationPoints ?? 0 }}/10</span>
        </div>
      </div>
      
      <!-- 已发现线索 -->
      <div class="file-item">
        <span class="file-label">线索</span>
        <span class="file-value">{{ gameState?.investigationFile?.discoveredClues?.length ?? 0 }}/{{ totalClues }}</span>
      </div>
      
      <!-- 已完成检查 -->
      <div class="file-item" v-if="(gameState?.investigationFile?.completedChecks?.length ?? 0) > 0">
        <span class="file-label">检查</span>
        <div class="checks-list">
            <span 
              v-for="(check, index) in (gameState?.investigationFile?.completedChecks ?? [])" 
              :key="index"
              class="check-tag"
            >
              {{ check }}
            </span>
        </div>
      </div>
    </div>
    
    <!-- 右侧：音乐 + 菜单按钮 -->
    <div class="file-right">
      <button class="music-button" @click="handleBgmToggle" :title="bgmEnabled ? '关闭背景音乐' : '开启背景音乐'">
        {{ bgmEnabled ? '🎵' : '🎵' }}
        <span v-if="!bgmEnabled" class="music-off-slash">🚫</span>
      </button>
      <button class="menu-button" @click="showMenu = !showMenu">
        <span class="menu-icon">☰</span>
      </button>
    </div>
    
    <!-- 下拉菜单 -->
    <div v-if="showMenu" class="dropdown-menu">
      <button class="menu-item" @click="goHome">返回档案室</button>
      <button class="menu-item" @click="resetGame">重新开始</button>
      <button class="menu-item" @click="showClues">查看线索</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { bgmEnabled, toggleBgm } from '@/composables/useSound'
import type { CaseData } from '@/types/case'

const props = defineProps<{
  caseData: CaseData
  gameState: any
}>()

const emit = defineEmits<{
  'show-clues': []
}>()

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const showMenu = ref(false)

// 音乐开关
const handleBgmToggle = () => {
  toggleBgm()
}



const currentSceneName = computed(() => {
  const sceneId = props.gameState?.currentSceneId
  if (!sceneId) return ''
  const scene = props.caseData?.scenes?.find(s => s.sceneId === sceneId)
  return scene ? scene.sceneName : ''
})

const totalClues = computed(() => {
  return props.caseData?.clues?.length || 0
})

// 调查点数悬浮提示
const pointsTooltip = computed(() => {
  const pts = props.gameState?.investigationFile?.investigationPoints ?? 0
  return `调查点数：${pts}/10\n用于发现隐藏线索和做出特殊决策，请合理分配使用`
})

const goHome = () => {
  router.push({ name: 'archive' })
  showMenu.value = false
}

const resetGame = () => {
  gameStore.resetGame()
  showMenu.value = false
  // 导航到第一个场景，与从 CaseIntroPage 点击"开始调查"行为一致
  const firstSceneId = props.caseData?.scenes?.[0]?.sceneId
  const caseId = route.params.caseId as string  // 使用路由的 caseId（如 stomach_cancer），而非 JSON 的 caseId（如 stomach_cancer_001）
  if (firstSceneId && caseId) {
    router.push({
      name: 'scene-explore',
      params: { caseId, sceneId: firstSceneId }
    })
  }
}

const showClues = () => {
  emit('show-clues')
  showMenu.value = false
}
</script>

<style scoped>
.investigation-file-bar {
  width: 100%;
  height: 60px;
  background: rgba(10, 10, 26, 0.95);
  border-bottom: 2px solid #533483;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  padding-top: max(0px, env(safe-area-inset-top, 0px));
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.file-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 150px;
}

.case-name {
  color: #e0e0ff;
  font-weight: 600;
  font-size: 1rem;
}

.current-scene {
  color: #606080;
  font-size: 0.8rem;
}

.file-center {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex: 1;
  justify-content: center;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-label {
  color: #606080;
  font-size: 0.85rem;
  white-space: nowrap;
}

.file-value {
  color: #e0e0ff;
  font-weight: 600;
  font-size: 0.95rem;
}

.file-value.age {
  color: #8af5c3;
  font-size: 1.1rem;
  text-shadow: 0 0 10px rgba(138, 245, 195, 0.5);
}

.points-bar {
  width: 100px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.points-fill {
  height: 100%;
  background: linear-gradient(90deg, #533483, #8af5c3);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.points-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

.checks-list {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.check-tag {
  background: rgba(138, 245, 195, 0.2);
  color: #8af5c3;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
}

.file-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 100px;
  justify-content: flex-end;
}

.music-button {
  background: transparent;
  border: 1px solid #533483;
  color: #ffffff !important;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 1.1rem;
  padding: 0;
  position: relative;
}

.music-off-slash {
  position: absolute;
  font-size: 0.7rem;
  bottom: 2px;
  right: 2px;
  opacity: 0.9;
}

.music-button:hover {
  background: rgba(83, 52, 131, 0.3);
  border-color: #8af5c3;
}

.menu-button {
  background: transparent;
  border: 1px solid #533483;
  color: #ffffff !important;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.menu-button:hover {
  background: rgba(83, 52, 131, 0.3);
  border-color: #8af5c3;
}

.menu-icon {
  font-size: 1.2rem;
}

.dropdown-menu {
  position: absolute;
  top: 65px;
  right: 4rem;
  background: rgba(26, 26, 46, 0.98);
  border: 2px solid #533483;
  border-radius: 8px;
  padding: 0.5rem;
  min-width: 150px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
}

.menu-item {
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  color: #e0e0ff;
  padding: 0.8rem 1rem;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.menu-item:hover {
  background: rgba(83, 52, 131, 0.3);
  color: #8af5c3;
}

@media (max-width: 1024px) {
  .file-center {
    gap: 1rem;
  }
  
  .checks-list {
    display: none;
  }
}

@media (max-width: 768px) {
  .investigation-file-bar {
    padding: 0 0.6rem;
    height: 50px;
  }
  
  .file-center {
    gap: 0.3rem;
  }
  
  .file-label {
    display: none;
  }

  .file-right {
    gap: 0.3rem;
    min-width: 0;
  }

  .music-button, .menu-button {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .menu-icon {
    font-size: 1rem;
  }

  .dropdown-menu {
    right: 0.3rem;
    top: 52px;
    min-width: 130px;
  }

  .file-left {
    min-width: 0;
    overflow: hidden;
  }

  .case-name {
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .current-scene {
    font-size: 0.7rem;
  }
}
</style>
