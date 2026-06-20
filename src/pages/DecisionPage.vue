<template>
  <div class="decision-page">
    <!-- 调查档案栏 -->
    <InvestigationFileBar v-if="caseData.clues" :caseData="caseData" :gameState="gameStore.gameState ?? {}" @show-clues="showCluePanel = true" />
    
    <!-- 加载中 -->
    <div v-if="!caseData.clues" class="loading-container">
      <p class="loading-text">正在加载决策...</p>
    </div>
    
    <div v-else class="decision-container">
      <!-- 顶部：决策问题描述 -->
      <div class="decision-header">
        <h1 class="decision-title">医疗决策</h1>
        <p class="decision-age">当前年龄：{{ gameStore.gameState?.investigationFile?.currentAge ?? '--' }}岁</p>
      </div>
      
      <!-- 中部：决策选项 -->
      <div class="decision-content">
        <div class="decision-question">
          <p class="question-text">{{ currentDecision.triggerCondition }}</p>
          <p class="question-description">请选择下一步行动方案：</p>
        </div>
        
        <div class="decision-options">
          <div
            v-for="option in currentDecision.options"
            :key="option.optionId"
            class="decision-card"
            :class="{ 'selected': selectedOption === option }"
            @click="selectOption(option)"
          >
            <div class="option-header">
              <span class="option-text">{{ option.text }}</span>
              <span v-if="option.resourceCost > 0" class="cost-badge">
                消耗 {{ option.resourceCost }} 点
              </span>
            </div>
            
            <div class="option-details">
              <p class="consequence">
                <span class="label">后果：</span>
                {{ option.consequence }}
              </p>
            </div>
            
            <div class="option-footer">
              <button 
                class="confirm-button pixel-button"
                :disabled="!canAfford(option)"
                @click.stop="confirmDecision(option)"
              >
                确认选择
              </button>
              
              <span v-if="!canAfford(option)" class="insufficient">
                调查点数不足
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 底部：已发现线索提醒 -->
      <div class="clues-reminder" v-if="discoveredClues.length > 0">
        <p class="reminder-title">已发现线索（{{ discoveredClues.length }}/{{ caseData.clues?.length || 0 }}）：</p>
        <div class="reminder-clues">
          <span 
            v-for="clueId in discoveredClues" 
            :key="clueId"
            class="reminder-clue-tag"
            :class="{ 'key-clue': isKeyClue(clueId) }"
          >
            {{ getClueName(clueId) }}
          </span>
        </div>
      </div>
    </div>

    <CluePanel
      :visible="showCluePanel"
      :caseData="caseData"
      :discoveredClueIds="discoveredClues"
      @close="showCluePanel = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { loadCaseData } from '@/data/caseLoader'
import InvestigationFileBar from '@/components/game/InvestigationFileBar.vue'
import CluePanel from '@/components/game/CluePanel.vue'
import type { CaseData, DecisionPoint, DecisionOption } from '@/types/case'
import { playClick, playDecision } from '@/composables/useSound'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const caseId = route.params.caseId as string
const decisionId = route.params.decisionId as string

const caseData = ref<CaseData>({} as CaseData)
const currentDecision = ref<DecisionPoint>({} as DecisionPoint)
const selectedOption = ref<DecisionOption | null>(null)
const showCluePanel = ref(false)

// 同步当前决策（组件复用时不重新触发 onMounted，需要手动同步）
const syncCurrentDecision = () => {
  const nextId = route.params.decisionId as string
  if (!caseData.value.decisionPoints) return
  const decision = caseData.value.decisionPoints.find(d => d.decisionId === nextId)
  if (decision) {
    currentDecision.value = decision
    selectedOption.value = null
  }
}

// 加载数据
onMounted(async () => {
  try {
    caseData.value = loadCaseData(caseId)
    
    // 如果游戏未初始化，则初始化
    if (!gameStore.isGameInitialized || gameStore.currentCase?.caseId !== caseData.value.caseId) {
      gameStore.initGame(caseData.value)
    }
    
    // 自动检测 localStorage 恢复标记，注入场景线索（重新调查场景）
    gameStore.recoverCluesAfterReset(caseId)
    
    // 清除上一次的 nextDecisionId，确保新鲜状态
    gameStore.clearNextDecisionId()
    gameStore.clearOptionNextDecisionId()
    
    // 设置当前决策点
    syncCurrentDecision()
  } catch (error) {
    console.error('加载决策数据失败：', error)
  }
})

// 监听路由参数变化（同一组件在不同决策间切换时 onMounted 不会重新触发）
watch(() => route.params.decisionId, () => {
  gameStore.clearNextDecisionId()
  gameStore.clearOptionNextDecisionId()
  syncCurrentDecision()
})

// 已发现线索
const discoveredClues = computed(() => {
  return gameStore.discoveredClues || []
})

// 选择选项
const selectOption = (option: DecisionOption) => {
  if (!canAfford(option)) return
  playClick()
  selectedOption.value = option
}

// 确认决策
const confirmDecision = (option: DecisionOption) => {
  // 做出决策（引擎内部会自动推进时间、触发人生事件、解锁线索）
  const currentDecId = route.params.decisionId as string
  gameStore.makeDecision(currentDecId, option)
  
  // 音效不可阻断路由跳转
  try {
    playDecision()
  } catch {
    // 静默处理
  }
  
  // 路由到下一阶段
  routeNext()
}

// 决策后路由：选项级 nextDecisionId → lifeEvent → 顺序下一个 decision → 结局
const routeNext = () => {
  const currentDecId = route.params.decisionId as string
  
  // 0. 检查决策选项是否直接锁定了下一阶段
  const optionNext = gameStore.getOptionNextDecisionId()
  if (optionNext !== undefined) {
    gameStore.clearOptionNextDecisionId()
    if (optionNext === '') {
      // 空字符串 = 直接走向结局
      router.push({ name: 'ending', params: { caseId: caseId } })
      return
    }
    router.push({
      name: 'decision',
      params: { caseId: caseId, decisionId: optionNext }
    })
    return
  }
  
  // 1. 检查 lifeEvent 是否锁定了下一个决策
  const eventDecisionId = gameStore.getNextDecisionId()
  if (eventDecisionId) {
    router.push({
      name: 'decision',
      params: { caseId: caseId, decisionId: eventDecisionId }
    })
    return
  }
  
  // 2. 按 decisionPoints 数组顺序取下一个
  const decisionPoints = caseData.value.decisionPoints || []
  const currentIdx = decisionPoints.findIndex(d => d.decisionId === currentDecId)
  const nextDecision = currentIdx >= 0 ? decisionPoints[currentIdx + 1] : null
  
  if (nextDecision) {
    router.push({
      name: 'decision',
      params: { caseId: caseId, decisionId: nextDecision.decisionId }
    })
    return
  }
  
  // 3. 没有更多决策 → 到达结局
  router.push({ name: 'ending', params: { caseId: caseId } })
}

// 检查是否有足够资源
const canAfford = (option: DecisionOption) => {
  const remaining = gameStore.gameState?.investigationFile?.investigationPoints ?? 0
  return remaining >= option.resourceCost
}

// 获取线索名称
const getClueName = (clueId: string) => {
  const clue = caseData.value.clues?.find(c => c.clueId === clueId)
  return clue ? clue.name : '未知线索'
}

// 判断是否为关键线索
const isKeyClue = (clueId: string) => {
  const clue = caseData.value.clues?.find(c => c.clueId === clueId)
  return clue?.isKeyClue || false
}
</script>

<style scoped>
.decision-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a1a 0%, #16213e 50%, #1a1a2e 100%);
}

.decision-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: clamp(0.8rem, 2vh, 2rem);
  overflow-y: auto;
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

.decision-header {
  text-align: center;
  margin-bottom: 2rem;
}

.decision-title {
  font-size: 2.5rem;
  color: #e0e0ff;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 20px rgba(83, 52, 131, 0.5);
}

.decision-age {
  color: #8af5c3;
  font-size: 1.2rem;
  font-weight: 600;
}

.decision-content {
  flex: 1;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

.decision-question {
  background: rgba(26, 26, 46, 0.9);
  border: 2px solid #533483;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
}

.question-text {
  font-size: 1.3rem;
  color: #e0e0ff;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.question-description {
  color: #a0a0cc;
  font-size: 1.1rem;
}

.decision-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.decision-card {
  background: rgba(26, 26, 46, 0.9);
  border: 2px solid #533483;
  border-radius: 12px;
  padding: clamp(0.8rem, 2vw, 1.5rem);
  cursor: pointer;
  transition: all 0.3s ease;
}

.decision-card:hover {
  border-color: #8af5c3;
  box-shadow: 0 0 20px rgba(138, 245, 195, 0.3);
  transform: translateY(-5px);
}

.decision-card.selected {
  border-color: #8af5c3;
  box-shadow: 0 0 30px rgba(138, 245, 195, 0.5);
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.option-text {
  font-size: 1.2rem;
  color: #e0e0ff;
  font-weight: 600;
}

.cost-badge {
  background: rgba(255, 194, 203, 0.2);
  color: #ffc2cb;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.option-details {
  margin-bottom: 1.5rem;
}

.consequence {
  color: #a0a0cc;
  margin-bottom: 0.8rem;
  line-height: 1.5;
}

.label {
  color: #606080;
  font-size: 0.9rem;
}

.time-advance {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.time-value {
  color: #6be1ff;
  font-weight: 600;
}

.option-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confirm-button {
  padding: 0.6rem 2rem;
  font-size: 1rem;
  min-height: 44px;
}

.confirm-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.insufficient {
  color: #ffc2cb;
  font-size: 0.9rem;
}

.clues-reminder {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(26, 26, 46, 0.7);
  border: 1px solid #533483;
  border-radius: 12px;
}

.reminder-title {
  color: #a0a0cc;
  margin-bottom: 0.8rem;
  font-size: 0.95rem;
}

.reminder-clues {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.reminder-clue-tag {
  background: rgba(83, 52, 131, 0.3);
  color: #8af5c3;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reminder-clue-tag:hover {
  background: rgba(83, 52, 131, 0.6);
  transform: translateY(-1px);
}



@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@media (max-width: 768px) {
  .decision-container {
    padding: 0.8rem;
  }
  
  .decision-title {
    font-size: clamp(1.5rem, 6vw, 2rem);
  }

  .decision-header {
    margin-bottom: 1rem;
  }
  
  .question-text {
    font-size: 1rem;
  }

  .decision-card {
    padding: 0.8rem;
  }

  .decision-options {
    gap: 0.8rem;
  }
  
  .option-footer {
    flex-direction: column;
    gap: 0.6rem;
    align-items: stretch;
  }
  
  .confirm-button {
    width: 100%;
  }

  .option-text {
    font-size: 0.95rem;
  }
}
</style>
