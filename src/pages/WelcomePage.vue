<template>
  <div class="welcome-page">
    <!-- 扫描线 -->
    <div class="scanline-overlay"></div>

    <!-- 噪点纹理 -->
    <div class="noise-overlay"></div>

    <!-- 粒子 -->
    <div class="particles-layer">
      <div
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{ left: p.x + '%', top: p.y + '%', width: p.size + 'px', height: p.size + 'px', animationDelay: p.delay + 's', animationDuration: p.duration + 's', opacity: p.opacity }"
      ></div>
    </div>

    <!-- 漂浮档案背景（更大、更可见） -->
    <div class="floating-layer">
      <div
        v-for="f in floatingFiles"
        :key="f.id"
        class="floating-file"
        :style="{ left: f.x + '%', top: f.y + '%', animationDelay: f.delay + 's', animationDuration: f.duration + 's', transform: 'rotate(' + f.rot + 'deg)', width: f.w + '%', height: f.h + '%', opacity: f.opacity }"
      >
        <div class="ff-header">案件档案</div>
        <div class="ff-stamp">{{ f.label }}</div>
        <div class="ff-body">
          <div class="ff-line" v-for="n in f.lines" :key="n" :style="{ width: (30 + n * 20) + '%' }"></div>
        </div>
        <div class="ff-footer">生命调查局</div>
      </div>
    </div>

    <!-- 背景音乐开关 -->
    <button class="bgm-btn" @click.stop="handleBgmToggle" :title="bgmEnabled ? '关闭背景音乐' : '开启背景音乐'">
      <span class="bgm-icon">{{ bgmEnabled ? '🎵' : '🎵' }}</span>
      <span v-if="!bgmEnabled" class="bgm-off-dot"></span>
    </button>

    <!-- Hero 区域：撑满视口 -->
    <div class="hero">
      <!-- 徽章（左上） -->
      <div class="hero-badge">
        <svg viewBox="0 0 100 100" fill="none" class="badge-icon">
          <circle cx="50" cy="50" r="45" stroke="#533483" stroke-width="2" opacity="0.6"/>
          <circle cx="50" cy="50" r="40" stroke="#8af5c3" stroke-width="1" opacity="0.25"/>
          <circle cx="42" cy="42" r="16" stroke="#e0e0ff" stroke-width="2.8" fill="none"/>
          <line x1="54" y1="54" x2="66" y2="66" stroke="#e0e0ff" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="42" y1="32" x2="42" y2="52" stroke="#8af5c3" stroke-width="1.5" opacity="0.4"/>
          <line x1="32" y1="42" x2="52" y2="42" stroke="#8af5c3" stroke-width="1.5" opacity="0.4"/>
        </svg>
      </div>

      <!-- 标题 -->
      <h1 class="hero-title">生命调查局</h1>
      <p class="hero-title-en">LIFE INVESTIGATOR</p>
      <p class="hero-sub">调查风险 · 寻找线索 · 改变结局</p>

      <!-- Hook -->
      <blockquote class="hero-quote">
        大多数癌症并非突然出现，而是在被忽视的某一天悄悄开始。
      </blockquote>

      <!-- CTA -->
      <button class="hero-btn pixel-button" @click="enter">
        进入档案室
      </button>

      <!-- 底部案件条 -->
      <div class="hero-cases">
        <span class="hero-cases-divider">—</span>
        <span class="hero-case" v-for="(c, i) in caseCards" :key="c.caseId">
          Case-{{ String(i + 1).padStart(3, '0') }} {{ c.caseName }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { playClick, resumeContext, initBgm, bgmEnabled, toggleBgm } from '@/composables/useSound'
import { loadCaseData } from '@/data/caseLoader'

const router = useRouter()

// 粒子
const particles = ref<any[]>([])
onMounted(() => {
  const p: any[] = []
  for (let i = 0; i < 30; i++) {
    p.push({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 6 + Math.random() * 10,
      delay: Math.random() * 6, duration: 5 + Math.random() * 8,
      opacity: 0.1 + Math.random() * 0.3
    })
  }
  particles.value = p

  // 预热 AudioContext + 主动启动 BGM（浏览器可能拦截自动播放，pointer 事件后自动恢复）
  resumeContext()
  initBgm('headquarters')
})

// 漂浮档案
const floatingFiles = ref([
  { id: 1, label: 'CASE-001', x: 5,  y: 8,  w: 16, h: 28, rot: -8,  lines: 5, delay: 0,  duration: 15, opacity: 0.18 },
  { id: 2, label: 'CASE-002', x: 50, y: 5,  w: 14, h: 24, rot: 5,   lines: 4, delay: 3,  duration: 17, opacity: 0.15 },
  { id: 3, label: 'CASE-003', x: 78, y: 12, w: 15, h: 26, rot: -5,  lines: 5, delay: 1,  duration: 16, opacity: 0.16 },
  { id: 4, label: 'CASE-001', x: 30, y: 55, w: 13, h: 22, rot: 7,   lines: 4, delay: 5,  duration: 19, opacity: 0.13 },
  { id: 5, label: 'CASE-003', x: 65, y: 60, w: 16, h: 28, rot: -4,  lines: 5, delay: 2,  duration: 18, opacity: 0.14 },
  { id: 6, label: 'CASE-002', x: 15, y: 35, w: 12, h: 20, rot: -10, lines: 3, delay: 4,  duration: 20, opacity: 0.12 },
  { id: 7, label: 'CASE-001', x: 85, y: 40, w: 13, h: 23, rot: 6,   lines: 4, delay: 7,  duration: 16, opacity: 0.13 },
])

// 案件预览 - 静态导入（编译时解析路径，Windows 兼容）
const CASE_IDS = ['lung_cancer', 'stomach_cancer', 'colorectal_cancer']
const caseCards = ref<{ caseId: string; caseName: string }[]>(
  CASE_IDS.map(id => {
    const d = loadCaseData(id)
    return { caseId: id, caseName: d.caseName || '未知案件' }
  })
)

const handleBgmToggle = () => toggleBgm()
const enter = () => { playClick(); router.push({ name: 'archive' }) }
</script>

<style scoped>
.welcome-page {
  width: 100vw; height: 100vh;
  background: linear-gradient(160deg, #060612 0%, #0e0e24 30%, #141430 60%, #1a1a2e 100%);
  position: relative; overflow: hidden;
}

/* ===== 背景音乐按钮 ===== */
.bgm-btn {
  position: fixed;
  top: max(0.8rem, 1.5vh);
  right: max(0.8rem, 1.5vw);
  z-index: 100;
  width: clamp(36px, 5vh, 44px);
  height: clamp(36px, 5vh, 44px);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20,20,40,0.9);
  border: 1px solid #533483;
  border-radius: 8px;
  cursor: pointer;
  color: #ffffff !important;
  transition: all 0.2s;
}
.bgm-btn:hover {
  border-color: #8af5c3;
  background: rgba(83,52,131,0.25);
}
.bgm-icon {
  font-size: 1.05rem;
}
.bgm-off-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #ff5c5c;
  border-radius: 50%;
  bottom: 6px;
  right: 6px;
  box-shadow: 0 0 4px rgba(255,92,92,0.5);
}

/* ===== 扫描线 ===== */
.scanline-overlay {
  position: absolute; inset: 0; z-index: 10; pointer-events: none;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(138,245,195,0.012) 2px, rgba(138,245,195,0.012) 4px
  );
}

/* ===== 噪点纹理 ===== */
.noise-overlay {
  position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ===== 粒子 ===== */
.particles-layer { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.particle {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(138,245,195,0.7), rgba(83,52,131,0.2));
  animation: float-up linear infinite;
}
@keyframes float-up {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 0.5; }
  90% { opacity: 0.2; }
  100% { transform: translateY(-105vh) translateX(25px); opacity: 0; }
}

/* ===== 漂浮档案 ===== */
.floating-layer { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.floating-file {
  position: absolute;
  background: rgba(20,20,40,0.3);
  border: 1px solid rgba(83,52,131,0.12);
  border-radius: 6px;
  padding: max(0.4rem, 0.8vh) max(0.5rem, 1vw);
  display: flex; flex-direction: column;
  animation: float-archive ease-in-out infinite;
}
.ff-header {
  font-size: clamp(0.5rem, 0.75vh, 0.58rem);
  color: rgba(83,52,131,0.45);
  letter-spacing: 0.05em;
  margin-bottom: 0.3em;
}
.ff-stamp {
  font-family: 'Courier New', monospace;
  font-size: clamp(0.55rem, 0.85vh, 0.7rem);
  color: rgba(83,52,131,0.55);
  letter-spacing: 0.08em;
  margin-bottom: 0.6em;
}
.ff-body { display: flex; flex-direction: column; gap: 0.35em; flex: 1; }
.ff-line {
  height: 1px;
  background: rgba(83,52,131,0.15);
}
.ff-footer {
  margin-top: auto;
  font-size: clamp(0.42rem, 0.6vh, 0.5rem);
  color: rgba(83,52,131,0.35);
  text-align: center;
  letter-spacing: 0.04em;
}
@keyframes float-archive {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -2vh; }
}

/* ===== Hero — 撑满整个视口 ===== */
.hero {
  position: relative; z-index: 5;
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: clamp(2.5rem, 7vh, 5rem) clamp(1rem, 4vw, 4rem) clamp(1.5rem, 4vh, 3rem);
  text-align: center;
}

/* 徽章 */
.hero-badge {
  flex: 0 0 auto;
  margin-bottom: clamp(0.5rem, 1vh, 1rem);
}
.badge-icon {
  width: clamp(80px, 11vh, 110px);
  height: clamp(80px, 11vh, 110px);
  animation: badge-glow 3s ease-in-out infinite;
}
@keyframes badge-glow {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(83,52,131,0.3)); }
  50% { filter: drop-shadow(0 0 22px rgba(138,245,195,0.4)); }
}

/* 标题 */
.hero-title {
  flex: 0 0 auto;
  font-size: clamp(2.8rem, 7vw, 5rem);
  font-weight: 800;
  background: linear-gradient(120deg, #6a4190 25%, #8af5c3 75%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: clamp(0.2em, 0.8vw, 0.4em);
  margin-bottom: 0.1em;
  filter: drop-shadow(0 0 30px rgba(83,52,131,0.5));
}
.hero-title-en {
  flex: 0 0 auto;
  font-size: clamp(1.9rem, 2.8vh, 2.2rem);
  color: #666;
  letter-spacing: 0.3em;
  margin-bottom: clamp(0.6rem, 1.2vh, 1.2rem);
}
.hero-sub {
  flex: 0 0 auto;
  font-size: clamp(1.15rem, 2.4vh, 1.55rem);
  color: #8080b0;
  letter-spacing: 0.12em;
  margin-bottom: clamp(0.8rem, 2vh, 1.5rem);
}

/* Hook */
.hero-quote {
  flex: 0 0 auto;
  max-width: 900px;
  font-size: clamp(1.2rem, 2.5vh, 1.6rem);
  color: #c0c0ee;
  line-height: 1.8;
  margin: 0 auto clamp(1.2rem, 3vh, 2.5rem);
  letter-spacing: 0.04em;
  font-style: italic;
  opacity: 0.9;
  quotes: none;
  white-space: nowrap;
}

/* CTA */
.hero-btn {
  flex: 0 0 auto;
  font-size: clamp(1.05rem, 2.2vh, 1.35rem);
  padding: clamp(0.75rem, 1.5vh, 1.1rem) clamp(3rem, 6vw, 5rem);
  letter-spacing: 0.15em;
  animation: btn-pulse 2.5s ease-in-out infinite;
  margin-bottom: clamp(0.6rem, 1.2vh, 1.2rem);
}
@keyframes btn-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba(83,52,131,0.3); }
  50% { box-shadow: 0 0 28px rgba(138,245,195,0.4), 0 0 55px rgba(83,52,131,0.2); }
}

/* ===== 底部案件预览条 ===== */
.hero-cases {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: clamp(0.8rem, 2vw, 1.5rem);
  padding-top: clamp(0.6rem, 1vh, 1rem);
  border-top: 1px solid rgba(83,52,131,0.2);
  width: 100%; max-width: 900px;
}
.hero-cases-divider {
  display: none;
}
.hero-case {
  font-size: clamp(0.78rem, 1.3vh, 0.9rem);
  color: #4a4a68;
  letter-spacing: 0.05em;
  font-family: 'Courier New', monospace;
  padding: 0 clamp(0.4rem, 0.8vw, 0.8rem);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .floating-file:nth-child(n+4) { display: none; }
  .hero-title { font-size: clamp(2rem, 10vw, 3.2rem); }
  .hero-cases { flex-direction: column; gap: 0.3rem; }
  .hero-quote { white-space: normal; font-size: 1rem; padding: 0 1rem; }
}

/* 背景音乐按钮最小触摸目标 */
.bgm-btn {
  min-width: 44px;
  min-height: 44px;
}
</style>
