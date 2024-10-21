import React, { useContext } from 'react';
import CartContext from '../../../context/cart-context.jsx';
import useGetCartGraphql from '../../../api/getCartGraphql.js';
import Cart from './cart/cart.jsx';
import Loader from '../../../shared/loader/loader.jsx';
import EmptyCart from '../../../shared/empty-cart/empty-cart.jsx';
import AppConstants from '../../../utils/app.constants.js';
import CartAndCheckoutLayout from '../../../shared/cart-and-checkout-layout/cart-and-checkout-layout.jsx';

/**
 * App Component.
 * @param {string} [content] block content from sharepoint docx
 * @param {string} [placeholders] locale based placeholders coming from placeholders.xlsx
 */
function App({ content }) {
  useGetCartGraphql(1);

  const { activeProgressStep } = useContext(CartContext);
  const { cartId, cart } = useContext(CartContext);
  const items = cart?.data?.items;

  const render = () => {
    if (cart.isLoading) return <Loader />;

    if (!cartId || !items?.length) {
      return (
        <EmptyCart />
      );
    }

    return (
      <div className="cart__checkout__blocks">
        {activeProgressStep === AppConstants.PROGRESS_BAR_STEP_CART && <Cart content={content} />}
      </div>
    )
  }

  return (
    <CartAndCheckoutLayout showProgressBar={!cart.isLoading && !(!cartId || !items?.length)}>
      {render()}
    </CartAndCheckoutLayout>
  );
}

export default App;
