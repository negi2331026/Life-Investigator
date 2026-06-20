import type { GameState, InvestigationFile, TimelineEvent, RatingDetails, DiseaseFlags } from '@/types/game'
import { GamePhase, HealthStage, EndingType, GameRating } from '@/types/game'
import type { CaseData, DecisionOption, LifeEvent } from '@/types/case'

export class GameEngine {
  private caseData: CaseData
  private state: GameState

  constructor(caseData: CaseData) {
    this.caseData = caseData
    this.state = this.createInitialState()
  }

  // 标准化 healthStage 字符串（兼容新旧 JSON 值）
  private normalizeStage(stage: string): HealthStage {
    const map: Record<string, HealthStage> = {
      // 新版
      'NORMAL': HealthStage.NORMAL,
      'HIGH_RISK': HealthStage.HIGH_RISK,
      'SUSPICIOUS_SYMPTOMS': HealthStage.SUSPICIOUS_SYMPTOMS,
      'PROGRESSIVE_DISEASE': HealthStage.PROGRESSIVE_DISEASE,
      'EARLY_CANCER': HealthStage.EARLY_CANCER,
      'MID_CANCER': HealthStage.MID_CANCER,
      'ADVANCED_CANCER': HealthStage.ADVANCED_CANCER,
      // 旧版兼容
      'SYMPTOM_APPEAR': HealthStage.SUSPICIOUS_SYMPTOMS,
      'PRECANCEROUS': HealthStage.PROGRESSIVE_DISEASE,
      'LATE_CANCER': HealthStage.ADVANCED_CANCER
    }
    return map[stage] || HealthStage.NORMAL
  }

  // 创建初始游戏状态
  private createInitialState(): GameState {
    const investigationFile: InvestigationFile = {
      caseId: this.caseData.caseId,
      characterName: this.caseData.character.name,
      currentAge: this.caseData.character.age,
      investigationPoints: 10,
      discoveredClues: [],
      completedChecks: [],
      uninvestigatedAreas: this.caseData.scenes.map(s => s.sceneName),
      decisionHistory: []
    }

    // 初始化所有里程碑为 false（覆盖全部三个癌种）
    const diseaseFlags: DiseaseFlags = {
      // 肺癌
      ctScreeningDone: false,
      hemoptysisOccurred: false,
      noduleFound: false,
      // 结直肠癌
      colonoscopyDone: false,
      bloodStoolWorsened: false,
      polypFound: false,
      // 胃癌
      gastroscopyDone: false,
      blackStoolOccurred: false,
      ulcerFound: false,
      // 通用
      missedEarlyScreening: false,
      severeDelay: false,
      activeTreatment: false,
      referralOnly: false
    }

    return {
      caseId: this.caseData.caseId,
      currentPhase: GamePhase.CASE_INTRO,
      currentSceneId: this.caseData.scenes[0]?.sceneId || '',
      investigationFile,
      healthStage: HealthStage.HIGH_RISK,
      diseaseFlags,
      timeEvents: [],
      isEndingTriggered: false,
      endingType: null,
      rating: null
    }
  }

  // ========== 疾病状态机：根据里程碑 + 年龄计算当前阶段 ==========
  // 支持肺癌、胃癌、结直肠癌三种癌种的通用状态机
  // 使用角色起始年龄作为基准，按相对年数计算疾病进展
  evaluateDiseaseStage(): HealthStage {
    const age = this.state.investigationFile.currentAge
    const f = this.state.diseaseFlags
    const startAge = this.caseData.character.age
    const yearsSinceStart = age - startAge

    // 任意筛查完成
    const anyScreening = f.ctScreeningDone || f.gastroscopyDone || f.colonoscopyDone
    // 任意严重警示信号出现
    const anySevereWarning = f.hemoptysisOccurred || f.blackStoolOccurred || f.bloodStoolWorsened

    // ---- 严重警示信号路线：已进入不可逆的晚期轨道 ----
    if (anySevereWarning) {
      // 警示信号后仍选择"继续观察/吃药" → 严重延误 → 晚期
      if (f.severeDelay || yearsSinceStart >= 8) return HealthStage.ADVANCED_CANCER
      // 警示信号后才做筛查 → 中期癌症
      return HealthStage.MID_CANCER
    }

    // ---- 筛查已完成：疾病被发现 ----
    if (anyScreening) {
      if (f.activeTreatment) {
        // 活检+治疗 = 早期癌症（已干预）
        return HealthStage.EARLY_CANCER
      }
      // 筛查发现但仅随访观察，按距起始年龄判断进展
      if (yearsSinceStart <= 2) return HealthStage.SUSPICIOUS_SYMPTOMS
      if (yearsSinceStart <= 4) return HealthStage.PROGRESSIVE_DISEASE
      if (yearsSinceStart <= 6) return HealthStage.EARLY_CANCER
      return HealthStage.MID_CANCER
    }

    // ---- 仅转诊但未做筛查：疾病随时间进展 ----
    if (f.referralOnly) {
      if (yearsSinceStart >= 5) return HealthStage.MID_CANCER
      if (yearsSinceStart >= 3) return HealthStage.PROGRESSIVE_DISEASE
      if (yearsSinceStart >= 1) return HealthStage.SUSPICIOUS_SYMPTOMS
      return HealthStage.HIGH_RISK
    }

    // ---- 未做任何筛查：按年龄自然进展 ----
    if (yearsSinceStart >= 5) return HealthStage.MID_CANCER
    if (yearsSinceStart >= 3) return HealthStage.PROGRESSIVE_DISEASE
    if (yearsSinceStart >= 1) return HealthStage.SUSPICIOUS_SYMPTOMS

    return HealthStage.HIGH_RISK
  }

  // 获取初始状态
  getInitialState(): GameState {
    return this.state
  }

  // 获取当前状态
  getState(): GameState {
    return this.state
  }

  // ========== 获取计算后的疾病阶段（供外部使用） ==========
  getComputedDiseaseStage(): HealthStage {
    return this.evaluateDiseaseStage()
  }

  // 获取疾病里程碑（供 EndingPage 结局匹配使用）
  getDiseaseFlags(): DiseaseFlags {
    return { ...this.state.diseaseFlags }
  }

  // 发现线索
  discoverClue(clueId: string): void {
    const clue = this.caseData.clues.find(c => c.clueId === clueId)
    if (!clue) return

    // 检查前置线索
    if (clue.prerequisites.length > 0) {
      const hasPrerequisites = clue.prerequisites.every(preId =>
        this.state.investigationFile.discoveredClues.includes(preId)
      )
      if (!hasPrerequisites) return
    }

    // 检查是否已发现
    if (this.state.investigationFile.discoveredClues.includes(clueId)) return

    // 隐藏线索需要消耗点数
    if (clue.type === 'hidden') {
      if (this.state.investigationFile.investigationPoints < clue.cost) return
      this.state.investigationFile.investigationPoints -= clue.cost
    }

    // 添加线索
    this.state.investigationFile.discoveredClues.push(clueId)

    // 更新待调查区域
    this.updateUninvestigatedAreas()

    // 记录时间轴事件
    this.addTimelineEvent({
      age: this.state.investigationFile.currentAge,
      eventType: 'decision',
      description: `发现线索：${clue.name}`,
      healthStage: this.state.healthStage,
      isPlayerAction: true
    })
  }

  // ========== 做出决策 ==========
  makeDecision(decisionId: string, option: DecisionOption): void {
    // 消耗资源
    if (option.resourceCost > 0) {
      this.state.investigationFile.investigationPoints -= option.resourceCost
    }

    // 记录决策
    this.state.investigationFile.decisionHistory.push({
      decisionId,
      selectedOptionId: option.optionId,
      age: this.state.investigationFile.currentAge,
      consequence: option.consequence,
      healthImpact: option.healthImpact
    })

    // 记录上次选项（用于分支 lifeEvent 过滤）
    this.state.lastOptionId = option.optionId

    // 如果选项锁定了下一决策
    if (option.nextDecisionId !== undefined) {
      this.state.optionNextDecisionId = option.nextDecisionId
    }

    // ----- 里程碑追踪 -----
    if (option.flags) {
      this.applyFlags(option.flags)
    }

    // 更新健康检查记录
    if (option.text.includes('检查') || option.text.includes('CT') ||
        option.text.includes('胃镜') || option.text.includes('肠镜')) {
      this.state.investigationFile.completedChecks.push(option.text)
    }

    // 解锁线索
    if (option.unlocksClue) {
      this.discoverClue(option.unlocksClue)
    }

    // 记录时间轴事件
    this.addTimelineEvent({
      age: this.state.investigationFile.currentAge,
      eventType: 'decision',
      description: `决策：${option.text}`,
      healthStage: this.state.healthStage,
      isPlayerAction: true
    })

    // 推进时间
    if (option.advancesTime && option.timeAdvanceTo) {
      this.advanceTimeTo(option.timeAdvanceTo)
    }
  }

  // ========== 推进时间到指定年龄 ==========
  advanceTimeTo(targetAge: number): void {
    const currentAge = this.state.investigationFile.currentAge

    // 更新年龄
    this.state.investigationFile.currentAge = targetAge

    // 触发人生事件
    this.triggerLifeEvents(currentAge, targetAge)

    // 时间推进后重新计算疾病阶段
    this.state.healthStage = this.evaluateDiseaseStage()
  }

  // ========== 触发人生事件 ==========
  private triggerLifeEvents(fromAge: number, toAge: number): void {
    const events = this.caseData.lifeEvents.filter(e =>
      e.triggerAge > fromAge && e.triggerAge <= toAge
    )

    events.sort((a, b) => a.triggerAge - b.triggerAge)

    for (const event of events) {
      // 分支过滤
      if (event.requiredOptionId && event.requiredOptionId !== this.state.lastOptionId) {
        continue
      }

      // 设置事件附带的里程碑标记
      if (event.flags) {
        this.applyFlags(event.flags)
      }

      // 自动发现线索
      if (event.autoDiscoveryClues) {
        for (const clueId of event.autoDiscoveryClues) {
          this.discoverClue(clueId)
        }
      }

      // 中间阶段评估疾病（在触发下一决策前）
      this.state.healthStage = this.evaluateDiseaseStage()

      // 记录时间轴事件
      this.addTimelineEvent({
        age: event.triggerAge,
        eventType: 'progression',
        description: event.description,
        healthStage: this.state.healthStage,
        isPlayerAction: false,
        milestone: event.flags && event.flags['hemoptysisOccurred'] ? 'hemoptysis' :
                   event.flags && event.flags['noduleFound'] ? 'nodule_found' : undefined
      })

      // 触发决策点
      if (event.triggerDecision) {
        this.state.currentPhase = GamePhase.DECISION
        this.state.nextDecisionId = event.triggerDecision
      }
    }
  }

  // ========== 应用里程碑标记（不可逆） ==========
  private applyFlags(flags: Record<string, boolean>): void {
    const f = this.state.diseaseFlags
    for (const [key, value] of Object.entries(flags)) {
      if (value === true && key in f) {
        (f as any)[key] = true
        // 自动派生：影像/内镜检查即自动发现病变
        if (key === 'ctScreeningDone') {
          f.noduleFound = true
          f.ctScreeningAge = this.state.investigationFile.currentAge
          f.referralOnly = false  // 实际已完成筛查，清除仅转诊标记
        }
        if (key === 'gastroscopyDone') {
          f.ulcerFound = true
          f.gastroscopyAge = this.state.investigationFile.currentAge
          f.referralOnly = false
        }
        if (key === 'colonoscopyDone') {
          f.polypFound = true
          f.colonoscopyAge = this.state.investigationFile.currentAge
          f.referralOnly = false
        }
      }
    }
  }

  // 获取由 lifeEvent 锁定的下一决策 ID
  getNextDecisionId(): string | null {
    return this.state.nextDecisionId || null
  }

  // 清除 nextDecisionId
  clearNextDecisionId(): void {
    this.state.nextDecisionId = undefined
  }

  // 添加时间轴事件
  private addTimelineEvent(event: TimelineEvent): void {
    this.state.timeEvents.push(event)
  }

  // 更新待调查区域
  private updateUninvestigatedAreas(): void {
    const investigatedAreas: string[] = []

    for (const scene of this.caseData.scenes) {
      const sceneClues = scene.hotspots.map(h => h.clueId)
      const allCluesFound = sceneClues.every(clueId =>
        this.state.investigationFile.discoveredClues.includes(clueId)
      )

      if (allCluesFound) {
        investigatedAreas.push(scene.sceneName)
      }
    }

    this.state.investigationFile.uninvestigatedAreas =
      this.caseData.scenes.map(s => s.sceneName)
        .filter(name => !investigatedAreas.includes(name))
  }

  // 消耗调查点数
  consumePoints(amount: number): void {
    this.state.investigationFile.investigationPoints -= amount
  }

  // ========== 检查是否发现关键线索 ==========
  private hasKeyClue(): boolean {
    return this.state.investigationFile.discoveredClues.some(clueId => {
      const clue = this.caseData.clues.find(c => c.clueId === clueId)
      return clue?.isKeyClue
    })
  }

  // ========== 结局匹配（与 calculateRating 共享同一状态） ==========
  private matchEnding(): { endingId: string; title: string; description: string; type: string } | null {
    const endings = this.caseData.endings
    if (!endings || endings.length === 0) return null

    const currentAge = this.state.investigationFile.currentAge
    const stage = this.evaluateDiseaseStage()
    const decisionsMade = this.state.investigationFile.decisionHistory.map(d => d.selectedOptionId)
    const f = this.state.diseaseFlags
    const hasKeyClue = this.hasKeyClue()

    // 标准化阶段名用于比较
    const normalizeS = (s: string): string => this.normalizeStage(s)

    // 从差到好遍历（最后一个最差），优先后匹配差结局
    for (let i = endings.length - 1; i >= 0; i--) {
      const e = endings[i]
      const cond = e.condition

      // 年龄匹配
      if (currentAge < cond.minAge || currentAge > cond.maxAge) continue

      // 阶段匹配
      const stageMatch = cond.healthStage.some((s: string) => normalizeS(s) === stage)
      if (!stageMatch) continue

      // 关键线索匹配
      if (cond.keyClueFound !== undefined) {
        if (cond.keyClueFound !== hasKeyClue) continue
      }

      // 决策匹配
      if (cond.decisionMade.length > 0) {
        if (!cond.decisionMade.some(d => decisionsMade.includes(d))) continue
      }

      // 里程碑匹配
      if (cond.requiredMilestones) {
        let milestoneOK = true
        for (const [key, expected] of Object.entries(cond.requiredMilestones)) {
          if ((f as any)[key] !== expected) { milestoneOK = false; break }
        }
        if (!milestoneOK) continue
      }

      return {
        endingId: e.endingId,
        title: e.title,
        description: e.description,
        type: e.type
      }
    }

    // 回退：按健康阶段宽松匹配（忽略决策历史约束），避免返回语义错误的结局
    for (let i = endings.length - 1; i >= 0; i--) {
      const e = endings[i]
      const cond = e.condition
      if (currentAge >= cond.minAge && currentAge <= cond.maxAge) {
        const stageMatch = cond.healthStage.some((s: string) => normalizeS(s) === stage)
        if (stageMatch) {
          return {
            endingId: e.endingId,
            title: e.title,
            description: e.description,
            type: e.type
          }
        }
      }
    }
    // 最终回退：最后一个结局（最差）
    const last = endings[endings.length - 1]
    return {
      endingId: last.endingId,
      title: last.title,
      description: last.description,
      type: last.type
    }
  }

  // ========== 里程碑驱动评级（通用：支持肺癌/胃癌/结直肠癌） ==========
  calculateRating(): RatingDetails {
    const totalClues = this.caseData.clues.length
    const discoveredClues = this.state.investigationFile.discoveredClues.length
    const clueDiscoveryRate = totalClues > 0 ? discoveredClues / totalClues : 0

    const totalPoints = 10
    const usedPoints = totalPoints - this.state.investigationFile.investigationPoints
    const resourceUtilization = usedPoints / totalPoints

    const keyClueFound = this.hasKeyClue()
    const stage = this.evaluateDiseaseStage()
    const f = this.state.diseaseFlags

    // 通用计算
    const anyScreening = f.ctScreeningDone || f.gastroscopyDone || f.colonoscopyDone
    const anySevereWarning = f.hemoptysisOccurred || f.blackStoolOccurred || f.bloodStoolWorsened

    // 统一匹配结局（引擎内部，保证与评级一致）
    const ending = this.matchEnding()

    let rating = GameRating.D
    let score = 0
    let feedback = ''

    // ===== S 级：完美预防/早期发现 =====
    // 条件：筛查完成 + 无严重警示 + 未错过早期窗口 + 积极治疗 + 早期阶段 + 关键线索
    if (anyScreening && !anySevereWarning && !f.missedEarlyScreening &&
        f.activeTreatment && stage <= HealthStage.EARLY_CANCER && keyClueFound) {
      rating = GameRating.S
      score = 90 + Math.random() * 10
      feedback = '完美！你在疾病萌芽阶段就通过筛查发现了风险，并及时采取积极干预。这是教科书级的筛查预防案例。'
    }
    // ===== A 级：筛查完成 + 早期阶段 + 关键线索 =====
    else if (anyScreening && !anySevereWarning &&
             stage <= HealthStage.PROGRESSIVE_DISEASE && keyClueFound) {
      rating = GameRating.A
      score = 80 + Math.random() * 10
      if (f.activeTreatment) {
        feedback = '优秀！你在早期阶段发现了病变并采取了治疗措施。早期发现是战胜癌症的关键，预后良好。'
      } else {
        feedback = '方向正确——及时通过筛查发现了问题。定期随访监控病变变化也是合理的处理策略。'
      }
    }
    // ===== B 级：筛查完成但存在延误或保守处理 =====
    else if (anyScreening && stage <= HealthStage.PROGRESSIVE_DISEASE) {
      rating = GameRating.B
      score = 65 + Math.random() * 10
      feedback = '虽然完成了关键筛查并发现了病变，但过程中存在一些延误或保守处理。如果能更早重视并积极干预，预后会更理想。'
    }
    // ===== B/C 临界：筛查完成但阶段偏晚或无关键线索 =====
    else if (anyScreening && stage <= HealthStage.EARLY_CANCER) {
      rating = GameRating.B
      score = 62 + Math.random() * 10
      feedback = '筛查及时发现了病变，但处理过程中存在不足。早筛查是第一步，积极跟进同样重要。'
    }
    // ===== C 级：仅转诊但未完成筛查 =====
    else if (f.referralOnly && !anyScreening && !anySevereWarning) {
      if (stage <= HealthStage.SUSPICIOUS_SYMPTOMS) {
        rating = GameRating.B
        score = 62 + Math.random() * 10
        feedback = '转诊是正确的第一步，但没有完成关键的筛查检查让诊断不够充分。下一步请务必完成检查。'
      } else {
        rating = GameRating.C
        score = 50 + Math.random() * 10
        feedback = '转诊后没有及时完成筛查，疾病有了进展的空间。每一次延误都在给疾病机会。'
      }
    }
    // ===== C 级：严重警示信号后才筛查 =====
    else if (anySevereWarning && anyScreening && !f.severeDelay) {
      rating = GameRating.C
      score = 45 + Math.random() * 15
      feedback = '出现严重警示信号是明确的警告。虽然在症状加重后采取了行动，但已经错过了最佳筛查时机。'
    }
    // ===== C 级：错过了早期筛查窗口 =====
    else if (f.missedEarlyScreening && stage <= HealthStage.PROGRESSIVE_DISEASE) {
      rating = GameRating.C
      score = 50 + Math.random() * 15
      feedback = '在首次出现症状时选择了观察等待，错过了早期筛查的窗口期。疾病不会因为我们的等待而停止进展。'
    }
    // ===== D 级：严重警示后继续观察 → 晚期 =====
    else if (anySevereWarning && f.severeDelay) {
      rating = GameRating.D
      score = Math.random() * 30
      feedback = '出现警示信号后仍选择了保守观察。一次次延误让疾病发展到了难以挽回的阶段。早筛查真的能救命。'
    }
    // ===== D 级：完全忽视 =====
    else {
      rating = GameRating.D
      score = Math.random() * 35
      feedback = '错过了所有关键筛查和干预时机。反复的观察和等待让病情持续恶化。请记住：早筛查就是保命！'
    }

    this.state.rating = {
      rating,
      score: Math.round(score),
      clueDiscoveryRate,
      resourceUtilization,
      keyClueFound,
      diseaseStage: stage,
      endingType: this.state.endingType || EndingType.INVESTIGATION_FAILED,
      feedback,
      matchedEndingId: ending?.endingId,
      matchedEndingTitle: ending?.title,
      matchedEndingDescription: ending?.description
    }

    return this.state.rating
  }

  // 重置游戏
  reset(): void {
    this.state = this.createInitialState()
  }

  // 批量恢复场景探索完成的线索状态（用于重新调查）
  restoreSceneDiscovery(clueIds: string[], points: number, checks: string[], age: number): void {
    for (const clueId of clueIds) {
      if (!this.state.investigationFile.discoveredClues.includes(clueId)) {
        this.state.investigationFile.discoveredClues.push(clueId)
      }
    }
    this.state.investigationFile.investigationPoints = points
    this.state.investigationFile.completedChecks = checks.slice()
    this.state.investigationFile.currentAge = age

    // 重新计算待调查区域
    const investigatedSceneNames: string[] = []
    for (const scene of this.caseData.scenes) {
      const sceneClueIds = scene.hotspots.map(h => h.clueId)
      const allFound = sceneClueIds.every(cid => clueIds.includes(cid))
      if (allFound) investigatedSceneNames.push(scene.sceneName)
    }
    this.state.investigationFile.uninvestigatedAreas = this.caseData.scenes
      .map(s => s.sceneName)
      .filter(name => !investigatedSceneNames.includes(name))
  }

  // 重新调查：保留场景探索的线索状态，重置决策/时间线/标记
  // 比 reset() + restoreSceneDiscovery() 更可靠，避免引擎重建导致的同步问题
  retryFromCheckpoint(clueIds: string[], points: number, checks: string[], age: number): void {
    // 1. 保留发现线索
    const preservedClues = [...clueIds]
    this.state.investigationFile.discoveredClues = preservedClues

    // 2. 保留调查点数和已完成检查
    this.state.investigationFile.investigationPoints = points
    this.state.investigationFile.completedChecks = [...checks]
    this.state.investigationFile.currentAge = age

    // 3. 清除所有决策相关状态
    this.state.investigationFile.decisionHistory = []

    // 4. 重新计算待调查区域
    this.state.investigationFile.uninvestigatedAreas = []
    for (const scene of this.caseData.scenes) {
      const sceneClueIds = scene.hotspots.map(h => h.clueId)
      const allFound = sceneClueIds.every(cid => preservedClues.includes(cid))
      if (!allFound) {
        this.state.investigationFile.uninvestigatedAreas.push(scene.sceneName)
      }
    }

    // 5. 清除时间线事件
    this.state.timeEvents = []

    // 6. 重置疾病标记回初始
    this.state.diseaseFlags = {
      ctScreeningDone: false, hemoptysisOccurred: false, noduleFound: false,
      colonoscopyDone: false, bloodStoolWorsened: false, polypFound: false,
      gastroscopyDone: false, blackStoolOccurred: false, ulcerFound: false,
      missedEarlyScreening: false, severeDelay: false, activeTreatment: false,
      referralOnly: false
    }

    // 7. 重置阶段和结局状态
    this.state.healthStage = HealthStage.HIGH_RISK
    this.state.currentPhase = GamePhase.DECISION
    this.state.isEndingTriggered = false
    this.state.endingType = null
    this.state.rating = null
    this.state.nextDecisionId = undefined
    this.state.optionNextDecisionId = undefined
    this.state.lastOptionId = undefined
  }
}
