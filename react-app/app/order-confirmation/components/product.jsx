import React, { useContext } from 'react';
import CartContext from '../../../context/cart-context.jsx';
import useCurrencyFormatter from '../../../utils/hooks/useCurrencyFormatter.jsx';
import { getLanguageAttr } from '../../../../scripts/configs.js';
import AppConstants from '../../../utils/app.constants.js';

function PurchasedProduct({ product, index, uniqueProducts, completeOrderData }) {
  const { placeholders } = useContext(CartContext);
  const price = uniqueProducts?.[index]?.price_incl_tax;
  const decimalPrice = useCurrencyFormatter({ price });
  const isGiftCardTopup = product?.sku === AppConstants.GIFT_CARD_TOPUP;
  const isEgift = uniqueProducts?.[index]?.extension_attributes?.product_options?.[0]?.indexOf('hps_giftcard_recipient_email') != -1;

  return (
    <div
      key={`item-${index}`}
      id={`item-${index}`}
      className={`ordered-product ${price === 0 || price === 0.01 ? 'freegiftwithpurchase' : ''}`}
    >
      {
        isGiftCardTopup || isEgift
          ? <div className="product-image-topup">
            <img
              src={uniqueProducts?.[index]?.extension_attributes?.product_media?.[0]?.file}
              alt={product?.name}
            />
          </div>
          : <div className="product-image">
            <img
              src={product?.assets_cart?.[0]?.styles?.cart_thumbnail}
              alt={product?.name}
            />
          </div>
      }

      <div className="product-information">
        <div>
          <span>
            {
              isGiftCardTopup
                ? <span id="product-title">{placeholders?.egiftCardTopupLabel}</span>
                : <a id="product-title" href={`/${getLanguageAttr()}/${product?.url_key ?? ''}`}>{product?.name}</a>
            }
          </span>
          <span>
            {price === 0 || price === 0.01
              ? placeholders.freeGiftPriceText
              : decimalPrice}
          </span>
        </div>
        {/* } */}
        <div>
          {product?.variants?.product?.dynamicAttributes?.color_label && <span>
            {placeholders.productColorLabel}
            :
            {' '}
            {product?.variants?.product?.dynamicAttributes?.color_label}
          </span>}
          {product?.variants?.product?.dynamicAttributes?.size_label && <span>
            {placeholders.productSize}
            :
            {' '}
            {product?.variants?.product?.dynamicAttributes?.size_label}
          </span>}
        </div>
        {completeOrderData?.extension_attributes?.topup_card_number && <span className='cardNumber'>
          {placeholders?.cardNumber} :  {completeOrderData?.extension_attributes?.topup_card_number}
        </span>}
      </div>
      {(price === 0 || price === 0.01) && (
        <span className="freegiftwithpurchasetext">
          {placeholders.freeGiftLabel}
        </span>
      )}
    </div>
  );
}

export default PurchasedProduct;
