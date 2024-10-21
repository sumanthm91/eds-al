import React, { useContext, useMemo, useState } from 'react';
import CartContext from '../../../../context/cart-context.jsx';
import CardPaymentOptions from '../cart-payment-method/card-payment-options.jsx';
import updateCart from '../../../../api/updateCart.js';
import useCurrencyFormatter from '../../../../utils/hooks/useCurrencyFormatter.jsx';
import Tooltip from '../../../../library/tooltip/tooltip.jsx';
import Icon from '../../../../library/icon/icon.jsx';
import Loader from '../../../../shared/loader/loader.jsx';

function OrderSummary({ cardMethodTitle, paymentLogoList }) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    cart, placeholders, priceDecimals, isLoggedIn, oosDisableButton, cartId, setIsCheckoutFlag, setCart,
  } = useContext(CartContext);
  const grandTotal = cart?.data?.prices?.grand_total?.value ?? 0;
  const grandTotalCurrency = cart?.data?.prices?.grand_total?.currency ?? '';
  const subtotalIncludingTax = cart?.data?.prices?.subtotal_including_tax?.value ?? 0;
  const redirectUrlCheckout = `/${document.documentElement.lang}/checkout`;
  const redirectUrlLogin = `/${document.documentElement.lang}/cart/login`;
  const appliedTaxes = cart?.data?.prices?.applied_taxes ?? [];
  const taxesTotal = appliedTaxes.reduce((acc, tax) => acc + (tax.amount.value ?? 0), 0);

  const totalDiscountAmount = cart?.data?.prices?.discount?.amount?.value;
  const bonusVoucherDiscount = cart?.data?.extension_attributes?.cart?.extension_attributes?.hm_voucher_discount;
  const appliedVoucherCount = cart?.data?.extension_attributes?.cart?.extension_attributes?.applied_hm_voucher_codes?.split(',')?.length ?? 0;

  const showErrorMessage = (errorMessage) => {
    if (errorMessage) {
      window.dispatchEvent(new CustomEvent('react:showPageErrorMessage', {
        detail: {
          message: errorMessage,
        },
      }));
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const handleCheckoutPage = async () => {
    setIsLoading(true);
    const body = {
      extension: { action: 'refresh' },
    };

    const result = await updateCart(body, cartId, isLoggedIn, true);
    if (result?.status !== 200 && result?.message) { // response will have a error
      showErrorMessage(result.message);
      setIsLoading(false);
      return;
    }

    const response = result?.data;

    const responseCart = response?.cart?.items;
    const currentCartItems = cart?.data?.extension_attributes?.cart?.items;
    const updateCartItems = currentCartItems?.map((items) => {
      const findProduct = responseCart?.find((element) => items?.sku === element?.sku);
      if (findProduct && Object.keys(findProduct)?.length) {
        return {
          ...items,
          extension_attributes: findProduct?.extension_attributes,
        };
      }
      return items;
    });
    if (response?.response_message[1] === 'success') {
      setIsCheckoutFlag(true);
      if (isLoggedIn) {
        window.location.href = redirectUrlCheckout;
      } else {
        window.location.href = redirectUrlLogin;
      }
    } else {
      setIsCheckoutFlag(false);
      setCart({
        ...cart,
        data: {
          ...cart?.data,
          extension_attributes: {
            ...cart?.data?.extension_attributes,
            cart: {
              ...cart?.data?.extension_attributes?.cart,
              items: updateCartItems,
            },
          },
          items: cart?.data?.items?.map((item) => {
            const currentExtensionAttributes = updateCartItems?.find((element) => Number(item?.id) === Number(element?.item_id));
            if (Object?.keys(currentExtensionAttributes)?.length) {
              return {
                ...item,
                extensionAttributes: currentExtensionAttributes,
              };
            }
            return {
              ...item,
            };
          }),
        },
      });
    }
    setIsLoading(true);
  };
  const surCharge = cart?.data?.extension_attributes?.cart?.extension_attributes?.surcharge;
  const subtotalIncludingTaxFormatted = useCurrencyFormatter({ price: subtotalIncludingTax, priceDecimals, currency: grandTotalCurrency });
  const totalDiscountAmountFormatted = useCurrencyFormatter({ price: totalDiscountAmount, priceDecimals, currency: grandTotalCurrency });
  const grandTotalFormatted = useCurrencyFormatter({ price: surCharge?.is_applied && surCharge?.amount > 0 ? grandTotal - surCharge?.amount : grandTotal, priceDecimals, currency: grandTotalCurrency });
  const bonusVoucherDiscountFormatted = useCurrencyFormatter({ price: bonusVoucherDiscount, priceDecimals, currency: grandTotalCurrency });
  const deliveryAmountFee = cart?.data?.extension_attributes?.totals?.shipping_incl_tax;
  const deliveryFeeValue = useCurrencyFormatter({ price: deliveryAmountFee, priceDecimals, currency: grandTotalCurrency });
  const deliveryMethodSelected = cart?.data?.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping?.method
  const discountToolTipContent = useMemo(() => {
    const extensionAttributes = cart?.data?.extension_attributes?.cart?.extension_attributes;
    const hasExclusiveCoupon = !!extensionAttributes?.has_exclusive_coupon;
    const hasHMOfferCode = !!extensionAttributes?.applied_hm_offer_code;
    const couponCode = cart?.data?.extension_attributes?.totals?.coupon_code ?? '';
    const hasAdvantageCard = cart?.data?.extension_attributes?.totals?.items?.some((item) => !!item?.extension_attributes?.adv_card_applicable);

    let tooltipData = `<div className="applied-discounts-title">${placeholders.discountTooltipMessageApplied}</div>`;

    if (hasExclusiveCoupon) {
      tooltipData += `<div className="applied-exclusive-couponcode">${couponCode}</div>`;
      return tooltipData;
    }

    if (hasHMOfferCode) {
      tooltipData = `<div className="applied-hm-discounts-title">${placeholders.discountTooltipMessageMemberDiscount}</div>`;
    }

    if (hasAdvantageCard) {
      tooltipData += `<div class="promotion-label"><strong>${placeholders.discountTooltipMessageAdvantageCardDiscount}</strong></div>`;
    }

    return tooltipData;
  }, [cart]);

  return (
    <div className="slide-up-animation">
      {
        isLoading
          ? <div className="loader_overlay">
            <Loader />
          </div>
          : null
      }
      <div aria-label="order-summary" className="order-summary-label">
        {placeholders?.orderSummaryTitle}
      </div>
      <div className="order__summary">
        <div className="order__summary__secondaryCard">
          <div className="common_container">
            <span aria-label="sub-total" className="sub-total-label">{placeholders?.subTotalLabel}</span>
            <span aria-label="value">
              {' '}
              {subtotalIncludingTaxFormatted}
            </span>
          </div>
          {totalDiscountAmount < 0 && (
            <div className="common_container">
              <span aria-label="discount" className="discount-label">
                {placeholders?.discountsLabel}
                <Tooltip content={discountToolTipContent}>
                  <Icon name="info-blue" className="discount-icon" />
                </Tooltip>
              </span>
              <span aria-label="value" className="discount-label">{totalDiscountAmountFormatted}</span>
            </div>
          )}
          {deliveryMethodSelected && <div className="common_container">
            <span className="sub-total-label">{placeholders?.deliveryLabel}</span>
            <div className="checkout-subtotal-price">
              <span className="checkout-subtotal-amount">{deliveryFeeValue}</span>
            </div>
          </div>}
          {appliedVoucherCount ? (
            <div className="common_container">
              <span aria-label="bonus-voucher-discount" className="bonus-voucher-discount-label">{`${appliedVoucherCount} ${placeholders?.bonusVoucherAppliedLabel}`}</span>
              <span aria-label="value" className="bonus-voucher-discount-label">{bonusVoucherDiscountFormatted}</span>
            </div>
          ) : null}
          <hr className="order_summary_border_bottom" />
          <div className="common_container">
            <span className="order_total_label" aria-label="order-total">{placeholders?.orderTotalLabel}</span>
            <span className="order_total_label" aria-label="value">{grandTotalFormatted}</span>
          </div>
          <div className="common_container">
            {!deliveryMethodSelected && <span className="excluding_label" aria-label="excluding">{placeholders.excludingDelivery}</span>}
            {taxesTotal > 0 && <span className="excluding_label">{placeholders.inclusiveVat}</span>}
          </div>
        </div>
        <div className="checkout__action_container">
          <button className={oosDisableButton ? 'checkout_disable' : 'checkout_action'} onClick={handleCheckoutPage} onKeyUp={(e) => e.key === 'Enter' && handleCheckoutPage()} role="button" tabIndex={oosDisableButton ? -1 : 0}>
            <span className="checkout">
              {placeholders.checkoutBtn}
            </span>
          </button>
        </div>
        <CardPaymentOptions cardMethodTitle={cardMethodTitle} paymentLogoList={paymentLogoList} />
      </div>
    </div>
  );
}

export default OrderSummary;
