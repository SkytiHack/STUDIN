import type { ReactNode } from 'react';

export const Modal = ({ isOpen, onClose, children, cardStyle, cardClassName }: { isOpen: boolean; onClose: () => void; children: ReactNode; cardStyle?: React.CSSProperties; cardClassName?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-card rise ${cardClassName || ''}`} style={cardStyle} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};
