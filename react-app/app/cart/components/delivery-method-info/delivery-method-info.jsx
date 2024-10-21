import React from 'react';
import './delivery-method-info.css';

function DeliveryMethodInfo({
  data, icon, content, isdisabled,
}) {
  return (
    <div className={`delivery-method-info-container ${!isdisabled ? 'delivery-method-info-container-inactive' : ''}`}>
      <span className={`delivery-method-info-label ${!isdisabled ? 'delivery-method-info-label--inactive' : 'delivery-method-info-label--active'}`}>
        {data}
      </span>
      <span className={`${icon} iconInfo`} />
      <span className="delivery-method-info-value">
        {content}
      </span>
    </div>
  );
}

export default DeliveryMethodInfo;
