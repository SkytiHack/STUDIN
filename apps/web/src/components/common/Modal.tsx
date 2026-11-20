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
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className={`modal-card ${cardClassName || ''}`}
            style={cardStyle}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
