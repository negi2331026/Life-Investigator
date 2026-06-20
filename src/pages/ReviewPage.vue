<template>
  <div class="review-page">
    <!-- 调查档案栏 -->
    <InvestigationFileBar v-if="caseData.clues" :caseData="caseData" :gameState="gameStore.gameState ?? {}" @show-clues="showCluePanel = true" />

    <!-- 加载中 -->
    <div v-if="!caseData.clues" class="loading-container">
      <p class="loading-text">正在生成复盘报告...</p>
    </div>

    <div v-else class="review-container">
      <!-- 标题 -->
      <div class="review-header">
        <h1>事故复盘报告</h1>
        <p>对比你的调查路线与最优路线</p>
      </div>

      <!-- 双时间轴对比 -->
      <div class="timeline-comparison">
        <!-- 左侧：玩家路线 -->
        <div class="timeline-column player">
          <h3 class="column-title player-title">你的路线</h3>
          <div class="timeline-track">
            <div
              v-for="(event, index) in playerEvents"
              :key="'p-' + index"
              class="timeline-node"
              :class="{ 'decision-point': isDecisionPoint(event) }"
            >
              <div class="node-line"></div>
              <div class="node-content">
                <span class="node-age">{{ event.age }}岁</span>
                <span class="node-text">{{ event.description }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：最佳路线 -->
        <div class="timeline-column best">
          <h3 class="column-title best-title">最佳路线</h3>
          <div class="timeline-track">
            <div
              v-for="(step, index) in bestRoute"
              :key="'b-' + index"
              class="timeline-node"
            >
              <div class="node-line"></div>
              <div class="node-content">
                <span class="node-age">{{ step.age }}岁</span>
                <span class="node-text">{{ step.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 疾病里程碑摘要 -->
      <div class="milestones-section" v-if="milestoneSummary.length > 0">
        <h3>疾病进展里程碑</h3>
        <div class="milestone-list">
          <div
            v-for="(ms, index) in milestoneSummary"
            :key="index"
            class="milestone-card"
            :class="ms.isGood ? 'milestone-good' : 'milestone-bad'"
          >
            <span class="milestone-icon">{{ ms.icon }}</span>
            <div class="milestone-info">
              <span class="milestone-name">{{ ms.label }}</span>
              <span class="milestone-status">{{ ms.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 关键差异标注 -->
      <div class="differences" v-if="differences.length > 0">
        <h3>关键决策点分析</h3>
        <div
          v-for="(diff, index) in differences"
          :key="index"
          class="diff-card"
        >
          <div class="diff-header">
            <span class="diff-age">{{ diff.age }}岁</span>
            <span class="diff-badge danger">关键决策点</span>
          </div>
          <div class="diff-body">
            <div class="diff-row player-choice">
              <span class="diff-label">你的选择：</span>
              <span class="diff-value">{{ diff.playerChoice }}</span>
            </div>
            <div class="diff-row best-choice">
              <span class="diff-label">最佳选择：</span>
              <span class="diff-value">{{ diff.bestChoice }}</span>
            </div>
            <div class="diff-reason" v-if="diff.bestReason">
              <span class="diff-label">为什么：</span>
              <span class="diff-value reason-text">{{ diff.bestReason }}</span>
            </div>
            <p class="diff-impact">{{ diff.impact }}</p>
          </div>
        </div>
      </div>

      <!-- 科普知识点 -->
      <div class="knowledge-section" v-if="knowledgePoints.length > 0">
        <h3>科普知识点</h3>
        <div class="knowledge-list">
          <div
            v-for="kp in knowledgePoints"
            :key="kp.pointId"
            class="knowledge-card"
          >
            <span class="kp-category">{{ kp.category }}</span>
            <p class="kp-content">{{ kp.content }}</p>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="review-actions">
        <button class="pixel-button" @click="retryCase">重新调查</button>
        <button class="pixel-button secondary" @click="goHome">返回档案室</button>
      </div>
    </div>

    <CluePanel
      :visible="showCluePanel"
      :caseData="caseData"
      :discoveredClueIds="gameStore.discoveredClues"
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
import type { CaseData, RouteStep } from '@/types/case'
import type { TimelineEvent } from '@/types/game'
import { playClick } from '@/composables/useSound'
import { loadCaseData } from '@/data/caseLoader'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const caseId = route.params.caseId as string
const caseData = ref<CaseData>({} as CaseData)
const gameState = ref<any>(null)
const showCluePanel = ref(false)

onMounted(async () => {
  try {
    caseData.value = loadCaseData(caseId)
    gameState.value = gameStore.gameState
  } catch (error) {
    console.error('加载复盘数据失败：', error)
  }
})

// 玩家事件
const playerEvents = computed(() => {
  return gameState.value?.timeEvents || []
})

// 最佳路线
const bestRoute = computed(() => {
  return caseData.value.bestRoute?.route || []
})

// 关键决策点ID列表
const keyDecisionPoints = computed(() => {
  return caseData.value.bestRoute?.keyDecisionPoints || []
})

// 疾病里程碑摘要（数据驱动：从案例JSON读取，自动区分正向/负向里程碑）
const milestoneSummary = computed(() => {
  const defs = caseData.value.bestRoute?.milestones || []
  const flags = gameState.value?.diseaseFlags
  if (!flags || defs.length === 0) return []

  return defs.map(def => {
    const triggered = !!flags[def.flagKey]
    // 正向里程碑：触发 = 好消息；负向里程碑：触发 = 坏消息
    const isGood = def.positive ? triggered : !triggered
    return {
      label: def.label,
      isGood,
      icon: isGood ? '✅' : '⚠️',
      text: triggered ? def.triggeredText : def.notTriggeredText
    }
  })
})

// 差异分析（里程碑驱动 + 最佳路径详细对比）
const differences = computed(() => {
  const diffs: {
    age: number
    playerChoice: string
    bestChoice: string
    bestReason: string
    impact: string
  }[] = []

  const playerDecisions = gameState.value?.investigationFile?.decisionHistory || []
  const bestRouteSteps = caseData.value.bestRoute?.route || []
  const flags = gameState.value?.diseaseFlags || {}

  // 根据 keyDecisionPoints 在 bestRoute 中找对应的步骤
  const keyDps = keyDecisionPoints.value
  for (let i = 0; i < keyDps.length; i++) {
    const dpId = keyDps[i]
    const playerDecision = playerDecisions.find((d: any) => d.decisionId === dpId)
    if (!playerDecision) continue

    // 在 bestRoute 中按顺序查找决策步骤
    const bestStep = bestRouteSteps[i + 1] // 跳过第一个（调查阶段）
    if (!bestStep) continue

    // 里程碑驱动的差异分析
    let impactText = ''
    if (playerDecision.healthImpact >= 5 && !(flags as any).hemoptysisOccurred) {
      impactText = '你的选择与最佳路径完全一致。及时筛查是战胜癌症的第一步，这一步的选择决定了整个预后。'
    } else if (playerDecision.healthImpact >= 3 && !(flags as any).hemoptysisOccurred) {
      impactText = '方向正确——转诊是合理选择，但如果直接做CT可以更早发现病变。每一步延误都在给疾病进展的时间。'
    } else if (playerDecision.healthImpact >= 0 && !(flags as any).hemoptysisOccurred) {
      impactText = '你的选择虽不算错误，但保守策略让诊断时间延后。肺癌筛查讲究「早」字，等待的代价可能是疾病分期升级。'
    } else if ((flags as any).hemoptysisOccurred && !(flags as any).severeDelay) {
      impactText = '咳血后仍采取了行动，但已经错过了最佳筛查窗口。「痰中带血」是肺部疾病已明显进展的警示——不是观察的信号，是必须立即检查的信号。'
    } else if ((flags as any).severeDelay) {
      impactText = '咳血后仍然选择了观察——这是整个病程中最危险的决策。从45岁到现在的每一次「再看看」，都在让疾病从可切除变成不可切除。'
    } else {
      impactText = '这一次决策的延误让病情有了进一步发展。记住：高危人群每年做一次低剂量CT，发现得越早，活得越久。'
    }

    diffs.push({
      age: playerDecision.age,
      playerChoice: playerDecision.consequence,
      bestChoice: bestStep.action,
      bestReason: bestStep.description,
      impact: impactText
    })
  }

  return diffs
})

// 科普知识点
const knowledgePoints = computed(() => {
  return caseData.value.bestRoute?.knowledgePoints || []
})

// 判断是否是决策点
const isDecisionPoint = (event: TimelineEvent) => {
  return event.eventType === 'decision'
}

const retryCase = () => {
  playClick()
  gameStore.resetGame()
  // 直接跳到第一次决策界面，跳过线索收集
  const firstDecision = caseData.value.decisionPoints?.[0]
  const firstDecisionId = firstDecision?.decisionId || 'decision_1'
  router.push({ name: 'decision', params: { caseId, decisionId: firstDecisionId } })
}

const goHome = () => {
  playClick()
  router.push({ name: 'archive' })
}
</script>

<style scoped>
.review-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #0a0a1a 0%, #16213e 50%, #1a1a2e 100%);
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
}

.review-container {
  max-width: 1000px;
  width: 90%;
  padding: 2rem 1rem 3rem;
}

.review-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.review-header h1 {
  font-size: 2.2rem;
  color: #e0e0ff;
  margin-bottom: 0.5rem;
}

.review-header p {
  color: #a0a0cc;
}

/* 双时间轴 */
.timeline-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.timeline-column {
  background: rgba(26, 26, 46, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
}

.timeline-column.player {
  border: 2px solid #ffc95c;
}

.timeline-column.best {
  border: 2px solid #8af5c3;
}

.column-title {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(83, 52, 131, 0.3);
}

.player-title {
  color: #ffc95c;
}

.best-title {
  color: #8af5c3;
}

.timeline-track {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.timeline-node {
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
}

.node-line {
  width: 3px;
  min-height: 40px;
  background: #533483;
  border-radius: 2px;
  flex-shrink: 0;
  align-self: stretch;
  margin-top: 3px;
}

.decision-point .node-line {
  background: #ffc95c;
  box-shadow: 0 0 8px rgba(255, 201, 92, 0.6);
}

.node-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-bottom: 0.5rem;
}

.node-age {
  color: #8af5c3;
  font-size: 0.85rem;
  font-weight: 600;
}

.node-text {
  color: #a0a0cc;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* 里程碑摘要 */
.milestones-section {
  margin-bottom: 2.5rem;
}

.milestones-section h3 {
  color: #e0e0ff;
  margin-bottom: 1rem;
}

.milestone-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.milestone-card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  border-left: 3px solid;
}

.milestone-card.milestone-bad {
  background: rgba(255, 194, 203, 0.08);
  border-color: #ffc2cb;
}

.milestone-card.milestone-good {
  background: rgba(138, 245, 195, 0.06);
  border-color: #8af5c3;
}

.milestone-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.milestone-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.milestone-name {
  color: #e0e0ff;
  font-weight: 600;
  font-size: 0.95rem;
}

.milestone-status {
  color: #a0a0cc;
  font-size: 0.8rem;
}

/* 差异分析 */
.differences {
  margin-bottom: 2.5rem;
}

.differences h3 {
  color: #e0e0ff;
  margin-bottom: 1rem;
}

.diff-card {
  background: rgba(26, 26, 46, 0.9);
  border: 2px solid #ffc95c;
  border-radius: 12px;
  padding: 1.2rem;
  margin-bottom: 1rem;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.diff-age {
  color: #e0e0ff;
  font-weight: 700;
}

.diff-badge.danger {
  background: rgba(255, 201, 92, 0.2);
  color: #ffc95c;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.diff-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.diff-row {
  display: flex;
  gap: 0.5rem;
}

.diff-label {
  color: #606080;
  font-size: 0.9rem;
  min-width: 70px;
}

.player-choice .diff-value {
  color: #ffc95c;
}

.best-choice .diff-value {
  color: #8af5c3;
}

.diff-reason {
  display: flex;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: rgba(83, 52, 131, 0.12);
  border-radius: 6px;
  margin-top: 0.2rem;
}

.diff-reason .diff-label {
  color: #8af5c3;
}

.reason-text {
  color: #c0c0e8 !important;
  font-size: 0.85rem;
  line-height: 1.5;
}

.diff-impact {
  color: #a0a0cc;
  font-size: 0.9rem;
  font-style: italic;
  margin-top: 0.3rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(83, 52, 131, 0.2);
}

/* 科普知识 */
.knowledge-section {
  margin-bottom: 2.5rem;
}

.knowledge-section h3 {
  color: #e0e0ff;
  margin-bottom: 1rem;
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.knowledge-card {
  background: rgba(83, 52, 131, 0.15);
  border-left: 3px solid #8af5c3;
  border-radius: 8px;
  padding: 1rem 1.2rem;
}

.kp-category {
  font-size: 0.8rem;
  color: #8af5c3;
  background: rgba(138, 245, 195, 0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  display: inline-block;
  margin-bottom: 0.5rem;
}

.kp-content {
  color: #e0e0ff;
  line-height: 1.5;
}

.review-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-bottom: 2rem;
}

.pixel-button.secondary {
  background: transparent;
  border: 2px solid #533483;
  color: #a0a0cc;
}

.pixel-button.secondary:hover {
  color: #e0e0ff;
  border-color: #8af5c3;
}

@media (max-width: 768px) {
  .review-container {
    padding: 1rem 0.8rem 2rem;
  }

  .timeline-comparison {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .review-header h1 {
    font-size: 1.5rem;
  }

  .review-actions {
    flex-direction: column;
    gap: 0.6rem;
  }

  .review-actions .pixel-button {
    width: 100%;
  }

  .milestone-card {
    padding: 0.6rem 0.8rem;
  }

  .timeline-column {
    padding: 1rem;
  }
}
</style>
