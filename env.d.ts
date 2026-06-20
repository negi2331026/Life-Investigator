/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// html2canvas CDN 全局声明
declare function html2canvas(element: HTMLElement, options?: Record<string, any>): Promise<HTMLCanvasElement>
