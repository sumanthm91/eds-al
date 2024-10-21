import React, { useContext, useState } from 'react';
import './complete-purchase-btn.css';
import CartContext from '../../../../context/cart-context';
import Loader from '../../../../shared/loader/loader.jsx';
import AppConstants from '../../../../utils/app.constants.js';

function CompletePurchase({ purchasePolicyText, paymentRef }) {
  const { placeholders, checkoutOOSDisable, isDisablePurchaseBtn, methods, cart, paymentMethodsContinuePurchaseLabels } = useContext(CartContext);
  const [isComplePurchaseLoading, setCompletePurchaseLoading] = useState(false);
  const selectedPaymentMethod = methods?.find((method) => method.isSelected);
  const isCashOnDeliverySelected = selectedPaymentMethod?.code === AppConstants.PAYMENT_METHOD_CODE_COD || false;
  const mobileNumberVerified = cart?.data?.extension_attributes?.cart?.extension_attributes?.mobile_number_verified;
  const isMobileNumberVerified = mobileNumberVerified === 1 || mobileNumberVerified === 2;
  const isCODSelectedAndNotVerified = isCashOnDeliverySelected && !isMobileNumberVerified;

  const handlePurchase = async () => {
    setCompletePurchaseLoading(true);
    try {
      await paymentRef.current.completePurchase();
    } catch (error) {
      console.error('action failed', error);
    } finally {
      setCompletePurchaseLoading(false);
    }
  };

  const renderCompletePurchaseButton = () => {
    const labelHTML = paymentMethodsContinuePurchaseLabels?.find(purchaseLabel => purchaseLabel.code === selectedPaymentMethod?.code)?.label ?? null;

    return (
      <button
        id="cardPayButton"
        type="button"
        onClick={handlePurchase}
        className="complete_purchase_click"
        disabled={checkoutOOSDisable || isComplePurchaseLoading || isDisablePurchaseBtn || isCODSelectedAndNotVerified}
      >
        {
          labelHTML
            ? <span className="complete_purchase--text" dangerouslySetInnerHTML={{ __html: labelHTML }} />
            : <span className="complete_purchase--text">{placeholders.completePurchaseButton}</span>
        }

      </button>
    )
  };

  return (
    <div className="complete_purchase_container">
      {isComplePurchaseLoading && (
        <div className="loader_overlay">
          <Loader />
        </div>
      )}

      <div className="checkbox_confirm_text">
        <label className="checkbox_container" htmlFor="checkbox_purchase">
          <input id="checkbox_purchase" className="checkbox_purchase" type="checkbox" />
          <span className="custom_checkbox" />
          <span className="checkbox_text">{placeholders.completePurchaseCheckbox}</span>
        </label>
      </div>

      <div>
        <p className="purchase_policy_text">
          <span dangerouslySetInnerHTML={{ __html: purchasePolicyText }} />
        </p>
      </div>
      <div className="purchase_button_wrapper">
        {renderCompletePurchaseButton()}
      </div>
    </div>
  );
}

export default CompletePurchase;
