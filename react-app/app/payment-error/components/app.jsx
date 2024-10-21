import React from 'react';
import { getLanguageAttr } from '../../../../scripts/configs';

function App() {
  const params = new URLSearchParams(window.location.search);
  const errorMessage = params.get('message');
  sessionStorage.setItem('payment-error', errorMessage);
  window.location = `/${getLanguageAttr()}/checkout`;
  return null;
}

export default App;
