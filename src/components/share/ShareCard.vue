<template>
  <!-- 分享弹窗 -->
  <Transition name="modal-fade">
    <div v-if="showShareModal" class="share-overlay" @click.self="emitClose">
      <div class="share-modal">
        <div class="modal-header">
          <h2>调查报告分享</h2>
          <button class="close-btn" @click="emitClose">✕</button>
        </div>

        <!-- 弹窗主体 -->
        <div class="modal-body">
          <!-- 加载中 -->
          <div v-if="isGenerating" class="generating-state">
            <div class="spinner"></div>
            <p>正在生成分享图片...</p>
          </div>

          <!-- 已生成：显示预览图 + 操作按钮 -->
          <template v-else-if="shareImageUrl">
            <div class="preview-area">
              <img :src="shareImageUrl" alt="调查报告卡片" class="preview-image" />
            </div>
            <div class="modal-actions">
              <button class="action-btn primary" @click="handleDownload">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                保存PNG
              </button>
              <button class="action-btn" @click="handleCopyImage">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                {{ copyImgDone ? '已复制' : '复制图片' }}
              </button>
              <button class="action-btn" @click="handleCopyLink">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                {{ copyLinkDone ? '已复制' : '复制链接' }}
              </button>
              <button class="action-btn" @click="handleCopyText">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                {{ copyTextDone ? '已复制' : '复制文案' }}
              </button>
              <button class="action-btn system-share" @click="handleSystemShare">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                系统分享
              </button>
            </div>
            <!-- Toast 提示 -->
            <Transition name="toast-fade">
              <div v-if="toastMsg" class="toast" :class="toastType">{{ toastMsg }}</div>
            </Transition>
          </template>

          <!-- 生成失败 -->
          <div v-else class="error-state">
            <p>{{ errorMsg || '图片生成失败，请重试' }}</p>
            <button class="retry-btn" @click="retryGenerate">重新生成</button>
          </div>
        </div>
      </div>

      <!-- 截图目标卡片：始终在弹窗内部可见区域渲染 -->
      <div ref="cardCloneContainer" class="card-clone-container" :style="{ position: 'absolute', left: '-9999px', top: 0, width: cardWidth + 'px' }">
        <div ref="cardCloneRef" class="share-card" :class="cardTheme">
          <!-- 顶部标题区 -->
          <div class="card-header">
            <div class="card-badge">调查报告</div>
            <h1 class="card-title">{{ shareData.caseName }}</h1>
            <p class="card-subtitle">{{ shareData.characterName }} · {{ shareData.characterAge }}岁</p>
          </div>

          <!-- 评级区 -->
          <div class="card-rating-section">
            <div class="card-rating-badge" :class="'rating-' + shareData.rating.toLowerCase()">
              <span class="card-rating-letter">{{ shareData.rating }}</span>
            </div>
            <div class="card-rating-info">
              <div class="card-title-name">{{ titleName }}</div>
              <div class="card-score">综合评分 {{ shareData.score }} / 100</div>
            </div>
          </div>

          <!-- 结局区 -->
          <div class="card-ending">
            <div class="card-section-label">📋 最终结局</div>
            <h3 class="card-ending-title">{{ shareData.endingTitle }}</h3>
            <p class="card-ending-desc">{{ shareData.endingDescription }}</p>
          </div>

          <!-- 关键决策区 -->
          <div class="card-decisions" v-if="shareData.keyDecisions.length > 0">
            <div class="card-section-label">🔑 关键决策</div>
            <div class="card-decision-list">
              <div
                v-for="(d, i) in shareData.keyDecisions.slice(0, 4)"
                :key="i"
                class="card-decision-item"
              >
                <span class="decision-age">{{ d.age }}岁</span>
                <span class="decision-action">{{ d.action }}</span>
              </div>
            </div>
          </div>

          <!-- 线索统计 -->
          <div class="card-stats">
            <div class="card-stat">
              <span class="stat-value">{{ shareData.clueCount }}/{{ shareData.totalClues }}</span>
              <span class="stat-label">线索发现</span>
            </div>
            <div class="card-stat">
              <span class="stat-value">{{ shareData.keyDecisions.length }}</span>
              <span class="stat-label">关键决策</span>
            </div>
          </div>

          <!-- 底部 -->
          <div class="card-footer">
            <div class="card-footer-brand">
              <span class="brand-icon">🔍</span>
              <span class="brand-name">生命调查局</span>
            </div>
            <p class="brand-slogan">早筛查 · 早发现 · 早安心</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useShare, getTitle, type ShareData } from '@/composables/useShare'

const props = defineProps<{
  showShareModal: boolean
  shareData: ShareData
}>()

const emit = defineEmits<{
  close: []
}>()

const {
  isGenerating,
  shareImageUrl,
  errorMsg,
  showShareModal,
  generateShareImage,
  downloadImage,
  copyImageToClipboard,
  generateShareLink,
  copyText,
  shareViaSystem,
  generateShareText,
  closeShareModal
} = useShare()

const cardCloneRef = ref<HTMLElement | null>(null)
const cardCloneContainer = ref<HTMLElement | null>(null)
const cardWidth = 600
const copyImgDone = ref(false)
const copyLinkDone = ref(false)
const copyTextDone = ref(false)

// Toast 状态
const toastMsg = ref('')
const toastType = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMsg.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMsg.value = ''
  }, 2500)
}

const titleName = computed(() => getTitle(props.shareData.rating))
const cardTheme = computed(() => 'theme-' + props.shareData.rating.toLowerCase())

// 弹窗打开时自动生成
watch(() => props.showShareModal, async (visible) => {
  if (visible) {
    showShareModal.value = true
    copyImgDone.value = false
    copyLinkDone.value = false
    copyTextDone.value = false
    shareImageUrl.value = null
    errorMsg.value = ''
    isGenerating.value = true

    // 等待 DOM 渲染完成
    await nextTick()
    await nextTick()
    await new Promise(r => setTimeout(r, 300))

    if (cardCloneRef.value) {
      // 将截图元素临时移入可见区域
      const el = cardCloneRef.value
      const origStyle = el.style.cssText
      el.style.position = 'fixed'
      el.style.left = '0px'
      el.style.top = '0px'
      el.style.zIndex = '99999'
      el.style.opacity = '1'
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'none'
      el.style.width = cardWidth + 'px'

      await new Promise(r => setTimeout(r, 100))

      const result = await generateShareImage(el)

      // 恢复到隐藏状态
      el.style.cssText = origStyle

      if (!result) {
        // 保持 error 状态让用户重试
      }
    } else {
      errorMsg.value = '卡片元素未找到，请重试'
      isGenerating.value = false
    }
  } else {
    showShareModal.value = false
  }
}, { immediate: true })

function retryGenerate() {
  shareImageUrl.value = null
  errorMsg.value = ''
  isGenerating.value = true

  nextTick(async () => {
    await new Promise(r => setTimeout(r, 300))
    if (cardCloneRef.value) {
      const el = cardCloneRef.value
      const origStyle = el.style.cssText
      el.style.position = 'fixed'
      el.style.left = '0px'
      el.style.top = '0px'
      el.style.zIndex = '99999'
      el.style.opacity = '1'
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'none'
      el.style.width = cardWidth + 'px'

      await new Promise(r => setTimeout(r, 100))
      await generateShareImage(el)
      el.style.cssText = origStyle
    }
  })
}

function handleDownload() {
  if (!shareImageUrl.value) return
  const filename = `调查报告_${props.shareData.caseName}_${props.shareData.rating}.png`
  downloadImage(shareImageUrl.value, filename)
}

async function handleCopyImage() {
  if (!shareImageUrl.value) return
  const ok = await copyImageToClipboard(shareImageUrl.value)
  if (ok) {
    copyImgDone.value = true
    setTimeout(() => (copyImgDone.value = false), 2000)
  } else {
    handleDownload()
  }
}

async function handleCopyLink() {
  const link = generateShareLink(props.shareData)
  const result = await copyText(link)
  if (result === 'ok') {
    copyLinkDone.value = true
    showToast('链接已复制到剪贴板')
    setTimeout(() => (copyLinkDone.value = false), 2000)
  } else if (result === 'manual') {
    showToast('无法自动复制，请手动复制链接：' + link, 'error')
  } else {
    showToast('复制失败，请重试', 'error')
  }
}

async function handleCopyText() {
  const text = generateShareText(props.shareData)
  const result = await copyText(text)
  if (result === 'ok') {
    copyTextDone.value = true
    showToast('文案已复制到剪贴板')
    setTimeout(() => (copyTextDone.value = false), 2000)
  } else if (result === 'manual') {
    showToast('无法自动复制，请手动复制文案', 'error')
  } else {
    showToast('复制失败，请重试', 'error')
  }
}

async function handleSystemShare() {
  const link = generateShareLink(props.shareData)
  const text = generateShareText(props.shareData)
  const title = `生命调查局 · ${props.shareData.caseName}`

  const result = await shareViaSystem({ title, text: text.replace(/\n/g, ' ').slice(0, 80), url: link })

  if (result === 'shared') {
    showToast('已唤起系统分享')
  } else if (result === 'cancelled') {
    // 用户取消，不做提示
  } else if (result === 'ok') {
    showToast('已复制到剪贴板')
  } else {
    showToast('分享失败，请尝试"复制链接"', 'error')
  }
}

function emitClose() {
  emit('close')
  closeShareModal()
}
</script>

<style scoped>
/* ===== 遮罩 + 弹窗 ===== */
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.share-modal {
  background: #1a1a2e;
  border: 2px solid #533483;
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* ===== 弹窗头部 ===== */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid rgba(83, 52, 131, 0.3);
}

.modal-header h2 {
  color: #e0e0ff;
  font-size: 1.25rem;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(83, 52, 131, 0.4);
  background: transparent;
  color: #a0a0cc;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(83, 52, 131, 0.3);
  color: #fff;
}

/* ===== 弹窗主体 ===== */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-height: 200px;
}

.generating-state {
  text-align: center;
  color: #a0a0cc;
  padding: 2rem 0;
}

.generating-state p {
  margin-top: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(83, 52, 131, 0.3);
  border-top-color: #8af5c3;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-area {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.preview-image {
  width: 100%;
  display: block;
}

.error-state {
  color: #ffc2cb;
  text-align: center;
  padding: 2rem 0;
}

.error-state p {
  margin-bottom: 1rem;
}

.retry-btn {
  background: rgba(83, 52, 131, 0.3);
  border: 1px solid rgba(83, 52, 131, 0.6);
  color: #e0e0ff;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: rgba(83, 52, 131, 0.5);
  border-color: #8af5c3;
}

/* ===== 操作按钮行 ===== */
.modal-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  width: 100%;
  padding-top: 0.5rem;
}

.action-btn {
  flex: 1;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(83, 52, 131, 0.5);
  background: rgba(83, 52, 131, 0.15);
  color: #e0e0ff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn:hover {
  background: rgba(83, 52, 131, 0.35);
  border-color: #8af5c3;
  color: #fff;
}

.action-btn.primary {
  background: linear-gradient(135deg, #8af5c3, #00cc66);
  border-color: #8af5c3;
  color: #1a1a2e;
  font-weight: 600;
}

.action-btn.primary:hover {
  box-shadow: 0 0 20px rgba(138, 245, 195, 0.4);
}

.action-btn.system-share {
  background: rgba(107, 225, 255, 0.12);
  border-color: rgba(107, 225, 255, 0.4);
  color: #6be1ff;
}

.action-btn.system-share:hover {
  background: rgba(107, 225, 255, 0.25);
  border-color: #6be1ff;
}

/* ===== Toast 提示 ===== */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  z-index: 10010;
  white-space: nowrap;
  max-width: 90vw;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.toast.success {
  background: rgba(138, 245, 195, 0.9);
  color: #1a1a2e;
}

.toast.error {
  background: rgba(255, 194, 203, 0.9);
  color: #1a1a2e;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* ===== 过渡动画 ===== */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-active .share-modal,
.modal-fade-leave-active .share-modal {
  transition: transform 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .share-modal {
  transform: scale(0.9) translateY(20px);
}

.modal-fade-leave-to .share-modal {
  transform: scale(0.95);
}

/* ===== 截图目标卡片（隐藏在 overlay 内部） ===== */
.card-clone-container {
  pointer-events: none;
}

/* ===== 卡片样式 ===== */
.share-card {
  padding: 2.5rem 2rem;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #1a1a2e 100%);
  border-radius: 16px;
  color: #e0e0ff;
  position: relative;
  overflow: hidden;
}

/* 装饰背景 */
.share-card::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -80px;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  opacity: 0.06;
  background: radial-gradient(circle, #8af5c3, transparent);
}

.card-header {
  text-align: center;
  margin-bottom: 1.3rem;
  position: relative;
  z-index: 1;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(138, 245, 195, 0.15);
  color: #8af5c3;
  padding: 0.2rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 0.6rem;
  border: 1px solid rgba(138, 245, 195, 0.25);
  line-height: 1;
}

.card-title {
  font-size: 1.8rem;
  color: #fff;
  margin: 0 0 0.2rem;
  font-weight: 800;
}

.card-subtitle {
  color: #a0a0cc;
  font-size: 0.9rem;
  margin: 0;
}

.card-rating-section {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(83, 52, 131, 0.4);
  border-radius: 14px;
  padding: 1.2rem;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
}

.card-rating-badge {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid;
  flex-shrink: 0;
  line-height: 1;
}

.card-rating-badge.rating-s {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border-color: #ffd700;
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.5);
}

.card-rating-badge.rating-a {
  background: linear-gradient(135deg, #8af5c3, #00cc66);
  border-color: #8af5c3;
  box-shadow: 0 0 25px rgba(138, 245, 195, 0.5);
}

.card-rating-badge.rating-b {
  background: linear-gradient(135deg, #6be1ff, #0066cc);
  border-color: #6be1ff;
  box-shadow: 0 0 25px rgba(107, 225, 255, 0.5);
}

.card-rating-badge.rating-c {
  background: linear-gradient(135deg, #ffc95c, #ff8800);
  border-color: #ffc95c;
  box-shadow: 0 0 25px rgba(255, 201, 92, 0.5);
}

.card-rating-badge.rating-d {
  background: linear-gradient(135deg, #ffc2cb, #cc3366);
  border-color: #ffc2cb;
  box-shadow: 0 0 25px rgba(255, 194, 203, 0.5);
}

.card-rating-letter {
  font-size: 2.25rem;
  font-weight: 900;
  color: #1a1a2e;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  line-height: 1;
  transform: translateY(-1px);
}

.card-rating-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.card-title-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
}

.card-score {
  font-size: 0.85rem;
  color: #a0a0cc;
}

.card-ending {
  background: rgba(26, 26, 46, 0.8);
  border-left: 3px solid #8af5c3;
  border-radius: 0 10px 10px 0;
  padding: 1rem 1.2rem;
  margin-bottom: 1.2rem;
  position: relative;
  z-index: 1;
}

.card-section-label {
  font-size: 0.8rem;
  color: #8af5c3;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card-ending-title {
  font-size: 1.15rem;
  color: #fff;
  margin: 0 0 0.4rem;
}

.card-ending-desc {
  font-size: 0.85rem;
  color: #a0a0cc;
  margin: 0;
  line-height: 1.6;
}

.card-decisions {
  margin-bottom: 1.2rem;
  position: relative;
  z-index: 1;
}

.card-decision-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-decision-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(83, 52, 131, 0.12);
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
}

.decision-age {
  color: #ffc95c;
  font-weight: 700;
  font-size: 0.8rem;
  white-space: nowrap;
  min-width: 42px;
}

.decision-action {
  color: #c0c0e8;
  font-size: 0.85rem;
  line-height: 1.4;
}

.card-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
}

.card-stat {
  flex: 1;
  text-align: center;
  background: rgba(26, 26, 46, 0.8);
  border-radius: 10px;
  padding: 0.8rem;
  border: 1px solid rgba(83, 52, 131, 0.25);
}

.stat-value {
  display: block;
  font-size: 1.3rem;
  font-weight: 700;
  color: #8af5c3;
}

.stat-label {
  font-size: 0.75rem;
  color: #606080;
  margin-top: 0.2rem;
}

.card-footer {
  text-align: center;
  padding-top: 1.2rem;
  border-top: 1px solid rgba(83, 52, 131, 0.3);
  position: relative;
  z-index: 1;
}

.card-footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.brand-icon {
  font-size: 1.2rem;
}

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: #e0e0ff;
}

.brand-slogan {
  color: #606080;
  font-size: 0.8rem;
  margin: 0.4rem 0 0;
}

/* 响应式 */
@media (max-width: 480px) {
  .share-modal {
    max-height: 95vh;
  }

  .modal-actions {
    flex-direction: column;
  }

  .action-btn {
    min-width: 100%;
  }
}
</style>
