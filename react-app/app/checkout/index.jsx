import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/app.jsx';
import '../cart/index.css';
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
  const [titleConentContainer, deliveryMethodsContainer, paymentLogosContainer, reedemEgiftContainer, checkoutOrderSummaryContainer, paymentMethods, purchasePrivacyPolicy, loyalty] = block.querySelectorAll('.checkout > div');
  const shoppingbagtitle = titleConentContainer?.querySelectorAll('p');
  const deliverymethods = deliveryMethodsContainer?.querySelectorAll('li');
  const paymentlogotitle = paymentLogosContainer?.querySelector('p');
  const paymentlogolist = paymentLogosContainer?.querySelectorAll('li');
  const reedemEgiftText = reedemEgiftContainer?.querySelectorAll('p');
  const [, ...paymentMethodsContent] = paymentMethods?.querySelectorAll('div > table > tbody > tr') || [];
  const purchasePolicyText = purchasePrivacyPolicy?.querySelector('div');
  const checkoutSummaryContainer = checkoutOrderSummaryContainer?.querySelectorAll('div')[0];
  const checkoutOrderSummaryTitle = checkoutSummaryContainer?.querySelector('strong');

  const loyaltyContent = loyalty.querySelectorAll('div')[0];
  const loyaltyTitle = loyaltyContent.querySelector('p');
  const loyaltyOptions = loyaltyContent.querySelectorAll('ul li');

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
    redeemegifthead: '',
    redeemegifttitle: '',
    redeemegiftsubtitle: '',
    purchasePolicyText: '',
    loyalty: {},
  };
  const [mobilecarttitle, carttitle, freereturnlable] = shoppingbagtitle ?? [];
  const [redeemegifthead, redeemegifttitle, redeemegiftsubtitle] = reedemEgiftText ?? [];
  content = {
    mobilecarttitle: mobilecarttitle ? mobilecarttitle.innerHTML : '',
    carttitle: carttitle ? carttitle.innerText : '',
    freereturnlable: freereturnlable ? freereturnlable.innerHTML : '',
    cardmethodtitle: paymentlogotitle ? paymentlogotitle.innerHTML : '',
    paymentlogolist,
    deliverymethods,
    paymentMethods: paymentMethodsContent,
    redeemegifthead: redeemegifthead ? redeemegifthead.innerHTML : '',
    redeemegifttitle: redeemegifttitle ? redeemegifttitle.innerHTML : '',
    redeemegiftsubtitle: redeemegiftsubtitle ? redeemegiftsubtitle.innerHTML : '',
    checkoutOrderSummaryTitle: checkoutOrderSummaryTitle ? checkoutOrderSummaryTitle?.innerHTML : '',
    purchasePolicyText: purchasePolicyText ? purchasePolicyText.innerHTML : '',
    loyalty: {
      title: loyaltyTitle ? loyaltyTitle.innerText : '',
      options: loyaltyOptions || '',
    },
  };

  root.render(
    <CartContextProvider placeholders={{ ...INIT_PLACEHOLDERS, ...placeholders }}>
      <App content={content} />
    </CartContextProvider>,
  );
}
