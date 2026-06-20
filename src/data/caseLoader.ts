// 静态导入所有案例数据（Vite 编译时解析路径，Windows 兼容）
import lungCancer from '@/data/cases/lung_cancer.json'
import stomachCancer from '@/data/cases/stomach_cancer.json'
import colorectalCancer from '@/data/cases/colorectal_cancer.json'

const caseMap: Record<string, any> = {
  lung_cancer: lungCancer,
  stomach_cancer: stomachCancer,
  colorectal_cancer: colorectalCancer,
}

/** 同步获取案例数据，无需异步加载 */
export function loadCaseData(caseId: string) {
  const data = caseMap[caseId]
  if (!data) {
    throw new Error(`未找到案例：${caseId}`)
  }
  return data
}
