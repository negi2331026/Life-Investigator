<template>
  <div class="archive-page">
    <!-- 扫描线 -->
    <div class="scanline"></div>

    <!-- 背景 -->
    <div class="bg-layer"></div>

    <!-- 背景音乐 -->
    <button class="mute-btn" @click="handleBgmToggle" :title="bgmEnabled ? '关闭背景音乐' : '开启背景音乐'">
      <span class="mute-icon">{{ bgmEnabled ? '🎵' : '🎵' }}</span>
      <span v-if="!bgmEnabled" class="mute-off-dot"></span>
    </button>

    <!-- 调查员身份栏（紧凑） -->
    <header class="top-bar">
      <div class="top-card">
        <svg class="top-icon" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="13" r="7" stroke="#8af5c3" stroke-width="1.5" fill="none"/>
          <path d="M5 27 c0-6 5-10 11-10 s11 4 11 10" stroke="#8af5c3" stroke-width="1.5" fill="none"/>
        </svg>
        <div class="top-info">
          <span class="top-rank">{{ investigatorProfile.rank }}</span>
          <span class="top-stat">已完成 <b>{{ investigatorProfile.completedCases }}/{{ investigatorProfile.totalCases }}</b></span>
          <span class="top-stat">均评 <b>{{ investigatorProfile.averageRating || '--' }}</b></span>
          <span class="top-stat lives">改变 <b>{{ changedLives }}</b> 人命运</span>
        </div>
      </div>
    </header>

    <!-- 案件卡片区（视觉主体） -->
    <section class="cards-section">
      <div class="cards-grid">
        <div
          v-for="(card, i) in caseCards"
          :key="card.caseId"
          class="case-card"
          :class="{ completed: card.completed }"
          @click="startCase(card.caseId)"
        >
          <div class="card-no">Case-{{ String(i + 1).padStart(3, '0') }}</div>
          <div class="card-badge" :class="'pri-' + card.priority">{{ priorityLabel(card.priority) }}</div>
          <div v-if="card.completed" class="card-done">✓ 已结案</div>

          <div class="card-body">
            <div class="card-icon">{{ card.icon }}</div>
            <h3 class="card-name">{{ card.caseName }}</h3>
            <p class="card-info">{{ card.age }}岁 · {{ card.occupation }}</p>
            <p class="card-brief">{{ card.brief }}</p>
            <div class="card-stars">
              <span>调查优先级：</span>
              <span class="star-gold">{{ '★'.repeat(card.stars) }}{{ '☆'.repeat(5 - card.stars) }}</span>
            </div>
            <div class="card-tags">
              <span class="tag-label">重点知识：</span>
              <span v-for="t in card.tags" :key="t" class="tag">{{ t }}</span>
            </div>
          </div>

          <!-- 悬停指示 -->
          <div class="card-hint">打开档案 →</div>
        </div>
      </div>
    </section>

    <!-- 底部 -->
    <footer class="bottom-bar">
      <span class="bottom-quote">"每一个被忽视的症状，都可能改变人生轨迹。"</span>
      <div class="bottom-actions">
        <button class="btn-ghost" @click="showInfo = true">关于生命调查局</button>
        <button class="btn-reset" @click="confirmReset">重新开始调查</button>
      </div>
    </footer>

    <!-- 关于弹窗 -->
    <div v-if="showInfo" class="modal-mask" @click="showInfo = false">
      <div class="modal-box" @click.stop>
        <h2>关于生命调查局</h2>
        <p>你是一名"生命调查员"，通过调查人物生活轨迹、收集健康线索、分析癌症风险、制定检查和干预方案，帮助不同角色预防或早期发现癌症。</p>
        <p>游戏目标不是答题，而是通过推理和决策过程，让玩家理解癌症风险因素、筛查的重要性以及早发现早治疗的价值。</p>
        <button class="modal-close" @click="showInfo = false">关闭</button>
      </div>
    </div>

    <!-- 重置弹窗 -->
    <div v-if="showResetConfirm" class="modal-mask" @click="showResetConfirm = false">
      <div class="modal-box reset-box" @click.stop>
        <h2>重置调查档案</h2>
        <p>清除所有调查进度与评级记录。此操作不可撤销。</p>
        <p class="reset-hint">建议在体验结束后使用。</p>
        <div class="reset-row">
          <button class="modal-close" @click="showResetConfirm = false">取消</button>
          <button class="btn-danger" @click="executeReset">确认重置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { playClick, bgmEnabled, toggleBgm } from '@/composables/useSound'
import { getInvestigatorProfile, resetProfile } from '@/stores/investigatorProfile'
import { loadCaseData } from '@/data/caseLoader'

const router = useRouter()
const showInfo = ref(false)
const showResetConfirm = ref(false)
const handleBgmToggle = () => toggleBgm()

// 档案
const investigatorProfile = ref(getInvestigatorProfile())
onMounted(() => { investigatorProfile.value = getInvestigatorProfile() })

const changedLives = computed(() =>
  investigatorProfile.value.records.filter(r => r.rating === 'S' || r.rating === 'A').length
)

// 案例卡片映射
const ICONS: Record<string, string> = { lung: '🫁', stomach: '🍽️', colorectal: '🏢' }
const TAGS: Record<string, string[]> = {
  lung: ['吸烟危害', 'CT筛查'],
  stomach: ['幽门螺杆菌', '胃镜筛查'],
  colorectal: ['肠镜筛查', '健康饮食']
}
const BRIEFS: Record<string, string> = {
  lung: '持续咳嗽3个月，未做肺部检查。',
  stomach: '长期胃部不适，依赖胃药缓解。',
  colorectal: '近期偶发便血，需进一步排查。'
}
const PRIO: Record<string, string> = { lung: 'urgent', stomach: 'normal', colorectal: 'attention' }
const STARS: Record<string, number> = { lung: 4, stomach: 3, colorectal: 3 }

const priorityLabel = (p: string) =>
  ({ urgent: '紧急', normal: '普通', attention: '关注' } as Record<string, string>)[p] || p

const caseCards = computed(() => {
  const CASE_IDS = ['lung_cancer', 'stomach_cancer', 'colorectal_cancer']
  return CASE_IDS.map(id => {
    const c = loadCaseData(id)
    const ct = c.cancerType || 'lung'
    return {
      caseId: id,
      caseName: c.caseName,
      icon: c.icon || ICONS[ct] || '🔍',
      age: c.character.age,
      occupation: c.character.occupation,
      brief: BRIEFS[ct] || '',
      tags: c.tags?.length ? c.tags : (TAGS[ct] || []),
      priority: (PRIO[ct] || 'normal') as 'urgent' | 'normal' | 'attention',
      stars: STARS[ct] || 3,
      completed: investigatorProfile.value.completedCaseIds.includes(id)
    }
  })
})

const startCase = (cid: string) => { playClick(); router.push({ name: 'case-intro', params: { caseId: cid } }) }

// 重置
const confirmReset = () => { playClick(); showResetConfirm.value = true }
const executeReset = () => {
  resetProfile()
  try {
    Object.keys(localStorage).filter(k => k.startsWith('game_') || k.startsWith('scene_snapshot_'))
      .forEach(k => localStorage.removeItem(k))
  } catch { /* ignore */ }
  window.location.reload()
}
</script>

<style scoped>
/* ===== 页面 ===== */
.archive-page {
  width: 100vw; height: 100vh; height: 100dvh;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
  padding: clamp(1.5rem, 3vh, 2.5rem) 0 0 0;
}

/* 扫描线 */
.scanline {
  position: fixed; inset: 0; z-index: 10; pointer-events: none;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(138,245,195,0.01) 2px, rgba(138,245,195,0.01) 4px
  );
}

/* 背景 */
.bg-layer {
  position: fixed; inset: 0; z-index: -1;
  background: linear-gradient(160deg, #0a0a1a 0%, #12122a 40%, #0e0e22 70%, #161632 100%);
}
.bg-layer::after {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(83,52,131,0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 80%, rgba(138,245,195,0.04) 0%, transparent 50%);
}

/* 背景音乐开关 */
.mute-btn {
  position: fixed; top: max(0.8rem, 1.5vh); right: max(0.8rem, 1.5vw); z-index: 100;
  width: clamp(36px, 5vh, 44px); height: clamp(36px, 5vh, 44px);
  padding: 0; font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
  background: rgba(20,20,40,0.9); border: 1px solid #533483; border-radius: 8px;
  cursor: pointer; color: #ffffff !important; transition: all 0.2s;
  /* 确保不被遮挡 */
  top: max(0.8rem, 1.5vh, env(safe-area-inset-top, 0px));
  right: max(0.8rem, 1.5vw, env(safe-area-inset-right, 0px));
}
.mute-btn:hover { border-color: #8af5c3; background: rgba(83,52,131,0.25); }
.mute-icon { font-size: 1.05rem; }
.mute-off-dot {
  position: absolute;
  width: 6px; height: 6px;
  background: #ff5c5c;
  border-radius: 50%;
  bottom: 6px; right: 6px;
  box-shadow: 0 0 4px rgba(255,92,92,0.5);
}

/* ===== 顶栏：调查员身份 ===== */
.top-bar {
  flex: 0 0 auto;
  width: 92%; max-width: 1200px; margin: 0 auto;
}
.top-card {
  background: rgba(20,20,40,0.8);
  border: 1px solid rgba(83,52,131,0.4);
  border-radius: 10px;
  padding: clamp(0.8rem, 1.8vh, 1.2rem) clamp(1.2rem, 2.5vw, 2rem);
  display: flex; align-items: center; gap: clamp(1rem, 2vw, 1.8rem);
}
.top-icon {
  width: clamp(40px, 6vh, 50px); height: clamp(40px, 6vh, 50px);
  flex-shrink: 0;
}
.top-info {
  display: flex; align-items: center; gap: clamp(1rem, 2.5vw, 2rem);
  flex-wrap: wrap;
}
.top-rank {
  color: #8af5c3; font-size: clamp(1rem, 1.8vh, 1.25rem);
  font-weight: 700; letter-spacing: 0.06em;
  padding-right: 1rem; border-right: 1px solid rgba(83,52,131,0.3);
}
.top-stat {
  color: #8080a0; font-size: clamp(0.9rem, 1.5vh, 1.05rem);
}
.top-stat b { color: #d0d0ee; font-weight: 600; }
.top-stat.lives b { color: #ffc95c; }

/* ===== 卡片区（视觉主体） ===== */
.cards-section {
  flex: 1 1 auto;
  display: flex; align-items: center; justify-content: center;
  width: 92%; max-width: 1300px; margin: 0 auto;
  padding: clamp(0.8rem, 2vh, 1.5rem) 0;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr));
  gap: clamp(1.2rem, 2.5vw, 2.5rem);
  width: 100%;
  align-content: center;
}

/* ===== 单卡片 ===== */
.case-card {
  background: rgba(16,16,32,0.92);
  border: 2px solid rgba(83,52,131,0.55);
  border-radius: clamp(10px, 1.2vh, 16px);
  padding: clamp(1.8rem, 3.5vh, 3rem) clamp(1.5rem, 2.5vw, 2.5rem);
  cursor: pointer;
  position: relative;
  transition: all 0.35s ease;
  display: flex; flex-direction: column;
  min-height: clamp(340px, 48vh, 500px);
  justify-content: center;
  overflow: hidden;
}
.case-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(83,52,131,0.06) 0%, transparent 100%);
  pointer-events: none;
}
.case-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 40px rgba(83,52,131,0.45), 0 8px 32px rgba(0,0,0,0.4);
  border-color: #8af5c3;
}
.case-card.completed { opacity: 0.5; }
.case-card.completed:hover { opacity: 0.7; }

/* 卡片各元素 */
.card-no {
  position: absolute; top: clamp(0.7rem, 1.2vh, 1.1rem); left: clamp(0.7rem, 1.5vw, 1.2rem);
  font-size: clamp(0.72rem, 1.1vh, 0.85rem); color: #4a4a68;
  font-family: 'Courier New', monospace; letter-spacing: 0.06em;
}
.card-badge {
  position: absolute; top: clamp(0.6rem, 1vh, 1rem); right: clamp(0.7rem, 1.5vw, 1.2rem);
  font-size: clamp(0.72rem, 1.1vh, 0.85rem); padding: 0.25em 0.8em;
  border-radius: 20px; font-weight: 700; letter-spacing: 0.04em;
}
.pri-urgent { background: rgba(255,194,203,0.15); color: #ffc2cb; border: 1px solid rgba(255,194,203,0.3); }
.pri-normal { background: rgba(255,201,92,0.12); color: #ffc95c; border: 1px solid rgba(255,201,92,0.25); }
.pri-attention { background: rgba(138,245,195,0.1); color: #8af5c3; border: 1px solid rgba(138,245,195,0.25); }

.card-done {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(138,245,195,0.12); border: 1px solid rgba(138,245,195,0.35);
  color: #8af5c3; padding: 0.5em 1.6em; border-radius: 20px;
  font-size: clamp(0.95rem, 1.5vh, 1.1rem); z-index: 2; pointer-events: none;
}

.card-body { z-index: 1; text-align: center; }
.card-icon {
  font-size: clamp(3.2rem, 6.5vh, 4.5rem);
  margin-bottom: 0.3em; filter: drop-shadow(0 0 10px rgba(138,245,195,0.15));
}
.card-name {
  font-size: clamp(1.4rem, 2.4vh, 1.8rem);
  color: #e0e0ff; margin-bottom: 0.25em; letter-spacing: 0.04em;
}
.card-info {
  color: #a0a0cc; font-size: clamp(0.9rem, 1.5vh, 1.05rem);
  margin-bottom: 0.4em;
}
.card-brief {
  color: #6a6a88; font-size: clamp(0.88rem, 1.3vh, 1rem);
  line-height: 1.5; margin-bottom: 1em; min-height: 2.2em;
}
.card-stars {
  display: flex; align-items: center; justify-content: center;
  gap: 0.3em; margin-bottom: 0.8em;
  color: #707090; font-size: clamp(0.82rem, 1.2vh, 0.95rem);
}
.star-gold { color: #ffc95c; letter-spacing: 0.08em; }
.card-tags {
  display: flex; justify-content: center; gap: 0.5em; flex-wrap: wrap; align-items: center;
}
.tag-label { color: #707090; font-size: clamp(0.8rem, 1.2vh, 0.9rem); }
.tag {
  background: rgba(83,52,131,0.22); color: #8af5c3;
  padding: 0.25em 0.75em; border-radius: 20px;
  font-size: clamp(0.8rem, 1.2vh, 0.9rem);
}
.card-hint {
  position: absolute; bottom: clamp(0.7rem, 1.2vh, 1.1rem);
  right: clamp(0.9rem, 1.8vw, 1.4rem);
  font-size: clamp(0.72rem, 1.1vh, 0.85rem);
  color: #4a4a68;
  transition: color 0.3s;
}
.case-card:hover .card-hint { color: #8af5c3; }

/* ===== 底部 ===== */
.bottom-bar {
  flex: 0 0 auto;
  text-align: center;
  padding: clamp(0.8rem, 1.5vh, 1.2rem) clamp(1rem, 2vw, 2rem);
  padding-bottom: max(clamp(0.8rem, 1.5vh, 1.2rem), env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(83,52,131,0.15);
  width: 92%; max-width: 1200px; margin: 0 auto;
}
.bottom-quote {
  color: #7a7a98; font-size: clamp(1.05rem, 1.8vh, 1.25rem);
  font-style: italic; letter-spacing: 0.03em;
  display: block; margin-bottom: clamp(0.5rem, 1vh, 1rem);
}
.bottom-actions {
  display: flex; gap: clamp(0.8rem, 1.5vw, 1.2rem); justify-content: center;
}
.btn-ghost {
  background: transparent; border: 1px solid #533483;
  color: #8080a0; padding: 0.55em 1.8em;
  border-radius: 20px; cursor: pointer; font-size: clamp(0.95rem, 1.6vh, 1.1rem);
  transition: all 0.25s;
}
.btn-ghost:hover { background: rgba(83,52,131,0.2); color: #b0b0cc; }
.btn-reset {
  background: transparent; border: 1px solid rgba(255,194,203,0.25);
  color: #907070; padding: 0.55em 1.8em;
  border-radius: 20px; cursor: pointer; font-size: clamp(0.95rem, 1.6vh, 1.1rem);
  transition: all 0.25s;
}
.btn-reset:hover {
  background: rgba(255,194,203,0.1);
  color: #ffc2cb; border-color: rgba(255,194,203,0.5);
}

/* ===== 弹窗 ===== */
.modal-mask {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: #14142a; border: 2px solid #533483;
  border-radius: 14px; padding: clamp(1.5rem, 3vh, 2.5rem);
  max-width: 580px; width: 92%;
}
.modal-box h2 { color: #e0e0ff; margin-bottom: 1em; font-size: clamp(1.1rem, 1.8vh, 1.3rem); }
.modal-box p { color: #a0a0cc; line-height: 1.6; margin-bottom: 0.8em; font-size: clamp(0.85rem, 1.2vh, 0.95rem); }
.modal-close {
  background: #533483; color: #fff; border: none;
  padding: 0.4em 1.4em; border-radius: 20px;
  cursor: pointer; font-size: 0.85rem; float: right;
}
.reset-hint { color: #ffc2cb; font-size: 0.85rem; }
.reset-row { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 0.5rem; }
.btn-danger {
  background: rgba(255,194,203,0.15); color: #ffc2cb;
  border: 1px solid rgba(255,194,203,0.4);
  padding: 0.4em 1.4em; border-radius: 20px;
  cursor: pointer; transition: all 0.2s;
}
.btn-danger:hover { background: rgba(255,194,203,0.3); border-color: #ffc2cb; }

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .archive-page {
    padding: clamp(0.8rem, 2vh, 1.5rem) 0;
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .top-card { flex-direction: column; text-align: center; }
  .top-info { justify-content: center; }
  .top-rank { border-right: none; padding-right: 0; }
  .cards-grid { grid-template-columns: 1fr; }
  .cards-section { overflow: visible; flex: 0 0 auto; align-items: flex-start; padding-top: 0.5rem; }
  .case-card { min-height: clamp(260px, 38vh, 360px); padding: clamp(1rem, 2vh, 1.5rem); }
  .bottom-actions { flex-direction: column; align-items: center; }
  .bottom-bar { padding-bottom: max(1rem, env(safe-area-inset-bottom, 20px)); }
  .mute-btn { right: 0.5rem; top: max(0.5rem, env(safe-area-inset-top, 0px)); }
  .btn-ghost, .btn-reset { min-height: 44px; display: flex; align-items: center; justify-content: center; }
}
</style>
