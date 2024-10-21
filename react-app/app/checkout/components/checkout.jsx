import React, {
  useRef, useEffect, useContext,
} from 'react';
import CheckoutDeliveryMethod from './checkout-delivery-method.jsx';
import './checkout.css';
import DeliveryInformation from './delivery-information/delivery-information.jsx';
import OrderSummary from './order-summary/order-summary.jsx';
import PaymentMethods from './payment-methods/payment-methods.jsx';
import BillingInformation from './billing-information/billing-information.jsx';
import CompletePurchase from './complete-purchase/complete-purchase-btn.jsx';
import CollectionSection from './collection-store/components/collection-section.jsx';
import CartContext from '../../../context/cart-context.jsx';
import CheckoutModal from './checkout-modal/index.jsx';
import { CheckoutComUpiContextProvider } from '../../../context/checkoutcomupi-context.jsx';

function Checkout({ content }) {
  const {
    cart, setIsCollectionDetails, isCollectionDetails, isHideSectionInCheckout, selectedMethod, setSelectedMethod, isLoggedIn, isTopupFlag
  } = useContext(CartContext);
  const { redeemegifthead, redeemegifttitle, redeemegiftsubtitle } = content;
  const paymentRef = useRef();

  useEffect(() => {
    if (cart?.data) {
      const shippingAssign = cart.data.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.find((assign) => assign.shipping.method === 'click_and_collect_click_and_collect');
      if (shippingAssign) {
        setIsCollectionDetails(true);
        setSelectedMethod('click_and_collect');
      } else {
        setIsCollectionDetails(false);
        setSelectedMethod('home_delivery');
      }
    }
  }, [cart]);

  useEffect(() => {
    let paymentErrorMessage = sessionStorage.getItem('payment-error');
    if (paymentErrorMessage) {
      paymentErrorMessage = paymentErrorMessage.split('+').join(' ');
      window.dispatchEvent(
        new CustomEvent('react:showPageErrorMessage', {
          detail: { message: paymentErrorMessage },
        }),
      );
      sessionStorage.removeItem('payment-error');
    }
  }, []);

  return (
    <div>
      <div className="checkout__shopping-block">
        <div className="checkout__container">
          {!isHideSectionInCheckout && !isTopupFlag && <CheckoutDeliveryMethod onSelectedMethodChange={setSelectedMethod} />}
          {!isHideSectionInCheckout && !isTopupFlag && (selectedMethod === 'home_delivery' ? <DeliveryInformation /> : null)}
          {!isHideSectionInCheckout && !isTopupFlag && (selectedMethod === 'click_and_collect' && isCollectionDetails ? <CollectionSection /> : null)}
          <CheckoutComUpiContextProvider><PaymentMethods paymentMethods={content.paymentMethods} paymentRef={paymentRef} paymentLogoList={content.paymentlogolist} blockContent={content}/></CheckoutComUpiContextProvider>
          <BillingInformation selectedMethod={selectedMethod} />
        </div>
        <div className="order-summary-container slide-up-animation">
          <OrderSummary isAddress isCOD={selectedMethod === 'home_delivery'} content={content} />
        </div>
        <CheckoutModal selectedMethod={selectedMethod} />
      </div>
      <CompletePurchase purchasePolicyText={content.purchasePolicyText} paymentRef={paymentRef} />
    </div>
  );
}

export default Checkout;
