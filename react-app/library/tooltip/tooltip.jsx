import React, { useState } from 'react';
import './tooltip.css';

function Tooltip({ content, children }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="tooltip-container"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {visible && (
        <div className="tooltip-content" dangerouslySetInnerHTML={{ __html: content }} />
      )}
      {children}
    </div>
  );
}

export default Tooltip;
