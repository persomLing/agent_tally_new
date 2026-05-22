import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'

function distDirs(): string[] {
  const out: string[] = []
  const dev = resolve(__dirname, 'dist/dev/mp-weixin')
  const build = resolve(__dirname, 'dist/build/mp-weixin')
  if (existsSync(dev)) out.push(dev)
  if (existsSync(build)) out.push(build)
  return out.length ? out : [dev]
}

function copyCloudFunctions(): any {
  return {
    name: 'copy-cloudfunctions',
    buildStart() {
      for (const dir of distDirs()) {
        copyDir(resolve(__dirname, 'cloudfunctions'), resolve(dir, 'cloudfunctions'))
      }
    },
    configureServer() {
      for (const dir of distDirs()) {
        copyDir(resolve(__dirname, 'cloudfunctions'), resolve(dir, 'cloudfunctions'))
      }
    },
    closeBundle() {
      for (const outDir of distDirs()) {
        copyDir(resolve(__dirname, 'cloudfunctions'), resolve(outDir, 'cloudfunctions'))
        const configPath = resolve(outDir, 'project.config.json')
        if (!existsSync(configPath)) continue
        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        if (!config.cloudfunctionRoot) {
          config.cloudfunctionRoot = 'cloudfunctions/'
          writeFileSync(configPath, JSON.stringify(config, null, 2))
        }
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
  optimizeDeps: {
    include: ['@climblee/uv-ui'],
  },
})
