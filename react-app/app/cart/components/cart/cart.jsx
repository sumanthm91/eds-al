import React, { useContext, useEffect, useState } from 'react';
import ItemShoppingList from '../item-shopping-list.jsx';
import CartContext from '../../../../context/cart-context.jsx';
import CartSummary from './cart-summary.jsx';

function Cart({ content }) {
  const { cart, cartShowFreeReturns } = useContext(CartContext);
  const { cardmethodtitle, paymentlogolist, deliverymethods } = content;
  const totalQuantity = cart?.data?.total_quantity ?? 0;
  const grandTotalCurrency = cart?.data?.prices?.grand_total?.currency ?? '';
  const grandTotal = cart?.data?.prices?.grand_total?.value ?? 0;
  const updatedTitle = content.carttitle?.replace('{{COUNT}}', totalQuantity);
  const updateTitleforMobile = content.mobilecarttitle?.replace('{{COUNT}}', totalQuantity).replace('{{CURRENCY}}', grandTotalCurrency).replace('{{PRICE}}', grandTotal.toFixed(2));
  const items = cart?.data?.items;
  const carouselContainerEl = document.querySelector('.section.carousel-container:not(.cart-section)');
  const [isMobileTitleFixed, setIsMobileTitleFixed] = useState(false);

  const showCarousel = () => {
    if (carouselContainerEl) {
      carouselContainerEl.classList.remove('hidden');
    }
  };

  const hideCarousel = () => {
    if (carouselContainerEl) {
      carouselContainerEl.classList.add('hidden');
    }
  };

  useEffect(() => {
    hideCarousel();
  }, []);

  useEffect(() => {
    if (items?.length) {
      showCarousel();
    } else {
      hideCarousel();
    }

    return () => {
      showCarousel();
    };
  }, [items]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 100; // You can adjust this value based on where you want it to become fixed
      if (window.scrollY > scrollThreshold) {
        setIsMobileTitleFixed(true);
      } else {
        setIsMobileTitleFixed(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="cart__shopping-block">
      <div className="cart__shopping-list slide-up-animation">
        <div className="cart-body-title-section">
          <div className={`cart-title-mobile ${isMobileTitleFixed ? 'fixed' : ''}`}>
            {content.mobilecarttitle && (
            <span dangerouslySetInnerHTML={{ __html: updateTitleforMobile }} />
            )}
          </div>
          <div className="cart-title">
            {updatedTitle && (
            <span dangerouslySetInnerHTML={{ __html: updatedTitle }} />
            )}
          </div>
          {content.freereturnlable && cartShowFreeReturns && (
          <div className="online-returns-cart-banner">
            <div dangerouslySetInnerHTML={{ __html: content.freereturnlable }} />
          </div>
          )}
          <ItemShoppingList />
        </div>
      </div>

      <CartSummary
        deliveryMethods={deliverymethods}
        cardMethodTitle={cardmethodtitle}
        paymentLogoList={paymentlogolist}
      />

    </div>
  );
}

export default Cart;
