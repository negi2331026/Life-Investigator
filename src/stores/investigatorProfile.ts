/**
 * 调查员档案 - 跨案件持久化进度追踪
 * 存储于 localStorage key: life_investigator_profile
 */

const STORAGE_KEY = 'life_investigator_profile'

export interface InvestigatorCaseRecord {
  caseId: string
  caseName: string
  rating: string     // S | A | B | C | D
  score: number
  completedAt: string // ISO date
}

export interface InvestigatorProfileData {
  completedCases: number
  totalCases: number
  averageRating: string
  rank: string
  completedCaseIds: string[]
  records: InvestigatorCaseRecord[]
}

function getDefaultProfile(): InvestigatorProfileData {
  return {
    completedCases: 0,
    totalCases: 0,
    averageRating: '--',
    rank: '见习调查员',
    completedCaseIds: [],
    records: []
  }
}

export function getInvestigatorProfile(): InvestigatorProfileData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultProfile()
    const data = JSON.parse(raw) as InvestigatorProfileData
    // 刷新 totalCases（从当前 JSON 动态统计）
    data.totalCases = countTotalCases()
    // 更新等级
    data.rank = calculateRank(data.completedCases)
    return data
  } catch {
    return getDefaultProfile()
  }
}

export function recordCaseCompletion(caseId: string, caseName: string, rating: string, score: number): void {
  const profile = getInvestigatorProfile()

  // 避免重复记录
  if (!profile.completedCaseIds.includes(caseId)) {
    profile.completedCaseIds.push(caseId)
    profile.records.push({
      caseId,
      caseName,
      rating,
      score,
      completedAt: new Date().toISOString()
    })
  } else {
    // 更新已有记录
    const existing = profile.records.find(r => r.caseId === caseId)
    if (existing) {
      existing.rating = rating
      existing.score = score
      existing.completedAt = new Date().toISOString()
    }
  }

  profile.completedCases = profile.completedCaseIds.length
  profile.totalCases = countTotalCases()

  // 计算平均评级
  const ratings = profile.records.map(r => ratingToNumber(r.rating)).filter(n => n > 0)
  if (ratings.length > 0) {
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
    profile.averageRating = numberToRating(avg)
  } else {
    profile.averageRating = '--'
  }

  profile.rank = calculateRank(profile.completedCases)

  saveProfile(profile)
}

function countTotalCases(): number {
  // 动态统计案例目录中的 JSON 文件数
  // 如果无法动态加载，回退到 records 中的数量
  return 3  // 当前 3 个案例
}

function ratingToNumber(rating: string): number {
  const map: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }
  return map[rating] || 0
}

function numberToRating(n: number): string {
  if (n >= 4.5) return 'S'
  if (n >= 3.5) return 'A'
  if (n >= 2.5) return 'B'
  if (n >= 1.5) return 'C'
  return 'D'
}

function calculateRank(completed: number): string {
  if (completed >= 3) return '首席调查员'
  if (completed >= 2) return '资深调查员'
  if (completed >= 1) return '初级调查员'
  return '见习调查员'
}

function saveProfile(profile: InvestigatorProfileData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // 静默失败
  }
}

export function resetProfile(): void {
  localStorage.removeItem(STORAGE_KEY)
}
