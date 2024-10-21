import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/app.jsx';
import '../cart/index.css';
import './index.css';
import fetchPlaceholdersForLocale from '../../utils/placeholders.js';
import {
  CartContextProvider,
  INIT_PLACEHOLDERS,
} from '../../context/cart-context.jsx';

export default async function decorate(block) {
  // render React components
  const langCode = document.documentElement.lang;
  const placeholders = await fetchPlaceholdersForLocale(
    langCode ? `/${langCode}` : '',
    'sheet=cart',
  );
  const root = createRoot(block);
  const [messageContentConatiner, storeTextContainer, iconContainer, paymentMethods] = block.querySelectorAll(
    '.order-confirmation > div',
  );

  const thanksConfirmationMessage = messageContentConatiner.querySelectorAll('p');
  const storeConatiner = storeTextContainer.querySelectorAll('p');
  const emojiConatiner = iconContainer.querySelectorAll('p');
  const [, ...paymentMethodsContent] = paymentMethods?.querySelectorAll('div > table > tbody > tr') || [];

  let content = {
    thanksMessageText: '',
    confirmationText: '',
    printConfirmation: '',
    checkoutOrderSummaryTitle: '',
    downloadText: '',
    continueShopping: '',
    scaleSadIcon: '',
    scaleMehIcon: '',
    scaleSmileIcon: '',
    paymentMethods: '',
  };

  const [
    thanksMessageText,
    confirmationText,
    printConfirmation,
    checkoutOrderSummaryTitle,
  ] = thanksConfirmationMessage;
  const [downloadTitle, continueShoppingText] = storeConatiner;
  const [sadIcon, MehIcon, SmileIcon] = emojiConatiner;

  content = {
    thanksMessageText: thanksMessageText ? thanksMessageText.innerText : '',
    confirmationText: confirmationText ? confirmationText.innerText : '',
    printConfirmation: printConfirmation ? printConfirmation.innerText : '',
    checkoutOrderSummaryTitle: checkoutOrderSummaryTitle
      ? checkoutOrderSummaryTitle.innerText
      : '',
    downloadText: downloadTitle ? downloadTitle.innerHTML : '',
    continueShopping: continueShoppingText
      ? continueShoppingText.innerText
      : '',
    scaleSadIcon: sadIcon ? sadIcon.innerHTML : '',
    scaleMehIcon: MehIcon ? MehIcon.innerHTML : '',
    scaleSmileIcon: SmileIcon ? SmileIcon.innerHTML : '',
    paymentMethods: paymentMethodsContent,
  };

  root.render(
    <CartContextProvider
      placeholders={{ ...INIT_PLACEHOLDERS, ...placeholders }}
    >
      <App content={content} />
    </CartContextProvider>,
  );
}
