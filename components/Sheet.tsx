import React, { useEffect } from 'react';
import { AnimatePresence, motion, PanInfo, useDragControls } from 'framer-motion';

/**
 * iPhone-style bottom sheet: slides up with a spring, dims the screen,
 * and closes on a tap outside or a drag down on the handle.
 */
const Sheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** 'auto' hugs the content; 'tall' fills most of the screen (forms). */
  size?: 'auto' | 'tall';
  children: React.ReactNode;
}> = ({ open, onClose, size = 'auto', children }) => {
  const drag = useDragControls();

  // stop the page behind from scrolling while the sheet is up
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[520px] flex flex-col"
            style={{
              background: 'var(--sheet-bg)',
              color: 'var(--text-primary)',
              borderRadius: '30px 30px 0 0',
              borderTop: '1px solid var(--line)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              boxShadow: '0 -18px 50px rgba(0,0,0,0.35)',
              maxHeight: size === 'tall' ? 'calc(100dvh - max(40px, env(safe-area-inset-top)))' : '88dvh',
              height: size === 'tall' ? 'calc(100dvh - max(40px, env(safe-area-inset-top)))' : undefined,
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340, mass: 0.9 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex justify-center pt-2.5 pb-2 shrink-0 cursor-grab touch-none"
              onPointerDown={e => drag.start(e)}
            >
              <div className="h-[5px] w-[38px] rounded-full" style={{ background: 'var(--line)' }} />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Sheet;

/** Fades and lifts children in one after another. Wrap each block in <Rise>. */
export const riseParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
};
export const riseItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 26, stiffness: 300 } },
};
