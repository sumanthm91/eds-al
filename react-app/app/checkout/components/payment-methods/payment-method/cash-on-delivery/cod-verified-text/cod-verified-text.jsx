import React, { useContext } from 'react';
import './cod-verified-text.css';
import Icon from '../../../../../../../library/icon/icon';
import CartContext from '../../../../../../../context/cart-context';

function CodVerifiedText({ mobileNumber, onEdit, surchargeText }) {
  const { placeholders, cart } = useContext(CartContext);

  return (
    <div className="cod-mobile-otp__verified">
      <span className="cod-mobile-otp__verified_surcharge">
        {surchargeText}
      </span>
      <div className="cod-mobile-otp__verified_info">
        <span className="cod-mobile-otp__verified_mobile">
          {mobileNumber}
        </span>
        <span className="cod-mobile-otp__verified_message">
          {placeholders.codVerifiedText}
        </span>
        <span
          className="cod-mobile-otp__verified_edit"
          onClick={onEdit}
        >
          <Icon name="edit-black-bottom-border" />
          {placeholders.codEditTelephoneCta}
        </span>
      </div>
    </div>
  );
}

export default CodVerifiedText;