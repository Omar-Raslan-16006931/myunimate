import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** Smoothly grows/shrinks its content instead of popping in and out. */
export const COLLAPSE_EASE = [0.4, 0, 0.2, 1] as const;

const Collapse: React.FC<{ open: boolean; children: React.ReactNode; className?: string }> = ({ open, children, className }) => (
  <AnimatePresence initial={false}>
    {open && (
      <motion.div
        key="collapse"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.28, ease: COLLAPSE_EASE }}
        style={{ overflow: 'hidden' }}
        className={className}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

export default Collapse;
