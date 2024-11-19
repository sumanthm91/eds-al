import { getTimestamp, fetchPlaceholdersForLocale } from '../scripts.js';
import { calcEnvironment } from '../configs.js';
import { decorateIcons } from '../aem.js';
import { datalayerViewBannerEvent, datalayerSelectBannerEvent } from '../analytics/google-data-layer.js';

const env = calcEnvironment();
function setStatus(categoryItem, placeholders) {
  const inactiveBanner = document.createElement('div');
  inactiveBanner.classList.add('inactive-content');

  const ptagEle = document.createElement('p');
  const lockIcon = document.createElement('span');
  lockIcon.className = 'icon icon-lock';

  if (!categoryItem.classList.contains('expired')) {
    categoryItem.classList.add('coming-soon');
    ptagEle.textContent = placeholders.comingSoon || 'Coming Soon';
    categoryItem.parentElement.classList.add('noreverse');
  } else {
    ptagEle.textContent = placeholders.expired || 'Expired';
  }

  inactiveBanner.append(lockIcon, ptagEle);
  categoryItem.appendChild(inactiveBanner);
  decorateIcons(categoryItem);
}

/**
 * function to check if css variable is in inline style or update only its value
 * and retain other style properties
 * @param {*} element
 * @param {*} cssVariable
 * @param {*} value
 */

function setCssVariable(element, variable, value) {
  const style = element.style.cssText;
  const cssVariable = `var(${variable})`;
  if (style.includes(cssVariable)) {
    element.style.cssText = style.replace(new RegExp(`${cssVariable}`, 'g'), value);
  } else {
    element.style.setProperty(variable, value);
  }
}

/**
 * update banner text configurations
 * @param {*} bannerWrapper
 * */
export async function updateBannerTextConfigs(bannerWrapper, isImageBanner) {
  const bannerType = bannerWrapper.classList.contains('progressive-banner-wrapper') ? 'progressive' : 'image';
  try {
    const bannerConfigEndpoint = `/${document.documentElement.lang}/fragments/banners/meta/banner-typography.json${isImageBanner ? `?sheet=${bannerType}` : ''}`;
    const bannerTextConfigs = await fetch(bannerConfigEndpoint).then((res) => res.json());
    bannerTextConfigs?.data.forEach((bannerTextConfig) => {
      const { type } = bannerTextConfig;
      const properties = [
        { key: 'font-size', cssVar: `--size-text-${type}` },
        { key: 'line-height', cssVar: `--line-height-${type}` },
        { key: 'desktop-font-size', cssVar: `--desktop-size-text-${type}` },
        { key: 'desktop-line-height', cssVar: `--desktop-line-height-${type}` },
      ];
      properties.forEach(({ key, cssVar }) => {
        if (bannerTextConfig[key]) {
          const value = (key.indexOf('font-size') !== -1) ? `${bannerTextConfig[key]}px` : bannerTextConfig[key];
          setCssVariable(bannerWrapper, cssVar, value);
        }
      });
    });
  } catch (e) {
    console.error('Error fetching banner typography configurations', e);
  }
}

/**
 * extract css variables and replace the configuration values
 * @param {*} element
 * @param {*} styleConfigurations
 */
function updateStyleConfigs(element) {
  const cssVariables = element.style.cssText.split(';');
  const styleConfigurations = element.querySelector('.style-configurations');
  // remove last element which is empty
  cssVariables.pop();
  cssVariables.forEach((cssVariable) => {
    // find the parent element with innerText the matches cssVariable and update its value
    styleConfigurations.querySelectorAll('p').forEach((pElement) => {
      const [key] = pElement.innerText.split(':');
      if (cssVariable.includes(key)) {
        const trimmedCSSVar = cssVariable.split('--')[1];
        pElement.innerText = trimmedCSSVar;
      }
    });
  });
}

/**
 * get inner text of all p elements of element and convert to inline style
 * @param {*} element
 * @returns
 */
export function getInlineStyle(element) {
  const pElements = element.querySelectorAll('p');
  let inlineStyle = '';
  pElements.forEach((pElement) => {
    const [key, value] = pElement.innerText.split(':');
    inlineStyle += `--${key}:${value};`;
  });
  return inlineStyle;
}

/**
 * Determines whether block with a given expiry date string should be displayed.
 */
export function shouldBeDisplayed(date) {
  const now = getTimestamp();
  if (date !== '') {
    const from = Date.parse(date.trim());
    return now <= from;
  }
  return false;
}

export function getCounterValue(countDownDate) {
  const now = new Date().getTime();
  const distance = countDownDate - now;
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  return { distance, value: `<span>${days}d</span> : <span>${hours}h</span>: <span>${minutes}m</span> : <span>${seconds}s</span>` };
}

/**
 * @param {String} expiryDate
 * @param {HTMLElement} bannerElem
 * @param {Function} callback
 */
export function initExpiryTimer(expiryDate, endCallback, timerCallback) {
  let timerInterval;

  const updateCounter = () => {
    const result = getCounterValue(expiryDate);

    if (result.distance < 0) {
      clearInterval(timerInterval);
      if (endCallback) endCallback();
    } else if (timerCallback) {
      timerCallback(result.value);
    }
  };

  const result = getCounterValue(expiryDate);
  if (result.distance < 0) {
    endCallback();
    return;
  }

  timerInterval = setInterval(updateCounter, 1000);
  // Initial call to set the counter immediately
  updateCounter();
}

export function createSettingsPanel(dataset, block, styles) {
  const settingsPanel = document.createElement('settings-panel');
  settingsPanel.setAttribute('props', JSON.stringify(dataset));
  settingsPanel.setAttribute('styles', styles);
  settingsPanel.addEventListener('CONFIG_UPDATED', (e) => {
    const { cssVariable, data, fieldType } = e.detail;
    if (fieldType !== 'image') {
      setCssVariable(block, cssVariable, data);
      updateStyleConfigs(block);
    } else {
      console.info('Image data:', cssVariable, data);
      block.querySelector(`.${cssVariable.split('--')[1]}-link`)?.setAttribute('href', data);
      block.querySelector(`.${cssVariable.split('--')[1]} img`)?.setAttribute('src', data);
      block.querySelectorAll(`.${cssVariable.split('--')[1]} source`).forEach((source) => {
        source.srcset = data;
      });
    }
  });

  settingsPanel.addEventListener('TOGGLE_EVENT', (e) => {
    document.body.classList.toggle('settings-panel-active', e.detail.isExpanded);
  });
  return settingsPanel;
}

export function scheduleBanner(startDate, endDate, block) {
  const timerElem = block.querySelector('h5');
  if (env !== 'prod') {
    block.classList.add('active');
    return;
  }
  if (startDate && startDate >= new Date().getTime()) {
    block.remove();
  } else {
    block.classList.add('active');
  }

  if (endDate) {
    // If promotion banner has timer
    if (timerElem) {
      initExpiryTimer(endDate, () => {
        block.remove();
      }, (timer) => {
        timerElem.innerHTML = timer;
      });
    } else {
      initExpiryTimer(endDate, () => { block.remove(); });
    }
  }
}

export function scheduleProgressiveBanner(startDate, endDate, block) {
  const timerElem = block.querySelector('.active-category h5');
  if (env !== 'prod') {
    block.classList.add('active');
    return;
  }
  const countDownDate = new Date(timerElem.innerText.trim()).getTime();
  if (startDate && startDate >= new Date().getTime()) {
    block.remove();
  } else {
    block.classList.add('active');
  }
  initExpiryTimer(countDownDate, () => {
    document.dispatchEvent(new CustomEvent('updateBanner'));
  }, () => {
    timerElem.innerHTML = getCounterValue(countDownDate).value;
  });
}

export async function renderPromotionBanner(block, scheduleId) {
  if (env !== 'prod') {
    block.classList.add('active');
    return;
  }

  // Retrieves the promotion data
  fetch('/promotion-schedule.json').then((response) => response.json()).then((data) => {
    if (data.total === 0) return;

    const { data: promotData } = data;
    const activePromo = promotData.find((promo) => promo.schedule_id === scheduleId && promo.status === '1' && promo.channel_web === '1');

    if (!activePromo) return;
    const { start_date: sDate, end_date: eDate } = activePromo;

    const startDate = new Date(sDate).getTime();
    const endDate = new Date(eDate).getTime();
    if (block.classList.contains('progressive-banner')) {
      scheduleProgressiveBanner(startDate, endDate, block);
    } else {
      scheduleBanner(startDate, endDate, block);
    }
  });
}

/**
 * Datalayer events for banner view and select
 */
export function datalayerEvents(bannerHeading, block, scheduleId) {
  const fullBannerCTA = block.querySelector('a.banner-link');
  let ctaList = [];
  // DL View banner event
  if (fullBannerCTA) {
    datalayerViewBannerEvent([bannerHeading], scheduleId, bannerHeading);
  } else {
    ctaList = [...block.querySelectorAll('.button-container > a.button, :scope.slug h3 > a:not([href="#close"])')];
    const ctaNameList = ctaList?.map((button) => button.textContent?.trim());
    datalayerViewBannerEvent(ctaNameList, scheduleId, bannerHeading);
  }
  // DL Select banner event on CTA click
  block.addEventListener('click', ({ target: cta }) => {
    if (cta.tagName === 'A') {
      if (cta.classList.contains('button')) {
        datalayerSelectBannerEvent(
          cta.textContent,
          ctaList.indexOf(cta) + 1,
          scheduleId,
          bannerHeading,
        );
      } else {
        datalayerSelectBannerEvent(cta.title, 1, scheduleId, bannerHeading);
      }
    }
  });
  // DL Select banner event on CTA click in expanded menu for mobile view
  block.nextElementSibling
    ?.addEventListener('click', ({ target: cta }) => {
      if (cta.tagName === 'A' && cta.classList.contains('button')) {
        const index = ctaList.findIndex((el) => el.title === cta.title);
        datalayerSelectBannerEvent(cta.textContent, index + 1, scheduleId, bannerHeading);
      }
    });
}

// Function to fetch HTML content and extract meta data
export async function fetchAndExtractMeta(url) {
  try {
    let doc = document;
    if (url) {
      // Fetch the HTML document from the given URL
      const response = await fetch(url);

      // Ensure the request was successful
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Get the text content of the fetched HTML
      const htmlString = await response.text();

      // Parse the HTML content into a DOM object
      const parser = new DOMParser();
      doc = parser.parseFromString(htmlString, 'text/html');
    }
    // Extract the desired meta tags using querySelector or querySelectorAll
    const scheduleIdMeta = doc.querySelector('meta[name="schedule-id"]');
    const startDateTimeMeta = doc.querySelector('meta[name="start-date-time"]');
    const endDateTimeMeta = doc.querySelector('meta[name="end-date-time"]');

    // Extract the content attribute from each meta tag
    const scheduleId = scheduleIdMeta ? scheduleIdMeta.getAttribute('content') : null;
    const startDateTime = startDateTimeMeta ? startDateTimeMeta.getAttribute('content') : null;
    const endDateTime = endDateTimeMeta ? endDateTimeMeta.getAttribute('content') : null;

    return {
      scheduleId,
      startDate: startDateTime,
      endDate: endDateTime,
    };
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }

  return null;
}

export async function decorateProgressive(block, updateDL) {
  const placeholders = await fetchPlaceholdersForLocale();
  const bannerWrapper = block.closest('.progressive-banner-wrapper');
  const sectionWrapper = block.closest('.section');
  const isSidekickLibrary = document.body.classList.contains('sidekick-library');
  const isMobileView = window.matchMedia('(max-width: 767px)').matches;
  const categoryList = Array.from(block.querySelectorAll(':scope div > div')).slice(0, -1);
  const styleConfigurations = Array.from(block.querySelectorAll(':scope div > div')).slice(-1)[0];
  const content = document.createElement('div');

  categoryList.sort((a, b) => {
    const dateA = new Date(a.querySelector('h5')?.innerText.trim());
    const dateB = new Date(b.querySelector('h5')?.innerText.trim());
    return dateA - dateB;
  });
  const now = new Date();
  let timerDate = '';
  let timerValue = Infinity;
  let nearestActiveIndex = -1;
  categoryList.forEach((categoryItem, index) => {
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('button-group');
    const buttonContainers = categoryItem.querySelectorAll('.button-container');
    categoryItem?.insertBefore(buttonGroup, buttonContainers[0]);
    buttonContainers.forEach((buttonContainer) => {
      buttonGroup.appendChild(buttonContainer);
    });

    const timerElement = categoryItem.querySelector('h5');
    timerDate = new Date(timerElement?.innerText.trim());
    if (now <= timerDate) {
      const timeDifference = Math.abs(timerDate - now);
      if (timeDifference < timerValue) {
        timerValue = timeDifference;
        nearestActiveIndex = index;
      }
    } else {
      categoryItem.classList.add('expired');
    }
    content.appendChild(categoryItem);
  });

  categoryList[nearestActiveIndex]?.classList.add('active-category');
  // eslint-disable-next-line  max-len
  const nonnearestActiveIndices = Object.keys(categoryList).filter((index) => index !== String(nearestActiveIndex));
  nonnearestActiveIndices.forEach((index) => setStatus(categoryList[index], placeholders));

  styleConfigurations?.classList.add('style-configurations');
  content.classList.add('banner-content');
  const categoryLength = content.children.length;
  if (content && categoryLength === 2) content.classList.add('has-two-category');
  const bannerHeading = content.querySelector('h2')?.textContent;

  const bannerBlock = `
    <div class="banner-content-wrapper">
      ${content.outerHTML}
    </div>
    ${styleConfigurations?.outerHTML || ''}
  `;

  if (styleConfigurations) {
    block.style.cssText = getInlineStyle(styleConfigurations);
  }

  if (bannerWrapper) {
    await updateBannerTextConfigs(bannerWrapper, true);
  }

  block.innerHTML = bannerBlock;

  // check if block should be displayed based on expiry date
  const timerElem = bannerWrapper?.querySelector('.active-category h5');
  const pathWrapper = block.closest('.section[data-path]');

  let path;
  if (pathWrapper) {
    ({ path } = pathWrapper.dataset);
  }
  // get meta data from html document from the path
  let scheduleId;
  let startDate;
  let endDate;
  if (path) {
    ({ scheduleId, startDate, endDate } = await fetchAndExtractMeta(path));
  } else {
    ({ scheduleId, startDate, endDate } = await fetchAndExtractMeta());
  }

  if (!timerElem) {
    block.remove(); // remove banner if all categories are expired
  } else if (scheduleId) {
    // Promotion Banners
    renderPromotionBanner(block, scheduleId);
  } else if (startDate || endDate) { // Schedule Banners if start and end date is configured
    const parsedStartDate = new Date(startDate).getTime();
    const parsedEndDate = new Date(endDate).getTime();

    scheduleProgressiveBanner(parsedStartDate, parsedEndDate, block);
  } else if (timerElem && !isSidekickLibrary) {
    // Banner with timer
    timerDate = timerElem.innerText.trim();
    if (shouldBeDisplayed(timerDate)) {
      block.classList.add('active');
    }
    // Updates the timer and removes the banner on expiry time
    const countDownDate = new Date(timerDate).getTime();
    initExpiryTimer(countDownDate, () => {
      block.remove();
    }, () => {
      timerElem.innerHTML = getCounterValue(countDownDate).value;
    });
  } else {
    block.classList.add('active');
  }
  if (updateDL) {
    datalayerEvents(bannerHeading, block, scheduleId);
  }

  // include tools options for block configurations only inside sidekick library
  if (!isMobileView && isSidekickLibrary) {
    // add settings panel for block configurations
    if (sectionWrapper?.dataset?.librarySettings) {
      import('../../tools/settings-panel/src/index.js').then(() => {
        const blockStyles = block.style.cssText;
        const settingsPanel = createSettingsPanel(sectionWrapper?.dataset, block, blockStyles);
        block.appendChild(settingsPanel);
      });
    }
  }
}
