<template>
  <div class="case-intro-page">
    <!-- 调查档案（常驻界面） -->
    <InvestigationFileBar v-if="caseData.character" :caseData="caseData" :gameState="gameStore.gameState ?? {}" @show-clues="showCluePanel = true" />
    
    <div v-if="!caseData.character" class="loading-container">
      <p class="loading-text">正在加载案情...</p>
    </div>
    
    <div v-else class="intro-container">
      <!-- 左侧：角色信息 -->
      <div class="character-block">
        <div class="character-portrait">
          <div class="portrait-placeholder">👤</div>
        </div>
        <div class="character-info">
          <h2 class="character-name">{{ caseData.character.name }}</h2>
          <div class="info-item">
            <span class="label">年龄：</span>
            <span class="value">{{ caseData.character.age }}岁</span>
          </div>
          <div class="info-item">
            <span class="label">性别：</span>
            <span class="value">{{ caseData.character.gender === 'male' ? '男' : '女' }}</span>
          </div>
          <div class="info-item">
            <span class="label">职业：</span>
            <span class="value">{{ caseData.character.occupation }}</span>
          </div>
          <div class="symptoms">
            <span class="label">当前症状：</span>
            <div class="symptom-tags">
              <span v-for="symptom in caseData.character.symptoms" :key="symptom" class="symptom-tag">
                {{ symptom }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧：案件委托信 -->
      <div class="case-info-block">
        <div class="case-letter">
          <div class="letter-header">
            <h1 class="letter-title">调查委托</h1>
            <div class="letter-seal">🔍</div>
          </div>
          <div class="letter-content">
            <p class="typewriter-text">{{ typedText }}</p>
          </div>
          <button class="start-button pixel-button" @click="startInvestigation">
            开始调查
          </button>
        </div>
      </div>
    </div>

    <CluePanel
      :visible="showCluePanel"
      :caseData="caseData"
      :discoveredClueIds="discoveredClueIds"
      @close="showCluePanel = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import InvestigationFileBar from '@/components/game/InvestigationFileBar.vue'
import CluePanel from '@/components/game/CluePanel.vue'
import type { CaseData } from '@/types/case'
import { playClick, playTransition } from '@/composables/useSound'
import { loadCaseData } from '@/data/caseLoader'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const caseId = route.params.caseId as string
const caseData = ref<CaseData>({} as CaseData)
const typedText = ref('')
const fullText = ref('')
const showCluePanel = ref(false)

const discoveredClueIds = computed(() => {
  return gameStore.discoveredClues
})

// 加载案例数据
onMounted(async () => {
  try {
    caseData.value = loadCaseData(caseId)
    fullText.value = `调查委托：
    
${caseData.value.character.name}，${caseData.value.character.age}岁，${caseData.value.character.occupation}。
    
当前症状：${caseData.value.character.symptoms.join('、')}
    
${caseData.value.character.background}
    
请调查其健康风险并制定方案。
    
—— 生命调查局`
    
    // 打字机效果
    typeWriter()
    
    // 初始化游戏
    gameStore.initGame(caseData.value)
  } catch (error) {
    console.error('加载案例数据失败：', error)
  }
})

// 打字机效果
const typeWriter = () => {
  let index = 0
  const speed = 30 // 每个字符的间隔（毫秒）
  
  const type = () => {
    if (index < fullText.value.length) {
      typedText.value += fullText.value.charAt(index)
      index++
      setTimeout(type, speed)
    }
  }
  
  type()
}

// 开始调查
const startInvestigation = () => {
  playTransition()
  router.push({
    name: 'scene-explore',
    params: {
      caseId: caseId,
      sceneId: caseData.value.scenes[0].sceneId
    }
  })
}
</script>

<style scoped>
.case-intro-page {
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
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.intro-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 3vh, 2rem) clamp(1rem, 5vw, 4rem);
  gap: clamp(1rem, 3vw, 3rem);
  overflow-y: auto;
}

.character-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
  max-width: 360px;
  flex: 0 1 auto;
}

.character-portrait {
  width: clamp(120px, 28vw, 200px);
  height: clamp(120px, 28vw, 200px);
  border-radius: 50%;
  background: rgba(83, 52, 131, 0.3);
  border: 3px solid #533483;
  display: flex;
  align-items: center;
  justify-content: center;
}

.portrait-placeholder {
  font-size: clamp(3rem, 8vw, 5rem);
}

.character-info {
  background: rgba(26, 26, 46, 0.9);
  border: 2px solid #533483;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
}

.character-name {
  font-size: 1.8rem;
  color: #e0e0ff;
  margin-bottom: 1rem;
  text-align: center;
}

.info-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
  color: #a0a0cc;
}

.label {
  color: #606080;
  min-width: 80px;
}

.value {
  color: #e0e0ff;
  font-weight: 500;
}

.symptoms {
  margin-top: 1rem;
}

.symptom-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.symptom-tag {
  background: rgba(255, 194, 203, 0.2);
  color: #ffc2cb;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.case-info-block {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 580px;
}

.case-letter {
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid #533483;
  border-radius: 12px;
  padding: clamp(1.5rem, 4vw, 3rem);
  width: 100%;
  max-width: 580px;
  position: relative;
}

.letter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(83, 52, 131, 0.5);
}

.letter-title {
  font-size: clamp(1.4rem, 4vw, 2rem);
  color: #8af5c3;
  font-weight: 700;
}

.letter-seal {
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  opacity: 0.7;
}

.letter-content {
  margin-bottom: 1.5rem;
}

.typewriter-text {
  color: #e0e0ff;
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  line-height: 1.8;
  white-space: pre-wrap;
  min-height: 120px;
}

.start-button {
  display: block;
  margin: 0 auto;
  font-size: clamp(1rem, 2.5vw, 1.2rem);
  padding: clamp(0.7rem, 2vh, 1rem) clamp(2rem, 5vw, 3rem);
  min-height: 48px;
}

@media (max-width: 768px) {
  .intro-container {
    flex-direction: column;
    padding: 1rem;
    gap: 0.8rem;
  }
  
  .character-block {
    max-width: 100%;
    flex-shrink: 1;
    gap: 0.8rem;
    flex-direction: row;
    align-items: center;
    width: 100%;
  }

  .character-portrait {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
  }

  .portrait-placeholder {
    font-size: 2.5rem;
  }

  .character-info {
    flex: 1;
    min-width: 0;
  }

  .character-name {
    font-size: 1.3rem;
    margin-bottom: 0.4rem;
    text-align: left;
  }

  .case-letter {
    padding: 1.2rem;
  }

  .typewriter-text {
    min-height: 80px;
    font-size: 0.9rem;
    line-height: 1.6;
  }
}
</style>
