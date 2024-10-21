import { getConfigValue } from '../../scripts/configs.js';
import AppConstants from './app.constants.js';

export const getCurrencyFormatter = async (currencyCode, priceDecimals = 2) => {
  let currency = currencyCode || '';

  if (!currency) {
    currency = await getConfigValue('currency') || 'AED';
  }

  const countryCode = await getConfigValue('country-code') || 'AE';

  return new Intl.NumberFormat(`${document.documentElement.lang || 'en'}-${countryCode}`, {
    style: 'currency',
    currency,
    numberingSystem: 'latn',
    maximumFractionDigits: priceDecimals,
  });
};

export const formatPrice = async (currency, price) => {
  const currentFormatter = await getCurrencyFormatter(currency);
  return currentFormatter.format(price);
};

export const getRandomNumber = () => Math.floor(Math.random() * 100);

export const hasValue = (value) => {
  if (typeof value === 'undefined') {
    return false;
  }

  if (value === null) {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(value, 'length') && value.length === 0) {
    return false;
  }

  if (value.constructor === Object && Object.keys(value).length === 0) {
    return false;
  }

  return Boolean(value);
};

//Condition: Other than checkout page this Id shouldnt been called.
export const getTopupEgiftCardId = () => {
  if (window.location.pathname?.includes('/checkout')) {
    if (sessionStorage.getItem(AppConstants.LOCAL_STORAGE_KEY_DIGITAL_CART_ID)) {
      return sessionStorage.getItem(AppConstants.LOCAL_STORAGE_KEY_DIGITAL_CART_ID);
    }
  } else {
    sessionStorage.removeItem(AppConstants.LOCAL_STORAGE_KEY_DIGITAL_CART_ID)
  }
}