import React, { createContext, useState, useEffect } from 'react';
import getCheckoutcomUpiConfig from '../api/getCheckoutcomUpiConfig.js';

const INIT_CONTEXT_VALUES = {
  config: {},
  binConfig: {
    enableValidation: false,
    supportedPaymentMethods: '',
  },
  cardBinNumbers: {},
  cardConfig: {
    cvv: '',
    expiry: '',
    number: '',
    cardType: '',
    tokenizedCard: '',
    selectedCard: 'new',
    numberValid: false,
    expiryValid: false,
    cvvValid: false,
    tokenizedCards: [],
  },
  processMada: false,
  applePayAllowedIn: 'all',
  isConfigLoaded: false,
};

/**
 * Checkoutcom Context is used to share data
 */
const CheckoutComUpiContext = createContext(INIT_CONTEXT_VALUES);

export function CheckoutComUpiContextProvider(props) {
  const [checkoutComUpiConfig, setCheckoutComUpiConfig] = useState(INIT_CONTEXT_VALUES.config);
  const [isConfigLoaded, setisConfigLoaded] = useState(INIT_CONTEXT_VALUES.isConfigLoaded);
  const [allowedCardTypes, setAllowedCardTypes] = useState([]);
  const [processMada, setProcessMada] = useState(INIT_CONTEXT_VALUES.processMada);
  const [cardConfig, setCardConfig] = useState(INIT_CONTEXT_VALUES.cardConfig);
  const [applePayAllowedIn] = useState(INIT_CONTEXT_VALUES.applePayAllowedIn);
  const [checkoutComUpiBinConfig] = useState(
    INIT_CONTEXT_VALUES.binConfig,
  );

  /* Get the checkoutcomUpi config */
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await getCheckoutcomUpiConfig();
        setCheckoutComUpiConfig(response);
      } catch (error) {
        console.error('Failed to fetch checkoutcomUpi config', error);
      }
      setisConfigLoaded(true)
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const cardTypes = checkoutComUpiConfig?.allowed_card_types;
    if (cardTypes) {
      const allowedCards = cardTypes
        .toLowerCase()
        .split(',');

      const allowedCardsMapping = Object.entries({
        mastercard: 'mastercard',
        visa: 'visa',
        'american express': 'amex',
        'diners club international': 'diners',
      });

      const allowedCardsMapped = [];

      // Process the allowed cards based on the mapping
      if (allowedCards.length > 0 && Object.keys(allowedCardsMapping).length > 0) {
        allowedCardsMapping.forEach(([allowedCard, cardType]) => {
          // Remove card from allowedCards
          const index = allowedCards.indexOf(allowedCard);
          if (index !== -1) {
            allowedCardsMapped[allowedCard] = cardType || '';
            allowedCards.splice(index, 1);
          }
        });
      }

      // Filter out empty mappings and get the values
      let allowedCardsValue = Object.values(allowedCardsMapped).filter((value) => value !== '');

      // Add remaining cards that were not in the mapping
      if (allowedCards.length > 0) {
        allowedCardsValue = allowedCardsValue.concat(allowedCards);
      }

      // Remove 'mada' if present
      const madaKey = allowedCardsValue.indexOf('mada');
      if (madaKey !== -1) {
        allowedCardsValue.splice(madaKey, 1);
      }

      setAllowedCardTypes(allowedCardsValue);
      setProcessMada(allowedCards.includes('mada'));
    }
  }, [setProcessMada, setAllowedCardTypes, checkoutComUpiConfig]);

  return (
    <CheckoutComUpiContext.Provider value={{
      checkoutComUpiConfig,
      setCheckoutComUpiConfig,
      checkoutComUpiBinConfig,
      cardConfig,
      setCardConfig,
      allowedCardTypes,
      processMada,
      applePayAllowedIn,
      isConfigLoaded,
      setisConfigLoaded
    }}
    >
      {props?.children}
    </CheckoutComUpiContext.Provider>
  );
}

export default CheckoutComUpiContext;
