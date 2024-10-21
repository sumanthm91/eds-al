/* eslint-disable no-unused-expressions, linebreak-style */
import { decorateIcons, loadCSS } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/configs.js';
import {
  createOptimizedPicture,
  fetchPlaceholdersForLocale,
  formatPrice,
} from '../../scripts/scripts.js';
import { targetClickTrackingEvent } from '../../scripts/target-events.js';
import { datalayerSelectRecommendedItemListEvent } from '../../scripts/analytics/google-data-layer.js';

const AUTOSCROLL_INTERVAL = 7000;

/**
 * Clone a carousel item
 * @param {Element} item carousel item to be cloned
 * @returns the clone of the carousel item
 */
function createClone(item) {
  const clone = item.cloneNode(true);
  // Adding fallback to clone
  const cloneImg = clone.querySelector('img');
  if (cloneImg) {
    cloneImg.onerror = function (event) {
      event.onerror = null;
      const fallbackSrc = '/icons/fallback.svg';
      const elements = Array.from(event.target.parentNode.children);
      elements.forEach((element) => {
        if (element.tagName.toLowerCase() === 'source') {
          element.srcset = fallbackSrc;
        } else if (element.tagName.toLowerCase() === 'img') {
          element.classList.add('fallback');
          element.src = fallbackSrc;
        }
      });
    };
  }
  clone.classList.add('clone');
  clone.classList.remove('selected');
  return clone;
}

class Carousel {
  constructor(block, data, config) {
    // Set defaults
    this.cssFiles = [];

    this.defaultStyling = true;

    this.defaultStyling = true;
    this.dotButtons = false;
    this.navButtons = true;
    this.infiniteScroll = false;
    this.autoScroll = false; // only available with infinite scroll
    this.autoScrollInterval = AUTOSCROLL_INTERVAL;
    this.fullPageScroll = false;
    this.currentIndex = 0;
    this.currentPage = 0;
    this.counterText = '';
    this.counterNavButtons = true;
    this.cardRenderer = this;
    this.hasImageInDots = false;
    this.isRTL = false;
    // this is primarily controlled by CSS,
    // but we need to know then intention for scrolling purposes
    this.visibleItems = [
      {
        items: 1,
        condition: () => true,
      },
    ];

    // Set information
    this.block = block;
    this.data = data || [...block.children];

    // Will be replaced after rendering, if available
    this.navButtonLeft = null;
    this.navButtonRight = null;

    // Apply overwrites
    Object.assign(this, config);

    this.stepSize = this.fullPageScroll ? this.getCurrentVisibleItems() : 1;

    if (this.getCurrentVisibleItems() >= this.data.length) {
      this.infiniteScroll = false;
      this.navButtons = false;
      this.block.classList.add('fully-visible');
    }

    if (this.defaultStyling) {
      this.cssFiles.push('/blocks/carousel/carousel.css');
    }
  }

  getBlockPadding() {
    if (!this.blockStyle) {
      this.blockStyle = window.getComputedStyle(this.block);
    }
    return +this.blockStyle.getPropertyValue('padding-left').replace('px', '');
  }

  getScrollPosition(item) {
    const containerWidth = item.offsetParent?.offsetWidth || 0;
    const itemWidth = item.offsetWidth;
    let targetPosition = item.offsetLeft - this.getBlockPadding() - this.block.offsetLeft;
    if (this.isRTL && this.type === 'card') {
      targetPosition += itemWidth - containerWidth;
    }
    return { top: 0, left: targetPosition };
  }

  /**
   * Scroll the carousel to the next item
   */
  nextItem() {
    const items = this.block.querySelectorAll('.carousel-item:not(.clone)');
    const selectedItem = this.block.querySelector('.carousel-item.selected');

    let index = [...items].indexOf(selectedItem);
    index = index !== -1 ? index : 0;

    let newIndex = index + this.stepSize;
    if (newIndex >= items.length) {
      newIndex = 0;
    }
    const newSelectedItem = items[newIndex];
    if (newIndex === 0 && !this.infiniteScroll) {
      return;
    }

    !this.infiniteScroll && this.navButtonRight && this.navButtonRight.classList.remove('disabled');
    !this.infiniteScroll && this.navButtonLeft && this.navButtonLeft.classList.remove('disabled');

    if (newIndex >= items.length - this.getCurrentVisibleItems() && !this.infiniteScroll) {
      this.isRTL ? this.navButtonLeft.classList.add('disabled') : this.navButtonRight.classList.add('disabled');
    }

    if (newIndex === 0) {
      // create the illusion of infinite scrolling
      let cloneItemIndex = this.getCurrentVisibleItems() - this.stepSize;
      if (cloneItemIndex < 0) {
        cloneItemIndex = 0;
      }
      const cloneCurrentItem = this.block.querySelectorAll('.carousel-item')[cloneItemIndex];
      newSelectedItem.parentNode.scrollTo(
        this.getScrollPosition(cloneCurrentItem),
      );
    }

    newSelectedItem.parentNode.scrollTo({
      ...this.getScrollPosition(newSelectedItem),
      behavior: 'smooth',
    });

    items.forEach((item) => item.classList.remove('selected'));
    newSelectedItem.classList.add('selected');
    this.updateGlobalState(newIndex);
  }

  getCurrentVisibleItems() {
    return this.visibleItems.filter((e) => !e.condition || e.condition())[0]
      .items;
  }

  /**
   * Scroll the carousel to the previous item
   */
  prevItem() {
    const items = this.block.querySelectorAll('.carousel-item:not(.clone)');
    const selectedItem = this.block.querySelector('.carousel-item.selected');

    let index = [...items].indexOf(selectedItem);
    index = index !== -1 ? index : 0;
    let newIndex = index - this.stepSize;
    if (newIndex < 0) {
      newIndex = items.length - this.stepSize;
    }
    const newSelectedItem = items[newIndex];

    if (newIndex === items.length - this.stepSize && !this.infiniteScroll) {
      return;
    }

    !this.infiniteScroll && this.navButtonRight && this.navButtonRight.classList.remove('disabled');
    !this.infiniteScroll && this.navButtonLeft && this.navButtonLeft.classList.remove('disabled');
    if (newIndex === 0 && !this.infiniteScroll) {
      this.isRTL
        ? this.navButtonRight.classList.add('disabled')
        : this.navButtonLeft.classList.add('disabled');
    }

    if (newIndex === items.length - this.stepSize) {
      // create the illusion of infinite scrolling
      const cloneCurrentItem = items[items.length - 1].nextElementSibling;
      newSelectedItem.parentNode.scrollTo(
        this.getScrollPosition(cloneCurrentItem),
      );
    }

    newSelectedItem.parentNode.scrollTo({
      ...this.getScrollPosition(newSelectedItem),
      behavior: 'smooth',
    });

    items.forEach((item) => item.classList.remove('selected'));
    newSelectedItem.classList.add('selected');
    this.updateGlobalState(newIndex);
  }

  updateGlobalState(newIndex = this.currentIndex) {
    this.currentIndex = newIndex;
    this.currentPage = Math.floor(newIndex / this.stepSize);
    if (this.dotButtons) {
      const dotButtonEls = this.block.parentNode.querySelectorAll(
        '.carousel-dot-button',
      );
      dotButtonEls.forEach((r) => r.classList.remove('selected'));
      dotButtonEls[this.currentPage].classList.add('selected');
    }
  }

  /**
   * Create clone items at the beginning and end of the carousel
   * to give the appearance of infinite scrolling
   */
  createClones() {
    if (this.block.children.length < this.getCurrentVisibleItems()) return;

    const initialChildren = [...this.block.children];
    for (let i = 0; i < this.getCurrentVisibleItems(); i += 1) {
      this.block.lastChild.after(createClone(initialChildren[i]));
      this.block.firstChild.before(
        createClone(initialChildren[initialChildren.length - 1 - i]),
      );
    }
  }

  /**
   * Create left and right arrow navigation buttons
   */
  createNavButtons(parentElement) {
    const buttonLeft = document.createElement('button');
    buttonLeft.classList.add('carousel-nav-left');
    buttonLeft.ariaLabel = 'Scroll to previous item';
    const navIconLeft = document.createElement('span');
    navIconLeft.classList.add('icon', 'icon-chevron-left');
    buttonLeft.append(navIconLeft);
    buttonLeft.addEventListener('click', () => {
      clearInterval(this.intervalId);
      this.isRTL ? this.nextItem() : this.prevItem();
    });

    const buttonRight = document.createElement('button');
    buttonRight.classList.add('carousel-nav-right');
    buttonRight.ariaLabel = 'Scroll to next item';
    const navIconRight = document.createElement('span');
    navIconRight.classList.add('icon', 'icon-chevron-right');
    buttonRight.append(navIconRight);
    buttonRight.addEventListener('click', () => {
      clearInterval(this.intervalId);
      this.isRTL ? this.prevItem() : this.nextItem();
    });

    [buttonLeft, buttonRight].forEach((navButton) => {
      navButton.classList.add('carousel-nav-button');
      parentElement.append(navButton);
    });

    if (!this.infiniteScroll) {
      this.isRTL
        ? buttonRight.classList.add('disabled')
        : buttonLeft.classList.add('disabled');
    }

    decorateIcons(buttonLeft);
    decorateIcons(buttonRight);
    this.navButtonLeft = buttonLeft;
    this.navButtonRight = buttonRight;
  }

  /**
   * Adds event listeners for touch UI swiping
   */
  addSwipeCapability() {
    if (this.block.swipeCapabilityAdded) {
      return;
    }

    let touchstartX = 0;
    let touchendX = 0;

    this.block.addEventListener(
      'touchstart',
      (e) => {
        touchstartX = e.changedTouches[0].screenX;
      },
      { passive: true },
    );

    this.block.addEventListener(
      'touchend',
      (e) => {
        touchendX = e.changedTouches[0].screenX;
        if (Math.abs(touchendX - touchstartX) < 10) {
          return;
        }

        if (touchendX < touchstartX) {
          clearInterval(this.intervalId);
          this.isRTL ? this.prevItem() : this.nextItem();
        }

        if (touchendX > touchstartX) {
          clearInterval(this.intervalId);
          this.isRTL ? this.nextItem() : this.prevItem();
        }
      },
      { passive: true },
    );
    this.block.swipeCapabilityAdded = true;
  }

  setInitialScrollingPosition() {
    const scrollToSelectedItem = () => {
      const item = this.block.querySelector('.carousel-item.selected');
      item.parentNode.scrollTo(this.getScrollPosition(item));
    };

    const section = this.block.closest('.section');

    const observer = new MutationObserver((mutationList) => {
      mutationList.forEach((mutation) => {
        if (mutation.type === 'attributes'
          && mutation.attributeName === 'data-section-status'
          && section.attributes.getNamedItem('data-section-status').value === 'loaded') {
          scrollToSelectedItem();
          observer.disconnect();
        }
      });
    });

    observer.observe(section, { attributes: true });

    // just in case the mutation observer didn't work
    setTimeout(scrollToSelectedItem, 700);

    // ensure that we disconnect the observer
    // if the animation has kicked in, we for sure no longer need it
    setTimeout(() => {
      observer.disconnect();
    }, AUTOSCROLL_INTERVAL);
  }

  createDotButtons() {
    const buttons = document.createElement('div');
    buttons.className = `carousel-dot-buttons ${
      this.hasImageInDots ? 'carousel-dot-img-buttons' : ''
    }`;
    const items = [...this.block.children];
    const numPages = Math.ceil(items.length / this.stepSize);

    for (let i = 0; i < numPages; i += 1) {
      const item = items[i * this.stepSize];
      const button = document.createElement('button');
      button.ariaLabel = `Scroll to item ${i * this.stepSize + 1}`;
      button.classList.add('carousel-dot-button');

      if (this.hasImageInDots) {
        const imgPath = item.querySelector('img').getAttribute('src');
        const customPath = imgPath.split('?')[0];
        const imgFormat = customPath.split('.')[1];
        const imgPrefix = `${customPath}?width=100&format=${imgFormat}&optimize=medium`;
        const imgEl = document.createElement('img');
        imgEl.src = imgPrefix;
        button.appendChild(imgEl);
      }

      if (i === this.currentPage) {
        button.classList.add('selected');
      }

      button.addEventListener('click', () => {
        clearInterval(this.intervalId);
        this.block.scrollTo({
          ...this.getScrollPosition(item),
          behavior: 'smooth',
        });
        [...buttons.children].forEach((r) => r.classList.remove('selected'));
        items.forEach((r) => r.classList.remove('selected'));
        button.classList.add('selected');
        item.classList.add('selected');
      });
      buttons.append(button);
    }
    this.block.parentElement.append(buttons);
  }

  /*
   * Changing the default rendering may break carousels that rely on it
   * (e.g. CSS might not match anymore)
   */
  // eslint-disable-next-line class-methods-use-this
  renderItem(item) {
    // create the carousel content
    const columnContainer = document.createElement('div');
    columnContainer.classList.add('carousel-item-columns-container');

    const columns = [
      document.createElement('div'),
      document.createElement('div'),
    ];

    const itemChildren = [...item.children];
    itemChildren.forEach((itemChild, idx) => {
      if (itemChild.querySelector('img')) {
        itemChild.classList.add('carousel-item-image');
      } else {
        itemChild.classList.add('carousel-item-text');
      }
      columns[idx].appendChild(itemChild);
    });

    columns.forEach((column) => {
      column.classList.add('carousel-item-column');
      columnContainer.appendChild(column);
    });
    return columnContainer;
  }

  async render() {
    // copy carousel styles to the wrapper too
    if (this.block.classList.contains('recommendations')) {
      this.block.parentElement.classList.add(
        ...[...this.block.classList].filter(
          (item, idx) => idx !== 0 && item !== 'block' && item !== 'carousel',
        ),
      );
    } else {
      this.block.parentElement.classList.add(
        ...[...this.block.classList].filter(
          (item, idx) => idx !== 0 && item !== 'block',
        ),
      );
    }

    let defaultCSSPromise;
    if (Array.isArray(this.cssFiles) && this.cssFiles.length > 0) {
      // add default carousel classes to apply default CSS
      defaultCSSPromise = Promise.all(this.cssFiles.map(loadCSS));
      this.block.parentElement.classList.add('carousel-wrapper');
      this.block.classList.add('carousel');
    }

    this.block.innerHTML = '';
    this.data.forEach((item, index) => {
      const itemContainer = document.createElement('div');
      itemContainer.classList.add(
        'carousel-item',
        `carousel-item-${index + 1}`,
      );

      let renderedItem = this.cardRenderer.renderItem(item);
      renderedItem = Array.isArray(renderedItem)
        ? renderedItem
        : [renderedItem];
      renderedItem.forEach((renderedItemElement) => {
        itemContainer.appendChild(renderedItemElement);
      });
      this.block.appendChild(itemContainer);
    });

    // set initial selected carousel item
    const activeItems = this.block.querySelectorAll(
      '.carousel-item:not(.clone)',
    );
    activeItems[this.currentIndex].classList.add('selected');

    // create autoscrolling animation
    this.autoScroll && this.infiniteScroll
    && (this.intervalId = setInterval(() => { this.nextItem(); }, this.autoScrollInterval));
    this.dotButtons && this.createDotButtons();
    this.navButtons && this.createNavButtons(this.block.parentElement);
    this.infiniteScroll && this.createClones();
    this.addSwipeCapability();
    this.infiniteScroll && this.setInitialScrollingPosition();
    this.cssFiles && (await defaultCSSPromise);
  }
}

/**
 * Create and render default carousel.
 * Best practice: Create a new block and call the function, instead using or modifying this.
 * @param {Element}  block        required - target block
 * @param {Array}    data         optional - a list of data elements.
 *  either a list of objects or a list of divs.
 *  if not provided: the div children of the block are used
 * @param {Object}   config       optional - config object for
 * customizing the rendering and behaviour
 */
export async function createCarousel(block, data, config) {
  const carousel = new Carousel(block, data, config);
  await carousel.render();
  return carousel;
}

function findIndexVal(anchor) {
  const carouselItem = anchor?.parentElement?.parentElement;
  const [, indexVal] = carouselItem?.className?.match(/carousel-item-(\d+)/) || [];
  return indexVal;
}

/**
 * Method to handle datalayer and target events on recommendations card click
 *
 * @param {*} item Careousel item
 * @param {*} anchor selected anchor
 * @param {*} productData Product Data
 * @param {*} totalProducts Total number of products
 */
function handleCardClick(block, anchor, productData, totalProducts) {
  if (block.dataset.blockName !== 'recommendations') {
    return;
  }
  const {
    dataset: { targetId, titleEn: recommendationName },
  } = block;
  targetClickTrackingEvent({ key: targetId, recommendationName });
  datalayerSelectRecommendedItemListEvent(
    productData,
    totalProducts,
    recommendationName,
    findIndexVal(anchor),
  );
}

/**
 * Custom card style config and rendering of carousel items.
 */
export function renderCardItem(item) {
  item.classList.add('card');
  const itemLink = item.querySelector(':scope > div:first-child a');
  if (itemLink) {
    itemLink.textContent = '';
    item.append(itemLink);
    if (this.socialShare) {
      const shareIconEl = this.socialShare.socialShareLink.cloneNode(true);
      const productTitle = item.querySelector(
        ':scope > div:nth-child(2) p',
      )?.textContent;
      item.prepend(shareIconEl);
      shareIconEl.addEventListener('click', async (e) => {
        const { createAndOpenModal } = await import(
          '../social-share/social-share.js'
        );
        e.preventDefault();
        await createAndOpenModal({
          ...this.socialShare.socialShareModal,
          shareTitle: productTitle,
          shareUrl: itemLink.getAttribute('href'),
        });
      });
    }
    item.querySelectorAll(':scope > div').forEach((el) => {
      itemLink.append(el);
    });
  }
  return item;
}

const cardStyleConfig = {
  visibleItems: [
    {
      items: 2,
      condition: () => window.innerWidth < 768,
    },
    {
      items: 4,
    },
  ],
  renderItem: renderCardItem,
  type: 'card',
};

const inlineStyleConfig = {};
function setTextContent(element, englishText, arabicText) {
  if (document.documentElement.lang === 'ar') {
    element.textContent = arabicText;
  } else {
    element.textContent = englishText;
  }
}

function commonStyle(block) {
  return {
    dotButtons: block.classList.contains('dot-buttons'),
    autoScroll: block.classList.contains('auto-scroll'),
    infiniteScroll: block.classList.contains('infinite-scroll'),
    fullPageScroll: block.classList.contains('full-page-scroll'),
    isRTL: document.documentElement.dir === 'rtl',
  };
}
export default async function decorate(block) {
  const blockChildren = [...block.children];
  const showShareIcon = block.classList.contains('social-share');
  let socialShare = null;
  if (showShareIcon) {
    const { loadSocialShareModal, createShareIcon } = await import(
      '../social-share/social-share.js'
    );
    const socialShareModal = await loadSocialShareModal();
    const socialShareLink = await createShareIcon(
      socialShareModal?.socialShareOverlayTitle,
      'icon-share round-icon no-border',
    );
    socialShare = {
      socialShareLink,
      socialShareModal,
    };
    decorateIcons(socialShareLink);
  }
  const commonStyleConfig = Object.assign(commonStyle(block), { socialShare });
  if (block.classList.contains('cards')) {
    await createCarousel(block, blockChildren, {
      ...commonStyleConfig,
      ...cardStyleConfig,
    });
  } else if (block.classList.contains('inline')) {
    if (blockChildren.length <= 4) {
      inlineStyleConfig.visibleItems = [
        {
          items: 1,
          condition: () => window.innerWidth < 768,
        },
        {
          items: blockChildren.length,
        },
      ];
    }
    await createCarousel(block, blockChildren, {
      ...commonStyleConfig,
      ...inlineStyleConfig,
    });
  } else {
    await createCarousel(block, null, commonStyleConfig);
  }
}

export async function decorateDynamicCarousel(block, jsonData) {
  const placeholders = await fetchPlaceholdersForLocale();
  const currencyCode = await getConfigValue('currency');
  block.innerHTML = '';
  /* Creating structure for card consisting Image and Title/Price */
  jsonData.forEach((products) => {
    const { en, ar } = products.productData.name;
    const itemContainer = document.createElement('div');
    const parentLinkImgDiv = document.createElement('div');
    parentLinkImgDiv.classList.add('recommendation-picture');
    const imgSrc = products?.productData?.image_url?.[document.documentElement.lang] || ('/icons/fallback.svg');
    const image = createOptimizedPicture(
      imgSrc,
      false,
      placeholders?.imageUnavailableAltText,
    );
    const anchor = document.createElement('a');
    const firstUrl = window.location.origin + (products?.productData?.url[document.documentElement.lang] || '');
    anchor.href = firstUrl;
    anchor.target = '_self';
    anchor.rel = 'noopener';
    setTextContent(anchor, en, ar);
    parentLinkImgDiv.appendChild(image);
    parentLinkImgDiv.appendChild(anchor);
    const titleDiv = document.createElement('div');
    const titleParagraph = document.createElement('p');
    setTextContent(titleParagraph, en, ar);
    titleDiv.appendChild(titleParagraph);
    if (products.productData.discount > 0) {
      const priceContainer = document.createElement('div');
      priceContainer.classList.add('price-wrapper');
      const originalPriceParagraph = document.createElement('p');
      originalPriceParagraph.classList.add('dynamic-price');
      formatPrice(
        currencyCode,
        products.productData.price,
      ).then((formattedPrice) => {
        originalPriceParagraph.textContent = formattedPrice;
      });

      const specialPriceParagraph = document.createElement('p');
      specialPriceParagraph.classList.add('discount-text');
      formatPrice(
        currencyCode,
        products.productData.special_price,
      ).then((formattedPrice) => {
        specialPriceParagraph.textContent = formattedPrice;
      });

      const discountTextParagraph = document.createElement('p');
      discountTextParagraph.classList.add('discount-text');
      discountTextParagraph.textContent = `${placeholders.plpSave} ${Math.round(
        parseInt(products.productData.discount, 10),
      )}%`;
      priceContainer.appendChild(originalPriceParagraph);
      priceContainer.appendChild(specialPriceParagraph);
      titleDiv.appendChild(priceContainer);
      titleDiv.appendChild(discountTextParagraph);
    } else {
      const priceParagraph = document.createElement('p');
      formatPrice(
        currencyCode,
        products.productData.price,
      ).then((formattedPrice) => {
        priceParagraph.textContent = formattedPrice;
      });
      titleDiv.appendChild(priceParagraph);
    }
    anchor?.addEventListener('click', () => handleCardClick(block, anchor, products, jsonData.length));
    itemContainer.appendChild(parentLinkImgDiv);
    itemContainer.appendChild(titleDiv);
    block.appendChild(itemContainer);
  });

  /* Passing that structure to decorate to build the DOM */
  decorate(block);
}
