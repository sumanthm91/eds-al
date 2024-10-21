import React from 'react';
import Promotion from '../promotion/promotion.jsx';
import OrderSummary from './order-summary.jsx';
import DeliveryMethods from '../delivery-methods/delivery-methods.jsx';

function CartSummary({ deliveryMethods, cardMethodTitle, paymentLogoList }) {
  return (
    <div className="cart__summary-wrapper">
      <Promotion />
      <OrderSummary cardMethodTitle={cardMethodTitle} paymentLogoList={paymentLogoList} />
      <DeliveryMethods data={deliveryMethods} />
    </div>
  );
}

export default CartSummary;
