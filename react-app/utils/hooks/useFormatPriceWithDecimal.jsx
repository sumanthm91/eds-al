const useFormatPriceWithDecimal = (price, priceDecimals) => {
  if (priceDecimals !== undefined && priceDecimals !== '' && priceDecimals !== null) {
    return price?.toFixed(priceDecimals);
  }
  return price?.toFixed(2);
};

export default useFormatPriceWithDecimal;
