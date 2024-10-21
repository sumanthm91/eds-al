import { isLoggedInUser, fetchPlaceholdersForLocale, formatDateToCurrentLocale } from '../../scripts/scripts.js';
import { getAPCTransactions, getAPCCustomerData } from '../../scripts/hellomember/api.js';
import { decorateIcons } from '../../scripts/aem.js';

const PAGE_SIZE = 10;

async function formatDate(date) {
  const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
  return formatDateToCurrentLocale(date, options);
}

function decorateTransactions(parent, transactions, placeholders) {
  if (transactions?.apc_transactions?.length === 0) {
    return;
  }
  transactions?.apc_transactions?.forEach(async (transaction, index) => {
    if (index >= PAGE_SIZE) {
      return;
    }
    const pointsRow = document.createElement('div');
    pointsRow.classList.add('history-points-row');
    pointsRow.innerHTML = `
          <div class="purchase-store">
              <h5 class="history-dark-title">${transaction.channel}</h5>
              <p class="history-light-title">${transaction.location_name}</p>
          </div>
          <div class="points-date">${await formatDate(transaction.date)}</div>
          <div class="points-earned">
              <p class="history-light-title">${placeholders.helloMemberPointsEarned || 'Points earned'}</p>
              <p>${transaction.points}</p>
          </div>
        `;
    parent.appendChild(pointsRow);
  });
}

async function loadMoreTransactions(parent, loadMoreButton, placeholders) {
  const numOfTransactions = parent.querySelectorAll('.history-points-row')?.length;

  const newTransactions = await getAPCTransactions('hello_member', numOfTransactions + 1, PAGE_SIZE + 1);

  decorateTransactions(parent, newTransactions, placeholders);

  if (newTransactions?.apc_transactions?.length <= PAGE_SIZE) {
    loadMoreButton.remove();
  }
}

function decorateHistoryTable(parent, transactions, placeholders) {
  if (transactions?.apc_transactions?.length === 0) {
    return;
  }

  const pointsWrapper = document.createElement('div');
  pointsWrapper.classList.add('my-points-history-wrapper');

  decorateTransactions(pointsWrapper, transactions, placeholders);

  const pointsButtonWrapper = document.createElement('div');
  pointsButtonWrapper.classList.add('my-points-button-wrapper');

  if (transactions?.apc_transactions?.length > PAGE_SIZE) {
    const loadMoreButton = document.createElement('button');
    loadMoreButton.innerHTML = `
          <span>${placeholders.helloMemberLoadMore || 'Load More'}</span>`;
    pointsButtonWrapper.appendChild(loadMoreButton);

    loadMoreButton.addEventListener('click', async () => {
      loadMoreButton.classList.add('loader');
      await loadMoreTransactions(pointsWrapper, loadMoreButton, placeholders);
      if (loadMoreButton) {
        loadMoreButton.classList.remove('loader');
      }
    });
  }

  parent.appendChild(pointsWrapper);
  parent.appendChild(pointsButtonWrapper);
}

function decorateAccordion(parent, placeholders, pointsEarned, accordionTextContent) {
  const accordion = document.createElement('div');
  accordion.classList.add('points-accordion');
  const accordionHeader = document.createElement('div');
  accordionHeader.classList.add('points-accordion-header');
  accordionHeader.innerHTML = `
        <span>${placeholders.helloMemberPointsLabel || 'Points'}</span>
        <span>&nbsp;</span>
        <span class="point-value">${(placeholders.helloMemberPts || '{{}} pt').replace('{{}}', pointsEarned?.total || '0')}</span>
      `;

  const accordionContent = document.createElement('div');
  accordionContent.classList.add('points-accordion-content');

  const accordionCategory = document.createElement('div');
  accordionCategory.classList.add('points-earned-category');
  accordionCategory.innerHTML = `
        <div class="points-earned">
            <span>${placeholders.helloMemberCategoryPurchase || 'Purchase'}</span>
            <span>&nbsp;</span>
            <span>${(placeholders.helloMemberPts || '{{}} pt').replace('{{}}', pointsEarned?.purchase || '0')}</span>
        </div>
        <div class="points-earned">
            <span>${placeholders.helloMemberCategoryRatingReview || 'Submit Rating and Review'}</span>
            <span>&nbsp;</span>
            <span>${(placeholders.helloMemberPts || '{{}} pt').replace('{{}}', pointsEarned?.rating_review || '0')}</span>
        </div>
        <div class="points-earned">
            <span>${placeholders.helloMemberCategoryProfileComplete || 'Complete your profile'}</span>
            <span>&nbsp;</span>
            <span>${(placeholders.helloMemberPts || '{{}} pt').replace('{{}}', pointsEarned?.profile_complete || '0')}</span>
        </div>
        `;

  const accordionFooter = document.createElement('div');
  accordionFooter.classList.add('points-accordion-footer');
  accordionFooter.innerHTML = accordionTextContent;

  accordionContent.appendChild(accordionCategory);
  accordionContent.appendChild(accordionFooter);

  accordion.appendChild(accordionHeader);
  accordion.appendChild(accordionContent);
  parent.appendChild(accordion);

  accordionHeader.addEventListener('click', () => {
    accordionContent.classList.toggle('open');
    accordionHeader.classList.toggle('open');
    if (accordionContent.classList.contains('open')) {
      accordionContent.style.height = `${accordionContent.scrollHeight}px`;
    } else {
      accordionContent.style.height = null;
    }
  });
}

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  const redirectUrl = `/${lang}/user/login`;

  if (!isLoggedInUser()) {
    window.location = redirectUrl;
  }

  const placeholders = await fetchPlaceholdersForLocale();

  const accordionTextContent = block.innerHTML;

  block.innerHTML = '';

  block.classList.add('loading-parent', 'loading');

  const loadingBlock = document.createElement('div');
  loadingBlock.classList.add('loading-block');
  loadingBlock.innerHTML = `
      <div class="loading-spinner">
        <span class="icon icon-ic-loader"></span>
      </div>
    `;
  decorateIcons(loadingBlock);
  block.appendChild(loadingBlock);

  const {
    helloMemberPoints: helloMemberPointsPlaceholder,
    helloMemberRenewSubtitle,
  } = placeholders;

  const apcCustomerDataPromise = getAPCCustomerData();

  const apcTransactionsPromise = getAPCTransactions('hello_member', 1, PAGE_SIZE + 1);

  Promise.all([apcCustomerDataPromise, apcTransactionsPromise])
    .then(async ([apcCustomerData, apcTransactions]) => {
      const helloMemberWrapper = document.createElement('div');
      helloMemberWrapper.classList.add('hello-member-wrapper');

      const pointsEarned = apcCustomerData?.extension_attributes?.member_points_earned;

      if (pointsEarned) {
        const {
          total,
          expiry_date: expiryDate,
        } = pointsEarned;

        if (total > 0) {
          const helloMemberHeader = document.createElement('div');
          helloMemberHeader.classList.add('hello-member-header');
          helloMemberHeader.innerHTML = `
              <h5>${(helloMemberPointsPlaceholder || '{{}} Points').replace('{{}}', total)}</h5>
              <span>${(helloMemberRenewSubtitle || 'Your membership will be renewed on {{}} and points will be reset every year.').replace('{{}}', expiryDate)}</span>
            `;

          helloMemberWrapper.appendChild(helloMemberHeader);
        }
      }

      decorateAccordion(helloMemberWrapper, placeholders, pointsEarned, accordionTextContent);
      decorateHistoryTable(helloMemberWrapper, apcTransactions, placeholders);

      block.appendChild(helloMemberWrapper);
      block.classList.remove('loading');
    });
}
