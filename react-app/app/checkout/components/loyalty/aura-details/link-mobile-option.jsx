import React, { useState, useEffect } from 'react';
import { getCountryIso } from '../../../../../../scripts/helpers/country-list.js';
import { getConfigValue } from '../../../../../../scripts/configs.js';

function LinkMobileOption({
  loyaltyMobilePlaceholder,
  value,
}) {
  const [countryPrefix, setCountryPrefix] = useState('');

  useEffect(() => {
    const fetchCountryPrefix = async () => {
      const countryCode = await getConfigValue('country-code');
      const prefix = `+${await getCountryIso(countryCode)}`;
      setCountryPrefix(prefix);
    };

    fetchCountryPrefix();
  }, []);

  return (
    <>
      <label htmlFor="spc-aura-link-card-input-mobile-mobile-number" className="countrycode">{countryPrefix}</label>
      <input
        type="tel"
        id="spc-aura-link-card-input-mobile-mobile-number"
        name="spc-aura-link-card-input-mobile-mobile-number"
        data-phone-prefix={countryPrefix}
        aria-label="mobile number"
        placeholder={loyaltyMobilePlaceholder}
        value={value}
        required
        pattern="[0-9]*"
        maxLength="8"
      />
    </>
  );
}

export default LinkMobileOption;
