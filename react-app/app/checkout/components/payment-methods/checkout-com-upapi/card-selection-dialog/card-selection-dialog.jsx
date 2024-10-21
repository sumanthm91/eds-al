import React, { useContext } from 'react';
import CartContext from '../../../../../../context/cart-context';
import './card-selection-dialog.css';

export default function CardSelectionDialog({
  savedCards, onAddNewCard, activeCard, onSelectCard, paymentLogoList,
}) {
  const { placeholders } = useContext(CartContext);
  return (
    <>
      <div className="dialog-heading">
        <h2>
          {placeholders.paymentModalTitle}
        </h2>
      </div>
      <div className="card_payment_modal_container">
        <button type="submit" className="secondary payment_methods__add_new_card_btn" onClick={onAddNewCard}>{placeholders.addNewCardBtnTitle}</button>
        <div className="spc-checkout-saved-card-list">
          {
          savedCards.length ? (
            savedCards.map((cardInfo) => {
              const icon = Array.from(paymentLogoList).find((logo) => logo.innerHTML.includes(cardInfo.type));
              const isSeleted = cardInfo.entityId === activeCard.entityId;
              return (
                <div className="payment-card">
                  <div className="payment_card__block">
                    <div className="payment_method__card_block">
                      <div className="spc-checkout-payment-saved-card-number">{`**** **** **** ${cardInfo?.maskedCC}`}</div>
                      {isSeleted && <div className="circle"><div className="selected-check-icon" /></div>}
                    </div>
                    <span dangerouslySetInnerHTML={{ __html: icon.innerHTML }} />
                  </div>
                  <div className="spc-checkout-payment-saved-card-expiry">{`expires ${cardInfo?.expirationDate}`}</div>
                  <button className="secondary payment_methods__selected_btn" type="submit" onClick={() => onSelectCard(cardInfo)}>
                    {isSeleted && <div className="selected-check-icon btn-icon" />}
                    {isSeleted ? placeholders.selectedText : placeholders.selectText }
                  </button>

                </div>
              );
            })
          ) : null
        }
        </div>
      </div>
    </>
  );
}
