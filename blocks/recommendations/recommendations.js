import { decorateDynamicCarousel } from '../carousel/carousel.js';
import { EVENT_QUEUE, targetDisplayEvent } from '../../scripts/target-events.js';
import { recommendationsViewItemList } from '../../scripts/analytics/google-data-layer.js';
import { loadFragment, getLanguageAttr } from '../../scripts/scripts.js';

/**
 * Map to store previously visited tabs
 */
const previouslyVisitedTabs = new Map();

/**
 * loader DOM structre is created for carousel
 * @returns DOM structure
 */
function createSkeletonLoader() {
  let skeletonCards = '';
  const visibleItems = window.innerWidth < 768 ? 2 : 4;
  for (let i = 0; i < visibleItems; i += 1) {
    skeletonCards += `
      <div class="carousel-item carousel-item-${i + 1}">
        <div class="card">
          <div class="skeleton-image"></div>
          <div class="skeleton-text skeleton-text-title"></div>
          <div class="skeleton-text skeleton-text-price"></div>
        </div>
      </div>
    `;
  }
  const skeletonHTML = `
    <div class="skeleton-container">
      ${skeletonCards}
    </div>
  `;
  const skeletonContainer = document.createElement('div');
  skeletonContainer.innerHTML = skeletonHTML;
  return skeletonContainer;
}

/**
 * Add data attributes to the block
 * @param {*} block Block to be decorated
 * @param {*} param list of data attributes to be updated
 */
function updateDataAttributes(block, [targetId, titleEn = '', blockName = 'recommendations']) {
  block.dataset.targetId = targetId;
  block.dataset.titleEn = titleEn;
  block.dataset.blockName = blockName;
}

/**
 * Decorate/update tabbed carousel with selectd tab data
 * @param {*} block
 * @param {*} recommendations New data according to user selected tab
 */
function updateCarouselContainerClasses(block, recommendations) {
  const carouselContainer = block.querySelector('.tabs-panel[aria-hidden="false"] div');
  carouselContainer.classList.add(...block.classList.value.split(' '));
  const { targetId, titleEn, blockName } = block.dataset;
  updateDataAttributes(carouselContainer, [targetId, titleEn, blockName]);
  carouselContainer.parentElement.replaceChildren(carouselContainer);
  decorateDynamicCarousel(carouselContainer, recommendations);
}

/**
 * Get the event data from event queue based on the provided key
 * @param {*} selectedKey
 * @returns
 */
function getRecommendationsData(selectedKey) {
  const eventData = EVENT_QUEUE?.find((el) => el.key === selectedKey)
    ?.data[0]?.data?.content || null;
  try {
    const parsedEventData = JSON.parse(eventData);
    if (parsedEventData?.recommendations?.length > 20) {
      parsedEventData.recommendations.length = 20;
    }
    return parsedEventData;
  } catch {
    return null;
  }
}

/**
 * Send display event for the tab if it is not visited previously.
 * It is applicable only for the tabbed carousel in recommendations block
 * @param {*} selectedTabKey targetId of the currently active tab
 */
function sendTabDisplayEvent(selectedTabKey) {
  if (previouslyVisitedTabs.has(selectedTabKey)) return;
  const eventData = EVENT_QUEUE.find((event) => event.key === selectedTabKey);
  if (!eventData) return;
  targetDisplayEvent([eventData]);
  previouslyVisitedTabs.set(selectedTabKey, true);
}

/**
 * Handle the user tab click, Based on the click decorate carousel block
 * @param {*} event
 * @param {*} block
 * @returns
 */
function handleTabClick(event, block) {
  const { target: { dataset: { tabKey }, classList, textContent } } = event;
  if (classList.contains('tabs-tab')) {
    const selectedTabKey = tabKey;
    const newData = getRecommendationsData(selectedTabKey);
    updateDataAttributes(block, [selectedTabKey, textContent]);
    if (!newData) return;
    updateCarouselContainerClasses(block, newData.recommendations);
    sendTabDisplayEvent(selectedTabKey);
  }
}

/**
 * Handles fallback scenario of not having data for tab at event queue
 * @param {*} block
 */
async function updateTabButtons(block) {
  const tabButtons = block.querySelectorAll('.tabs-tab');
  tabButtons.forEach((button) => {
    const currentTabKey = button.dataset.tabKey;
    const responseDataCheck = EVENT_QUEUE?.find((event) => event.key === currentTabKey)
      ?.data[0]?.data?.content;
    if (!responseDataCheck) {
      button.remove();
    }
  });
  block.querySelectorAll('.tabs-tab')?.[0]?.setAttribute('aria-selected', 'true');
}

/**
 * Creates title structure for recommendations
 * @param {*} title getting title for recommendations
 * @param {*} lang getting global language
 * @returns
 */
function createTitleContainer(title, lang) {
  const recommendationsHeading = document.createElement('h5');
  recommendationsHeading.classList.add('default-content-wrapper');
  recommendationsHeading.textContent = title?.[lang];
  return recommendationsHeading;
}

/**
 * Fun adds title from target response dynamically
 * @param {*} parentDiv getting parent of block
 * @param {*} title getting title from target
 */
function dynamicRecommendationsTitle(parentDiv, title) {
  const lang = getLanguageAttr();
  const recommendationsTitle = parentDiv.querySelector('.default-content-wrapper h5');
  if (recommendationsTitle) {
    recommendationsTitle.textContent = title?.[lang];
  } else if (parentDiv.classList.contains('no-results')) {
    const titleContainer = createTitleContainer(title, lang);
    const noSearchText = parentDiv?.querySelector('.default-content-wrapper p');
    noSearchText?.insertAdjacentElement('afterend', titleContainer);
  } else {
    const titleContainer = createTitleContainer(title, lang);
    parentDiv.prepend(titleContainer);
  }
}

const dataListener = async (block) => {
  if (block.classList.contains('tab')) {
    const recommendationsBlock = await loadFragment(`${block.dataset.tabUrl}`);
    await updateTabButtons(recommendationsBlock);
    block.appendChild(recommendationsBlock);
    const tabList = block.querySelector('.tabs-list');
    tabList?.addEventListener('click', (tabsEvent) => handleTabClick(tabsEvent, block));
    const selectedTab = block.querySelector('.tabs-list button[aria-selected="true"]');
    const selectedTabKey = selectedTab ? selectedTab.dataset.tabKey : null;
    updateDataAttributes(block, [selectedTabKey, selectedTab?.textContent]);
    const tabData = getRecommendationsData(selectedTabKey);
    if (!tabData) return;
    const skeletonContainer = block.querySelector('.skeleton-container');
    skeletonContainer?.remove();
    updateCarouselContainerClasses(block, tabData.recommendations);
    sendTabDisplayEvent(selectedTabKey);
  } else {
    const key = block.dataset.targetId;
    const data = getRecommendationsData(key);
    block.dataset.titleEn = data?.title?.en || 'Recommendations';
    if (!data) {
      block.innerHTML = '';
      return;
    }
    recommendationsViewItemList(data?.recommendations, block.dataset.titleEn);
    block.parentElement.classList.add('carousel-wrapper');
    dynamicRecommendationsTitle(block.parentElement.parentNode, data.title);
    decorateDynamicCarousel(block, data.recommendations);
  }
};

export default async function decorate(block) {
  block.append(createSkeletonLoader());
  window.addEventListener('target-response', () => dataListener(block), { once: true });
}
