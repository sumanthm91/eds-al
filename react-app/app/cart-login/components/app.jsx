import React, { useContext } from 'react';
import CartContext from '../../../context/cart-context.jsx';
import Login from './login/login.jsx';
import AppConstants from '../../../utils/app.constants.js';
import CartAndCheckoutLayout from '../../../shared/cart-and-checkout-layout/cart-and-checkout-layout.jsx';

/**
 * App Component.
 * @param {string} [content] block content from sharepoint docx
 * @param {string} [placeholders] locale based placeholders coming from placeholders.xlsx
 */

function App() {
  const { activeProgressStep } = useContext(CartContext);

  return (
    <CartAndCheckoutLayout>
      <div className="cart__checkout__blocks">
        {activeProgressStep === AppConstants.PROGRESS_BAR_STEP_LOGIN && <Login />}
      </div>
    </CartAndCheckoutLayout>
  );
}

export default App;
