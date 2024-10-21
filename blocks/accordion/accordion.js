/*
 * Accordion Block
 * Recreate an accordion
 * https://www.aem.live/developer/block-collection/accordion
 */
import { loadFragment } from '../../scripts/scripts.js';

function toggleAccordionItem(e) {
  const item = e.currentTarget;
  const detail = item.closest('details');
  // if current item is not open then first close all other items
  if (detail && !detail.hasAttribute('open')) {
    document.querySelectorAll('details.accordion-item').forEach((accordion) => {
      accordion.removeAttribute('open');
    });
  }
}

function displayAllAccordionItem() {
  document.querySelectorAll('details.accordion-item').forEach((accordion) => {
    accordion.setAttribute('open', 'open');
  });
}

function hasWrapper(el) {
  return !!el.firstElementChild && window.getComputedStyle(el.firstElementChild).display === 'block';
}

export default function decorate(block) {
  const isSingleOpen = block.classList.contains('single-open');
  const isExpandAll = block.classList.contains('expand-all');
  const isFragment = block.classList.contains('fragment');
  [...block.children].forEach((row) => {
    // decorate accordion item label
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);

    // decorate accordion item body
    const body = row.children[1];
    body.className = 'accordion-item-body';
    if (!hasWrapper(body)) {
      body.innerHTML = `<p>${body.innerHTML}</p>`;
    }

    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);

    // add click event listener to toggle accordion item if 'single-open' class is present
    if (isSingleOpen) {
      summary.addEventListener('click', toggleAccordionItem);
    }
  });

  if (isFragment) {
    // load accordion content
    block.querySelectorAll('.accordion-item-body a').forEach(async (link) => {
      const path = link ? link.getAttribute('href') : '';

      if (path === '') return;
      const accordionDetail = link.closest('.accordion-item-body');
      const fragment = await loadFragment(path);

      // decorate footer DOM
      const content = document.createElement('div');
      content.append(fragment);
      accordionDetail.innerHTML = '';
      accordionDetail.append(content);
    });
  }

  // expand all the accordions on page load
  if (isExpandAll) {
    displayAllAccordionItem();
  }
}
