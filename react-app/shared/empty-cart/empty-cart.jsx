import React, { useContext, useEffect } from 'react';
import './empty-cart.css';
import CartContext from '../../context/cart-context';

function EmptyCart() {
  const { placeholders } = useContext(CartContext);

  useEffect(() => {
    const cartContainerEl = document.querySelector('.cart-container');
    const cartBlockEl = document.querySelector('.cart.block');
    const carouselEmptyCartEl = document.querySelector('.cart-container .carousel-wrapper');

    if (cartContainerEl) cartContainerEl.classList.add('cart-container-full');
    if (cartBlockEl) cartBlockEl.classList.add('empty-cart-block');
    if (carouselEmptyCartEl) carouselEmptyCartEl.classList.add('carousel-empty-cart');

    window.dispatchEvent(new CustomEvent('updateMiniCart'));
    
    return () => {
      if (cartContainerEl) cartContainerEl.classList.remove('cart-container-full');
      if (cartBlockEl) cartBlockEl.classList.remove('empty-cart-block');
      if (carouselEmptyCartEl) carouselEmptyCartEl.classList.remove('carousel-empty-cart');
    };
  }, []);

  return (
    <div className="cart__empty">
      <span className="cart-empty__title">{placeholders.emptyCartMessage}</span>
      <span className="cart-empty__recomendation-title">{placeholders.emptyCartFavMessage}</span>
    </div>
  );
}

export default EmptyCart;
