import {
  getSignInToken, performCommerceRestMutation, performCommerceRestQuery,
} from '../commerce.js';
import { getConfigValue } from '../configs.js';

const wishlistKey = 'guestUserwishlistInfo';

// generate timestamp for 7 days from now
function getExpiryTimestamp() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const timestamp = sevenDaysFromNow.getTime();
  return timestamp;
}

// check if the wishlist has expired and return true if expired
function isExpired(expiryTime) {
  const now = new Date();
  return now.getTime() > expiryTime;
}

export async function getWishlist() {
  const token = getSignInToken();
  if (!token) {
    const localWishlist = localStorage.getItem(wishlistKey);
    if (localWishlist) {
      const wishlist = JSON.parse(localStorage.getItem(wishlistKey));
      if (isExpired(wishlist.expiryTime)) {
        localStorage.removeItem(wishlistKey);
        return {
          items: [],
        };
      }
      return wishlist.data;
    }
    return {
      items: [],
    };
  }

  const baseUrl = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  const url = `${baseUrl}/${storeViewCode}/V1/wishlist/me/get`;

  const response = await performCommerceRestQuery(url, true);

  const { data, success } = response;

  if (success) {
    console.log(data);

    const wishlist = data;
    wishlist.items = [];

    if (wishlist?.items_count > 0) {
      const wishlistItemsUrl = `${baseUrl}/${storeViewCode}/V1/wishlist/me/items`;

      const wishlistItemsResponse = await performCommerceRestQuery(wishlistItemsUrl, true);

      const { success: itemsSuccess, data: wishlistData } = wishlistItemsResponse;

      if (itemsSuccess && wishlistData?.items?.length > 0) {
        console.log(wishlistData);
        wishlist.items = wishlistData.items;
      }
    }

    return wishlist;
  }

  return {};
}

/**
 * check if the product is already in the wishlist and return the index
 * @param {string} sku - product sku
 */
export async function isProductInWishlist(sku, wishlistObj = null) {
  let wishlist = wishlistObj;
  if (!wishlistObj) {
    wishlist = await getWishlist();
  }
  // TODO: Handle Configurable Product case?
  const index = wishlist.items?.findIndex((item) => item.sku === sku);
  return index;
}

/**
 * add product to wishlist storage
 * @param {object} product - product
 */
async function addToWishlistToStorage(product) {
  const expiryTime = getExpiryTimestamp();
  const wishlist = await getWishlist();
  const index = wishlist?.items?.findIndex((item) => item.sku === product.sku);
  const isItemExist = (index !== -1);
  // TODO: add product options also
  if (!isItemExist) {
    wishlist.items.push({
      sku: product.sku,
    });
    const data = {
      data: wishlist,
      expiryTime,
    };
    localStorage.setItem(wishlistKey, JSON.stringify(data));
  } else {
    console.log('Product already in wishlist');
  }
}

async function removeFromWishlistToStorage(product) {
  const expiryTime = getExpiryTimestamp();
  const wishlist = await getWishlist();

  const index = await isProductInWishlist(product.sku, wishlist);

  const isItemExist = (index !== -1);
  // TODO: add product options also
  if (isItemExist) {
    wishlist.items.splice(index, 1);

    const data = {
      data: wishlist,
      expiryTime,
    };
    localStorage.setItem(wishlistKey, JSON.stringify(data));
  } else {
    console.log('Product not in wishlist');
  }
}

async function createWishlist() {
  const token = getSignInToken();

  if (!token) {
    return {};
  }

  const variables = {
    name: 'MyFavorites',
    visibility: true,
  };

  const baseUrl = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  const url = `${baseUrl}/${storeViewCode}/V1/wishlist/me/create`;

  const response = await performCommerceRestMutation(url, variables, !!token);

  const { data, success, message } = response;

  if (!success) {
    console.error(message);
  } else {
    return { status: success, data, message };
  }

  return null;
}

async function addToWishlistInternally(product, token, wishlist) {
  if (!wishlist) {
    await createWishlist();
  }

  const status = { status: true, message: 'Product added to wishlist' };

  if (!token) {
    await addToWishlistToStorage(product);
  } else {
    const baseUrl = await getConfigValue('commerce-rest-endpoint');

    const storeViewCode = await getConfigValue('commerce-store-view-code');

    const url = `${baseUrl}/${storeViewCode}/V1/wishlist/me/item/add`;

    // TODO: Handle Configurable Product
    const variables = {
      items: [
        {
          sku: product.sku,
        },
      ],
    };

    const response = await performCommerceRestMutation(url, variables, true);

    const { success, message, data } = response;

    if (!success || !data.status) {
      // TODO: how to handle error scenario for display
      console.log('Error adding product to wishlist : ', message);
      return { status: success && data.status, message: data.message };
    }
  }

  // create a custom event to notify the wishlist has been updated
  document.querySelector('main').dispatchEvent(new CustomEvent('favourites-updated', {
    detail: {
      count: wishlist.items.length, product, showSignIn: true,
    },
  }));

  return status;
}

// eslint-disable-next-line camelcase
async function removeFromWishlistInternally(product, token, wishlist) {
  if (!token) {
    await removeFromWishlistToStorage(product);
    return { status: true, message: 'Product removed from wishlist' };
  }

  const index = await isProductInWishlist(product.sku, wishlist);

  // eslint-disable-next-line camelcase
  const { wishlist_item_id } = wishlist.items[index];

  const baseUrl = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  // eslint-disable-next-line camelcase
  const url = `${baseUrl}/${storeViewCode}/V1/wishlist/me/item/${wishlist_item_id}/delete`;

  const response = await performCommerceRestMutation(url, null, true, 'DELETE');

  console.log(response);

  const { message, success } = response;

  if (success) {
    // create a custom event to notify the wishlist has been updated
    console.log('Product removed from wishlist', message);
  } else {
    // TODO: how to handle error scenario for display
    console.log('Error removing product from wishlist', message);
  }

  return { status: success, message };
}

export async function updateWishlist(product, remove) {
  const token = getSignInToken();

  const wishlist = await getWishlist();

  console.log(wishlist);

  if (!remove) {
    return addToWishlistInternally(product, token, wishlist);
  }

  if (remove) {
    return removeFromWishlistInternally(product, token, wishlist);
  }
  console.log('Product not in wishlist', product.sku, wishlist);
  return { status: false, message: 'Some error' };
}

export async function mergeWishlist() {
  const token = getSignInToken();

  if (!token) {
    return { status: false, message: 'User not logged in' };
  }

  const localWishlist = localStorage.getItem(wishlistKey);
  if (localWishlist) {
    const wishlist = JSON.parse(localStorage.getItem(wishlistKey));
    const { items } = wishlist.data;

    const baseUrl = await getConfigValue('commerce-rest-endpoint');

    const storeViewCode = await getConfigValue('commerce-store-view-code');

    const url = `${baseUrl}/${storeViewCode}/V1/wishlist/me/item/add`;

    // TODO: Handle Configurable Product
    const variables = {
      items: items.map((item) => ({
        sku: item.sku,
      })),
    };

    const response = await performCommerceRestMutation(url, variables, true);

    const { success, message } = response;

    if (!success) {
      // TODO: how to handle error scenario for display
      console.log('Error adding product(s) to wishlist', message);
      return { status: success, message };
    }

    // clear local wishlist
    localStorage.removeItem(wishlistKey);
    return { status: success, message: 'Wishlist merged successfully' };
  }

  return { status: true, message: 'No Wishlist to merge' };
}
