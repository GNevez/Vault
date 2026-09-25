import { BrowserWindow, Rectangle, screen } from 'electron'
import Store from 'electron-store'

/**
 * The single window has two shapes:
 * - login: fixed 460 × 680, zoom 1 (the form is laid out for exactly that size);
 * - app: resizable with a minimum that keeps every module usable. The minimum is in CSS pixels,
 *   so it scales with the interface zoom, but never exceeds the screen the window is on.
 * There is no maximum: the window may fill any monitor.
 * The app bounds are remembered across sign-outs and launches.
 */
export const LOGIN_SIZE = { width: 460, height: 680 }
export const APP_MIN = { width: 1024, height: 640 }
const APP_DEFAULT = { width: 1280, height: 820 }

type SavedBounds = Rectangle & { maximized: boolean }
const store = new Store<{ app?: SavedBounds }>({ name: 'window-app-bounds' })

let mode: 'login' | 'app' = 'login'
let zoom = 1

const workAreaOf = (win: BrowserWindow) => screen.getDisplayMatching(win.getBounds()).workArea

/** True when enough of the rectangle is on some display to grab its title bar. */
const reachable = (b: Rectangle) => screen.getAllDisplays().some(({ workArea: a }) =>
  b.x + 120 <= a.x + a.width && b.x + b.width - 120 >= a.x && b.y >= a.y - 8 && b.y + 40 <= a.y + a.height)

function applyMinimum(win: BrowserWindow) {
  if (mode !== 'app') return
  const area = workAreaOf(win)
  win.setMinimumSize(Math.min(Math.round(APP_MIN.width * zoom), area.width), Math.min(Math.round(APP_MIN.height * zoom), area.height))
}

function saveAppBounds(win: BrowserWindow) {
  if (mode !== 'app' || win.isDestroyed() || win.isMinimized()) return
  const maximized = win.isMaximized()
  const bounds = maximized || win.isFullScreen() ? win.getNormalBounds() : win.getBounds()
  store.set('app', { ...bounds, maximized })
}

export function enterApp(win: BrowserWindow) {
  // A renderer reload inside the app asks again; keep whatever the user has now.
  if (mode === 'app') return
  mode = 'app'
  win.setResizable(true)
  win.setMaximizable(true)
  win.setFullScreenable(true)
  applyMinimum(win)

  const saved = store.get('app')
  if (saved && reachable(saved)) {
    win.setBounds({ x: saved.x, y: saved.y, width: saved.width, height: saved.height })
    applyMinimum(win) // the saved display may differ from the login's
    if (saved.maximized) win.maximize()
    return
  }
  const area = workAreaOf(win)
  const width = Math.min(APP_DEFAULT.width, area.width), height = Math.min(APP_DEFAULT.height, area.height)
  win.setBounds({ x: Math.round(area.x + (area.width - width) / 2), y: Math.round(area.y + (area.height - height) / 2), width, height })
}

export function enterLogin(win: BrowserWindow) {
  saveAppBounds(win)
  mode = 'login'
  if (win.isFullScreen()) win.setFullScreen(false)
  if (win.isMaximized()) win.unmaximize()
  win.webContents.setZoomFactor(1)
  win.setMinimumSize(0, 0)
  win.setResizable(true)
  win.setSize(LOGIN_SIZE.width, LOGIN_SIZE.height)
  win.center()
  win.setResizable(false)
  win.setMaximizable(false)
  win.setFullScreenable(false)
}

export function setZoom(win: BrowserWindow, value: number) {
  // Zoom belongs to the app; the login form is designed for 100%.
  zoom = Math.min(1.5, Math.max(0.8, value))
  if (mode !== 'app') return
  win.webContents.setZoomFactor(zoom)
  applyMinimum(win)
}

export const inApp = () => mode === 'app'

/** Keeps the minimum and the saved bounds right as the window moves between monitors and closes. */
export function trackWindow(win: BrowserWindow) {
  win.on('moved', () => applyMinimum(win))
  win.on('close', () => saveAppBounds(win))
  const notify = () => { if (!win.isDestroyed()) win.webContents.send('window-state', { maximized: win.isMaximized(), fullScreen: win.isFullScreen() }) }
  for (const event of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'] as const) win.on(event as 'maximize', notify)
}
