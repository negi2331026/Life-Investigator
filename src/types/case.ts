// 案例数据类型定义

import { HealthStage, EndingType, GameRating } from './game'

// 案例主数据
export interface CaseData {
  caseId: string;                    // 案例ID
  caseName: string;                  // 案例名称
  cancerType: 'lung' | 'stomach' | 'colorectal'; // 癌种类型
  difficulty: 'easy' | 'medium' | 'hard'; // 难度
  character: CharacterInfo;          // 角色信息
  scenes: SceneData[];              // 场景列表
  clues: ClueData[];                // 线索列表
  decisionPoints: DecisionPoint[];   // 决策点列表
  lifeEvents: LifeEvent[];           // 人生事件（时间推进触发）
  endings: EndingData[];            // 结局列表
  bestRoute: BestRouteData;         // 最佳路线
  ratingCriteria: RatingCriteria;    // 评级标准
  icon?: string;                     // 首页卡片表情（可选，未提供时按癌种自动匹配）
  tags?: string[];                   // 首页标签（可选，未提供时自动生成）
}

// 角色信息
export interface CharacterInfo {
  name: string;
  age: number;
  gender: 'male' | 'female';
  occupation: string;
  symptoms: string[];               // 当前症状
  background: string;                // 背景描述
  portrait: string;                  // 肖像图片路径
}

// 场景数据
export interface SceneData {
  sceneId: string;
  sceneName: string;
  description: string;
  imageUrl: string;
  hotspots: HotspotData[];          // 热点列表
  isLocked: boolean;                // 是否锁定（需先完成某些行动）
  unlockCondition?: string;           // 解锁条件
}

// 热点数据
export interface HotspotData {
  hotspotId: string;
  x: number;                         // X坐标（百分比0-100）
  y: number;                         // Y坐标（百分比0-100）
  width: number;                     // 宽度（百分比）
  height: number;                    // 高度（百分比）
  clueId: string;                    // 关联线索ID
  tooltip: string;                   // 悬停提示
  isHidden: boolean;                 // 是否隐藏（需特殊条件显示）
}

// 线索数据
export interface ClueData {
  clueId: string;
  name: string;
  type: 'normal' | 'key' | 'hidden'; // 普通/关键/隐藏
  description: string;
  discoveryMethod: 'hotspot' | 'decision' | 'cost'; // 发现方式
  prerequisites: string[];           // 前置线索ID
  cost: number;                      // 消耗调查点数（隐藏线索）
  category: string;                  // 类别（症状/习惯/病史/家族史等）
  isKeyClue: boolean;              // 是否关键线索
}

// 决策点
export interface DecisionPoint {
  decisionId: string;
  triggerCondition: string;          // 触发条件（如"发现咳嗽症状"）
  triggerAge?: number;               // 触发年龄（可选）
  options: DecisionOption[];         // 选项列表
  nextLifeEvent?: string;            // 下一人生事件ID
  timeAdvanceTo?: number;           // 推进到指定年龄（事件驱动）
}

// 决策选项
export interface DecisionOption {
  optionId: string;
  text: string;                      // 选项文本
  consequence: string;               // 后果描述
  healthImpact: number;              // 健康影响（-10到+10）
  resourceCost: number;             // 资源消耗
  nextSceneId?: string;             // 下一场景ID
  unlocksClue?: string;            // 解锁的线索ID
  advancesTime: boolean;            // 是否推进时间
  timeAdvanceTo?: number;          // 推进到指定年龄
  healthStageChange?: HealthStage;  // 健康阶段变化（建议值，引擎最终计算）
  nextDecisionId?: string;          // 下一个决策ID（空字符串=直接结局，不设=按顺序）
  flags?: Record<string, boolean>;  // 选择此选项时设置的里程碑标记
}

// 人生事件（时间推进触发）
export interface LifeEvent {
  eventId: string;
  triggerAge: number;                // 触发年龄
  eventType: 'symptom_worsen' | 'new_symptom' | 'disease_progress' | 'checkup_result'; // 事件类型
  description: string;
  healthStage: HealthStage;          // 健康阶段（建议值）
  autoDiscoveryClues?: string[];     // 自动发现的线索
  triggerDecision?: string;          // 触发决策点ID
  requiredOptionId?: string;         // 仅在上一次选择了该选项时触发（用于分支）
  flags?: Record<string, boolean>;   // 触发此事件时设置的里程碑标记
}

// 结局数据
export interface EndingData {
  endingId: string;
  type: EndingType;
  title: string;
  description: string;
  condition: EndingCondition;        // 触发条件
  ratingRange: GameRating[];         // 对应评级
}

// 结局触发条件
export interface EndingCondition {
  minAge: number;                   // 最小年龄
  maxAge: number;                   // 最大年龄
  healthStage: HealthStage[];       // 允许的健康阶段
  keyClueFound?: boolean;           // true=必须找到关键线索，false=必须没找到，不设=不检查
  decisionMade: string[];           // 需做出的决策（空数组=任意决策）
  // 里程碑条件（新）：所有 listed 条件必须同时满足
  requiredMilestones?: Record<string, boolean>  // e.g. { "ctScreeningDone": true, "hemoptysisOccurred": false }
}

// 疾病里程碑定义（复盘页显示） — 每个癌种各自定义
export interface MilestoneDefinition {
  flagKey: string                    // diseaseFlags 中的 key
  label: string                      // 显示标签
  positive: boolean                  // true=触发是好事（如CT完成），false=触发是坏事（如咳血出现）
  triggeredText: string              // 触发时的描述
  notTriggeredText: string           // 未触发时的描述
}

// 最佳路线数据
export interface BestRouteData {
  route: RouteStep[];               // 路线步骤
  keyDecisionPoints: string[];       // 关键决策点
  knowledgePoints: KnowledgePoint[]; // 科普知识点
  milestones?: MilestoneDefinition[] // 疾病里程碑（复盘页）
}

// 路线步骤
export interface RouteStep {
  age: number;
  action: string;                    // 行动（如"胃镜检查"）
  description: string;               // 描述
  clueDiscovered?: string;          // 发现的线索
}

// 科普知识点
export interface KnowledgePoint {
  pointId: string;
  age: number;                       // 关联年龄
  content: string;                   // 内容（1-2句话）
  relatedClue: string;              // 相关线索
  category: string;                  // 类别
}

// 评级标准
export interface RatingCriteria {
  S: RatingCondition;               // S级条件
  A: RatingCondition;               // A级条件
  B: RatingCondition;               // B级条件
  C: RatingCondition;               // C级条件
  D: RatingCondition;               // D级条件
}

// 评级条件
export interface RatingCondition {
  minClueDiscoveryRate: number;     // 最小线索发现率
  maxResourceUsed: number;          // 最大资源使用率
  keyClueRequired: boolean;         // 是否需要关键线索
  maxDiseaseStage: HealthStage;     // 最大疾病阶段
  endingTypes: EndingType[];        // 允许的结局类型
}
