import React, { useContext } from 'react';
import CartContext from '../../../../../../context/cart-context';
import './selected-card.css';

function SelectedCard({
  cardInfo,
  handleCardCvvChange,
  onExistingCardSelect,
  selectedCard,
  setDialogOpen,
}) {
  const { placeholders } = useContext(CartContext);
  return (
    <div className="spc-checkout-payment-saved-card-preview">
      <div className="spc-checkout-payment-data" onClick={() => onExistingCardSelect(cardInfo.public_hash, cardInfo.mada)} tabIndex={0} role="button" onKeyUp={() => {}}>
        <div className="spc-checkout-payment-saved-card-number">{`${placeholders.cardNumberText}: **** **** **** ${cardInfo?.maskedCC}`}</div>
        <div className="spc-checkout-payment-saved-card-expiry">{`${placeholders.expiryText}: ${cardInfo?.expirationDate}`}</div>
        {selectedCard === 'existing' && (
        <div className="spc-type-textfield spc-type-cvv">
          <input
            type="password"
            id="spc-cc-cvv"
            pattern="\d{3,4}"
            maxLength="4"
            required
            name="spc-no-autocomplete-saved-cvv"
            autoComplete="off"
            onBlur={(e) => handleCardCvvChange(e, 'blur')}
            placeholder={placeholders.cvvText}
          />
          <div className="c-input__bar" />
          <div id="spc-cc-cvv-error" className="error" />
        </div>
        )}
      </div>
      <button type="submit" className="secondary spc-add-new-card-change-btn" onClick={() => setDialogOpen(true)}>
        {placeholders.changeText}
      </button>
    </div>
  );
}

export default SelectedCard;
