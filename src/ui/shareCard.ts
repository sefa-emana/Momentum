/**
 * On-device share cards — 1080×1920 (9:16) PNGs rendered directly on an
 * offscreen canvas. No external assets, no network, no server: everything is
 * drawn by hand and shared via the Web Share API (with a download fallback), so
 * it is fully privacy-preserving. Brand palette mirrors the app's LIGHT tokens
 * (premium-minimal: clean white card, single warm-orange accent).
 */

const W = 1080
const H = 1920

// Brand palette (from src/ui/theme.css — light tokens).
const COLORS = {
  bg0: '#ffffff',
  bg1: '#ffffff',
  bg2: '#f7f7f9',
  text: '#17171a',
  dim: '#6e7076',
  faint: '#a6a8af',
  accent: '#ff6b3d',
  accentHot: '#ff3d6e',
  xp: '#3a3a3c',
  green: '#34c759',
  blue: '#5b8def',
  ring: '#ececef',
}

const FONT_FAMILY = 'Space Grotesk Variable'

/** Ensure Space Grotesk is available for canvas text; fall back to sans-serif. */
async function fontStack(): Promise<string> {
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await Promise.all([
        document.fonts.load(`700 96px "${FONT_FAMILY}"`),
        document.fonts.load(`600 48px "${FONT_FAMILY}"`),
        document.fonts.load(`500 36px "${FONT_FAMILY}"`),
      ])
      if (document.fonts.check(`700 96px "${FONT_FAMILY}"`)) {
        return `"${FONT_FAMILY}"`
      }
    }
  } catch {
    /* font loading unsupported — fall through to the system stack */
  }
  return 'sans-serif'
}

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  return canvas
}

/** Shared backdrop: clean white canvas + a very soft warm radial glow up top. */
function paintBackdrop(ctx: CanvasRenderingContext2D, glow: string): void {
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, COLORS.bg0)
  bg.addColorStop(0.6, COLORS.bg0)
  bg.addColorStop(1, COLORS.bg2)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const glowGrad = ctx.createRadialGradient(W / 2, 360, 40, W / 2, 360, 760)
  glowGrad.addColorStop(0, glow)
  glowGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, W, H)
}

/** The Momentum wordmark + a small flame glyph, top-centred. */
function paintWordmark(ctx: CanvasRenderingContext2D, font: string): void {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = `600 44px ${font}`
  ctx.fillStyle = COLORS.dim
  ctx.letterSpacing = '10px'
  ctx.fillText('▲ MOMENTUM', W / 2, 200)
  ctx.letterSpacing = '0px'
  ctx.restore()
}

/** A momentum ring (0–100) drawn as a canvas arc, centred at (cx, cy). */
function paintRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  value: number,
  font: string,
): void {
  const pct = Math.max(0, Math.min(100, value)) / 100
  const start = -Math.PI / 2
  const end = start + pct * Math.PI * 2

  ctx.lineCap = 'round'
  // Track.
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = COLORS.ring
  ctx.lineWidth = 34
  ctx.stroke()

  // Progress arc with the flame gradient.
  const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius)
  grad.addColorStop(0, COLORS.accent)
  grad.addColorStop(1, COLORS.accentHot)
  ctx.beginPath()
  ctx.arc(cx, cy, radius, start, end)
  ctx.strokeStyle = grad
  ctx.lineWidth = 34
  ctx.shadowColor = 'rgba(255,107,61,0.5)'
  ctx.shadowBlur = 40
  ctx.stroke()
  ctx.shadowBlur = 0

  // Centred value (tabular figures via the drawn font).
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = COLORS.text
  ctx.font = `700 150px ${font}`
  ctx.fillText(String(Math.round(value)), cx, cy - 8)
  ctx.font = `500 34px ${font}`
  ctx.fillStyle = COLORS.dim
  ctx.fillText('MOMENTUM', cx, cy + 92)
  ctx.textBaseline = 'alphabetic'
}

/** A single big-number stat block. */
function paintStat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  value: string,
  label: string,
  color: string,
  font: string,
): void {
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.font = `700 110px ${font}`
  ctx.fillText(value, cx, y)
  ctx.fillStyle = COLORS.dim
  ctx.font = `500 32px ${font}`
  ctx.fillText(label, cx, y + 54)
}

/** Draw a simple medal (achievement) glyph centred at (cx, cy). */
function paintMedal(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Ribbon.
  ctx.fillStyle = COLORS.accentHot
  ctx.beginPath()
  ctx.moveTo(cx - 70, cy - 150)
  ctx.lineTo(cx - 20, cy - 150)
  ctx.lineTo(cx - 40, cy + 20)
  ctx.lineTo(cx - 100, cy + 20)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = COLORS.accent
  ctx.beginPath()
  ctx.moveTo(cx + 70, cy - 150)
  ctx.lineTo(cx + 20, cy - 150)
  ctx.lineTo(cx + 40, cy + 20)
  ctx.lineTo(cx + 100, cy + 20)
  ctx.closePath()
  ctx.fill()

  // Coin.
  const grad = ctx.createLinearGradient(cx - 130, cy - 40, cx + 130, cy + 160)
  grad.addColorStop(0, COLORS.accent)
  grad.addColorStop(1, COLORS.accentHot)
  ctx.beginPath()
  ctx.arc(cx, cy + 70, 130, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.shadowColor = 'rgba(255,61,110,0.45)'
  ctx.shadowBlur = 50
  ctx.fill()
  ctx.shadowBlur = 0

  // Inner ring + star.
  ctx.beginPath()
  ctx.arc(cx, cy + 70, 100, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 6
  ctx.stroke()
  paintStar(ctx, cx, cy + 70, 58, 26)
}

function paintStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
): void {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = COLORS.text
  ctx.fill()
}

/** Word-wrap helper for long titles. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
      'image/png',
    )
  })
}

export interface WeeklyRecapData {
  name?: string
  /** Sessions logged this ISO week. */
  sessions: number
  /** WHO activity points this week. */
  whoPoints: number
  /** Current streak length. */
  streak: number
  /** Momentum 0–100 (drawn as the ring). */
  momentum: number
}

/** Render the weekly-recap card (ring + three headline stats). */
export async function renderWeeklyRecapCard(data: WeeklyRecapData): Promise<Blob> {
  const font = await fontStack()
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  paintBackdrop(ctx, 'rgba(255,107,61,0.1)')
  paintWordmark(ctx, font)

  ctx.save()
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.text
  ctx.font = `600 58px ${font}`
  ctx.fillText('Wochenrückblick', W / 2, 320)
  if (data.name) {
    ctx.fillStyle = COLORS.dim
    ctx.font = `500 38px ${font}`
    ctx.fillText(data.name, W / 2, 378)
  }
  ctx.restore()

  paintRing(ctx, W / 2, 760, 250, data.momentum, font)

  const row = 1300
  paintStat(ctx, W / 2 - 320, row, String(data.sessions), 'Einheiten', COLORS.accent, font)
  paintStat(ctx, W / 2, row, String(data.whoPoints), 'WHO-Punkte', COLORS.text, font)
  paintStat(ctx, W / 2 + 320, row, String(data.streak), 'Streak', COLORS.green, font)

  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.faint
  ctx.font = `500 30px ${font}`
  ctx.fillText('Evidenzbasierter Sport-Tracker', W / 2, 1760)

  return toBlob(canvas)
}

export interface AchievementCardData {
  title: string
  subtitle?: string
}

/** Render the achievement-unlock card (medal glyph + title). */
export async function renderAchievementCard(data: AchievementCardData): Promise<Blob> {
  const font = await fontStack()
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  paintBackdrop(ctx, 'rgba(255,61,110,0.1)')
  paintWordmark(ctx, font)

  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.accent
  ctx.font = `600 40px ${font}`
  ctx.letterSpacing = '6px'
  ctx.fillText('NEUER ERFOLG', W / 2, 360)
  ctx.letterSpacing = '0px'

  paintMedal(ctx, W / 2, 720)

  // Title (wrapped) + optional subtitle.
  ctx.fillStyle = COLORS.text
  ctx.font = `700 84px ${font}`
  const lines = wrapLines(ctx, data.title, W - 200)
  let ty = 1180
  for (const line of lines) {
    ctx.fillText(line, W / 2, ty)
    ty += 104
  }
  if (data.subtitle) {
    ctx.fillStyle = COLORS.dim
    ctx.font = `500 40px ${font}`
    const subLines = wrapLines(ctx, data.subtitle, W - 260)
    ty += 20
    for (const line of subLines) {
      ctx.fillText(line, W / 2, ty)
      ty += 56
    }
  }

  ctx.fillStyle = COLORS.faint
  ctx.font = `500 30px ${font}`
  ctx.fillText('Momentum · evidenzbasierter Sport-Tracker', W / 2, 1760)

  return toBlob(canvas)
}

/**
 * Share (or download) a rendered card. Prefers native Web Share with the file
 * attached; falls back to a download link when file-sharing is unsupported.
 * A user-cancelled share is treated as success (no surprise download).
 */
export async function shareImage(
  blob: Blob,
  filename: string,
  title: string,
  text?: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === 'function'
    ) {
      await navigator.share({ files: [file], title, text })
      return 'shared'
    }
  } catch (err) {
    // User dismissed the share sheet → do not also trigger a download.
    if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
    /* otherwise fall through to the download fallback */
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
