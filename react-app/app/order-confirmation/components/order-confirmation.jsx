import React, { useEffect, useState, useContext } from 'react';
import OrderConfirmationSummary from './order-confirmation-summary';
import OrderConfirmationItemBillSummary from './order-confirmation-item-bill-summary';
import CartContext from '../../../context/cart-context.jsx';
import getLoggedinUser from '../../../api/getLoggedinUser.js';

function OrderConfirmation({ content, completeOrderData }) {
  const { isLoggedIn, placeholders } = useContext(CartContext);
  const orderData = completeOrderData;
  const [isOrderDetailExpanded, setIsOrderDetailExpanded] = useState(false);
  const [loggedInUserData, setLoggedInUserData] = useState(null);
  const customerisGuest = orderData?.items?.[0]?.customer_is_guest;
  const orderCustomerEmail = orderData?.items?.[0]?.customer_email ?? null;
  const loggedinUserEmail = loggedInUserData?.response?.email ?? null;
  const compareEmail = orderCustomerEmail === loggedinUserEmail;

  const isTopup = !!orderData?.items?.[0]?.extension_attributes?.topup_recipientemail;

  useEffect(() => {
    if (isLoggedIn) {
      async function fetchLoggedInUser() {
        const data = await getLoggedinUser();
        setLoggedInUserData(data);
      }

      fetchLoggedInUser();
    }
  }, []);

  useEffect(() => {
      if (isLoggedIn && customerisGuest) {
        window.location.href = `/${document.documentElement.lang}/user/account`;
      }
      if(!isTopup){
        if (orderCustomerEmail !== null && loggedinUserEmail !== null) {
          if (isLoggedIn && !compareEmail) {
            window.location.href = `/${document.documentElement.lang}/user/account`;
          }
        }
      }
  }, [isLoggedIn, customerisGuest, orderCustomerEmail, loggedinUserEmail, compareEmail, isTopup]);

  const handlePrintconfitmation = () => {
    setIsOrderDetailExpanded(true);
    setTimeout(() => {
      window.print();
    }, 0);
  };

  return (
    <div className="order__confirmation-block">

      <div className="oredr__confirmation-header">
        <span className="thanks-message">
          {content.thanksMessageText}
        </span>
        <span className="confirmation-message">
          {content.confirmationText}
        </span>
        <div
          className="order-print-confirmation"
          onClick={handlePrintconfitmation}
          onKeyUp={(e) => e.key === 'Enter' && handlePrintconfitmation()}
          role="button"
          tabIndex={0}
        >
          {placeholders.printConfirmationText}
        </div>
      </div>
      <div className="order__confirmation-summary">
        <div className="order__confirmation-details-info">
          <OrderConfirmationSummary
            content={content}
            orderInfo={orderData}
            isOrderDetailExpanded={isOrderDetailExpanded}
            setIsOrderDetailExpanded={setIsOrderDetailExpanded}
          />
        </div>
        <div className="order-summary-container">
          <OrderConfirmationItemBillSummary content={content} orderInfo={orderData} />
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmation;
