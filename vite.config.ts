import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'

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
    closeBundle() {
      const configPath = resolve(__dirname, 'dist/dev/mp-weixin/project.config.json')
      if (!existsSync(configPath)) return
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      if (!config.cloudfunctionRoot) {
        config.cloudfunctionRoot = 'cloudfunctions/'
        writeFileSync(configPath, JSON.stringify(config, null, 2))
      }
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
