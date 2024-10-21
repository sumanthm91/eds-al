import { buildBlock, getMetadata, loadBlocks } from '../../scripts/aem.js';
import { decorateMain, loadFragment } from '../../scripts/scripts.js';

export default async function decorate(main) {
  const sidebarMeta = getMetadata('sidebar');
  const sidebarFragmentPath = getMetadata('sidebar-fragment');

  if (sidebarMeta && sidebarMeta !== 'fragment') {
    const aside = document.createElement('aside');
    const asideDiv = document.createElement('div');
    const mainWrapper = document.createElement('div');
    mainWrapper.classList.add('main-wrapper');
    main.parentNode.insertBefore(mainWrapper, main);
    mainWrapper.appendChild(aside);
    mainWrapper.appendChild(main);
    aside.appendChild(asideDiv);
    main.classList.add('sidebar-main');
    const sidebarBlock = buildBlock('sidebar', []);
    sidebarBlock.classList.add(sidebarMeta);
    asideDiv.append(sidebarBlock);
    decorateMain(aside);
    loadBlocks(aside);
  } else if (sidebarMeta && sidebarMeta === 'fragment' && sidebarFragmentPath) {
    main.classList.add('sidebar-main');
    loadFragment(sidebarFragmentPath);
  }
  return main;
}
