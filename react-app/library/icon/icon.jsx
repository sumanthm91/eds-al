/* eslint-disable react/jsx-props-no-spreading */
import React, { useEffect, useRef } from 'react';
import './icon.css';
import { decorateIcons } from '../../../scripts/aem.js';

function Icon({
  name, id, className, onIconClick,
}) {
  const iconRef = useRef();

  useEffect(() => {
    if (iconRef?.current) decorateIcons(iconRef.current);
  }, []);

  return (
    <div ref={iconRef} className={`icon-container ${className ?? ''}`} {...(id ? { id } : {})}>
      <span {...(onIconClick ? { onClick: onIconClick } : {})} className={`icon icon-${name}`} />
    </div>
  );
}

export default Icon;
