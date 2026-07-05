import { useEffect, type ReactNode } from 'react'
import { motion, useDragControls, type PanInfo } from 'framer-motion'

/** Drag past this many px (or flick faster than the velocity threshold) to dismiss. */
const DISMISS_OFFSET_PX = 120
const DISMISS_VELOCITY = 600

export interface BottomSheetProps {
  onClose: () => void
  /** Accessible dialog label. */
  ariaLabel: string
  /**
   * Non-scrolling header region (title etc.). Together with the grab handle it
   * forms the DEDICATED drag region — so the body below can scroll normally
   * without fighting the dismiss gesture.
   */
  header?: ReactNode
  /** Scrolling sheet body. */
  children: ReactNode
  /** Optional sticky element pinned between the drag region and the body. */
  sticky?: ReactNode
  /** Enable drag-to-dismiss (default true). */
  draggable?: boolean
  'data-testid'?: string
}

/**
 * Bottom sheet with proper drag-to-dismiss (framer-motion).
 *
 * The enter animation is pure CSS (`.overlay-backdrop` fade + `.sheet-outer`
 * slide-up) and dismissal is an instant unmount, so this component is
 * deliberately NOT wrapped in an `AnimatePresence`. That matters: framer's
 * AnimatePresence will not complete an exit for any subtree that contains a
 * live `drag` element, which would otherwise leave the sheet stuck on screen.
 * framer is used ONLY for the drag gesture on the inner card.
 *
 * The gesture is started solely from the grab handle / header (`useDragControls`
 * + `dragListener={false}`), so scrolling the body never dismisses. Release past
 * ~120 px or with a downward flick closes; otherwise it springs back
 * (`dragSnapToOrigin`). Dialog semantics kept: `role="dialog"`, `aria-modal`,
 * Escape + backdrop close.
 */
export function BottomSheet({
  onClose,
  ariaLabel,
  header,
  children,
  sticky,
  draggable = true,
  'data-testid': testId,
}: BottomSheetProps) {
  const controls = useDragControls()

  // Escape closes; matches the backdrop-click affordance.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) {
      onClose()
    }
  }

  return (
    <div
      className="overlay-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="sheet-outer" onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="sheet"
          data-testid={testId}
          drag={draggable ? 'y' : false}
          dragControls={controls}
          dragListener={false}
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
        >
          <div
            className="sheet-drag"
            onPointerDown={draggable ? (e) => controls.start(e) : undefined}
            style={draggable ? { touchAction: 'none' } : undefined}
            aria-hidden={header ? undefined : true}
          >
            <div className="sheet-handle" />
            {header}
          </div>
          {sticky}
          <div className="sheet-body">{children}</div>
        </motion.div>
      </div>
    </div>
  )
}
