import AppConstants from "./app.constants";

/**
 * Get local storage data by key
 *
 * @param storageKey
 * @returns {{data: null|string}}
 */
export const getLocalStorageByKey = (storageKey) => {
  let data = null;
  const storedData = window.localStorage.getItem(storageKey);
  if (storedData) {
    try {
      const parsed = JSON.parse(storedData);
      data = parsed.value.replaceAll('"', '');
    } catch (error) {
      console.error('Error parsing JSON from local storage', error);
    }
  }

  return data;
};

export const removeCartInfoFromLocal = () => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(AppConstants?.CHECKOUT_COMMERCE_CART_CACHE)) {
      localStorage.removeItem(key);
    }
  }
  localStorage.removeItem(AppConstants?.PAYMENT_METHOD_M2_VENIA_BROWSER_PERSISTENCE__CARTID);
}

