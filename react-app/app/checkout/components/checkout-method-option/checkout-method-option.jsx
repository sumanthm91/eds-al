import React from 'react';
import './checkout-method-option.css';
import Icon from '../../../../library/icon/icon';

function CheckoutMethodOption({
  isDisabled, id, value, icon, subTitle, subTitleRight, title, selectedMethod, handleDeliveryMethodChange, name, className, info,
}) {
  return (
    <div key={id} className={`checkout__methods-option ${className ?? ''} ${isDisabled ? 'disabled' : ''}`}>
      <input
        id={`delivery-method-${value}`}
        name={name}
        type="radio"
        value={value}
        className="radio-checked"
        disabled={isDisabled}
        checked={selectedMethod === value}
        onChange={handleDeliveryMethodChange}
      />
      <div className="checkout__methods-label">
        {icon && <Icon name={icon} className="icon-wrapper" />}
        <div className="checkout__methods-description">
          <div className="checkout__methods-type">
            <span>{subTitle}</span>
            {subTitleRight && <span>{subTitleRight}</span>}
          </div>
          <span className="checkout__methods-title">{title}</span>
          {info && <span className="checkout__methods-info">{info}</span>}
        </div>
      </div>
    </div>
  );
}

export default CheckoutMethodOption;
