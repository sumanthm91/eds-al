import { getMetadata, loadBlocks } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

export default async function decorate(main) {
  const sidebarMeta = getMetadata('sidebar');
  const lang = document.documentElement.lang || 'en';
  let sidebarFragmentPath = getMetadata('sidebar-fragment');

  if (sidebarMeta) {
    main.classList.add('sidebar-main');
    if (!sidebarFragmentPath) {
      sidebarFragmentPath = `/${lang}/fragments/sustainability/sidenav`;
    }
    await loadFragment(sidebarFragmentPath);

    const firstSection = main.querySelector('div.main-wrapper div.section:first-child .default-content-wrapper');

    const mainWrapper = document.querySelector('.main-wrapper');

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('content-wrapper');
    mainWrapper.appendChild(contentWrapper);

    const aside = document.querySelector('aside');
    contentWrapper.appendChild(aside);

    contentWrapper.appendChild(main);

    if (firstSection) {
      let heading = firstSection.querySelector('h1, h2, h3, h4, h5, h6');

      // check if there is no other content in section
      if (firstSection.children.length === 1 && heading) {
        heading = firstSection.closest('.section');
      }

      if (heading) {
        const headingDiv = document.createElement('div');
        headingDiv.classList.add('heading-wrapper');
        headingDiv.appendChild(heading);
        mainWrapper.classList.add('main-with-heading');
        mainWrapper.prepend(headingDiv);

        loadBlocks(headingDiv);
      }
    }
  }
  return main;
}
