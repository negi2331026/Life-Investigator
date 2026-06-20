<template>
  <div class="ending-page">
    <!-- 调查档案栏 -->
    <InvestigationFileBar v-if="caseData.clues" :caseData="caseData" :gameState="gameStore.gameState ?? {}" @show-clues="showCluePanel = true" />

    <!-- 加载中 -->
    <div v-if="!caseData.clues" class="loading-container">
      <p class="loading-text">正在生成结局报告...</p>
    </div>

    <div v-else class="ending-container">
      <!-- 结局标题 -->
      <div class="ending-header" :class="endingClass">
        <h1 class="ending-title">{{ endingTitle }}</h1>
        <p class="ending-subtitle">{{ endingDescription }}</p>
      </div>

      <!-- 评级展示 -->
      <div class="rating-section" v-if="rating">
        <div class="rating-badge" :class="ratingClass">
          <span class="rating-letter">{{ rating.rating }}</span>
        </div>
        <div class="rating-details">
          <div class="rating-item">
            <span class="label">最终评分</span>
            <span class="value score">{{ rating.score }} / 100</span>
          </div>
          <div class="rating-item">
            <span class="label">线索发现率</span>
            <span class="value">{{ Math.round(rating.clueDiscoveryRate * 100) }}%</span>
          </div>
          <div class="rating-item">
            <span class="label">资源利用率</span>
            <span class="value">{{ Math.round(rating.resourceUtilization * 100) }}%</span>
          </div>
          <div class="rating-item">
            <span class="label">关键线索</span>
            <span class="value" :class="rating.keyClueFound ? 'found' : 'missed'">
              {{ rating.keyClueFound ? '已发现' : '未发现' }}
            </span>
          </div>
          <div class="rating-item">
            <span class="label">发现阶段</span>
            <span class="value">{{ stageText }}</span>
          </div>
        </div>
        <p class="rating-feedback">{{ rating.feedback }}</p>
      </div>

      <!-- 时间轴摘要 -->
      <div class="timeline-summary" v-if="gameState && gameState.timeEvents">
        <h3>调查过程回顾</h3>
        <div class="timeline-events">
          <div
            v-for="(event, index) in gameState.timeEvents"
            :key="index"
            class="timeline-event"
            :class="{ player: event.isPlayerAction }"
          >
            <div class="event-dot"></div>
            <div class="event-content">
              <span class="event-age">{{ event.age }}岁</span>
              <span class="event-desc">{{ event.description }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="ending-actions">
        <button class="pixel-button primary-share" @click="openShare">
          <span class="share-icon">📤</span> 分享调查报告
        </button>
        <button class="pixel-button" @click="goToReview">查看复盘报告</button>
        <button class="pixel-button secondary" @click="retryCase">重新调查</button>
        <button class="pixel-button secondary" @click="goHome">返回档案室</button>
      </div>
    </div>

    <CluePanel
      :visible="showCluePanel"
      :caseData="caseData"
      :discoveredClueIds="gameStore.discoveredClues"
      @close="showCluePanel = false"
    />

    <!-- 分享卡 -->
    <ShareCard
      :showShareModal="showShare"
      :shareData="shareData"
      @close="showShare = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import InvestigationFileBar from '@/components/game/InvestigationFileBar.vue'
import CluePanel from '@/components/game/CluePanel.vue'
import ShareCard from '@/components/share/ShareCard.vue'
import type { CaseData } from '@/types/case'
import type { RatingDetails } from '@/types/game'
import type { ShareData } from '@/composables/useShare'
import { playClick, playEnding, playGreatRating, playNormalRating, playBadRating } from '@/composables/useSound'
import { recordCaseCompletion } from '@/stores/investigatorProfile'
import { loadCaseData } from '@/data/caseLoader'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const caseId = route.params.caseId as string
const caseData = ref<CaseData>({} as CaseData)
const gameState = ref<any>(null)
const rating = ref<RatingDetails | null>(null)
const showCluePanel = ref(false)
const showShare = ref(false)

onMounted(async () => {
  try {
    caseData.value = loadCaseData(caseId)
    gameState.value = gameStore.gameState

    // 评级计算（引擎内部已同时完成结局匹配，保证上下一致）
    rating.value = gameStore.calculateRating()

    // 记录到调查员档案
    if (rating.value) {
      recordCaseCompletion(
        caseId,
        caseData.value.caseName || '未知案件',
        rating.value.rating,
        rating.value.score
      )
    }

    // 播放结局音效
    playEnding()
    setTimeout(() => {
      const r = rating.value?.rating || 'D'
      if (r === 'S' || r === 'A') playGreatRating()
      else if (r === 'B' || r === 'C') playNormalRating()
      else playBadRating()
    }, 1000)
  } catch (error) {
    console.error('加载结局数据失败：', error)
  }
})

// 结局标题/描述 — 直接从引擎评级中读取，保证与评分一致
const endingTitle = computed(() => {
  return rating.value?.matchedEndingTitle || '调查结束'
})

const endingDescription = computed(() => {
  return rating.value?.matchedEndingDescription || '你的调查之旅到此结束。'
})

const endingClass = computed(() => {
  const type = rating.value?.matchedEndingId
    ? caseData.value.endings?.find(e => e.endingId === rating.value!.matchedEndingId)?.type
    : null
  if (type === 'prevention' || type === 'early_detection') return 'ending-good'
  if (type === 'mid_detection') return 'ending-ok'
  return 'ending-bad'
})

const ratingClass = computed(() => {
  const r = rating.value?.rating || 'D'
  return `rating-${r.toLowerCase()}`
})

const stageText = computed(() => {
  const stage = rating.value?.diseaseStage
  const stageMap: Record<string, string> = {
    'normal': '正常',
    'high_risk': '高风险',
    'suspicious_symptoms': '可疑症状',
    'progressive_disease': '疾病进展',
    'early_cancer': '早期癌症',
    'mid_cancer': '中期癌症',
    'advanced_cancer': '晚期癌症',
    // 旧版兼容
    'symptom_appear': '可疑症状',
    'precancerous': '疾病进展',
    'late_cancer': '晚期癌症'
  }
  return stageMap[stage || ''] || '暂无数据'
})

const goToReview = () => {
  playClick()
  router.push({ name: 'review', params: { caseId } })
}

const retryCase = () => {
  playClick()

  // 1. 先把当前线索写入 localStorage 恢复标记（优先内存快照，回退引擎当前状态）
  const snapshot = gameStore.getSceneSnapshot()
  if (snapshot) {
    try {
      localStorage.setItem(`retry_recover_${caseId}`, JSON.stringify(snapshot))
    } catch { /* ignore */ }
  } else {
    // 无快照时，直接从引擎读取当前线索并写入恢复标记
    gameStore.saveClueRecovery(caseId)
  }

  // 2. 彻底重置游戏引擎
  gameStore.resetGame()

  // 3. 清理旧备份
  try {
    localStorage.removeItem(`scene_snapshot_${caseId}`)
  } catch { /* ignore */ }

  // 4. 跳到第一次决策界面 → DecisionPage 会自动从 localStorage 恢复线索
  const firstDecision = caseData.value.decisionPoints?.[0]
  const firstDecisionId = firstDecision?.decisionId || 'decision_1'
  router.push({ name: 'decision', params: { caseId, decisionId: firstDecisionId } })
}

const goHome = () => {
  playClick()
  router.push({ name: 'archive' })
}

// 分享数据
const shareData = computed<ShareData>(() => {
  const decisions = gameState.value?.investigationFile?.decisionHistory || []
  const totalClues = caseData.value.clues?.length || 0

  // 提取关键决策（健康影响最大的前4条）
  const keyDecisions = decisions
    .filter((d: any) => d.consequence)
    .sort((a: any, b: any) => Math.abs(b.healthImpact) - Math.abs(a.healthImpact))
    .slice(0, 4)
    .map((d: any) => ({
      age: d.age,
      action: d.consequence.length > 28 ? d.consequence.substring(0, 28) + '...' : d.consequence
    }))

  return {
    caseName: caseData.value.caseName || '未知案例',
    rating: rating.value?.rating || 'D',
    score: rating.value?.score || 0,
    endingTitle: endingTitle.value,
    endingDescription: endingDescription.value,
    keyDecisions: keyDecisions.length > 0 ? keyDecisions : [{ age: gameState.value?.investigationFile?.currentAge || 0, action: '完成调查' }],
    characterName: caseData.value.character?.name || '',
    characterAge: gameState.value?.investigationFile?.currentAge || caseData.value.character?.age || 0,
    clueCount: gameState.value?.investigationFile?.discoveredClues?.length || 0,
    totalClues
  }
})

const openShare = () => {
  playClick()
  showShare.value = true
}
</script>

<style scoped>
.ending-page {
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

.ending-container {
  max-width: 700px;
  width: 90%;
  padding: 2rem 1rem 3rem;
}

.ending-header {
  text-align: center;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  border: 2px solid;
}

.ending-good {
  background: rgba(138, 245, 195, 0.1);
  border-color: #8af5c3;
}

.ending-ok {
  background: rgba(255, 201, 92, 0.1);
  border-color: #ffc95c;
}

.ending-bad {
  background: rgba(255, 194, 203, 0.1);
  border-color: #ffc2cb;
}

.ending-title {
  font-size: clamp(1.5rem, 5vw, 2.2rem);
  color: #e0e0ff;
  margin-bottom: 0.5rem;
}

.ending-subtitle {
  color: #a0a0cc;
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  line-height: 1.6;
}

.rating-section {
  text-align: center;
  margin-bottom: 2rem;
}

.rating-badge {
  width: clamp(72px, 18vw, 100px);
  height: clamp(72px, 18vw, 100px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  border: 4px solid;
  box-shadow: 0 0 30px;
}

.rating-s {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border-color: #ffd700;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
}

.rating-a {
  background: linear-gradient(135deg, #8af5c3, #00cc66);
  border-color: #8af5c3;
  box-shadow: 0 0 30px rgba(138, 245, 195, 0.6);
}

.rating-b {
  background: linear-gradient(135deg, #6be1ff, #0066cc);
  border-color: #6be1ff;
  box-shadow: 0 0 30px rgba(107, 225, 255, 0.6);
}

.rating-c {
  background: linear-gradient(135deg, #ffc95c, #ff8800);
  border-color: #ffc95c;
  box-shadow: 0 0 30px rgba(255, 201, 92, 0.6);
}

.rating-d {
  background: linear-gradient(135deg, #ffc2cb, #cc3366);
  border-color: #ffc2cb;
  box-shadow: 0 0 30px rgba(255, 194, 203, 0.6);
}

.rating-letter {
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 900;
  color: #1a1a2e;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.rating-details {
  background: rgba(26, 26, 46, 0.9);
  border: 1px solid #533483;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.rating-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(83, 52, 131, 0.2);
}

.rating-item:last-child {
  border-bottom: none;
}

.rating-item .label {
  color: #606080;
}

.rating-item .value {
  color: #e0e0ff;
  font-weight: 600;
}

.rating-item .value.score {
  color: #8af5c3;
  font-size: 1.1rem;
}

.rating-item .value.found {
  color: #8af5c3;
}

.rating-item .value.missed {
  color: #ffc2cb;
}

.rating-feedback {
  color: #a0a0cc;
  font-style: italic;
  margin-top: 1rem;
}

.timeline-summary {
  background: rgba(26, 26, 46, 0.9);
  border: 1px solid #533483;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.timeline-summary h3 {
  color: #e0e0ff;
  margin-bottom: 1rem;
  text-align: center;
}

.timeline-events {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.timeline-event {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.event-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #533483;
  margin-top: 4px;
  flex-shrink: 0;
}

.timeline-event.player .event-dot {
  background: #8af5c3;
}

.event-content {
  display: flex;
  gap: 0.8rem;
  align-items: baseline;
}

.event-age {
  color: #8af5c3;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  min-width: 50px;
}

.event-desc {
  color: #a0a0cc;
  font-size: 0.9rem;
}

.ending-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
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

.pixel-button.primary-share {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border: none;
  color: #1a1a2e;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.pixel-button.primary-share:hover {
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.5);
  transform: translateY(-2px);
}

.share-icon {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .ending-container {
    padding: 1rem 0.8rem 2rem;
  }

  .ending-header {
    padding: 1.2rem;
  }

  .ending-actions {
    flex-direction: column;
    gap: 0.6rem;
  }

  .ending-actions .pixel-button {
    width: 100%;
  }

  .timeline-events {
    gap: 0.5rem;
  }
}
</style>
