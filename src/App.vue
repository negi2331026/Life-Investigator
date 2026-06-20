<template>
  <div class="app-container" @pointerdown="handleUserInteraction">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  resumeContext,
  initBgm,
  destroyBgm,
  switchBgmZone,
  bgmEnabled,
  isBgmInitialized,
} from '@/composables/useSound'
import type { BgmZone } from '@/composables/useSound'

let interactionHandled = false

const route = useRoute()

// 根据路径确定 BGM 分区
function getZoneForPath(path: string): BgmZone {
  if (path === '/welcome' || path === '/archive' || path === '/editor') {
    return 'headquarters'
  }
  return 'investigation'
}

// 用户首次交互：恢复 AudioContext + 启动/恢复 BGM（处理浏览器自动播放拦截）
const handleUserInteraction = () => {
  resumeContext()
  if (!interactionHandled) {
    interactionHandled = true
    // BGM 可能已在 WelcomePage.onMounted 中初始化但被浏览器拦截，重新启动
    initBgm(getZoneForPath(route.path))
  }
}

// 根据路由自动切换 BGM 分区
watch(
  () => route.path,
  (path) => {
    // BGM 未初始化或已禁用时跳过
    if (!isBgmInitialized() || !bgmEnabled.value) return
    switchBgmZone(getZoneForPath(path))
  },
  { immediate: true }
)

onUnmounted(() => {
  destroyBgm()
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a1a 0%, #16213e 50%, #1a1a2e 100%);
  position: relative;
}

@media (max-width: 768px) {
  .app-container {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
