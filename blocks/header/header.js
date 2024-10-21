import { getMetadata } from '../../scripts/aem.js';
import {
  loadFragment,
  fetchPlaceholdersForLocale,
  getCurrencyFormatter,
  isLoggedInUser,
  isSearchPage,
  logout,
} from '../../scripts/scripts.js';
import {
  datalayerHeaderNavigationEvent,
  datalayerMobileHamburgerEvent,
  datalayerLanguageSwitchEvent,
  dataLayerTrendingSearchEvent,
} from '../../scripts/analytics/google-data-layer.js';
import { cartApi } from '../../scripts/minicart/api.js';
import { fetchCommerceCategories, getSignInToken } from '../../scripts/commerce.js';
import { getWelcomeMessage } from '../../templates/account/account.js';
import { getProductSuggestions, getSearchSuggestions } from '../../scripts/product-list/api.js';
import { getConfigValue } from '../../scripts/configs.js';
import { getPromotionsData } from '../../scripts/promotions/api.js';
import { getCart } from '../../scripts/minicart/cart.js';

const lang = document.documentElement.lang || 'en';

function highlightSearchTerm(text, searchTerm) {
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<b>$1</b>');
}

const isMobileDevice = () => window.innerWidth <= 1024;

async function buildQuerySuggestions(searchTerm, placeholders = {}) {
  const querySuggestions = document.createElement('div');
  querySuggestions.classList.add('query-suggestions');
  const suggestions = await getSearchSuggestions(searchTerm);
  if (suggestions.length > 0) {
    if (!searchTerm) {
      const querySuggestionsTitle = document.createElement('h5');
      querySuggestionsTitle.textContent = placeholders.trendingSearches || 'Trending Searches';
      querySuggestions.append(querySuggestionsTitle);
    }
    const querySuggestionList = document.createElement('ul');
    suggestions.forEach((suggestion) => {
      const searchQuery = suggestion.query;
      const highlightedQuery = highlightSearchTerm(searchQuery, searchTerm);
      const li = document.createElement('li');
      li.innerHTML = `<a href="/${lang}/search?q=${searchQuery}">${highlightedQuery}</a>`;
      querySuggestionList.append(li);
    });
    querySuggestions.append(querySuggestionList);
  }
  return querySuggestions;
}

async function buildProductSuggestions(searchTerm, placeholders = {}) {
  const productSuggestions = document.createElement('div');
  productSuggestions.classList.add('product-suggestions');
  if (!searchTerm) {
    return productSuggestions;
  }
  const suggestions = await getProductSuggestions(searchTerm);
  const productSuggestionsTitle = document.createElement('h5');
  productSuggestions.append(productSuggestionsTitle);
  if (suggestions.length > 0) {
    productSuggestionsTitle.textContent = placeholders.topSuggestions || 'Top Suggestions';
    const productSuggestionsList = document.createElement('ul');
    suggestions.forEach((suggestion) => {
      const productItem = document.createElement('li');
      const productUrl = suggestion.url.replace('.html', '');
      productItem.innerHTML = `
        <a href="${productUrl}">
          <div class="product-suggestion">
            <div class="product-suggestion-image">
              <img src="${suggestion.media[0]?.url}" alt="${suggestion.title}">
            </div>
            <div class="product-suggestion-details">
              <div class="product-suggestion-name">${suggestion.title}</div>
              <div class="product-suggestion-price ${suggestion.discount > 0 ? 'strikethrough' : ''}">
                ${placeholders.plpDefaultCurrency} <strong>${suggestion.original_price}</strong>
              </div>
            </div>
          </div>
        </a>
      `;
      const suggestionDetails = productItem.querySelector('.product-suggestion-details');
      if (suggestion.discount) {
        const discountedPriceHTML = `${placeholders.plpDefaultCurrency} ${suggestion.final_price} (${placeholders.plpSave || 'Save'} ${suggestion.discount}%)`;
        suggestionDetails.innerHTML += `<div class="product-suggestion-discount">${discountedPriceHTML}</div>`;
      }
      suggestion.promotions.forEach((promotion) => {
        if (promotion.context.includes('web')) {
          suggestionDetails.innerHTML += `<div class="product-suggestion-promotion">${promotion.text}</div>`;
        }
      });
      productSuggestionsList.append(productItem);
    });
    productSuggestions.append(productSuggestionsList);
  } else {
    productSuggestionsTitle.textContent = placeholders.noSuggestions || 'No suggestions found';
  }
  return productSuggestions;
}

async function updateSearchSuggestions(searchInput, placeholders = {}) {
  const searchTerm = searchInput.value?.trim().toLowerCase() || '';
  const searchContainer = searchInput.closest('.search-container');
  const searchSuggestionsContainer = document.createElement('div');
  searchSuggestionsContainer.classList.add('search-suggestions');
  const querySuggestions = await buildQuerySuggestions(searchTerm, placeholders);
  const productSuggestions = await buildProductSuggestions(searchTerm, placeholders);
  searchSuggestionsContainer.append(querySuggestions);
  searchSuggestionsContainer.append(productSuggestions);
  searchContainer.querySelector('.search-suggestions').replaceWith(searchSuggestionsContainer);
}

// to hide close icon if search input is empty
function toggleCloseIcon(searchInput) {
  const closeIcon = searchInput.closest('.search-field').querySelector('.search-close-icon');
  if (searchInput.value?.trim() === '') {
    closeIcon.classList.add('hide');
  } else {
    closeIcon.classList.remove('hide');
  }
}

function addEventToSearchInput(headerBlock, placeholders = {}) {
  const body = document.querySelector('body');
  const popupOverlay = document.querySelector('.menu-popup-overlay');
  const urlParams = new URLSearchParams(window.location.search);
  const searchTerm = urlParams.get('q') || '';

  headerBlock.querySelectorAll('.search-field input').forEach((searchInput) => {
    searchInput.addEventListener('keydown', async (e) => {
      const { key } = e;
      const newSearchTerm = searchInput.value.trim().toLowerCase();
      if (key === 'Enter') {
        if (newSearchTerm.length > 0) {
          const searchUrl = new URL(`${origin}/${lang}/search`);
          searchUrl.searchParams.set('q', newSearchTerm);
          window.location.href = searchUrl;
        }
      }
    });
    searchInput.addEventListener('input', async (e) => {
      const { target } = e;
      toggleCloseIcon(target);
      await updateSearchSuggestions(target, placeholders);
    });
    searchInput.addEventListener('focusin', (e) => {
      const { target } = e;
      updateSearchSuggestions(target, placeholders);
      toggleCloseIcon(target);
      const searchContainer = target.closest('.search-container');
      searchContainer.querySelector('.search-field').classList.add('is-active');
      searchContainer.querySelector('.search-suggestions').classList.remove('hide');
      popupOverlay.classList.add('active');
      body.classList.add('search-active');
    });
    searchInput.addEventListener('focusout', (e) => {
      const { target } = e;
      toggleCloseIcon(target);
      // delay to prioritize the click event
      setTimeout(() => {
        if (!searchInput.matches(':focus')) {
          // if on search page, reset the search input value to search query
          searchInput.value = isSearchPage() ? searchTerm : '';
          const searchContainer = target.closest('.search-container');
          searchContainer.querySelector('.search-field').classList.remove('is-active');
          searchContainer.querySelector('.search-suggestions').classList.add('hide');
          popupOverlay.classList.remove('active');
          body.classList.remove('search-active');
        }
      }, 200);
      toggleCloseIcon(searchInput);
    });
    const closeIcon = searchInput.closest('.search-field').querySelector('.search-close-icon');
    closeIcon?.addEventListener('click', () => {
      searchInput.value = '';
      toggleCloseIcon(searchInput);
      searchInput.focus();
    });
    if (isSearchPage()) {
      searchInput.value = searchTerm;
      if (isMobileDevice()) {
        const searchIcon = searchInput.closest('.search-field').querySelector('.search-icon');
        searchIcon?.addEventListener('click', () => {
          const thisBody = document.querySelector('body');
          if (!thisBody.classList.contains('search-active')) {
            window.history.back();
          }
        });
      }
    }
  });

  headerBlock.querySelectorAll('.search-suggestions').forEach((searchSuggestion) => {
    searchSuggestion.addEventListener('click', (e) => {
      const { target } = e;
      const searchInput = target.closest('.search-container').querySelector('.search-field input');
      searchInput.focus();
    });
  });
}

async function createFavoriteAddedNotification(product) {
  const token = getSignInToken();

  // eslint-disable-next-line
  const { favouritesSigninText, favouritesSigninSubText1Signedin, favouritesSigninSubText1, favouritesSigninSubText2, signin, register } = await fetchPlaceholdersForLocale();
  // create a sigin widget and append it to the header
  const signInWidget = document.createElement('div');
  signInWidget.classList.add('sign-in-widget');
  signInWidget.innerHTML = `<div class="sign-in-widget">
    <div>
      <h6>${product.name}</h6>
      <p>${favouritesSigninSubText1Signedin}</p>
    </div>`;

  if (!token) {
    signInWidget.innerHTML = `<div class="sign-in-widget">
        <div>
          <h6>${product.name}</h6>
          <p>${favouritesSigninSubText1}</p>
        </div>
        <div>
          <h6>${favouritesSigninText}</h6>
          <p>${favouritesSigninSubText2}</p>
        </div>
        <div class="button-wrapper"> 
          <a href="/${lang}/user/register" class="sign-up-link button secondary">${register}</a>
          <a href="/${lang}/user/login" class="sign-in-link button primary">${signin}</a>
        </div>
      </div>`;
  }
  return signInWidget;
}

/**
 * Retuns whether to show a promotion category menu based on promo_id
 * @param {Object} promotions The promotions data
 * @param {String} promoId The promotion schedule ID
 * @returns Boolean
 */
const isShowMenuInNav = (promotions, promoId) => {
  if (!promotions?.total) {
    return false;
  }

  const activePromotions = promotions.data.filter((promotion) => promotion.status === '1' && promotion.channel_web === '1');

  const menuPromotion = activePromotions.find((promotion) => promotion.schedule_id === promoId);

  if (!menuPromotion) {
    return false;
  }

  const { start_date: sDate, end_date: eDate } = menuPromotion;
  const dateNow = new Date().getTime();

  const startDate = new Date(sDate).getTime();
  const endDate = new Date(eDate).getTime();

  if (startDate <= dateNow && endDate >= dateNow) {
    return true;
  }

  return false;
};

/**
 * @param {HTMLElement} elem
 * @param {Boolean} state determines the visibility of the element
 * @param {String} className the name of the class to add to element
 */
const toggleClass = (elem, state, className = '') => {
  if (state) {
    elem.classList.add(className);
  } else {
    elem.classList.remove(className);
  }
};

/**
 * @param {Boolean} visible determines the visibility of the element
 */
const togglePoupOverlay = (visible) => {
  const overlay = document.getElementById('menu-popup-overlay');
  if (overlay) {
    toggleClass(overlay, visible, 'active');
  }
};

/**
 * @param {Boolean} visible determines the visibility of the element
 */
const toggleMainMenus = (visible) => {
  const mainMenuLinks = document.querySelectorAll('.xs-main-menu-link');
  mainMenuLinks.forEach((menu) => {
    toggleClass(menu, visible, 'active');
  });
};

/**
 * @param {Boolean} visible determines the visibility of the element
 */
const toggleSubMenus = (visible) => {
  const subMenus = document.querySelectorAll('.submenu-ul');
  subMenus.forEach((subMenu) => {
    toggleClass(subMenu, visible, 'active');
  });
};

/**
 * @param {Event} e Event
 * Main menu click handler
 */
const menuClickHandler = (e) => {
  if (isMobileDevice()) {
    e.preventDefault();

    const mainMenus = document.querySelectorAll('.xs-main-menu-link');
    const { menuId } = e.target.dataset;
    // Remove active state from all other main menus
    if (mainMenus?.length > 0) {
      mainMenus.forEach((mainM) => {
        mainM.classList.remove('active');
      });
    }

    // Hide all other inactive submenus first
    const allSubMenus = document.querySelectorAll('.submenu-ul');
    if (allSubMenus?.length > 0) {
      allSubMenus.forEach((subM) => {
        subM.classList.remove('active');
      });
    }
    // Make the current element to active state
    e.target.classList.add('active');

    // Make the subnav visible.
    const subMenu = document.getElementById(`submenu-ul-${menuId}`);
    if (subMenu) {
      subMenu.classList.add('active');
    } else {
      window.location.href = e.target.getAttribute('href');
    }
  }
};

/**
 * @param {Event} e
 * Main menu element hover state handler
 */
const menuHoverHandler = (e) => {
  if (!isMobileDevice()) {
    const mainMenus = document.querySelectorAll('.xs-main-menu-link');
    mainMenus.forEach((mainMenu) => {
      mainMenu.classList.remove('active');
    });
    e.target.classList.add('active');

    togglePoupOverlay(true);

    const { menuId } = e.target.dataset;
    if (menuId) {
      toggleSubMenus(false);

      const subMenu = document.getElementById(`submenu-ul-${menuId}`);
      if (subMenu && !subMenu.classList.contains('active')) {
        subMenu.classList.add('active');
      }
    } else {
      const allSubMenus = document.querySelectorAll('.submenu-ul');
      if (allSubMenus?.length > 0) {
        allSubMenus.forEach((subMenu) => {
          subMenu.classList.remove('active');
        });
      }
    }
  }
};

/**
 * @param {Event} e
 * Hamburger menu button click handler
 */
const hamburgerClickHandler = (e) => {
  const currentElem = e.target;
  const navWrapper = document.getElementById('nav-wrapper');
  const mainMenuWrapper = document.getElementById('xs-mainmenu-wrapper');
  const mainMenus = document.querySelectorAll('#xs-mainmenu-wrapper .xs-main-menu-link');
  const subMenus = document.querySelectorAll('#sub-menu-wrapper .submenu-ul');
  const subMenusLi = document.querySelectorAll('#sub-menu-wrapper .submenu-li');
  const headerElem = document.getElementsByTagName('header')[0];
  let state = '';
  // Checks if the menu is in opened state or not
  if (currentElem.classList.contains('open')) {
    currentElem.classList.remove('open');
    headerElem.classList.remove('expanded');
    navWrapper.classList.remove('active');
    [...mainMenus].forEach((menu) => {
      menu.classList.remove('active');
    });
    [...subMenus].forEach((subMenu) => {
      subMenu.classList.remove('active');
    });
    state = 'Close';
  } else {
    currentElem.classList.add('open');
    headerElem.classList.add('expanded');
    if (mainMenuWrapper) {
      mainMenuWrapper.classList.remove('hidden');
    }
    subMenusLi.forEach((subMenu) => {
      subMenu.classList.remove('hidden');
    });
    navWrapper.classList.add('active');
    mainMenus[0].classList.add('active');
    subMenus[0].classList.add('active');
    state = 'Open';
  }
  datalayerMobileHamburgerEvent(state);
};

/**
 * @param {*} e Sub menu navigation click handler
 */
const subMenuClickHandler = (e) => {
  if (isMobileDevice()) {
    e.preventDefault();
    const parentLi = e.target.closest('li');
    const subMenu = parentLi.querySelector(':scope > ul');

    // Makes the sub menu visible
    if (subMenu) {
      subMenu.classList.add('active');
    } else {
      window.location = e.target.href;
    }
  }
};

/**
 * @param {Event} e Back button for mobile menu sub navigation
 */
const headerBackClickHandler = (e) => {
  if (isMobileDevice()) {
    const parentUl = e.target.closest('ul');
    parentUl.classList.remove('active');
  }
};

const menuWrapperMouseLeaveHandler = () => {
  if (isMobileDevice()) {
    return;
  }

  togglePoupOverlay(false);
  toggleMainMenus(false);
  toggleSubMenus(false);
};

/**
 * Register events for the header navigation
 * (includes both desktop and mobile events)
 */
const registerMenuEvents = () => {
  // Event listner for the main menu link click handler
  const mainMenus = document.querySelectorAll('.xs-main-menu-link');
  if (mainMenus?.length > 0) {
    mainMenus.forEach((menu) => {
      menu.addEventListener('click', menuClickHandler);
      menu.addEventListener('mouseover', menuHoverHandler);
    });
  }

  // Hamburger Button Event
  const hamburgerButton = document.getElementById('menu-hamburger-btn');
  if (hamburgerButton) {
    hamburgerButton.addEventListener('click', hamburgerClickHandler);
  }

  // Evnet listner for the submenu links click handler
  const subMenuLinks = document.querySelectorAll('.submenu-ul > li > a');
  if (subMenuLinks?.length > 0) {
    subMenuLinks.forEach((link) => {
      link.addEventListener('click', subMenuClickHandler);
    });
  }

  // Sub Menu navigation back button events
  document.querySelectorAll('#nav-wrapper .menu-header-back').forEach((button) => {
    button.addEventListener('click', headerBackClickHandler);
  });

  // Main menu wrapper out of focus state handler
  const menuWrapper = document.getElementById('nav-wrapper');
  if (menuWrapper) {
    menuWrapper.addEventListener('mouseleave', menuWrapperMouseLeaveHandler);
  }
};

/**
 * @param {Object} menu The array of objects of category menus by level
 * @returns HTMLCollection of the dynamic sub menu navigation
 */
const buildDynamicSubMenus = (menu, placeholders, promotions) => {
  const subMenuUl = document.createElement('ul');
  subMenuUl.classList.add('submenu-ul', `submenu-ul-${menu.level}`);
  subMenuUl.setAttribute('id', `submenu-ul-${menu.id}`);
  if (menu.level === 2) {
    subMenuUl.setAttribute('data-gtm-name', menu.gtm_name);
  }

  if (menu.level === 3) {
    const menuHeader = document.createElement('li');
    menuHeader.classList.add('submenu-header');
    const menuHeaderBack = document.createElement('button');
    menuHeaderBack.classList.add('menu-header-back');
    menuHeaderBack.setAttribute('data-level', menu.level);
    menuHeaderBack.setAttribute('data-parent-level', menu.level - 1);
    menuHeaderBack.setAttribute('data-menu-id', menu.id);
    const menuHeaderBackIcon = document.createElement('img');
    menuHeaderBackIcon.setAttribute('src', '/icons/arrow-left.svg');
    menuHeaderBack.appendChild(menuHeaderBackIcon);
    const menuHeaderTitle = document.createElement('h5');
    menuHeaderTitle.classList.add('menu-header-title');
    menuHeaderTitle.textContent = menu.name;

    menuHeader.appendChild(menuHeaderBack);
    menuHeader.appendChild(menuHeaderTitle);
    subMenuUl.appendChild(menuHeader);
  }

  if (menu?.children?.length > 0) {
    menu.children.forEach((subMenu) => {
      if (subMenu?.include_in_menu === 1) {
        const promoId = subMenu?.promo_id;

        if (typeof promoId === 'string' && promoId !== '' && !isShowMenuInNav(promotions, promoId)) {
          return;
        }

        const li = document.createElement('li');
        li.classList.add('submenu-li');
        li.classList.add(`level-${subMenu?.level}-li`);
        li.setAttribute('data-gtm-name', subMenu?.gtm_name);
        const a = document.createElement('a');
        a.classList.add('submenu-link');
        a.setAttribute('href', `/${lang}/${subMenu.url_path}`);
        a.setAttribute('data-level', subMenu?.level);
        a.setAttribute('id', `submenu-link-${subMenu?.id}`);

        if (subMenu?.image) {
          const icon = document.createElement('img');
          icon.classList.add('menu-icon');
          icon.setAttribute('src', subMenu?.image || '');
          a.append(icon);
        }

        const menuText = document.createElement('span');
        menuText.innerText = subMenu.name;
        a.append(menuText);

        if (subMenu?.level <= 3 && subMenu?.children?.length > 0) {
          a.setAttribute('data-menu-id', subMenu?.id);
          a.classList.add('parent-menu');
        }
        li.appendChild(a);

        if (subMenu?.children?.length > 0) {
          li.appendChild(buildDynamicSubMenus(subMenu, placeholders, promotions));
        }

        subMenuUl.appendChild(li);
      }
    });
  }

  if (menu?.display_view_all === 1) {
    const li = document.createElement('li');
    li.classList.add('submenu-li', 'submenu-li-viewall');

    const a = document.createElement('a');
    a.classList.add('submenu-link', 'submenu-link-viewall', 'parent-menu');
    a.setAttribute('href', `/${lang}/${menu.url_path}/view-all`);

    const menuText = document.createElement('span');
    menuText.innerText = placeholders.viewAll || 'View All';
    a.append(menuText);

    li.appendChild(a);
    subMenuUl.appendChild(li);
  }

  if (menu?.banners) {
    menu.banners.split(',').forEach((path) => {
      const formattedPath = path.trim();
      const subMenuBannerLi = document.createElement('li');
      subMenuBannerLi.classList.add('submenu-banner-wrapper');

      loadFragment(formattedPath).then((fragment) => {
        if (fragment) {
          subMenuBannerLi.appendChild(fragment);
          subMenuUl.appendChild(subMenuBannerLi);
        }
      }).catch((error) => {
        console.error('Error rendering fragment ', error);
      });
    });
  }

  return subMenuUl;
};

/**
 * Execution start point for rendering the
 * main menu header navigation to be displayed in the header
 * @returns the main menu header navigation
 */
async function renderHeaderNavigation() {
  const placeholders = await fetchPlaceholdersForLocale();
  const { items } = await fetchCommerceCategories();

  const promotions = await getPromotionsData();

  const headerMenuNavs = document.createElement('ul');
  if (items?.[0]?.children.length === 0) {
    return headerMenuNavs;
  }
  // the categories to be diplayed in the navigation
  const dynamicCategories = items?.[0]?.children;

  // The wrapper element to hold the entire navigation element
  const navigationWapper = document.createElement('div');
  navigationWapper.classList.add('nav-wrapper');
  navigationWapper.setAttribute('id', 'nav-wrapper');
  const mainMenuWrapper = document.createElement('div');
  mainMenuWrapper.classList.add('xs-mainmenu-wrapper');
  mainMenuWrapper.setAttribute('id', 'xs-mainmenu-wrapper');

  // Creating main menu navigation element
  const mainMenuUl = document.createElement('ul');
  mainMenuUl.classList.add('xs-main-menu-ul');
  mainMenuUl.setAttribute('id', 'xs-main-menu-ul');
  const subMenuWrapper = document.createElement('div');
  subMenuWrapper.classList.add('sub-menu-wrapper');
  subMenuWrapper.setAttribute('id', 'sub-menu-wrapper');

  // Iterating over the menu object to create the sub navigation
  dynamicCategories.forEach((menu) => {
    if (menu?.include_in_menu === 1) {
      const promoId = menu?.promo_id;

      if (typeof promoId === 'string' && promoId !== '' && !isShowMenuInNav(promotions, promoId)) {
        return;
      }

      const li = document.createElement('li');
      li.classList.add('main-menu-li', `level-${menu?.level}-li`);
      li.setAttribute('id', `main-menu-li-${menu.id}`);
      li.setAttribute('data-menu-id', menu.id);
      li.setAttribute('data-gtm-name', menu.gtm_name);
      const a = document.createElement('a');
      a.classList.add('xs-main-menu-link');
      if (menu?.children?.length > 0) {
        a.setAttribute('data-menu-id', menu?.id);
        a.setAttribute('data-level', menu?.level);
        a.setAttribute('data-gtm-name', menu?.gtm_name);
      }
      const pathName = `/${lang}/${menu.url_path}`;
      a.setAttribute('href', pathName);
      a.innerText = menu.name;
      li.append(a);
      mainMenuUl.appendChild(li);

      if (menu?.children?.length > 0) {
        const subMenus = buildDynamicSubMenus(menu, placeholders, promotions);
        subMenuWrapper.appendChild(subMenus);
      }
    }
  });

  // Appends the navigation elements to the main wrapper
  mainMenuWrapper.appendChild(mainMenuUl);
  navigationWapper.appendChild(mainMenuWrapper);
  navigationWapper.appendChild(subMenuWrapper);

  return navigationWapper;
}

async function decorateHeader(block, placeholders, favouritesWidgetTimeout, fragment) {
  const headerMiddleBlock = document.createElement('div');
  headerMiddleBlock.classList.add('header-middle');
  const headerMiddleTop = document.createElement('div');
  headerMiddleTop.classList.add('header-middle-top');
  headerMiddleTop.setAttribute('id', 'header-middle-top');
  // decorate header DOM
  while (fragment.firstElementChild) {
    if (fragment.firstElementChild.classList.contains('inline-links')) {
      block.append(fragment.firstElementChild);
    } else {
      headerMiddleTop.append(fragment.firstElementChild);
    }
  }
  headerMiddleBlock.append(headerMiddleTop);
  const menuPopupOverlay = document.createElement('div');
  menuPopupOverlay.classList.add('menu-popup-overlay');
  menuPopupOverlay.setAttribute('id', 'menu-popup-overlay');
  headerMiddleBlock.append(menuPopupOverlay);
  block.append(headerMiddleBlock);
  if (isLoggedInUser()) {
    document.querySelectorAll('.inline-links li a').forEach((ele) => {
      if (ele?.href.endsWith('/user/login')) {
        ele.textContent = `${placeholders.signout}`;
        ele.setAttribute('href', `/${lang}/user/logout`);
        ele.setAttribute('title', `${placeholders.signout}`);
      }
      if (ele?.href.endsWith('/user/register')) {
        ele.parentNode.classList.add('hidden');
      }
    });

    document.querySelector('.header').classList.add('loggedin');
    const headerlinks = document.querySelector('.header .inline-links ul');
    const parentNode = document.querySelector('.header .inline-links ul').parentElement;
    const welcomeMessage = await getWelcomeMessage(placeholders.welcometext, 'fullname');
    parentNode.insertBefore(welcomeMessage, headerlinks);

    const changePassword = document.createElement('li');
    const changePasswordlink = document.createElement('a');
    changePasswordlink.textContent = `${placeholders.changePassword || 'Change Password'}`;
    changePasswordlink.setAttribute('href', `/${lang}/user/account/change-password`);
    changePassword.append(changePasswordlink);
    headerlinks.prepend(changePassword);

    const myAccount = document.createElement('li');
    const myAccountlink = document.createElement('a');
    myAccountlink.textContent = `${placeholders.myAccount || 'My Account'}`;
    myAccountlink.setAttribute('href', `/${lang}/user/account`);
    myAccount.append(myAccountlink);
    headerlinks.prepend(myAccount);

    const logoutLink = document.querySelector(`li a[title="${placeholders.signout}"]`);
    if (logoutLink?.href.endsWith('/user/logout')) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        logout(`/${lang}/user/login`);
      });
    }
  }

  function updateMiniCart(minicartQuantity) {
    const minicartQuantityElement = block.querySelector('.minicart-quantity');
    if (minicartQuantityElement) {
      minicartQuantityElement.textContent = minicartQuantity;
    }
  }

  // trigger refresh of cart data on updateMiniCart event
  window.addEventListener('updateMiniCart', () => {
    getCart(true);
  });

  // Search input placeholder
  const searchSection = headerMiddleBlock.querySelector('.section.search');
  const searchContainer = searchSection.firstElementChild;
  searchContainer.classList.add('search-container');
  const searchLabel = searchSection.textContent.trim();
  searchContainer.innerHTML = `
    <div class="search-field">
      <span class="icon search-icon"></span>
      <input type="text" class="search-input" aria-label="${searchLabel}" placeholder="${placeholders.searchHomePlaceholder}">
      <span class="icon search-close-icon ${isSearchPage() ? '' : 'hide'}"></span>
    </div>
    <div class="search-suggestions hide"></div>`;
  block.append(searchSection.cloneNode(true));

  // Brand logo
  const brandLogoContainerOld = headerMiddleBlock.querySelector('.brand-logo p');
  const brandLogoContainer = document.createElement('h1');
  brandLogoContainer.append(...brandLogoContainerOld.children);
  brandLogoContainerOld.replaceWith(brandLogoContainer);
  const brandLogoLink = headerMiddleBlock.querySelector('.brand-logo a');
  brandLogoLink.classList.remove('button');
  brandLogoLink.setAttribute('title', brandLogoLink.textContent);
  brandLogoLink.innerHTML = '<span class="icon"/>';

  // Right links section
  const rightLinkSection = headerMiddleBlock.querySelector('.right-links');
  const rightLinks = ['search', 'profile', 'wishlist', 'cart'];

  // Add Search link
  const searchEl = document.createElement('li');
  searchEl.innerHTML = `<a href="#">${searchLabel}</a>`;
  rightLinkSection.querySelector('ul').prepend(searchEl);

  // Generating icons
  [...rightLinkSection.querySelector('ul').children].forEach((li, i) => {
    li.classList.add(`${rightLinks[i]}-wrapper`);
    const linkEl = li.firstElementChild;
    linkEl.setAttribute('aria-label', linkEl.textContent);
    linkEl.innerHTML = `<span class="icon ${rightLinks[i]}-icon"/>`;

    if (rightLinks[i] === 'cart') {
      const minicartAmount = document.createElement('span');
      minicartAmount.classList.add('minicart-amount');

      li.prepend(minicartAmount);
      linkEl.classList.add('minicart-wrapper');
      linkEl.innerHTML = `<span class="minicart-quantity"></span>${linkEl.innerHTML}`;
    } else if (rightLinks[i] === 'search') {
      linkEl.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('body').classList.add('search-active');
        document.querySelector('.header > .section.search.full-width .search-input').focus();
      });
    }
  });

  // Sticky cart and wishlist menu link set
  const headerWishlistLink = document.querySelector('.header-wrapper .wishlist-wrapper a');
  const headerCartLink = document.querySelector('.header-wrapper .cart-wrapper a');

  const stickyWishlist = document.querySelector('.sticky-filters-wrapper .wishlist-wrapper a');
  const stickyCart = document.querySelector('.sticky-filters-wrapper .minicart-wrapper a');

  // add attributes
  stickyWishlist?.setAttribute('href', `${headerWishlistLink.getAttribute('href')}`);
  stickyCart?.setAttribute('href', `${headerCartLink.getAttribute('href')}`);
  stickyWishlist?.setAttribute('title', `${headerWishlistLink.getAttribute('title')}`);
  stickyCart?.setAttribute('title', `${headerCartLink.getAttribute('title')}`);
  stickyWishlist?.setAttribute('aria-label', `${headerWishlistLink.getAttribute('aria-label')}`);
  stickyCart?.setAttribute('aria-label', `${headerCartLink.getAttribute('aria-label')}`);

  // Hamburger Menu
  const hamburgerMenu = document.createElement('li');
  hamburgerMenu.classList.add('menu-hamburger-wrapper');
  const hamburgerMenuButton = document.createElement('button');
  hamburgerMenuButton.classList.add('menu-hamburger-btn');
  hamburgerMenuButton.setAttribute('id', 'menu-hamburger-btn');
  hamburgerMenu.append(hamburgerMenuButton);
  rightLinkSection.querySelector('ul').append(hamburgerMenu);

  const headerMenu = await renderHeaderNavigation();
  headerMiddleBlock.appendChild(headerMenu);

  // Fetches and renders the static navigation menus
  // Register the desktop and mobile events for the navigation menu
  registerMenuEvents();

  addEventToSearchInput(block, placeholders);

  cartApi.cartItemsQuantity.watch((quantity, amount, currency) => {
    const minicartQuantity = quantity > 0 ? quantity : '';
    const minicartAmount = amount > 0 ? amount : '';
    getCurrencyFormatter(currency).then((currencyFormat) => {
      document.querySelectorAll('.minicart-amount').forEach((el) => {
        el.textContent = `${minicartAmount ? currencyFormat.format(minicartAmount) : 0}`;
        if (!minicartAmount || minicartAmount === 0) {
          el.classList.add('hide');
        } else {
          el.classList.remove('hide');
        }
      });
    });

    updateMiniCart(minicartQuantity);
  });

  // wishlist icon state management and event listener for wishlist updates
  const wishlistIcon = block.querySelector('.icon.wishlist-icon');
  if (wishlistIcon) {
    // listen to favourites updated event and switch the icon
    document.querySelector('main').addEventListener('favourites-updated', async (event) => {
      if (event.detail?.showSignIn) {
        const signInWidget = await createFavoriteAddedNotification(event.detail?.product);
        wishlistIcon.closest('.wishlist-wrapper').append(signInWidget);
        const stickyHeaderDesktop = document.querySelector('.sticky-desktop');
        const signInWidgetClone = signInWidget.cloneNode(true);
        if (stickyHeaderDesktop) {
          const wishlistWrapper = stickyHeaderDesktop.querySelector('.sticky-right-part > span');
          wishlistWrapper.append(signInWidgetClone);
          if (!stickyHeaderDesktop.classList.contains('sticky')) {
            // scroll to the widget
            block.scrollIntoView({ behavior: 'smooth' });
          }
        }
        // Remove the widget after defined timeout duration
        setTimeout(() => {
          signInWidget.remove();
          signInWidgetClone.remove();
          window.dispatchEvent(new CustomEvent('favourites-widget-removed', { detail: true }));
        }, favouritesWidgetTimeout || 5000);
      }
    });
  }

  // Navigation level
  document.querySelectorAll('.nav-wrapper a')?.forEach((item) => {
    item?.addEventListener('click', (event) => {
      const targetHref = event.target.closest('a').href;
      const { pathname } = new URL(targetHref);
      const pageArray = pathname.split('/').filter(Boolean);
      if (pageArray.length > 1) {
        const selectedLanguage = pageArray[0];
        const finalPathArray = pageArray.slice(1);
        const navLabels = finalPathArray.map((nav, index) => {
          let navPath = '';
          if (pathname.endsWith('/')) {
            navPath = `/${selectedLanguage}/${finalPathArray.slice(0, index + 1).join('/')}${navPath ? '/' : ''}/`;
          } else if (!pathname.endsWith('/')) {
            navPath = `/${selectedLanguage}/${finalPathArray.slice(0, index + 1).join('/')}${navPath ? '/' : ''}`;
          }
          return document.querySelector(`a[href='${navPath}']`).closest('li').getAttribute('data-gtm-name') || '';
        });
        switch (navLabels.length) {
          case 1:
            datalayerHeaderNavigationEvent('Main', navLabels[0]);
            break;
          case 2:
            datalayerHeaderNavigationEvent('L2', navLabels[0], navLabels[1]);
            break;
          case 3:
            datalayerHeaderNavigationEvent('L3', navLabels[0], navLabels[1], navLabels[2]);
            break;
          default:
            break;
        }
      }
    });
  });
  document.querySelectorAll('.section.inline-links ul li a')?.forEach((link) => {
    const selectedLanguage = new URL(link?.href).pathname.split('/')[1];
    const linkUrl = new URL(link?.href || '');
    if (linkUrl.pathname === '/en/' || linkUrl.pathname === '/ar/') {
      if (selectedLanguage) {
        const url = new URL(window.location.href);
        url.pathname = url.pathname?.replace(/\/[^/]+/, `/${selectedLanguage}`);
        link.href = url.href;
      }
    }
    link?.addEventListener('click', (event) => {
      const regex = /^\/[a-zA-Z]{2}\/?$/;
      if (regex.test(event.target.pathname)) {
        datalayerLanguageSwitchEvent('Header', selectedLanguage);
      }
    });
  });
  document.addEventListener('click', (event) => {
    if (event.target?.closest('.query-suggestions') && event.target.nodeName === 'A') {
      const links = Array.from(event.target.closest('.query-suggestions').querySelectorAll('a'));
      const index = links.indexOf(event.target);
      dataLayerTrendingSearchEvent(event.target.innerText, index);
    }
  });
}

async function decorateCheckoutHeader(block, placeholders, favouritesWidgetTimeout, fragment) {
  const headerMiddleBlock = document.createElement('div');
  headerMiddleBlock.classList.add('header-middle');
  const headerMiddleTop = document.createElement('div');
  headerMiddleTop.classList.add('header-middle-top');
  headerMiddleTop.setAttribute('id', 'header-middle-top');
  // decorate header DOM
  while (fragment.firstElementChild) {
    headerMiddleTop.append(fragment.firstElementChild);
  }
  headerMiddleBlock.append(headerMiddleTop);
  block.append(headerMiddleBlock);

  // Brand logo
  const brandLogoContainerOld = headerMiddleBlock.querySelector('.brand-logo p');
  const brandLogoContainer = document.createElement('h1');
  brandLogoContainer.append(...brandLogoContainerOld.children);
  brandLogoContainerOld.replaceWith(brandLogoContainer);
  const brandLogoLink = headerMiddleBlock.querySelector('.brand-logo a');
  brandLogoLink.classList.remove('button');
  brandLogoLink.setAttribute('title', brandLogoLink.textContent);
  brandLogoLink.innerHTML = '<span class="icon"></span> <img class="brand-logo-image" src="/icons/logo.svg" alt="logo"/>';
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */

export default async function decorate(block) {
  const headerMeta = getMetadata('header');
  const headerCheckoutMeta = getMetadata('header-checkout');
  const placeholders = await fetchPlaceholdersForLocale();
  const favouritesWidgetTimeout = parseInt(await getConfigValue('plp-favorites-widget-timeout-in-seconds'), 10) * 1000;
  block.textContent = '';
  // load header fragment
  const headerPath = headerMeta || `/${lang}/header`;
  const fragment = await loadFragment(headerPath);

  if (headerCheckoutMeta === 'true') {
    block.classList.add('checkout-header');
    await decorateCheckoutHeader(block, placeholders, favouritesWidgetTimeout, fragment);
  } else {
    await decorateHeader(block, placeholders, favouritesWidgetTimeout, fragment);
  }
}
