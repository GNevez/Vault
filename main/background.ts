import path from 'path'
import fs from 'fs'
import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'

const isProd = process.env.NODE_ENV === 'production'
const logFile = path.join(app.getPath('userData'), 'debug.log')

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  fs.appendFileSync(logFile, line)
}

app.disableHardwareAcceleration()

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
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
    },
  })

  mainWindow.center()

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
    if (input.type === 'keyDown' && input.key === 'F11') {
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

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})

ipcMain.on('window-minimize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) win.minimize()
})

ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) win.close()
})

ipcMain.on('window-enter-dashboard', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    win.setResizable(true)
    win.setMaximizable(true)
    win.setMinimumSize(800, 600)
    win.setSize(1060, 880, true)
    win.center()
  }
})

ipcMain.on('window-enter-login', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    win.setResizable(false)
    win.setMaximizable(false)
    win.setSize(460, 680, true)
    win.center()
  }
})
