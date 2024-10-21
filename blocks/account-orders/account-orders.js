import { decorateIcons } from '../../scripts/aem.js';
import { searchOrders } from '../../scripts/order/api.js';
import { getLocale, fetchPlaceholdersForLocale, formatPrice } from '../../scripts/scripts.js';
import {
  getOrderStatus, getOrderProductNames, ORDER_STATUSES,
  formatDateTime, getTotalItemsCount, getCancelledOrderCount,
} from '../account-recent-orders/account-recent-orders.js';

const PAGE_SIZE = 10;
const FILTER_OPTIONS = ['ALL ORDERS', 'CANCELLED', 'COLLECTED', 'DELIVERED', 'DISPATCHED', 'PROCESSING', 'READY_TO_COLLECT', 'REFUNDED', 'RETURNED'];

function convertToCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function hasPagination(orders, page) {
  return orders.total_count > page * PAGE_SIZE;
}

function getSearchString(block) {
  return block.querySelector('.search-input').value;
}

function getSearchFilter(block) {
  const orderState = block.querySelector('.search-filter-select').dataset.filter;

  if (orderState === 'REFUNDED') {
    const allRefunded = [];

    ORDER_STATUSES.REFUNDED.forEach((status) => {
      allRefunded.push(status);
    });
    ORDER_STATUSES.REFUNDED_FULLY.forEach((status) => {
      allRefunded.push(status);
    });
    return allRefunded;
  }
  if (orderState !== 'ALL ORDERS') {
    return ORDER_STATUSES[orderState];
  }
  return '';
}

function decorateOrders(orders, ordersContainer, placeholders, locale) {
  let ordersList = ordersContainer.querySelector('.orders-list');
  if (!ordersList) {
    ordersList = document.createElement('div');
    ordersList.classList.add('orders-list');
    ordersContainer.appendChild(ordersList);
  }
  const lang = document.documentElement.lang || 'en';
  const viewDetailsLink = `/${lang}/user/account/orders/details?orderId=`;

  orders.items.forEach(async (order) => {
    const orderItem = document.createElement('div');
    orderItem.classList.add('order-item');
    orderItem.dataset.orderId = order.entity_id;

    const orderSummary = document.createElement('div');
    orderSummary.classList.add('order-summary');

    const orderNumber = document.createElement('div');
    orderNumber.classList.add('order-number', 'order-header');

    const orderNumberLabel = document.createElement('span');
    orderNumberLabel.classList.add('order-number', 'order-detail-label');
    orderNumberLabel.textContent = placeholders.orderNumber || 'Order ID';

    orderNumber.appendChild(orderNumberLabel);

    const orderNumberText = document.createElement('span');
    orderNumberText.classList.add('order-number', 'order-detail-value');
    orderNumberText.textContent = order.increment_id;

    orderNumber.appendChild(orderNumberText);

    const orderDate = document.createElement('span');
    orderDate.classList.add('order-date', 'order-detail-label');
    formatDateTime(order.created_at, locale).then((formattedDateTime) => {
      orderDate.textContent = formattedDateTime;
    });

    orderNumber.appendChild(orderDate);

    const orderItems = document.createElement('div');
    orderItems.classList.add('order-items', 'order-header');

    const orderItemsDesc = document.createElement('span');
    orderItemsDesc.classList.add('order-items-desc', 'order-detail-value');
    orderItemsDesc.textContent = `${getOrderProductNames(order)}`;

    orderItems.appendChild(orderItemsDesc);
    const orderTotalCount = getTotalItemsCount(order);
    const orderTotalItemsMessage = orderTotalCount > 1 ? placeholders.orderItemsTotal || 'Total {{}} items' : placeholders.orderItemTotal || 'Total {{}} item';

    const orderItemsValue = document.createElement('span');
    orderItemsValue.classList.add('order-items-value', 'order-detail-label');
    orderItemsValue.textContent = orderTotalItemsMessage.replace('{{}}', orderTotalCount);

    orderItems.appendChild(orderItemsValue);

    const cancelledItems = getCancelledOrderCount(order);
    if (cancelledItems > 0) {
      const orderCancelledItemsMessage = placeholders.orderItemsCancelled || '{{}} Cancelled';

      const orderItemsCancelled = document.createElement('span');
      orderItemsCancelled.classList.add('order-items-cancelled', 'order-detail-label');
      orderItemsCancelled.innerHTML = `<a href="#">${orderCancelledItemsMessage.replace('{{}}', cancelledItems)}</a>`;
      orderItems.appendChild(orderItemsCancelled);

      orderItemsCancelled.addEventListener('click', (event) => {
        event.preventDefault();
        const orderItemsCancelledElem = orderItem.querySelector('.order-items-cancelled');
        setTimeout(() => {
          orderItemsCancelledElem.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        }, 100);
      });
    }

    const orderStatus = document.createElement('div');
    orderStatus.classList.add('order-status', 'order-header');

    const orderStatusText = getOrderStatus(order);

    const orderStatusValue = document.createElement('span');
    orderStatusValue.classList.add('order-status', `order-status-${orderStatusText.replaceAll(' ', '-')}`);
    const orderStatusKey = convertToCamelCase(`order-status-${orderStatusText.replaceAll(' ', '-')}`);
    orderStatusValue.textContent = placeholders[orderStatusKey] || orderStatusText;

    orderStatus.appendChild(orderStatusValue);

    const orderTotal = document.createElement('div');
    orderTotal.classList.add('order-total', 'order-header');

    const orderTotalLabel = document.createElement('span');
    orderTotalLabel.classList.add('order-total', 'order-detail-label');
    orderTotalLabel.textContent = placeholders.orderTotal || 'Order Total';

    orderTotal.appendChild(orderTotalLabel);

    const orderTotalValue = document.createElement('span');
    orderTotalValue.classList.add('order-total', 'order-detail-value');
    formatPrice(order.order_currency_code, order.grand_total).then((formattedPrice) => {
      orderTotalValue.textContent = formattedPrice;
    });

    orderTotal.appendChild(orderTotalValue);

    const orderExpand = document.createElement('div');
    orderExpand.classList.add('order-expand');

    const orderExpandLink = document.createElement('a');
    orderExpandLink.classList.add('order-expand-link');
    orderExpandLink.href = `${viewDetailsLink}${order.entity_id}`;
    orderExpandLink.innerHTML = `
        <span class="icon icon-arrow-right"></span>`;

    orderExpand.appendChild(orderExpandLink);

    orderSummary.appendChild(orderNumber);
    orderSummary.appendChild(orderItems);
    orderSummary.appendChild(orderStatus);
    orderSummary.appendChild(orderTotal);
    orderSummary.appendChild(orderExpand);

    orderItem.appendChild(orderSummary);

    ordersList.appendChild(orderItem);

    orderSummary.addEventListener('click', () => {
      window.location.href = `${viewDetailsLink}${order.entity_id}`;
    });
  });

  decorateIcons(ordersList);
}

async function loadMoreOrders(
  searchString,
  orderState,
  ordersContainer,
  loadMoreButton,
  placeholders,
  locale,
) {
  const page = parseInt(loadMoreButton.dataset.page, 10) + 1;
  const orders = await searchOrders(searchString, orderState, page);
  const newOrdersContainer = document.createElement('div');

  decorateOrders(orders, newOrdersContainer, placeholders, locale);

  const ordersList = ordersContainer.querySelector('.orders-list');

  newOrdersContainer.querySelectorAll('.order-item').forEach((orderItem) => {
    ordersList.appendChild(orderItem);
  });

  loadMoreButton.dataset.page = page;

  loadMoreButton.classList.remove('loader');
  if (!hasPagination(orders, page)) {
    loadMoreButton.classList.add('hide');
  }
}

function handleNoResults(block, orders, initialLoad = false) {
  const ordersContainer = block.querySelector('.orders-container');
  const noResultsText = block.querySelector('.no-results-text');
  const ordersList = ordersContainer?.querySelector('.orders-list');
  const emptyContent = ordersContainer?.querySelector('.empty-orders');

  if (ordersList) {
    ordersList.innerHTML = '';
  }

  if (orders?.total_count > 0) {
    ordersContainer?.classList.remove('no-results');
    noResultsText?.classList.add('hide');
    return;
  }

  ordersContainer?.classList.add('no-results');
  if (initialLoad) {
    noResultsText?.classList.add('hide');
    emptyContent?.classList.remove('hide');
  } else {
    noResultsText?.classList.remove('hide');
    emptyContent?.classList.add('hide');
  }
}

function triggerOrderSearch(searchString, orderState, block, placeholders, locale) {
  const ordersContainer = block.querySelector('.orders-container');
  const loadMoreButton = block.querySelector('.load-more-button');

  ordersContainer.classList.add('loading');

  searchOrders(searchString, orderState, 1, PAGE_SIZE).then((orders) => {
    ordersContainer.classList.remove('loading');
    handleNoResults(block, orders);
    if (orders?.total_count > 0) {
      decorateOrders(orders, ordersContainer, placeholders, locale);
      ordersContainer.querySelector('.orders-list');
      if (hasPagination(orders, 1, PAGE_SIZE)) {
        loadMoreButton.dataset.page = 1;
        loadMoreButton.classList.remove('hide');
      } else {
        loadMoreButton.classList.add('hide');
      }
    }
  });
}

function decorateSearchFilter(searchFilterWrapper, placeholders, locale) {
  const { orderFilterAll } = placeholders;

  // filter drop down
  const searchFilter = document.createElement('div');
  searchFilter.classList.add('search-filter');

  const searchFilterLink = document.createElement('a');
  searchFilterLink.classList.add('search-filter-link');
  searchFilterLink.href = '#';

  const searchFilterLabel = document.createElement('span');
  searchFilterLabel.classList.add('search-filter-label');
  searchFilterLabel.textContent = orderFilterAll || 'ALL ORDERS';
  searchFilterLink.appendChild(searchFilterLabel);

  const searchFilterIcon = document.createElement('span');
  searchFilterIcon.classList.add('icon', 'icon-chevron-down');
  searchFilterLink.appendChild(searchFilterIcon);

  searchFilter.appendChild(searchFilterLink);

  const searchFilterList = document.createElement('ul');
  searchFilterList.classList.add('search-filter-select', 'input-drop-down', 'hide');

  FILTER_OPTIONS?.forEach((filter) => {
    const placeholderKey = convertToCamelCase(`order-filter-${filter.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-')}`);
    const filterLabel = placeholders[placeholderKey] || filter;
    const searchFilterItem = document.createElement('li');
    searchFilterItem.classList.add('search-filter-select-item', 'input-drop-down-item');
    searchFilterItem.setAttribute('aria-label', filterLabel);
    searchFilterItem.dataset.filter = filter;

    const searchFilterItemLink = document.createElement('a');
    searchFilterItemLink.classList.add('search-filter-select-link', 'input-drop-down-item-link');
    searchFilterItemLink.setAttribute('aria-label', filterLabel);
    searchFilterItemLink.dataset.filter = filter;
    searchFilterItemLink.href = '#';
    searchFilterItemLink.textContent = filterLabel;
    searchFilterItem.appendChild(searchFilterItemLink);

    searchFilterList.appendChild(searchFilterItem);
  });

  searchFilterList.dataset.filter = searchFilterList.querySelector('.search-filter-select-item:first-child').dataset.filter;

  searchFilterLink.addEventListener('click', (event) => {
    event.preventDefault();
    searchFilter.classList.toggle('open');
  });

  searchFilterList.querySelectorAll('.search-filter-select-item').forEach((filterItem) => {
    filterItem.addEventListener('click', (event) => {
      event.preventDefault();
      searchFilter.classList.toggle('open');
      searchFilterLink.querySelector('.search-filter-label').textContent = filterItem.querySelector('.search-filter-select-link').textContent;

      if (searchFilterList.dataset.filter === filterItem.dataset.filter) {
        return;
      }
      searchFilterList.dataset.filter = filterItem.dataset.filter;
      searchFilterLabel.textContent = filterItem.textContent;
      triggerOrderSearch(
        getSearchString(searchFilterWrapper.closest('.search-bar-wrapper')),
        getSearchFilter(searchFilterWrapper.closest('.search-bar-wrapper')),
        searchFilterWrapper.closest('.account-orders-container'),
        placeholders,
        locale,
      );
    });
  });

  searchFilter.appendChild(searchFilterList);
  searchFilterWrapper.appendChild(searchFilter);
}

function decorateSearchBar(searchBarContainer, placeholders, locale) {
  const { searchOrdersBy, searchOrdersPlaceholder, filterOrders } = placeholders;
  const searchBar = document.createElement('div');
  searchBar.classList.add('search-bar');

  const searchLabel = document.createElement('label');
  searchLabel.classList.add('search-label');
  searchLabel.textContent = searchOrdersBy || 'Search Orders By';
  searchLabel.htmlFor = 'search-order-input';

  const searchInputWrapper = document.createElement('div');
  searchInputWrapper.classList.add('search-input-wrapper');

  const searchInput = document.createElement('input');
  searchInput.classList.add('search-input');
  searchInput.placeholder = searchOrdersPlaceholder || 'ID, Name, SKU';
  searchInput.type = 'text';
  searchInput.id = 'search-order-input';

  const searchButton = document.createElement('span');
  searchButton.classList.add('search-button', 'icon', 'icon-search');

  searchBar.appendChild(searchLabel);
  searchInputWrapper.appendChild(searchInput);
  searchInputWrapper.appendChild(searchButton);
  searchBar.appendChild(searchInputWrapper);

  searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchButton.click();
    }
  });

  searchButton.addEventListener('click', () => {
    triggerOrderSearch(
      getSearchString(searchBarContainer),
      getSearchFilter(searchBarContainer),
      searchBarContainer.closest('.account-orders-container'),
      placeholders,
      locale,
    );
  });

  searchBarContainer.appendChild(searchBar);

  const searchFilter = document.createElement('div');
  searchFilter.classList.add('search-filter-wrapper');

  const filterLabel = document.createElement('label');
  filterLabel.classList.add('filter-label');
  filterLabel.textContent = filterOrders || 'SHOW';
  filterLabel.htmlFor = 'filter-order-select';

  searchFilter.appendChild(filterLabel);
  decorateSearchFilter(searchFilter, placeholders, locale);

  searchBarContainer.appendChild(searchFilter);

  decorateIcons(searchBarContainer);
}

export default async function deocorate(block) {
  const searchString = '';
  const orderState = '';
  const title = block.closest('.account-orders-container').querySelector('h2, h3, h4, h5, h6');
  let emptyContent;
  let secondaryTitle;
  let noResultsText;
  let noteContent;
  const locale = await getLocale();
  const placeholders = await fetchPlaceholdersForLocale();

  const childrenBlocks = block.querySelectorAll('div > div:first-child');
  childrenBlocks.forEach((childBlock, index) => {
    if (index === 1) {
      emptyContent = childBlock;
      return;
    }

    if (index === 2) {
      secondaryTitle = childBlock.querySelector('h2, h3, h4, h5, h6');
      return;
    }

    if (index === 3) {
      noResultsText = childBlock;
      return;
    }

    if (index === 4) {
      noteContent = childBlock;
    }
  });

  block.innerHTML = '';

  const titleWrapper = document.createElement('div');
  titleWrapper.classList.add('title-wrapper');
  titleWrapper.appendChild(title);

  const searchBarWrapper = document.createElement('div');
  searchBarWrapper.classList.add('search-bar-wrapper');

  titleWrapper.appendChild(searchBarWrapper);

  decorateSearchBar(searchBarWrapper, placeholders, locale);

  block.appendChild(titleWrapper);
  if (emptyContent) {
    emptyContent.classList.add('empty-orders', 'hide');
  }
  const ordersContainer = document.createElement('div');
  ordersContainer.classList.add('orders-container');

  block.appendChild(ordersContainer);

  if (secondaryTitle) {
    ordersContainer.appendChild(secondaryTitle);
  }

  if (emptyContent) {
    ordersContainer.appendChild(emptyContent);
  }

  if (noResultsText) {
    noResultsText.classList.add('no-results-text', 'hide');
    ordersContainer.appendChild(noResultsText);
  }

  ordersContainer.classList.add('loading-parent', 'loading');

  const loadingBlock = document.createElement('div');
  loadingBlock.classList.add('loading-block');
  loadingBlock.innerHTML = `
      <div class="loading-spinner">
        <span class="icon icon-ic-loader"></span>
      </div>
    `;
  decorateIcons(loadingBlock);
  ordersContainer.appendChild(loadingBlock);

  searchOrders(searchString, orderState, 1, PAGE_SIZE).then((orders) => {
    ordersContainer.classList.remove('loading');
    if (orders?.total_count === 0) {
      handleNoResults(block, orders, true);
    } else {
      decorateOrders(orders, ordersContainer, placeholders, locale);

      if (hasPagination(orders, 1, PAGE_SIZE)) {
        const loadMoreButton = document.createElement('button');
        loadMoreButton.classList.add('load-more-button', 'secondary');
        loadMoreButton.innerHTML = `<span>${placeholders.orderLoadMore || 'Load More'}</span>`;
        loadMoreButton.dataset.page = 1;
        loadMoreButton.addEventListener('click', async () => {
          loadMoreButton.classList.add('loader');
          loadMoreOrders(
            getSearchString(block),
            getSearchFilter(block),
            ordersContainer,
            loadMoreButton,
            placeholders,
            locale,
          );
        });
        ordersContainer.appendChild(loadMoreButton);
        decorateIcons(loadMoreButton);
      }

      if (noteContent) {
        const note = document.createElement('div');
        note.classList.add('order-notes');
        note.innerHTML = noteContent?.innerHTML || '';
        ordersContainer.appendChild(note);
        decorateIcons(note);
      }

      block.appendChild(ordersContainer);
    }
  });
}
