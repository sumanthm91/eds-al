import React, { useContext } from 'react';
import './payment-method.css';
import CartContext from '../../../../../context/cart-context';
import AppConstants from '../../../../../utils/app.constants';

function PaymentMethod(props) {
  const {
    children,
    methodCode,
    method,
    onChangePaymentMethod,
    isDisabled,
    isDisableSection
  } = props;

  const {
    cart
  } = useContext(CartContext);

  let disablePayment = isDisableSection;
  if (methodCode === AppConstants.PAYMENT_METHOD_CODE_COD) {
    const hpsType = cart?.data?.extension_attributes?.totals?.extension_attributes?.hps_redemption_type;
    disablePayment = (hpsType === AppConstants.PAYMENT_EGIFT_CARD_linked || hpsType === AppConstants.PAYMENT_EGIFT_CARD_GUEST) ? true : isDisableSection;
  }

  return (
    <div className={`payment-method fadeInUp payment-method-${method.code} ${disablePayment ? 'in-active' : ''}`} role="button" tabIndex="0" disabled={isDisabled}>
      <div className="payment-method-top-panel">
        <div className="payment-method-card">
          <input
            id={`payment-method-${methodCode}`}
            className="payment-method-radio"
            type="radio"
            checked={!isDisabled && method.isSelected}
            value={methodCode}
            name="payment-method"
            disabled={isDisabled}
            onChange={() => { if (!isDisabled) onChangePaymentMethod(method); }}
          />

          <label className="radio-sim radio-label" htmlFor={`payment-method-${methodCode}`}>
            {method.title}
          </label>
          <span className="payment-method-icon-container" dangerouslySetInnerHTML={{ __html: method.icon.innerHTML }} />
        </div>
      </div>
      {method.isSelected && !isDisabled && !disablePayment && children ? children : ''}
    </div>
  );
}

export default PaymentMethod;
