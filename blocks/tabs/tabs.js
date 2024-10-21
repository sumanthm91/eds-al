// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

function hasWrapper(el) {
  return !!el.firstElementChild && window.getComputedStyle(el.firstElementChild).display === 'block';
}

export default async function decorate(block) {
  // build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const isFragment = block.classList.contains('fragment');

  // decorate tabs and tabpanels
  const tabs = [...block.children].map((child) => child.firstElementChild);
  tabs.forEach((tab, i) => {
    const id = toClassName(tab.textContent);

    // decorate tabpanel
    const tabpanel = block.children[i];
    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');
    if (!isFragment && !hasWrapper(tabpanel.lastElementChild)) {
      tabpanel.lastElementChild.innerHTML = `<p>${tabpanel.lastElementChild.innerHTML}</p>`;
    }

    // build tab button
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tab.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.dataset.tabKey = tabpanel.lastElementChild.textContent;
    button.addEventListener('click', () => {
      document.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      document.querySelector('.tabs-list')?.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      document.querySelector(`#${button.getAttribute('aria-controls')}`)?.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });

    tablist.append(button);
    tab.remove();
  });

  // if tab is fragment type then the content is loaded from fragment
  if (isFragment) {
    // load tabpanel content
    block.querySelectorAll('[role=tabpanel] a').forEach(async (link) => {
      const path = link ? link.getAttribute('href') : '';

      if (path === '') return;
      const tabPanel = link.closest('[role=tabpanel]');
      const fragment = await loadFragment(path);

      // decorate footer DOM
      const content = document.createElement('div');
      content.append(fragment);
      tabPanel.innerHTML = '';
      tabPanel.append(content);
    });
  }

  block.prepend(tablist);
}
