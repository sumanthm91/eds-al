import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/app.jsx';
import '../cart/index.css';
import './index.css';
import fetchPlaceholdersForLocale from '../../utils/placeholders.js';
import { CartContextProvider, INIT_PLACEHOLDERS } from '../../context/cart-context.jsx';
import associateCarts from '../../api/associateCarts.js';

export default async function decorate(block) {
  // render React components
  const langCode = document.documentElement.lang;
  const placeholders = await fetchPlaceholdersForLocale(
    langCode ? `/${langCode}` : '',
    'sheet=cart',
  );
  const root = createRoot(block);

  window.addEventListener('react:associateCart', async(event) => {
    await associateCarts({cartId: event?.detail?.cartId});
    window.location.href = event?.detail?.redirectUrl ?? `/${document.documentElement.lang}/checkout`;
    console.info('Cart associated with the user');
  });

  root.render(
    <CartContextProvider placeholders={{ ...INIT_PLACEHOLDERS, ...placeholders }}>
      <App />
    </CartContextProvider>,
  );
}
