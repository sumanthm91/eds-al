// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState } from 'react';
import { getConfigValue, getLanguageAttr } from '../../../../scripts/configs';
import AppConstants from '../../../utils/app.constants.js';

function App() {
  const [confirmationURI, setConfirmationURI] = useState();

  useEffect(() => {
    (async () => {
      const confirmation = await getConfigValue('cart-confirmation-uri');
      setConfirmationURI(confirmation);
    })();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (orderId && confirmationURI) {
      const secureOrderId = btoa(JSON.stringify({ order_id: parseInt(orderId, 10) }));
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(AppConstants?.CHECKOUT_COMMERCE_CART_CACHE)) {
          localStorage.removeItem(key);
        }
      }
      localStorage.removeItem(AppConstants?.PAYMENT_METHOD_M2_VENIA_BROWSER_PERSISTENCE__CARTID);
      window.location.href = `/${getLanguageAttr()}${confirmationURI}?oid=${secureOrderId}`;
    }
  }, [confirmationURI]);

  return null;
}

export default App;
