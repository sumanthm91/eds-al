import { performRestQuery, performRestSubmit } from '../commerce.js';
import { getConfigValue } from '../configs.js';

const bvConfigKey = 'bvConfig';

const reviewsKey = 'reviews';

// generate timestamp for 7 days from now
function getExpiryTimestamp() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const timestamp = sevenDaysFromNow.getTime();
  return timestamp;
}

// check if the config has expired and return true if expired
function isExpired(expiryTime) {
  const now = new Date();
  return now.getTime() > expiryTime;
}

function getBVConfigFromLocal(lang) {
  const bvConfig = sessionStorage.getItem(bvConfigKey);

  if (bvConfig) {
    const config = JSON.parse(bvConfig);
    if (isExpired(config.expiryTime)) {
      sessionStorage.removeItem(bvConfigKey);
    } else if (config.data[lang]) {
      return config.data[lang];
    }
  }

  return null;
}

function setBVConfigInLocal(lang, bvConfigData) {
  const bvConfig = sessionStorage.getItem(bvConfigKey);

  const expiryTime = getExpiryTimestamp();
  const data = {
    data: {
      [lang]: bvConfigData,
    },
    expiryTime,
  };

  if (bvConfig) {
    const config = JSON.parse(bvConfig);
    if (!isExpired(config.expiryTime)) {
      Object.keys(config.data).forEach((key) => {
        if (key !== lang) {
          data.data[key] = config.data[key];
        }
      });
      data.expiryTime = getExpiryTimestamp();
    }
  }
  sessionStorage
    .setItem(bvConfigKey, JSON.stringify(data));
}

export async function getBVConfig() {
  const lang = document.documentElement.lang || 'en';
  const bvConfig = getBVConfigFromLocal(lang);

  if (bvConfig) {
    return bvConfig;
  }

  const commerceRestEndpoint = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  // load config from Rest api
  const { data: config } = await performRestQuery(`${commerceRestEndpoint}/${storeViewCode}/V1/bv/configs`);
  console.log('config loaded', config);

  if (!config || !config.length) {
    return null;
  }
  setBVConfigInLocal(lang, config[0]);
  return config[0];
}

export async function getBVWriteConfig(sku) {
  const commerceRestEndpoint = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  // load config from Rest api
  const { data: config } = await performRestQuery(`${commerceRestEndpoint}/${storeViewCode}/V1/bv/config/write-review/${sku}`);
  console.log('config loaded', config);

  if (!config || !config.length) {
    return null;
  }
  return config;
}

/**
 * check if the product is already in the wishlist and return the index
 * @param {string} product - product sku
 */
export async function getReviews(sku, page = 0, pageSize = 5, sort = 'none') {
  const bvConfig = await getBVConfig();
  if (!bvConfig) {
    return [];
  }

  console.log('bvConfig', bvConfig, sku);

  const {
    // eslint-disable-next-line camelcase
    api_version, locale, content_locale, Include,
  } = bvConfig.basic;
  const passKey = await getConfigValue('bv-passkey');

  const bvAPIEndpoint = await getConfigValue('bv-api-endpoint');

  const sortUrl = sort === 'none' ? '' : `&sort=${sort}`;
  // eslint-disable-next-line camelcase
  const url = `${bvAPIEndpoint}/data/reviews.json?apiversion=${api_version}&passkey=${passKey}&locale=${locale}&filter=productid:${sku}&filter=contentlocale:${content_locale}*&Include=${Include}&Stats=Reviews&FilteredStats=Reviews&Limit=${pageSize}&Offset=${page}${sortUrl}`;
  const reviews = await performRestQuery(url);
  return reviews.data;
}

export async function googleTranslate(text, sourceLang, targetLang) {
  const passKey = await getConfigValue('google-passkey');
  const googleApiEndpoint = await getConfigValue('google-api-endpoint');
  const url = `${googleApiEndpoint}?key=${passKey}&q=${text}&target=${targetLang}&source=${sourceLang}`;
  const data = new FormData();
  const response = await performRestSubmit(url, data);
  return response.data.translations[0].translatedText;
}

export async function getAuthorReviews(authorId, sku, page = 0, pageSize = 5) {
  const bvConfig = await getBVConfig();
  if (!bvConfig) {
    return [];
  }

  console.log('bvConfig', bvConfig, authorId, sku);

  const {
    // eslint-disable-next-line camelcase
    api_version, locale,
  } = bvConfig.basic;

  const passKey = await getConfigValue('bv-passkey');

  const bvAPIEndpoint = await getConfigValue('bv-api-endpoint');

  let skuFilter = '';
  let include = 'Authors';

  if (sku) {
    if (Array.isArray(sku)) {
      skuFilter = `&filter=productid:${sku.join(',')}`;
    } else {
      skuFilter = `&filter=productid:${sku}`;
    }
    include = 'Authors,Products';
  }

  // eslint-disable-next-line camelcase
  const url = `${bvAPIEndpoint}/data/reviews.json?apiversion=${api_version}&passkey=${passKey}&locale=${locale}&filter=authorid:${authorId}${skuFilter}&Include=${include}&Stats=Reviews&Offset=${page}&Limit=${pageSize}`;
  const reviews = await performRestQuery(url);
  return reviews.data;
}

export async function storeReview(reviewFeedback, myReview) {
  const reviews = sessionStorage.getItem(reviewsKey);

  let reviewData = {
    reviewFeedbacks: [],
    myReviews: {},
    ttl: getExpiryTimestamp(),
  };

  if (reviews) {
    const tempReviewData = JSON.parse(reviews);

    if (isExpired(tempReviewData.ttl)) {
      sessionStorage.removeItem(reviewsKey);
    } else {
      reviewData = tempReviewData;
    }
  }

  if (reviewFeedback) {
    // eslint-disable-next-line max-len
    const index = reviewData?.reviewFeedbacks?.findIndex((review) => review.reviewId === reviewFeedback.reviewId);
    if (index >= 0) {
      reviewData.reviewFeedbacks[index] = reviewFeedback;
    } else {
      reviewData.reviewFeedbacks.push(reviewFeedback);
    }
    reviewData.ttl = getExpiryTimestamp();
  } else if (myReview) {
    if (reviewData?.myReviews?.[myReview.productid]) {
      reviewData.myReviews[myReview.productid] = myReview;
    } else {
      reviewData.myReviews[myReview.productid] = myReview;
    }
    reviewData.ttl = getExpiryTimestamp();
  }
  sessionStorage.setItem(reviewsKey, JSON.stringify(reviewData));
}

export function getStoredReviewFeedbacks() {
  const reviews = sessionStorage.getItem(reviewsKey);
  const parsedReviews = reviews ? JSON.parse(reviews) : {};
  return parsedReviews?.reviewFeedbacks;
}

export function getStoredMyReview(productId) {
  const reviews = sessionStorage.getItem(reviewsKey);
  const parsedReviews = reviews ? JSON.parse(reviews) : {};
  return parsedReviews.myReviews?.[productId];
}

export function clearStoredReview(productId) {
  const reviews = sessionStorage.getItem(reviewsKey);
  const parsedReviews = reviews ? JSON.parse(reviews) : {};

  if (parsedReviews.myReviews?.[productId]) {
    delete parsedReviews.myReviews[productId];
    sessionStorage.setItem(reviewsKey, JSON.stringify(parsedReviews));
  }
}

export async function postFeedback(reviewId, data) {
  const bvConfig = await getBVConfig();
  if (!bvConfig) {
    return {};
  }

  const {
    // eslint-disable-next-line camelcase
    api_version, locale,
  } = bvConfig.basic;

  const passKey = await getConfigValue('bv-passkey');

  const bvAPIEndpoint = await getConfigValue('bv-api-endpoint');

  // eslint-disable-next-line camelcase
  const url = `${bvAPIEndpoint}/data/submitfeedback.json?apiversion=${api_version}&passkey=${passKey}&locale=${locale}`;

  const response = await performRestSubmit(url, new URLSearchParams(data))
    .then((res) => {
      console.log('feedback response', res);

      if (res.HasErrors) {
        return { success: false, message: res.Errors[0].Message };
      }
      const reviewData = {
        reviewId,
        negativeCount: data.Vote === 'Negative' ? 1 : 0,
        positiveCount: data.Vote === 'Positive' ? 1 : 0,
        reported: data.FeedbackType === 'inappropriate',
      };

      storeReview(reviewData);

      return { success: true, message: 'Feedback submitted successfully', reviewData };
    });

  return response;
}

export async function reportReview(reviewId) {
  const data = {
    FeedbackType: 'inappropriate',
    ContentType: 'review',
    ContentId: reviewId,
  };
  return postFeedback(reviewId, data);
}

export async function postReviewHelpful(reviewId, helpful = true) {
  const data = {
    FeedbackType: 'helpfulness',
    ContentType: 'review',
    ContentId: reviewId,
    Vote: helpful ? 'Positive' : 'Negative',
  };
  return postFeedback(reviewId, data);
}

async function getUasToken(userId, email, productId) {
  const uasTokenApiEndPoint = await getConfigValue('bv-uas-api-endpoint');
  const apiMeshEndpoint = await getConfigValue('commerce-cdn-domain');

  const data = {
    userId,
    email,
    maxAge: 1,
    productId,
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${apiMeshEndpoint}${uasTokenApiEndPoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const queryResponse = await response.json();

  console.log('uas token response', queryResponse);

  return queryResponse.uasToken;
}

export async function postReview(reviewData) {
  const bvConfig = await getBVConfig();
  if (!bvConfig) {
    return {};
  }

  // remove internal key
  const photoUploadInternalKey = 'photoUploadInternal';
  if (reviewData.has(photoUploadInternalKey)) {
    reviewData.delete(photoUploadInternalKey);
  }

  reviewData.append('Action', 'submit');

  reviewData.append('fp', window.IGLOO.blackBoxString);

  // fetch uas token
  const uasToken = await getUasToken(reviewData.get('user'), reviewData.get('useremail'), reviewData.get('productid'));

  reviewData.set('user', uasToken);

  const {
    // eslint-disable-next-line camelcase
    api_version, locale,
  } = bvConfig.basic;

  const passKey = await getConfigValue('bv-passkey');

  const bvAPIEndpoint = await getConfigValue('bv-api-endpoint');

  // eslint-disable-next-line camelcase
  const url = `${bvAPIEndpoint}/data/submitreview.json?apiversion=${api_version}&passkey=${passKey}&locale=${locale}`;

  const response = await performRestSubmit(url, new URLSearchParams(reviewData))
    .then((res) => {
      const errorMessage = [];
      const errorCode = [];
      const bvConfigErrors = bvConfig?.bv_error_messages;
      const fieldError = res?.FormErrors?.FieldErrors;
      if (fieldError) {
        Object.keys(fieldError).forEach((fieldlabel) => {
          errorCode.push(fieldError?.[fieldlabel].Code);
        });
      }
      res?.Errors.forEach((error) => {
        errorCode.push(error.Code);
      });
      const uniqueErrorCode = [...new Set(errorCode)];

      Object.keys(bvConfigErrors).forEach((bverrorCode) => {
        if (uniqueErrorCode.includes(bverrorCode)) {
          errorMessage.push(bvConfigErrors[bverrorCode]);
        }
      });
      if (res.HasErrors) {
        return { success: false, message: errorMessage };
      }

      const myReview = {};
      reviewData.forEach((value, key) => {
        myReview[key] = value;
      });
      storeReview(null, myReview);

      return { success: true, message: 'Review submitted successfully', data: res };
    });

  return response;
}

export async function uploadPhoto(photoData) {
  const bvConfig = await getBVConfig();
  if (!bvConfig) {
    return {};
  }

  const {
    // eslint-disable-next-line camelcase
    api_version, locale,
  } = bvConfig.basic;

  const passKey = await getConfigValue('bv-passkey');

  const bvAPIEndpoint = await getConfigValue('bv-api-endpoint');

  const formData = new FormData();
  formData.append('photo', photoData);

  // eslint-disable-next-line camelcase
  const url = `${bvAPIEndpoint}/data/uploadphoto.json?apiversion=${api_version}&passkey=${passKey}&locale=${locale}&ContentType=review`;

  const response = await performRestSubmit(url, formData, false, false)
    .then((res) => {
      if (res.HasErrors) {
        return { success: false, message: res.Errors[0].Message };
      }

      return { success: true, message: 'Photo uploaded successfully', data: res };
    });

  return response;
}
