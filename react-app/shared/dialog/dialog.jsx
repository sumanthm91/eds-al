import React from 'react';
import './dialog.css';
import Icon from '../../library/icon/icon.jsx';

function Dialog({
  isOpen, children, onClose, containerClassName, headerClassName, bodyClassName,
}) {
  const dialogContainerClassName = `dialog__container ${containerClassName ?? ''}`.trim();
  const dialogHeaderClassNames = `dialog__header ${headerClassName ?? ''}`.trim();
  const dialogBodyClassNames = `dialog__body ${bodyClassName ?? ''}`.trim();

  const handleClose = (event) => {
    event.stopPropagation();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog__overlay">
      <div className={dialogContainerClassName}>
        <div className={dialogHeaderClassNames}>
          <Icon onIconClick={handleClose} name="close" className="icon-close-wrapper" />
        </div>
        <div className={dialogBodyClassNames}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Dialog;
