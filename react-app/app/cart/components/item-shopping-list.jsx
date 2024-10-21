import React, { useContext } from 'react';
import ProductSummaryCardGql from './product-summary-card-graphql.jsx';
import CartContext from '../../../context/cart-context.jsx';

function ItemShoppingList() {
  const { cart } = useContext(CartContext);

  return (
    <div className="cart__shopping-list__items">
      {
          cart?.data?.items?.map((product, index) => (
            <ProductSummaryCardGql
              key={`product-sku-${product?.configured_variant?.sku ?? index}`}
              product={product}
              currency={cart?.data?.prices?.grand_total?.currency}
            />
          ))
        }
    </div>

  );
}

export default ItemShoppingList;
