import { decorateIcons, loadCSS } from '../../scripts/aem.js';
import {
  loadFragment, createModalFromContent, openModal, fetchPlaceholdersForLocale,
} from '../../scripts/scripts.js';
import { getConfigValue } from '../../scripts/configs.js';
import { datalayerSocialShareEvent } from '../../scripts/analytics/google-data-layer.js';

export const SOCIAL_SHARE_DIALOG_ID = 'social-share-dialog';

/**
 * Method to copy given string to clipboard
 * @param {*} text Text string to be copied to the clipboard
 */
async function copyContent(text) {
  try {
    await navigator.clipboard.writeText(text);
    /* Resolved - text copied to clipboard successfully */
  } catch (err) {
    /* Rejected - text failed to copy to the clipboard */
  }
}

/**
 * Method to show copy message on the copy button
 * @param {*} copyBtn Copy button node
 */
function showCopyMessage(copyBtn) {
  copyBtn.classList.add('copied');
  setTimeout(() => {
    copyBtn.classList.remove('copied');
  }, 2500);
}

/**
 * Method to create Share icon
 * @param {*} titleText Aria-label text for accessibility
 * @param {*} iconClass Icon name
 * @returns
 */
export async function createShareIcon(titleText, iconClass = 'icon-share') {
  const { share } = await fetchPlaceholdersForLocale();
  const socialShareLink = document.createElement('a');
  socialShareLink.classList.add('social-share-link');
  socialShareLink.setAttribute('href', '#');
  socialShareLink.setAttribute('aria-label', titleText || share);
  socialShareLink.innerHTML = `<span class="icon ${iconClass}"></span>`;
  return socialShareLink;
}

/**
 * Method to create the Modal Content displaying various social media platforms
 * @param {*} block
 * @param {*} placeholders
 * @returns
 */
async function createModalContent(block) {
  const url = window.location.href;
  const placeholders = await fetchPlaceholdersForLocale();
  const { share, copyPageLink, pageLinkCopied } = placeholders;
  const socialShareOverlayTitleEl = block.querySelector(
    'div:nth-child(2) > div > p:first-child',
  );
  const socialShareOverlayTitle = socialShareOverlayTitleEl
    ? socialShareOverlayTitleEl.textContent
    : share;

  const socialShareList = [];
  const socialShareListElement = block.querySelector('div:last-child ul'); // List of icons with links

  if (socialShareListElement) {
    socialShareListElement.querySelectorAll('li').forEach((li) => {
      const link = li.querySelector('a');
      const icon = link?.querySelector('span');
      const type = icon?.classList[1] || '';
      const title = icon?.textContent || placeholders[type.split('-')[1]];
      const href = link.getAttribute('href');

      if (type && type !== '') {
        socialShareList.push({ title, type, href });
      }
    });
  }

  const socialShareOverlay = document.createElement('div');
  socialShareOverlay.classList.add(...block.classList);
  const socialShareOverlayListWrapper = document.createElement('div');
  socialShareOverlayListWrapper.classList.add(
    'social-share-overlay-list-wrapper',
  );
  socialShareOverlay.appendChild(socialShareOverlayListWrapper);
  const socialShareOverlayList = document.createElement('ul');

  socialShareList.forEach((item) => {
    const socialShareOverlayItem = document.createElement('li');
    const socialShareOverlayLink = document.createElement('a');
    socialShareOverlayLink.setAttribute('target', '_blank');
    socialShareOverlayLink.setAttribute('href', item.href);
    socialShareOverlayLink.setAttribute('title', item.title);
    socialShareOverlayLink.setAttribute('aria-label', item.title);
    socialShareOverlayLink.innerHTML = `<span class="icon ${item.type}"></span>`;
    socialShareOverlayItem.appendChild(socialShareOverlayLink);
    socialShareOverlayList.appendChild(socialShareOverlayItem);
  });

  // Copy page Link button
  const socialShareOverlayCopyBtn = document.createElement('button');
  socialShareOverlayCopyBtn.addEventListener('click', () => {
    showCopyMessage(socialShareOverlayCopyBtn);
    copyContent(url);
  });
  socialShareOverlayCopyBtn.classList.add('social-share-overlay-copy-btn');
  socialShareOverlayCopyBtn.setAttribute('aria-label', copyPageLink);
  socialShareOverlayCopyBtn.innerHTML = `<span>${copyPageLink}</span><span class='copy-msg'>${pageLinkCopied}</span>`;
  socialShareOverlayList.appendChild(socialShareOverlayCopyBtn);

  socialShareOverlayListWrapper.appendChild(socialShareOverlayList);
  decorateIcons(socialShareOverlay);

  return {
    socialShareOverlayTitle,
    socialShareOverlay,
  };
}

/**
 * Method to open modal using the common modal block
 * @param {Object} param Object containing modal title and content
 */
export async function createModal({
  socialShareOverlayTitle,
  socialShareOverlay,
  shareUrl,
  shareTitle,
}) {
  const url = shareUrl ?? window.location.href;
  const pageTitle = shareTitle ?? document.head.querySelector('title').textContent;

  /* Icon link URL contains {PAGE_URL} & {PAGE_TITLE} provided by author as static strings,
   which get replaced with the actual values */
  socialShareOverlay.querySelectorAll('li > a')?.forEach((link) => {
    let href = link.getAttribute('href');
    href = href.replace('%7BPAGE_URL%7D', url);
    href = href.replace('%7BPAGE_TITLE%7D', encodeURIComponent(pageTitle));
    link.setAttribute('href', href);
  });

  await createModalFromContent(SOCIAL_SHARE_DIALOG_ID, socialShareOverlayTitle, socialShareOverlay.outerHTML, '');
  const socialLinks = document.querySelectorAll('.social-share-overlay-list-wrapper a');
  socialLinks.forEach((item) => {
    item.addEventListener('click', () => {
      const title = item.getAttribute('title');
      datalayerSocialShareEvent(title);
    });
  });
  const copyBtn = document.querySelector('.social-share-overlay-copy-btn');
  copyBtn?.addEventListener('click', () => {
    showCopyMessage(copyBtn);
    copyContent(window.location.href);
    datalayerSocialShareEvent('copy link');
  });
}

export async function createAndOpenModal({
  socialShareOverlayTitle,
  socialShareOverlay,
  shareUrl,
  shareTitle,
}) {
  const existingModal = document.getElementById(SOCIAL_SHARE_DIALOG_ID);
  if (existingModal) {
    existingModal.remove();
  }
  await createModal({
    socialShareOverlayTitle,
    socialShareOverlay,
    shareUrl,
    shareTitle,
  });
  openModal(SOCIAL_SHARE_DIALOG_ID);
}

// Decorates the social share block
export default async function decorate(block) {
  const { share } = await fetchPlaceholdersForLocale();
  const iconElement = block.querySelector('div:first-child .icon');
  const titleElement = block.querySelector('div:first-child p:first-child');
  let iconClass;
  let socialShareTitleText;

  if (iconElement) {
    iconClass = iconElement?.classList[1] || 'icon-share';
    socialShareTitleText = titleElement?.textContent || share;
  }

  const { socialShareOverlayTitle, socialShareOverlay } = await createModalContent(block);

  // Share Icon
  const socialShareLink = await createShareIcon(socialShareTitleText, iconClass);

  block.innerHTML = '';
  block.appendChild(socialShareLink);

  socialShareLink.addEventListener('click', async (e) => {
    e.preventDefault();
    openModal(SOCIAL_SHARE_DIALOG_ID);
    datalayerSocialShareEvent('open');
  });
  decorateIcons(block);

  window.addEventListener('delayed-loaded', () => {
    createModal({ socialShareOverlayTitle, socialShareOverlay });
  });
}

/**
 * Method to create social share modal from the content with path defined in config
 * @returns Social share Modal content
 */
export async function loadSocialShareModal() {
  const path = await getConfigValue('social-share-content-path');
  const lang = document.documentElement.lang || 'en';
  const resp = await fetch(`/${lang}${path}.plain.html`);
  if (resp.ok) {
    const block = document.createElement('div');
    block.classList.add('social-share');
    block.innerHTML = await resp.text();
    const socialOverlayContent = createModalContent(block);

    await loadCSS('/blocks/social-share/social-share.css');
    return socialOverlayContent;
  }
  return null;
}

/**
 * Method to internally load Social Share block with icon and modal,
 * from content with path in config, using fragment
 * @returns
 */
export async function loadSocialShareBlock() {
  const path = await getConfigValue('social-share-content-path');
  const lang = document.documentElement.lang || 'en';
  const block = await loadFragment(`/${lang}${path}`);
  return block?.firstElementChild;
}
