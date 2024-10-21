import React, { useContext, useEffect, useState } from 'react';
import './promotion.css';
import DiscountAndVouchers from '../discount-and-vouchers/discount-and-vouchers';
import CartContext from '../../../../context/cart-context';
import Loader from '../../../../shared/loader/loader.jsx';
import { getLanguageAttr } from '../../../../../scripts/configs.js';
import Icon from '../../../../library/icon/icon.jsx';
import updateCart from '../../../../api/updateCart.js';
import getSubCartGraphql from '../../../../api/getSubCartGraphql.js';
import ApiConstants from '../../../../api/api.constants.js';

function Promotion() {
  const lang = getLanguageAttr();
  const {
    cartId, isLoggedIn, cart, setCart, promotion, setPromotion, placeholders, oosDisableButton,
  } = useContext(CartContext);
  const appliedCoupon = cart?.data?.extension_attributes?.totals?.coupon_code ?? '';
  const [promoCode, setPromoCode] = useState(appliedCoupon);

  useEffect(() => {
    setPromoCode(appliedCoupon);
  }, [appliedCoupon]);

  const promoCodeChangeHandler = (promoCodeValue) => {
    setPromoCode(promoCodeValue);
    setPromotion({ ...promotion, errorMessage: '' });
  };

  const getErrorMessage = (message) => (message?.toLowerCase() === 'internal server error' ? placeholders.promotionInvalidCodeMessage : (message ?? ''));

  const getUpdatedCart = async () => {
    const result = await getSubCartGraphql(isLoggedIn, cartId, [ApiConstants.CART_QUERY__PRICES, ApiConstants.CART_QUERY__EXTENSION_ATTRIBUTE]);
    if (result) setCart({ ...cart, data: { ...cart?.data, ...result } });
  };

  const handleApplyClick = async () => {
    if (promoCode) {
      setPromotion({ ...promotion, isApplyingPromoCode: true, errorMessage: '' });
      const request = {
        extension: {
          action: 'apply coupon',
        },
        coupon: promoCode,
      };
      const result = await updateCart(request, cartId, isLoggedIn);
      if (result.response_message?.[1] === 'success') {
        window.dispatchEvent(
          new CustomEvent('react:dataLayerPromoCodeEvent', {
            detail: {
              couponCode: promoCode,
              couponStatus: 'pass',
            },
          }),
        );
        await getUpdatedCart();
      }
      if (result.response_message?.[1] === 'error_coupon') {
        window.dispatchEvent(
          new CustomEvent('react:dataLayerPromoCodeEvent', {
            detail: {
              couponCode: promoCode,
              couponStatus: 'fail',
            },
          }),
        );

        window.dispatchEvent(
          new CustomEvent('react:dataLayerCartErrorsEvent', {
            detail: {
              eventLabel: promoCode,
              eventAction: result.response_message?.[0],
              eventPlace: `Error occured on ${window.location.href}`,
              couponCode: promoCode,
            },
          }),
        );
      }
      setPromotion({
        ...promotion,
        isApplyingPromoCode: false,
        errorMessage: result.response_message?.[1] === 'error_coupon' ? getErrorMessage(result.response_message?.[0]) : '',
      });
    } else {
      window.dispatchEvent(
        new CustomEvent('react:dataLayerPromoCodeEvent', {
          detail: {
            couponCode: promoCode,
            couponStatus: 'fail',
          },
        }),
      );
      setPromotion({ ...promotion, errorMessage: placeholders.promotionRequiredValidationErrorMessage });
    }
  };

  const handleRemovePromoClick = async () => {
    setPromotion({ ...promotion, isRemovingPromoCode: true, errorMessage: '' });
    const request = {
      extension: {
        action: 'remove coupon',
      },
      coupon: promoCode,
    };
    const result = await updateCart(request, cartId, isLoggedIn);
    if (result.response_message?.[1] === 'success') await getUpdatedCart();
    setPromotion({
      ...promotion,
      isRemovingPromoCode: false,
      errorMessage: result.response_message?.[1] === 'error_coupon' ? getErrorMessage(result.response_message?.[0]) : '',
    });
  };

  const renderPromoButton = () => {
    if (oosDisableButton) return <button type="button" id="promotion-btn" className="promotion__btn-disabled">{placeholders?.promoBtn}</button>;
    if (appliedCoupon) return <button type="button" id="promotion-btn" className="promotion__btn-disabled">{placeholders.promotionAppliedButtonLabel}</button>;
    return <button type="button" id="promotion-btn" className={promotion.isApplyingPromoCode ? 'loader' : ''} onClick={handleApplyClick}>{!promotion.isApplyingPromoCode ? `${placeholders.promotionApplyButtonLabel}` : ''}</button>;
  };

  return (
    <div className="cart__promotion slide-up-animation">
      <div className="promotion__header">
        <span id="promotion__label">{placeholders.promotionLabel}</span>
        <DiscountAndVouchers className={`${lang === 'ar' ? 'promotion__discount-mg-rt-auto' : 'promotion__discount-mg-lt-auto'} promotion__discount--desktop`} />
      </div>
      <div className="promotion__form">
        <div className="promotion__input-error-container">
          <div className="promotion__input-container">
            <div className={`promotion__input ${promotion.errorMessage ? 'promotion__input-error' : ''}`}>
              <input className={(appliedCoupon || oosDisableButton) ? 'promotion__input-disabled' : ''} type="text" id="promotion-input" placeholder={placeholders.promotionInputPlaceholder} value={promoCode} onChange={(e) => promoCodeChangeHandler(e.target.value)} disabled={promotion.isApplyingPromoCode} />
            </div>
            {appliedCoupon && (promotion.isRemovingPromoCode
              ? <div className="promotion__remove-icon"><Loader /></div>
              : <Icon className="promotion__remove-icon" id="remove-promo" name="close-round-black" onIconClick={handleRemovePromoClick} />
            )}
            {renderPromoButton()}
          </div>
          {promotion.errorMessage && (
            <div className="promotion_error">
              <Icon name="info-circle" className="promotion_error-icon" />
              <span className="error">{promotion.errorMessage}</span>
            </div>
          )}
        </div>
        <DiscountAndVouchers className="promotion__discount--mobile" />
      </div>
    </div>
  );
}

export default Promotion;
