import {
  sampleRUM,
  createOptimizedPicture as libCreateOptimizedPicture,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  getMetadata,
  fetchPlaceholders, buildBlock,
  toClassName,
} from './aem.js';
import {
  isPDP,
  isPLP,
  loadProduct,
  setJsonLd,
  initProductViewHistory,
  getCookie,
  isOrderConfirmation,
  setCookie,
} from './commerce.js';
import { getConfigValue } from './configs.js';
import { loadGTM, sendPageLoadAttributes, clearCategoryListCache } from './analytics/google-data-layer.js';
import {
  xdmPayload,
  pageLoadData,
  EVENT_QUEUE,
  targetDisplayEvent,
} from './target-events.js';
import { getCustomer } from './customer/api.js';
import { CARTID_STORE } from './minicart/api.js';

export const LOGOUT_SOURCE = 'logout';

let STICKY_ELEMENTS;
let LAST_SCROLL_POSITION = 0;
let LAST_STACKED_HEIGHT = 0;
let DM_OPENAPI_HOSTNAME = null;
const mobileDevice = window.matchMedia('(max-width: 1024px)');
const isSidekickLibrary = document.body.classList.contains('sidekick-library');

const urlPrefix = '/';

const TEMPLATE_LIST = {
  user: 'user',
  account: 'account',
  'static-page': 'static-page',
  department: 'department',
  sustainability: 'sustainability',
  shopping: 'shopping',
  'tabbed-size-guide': 'tabbed-size-guide',
  'egift-card': 'egift-card',
};

const LCP_BLOCKS = [
  'algolia-product-listing',
  'product-list-page',
  'product-list-page-custom',
  'product-details',
  'commerce-cart',
  'commerce-checkout',
  'commerce-account',
  'commerce-login',
]; // add your LCP blocks to the list

/**
 * Check if the current environment is a mobile app by checking the cookie existence
 * @returns {boolean} true if the current environment is a mobile app
 */
export function isMobileApp() {
  return document.cookie.includes('app-view=true');
}

/**
 * Fallback for browsers that do not support Custom Properties
 * @returns {size} in vh
 */
function updateVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', updateVh);
window.addEventListener('orientationchange', updateVh);
updateVh();

/**
 * Returns the true of the current page in the browser.mac
 * If the page is running in a iframe with srcdoc,
 * the ancestor origin + the path query param is returned.
 * @returns {String} The href of the current page or the href of the block running in the library
 */
export function getHref() {
  if (window.location.href !== 'about:srcdoc') return window.location.href;

  const { location: parentLocation } = window.parent;
  const urlParams = new URLSearchParams(parentLocation.search);
  return `${parentLocation.origin}${urlParams.get('path')}`;
}

/**
 * Returns the current timestamp used for scheduling content.
 */
export function getTimestamp() {
  if ((window.location.hostname === 'localhost' || window.location.hostname.endsWith('.hlx.page') || window.location.hostname.endsWith('.aem.page')) && window.sessionStorage.getItem('preview-date')) {
    return Date.parse(window.sessionStorage.getItem('preview-date'));
  }
  return Date.now();
}

export function buildUrlKey() {
  // fetch urlkey from url
  const path = window.location.pathname;

  let urlKeys = path.split('/');
  // check if the first part of the url is a language code
  if (urlKeys.length > 2 && urlKeys[1].match(/^[a-z]{2}$/)) {
    urlKeys = urlKeys.slice(2);
  } else {
    urlKeys = urlKeys.slice(1);
  }

  const urlKey = urlKeys.join('/');

  return urlKey;
}

/**
 * Returns the document language attribute value
 * @returns String language value
 */
export function getLanguageAttr() {
  return document.documentElement?.lang || 'en';
}

/**
 * Checks if the current page is a search page.
 * @returns {boolean} Returns true if the current page is a search page, otherwise returns false.
 */
export function isSearchPage() {
  return window.location.pathname.startsWith(`/${getLanguageAttr()}/search`);
}

function expireCartInLocalStorage() {
  const cartId = window.localStorage.getItem(CARTID_STORE);
  if (cartId) {
    const parsed = JSON.parse(cartId);
    parsed.expiryTime = Date.now() - 1;
    window.localStorage.setItem(CARTID_STORE, JSON.stringify(parsed));
  }
}

export function logout(redirectUrl, source = LOGOUT_SOURCE) {
  setCookie('auth_user_token', '', -1);
  setCookie('auth_firstname', '', -1);
  const url = new URL(redirectUrl, window.location.origin);
  url.searchParams.append('source', source);
  // Clear alloy cookies related to the current org
  getConfigValue('target-org-id').then((orgId) => {
    const domain = `.${window.location.host}`;
    setCookie(`kndctr_${orgId?.replace(/@/g, '_')}_cluster`, '', -1, domain, true);
    setCookie(`kndctr_${orgId?.replace(/@/g, '_')}_identity`, '', -1, domain, true);
    window.location.href = url.toString();
  });
  // Expire the cart in local storage
  expireCartInLocalStorage();
}

async function isAuthTokenValid(token) {
  try {
    const { jwtDecode } = await import('./third-party/jwt.js');
    const decodedToken = jwtDecode(token);

    if (!decodedToken) {
      throw new Error('Invalid token structure');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp > currentTime) {
      return true;
    }
    logout(`/${getLanguageAttr()}/user/login`, window.location.href);
    return false;
  } catch (err) {
    console.error('Error occurred while decoding token:', err);
    return false;
  }
}

/**
 * Returns the log in status of the user
 * @returns {boolean} true if the user is logged in
 */
export function isLoggedInUser() {
  const authToken = getCookie('auth_user_token');
  return !!(authToken && isAuthTokenValid(authToken));
}

/**
 * Loads Scroll to Top into main
 * @param {Element} main The container element
 */
async function decorateScrollToTop(main) {
  // creating icon for scroll to top
  const spanIcon = document.createElement('span');
  spanIcon.classList.add('icon', 'icon-arrow-top');

  // creating button for scroll to top
  const button = document.createElement('button');
  button.classList.add('backtotop');
  const placeholders = await fetchPlaceholders(`${urlPrefix + document.documentElement.lang}`);
  const { backToTop } = placeholders;
  button.setAttribute('aria-label', backToTop);
  button.appendChild(spanIcon);

  // creating container for scroll to top
  const backToTopContainer = document.createElement('div');
  backToTopContainer.classList.add('scroll-to-top');
  if (window.scrollY < 100) {
    backToTopContainer.classList.add('hide');
  }
  backToTopContainer.appendChild(button);

  // dcorating icons & appending scroll to top button to main
  decorateIcons(backToTopContainer);
  main.appendChild(backToTopContainer);

  const overlayBackground = document.createElement('div');
  overlayBackground.classList.add('generic-overlay-background');
  main.appendChild(overlayBackground);

  // adding event listener to scroll to top button
  backToTopContainer.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // adding event listener to show/hide scroll to top button
  document.addEventListener('scroll', () => {
    if (window.scrollY < 100) {
      backToTopContainer.classList.add('hide');
    } else {
      backToTopContainer.classList.remove('hide');
    }
  }, { passive: true });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/*
  * Appends query params to a URL
  * @param {string} url The URL to append query params to
  * @param {object} params The query params to append
  * @returns {string} The URL with query params appended
  * @private
  * @example
  * appendQueryParams('https://example.com', { foo: 'bar' });
  * // returns 'https://example.com?foo=bar'
*/
function appendQueryParams(url, params) {
  const { searchParams } = url;
  params.forEach((value, key) => {
    searchParams.set(key, value);
  });
  url.search = searchParams.toString();
  return url.toString();
}

/**
 * to check if given src is a DM OpenAPI URL
 */
function isDMOpenAPIUrl(src) {
  return /^(https?:\/\/(.*)\/adobe\/assets\/urn:aaid:aem:(.*))/gm.test(src);
}

export function createOptimizedPicture(src, isDMOpenAPI = false, alt = '', eager = false, breakpoints = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]) {
  const isAbsoluteUrl = /^https?:\/\//i.test(src);

  // Fallback to createOptimizedPicture if src is not an absolute URL
  if (!isAbsoluteUrl) return libCreateOptimizedPicture('/icons/fallback.svg', alt, eager, breakpoints);

  const url = new URL(src);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // in case of webp format, we are defining a fallback jpg here if webp not supported by client
  // by default, first preference would be given to webp only via param preferwebp=true
  const renderformat = isDMOpenAPI ? 'jpg' : 'webply';

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    const searchParams = new URLSearchParams({ width: br.width, format: renderformat });
    source.setAttribute('srcset', appendQueryParams(url, searchParams));
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    const searchParams = new URLSearchParams({ width: br.width, format: ext });

    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', appendQueryParams(url, searchParams));
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('alt', alt);
      img.onerror = function (event) {
        event.onerror = null;
        const originalUrl = appendQueryParams(url, searchParams);
        img.setAttribute('data-original-url', originalUrl);
        const elements = Array.from(event.target.parentNode.children);
        const fallbackSrc = '/icons/fallback.svg';
        elements.forEach((element) => {
          if (element.tagName.toLowerCase() === 'source') {
            element.srcset = fallbackSrc;
          } else if (element.tagName.toLowerCase() === 'img') {
            element.classList.add('fallback');
            element.src = fallbackSrc;
          }
        });
      };
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      picture.appendChild(img);
      img.setAttribute('src', appendQueryParams(url, searchParams));
    }
  });

  return picture;
}

/**
 * Gets the cleaned up URL removing barriers to get picture src.
 * @param {string} url The URL
 * @returns {string} The normalised url
 * @private
 * @example
 * get_url_extension('https://delivery-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:a...492d81/original/as/strawberry.jpg?preferwebp=true');
 * // returns 'https://delivery-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:a...492d81/as/strawberry.jpg?preferwebp=true'
 * get_url_extension('https://delivery-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:a...492d81/as/strawberry.jpg?accept-experimental=1&preferwebp=true');
 * // returns 'https://delivery-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:a...492d81/as/strawberry.jpg?preferwebp=true'
 * get_url_extension('https://delivery-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:a...492d81/as/strawberry.jpg?width=2048&height=2048&preferwebp=true');
 * // returns 'https://delivery-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:a...492d81/as/strawberry.jpg?preferwebp=true'
 * get_url_extension('https://author-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:a...492d81/as/strawberry.jpg?accept-experimental=1&width=2048&height=2048&preferwebp=true');
 * // returns 'https://author-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:a...492d81/as/strawberry.jpg?accept-experimental=1&width=2048&height=2048&preferwebp=true'
 */
export function createOptimizedSrc(src, isDMOpenAPI = false) {
  const srcUrl = new URL(src);
  if (isDMOpenAPI) {
    srcUrl.searchParams.delete('accept-experimental');
    srcUrl.searchParams.delete('width');
    srcUrl.searchParams.delete('height');
    srcUrl.pathname = srcUrl.pathname.replace('/original/', '/');
  }
  return srcUrl.toString();
}

/**
 * Gets the extension of a URL.
 * @param {string} url The URL
 * @returns {string} The extension
 * @private
 * @example
 * get_url_extension('https://example.com/foo.jpg');
 * // returns 'jpg'
 * get_url_extension('https://example.com/foo.jpg?bar=baz');
 * // returns 'jpg'
 * get_url_extension('https://example.com/foo');
 * // returns ''
 * get_url_extension('https://example.com/foo.jpg#qux');
 * // returns 'jpg'
 */
function getUrlExtension(url) {
  return url.split(/[#?]/)[0].split('.').pop().trim();
}

function isExternalImage(element, externalImageMarker) {
  // if the element is not an anchor, it's not an external image
  if (element.tagName !== 'A') return false;

  // if the element is an anchor with the external image marker as text content,
  // it's an external image
  if (element.textContent.trim() === externalImageMarker) {
    return true;
  }

  // if the href has an image extension, it's an external image
  const ext = getUrlExtension(element.getAttribute('href'));
  return (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase()));
}

async function decorateExternalImages(ele, deliveryMarker) {
  if (!DM_OPENAPI_HOSTNAME) {
    DM_OPENAPI_HOSTNAME = (await getConfigValue('dm-openapi-domain'))?.trim();
  }
  const extImages = ele.querySelectorAll('a');
  extImages.forEach((extImage) => {
    if (isExternalImage(extImage, deliveryMarker) && !extImage.classList.contains('hide')) {
      const isDMOpenAPI = isDMOpenAPIUrl(extImage.getAttribute('href'));
      const extImageSrc = createOptimizedSrc(extImage.getAttribute('href'), isDMOpenAPI);
      const extPicture = createOptimizedPicture(extImageSrc, isDMOpenAPI);

      /* copy query params from link to img */
      const extImageUrl = new URL(extImageSrc);
      const { searchParams } = extImageUrl;
      extPicture.querySelectorAll('source, img').forEach((child) => {
        if (child.tagName === 'SOURCE') {
          const srcset = child.getAttribute('srcset');
          if (srcset) {
            const queryParams = appendQueryParams(new URL(srcset, extImageSrc), searchParams);
            child.setAttribute('srcset', queryParams);
          }
        } else if (child.tagName === 'IMG') {
          const src = child.getAttribute('src');
          if (src) {
            const queryParams = appendQueryParams(new URL(src, extImageSrc), searchParams);
            child.setAttribute('src', queryParams);
          }
        }
      });

      if (isSidekickLibrary) {
        extImage.classList.add('hide');
        extImage.setAttribute('aria-hidden', true);
        extImage.closest('p')?.classList.remove('button-container');
        extImage.parentNode.appendChild(extPicture);
      } else {
        extImage.closest('p')?.classList.remove('button-container');
        extImage.parentNode.replaceChild(extPicture, extImage);
      }
    }
  });
}

/**
 * Sets external target and rel for links in a main element.
 * @param {Element} main The main element
 */
function updateExternalLinks(main) {
  const REFERERS = [
    window.location.origin,
  ];
  main.querySelectorAll('a[href]').forEach((a) => {
    try {
      const { origin, pathname, hash } = new URL(a.href, window.location.href);
      const targetHash = hash && hash.startsWith('#_');
      const isPDF = pathname.split('.').pop() === 'pdf';
      if ((origin && origin !== window.location.origin && !targetHash) || isPDF) {
        a.setAttribute('target', '_blank');
        if (!REFERERS.includes(origin)) a.setAttribute('rel', 'noopener');
      } else if (targetHash) {
        a.setAttribute('target', hash.replace('#', ''));
        a.href = a.href.replace(hash, '');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Invalid link in ${main}: ${a.href}`);
    }
  });
}

/**
 * Calls placeholders for a current document language
 * @returns placeholders for the language
 */
export async function fetchPlaceholdersForLocale() {
  const langCode = document.documentElement.lang;
  let placeholders = null;
  if (!langCode) {
    placeholders = await fetchPlaceholders();
  } else {
    placeholders = await fetchPlaceholders(`/${langCode.toLowerCase()}`);
  }

  return placeholders;
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
async function buildAutoBlocks(main) {
  try {
    const templateMetadata = getMetadata('template');
    const templates = templateMetadata?.split(',').map((template) => toClassName(template.trim())) || [];
    const availableTemplates = Object.keys(TEMPLATE_LIST);
    templates.forEach(async (template) => {
      if (availableTemplates.includes(template)) {
        const templateName = TEMPLATE_LIST[template];
        const decorator = await Promise.all([
          import(`../templates/${templateName}/${templateName}.js`),
          loadCSS(`${window.hlx.codeBasePath}/templates/${templateName}/${templateName}.css`),
        ]).then(([mod]) => mod.default);
        if (decorator) {
          await decorator(main);
        }
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates target specific blocks like recommendations and personalization.
 * Read the metadata required for target from the block and set them as data attributes.
 * @param {Element} main The main element
 */
function decorateTargetBlocks(main) {
  main.querySelectorAll(
    'div.section > div > div.recommendations, div.section > div > div.personalization',
  )?.forEach((block) => {
    block.querySelectorAll(':scope > div').forEach((row) => {
      const key = row.children[0]?.innerText;
      let value;
      if (block.classList.contains('tab')) {
        value = row.querySelector('a')?.getAttribute('href');
      } else {
        value = row.children[1]?.innerText;
      }
      block.dataset[key] = value || '';
      block.innerHTML = '';
    });
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // decorate external images with explicit external image marker
  decorateExternalImages(main, '//External Image//');

  // decorate external images with implicit external image marker
  decorateExternalImages(main);

  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateTargetBlocks(main);
  updateExternalLinks(main);
}

const REGEX_PLACEHOLDER = /\{\{([A-Za-z\-0-9]+)\}\}/ig;
function findAllPlaceholders(str) {
  return [...str.matchAll(REGEX_PLACEHOLDER)];
}

function replacePlaceholdersInString(str, placeholders) {
  return str.replace(REGEX_PLACEHOLDER, (match, p1) => placeholders[p1] || match);
}

export function replacePlaceholders(element, placeholders) {
  element.querySelectorAll('p, li, h2, h3, h4, h5, h6').forEach((node) => {
    const { innerHTML } = node;
    const placeholderKeys = findAllPlaceholders(innerHTML);
    if (!placeholderKeys.length) {
      return;
    }
    const newInnerHTML = replacePlaceholdersInString(innerHTML, placeholders);
    node.innerHTML = newInnerHTML;
  });
}

function buildCommerceBlocks(main) {
  const isDynamicPage = main.closest('html')?.querySelector('meta[name="dynamic-routing"][content="true"]');
  if (!isDynamicPage) {
    return;
  }
  const isPdp = window.location.pathname.split('/').at(-1).startsWith('buy-');
  let block;
  if (isPdp) {
    block = buildBlock('product-details', []);
  } else {
    block = buildBlock('algolia-product-listing', []);
    const hidePlpSidebar = getMetadata('hide-plp-sidebar');
    if (hidePlpSidebar !== 'true') {
      const aside = document.createElement('aside');
      aside.classList.add('sidebar-plp');
      const asideDiv = document.createElement('div');
      const mainWrapper = document.createElement('div');
      mainWrapper.classList.add('main-wrapper');
      main.parentNode.insertBefore(mainWrapper, main);
      mainWrapper.appendChild(aside);
      mainWrapper.appendChild(main);
      aside.appendChild(asideDiv);
      main.classList.add('sidebar-main');
      const sidebarBlock = buildBlock('sidebar', []);
      sidebarBlock.classList.add('dynamic', 'start-level-1');
      asideDiv.append(sidebarBlock);
      decorateMain(aside);

      main.querySelector('div').append(block);
    }
  }
  main.querySelector('div').append(block);
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const mainDiv = document.createElement('div');
      mainDiv.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        mainDiv.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(mainDiv);
      mainDiv.querySelector(':scope > div')?.setAttribute('data-path', path);
      await loadBlocks(mainDiv);
      const placeholders = await fetchPlaceholdersForLocale();
      replacePlaceholders(mainDiv, placeholders);
      return mainDiv;
    }
  }
  return null;
}

// eslint-disable-next-line max-len
export async function createModal(id, title, content, classList, titleIconClass, appendAsHTML = false, closeIcon = 'icon-close', callback = false) {
  const { close } = await fetchPlaceholdersForLocale();

  const dialog = document.createElement('dialog');
  if (classList) dialog.classList.add(...classList);
  const dialogTitle = document.createElement('div');
  dialogTitle.classList.add('modal-header');
  const titleIconClassValue = titleIconClass ? `icon icon-${titleIconClass} icon-title-left` : '';
  dialogTitle.innerHTML = `<span class="${titleIconClassValue}"></span><h4>${title}</h4`;
  const closeButton = document.createElement('button');
  closeButton.classList.add('modal-close');
  closeButton.setAttribute('aria-label', close);
  closeButton.type = 'button';
  closeButton.innerHTML = `<span class="icon ${closeIcon}"></span>`;
  closeButton.addEventListener('click', () => {
    dialog.close();

    if (callback) {
      callback();
    }
  });
  dialogTitle.append(closeButton);
  dialog.append(dialogTitle);

  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  if (appendAsHTML) {
    dialogContent.append(content);
    dialog.append(dialogContent);
  } else {
    dialogContent.innerHTML = content;
    dialog.append(dialogContent);
  }

  // close dialog on clicks outside the dialog.
  dialog.addEventListener('click', (event) => {
    const stickyActionFooter = document.querySelector('.pdp-product__actions.button-bar-wishlist');
    const dialogDimensions = dialog.getBoundingClientRect();
    const stickyActionFooterDimensions = stickyActionFooter?.getBoundingClientRect();
    const stickyActionFooterDimensionCheck = event.clientY >= stickyActionFooterDimensions?.top
    && event.clientY <= stickyActionFooterDimensions?.bottom
    && event.clientX >= stickyActionFooterDimensions?.left
    && event.clientX <= stickyActionFooterDimensions?.right;
    if (
      (event.clientX < dialogDimensions.left
      || event.clientX > dialogDimensions.right
      || event.clientY < dialogDimensions.top
      || event.clientY > dialogDimensions.bottom
      ) && !stickyActionFooterDimensionCheck) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));

  const modalBlock = document.createElement('div');
  modalBlock.id = id;
  modalBlock.classList.add('modal');
  if (document.querySelector(`#${id}`)) {
    document.querySelector(`#${id}`).remove();
  }
  document.querySelector('main').append(modalBlock);
  modalBlock.append(dialog);
  decorateIcons(dialogTitle);
}

export async function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.querySelector('dialog').showModal();
    setTimeout(() => {
      modal.querySelector('.modal-content').scrollTop = 0;
    }, 0);
    document.body.classList.add('modal-open');
  }
}

export async function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
    document.body.classList.remove('modal-open');
  }
}

/**
 * Method to create and open modal when content needs to be fetched from fragment URL
 * @param {*} title Modal title
 * @param {*} fragmentUrl Modal Content fragment URL
 * @param {*} classList Optional. Custom class to add on modal
 */
export async function createModalFromFragment(id, title, fragmentUrl, classList) {
  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;

  const fragment = await loadFragment(path);
  await createModal(id, title, fragment.childNodes, classList);
}

/**
 * Method to create and open modal when content is passed as HTML or text directly
 * @param {*} title Modal title
 * @param {*} content Modal content HTML/text sring
 * @param {*} classList Optional. Custom class to add on modal
 */
// eslint-disable-next-line max-len
export async function createModalFromContent(id, title, content, classList, titleIconClass, appendAsHTML = false, closeIcon = 'icon-close', callback = false) {
  await createModal(
    id,
    title,
    content,
    classList,
    titleIconClass,
    appendAsHTML,
    closeIcon,
    callback,
  );
}

const renderGraphData = async () => {
  const gaOrgName = await getConfigValue('ga-graph-org-name');
  const gaOrglogo = await getConfigValue('ga-graph-org-logo');
  const gaOrgUrl = await getConfigValue('ga-graph-org-url');
  const gaOrgSameAs = await getConfigValue('ga-graph-org-same-as');
  const gaContactTelephone = await getConfigValue('ga-graph-contact-telephone');
  const gaContactType = await getConfigValue('ga-graph-contact-type');
  const gaContactArea = await getConfigValue('ga-graph-contact-area');
  const gaContactOption = await getConfigValue('ga-graph-contact-option');
  const gaContactLanguages = await getConfigValue('ga-graph-contact-language');
  const gaSitelinkUrlTemplate = await getConfigValue('ga-sitelink-url-template');
  const lang = getLanguageAttr();

  const gaGraphData = {
    '@context': 'http://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: gaOrgName,
        logo: gaOrglogo,
        url: gaOrgUrl,
        sameAs: gaOrgSameAs,
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: gaContactTelephone,
            contactType: gaContactType,
            areaServed: gaContactArea,
            contactOption: gaContactOption,
            availableLanguage: [gaContactLanguages],
          },
        ],
      },
      {
        '@type': 'WebSite',
        url: gaOrgUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${gaSitelinkUrlTemplate}${lang}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  setJsonLd(gaGraphData, 'ga-graph');
};

function initWebSDK(path, config) {
  // Preparing the alloy queue
  if (!window.alloy) {
    // eslint-disable-next-line no-underscore-dangle
    (window.__alloyNS ||= []).push('alloy');
    window.alloy = (...args) => new Promise((resolve, reject) => {
      window.setTimeout(() => {
        window.alloy.q.push([resolve, reject, args]);
      });
    });
    window.alloy.q = [];
  }
  // Loading and configuring the websdk
  return new Promise((resolve) => {
    import(path)
      .then(() => window.alloy('configure', config))
      .then(resolve);
  });
}

function onDecoratedElement(fn) {
  // Apply propositions to all already decorated blocks/sections
  if (document.querySelector('[data-block-status="loaded"],[data-section-status="loaded"]')) {
    fn();
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.target.tagName === 'BODY'
      || m.target.dataset.sectionStatus === 'loaded'
      || m.target.dataset.blockStatus === 'loaded')) {
      fn();
    }
    if (mutations.some((m) => (m.target.dataset.blockName === 'recommendations'
      || m.target.dataset.blockName === 'personalization')
      && m.target.dataset.blockStatus === 'loaded')) {
      window.dispatchEvent(new CustomEvent('target-response'));
    }
  });
  // Watch sections and blocks being decorated async
  observer.observe(document.querySelector('main'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-block-status', 'data-section-status'],
  });
  // Watch anything else added to the body
  observer.observe(document.querySelector('body'), { childList: true });
}

export async function getAndApplyRenderDecisions(
  payload,
  decisionScopes = ['__view__'],
  displayEvent = true,
  noDisplayScopes = [],
  xdmCustomPayload = {},
) {
  // Get the decisions, but don't render them automatically
  // so we can hook up into the AEM EDS page load sequence
  const xdm = await xdmPayload(xdmCustomPayload);
  const options = {
    type: 'decisioning.propositionFetch',
    renderDecisions: true,
    data: {
      __adobe: {
        target: payload,
      },
    },
    xdm: {
      ...xdm,
      ...xdmCustomPayload,
    },
    decisionScopes: [...decisionScopes, ...noDisplayScopes],
  };
  const { propositions } = await window.alloy('sendEvent', options);
  const customPropositions = propositions?.filter((p) => p.scope !== '__view__');
  customPropositions?.forEach(({ scope, items, ...rest }) => {
    EVENT_QUEUE.push({
      key: scope,
      data: items || [],
      ...rest,
    });
  });
  onDecoratedElement(async () => {
    await window.alloy('applyPropositions', { propositions });
  });

  if (!displayEvent) return;
  // Reporting is deferred to avoid long tasks
  window.setTimeout(() => {
    targetDisplayEvent(customPropositions, noDisplayScopes);
  });
}

export async function fetchData(url) {
  const resp = await fetch(url);
  return resp?.text();
}

async function getTargetBlocksMetadata() {
  const scopes = ['__view__'];
  const tabScopes = [];
  const fetchPromises = [];
  document.querySelectorAll(
    'div.recommendations, div.personalization',
  )?.forEach((el) => {
    if (el.dataset.tabUrl) {
      fetchPromises.push(fetchData(`${el.dataset.tabUrl}.plain.html`));
    } else {
      scopes.push(el.dataset.targetId);
    }
  });
  try {
    const responses = await Promise.all(fetchPromises);
    responses?.forEach((content) => {
      const fragment = document.createRange().createContextualFragment(content);
      fragment?.querySelectorAll('div.tabs > div')?.forEach((category) => {
        tabScopes.push(category.children[1]?.textContent.trim());
      });
    });
  } catch (error) {
    console.error('Error fetching tabbed recommendations metadata', error);
  }
  return { scopes, tabScopes };
}

const alloyLoadedPromise = (datastreamId, orgId) => initWebSDK('./alloy.js', {
  datastreamId,
  orgId,
  clickCollectionEnabled: false,
  idMigrationEnabled: false,
  thirdPartyCookiesEnabled: false,
});

export async function fireTargetCall(
  payload,
  decisionScopes = [],
  fullPage = true,
  customXdmPayload = {},
) {
  let scopes = [];
  let tabScopes = [];
  if (!getMetadata('target') || !window.alloy) {
    return Promise.resolve();
  }
  if (fullPage) {
    ({ scopes, tabScopes } = await getTargetBlocksMetadata());
  }
  return getAndApplyRenderDecisions(
    payload,
    [...scopes, ...decisionScopes],
    true,
    tabScopes,
    customXdmPayload,
  );
}

/**
 * Method to load Alloy JS and fire target call on page load
 * for all pages except for PDP and PLP
 */
async function loadAlloy() {
  const [orgId, datastreamId] = await Promise.all([
    getConfigValue('target-org-id'),
    getConfigValue('aep-datastream-id'),
  ]);
  if (!(orgId && datastreamId)) return;
  await alloyLoadedPromise(datastreamId, orgId);
  if (!(isPDP() || isPLP() || isOrderConfirmation())) {
    const targetPayload = await pageLoadData();
    await fireTargetCall(targetPayload);
  }
}

async function handlePageType() {
  let pageType = getMetadata('page-type');
  if (isSearchPage()) {
    pageType = 'search listing page';
  } else if (isPDP()) {
    pageType = 'product detail page';
    window.product = loadProduct();
  } else if (isPLP()) {
    pageType = 'product listing page';
  }
  if (pageType === 'home page') {
    clearCategoryListCache();
  }
  window.pageType = pageType || 'static page';
  await sendPageLoadAttributes();
}

async function decorateMetaTitle() {
  const pageTitle = document.title;

  fetchPlaceholdersForLocale().then((placeholders) => {
    const titleSuffix = placeholders.pageTitleSuffix || '';
    const metaTitle = document.querySelector('title');
    const lang = getLanguageAttr();
    if (lang === 'ar') {
      metaTitle.innerText = titleSuffix ? `${titleSuffix} | ${pageTitle}` : pageTitle;
    } else {
      metaTitle.innerText = titleSuffix ? `${pageTitle} | ${titleSuffix}` : pageTitle;
    }
  });
}

async function loadBreadcrumb(breadcrumbWrapper) {
  if (breadcrumbWrapper) {
    const decorator = await Promise.all([
      import(`${window.hlx.codeBasePath}/blocks/breadcrumb/breadcrumb.js`),
      loadCSS(`${window.hlx.codeBasePath}/blocks/breadcrumb/breadcrumb.css`),
    ]).then(([mod]) => mod.default);
    if (decorator) {
      await decorator(breadcrumbWrapper);
    }
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  // set language and direction
  document.documentElement.lang = 'en';
  const path = getHref();
  // temporary fix for arabic
  if (path.includes('/ar/')) {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }

  if (isMobileApp()) {
    document.querySelector('header').remove();
    document.querySelector('footer').remove();
  }

  const isDesktop = window.matchMedia('(min-width: 1025px)');
  // handle header height if breadcrumbs are enabled
  if (isDesktop && getMetadata('no-breadcrumb').toLowerCase() !== 'true') {
    const breadcrumb = document.createElement('div');
    breadcrumb.classList.add('breadcrumb-wrapper');
    document.querySelector('header')?.after(breadcrumb);
  }

  if (getMetadata('show-breadcrumb-mobile').toLowerCase() === 'true') {
    document.querySelector('body').classList.add('show-breadcrumb-mobile');
  }

  if (isDesktop && document.querySelector('.sidebar')) {
    document.querySelector('main').classList.add('sidebar-main');
  }

  decorateMetaTitle();

  decorateTemplateAndTheme();

  window.adobeDataLayer = window.adobeDataLayer || [];
  window.dataLayer = window.dataLayer || [];

  const main = doc.querySelector('main');
  if (main) {
    buildCommerceBlocks(main);
    buildAutoBlocks(main);
    decorateMain(main);
    await handlePageType();
    document.body.classList.add('appear');
    await Promise.all([
      getConfigValue('alloy-enabled').then(async (alloyEnabled) => {
        if (alloyEnabled !== 'false') {
          await loadAlloy();
        }
      }),
      new Promise((res) => {
        window.requestAnimationFrame(async () => {
          await waitForLCP(LCP_BLOCKS);
          res();
        });
      }),
    ]);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Add sticky elements to the constant
 */
function getStickyElements() {
  if (mobileDevice.matches) {
    STICKY_ELEMENTS = document.querySelectorAll('.sticky-element.sticky-mobile');
  } else {
    STICKY_ELEMENTS = document.querySelectorAll('.sticky-element.sticky-desktop');
  }
}

/**
 * Enable sticky components
 *
 */
export function enableStickyElements() {
  getStickyElements();
  mobileDevice.addEventListener('change', getStickyElements);

  const offsets = [];

  STICKY_ELEMENTS.forEach((element, index) => {
    offsets[index] = element.offsetTop;
  });

  window.addEventListener('scroll', () => {
    const currentScrollPosition = window.pageYOffset;
    let stackedHeight = 0;
    STICKY_ELEMENTS.forEach((element, index) => {
      if (currentScrollPosition > offsets[index] - stackedHeight) {
        element.classList.add('sticky');
        element.style.top = `${stackedHeight}px`;
        stackedHeight += element.offsetHeight;
      } else {
        element.classList.remove('sticky');
        element.style.top = '';
      }

      if (currentScrollPosition < LAST_SCROLL_POSITION && currentScrollPosition <= offsets[index]) {
        element.style.top = `${Math.max(offsets[index] - currentScrollPosition, stackedHeight - element.offsetHeight)}px`;
      } else {
        element.style.top = `${stackedHeight - element.offsetHeight}px`;
      }
    });

    LAST_SCROLL_POSITION = currentScrollPosition;
    if (stackedHeight !== LAST_STACKED_HEIGHT) {
      LAST_STACKED_HEIGHT = stackedHeight;
      document.querySelector(':root').style.setProperty('--stacked-height', `${stackedHeight}px`);
    }
  });
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await Promise.all([
    loadBlocks(main),
    loadGTM(isMobileApp()), // Load Google Tag Manager
  ]);
  window.dispatchEvent(new Event('lazy-loaded'));

  const aside = doc.querySelector('aside');
  if (aside) {
    await loadBlocks(aside);
  }
  

  loadBreadcrumb(doc.querySelector('.breadcrumb-wrapper'));

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  if (!isMobileApp()) {
    loadHeader(doc.querySelector('header'));
    loadFooter(doc.querySelector('footer'));
  }

  renderGraphData();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  await initProductViewHistory();
  await import('./acdl/adobe-client-data-layer.min.js');
  if (sessionStorage.getItem('acdl:debug')) {
    import('./acdl/validate.js');
  }

  decorateScrollToTop(main);

  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

export async function fetchIndex(indexFile, lang = '', hasGlobal = false, pageSize = 500) {
  const handleIndex = async (offset) => {
    const resp = await fetch(`/${lang}${indexFile}.json?limit=${pageSize}&offset=${offset}`);
    const json = await resp.json();

    const newIndex = {
      complete: (json.limit + json.offset) === json.total,
      offset: json.offset + pageSize,
      promise: null,
      data: [...window.index[indexFile].data, ...json.data],
    };

    return newIndex;
  };

  const handleGlobalIndex = async (offset) => {
    const respGlobalPromise = fetch(`/${lang}global-${indexFile}.json?limit=${pageSize}&offset=${offset}`);
    const respPromise = fetch(`/${lang}${indexFile}.json?limit=${pageSize}&offset=${offset}`);

    const [respGlobal, resp] = await Promise.all([respGlobalPromise, respPromise]);

    let newIndex;
    let newIndexLocal;

    if (respGlobal.ok) {
      const jsonGlobal = await respGlobal?.json();
      newIndex = {
        complete: (jsonGlobal.limit + jsonGlobal.offset) === jsonGlobal.total,
        offset: jsonGlobal.offset + pageSize,
        promise: null,
        data: [...window.index[indexFile].data, ...jsonGlobal.data],
      };
    }

    if (resp.ok) {
      const json = await resp?.json();
      newIndexLocal = {
        complete: (json.limit + json.offset) === json.total,
        offset: json.offset + pageSize,
        promise: null,
        data: [...window.index[indexFile].data, ...json.data],
      };
    }

    if (!newIndex && !newIndexLocal) {
      return window.index[indexFile];
    }

    if (!newIndex) {
      return newIndexLocal;
    }

    if (!newIndexLocal) {
      return newIndex;
    }

    // Merge global and local index
    newIndex.data = [...newIndex.data, ...newIndexLocal.data];

    return newIndex;
  };

  window.index = window.index || {};
  window.index[indexFile] = window.index[indexFile] || {
    data: [],
    offset: 0,
    complete: false,
    promise: null,
  };

  // Return index if already loaded
  if (window.index[indexFile].complete) {
    return window.index[indexFile];
  }

  // Return promise if index is currently loading
  if (window.index[indexFile].promise) {
    return window.index[indexFile].promise;
  }

  if (hasGlobal) {
    window.index[indexFile].promise = handleGlobalIndex(window.index[indexFile].offset);
  } else {
    window.index[indexFile].promise = handleIndex(window.index[indexFile].offset);
  }
  const newIndex = await (window.index[indexFile].promise);
  window.index[indexFile] = newIndex;

  return newIndex;
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  if (!new URLSearchParams(window.location.search).get('skip-delayed')) {
    loadDelayed();
  }
}

export function showToastNotification(message, showTick = true) {
  const toastDiv = document.createElement('div');
  toastDiv.className = 'toast-notification';

  const isHeaderVisible = () => {
    const item = document.querySelector('header').getBoundingClientRect();
    return (
      item.top >= 0
      && item.left >= 0
      && item.bottom <= (
        window.innerHeight
        || document.documentElement.clientHeight)
      && item.right <= (
        window.innerWidth
        || document.documentElement.clientWidth)
    );
  };

  if (!isHeaderVisible()) {
    toastDiv.classList.add('toast-notification-top');
  }

  const tickDiv = document.createElement('div');
  tickDiv.className = 'toast-tick';

  const tickIcon = document.createElement('span');
  tickIcon.classList.add('icon', 'icon-tick');
  tickDiv.appendChild(tickIcon);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'toast-content';

  const messageDiv = document.createElement('div');
  messageDiv.className = 'toast-message';
  messageDiv.textContent = message;

  if (showTick) {
    contentDiv.appendChild(tickDiv);
  }
  contentDiv.appendChild(messageDiv);

  const closeDiv = document.createElement('div');
  closeDiv.className = 'toast-close';

  const closeIcon = document.createElement('span');
  closeIcon.classList.add('icon', 'icon-close-small');
  closeDiv.appendChild(closeIcon);

  toastDiv.appendChild(contentDiv);
  toastDiv.appendChild(closeDiv);

  decorateIcons(toastDiv);

  closeDiv.addEventListener('click', (e) => {
    e.target.closest('.toast-notification').remove();
  });

  document.body.appendChild(toastDiv);

  setTimeout(() => {
    toastDiv.remove();
  }, 5000);
}

/**
 * Makes post request with JSON data
 *
 * @param url
 * @param data
 * @returns {Promise<{}|any>}
 */
export async function postJSON(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    // this function is temporary and will be replaced with API Mesh
  }
  return {};
}

/**
 * Adds/updates meta attribute in the head
 * @param {name} name of the meta tag
 * @param {content} content of the meta tag
 * @param {metaField} metaField to insert the meta tag after
 * @param {isProperty} isProperty true if the meta tag is a property
 * @returns meta tag
 */
export function setMetaAttribute(name, content, metaField, isProperty = false) {
  let meta = isProperty ? document.querySelector(`meta[property="${name}"]`) : document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(`${isProperty ? 'property' : 'name'}`, name);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  } else {
    meta.setAttribute('content', content);
  }
  metaField.after(meta);
  return meta;
}

async function getCountryCode() {
  return getConfigValue('country-code').then((value) => value || 'AE');
}

export async function getLocale() {
  const countryCode = await getCountryCode();
  return `${(document.documentElement.lang || 'en').toLowerCase()}_${countryCode.toUpperCase()}`;
}

export async function getCurrencyFormatter(currencyCode) {
  let currency = currencyCode || '';
  const decimalDigits = await getConfigValue('cart-price-decimals');
  if (!currency) {
    currency = await getConfigValue('currency') || 'AED';
  }
  const countryCode = await getConfigValue('country-code') || 'AE';

  return new Intl.NumberFormat(`${document.documentElement.lang || 'en'}-${countryCode}`, {
    style: 'currency',
    currency,
    minimumFractionDigits: parseInt(decimalDigits, 10) || 2,
  });
}

/**
 * Formats date string to locale date format
 * @param {dateString} dateString Date string to format
 * @param {*} locale Locale to format the date
 * @returns formatted date string
 */
export function formatDate(dateString, locale, options = { year: 'numeric', month: 'long', day: '2-digit' }) {
  let newLocale = locale;
  if (locale?.includes('_')) {
    newLocale = locale.replaceAll('_', '-');
  }
  const date = new Date(dateString);
  return date.toLocaleDateString(newLocale, options);
}

export async function formatDateToCurrentLocale(date, options) {
  if (!date) {
    return '';
  }
  const countryCode = await getConfigValue('country-code') || 'AE';

  return formatDate(date, `${document.documentElement.lang || 'en'}-${countryCode}`, options);
}

/**
 * Formats price to locale currency format
 * @param {currency} currency Currency code
 * @param {price} price Price to format
 * @returns formatted price string
 */
export async function formatPrice(currency, price) {
  const currentFormatter = await getCurrencyFormatter(currency);

  const newPrice = parseFloat(price);

  return currentFormatter.format(newPrice);
}

export async function showCommerceErrorPage(code = 404) {
  window.pageType = 'page-not-found';
  const [errorBlock, targetPayload] = await Promise.all([
    loadFragment(`/${document.documentElement.lang}/fragments/${code}`),
    pageLoadData(),
  ]);
  document.querySelector('main').appendChild(errorBlock);
  document.querySelector('.fullscreen-loader')?.classList.remove('active');
  document.querySelector('.algolia-product-listing-container')?.classList.add('hidden');
  await fireTargetCall(targetPayload);
  window.dispatchEvent(new CustomEvent('target-response'));
}

export function getPreviewPreaccessType(previewPreaccessData, lang) {
  if (!previewPreaccessData || typeof previewPreaccessData !== 'object') {
    return { type: null, pdpText: null };
  }
  const currentDateUTC = new Date().toISOString();
  const extractPdpText = (pdpText) => (typeof pdpText === 'object' ? pdpText[lang] : pdpText || null);

  const toISODate = (dateStr) => (dateStr ? new Date(dateStr.replace(' ', 'T')).toISOString() : null);

  if (previewPreaccessData.preaccess_sd && previewPreaccessData.preaccess_ed
    && currentDateUTC >= toISODate(previewPreaccessData.preaccess_sd)
    && currentDateUTC <= toISODate(previewPreaccessData.preaccess_ed)) {
    return {
      type: 'pre-access',
      pdpText: extractPdpText(previewPreaccessData.preaccess_pdp_text),
    };
  }

  if (previewPreaccessData.preview_sd && previewPreaccessData.preview_ed
    && currentDateUTC >= toISODate(previewPreaccessData.preview_sd)
    && currentDateUTC <= toISODate(previewPreaccessData.preview_ed)) {
    return {
      type: 'preview',
      pdpText: extractPdpText(previewPreaccessData.preview_pdp_text),
    };
  }

  return { type: null, pdpText: null };
}

export async function getCustomerTier() {
  try {
    const custResponse = await getCustomer();

    if (custResponse?.custom_attributes) {
      const tierAttribute = custResponse.custom_attributes.find((attribute) => attribute.attribute_code === 'tier_name');
      if (tierAttribute?.value) {
        return tierAttribute.value;
      }
    }
    return 'all';
  } catch (error) {
    return 'all';
  }
}

export async function getVisitorEligibility(previewPreaccessData, lang) {
  try {
    if (!previewPreaccessData || typeof previewPreaccessData !== 'object') {
      throw new Error('Invalid or null previewPreaccessData object');
    }
    const typeInfo = getPreviewPreaccessType(previewPreaccessData, lang);

    if (!typeInfo.type) {
      return { type: null, isVisitorEligible: true, pdpText: null };
    }

    const visitorTier = await getCustomerTier();
    let isVisitorEligible = false;

    const tierType = typeInfo.type === 'pre-access'
      ? previewPreaccessData.preaccess_tier_type
      : previewPreaccessData.preview_tier_type;

    if (tierType) {
      if (tierType.includes('all')) {
        isVisitorEligible = true;
      } else if (tierType.includes('member')) {
        // Rule 2: If tierType includes "member", visitors with "member" or "plus" are eligible,
        // but not "all"
        isVisitorEligible = visitorTier === 'member' || visitorTier === 'plus';
      } else if (tierType.includes('plus')) {
        // Rule 3: If tierType includes "plus", only visitors with "plus" are eligible
        isVisitorEligible = visitorTier === 'plus';
      }
    }

    return {
      type: typeInfo.type,
      isVisitorEligible,
      pdpText: typeInfo.pdpText,
      visitorTier,
    };
  } catch (error) {
    return {
      type: null, isVisitorEligible: false, pdpText: null, visitorTier: null,
    };
  }
}

export async function getRedirectUrl(isVisitorEligible, visitorTier, language) {
  const userLoginUrl = '/user/login';
  const membershipUrl = '/membership-info';

  const localizedLoginUrl = `/${language}${userLoginUrl}`;
  const localizedMembershipUrl = `/${language}${membershipUrl}`;

  if (!isVisitorEligible) {
    if (visitorTier === 'all') {
      return localizedLoginUrl;
    } if (visitorTier === 'member') {
      return localizedMembershipUrl;
    }
  }

  return null;
}

export function redirectRegisterURL(block, selector) {
  if (isLoggedInUser()) {
    block.querySelectorAll(selector).forEach((aLink) => {
      if (aLink.href.endsWith('/user/register')) {
        aLink.href = aLink.href.replace('/user/register', '/user/account');
      }
    });
  }
}

// Check

(() => {
  if (!window.location.pathname?.includes('/checkout')) sessionStorage.removeItem('digital-cart-id');
})();

loadPage();
