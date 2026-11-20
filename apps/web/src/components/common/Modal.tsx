import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Modal = ({
  isOpen,
  onClose,
  children,
  cardStyle,
  cardClassName,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  cardStyle?: React.CSSProperties;
  cardClassName?: string;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
        >
          <motion.div
            className={`modal-card ${cardClassName || ''}`}
            style={cardStyle}
            initial={{ opacity: 0, scale: 0.9, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.92, y: 16, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
