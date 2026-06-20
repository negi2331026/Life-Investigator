import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, InvestigationFile, RatingDetails } from '@/types/game'
import type { CaseData, DecisionOption } from '@/types/case'
import { GameEngine } from '@/engines/GameEngine'

export const useGameStore = defineStore('game', () => {
  // 游戏状态
  const gameState = ref<GameState | null>(null)
  
  // 当前案例数据
  const currentCase = ref<CaseData | null>(null)
  
  // 游戏引擎实例
  let gameEngine: GameEngine | null = null

  // 场景探索完成时保存的状态快照（仅图片收集阶段的线索）
  interface SceneSnapshot {
    discoveredClues: string[]
    investigationPoints: number
    completedChecks: string[]
    currentAge: number
  }
  const sceneSnapshot = ref<SceneSnapshot | null>(null)
  
  // 调查档案（常驻界面）
  const investigationFile = computed(() => gameState.value?.investigationFile || null)
  
  // 是否已初始化
  const isGameInitialized = computed(() => gameState.value !== null && gameState.value !== undefined)
  
  // 当前阶段
  const currentPhase = computed(() => gameState.value?.currentPhase || null)
  
  // 当前年龄
  const currentAge = computed(() => gameState.value?.investigationFile?.currentAge ?? 0)
  
  // 剩余调查点数
  const remainingPoints = computed(() => gameState.value?.investigationFile?.investigationPoints ?? 0)
  
  // 已发现线索
  const discoveredClues = computed(() => gameState.value?.investigationFile?.discoveredClues ?? [])
  
  // 已完成检查
  const completedChecks = computed(() => gameState.value?.investigationFile?.completedChecks ?? [])
  
  // 初始化游戏
  const initGame = (caseData: CaseData) => {
    currentCase.value = caseData
    gameEngine = new GameEngine(caseData)
    gameState.value = gameEngine.getInitialState()
  }
  
  // 发现线索
  const discoverClue = (clueId: string) => {
    if (!gameEngine) return
    gameEngine.discoverClue(clueId)
    gameState.value = { ...gameEngine.getState() }
  }
  
  // 做出决策
  const makeDecision = (decisionId: string, option: DecisionOption) => {
    if (!gameEngine) return
    gameEngine.makeDecision(decisionId, option)
    gameState.value = { ...gameEngine.getState() }
  }
  
  // 推进时间（事件驱动）
  const advanceTime = (targetAge: number) => {
    if (!gameEngine) return
    gameEngine.advanceTimeTo(targetAge)
    gameState.value = { ...gameEngine.getState() }
  }
  
  // 消耗调查点数
  const consumePoints = (amount: number) => {
    if (!gameEngine) return
    gameEngine.consumePoints(amount)
    gameState.value = { ...gameEngine.getState() }
  }
  
  // 计算评级
  const calculateRating = (): RatingDetails => {
    if (!gameEngine || !gameState.value) {
      return {
        rating: 'D',
        score: 0,
        clueDiscoveryRate: 0,
        resourceUtilization: 0,
        keyClueFound: false,
        diseaseStage: 'normal' as any,
        endingType: 'INVESTIGATION_FAILED' as any,
        feedback: '游戏未初始化',
        matchedEndingId: '',
        matchedEndingTitle: '调查失败',
        matchedEndingDescription: '游戏未能正常初始化，无法生成结局报告。'
      }
    }
    return gameEngine.calculateRating()
  }

  // 获取由 lifeEvent 锁定的下一决策
  const getNextDecisionId = (): string | null => {
    return gameEngine?.getNextDecisionId() ?? null
  }

  // 清除 nextDecisionId
  const clearNextDecisionId = () => {
    gameEngine?.clearNextDecisionId()
  }

  // 获取由决策选项锁定的下一阶段
  const getOptionNextDecisionId = (): string | undefined => {
    return gameState.value?.optionNextDecisionId
  }

  // 清除 optionNextDecisionId
  const clearOptionNextDecisionId = () => {
    if (gameState.value) {
      gameState.value.optionNextDecisionId = undefined
    }
  }
  
  // 重置游戏
  const resetGame = () => {
    if (!currentCase.value) return
    initGame(currentCase.value)
  }
  
  // 保存进度
  const saveProgress = () => {
    if (!gameState.value) return
    localStorage.setItem(`game_${gameState.value.caseId}`, JSON.stringify(gameState.value))
  }
  
  // 设置当前场景
  const setCurrentSceneId = (sceneId: string) => {
    if (!gameState.value) return
    gameState.value.currentSceneId = sceneId
  }
  
  // 加载进度
  const loadProgress = (caseId: string) => {
    const saved = localStorage.getItem(`game_${caseId}`)
    if (saved) {
      gameState.value = JSON.parse(saved)
    }
  }

  // 保存场景探索完成时的快照（仅图片收集阶段的线索）
  const saveSceneSnapshot = (snapshot: SceneSnapshot) => {
    sceneSnapshot.value = snapshot
  }

  // 获取场景探索完成时的快照
  const getSceneSnapshot = (): SceneSnapshot | null => {
    return sceneSnapshot.value
  }

  // 从快照恢复状态到引擎和 gameState（用于重新调查）
  const restoreFromSnapshot = (snapshot: SceneSnapshot): boolean => {
    if (!gameEngine || !gameState.value) return false
    gameEngine.restoreSceneDiscovery(
      snapshot.discoveredClues,
      snapshot.investigationPoints,
      snapshot.completedChecks,
      snapshot.currentAge
    )
    gameState.value.investigationFile.discoveredClues = [...gameEngine.getState().investigationFile.discoveredClues]
    gameState.value.investigationFile.investigationPoints = gameEngine.getState().investigationFile.investigationPoints
    gameState.value.investigationFile.completedChecks = [...gameEngine.getState().investigationFile.completedChecks]
    gameState.value.investigationFile.currentAge = gameEngine.getState().investigationFile.currentAge
    gameState.value.investigationFile.uninvestigatedAreas = [...gameEngine.getState().investigationFile.uninvestigatedAreas]
    return true
  }

  // 将当前场景线索写入 localStorage 作为恢复标记（在 resetGame 前调用）
  const saveClueRecovery = (caseId: string): void => {
    if (!gameState.value) return
    const state = gameState.value
    // 同时尝试从内存快照读取（更完整）
    const src = sceneSnapshot.value || state.investigationFile
    const payload = {
      discoveredClues: [...src.discoveredClues],
      investigationPoints: src.investigationPoints,
      completedChecks: [...(src.completedChecks || [])],
      currentAge: src.currentAge ?? state.investigationFile.currentAge
    }
    try {
      localStorage.setItem(`retry_recover_${caseId}`, JSON.stringify(payload))
    } catch { /* ignore */ }
  }

  // 页面加载后自动检测并恢复场景线索（由 DecisionPage / SceneExplorePage 调用）
  const recoverCluesAfterReset = (caseId: string): boolean => {
    if (!gameEngine || !gameState.value) return false
    const key = `retry_recover_${caseId}`
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return false
      const snapshot: SceneSnapshot = JSON.parse(raw)
      // 写入引擎
      gameEngine.retryFromCheckpoint(
        snapshot.discoveredClues,
        snapshot.investigationPoints,
        snapshot.completedChecks,
        snapshot.currentAge
      )
      // 同步到 gameState
      const st = gameEngine.getState()
      gameState.value.investigationFile = { ...st.investigationFile }
      gameState.value.diseaseFlags = { ...st.diseaseFlags }
      gameState.value.healthStage = st.healthStage
      gameState.value.currentPhase = st.currentPhase
      gameState.value.isEndingTriggered = st.isEndingTriggered
      gameState.value.endingType = st.endingType
      gameState.value.rating = st.rating
      gameState.value.timeEvents = st.timeEvents
      gameState.value.nextDecisionId = st.nextDecisionId
      gameState.value.optionNextDecisionId = st.optionNextDecisionId
      gameState.value.lastOptionId = st.lastOptionId
      // 清理恢复标记，避免下次误用
      localStorage.removeItem(key)
      return true
    } catch {
      localStorage.removeItem(key)
      return false
    }
  }
  
  return {
    gameState,
    currentCase,
    investigationFile,
    isGameInitialized,
    currentPhase,
    currentAge,
    remainingPoints,
    discoveredClues,
    completedChecks,
    initGame,
    discoverClue,
    makeDecision,
    advanceTime,
    consumePoints,
    calculateRating,
    resetGame,
    setCurrentSceneId,
    saveProgress,
    loadProgress,
    getNextDecisionId,
    clearNextDecisionId,
    getOptionNextDecisionId,
    getSceneSnapshot,
    saveSceneSnapshot,
    restoreFromSnapshot,
    saveClueRecovery,
    recoverCluesAfterReset,
    clearOptionNextDecisionId
  }
})
