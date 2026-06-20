// 游戏核心类型定义

// 游戏阶段枚举
export enum GamePhase {
  CASE_INTRO = 'case_intro',           // 案件引入
  SCENE_EXPLORE = 'scene_explore',     // 场景探索
  CLUE_REVIEW = 'clue_review',         // 线索回顾
  DECISION = 'decision',               // 决策
  TIME_ADVANCE = 'time_advance',       // 时间推进
  EVENT_TRIGGER = 'event_trigger',      // 事件触发
  ENDING = 'ending',                   // 结局
  REVIEW = 'review'                    // 复盘
}

// 调查档案（常驻界面）
export interface InvestigationFile {
  caseId: string;
  characterName: string;
  currentAge: number;
  investigationPoints: number;
  discoveredClues: string[];           // 已发现线索ID列表
  completedChecks: string[];           // 已完成检查列表
  uninvestigatedAreas: string[];       // 待调查区域
  decisionHistory: DecisionRecord[];    // 决策历史
}

// 游戏状态
export interface GameState {
  caseId: string;
  currentPhase: GamePhase;
  currentSceneId: string;
  investigationFile: InvestigationFile;
  healthStage: HealthStage;           // 当前健康阶段（由引擎计算）
  diseaseFlags: DiseaseFlags;         // 疾病里程碑标记（不可逆）
  timeEvents: TimelineEvent[];         // 时间轴事件
  isEndingTriggered: boolean;
  endingType: EndingType | null;
  rating: RatingDetails | null;       // 调查评级
  nextDecisionId?: string;            // 由 lifeEvent 触发锁定的下一个决策
  optionNextDecisionId?: string;     // 由决策选项直接锁定的下一阶段（空字符串=结局）
  lastOptionId?: string;             // 最近一次选择的决策选项（用于分支过滤）
}

// 健康阶段（疾病状态机）
export enum HealthStage {
  NORMAL = 'normal',                       // 正常
  HIGH_RISK = 'high_risk',                // 高风险：存在危险因素但尚未发病
  SUSPICIOUS_SYMPTOMS = 'suspicious_symptoms', // 可疑症状：持续症状，需要筛查
  PROGRESSIVE_DISEASE = 'progressive_disease', // 疾病进展：症状加重，出现警示信号
  EARLY_CANCER = 'early_cancer',           // 早期癌症：筛查/检查发现早期病变，可治愈
  MID_CANCER = 'mid_cancer',              // 中期癌症：已有明显进展，治疗更复杂
  ADVANCED_CANCER = 'advanced_cancer'      // 晚期癌症：严重延误，预后差
}

// 疾病里程碑标记（不可逆事件）
// 支持肺癌 + 结直肠癌 + 胃癌的通用字段；[key: string]: any 允许任意癌种扩展
export interface DiseaseFlags {
  // ── 肺癌专用 ──
  ctScreeningDone: boolean            // 是否完成了CT/影像筛查
  ctScreeningAge?: number             // CT筛查时的年龄
  hemoptysisOccurred: boolean         // 是否出现了咳血（关键警示信号）
  noduleFound: boolean                // 是否发现了肺部结节
  // ── 结直肠癌专用 ──
  colonoscopyDone?: boolean           // 是否完成了肠镜检查
  colonoscopyAge?: number             // 肠镜检查时的年龄
  bloodStoolWorsened?: boolean        // 便血是否加重
  polypFound?: boolean                // 是否发现息肉样病变
  // ── 胃癌专用 ──
  gastroscopyDone?: boolean           // 是否完成了胃镜检查
  gastroscopyAge?: number             // 胃镜检查时的年龄
  blackStoolOccurred?: boolean        // 是否出现黑便
  ulcerFound?: boolean                // 是否发现可疑溃疡
  // ── 通用字段 ──
  missedEarlyScreening: boolean       // 是否在首次决策时跳过了检查
  severeDelay: boolean                // 是否在警示信号后仍选择观察/保守
  activeTreatment: boolean            // 是否采取了积极治疗（活检/手术等）
  referralOnly: boolean               // 仅转诊但未做影像/内镜检查
  // ── 扩展索引 ──
  [key: string]: boolean | number | undefined
}

// 时间轴事件
export interface TimelineEvent {
  age: number;
  eventType: 'symptom' | 'checkup' | 'treatment' | 'progression' | 'decision';
  description: string;
  healthStage: HealthStage;
  isPlayerAction: boolean;            // 是否是玩家行动
  milestone?: string;                 // 关联的里程碑名称（如 'hemoptysis', 'ct_screening'）
}

// 决策记录
export interface DecisionRecord {
  decisionId: string;
  selectedOptionId: string;
  age: number;
  consequence: string;
  healthImpact: number;               // 健康影响（-10到+10）
}

// 结局类型
export enum EndingType {
  PREVENTION = 'prevention',                   // 成功预防
  EARLY_DETECTION = 'early_detection',         // 早期发现
  MID_DETECTION = 'mid_detection',           // 中期发现
  LATE_DETECTION = 'late_detection',         // 晚期发现
  INVESTIGATION_FAILED = 'investigation_failed' // 调查失败
}

// 游戏评级
export enum GameRating {
  S = 'S',   // 完美：发现所有关键线索，早期发现，资源利用完美
  A = 'A',   // 优秀：发现大部分线索，早期发现
  B = 'B',   // 良好：发现关键线索，中期发现
  C = 'C',   // 一般：部分线索，晚期发现
  D = 'D'    // 较差：很少线索，调查失败
}

// 评级详情
export interface RatingDetails {
  rating: GameRating;
  score: number;                      // 0-100分
  clueDiscoveryRate: number;          // 线索发现率（0-1）
  resourceUtilization: number;        // 资源利用率（0-1）
  keyClueFound: boolean;             // 是否发现关键线索
  diseaseStage: HealthStage;         // 发现疾病时的阶段
  endingType: EndingType;            // 最终结局
  feedback: string;                  // 评价反馈
  matchedEndingId?: string;          // 引擎匹配到的结局ID（保证标题与评分一致）
  matchedEndingTitle?: string;       // 匹配结局的标题
  matchedEndingDescription?: string; // 匹配结局的描述
}
