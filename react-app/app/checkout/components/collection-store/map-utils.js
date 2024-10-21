import { getConfigValue } from '../../../../../scripts/configs';

export const getUserLocation = async (coords) => {
  const geocoder = new window.google.maps.Geocoder();
  // Flag to determine if user country same as site.
  let userCountrySame = false;
  let address = [];
  const countryCode = '' || await getConfigValue('country-code');
  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { location: coords },
      (results, status) => {
        if (status === 'OK') {
          if (results[0]) {
            // Use this address info.
            address = results[0].address_components;
            // Checking if user current location belongs to same
            // country or not by location coords geocode.
            userCountrySame = address.some(
              (addressItem) => (
                addressItem.types.indexOf('country') !== -1
                && addressItem.short_name === countryCode),
            );
            resolve([userCountrySame, results]);
          }
        } else {
          reject(status);
        }
      },
    );
  });
};

export const findValueFromAddress = (address, key) => {
  if (!address) {
    return '';
  }
  const data = address.find((add) => add.code === key);
  if (!data) {
    return '';
  }
  return data.value;
};
