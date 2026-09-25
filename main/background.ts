import path from 'path'
import fs from 'fs'
import { app, ipcMain, BrowserWindow, dialog, shell } from 'electron'
import serve from 'electron-serve'
import { createWindow, enterApp, enterLogin, inApp, setZoom, trackWindow } from './helpers'

const isProd = process.env.NODE_ENV === 'production'
const logFile = path.join(app.getPath('userData'), 'debug.log')

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  fs.appendFileSync(logFile, line)
}

app.disableHardwareAcceleration()

if (isProd) {
  // Produção: só uma instância. Uma segunda tentativa foca a janela existente.
  if (!app.requestSingleInstanceLock()) app.exit(0)
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })
  serve({ directory: 'app' })
} else {
  // Dev: `--profile=<nome>` isola userData (localStorage/token) para rodar várias instâncias.
  const profile = process.argv.find(arg => arg.startsWith('--profile='))?.slice('--profile='.length)
  app.setPath('userData', `${app.getPath('userData')} (development${profile ? ` ${profile}` : ''})`)
}

;(async () => {
  await app.whenReady()
  log('App ready')

  const mainWindow = createWindow('main', {
    width: 460,
    height: 680,
    resizable: false,
    maximizable: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  })

  mainWindow.center()
  trackWindow(mainWindow)

  const trustedPage = (value: string) => {
    try {
      const url = new URL(value)
      return isProd ? url.protocol === 'app:' && url.hostname === '.' : url.origin === `http://localhost:${process.argv[2]}`
    } catch { return false }
  }
  mainWindow.webContents.session.setPermissionCheckHandler((contents, permission, _origin, details) => {
    if (contents !== mainWindow.webContents || !details.isMainFrame || !trustedPage(details.requestingUrl || contents.getURL())) return false
    return permission === 'media' ? details.mediaType === 'audio' : permission === 'clipboard-sanitized-write' || permission === 'fullscreen' || permission === 'notifications'
  })
  mainWindow.webContents.session.setPermissionRequestHandler((contents, permission, callback, details) => {
    const trusted = contents === mainWindow.webContents && details.isMainFrame && trustedPage(details.requestingUrl)
    const mediaTypes = 'mediaTypes' in details ? details.mediaTypes : undefined
    callback(!!trusted && (permission === 'media' ? !!mediaTypes?.length && mediaTypes.every(type => type === 'audio') : permission === 'clipboard-sanitized-write' || permission === 'fullscreen' || permission === 'speaker-selection' || permission === 'notifications'))
  })

  log('Window created')

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log(`Renderer process gone: ${JSON.stringify(details)}`)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log(`Failed to load: ${errorCode} ${errorDescription}`)
  })

  mainWindow.on('close', () => {
    log('Window close event fired')
  })

  mainWindow.on('closed', () => {
    log('Window closed event fired')
  })

  try {
    if (isProd) {
      await mainWindow.loadURL('app://./home')
    } else {
      const port = process.argv[2]
      log(`Loading URL: http://localhost:${port}/home`)
      await mainWindow.loadURL(`http://localhost:${port}/home`)
      log('URL loaded, opening DevTools')
      mainWindow.webContents.openDevTools()
    }
    log('URL loaded successfully')
  } catch (err) {
    log(`Error loading URL: ${err}`)
    dialog.showErrorBox('Electron Error', `Failed to load: ${err}`)
  }

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11' && inApp()) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
    if (input.type === 'keyDown' && input.key === 'F12') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools()
      } else {
        mainWindow.webContents.openDevTools()
      }
    }
  })
})()

app.on('window-all-closed', () => {
  app.quit()
})

const senderWindow = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => BrowserWindow.fromWebContents(event.sender)

ipcMain.on('app-set-zoom', (event, value) => {
  const win = senderWindow(event)
  const factor = Number(value)
  if (win && Number.isFinite(factor)) setZoom(win, factor)
})

ipcMain.handle('app-info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  platform: `${process.platform} ${process.arch}`,
}))

// The OS display language (e.g. "pt-BR"), not Chromium's UI locale.
ipcMain.handle('app-system-language', () => app.getPreferredSystemLanguages()[0] ?? app.getLocale())

ipcMain.handle('app-open-logs', () => shell.openPath(app.getPath('userData')))

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})

ipcMain.on('window-minimize', event => senderWindow(event)?.minimize())

ipcMain.on('window-maximize', event => {
  const win = senderWindow(event)
  if (!win || !inApp()) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})

ipcMain.on('window-close', event => senderWindow(event)?.close())

ipcMain.handle('window-state', event => {
  const win = senderWindow(event)
  return { maximized: !!win?.isMaximized(), fullScreen: !!win?.isFullScreen() }
})

// Sent by the renderer when it shows the app or the sign-in screen. Uses the sender's window,
// not the focused one: after an automatic sign-in at launch the window may not have focus yet.
ipcMain.on('window-enter-dashboard', event => { const win = senderWindow(event); if (win) enterApp(win) })
ipcMain.on('window-enter-login', event => { const win = senderWindow(event); if (win) enterLogin(win) })
