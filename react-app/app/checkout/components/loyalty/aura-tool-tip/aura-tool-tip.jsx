import React from 'react';
import './aura-tool-tip.css';
import Icon from '../../../../../library/icon/icon.jsx';

function AuraToolTip({
  data, type, content, newClass, salesPoints,
}) {
  return (
    <div className={`aura-tool-tip ${newClass || ''}`}>
      <span className="aura-tool-tip__title">
        {data}
      </span>
      <div className="aura-tool-tip__wrapper">
        {
          newClass
          ? (<span className={newClass}></span>)
          : (<Icon name={type} className="aura-tool-tip__icon" />)
        }
        <span className="aura-tool-tip__info-value blue-bg">
          {content}
        </span>
      </div>
    </div>
  );
}
export default AuraToolTip;
