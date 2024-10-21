const cardTypeLengths = {
  amex: [15],
  visa: [16],
  mastercard: [16],
  discover: [16],
  diners: [14],
};

const toDigits = (numString) => numString
  .replace(/[^0-9]/g, '')
  .split('')
  .map(Number);

const condTransform = (predicate, value, fn) => {
  if (predicate) {
    return fn(value);
  }
  return value;
};

const doubleEveryOther = (current, idx) => condTransform(idx % 2 === 0, current, (x) => x * 2);

const reduceMultiDigitVals = (current) => condTransform(current > 9, current, (x) => x - 9);

const validateCardLength = (numString, cardType) => {
  const digits = toDigits(numString);
  const len = digits.length;

  // Type not supported.
  if (cardTypeLengths[cardType] === undefined) {
    return false;
  }

  // Invalid length.
  if (cardTypeLengths[cardType].indexOf(len) === -1) {
    return false;
  }

  const digit = digits[len - 1];

  const total = digits
    .slice(0, -1)
    .reverse()
    .map(doubleEveryOther)
    .map(reduceMultiDigitVals)
    .reduce((current, accumulator) => current + accumulator, digit);

  return total % 10 === 0;
};

export default validateCardLength;
