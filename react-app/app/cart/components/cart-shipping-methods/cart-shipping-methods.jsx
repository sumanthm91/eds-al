import React, { useEffect, useRef } from 'react';
import { decorateIcons } from '../../../../../scripts/aem';
import DeliveryMethodInfo from '../delivery-method-info/delivery-method-info';
import './cart-shipping-method.css';

function CartShippingMethods({ product, cart }) {
  const deliveryRef = useRef(null);
  useEffect(() => {
    if (deliveryRef.current) {
      decorateIcons(deliveryRef.current);
    }
  }, []);

  const sku = product?.product?.sku;
  const matchAndRenderDeliveryMethods = (productSku, deliveryMatrix) => {
    const matchedDelivery = deliveryMatrix?.find((item) => item?.product_sku === productSku);
    if (!matchedDelivery || !matchedDelivery.applicable_shipping_methods) {
      return null;
    }

    return matchedDelivery.applicable_shipping_methods.map((method) => (
      <div className={`delivery-method delivery-method--${method.cart_page_title.toLowerCase()} ${method?.available ? 'delivery-method--active' : 'delivery-method--inactive'}`} key={method.method_code}>
        <DeliveryMethodInfo data={method.cart_page_title} icon={`${method?.available ? 'icon icon-info' : 'icon icon-info-disabled'}`} content={method.method_title} isdisabled={method?.available} />
      </div>
    ));
  };

  return (
    <div className="product-delivery-methods" ref={deliveryRef}>
      {matchAndRenderDeliveryMethods(sku, cart?.data?.extension_attributes?.delivery_matrix)}
    </div>
  );
}

export default CartShippingMethods;
