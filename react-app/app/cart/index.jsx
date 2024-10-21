import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/app.jsx';
import './index.css';
import fetchPlaceholdersForLocale from '../../utils/placeholders.js';
import { CartContextProvider, INIT_PLACEHOLDERS } from '../../context/cart-context.jsx';

export default async function decorate(block) {
  // render React components
  const langCode = document.documentElement.lang;
  const placeholders = await fetchPlaceholdersForLocale(
    langCode ? `/${langCode}` : '',
    'sheet=cart',
  );
  const root = createRoot(block);
  const [titleConentContainer, deliveryMethodsContainer, paymentLogosContainer, , checkoutOrderSummaryContainer, paymentMethods] = block.querySelectorAll('.cart > div');
  const shoppingbagtitle = titleConentContainer?.querySelectorAll('p');
  const deliverymethods = deliveryMethodsContainer?.querySelectorAll('li');
  const paymentlogotitle = paymentLogosContainer?.querySelector('p');
  const paymentlogolist = paymentLogosContainer?.querySelectorAll('li');
  const [, ...paymentMethodsContent] = paymentMethods?.querySelectorAll('div > table > tbody > tr') || [];

  const checkoutSummaryContainer = checkoutOrderSummaryContainer?.querySelectorAll('div')[0];
  const checkoutOrderSummaryTitle = checkoutSummaryContainer?.querySelector('strong');
  let content = {
    mobilecarttitle: '',
    carttitle: '',
    freereturnlable: '',
    standard_delivery: '',
    sameday_delivery: '',
    click_collect: '',
    cardmethodtitle: '',
    paymentlogolist: null,
    paymentMethods: '',
    checkoutOrderSummaryTitle: '',
  };
  const [mobilecarttitle, carttitle, freereturnlable] = shoppingbagtitle;
  content = {
    mobilecarttitle: mobilecarttitle ? mobilecarttitle.innerHTML : '',
    carttitle: carttitle ? carttitle.innerText : '',
    freereturnlable: freereturnlable ? freereturnlable.innerHTML : '',
    cardmethodtitle: paymentlogotitle ? paymentlogotitle.innerHTML : '',
    paymentlogolist,
    deliverymethods,
    paymentMethods: paymentMethodsContent,
    checkoutOrderSummaryTitle: checkoutOrderSummaryTitle ? checkoutOrderSummaryTitle?.innerHTML : '',
  };

  root.render(
    <CartContextProvider placeholders={{ ...INIT_PLACEHOLDERS, ...placeholders }}>
      <App content={content} />
    </CartContextProvider>,
  );
}
