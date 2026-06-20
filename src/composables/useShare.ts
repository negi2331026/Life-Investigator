/**
 * 调查报告分享工具
 */
import { ref } from 'vue'

export interface ShareData {
  caseName: string
  rating: string
  score: number
  endingTitle: string
  endingDescription: string
  keyDecisions: { age: number; action: string }[]
  characterName: string
  characterAge: number
  clueCount: number
  totalClues: number
}

// 评级→称号映射
export function getTitle(rating: string): string {
  const map: Record<string, string> = {
    'S': '完美侦探',
    'A': '筛查先锋',
    'B': '尽职调查员',
    'C': '见习医师',
    'D': '初级观察员'
  }
  return map[rating] || '调查者'
}

// 运行时动态加载 html2canvas（多 CDN 回退）
function tryLoadHtml2canvas(): Promise<boolean> {
  const CDNS = [
    'https://cdn.bootcdn.net/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
  ]

  if (typeof (window as any).html2canvas === 'function') {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    let index = 0
    function tryNext() {
      if (index >= CDNS.length) {
        console.error('[Share] 所有 CDN 均已尝试，加载失败')
        resolve(false)
        return
      }
      const script = document.createElement('script')
      script.src = CDNS[index]
      script.onload = () => {
        console.log('[Share] html2canvas 加载成功: ' + CDNS[index])
        resolve(true)
      }
      script.onerror = () => {
        index++
        tryNext()
      }
      document.head.appendChild(script)
    }
    tryNext()
  })
}

export function useShare() {
  const isGenerating = ref(false)
  const shareImageUrl = ref<string | null>(null)
  const showShareModal = ref(false)
  const errorMsg = ref('')

  // 生成分享图片
  async function generateShareImage(element: HTMLElement): Promise<string | null> {
    isGenerating.value = true
    errorMsg.value = ''

    // 运行时加载 html2canvas（多 CDN 回退）
    const loaded = await tryLoadHtml2canvas()
    if (!loaded) {
      isGenerating.value = false
      errorMsg.value = '截图库加载失败，请检查网络连接'
      return null
    }

    try {
      const html2canvas = (window as any).html2canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      })
      const dataUrl = canvas.toDataURL('image/png')
      shareImageUrl.value = dataUrl
      return dataUrl
    } catch (e: any) {
      console.error('[Share] 截图失败:', e)
      errorMsg.value = '图片生成失败：' + (e?.message || '未知错误')
      shareImageUrl.value = null
      return null
    } finally {
      isGenerating.value = false
    }
  }

  // 下载PNG
  function downloadImage(dataUrl: string, filename: string) {
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  }

  // 复制图片到剪贴板
  async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
    try {
      const blob = await (await fetch(dataUrl)).blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      return true
    } catch {
      return false
    }
  }

  // 生成分享链接
  function generateShareLink(data: ShareData): string {
    const params = new URLSearchParams()
    params.set('case', data.caseName)
    params.set('rating', data.rating)
    params.set('title', getTitle(data.rating))
    params.set('score', String(data.score))
    params.set('ending', data.endingTitle)
    if (data.endingDescription) {
      params.set('desc', data.endingDescription.slice(0, 200))
    }
    const url = `https://life-investigator-7thu.vercel.app/share?${params.toString()}`
    return url
  }

  // 复制文本到剪贴板（三级降级：Clipboard API → execCommand → 手动选择）
  async function copyText(text: string): Promise<string> {
    // 方案一：现代 Clipboard API
    try {
      await navigator.clipboard.writeText(text)
      return 'ok'
    } catch {
      // 继续降级
    }

    // 方案二：传统 execCommand('copy') + textarea
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      ta.style.top = '-9999px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const success = document.execCommand('copy')
      document.body.removeChild(ta)
      if (success) return 'ok'
    } catch {
      // 继续降级
    }

    // 方案三：提示用户手动复制（iOS 特殊路径）
    return 'manual'
  }

  // 使用系统原生分享面板（移动端优先）
  async function shareViaSystem(data: { title: string; text: string; url: string }): Promise<string> {
    if (!navigator.share) {
      // 不支持则回退到复制链接
      const shareText = `${data.title}\n${data.text}\n${data.url}`
      return copyText(shareText)
    }
    try {
      await navigator.share({ title: data.title, text: data.text, url: data.url })
      return 'shared'
    } catch (err: any) {
      // 用户取消分享不算错误
      if (err?.name === 'AbortError') return 'cancelled'
      // 分享失败，降级为复制
      const shareText = `${data.title}\n${data.text}\n${data.url}`
      return copyText(shareText)
    }
  }

  // 生成分享文本
  function generateShareText(data: ShareData): string {
    const title = getTitle(data.rating)
    return `【生命调查局】${data.caseName}
🏅 获得称号：${title}
📊 评分：${data.rating} | ${data.score}分
📋 结局：${data.endingTitle}
💡 ${data.endingDescription}

—— 早筛查，早安心 ——`
  }

  function openShareModal() {
    showShareModal.value = true
  }

  function closeShareModal() {
    showShareModal.value = false
    shareImageUrl.value = null
    errorMsg.value = ''
  }

  return {
    isGenerating,
    shareImageUrl,
    showShareModal,
    errorMsg,
    generateShareImage,
    downloadImage,
    copyImageToClipboard,
    generateShareLink,
    copyText,
    shareViaSystem,
    generateShareText,
    openShareModal,
    closeShareModal
  }
}
