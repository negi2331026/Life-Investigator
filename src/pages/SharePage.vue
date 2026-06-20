<template>
  <div class="share-page">
    <!-- 扫描线 -->
    <div class="scanline-overlay"></div>
    <!-- 噪点纹理 -->
    <div class="noise-overlay"></div>

    <!-- 粒子 -->
    <div class="particles-layer">
      <div v-for="p in particles" :key="p.id" class="particle"
        :style="{ left: p.x + '%', top: p.y + '%', width: p.size + 'px', height: p.size + 'px', animationDelay: p.delay + 's', animationDuration: p.duration + 's', opacity: p.opacity }"
      ></div>
    </div>

    <!-- 主内容 -->
    <div class="share-content">
      <div class="share-card-wrapper">
        <!-- 卡片 -->
        <div class="share-card" :class="'theme-' + rating.toLowerCase()">
          <!-- 顶部 -->
          <div class="card-header">
            <div class="card-badge">调查报告</div>
            <h1 class="card-title">{{ caseName }}</h1>
          </div>

          <!-- 评级区 -->
          <div class="card-rating-section">
            <div class="card-rating-badge" :class="'rating-' + rating.toLowerCase()">
              <span class="card-rating-letter">{{ rating }}</span>
            </div>
            <div class="card-rating-info">
              <div class="card-title-name">{{ title }}</div>
              <div class="card-score">综合评分 {{ score }} / 100</div>
            </div>
          </div>

          <!-- 结局 -->
          <div class="card-ending">
            <div class="card-section-label">📋 最终结局</div>
            <h3 class="card-ending-title">{{ ending }}</h3>
            <p v-if="endingDesc" class="card-ending-desc">{{ endingDesc }}</p>
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

        <!-- 操作按钮 -->
        <div class="share-actions">
          <button class="cta-btn" @click="goPlay">
            🎮 我也要体验
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const caseName = computed(() => (route.query.case as string) || '调查报告')
const rating = computed(() => (route.query.rating as string) || 'B')
const title = computed(() => (route.query.title as string) || '尽职调查员')
const score = computed(() => Number(route.query.score) || 70)
const ending = computed(() => (route.query.ending as string) || '')
const endingDesc = computed(() => (route.query.desc as string) || '')

function goPlay() {
  router.push('/welcome')
}

// 粒子数据
const particles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1.5 + Math.random() * 2.5,
  delay: Math.random() * 8,
  duration: 3 + Math.random() * 5,
  opacity: 0.3 + Math.random() * 0.5,
}))
</script>

<style scoped>
/* ===== 底色覆盖 ===== */
.share-page {
  width: 100%;
  min-height: 100vh;
  background: #0f0f23;
  color: #e0e0ff;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

/* 扫描线 */
.scanline-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.06) 2px,
    rgba(0, 0, 0, 0.06) 4px
  );
}

/* 噪点 */
.noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
}

/* 粒子 */
.particles-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.particle {
  position: absolute;
  background: #8af5c3;
  border-radius: 50%;
  animation: float-up linear infinite;
}
@keyframes float-up {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-120px) scale(0); opacity: 0; }
}

/* 主内容 */
.share-content {
  position: relative;
  z-index: 20;
  width: 100%;
  max-width: 500px;
}

/* 卡片 */
.share-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.share-card {
  padding: 2.5rem 2rem;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #1a1a2e 100%);
  border: 2px solid #533483;
  border-radius: 20px;
  color: #e0e0ff;
  position: relative;
  overflow: hidden;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(83, 52, 131, 0.2);
}

/* 评级主题色 */
.share-card.theme-s { border-color: #ffd700; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,215,0,0.15); }
.share-card.theme-a { border-color: #8af5c3; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(138,245,195,0.15); }
.share-card.theme-b { border-color: #6be1ff; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(107,225,255,0.15); }
.share-card.theme-c { border-color: #ffc95c; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,201,92,0.15); }
.share-card.theme-d { border-color: #ffc2cb; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,194,203,0.15); }

/* 装饰背景圆 */
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
  pointer-events: none;
}

.card-header {
  text-align: center;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(138, 245, 195, 0.15);
  color: #8af5c3;
  padding: 0.3rem 1.2rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 0.8rem;
  border: 1px solid rgba(138, 245, 195, 0.25);
}

.card-title {
  font-size: 2rem;
  color: #fff;
  margin: 0;
  font-weight: 800;
  line-height: 1.3;
  word-break: break-all;
}

/* 评级区 */
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
  font-size: 0.9rem;
  color: #a0a0cc;
}

/* 结局 */
.card-ending {
  background: rgba(26, 26, 46, 0.8);
  border-left: 3px solid #8af5c3;
  border-radius: 0 10px 10px 0;
  padding: 1.2rem;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
}

.card-section-label {
  font-size: 0.85rem;
  color: #8af5c3;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card-ending-title {
  font-size: 1.2rem;
  color: #fff;
  margin: 0 0 0.4rem;
}

.card-ending-desc {
  font-size: 0.9rem;
  color: #a0a0cc;
  margin: 0;
  line-height: 1.6;
}

/* 底部 */
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
  font-size: 1.3rem;
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e0e0ff;
}

.brand-slogan {
  color: #606080;
  font-size: 0.85rem;
  margin: 0.5rem 0 0;
}

/* CTA 按钮 */
.share-actions {
  width: 100%;
  display: flex;
  justify-content: center;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #8af5c3, #00cc66);
  color: #1a1a2e;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 1rem 2.5rem;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 20px rgba(138, 245, 195, 0.3);
  letter-spacing: 1px;
}

.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(138, 245, 195, 0.5);
}

/* 响应式 */
@media (max-width: 480px) {
  .share-card {
    padding: 2rem 1.2rem;
  }
  .card-title {
    font-size: 1.5rem;
  }
  .card-rating-badge {
    width: 56px;
    height: 56px;
  }
  .card-rating-letter {
    font-size: 1.6rem;
  }
  .cta-btn {
    font-size: 1rem;
    padding: 0.8rem 2rem;
  }
}
</style>
