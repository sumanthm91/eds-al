import React, {
  useContext, useRef, useCallback, useState,
} from 'react';
import Cleave from 'cleave.js/react';
import { binValidation, getPaymentCardType } from '../../utilities/utils.js';
import CheckoutComUpiContext from '../../../../../../context/checkoutcomupi-context.jsx';
import validateCardLength from '../../utilities/cardLengthValidations.js';
import { handleValidationMessage } from '../../utilities/manageHtmlErrors.js';
import './new-card.css';
import CartContext from '../../../../../../context/cart-context.jsx';
import CardTypeSVG from '../../../../../../library/icon/card-type-svg.js';

function NewCard(props) {
  const ccExpiry = useRef(null);
  const ccCvv = useRef(null);
  const [payingCardType, setPayingCardType] = useState(null);
  const date = new Date();
  const dateMin = `${date.getMonth() + 1}-${date.getFullYear().toString().substr(-2)}`;

  const {
    checkoutComUpiConfig,
    checkoutComUpiBinConfig,
    cardConfig,
    setCardConfig,
    allowedCardTypes,
  } = useContext(CheckoutComUpiContext);

  const { placeholders, isLoggedIn, isTopupFlag } = useContext(CartContext);

  const {
    labelEffect,
    enableCheckoutLink,
    handleCardCvvChange,
    paymentLogoList,
  } = props;

  const handleCardTypeChanged = (type) => {
    document.getElementById('payment-card-type').value = type;
  };

  const { display_card_number_type: showCardIconOnType } = checkoutComUpiConfig || {};

  const showCardType = useCallback((event) => {
    let type = document.getElementById('payment-card-type').value;

    // Also add support for show MasterCard Active for Maestro family.
    if (type === 'maestro') {
      type = 'mastercard';
    }

    setCardConfig({
      ...cardConfig,
      cardType: type,
    });

    // ShowCardIcon functionality only if enabled.
    if (showCardIconOnType) {
      const cardNumber = event.target.rawValue;
      // Get payment card type only if more than 3 chars entered.
      // Payment card type shall be null if less than 4 chars.
      const cardType = cardNumber.length > 3
        ? getPaymentCardType(cardNumber) : null;

      setPayingCardType(cardType);
    }
  }, [cardConfig, setCardConfig, setPayingCardType]);

  const handleCardNumberValidation = useCallback((cardNumber) => {
    let valid = true;
    const {
      cardType: type,
      numberValid,
    } = cardConfig;

    if (allowedCardTypes.indexOf(type) === -1) {
      valid = false;
    } else if (validateCardLength(cardNumber, type) === false) {
      valid = false;
    }

    handleValidationMessage(
      'spc-cc-number-error',
      cardNumber,
      valid,
      placeholders.inValidCardNumberText,
    );

    setCardConfig({
      ...cardConfig,
      numberValid: valid,
      number: cardNumber,
    });

    if (numberValid !== valid && valid) {
      ccExpiry.current.element.focus();
    }
  }, [checkoutComUpiConfig, cardConfig, setCardConfig]);

  const handleBinValidation = (cardNumber) => {
    const cardBin = cardNumber.substring(0, 6);
    const validation = binValidation(cardBin);

    if (validation.error !== undefined) {
      handleValidationMessage(
        'spc-cc-number-error',
        cardNumber,
        false,
        '',
      );
      return;
    }

    if (validation === true) {
      handleCardNumberValidation(cardNumber);
    }
  };

  const handleCardNumberChange = useCallback((event, handler) => {
    const cardNumber = event.target.rawValue;
    if (!cardNumber) {
      handleValidationMessage(
        'spc-cc-number-error',
        cardNumber,
        false,
        placeholders.requiredCardNumberText,
      );
      return;
    }
    labelEffect(event, handler);

    const { enableValidation: cardBinValidationEnabled } = checkoutComUpiBinConfig;

    if (cardBinValidationEnabled === true && cardNumber.length >= 6) {
      handleBinValidation(cardNumber);
    } else {
      handleCardNumberValidation(cardNumber);
    }
  }, [cardConfig, setCardConfig]);

  const handleCardExpiryChange = useCallback((event, handler) => {
    const expiry = event.target.value;
    if (!expiry) {
      handleValidationMessage(
        'spc-cc-expiry-error',
        expiry,
        false,
        placeholders.requiredExpiryText,
      );
      return;
    }
    const {
      expiryValid,
    } = cardConfig;

    let valid = true;

    labelEffect(event, handler);

    const dateParts = expiry.split('/').map((x) => {
      if (!(x) || Number.isNaN(x)) {
        return 0;
      }
      return parseInt(x, 10);
    });

    if (dateParts.length < 2 || dateParts[0] <= 0 || dateParts[1] <= 0) {
      valid = false;
    } else {
      const century = date.getFullYear().toString().substr(0, 2);
      date.setFullYear(century + dateParts[1], dateParts[0], 1);
      const today = new Date();
      if (date < today) {
        valid = false;
      }
    }

    handleValidationMessage(
      'spc-cc-expiry-error',
      event.target.value,
      valid,
      placeholders.incorrectExpiryText,
    );

    setCardConfig({
      ...cardConfig,
      expiryValid: valid,
      expiry: event.target.value,
    });

    if (expiryValid !== valid && valid) {
      ccCvv.current.focus();
    }
  }, [setCardConfig, cardConfig]);

  return (
    <div className="new-card-wrapper">
      <div className="payment-form-wrapper">
        <input type="hidden" id="payment-card-type" value={cardConfig.cardType} />
        <div className="spc-type-textfield spc-type-cc-number">
          <Cleave
            id="spc-cc-number"
            options={{
              creditCard: true,
              onCreditCardTypeChanged: handleCardTypeChanged,
            }}
            required
            type="tel"
            name="spc-no-autocomplete-name"
            autoComplete="off"
            onChange={(e) => showCardType(e)}
            onBlur={(e) => handleCardNumberChange(e, 'blur')}
            placeholder={placeholders.cardNumberText}
          />
          {showCardIconOnType && (
            <div className={`card-type card-type-${payingCardType}`} />
          )}
          <div className="c-input__bar" />
          <div id="spc-cc-number-error" className="error" title="Card number" />
        </div>
        <div className="spc-expiry-cvv-column">
          <div className="spc-type-textfield spc-type-expiry">
            <Cleave
              id="spc-cc-expiry"
              type="tel"
              ref={ccExpiry}
              options={{
                date: true,
                dateMin,
                datePattern: ['m', 'y'],
                delimiter: '/',
              }}
              required
              name="spc-no-autocomplete-expiry"
              autoComplete="off"
              onChange={(e) => handleCardExpiryChange(e, 'change')}
              onBlur={(e) => handleCardExpiryChange(e, 'blur')}
              placeholder={placeholders.expiryText}
            />
            <div className="c-input__bar" />
            <div id="spc-cc-expiry-error" className="error" />
          </div>
          <div className="spc-type-textfield spc-type-cvv">
            <input
              type="password"
              id="spc-cc-cvv"
              pattern="\d{3,4}"
              maxLength="4"
              required
              name="spc-no-autocomplete-cvv"
              autoComplete="off"
              ref={ccCvv}
              onChange={(e) => enableCheckoutLink(e)}
              onBlur={(e) => handleCardCvvChange(e, 'blur')}
              placeholder={placeholders.cvvText}
            />
            <div className="c-input__bar" />
            <div id="spc-cc-cvv-error" className="error" />
          </div>
        </div>
      </div>
      <div className="allowed-payments-logos">
        {allowedCardTypes.map((item, index) => <CardTypeSVG type={item} key={`card-${index}`} />)}
      </div>
      {isLoggedIn && !isTopupFlag && (
      <div className="spc-payment-save-card">
        <input type="checkbox" value={1} id="payment-card-save" name="save_card" />
        <label htmlFor="payment-card-save">
          {placeholders.saveCardText}
        </label>
      </div>
      )}
    </div>
  );
}

export default NewCard;
