import React, {
  useContext, useEffect, useState, useCallback,
} from 'react';
import CartContext from '../../../context/cart-context.jsx';
import Loader from '../../../shared/loader/loader.jsx';
import AppConstants from '../../../utils/app.constants.js';
import OrderConfirmation from './order-confirmation.jsx';
import getCustomerOrders from '../../../api/getCustomerOrders.js';
import Feedbackform from './feedbackform.jsx';
import { getConfigValue } from '../../../../scripts/configs.js';
import CartAndCheckoutLayout from '../../../shared/cart-and-checkout-layout/cart-and-checkout-layout.jsx';

/**
 * App Component.
 * @param {string} [content] block content from sharepoint docx
 * @param {string} [placeholders] locale based placeholders coming from placeholders.xlsx
 */

function App({ content }) {
  const { activeProgressStep } = useContext(CartContext);
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOrderId, setcurrentOrderId] = useState();
  const [showModal, setShowModal] = useState(false);
  const [formUrl, setFormUrl] = useState(null);
  const [showProgressBar, setShowProgressBar] = useState(true);

  useEffect(() => {
    const fetchOrderData = async () => {
      setIsLoading(true);
      try {
        const currentUrl = new URL(window.location.href);
        let encodedStringParam = currentUrl.searchParams.get('oid');
        if (encodedStringParam) {
          encodedStringParam = encodedStringParam.replace(/}$/, '');
          const decodedString = atob(encodedStringParam);
          const jsonObject = JSON.parse(decodedString);
          const orderId = String(jsonObject.order_id);
          setcurrentOrderId(orderId);
          const orderResponse = await getCustomerOrders(orderId);
          setOrderData(orderResponse?.response?.data?.Commerce_GetOrder);
          const { increment_id, grand_total, items } =
            orderResponse?.response?.data?.Commerce_GetOrder?.items?.[0] || {};
          window.dispatchEvent(
            new CustomEvent('react:fireTargetCall', {
              detail: {
                purchaseId: increment_id,
                totalPrice: grand_total,
                products: items
              },
            })
          );
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!currentOrderId) {
      fetchOrderData();
    }
  }, [currentOrderId]);

  useEffect(() => {
    let timer;

    if (!isLoading) {
      timer = setTimeout(() => {
        setShowModal(true);
      }, 5000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  useEffect(() => {
    async function fetchfeedbackform() {
      try {
        const url = await getConfigValue('cart-feedback-form-url');
        setFormUrl(url);
      } catch (error) {
        console.error('Error:', error);
      }
    }
    fetchfeedbackform();
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  useEffect(() => {
    setShowProgressBar(!!currentOrderId);
  }, [currentOrderId])

  const render = () => {
    if (isLoading) return <Loader />;

    if (!currentOrderId) {
      return (
        <div className="pagenotrequested">
          <h1>OOPS</h1>
          <p>The page you requested could not be found</p>
          <p>We have recently made some changes to the website and apologise if this is not the page you expected.</p>
          <p>To continue shopping visit our homepage</p>
        </div>
      );
    }

    return (
      <>
        <div className="cart__checkout__blocks">
          {activeProgressStep === AppConstants.PROGRESS_BAR_STEP_CONFIRMATION && <OrderConfirmation content={content} completeOrderData={orderData} />}
        </div>
        {
          formUrl && showModal && (
            <Feedbackform closeModal={closeModal} formUrl={formUrl} />
          )
        }
      </>
    )
  }

  return (
    <CartAndCheckoutLayout showProgressBar={showProgressBar}>
      {render()}
    </CartAndCheckoutLayout>
  );
}

export default App;
