import { useEffect, useState } from 'react';
import { getCurrencyFormatter } from '../base-utils';

const useCurrencyFormatter = ({ price, priceDecimals, currency }) => {
  const [currencyValue, setCurrencyValue] = useState('');

  useEffect(() => {
    const setValue = async () => {
      const formatter = await getCurrencyFormatter(currency, priceDecimals);
      let formattedValue = formatter.format(price);
      if (price < 0 && document.documentElement.lang !== 'ar') {
        const currencySymbol = formatter.formatToParts(price).find(part => part.type === 'currency').value;
        formattedValue = formattedValue.replace(`-${currencySymbol} `, `${currencySymbol} -`);
      }
      setCurrencyValue(formattedValue)
    };
    setValue();
  }, [price]);

  return currencyValue;
};

export default useCurrencyFormatter;
