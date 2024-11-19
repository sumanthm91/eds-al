/* eslint-disable import/no-cycle */
import { getConfigValue } from '../configs.js';

export const CARTID_STORE = 'M2_VENIA_BROWSER_PERSISTENCE__cartId';

class Store {
  constructor(key = Store.CART_STORE) {
    this.subscribers = [];
    this.key = key;
    this.type = 'guest';
    this.cartId = Store.getCartIdFromLocalStorage();
    this.newCartItem = null;
  }

  static CART_STORE = 'COMMERCE_CART_CACHE';

  static COOKIE_SESSION = 'COMMERCE_SESSION';

  static COOKIE_CART_ID = 'COMMERCE_CART_ID';

  static COOKIE_EXPIRATION_DAYS = 30;

  static DEFAULT_CART = {
    cart: {},
    id: null,
    items_qty: 0,
    totals: {},
  };

  static getCartIdFromLocalStorage() {
    const cartIdField = window.localStorage.getItem(CARTID_STORE);
    if (!cartIdField) {
      return null;
    }
    try {
      const parsed = JSON.parse(cartIdField);
      if (Store.isExpired(parsed.expiryTime)) {
        Store.deleteExpiredCart(parsed.value);
        return null;
      }
      return parsed.value.replaceAll('"', '');
    } catch (err) {
      console.error('Could not parse cartId', err);
      return null;
    }
  }

  static async saveCartIdInLocalStorage(cartId) {
    window.localStorage.setItem(CARTID_STORE, JSON.stringify({
      value: `"${cartId}"`,
      timeStored: Date.now(),
      expiryTime: await Store.getExpiryTimestamp(),
    }));
  }

  static getCookie(key) {
    return document.cookie
      .split(';')
      .map((c) => c.trim())
      .filter((cookie) => cookie.startsWith(`${key}=`))
      .map((cookie) => decodeURIComponent(cookie.split('=')[1]))[0] || null;
  }

  static setCookie(key, value) {
    const expires = new Date(Date.now() + Store.COOKIE_EXPIRATION_DAYS * 864e5).toUTCString();
    document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  }

  async setCartId(cartId) {
    this.cartId = cartId;
    await Store.saveCartIdInLocalStorage(cartId);
    this.setCart({
      ...this.getCart(),
      id: cartId,
    });
  }

  getCartId() {
    return this.cartId;
  }

  setCart(cart) {
    // Only store cart with proper id
    if (!cart.id) {
      return;
    }

    window.localStorage.setItem(`${this.key}_${this.cartId}`, JSON.stringify(cart));

    this.subscribers.forEach((callback) => {
      callback(cart);
    });
  }

  getCart() {
    if (!this.cartId) {
      return Store.DEFAULT_CART;
    }
    try {
      const parsed = JSON.parse(window.localStorage.getItem(`${this.key}_${this.cartId}`)) || Store.DEFAULT_CART;
      if (Store.isExpired(parsed.expiryTime)) {
        Store.deleteExpiredCart(parsed.value);
        return Store.DEFAULT_CART;
      }
      return parsed;
    } catch (err) {
      console.error('Failed to parse cart from localStore. Resetting it.');
      window.localStorage.removeItem(`${this.key}_${this.cartId}`);
    }
    return Store.DEFAULT_CART;
  }

  resetCart() {
    window.localStorage.removeItem(`${this.key}_${this.cartId}`);
    this.cartId = null;
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.getCart());
  }

  setNewCartItem(data) {
    this.newCartItem = data;
  }

  getNewCartItem() {
    return this.newCartItem;
  }

  static async getExpiryTimestamp() {
    const guestCartExpiryDays = await getConfigValue('guest-cart-expiry-days') || Store.COOKIE_EXPIRATION_DAYS;
    const now = new Date();
    const expiryDate = new Date(now.getTime() + guestCartExpiryDays * 864e5);
    return expiryDate.getTime();
  }

  static isExpired(expiryTime) {
    const now = new Date();
    return now.getTime() > expiryTime;
  }

  static deleteExpiredCart(cartIdAsString) {
    window.localStorage.removeItem(CARTID_STORE);
    // remove starting and trailing quotes from the cartId
    const cartId = cartIdAsString?.replaceAll('"', '');
    window.localStorage.removeItem(`${Store.CART_STORE}_${cartId}`);
  }
}

export const store = new Store();

export const cartApi = {
  addToCart: async (sku, options, quantity, source = 'product-detail') => {
    const { addToCart, createCart } = await import('./cart.js');
    // const { showCart } = await import('./Minicart.js'); // TODO: add as part of mini cart story
    if (!store.getCartId()) {
      console.debug('Cannot add item to cart, need to create a new cart first.');
      await createCart();
    }
    const response = await addToCart(sku, options, quantity, source);
    // showCart(); // TODO: add as part of mini cart story
    return response;
  },
  toggleCart: async () => {
    const { toggle } = await import('./Minicart.js');
    toggle();
  },
  cartItemsQuantity: {
    watch: (callback) => {
      store.subscribe((cart) => {
        callback(cart.cart?.items_qty || 0, cart?.totals?.grand_total || 0, cart?.totals?.base_currency_code || 'AED');
      });
    },
  },
};
