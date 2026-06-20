import { ref } from 'vue'

// ==================== 音效系统 (SFX) ====================

let audioCtx: AudioContext | null = null
const muted = ref(false)

const getContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// 播放音调
const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  startTime?: number
) => {
  if (muted.value) return
  try {
    const ctx = getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    const t = startTime ?? ctx.currentTime
    osc.start(t)
    osc.stop(t + duration)
  } catch {
    // 静默处理
  }
}

// 点击音效
export const playClick = () => {
  playTone(800, 0.08, 'square', 0.14)
}

// 悬停音效
export const playHover = () => {
  playTone(600, 0.05, 'sine', 0.05)
}

// 成功音效（双音上升）
export const playSuccess = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  playTone(523, 0.15, 'sine', 0.25, now)       // C5
  playTone(659, 0.15, 'sine', 0.25, now + 0.1) // E5
  playTone(784, 0.25, 'sine', 0.25, now + 0.2) // G5
}

// 发现线索音效
export const playClueFound = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  playTone(440, 0.12, 'sine', 0.2, now)
  playTone(660, 0.12, 'sine', 0.2, now + 0.1)
  playTone(880, 0.2, 'sine', 0.25, now + 0.2)
}

// 提示/通知音效
export const playNotification = () => {
  playTone(1000, 0.1, 'sine', 0.15)
  setTimeout(() => playTone(1200, 0.15, 'sine', 0.15), 80)
}

// 决策音效（低沉有力）
export const playDecision = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  playTone(200, 0.2, 'triangle', 0.3, now)
  playTone(300, 0.3, 'triangle', 0.25, now + 0.15)
}

// 警告音效
export const playWarning = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  playTone(330, 0.15, 'sawtooth', 0.12, now)
  playTone(280, 0.2, 'sawtooth', 0.12, now + 0.12)
}

// 时间推进音效（钟表滴答）
export const playTimeTick = () => {
  playTone(1200, 0.03, 'sine', 0.08)
}

// 打字机音效
export const playTypewriterTick = () => {
  if (muted.value) return
  try {
    const ctx = getContext()
    const bufferSize = ctx.sampleRate * 0.02
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(3000, ctx.currentTime)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start()
    source.stop(ctx.currentTime + 0.03)
  } catch {
    // 静默处理
  }
}

// 页面过渡音效
export const playTransition = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.4)
  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.5)
}

// 结局音效（小号般）
export const playEnding = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    playTone(freq, 0.35, 'sine', 0.2, now + i * 0.25)
    playTone(freq * 1.005, 0.35, 'sine', 0.15, now + i * 0.25)
  })
}

// 评级 S 音效（欢庆）
export const playGreatRating = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  const melody = [523, 659, 784, 784, 880, 784, 1047]
  const timings = [0, 0.15, 0.3, 0.5, 0.35, 0.15, 0.4]
  let t = now
  melody.forEach((freq, i) => {
    playTone(freq, 0.2, 'sine', 0.2, t)
    t += timings[i]
  })
}

// 普通评级音效
export const playNormalRating = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  playTone(440, 0.3, 'triangle', 0.2, now)
  playTone(349, 0.3, 'triangle', 0.2, now + 0.25)
}

// 差评级音效
export const playBadRating = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  playTone(330, 0.3, 'sawtooth', 0.1, now)
  playTone(262, 0.4, 'sawtooth', 0.1, now + 0.25)
}

// 打开面板音效
export const playPanelOpen = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  playTone(500, 0.06, 'square', 0.08, now)
  playTone(700, 0.06, 'square', 0.08, now + 0.05)
}

// 关闭面板音效
export const playPanelClose = () => {
  const ctx = getContext()
  const now = ctx.currentTime
  playTone(700, 0.06, 'square', 0.08, now)
  playTone(500, 0.06, 'square', 0.08, now + 0.05)
}

// 切换静音（SFX）
export const toggleMute = () => {
  muted.value = !muted.value
  return muted.value
}

// 是否静音
export const isMuted = () => muted.value

// 检查音频上下文是否可用（用于首次用户交互后恢复）
export const resumeContext = () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
}

export { muted }


// ==================== 背景音乐系统 (BGM) ====================

export type BgmZone = 'headquarters' | 'investigation'

// ===== BGM 音频文件路径配置 =====
// 将你的 mp3/ogg 文件放到 public/audio/ 目录下，文件名与此处对应即可。
const BGM_PATHS: Record<BgmZone, string> = {
  headquarters: '/audio/bgm_headquarters.mp3',
  investigation: '/audio/bgm_investigation.mp3',
}

// BGM 状态（响应式）
const bgmEnabled = ref(true)
const bgmVolume = ref(0.10) // 默认 10%

// 双 Audio 元素实现 crossfade
let activeAudio: HTMLAudioElement | null = null
let fadingAudio: HTMLAudioElement | null = null
let currentZone: BgmZone = 'headquarters'
let bgmInitialized = false
let fadeTimer: ReturnType<typeof setTimeout> | null = null

// ===== localStorage 持久化 =====

function loadBgmSettings() {
  try {
    const saved = localStorage.getItem('bgm_settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      // BGM 始终默认开启，仅保留音量偏好
      bgmEnabled.value = true
      bgmVolume.value = parsed.volume ?? 0.10
    }
  } catch { /* ignore */ }
}

function saveBgmSettings() {
  try {
    localStorage.setItem('bgm_settings', JSON.stringify({
      enabled: bgmEnabled.value,
      volume: bgmVolume.value,
    }))
  } catch { /* ignore */ }
}

// ===== Audio 元素辅助 =====

function createAudioElement(src: string, volume: number): HTMLAudioElement {
  const audio = new Audio(src)
  audio.loop = true
  audio.volume = volume
  audio.preload = 'auto'
  return audio
}

function fadeOutAndDestroy(audio: HTMLAudioElement, durationMs: number) {
  const startVol = audio.volume
  const startTime = performance.now()

  function step() {
    const elapsed = performance.now() - startTime
    const progress = Math.min(elapsed / durationMs, 1)
    audio.volume = startVol * (1 - progress)
    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      audio.pause()
      audio.src = ''
      audio.load()
    }
  }
  requestAnimationFrame(step)
}

function fadeIn(audio: HTMLAudioElement, targetVol: number, durationMs: number) {
  audio.volume = 0
  const startTime = performance.now()

  function step() {
    const elapsed = performance.now() - startTime
    const progress = Math.min(elapsed / durationMs, 1)
    audio.volume = targetVol * progress
    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }
  requestAnimationFrame(step)
}

function clearFadeTimer() {
  if (fadeTimer) {
    clearTimeout(fadeTimer)
    fadeTimer = null
  }
}

function cleanupAudio(audio: HTMLAudioElement | null) {
  if (!audio) return
  try {
    audio.pause()
    audio.src = ''
    audio.load()
  } catch { /* ignore */ }
}

// ===== 核心 API =====

function startBgm() {
  if (!bgmEnabled.value) return

  // 清理已有
  cleanupAudio(activeAudio)
  cleanupAudio(fadingAudio)
  clearFadeTimer()
  activeAudio = null
  fadingAudio = null

  // 创建并播放
  const audio = createAudioElement(BGM_PATHS[currentZone], bgmVolume.value)
  audio.play().catch(() => { /* 浏览器可能需要用户交互 */ })
  activeAudio = audio
  bgmInitialized = true
}

function stopBgm() {
  clearFadeTimer()
  cleanupAudio(activeAudio)
  cleanupAudio(fadingAudio)
  activeAudio = null
  fadingAudio = null
}

export function switchBgmZone(zone: BgmZone) {
  if (zone === currentZone && activeAudio) return
  currentZone = zone

  if (!bgmEnabled.value) return

  // 新音频开始加载
  const newAudio = createAudioElement(BGM_PATHS[zone], 0)
  newAudio.play().catch(() => { /* ignore */ })

  // 淡出旧音频
  if (activeAudio) {
    fadingAudio = activeAudio
    fadeOutAndDestroy(fadingAudio, 2000)
    clearFadeTimer()
    fadeTimer = setTimeout(() => {
      cleanupAudio(fadingAudio)
      fadingAudio = null
    }, 2200)
  }

  // 淡入新音频
  fadeIn(newAudio, bgmVolume.value, 1500)
  activeAudio = newAudio
}

export function toggleBgm(): boolean {
  bgmEnabled.value = !bgmEnabled.value
  saveBgmSettings()

  if (bgmEnabled.value) {
    startBgm()
  } else {
    stopBgm()
  }

  return bgmEnabled.value
}

export function setBgmVolume(vol: number) {
  bgmVolume.value = Math.max(0, Math.min(1, vol))
  saveBgmSettings()

  if (activeAudio && bgmEnabled.value) {
    activeAudio.volume = bgmVolume.value
  }
}

export function initBgm(initialZone?: BgmZone) {
  loadBgmSettings()
  if (initialZone) {
    currentZone = initialZone
  }
  if (bgmEnabled.value) {
    startBgm()
  }
  bgmInitialized = true
}

export function destroyBgm() {
  stopBgm()
  bgmInitialized = false
}

export function getBgmEnabled() { return bgmEnabled.value }
export function getBgmVolume() { return bgmVolume.value }
export function isBgmInitialized() { return bgmInitialized }
export { bgmEnabled }
