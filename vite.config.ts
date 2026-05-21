import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'

function copyCloudFunctions(): any {
  return {
    name: 'copy-cloudfunctions',
    buildStart() {
      const src = resolve(__dirname, 'cloudfunctions')
      const dest = resolve(__dirname, 'dist/dev/mp-weixin/cloudfunctions')
      copyDir(src, dest)
    },
    configureServer() {
      const src = resolve(__dirname, 'cloudfunctions')
      const dest = resolve(__dirname, 'dist/dev/mp-weixin/cloudfunctions')
      copyDir(src, dest)
    },
  }
}

function copyDir(src: string, dest: string) {
  if (!existsSync(src)) return
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = resolve(src, entry)
    const destPath = resolve(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

export default defineConfig({
  plugins: [uni(), copyCloudFunctions()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
