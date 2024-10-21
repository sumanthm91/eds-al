// This script will take the content of the block and create a sidebar from it.
import { fetchCategoriesByUrlKey } from '../../scripts/commerce.js';
import { fetchPlaceholdersForLocale, buildUrlKey, getLanguageAttr } from '../../scripts/scripts.js';
import { getConfigValue } from '../../scripts/configs.js';
import { sendCategoriesToDataLayer, buildCategoryList } from '../../scripts/analytics/google-data-layer.js';

export default async function decorate(block) {
  const placeholders = await fetchPlaceholdersForLocale();
  const { viewAll: viewAllPlaceholder } = placeholders;
  const lang = getLanguageAttr();
  const isSideNavLevel4 = await getConfigValue('is-side-nav-level-4');
  const { classList } = block;

  /**
   * Recursively build the navigation
   * @param {*} category Array of category navigation objects
   * @param {*} viewAll Controls the rendering of View All button
   * @returns HTMLElement
   */
  const buildNavigation = (category, viewAll = false) => {
    const ul = document.createElement('ul');
    ul.classList.add('sidebar-item');
    ul.classList.add(`level-${category.level}`);

    if (category?.children?.length > 0 && category.show_in_lhn === 1) {
      const li = document.createElement('li');
      li.classList.add('sidebar-item-heading');

      if (viewAll) {
        const viewAllLink = document.createElement('a');
        viewAllLink.classList.add('view-all');
        viewAllLink.setAttribute('href', `/${lang}/${category.url_path}/view-all`);
        viewAllLink.innerText = viewAllPlaceholder || 'View All';
        li.append(viewAllLink);
        ul.append(li);
      }

      Object.values(category.children)
        .filter((subCategory) => subCategory.show_in_lhn === 1)
        .map((subCategory) => {
          const subLi = document.createElement('li');
          subLi.classList.add('sidebar-item-heading');
          const a = document.createElement('a');
          const hrefPath = `/${lang}/${subCategory.url_path}`;
          a.setAttribute('href', hrefPath);
          a.innerText = subCategory.name;
          subLi.append(a);
          const navClickedUrl = window.location.pathname;
          if (navClickedUrl === hrefPath) {
            subLi.classList.add('active');
          }

          let displayViewAll = false;
          if (subCategory.display_view_all === 1) {
            displayViewAll = true;
          }
          const subCategoryLevel4Items = navClickedUrl.includes(`/${lang}/${subCategory.url_path}`) || (category.level < 4);
          if (isSideNavLevel4 !== 'false') {
            if (subCategoryLevel4Items || navClickedUrl.includes(`/${lang}/${category.url_path}`)) {
              if (subCategory?.children?.length > 0) {
                subLi.appendChild(buildNavigation(subCategory, displayViewAll));
              }
              ul.append(subLi);
            }
          } else {
            if (subCategory?.children?.length > 0) {
              subLi.appendChild(buildNavigation(subCategory, displayViewAll));
            }
            ul.append(subLi);
          }
          return false;
        });
    }

    return ul;
  };

  const buildDynamicSidebar = async (isPlpSideNav = false) => {
    let urlKey = buildUrlKey();
    if (isPlpSideNav) {
      urlKey = urlKey?.split('/')[0];
    }
    // Fetch the categories from API
    const { commerce_categories: categories } = await fetchCategoriesByUrlKey([urlKey]);

    if (categories?.total_count > 0) {
      if (window.pageType === 'department page') {
        const categoryListName = buildCategoryList(categories);
        sendCategoriesToDataLayer(categoryListName, true);
      }
      const nav = buildNavigation(categories.items[0]);
      return nav;
    }
    return document.createElement('ul');
  };

  const buildStaticGroupedList = (level, listLevel, li) => {
    if (listLevel) {
      const ulSub = document.createElement('ul');
      ulSub.classList.add('sidebar-item');
      ulSub.classList.add(`level-${level}`);
      li.append(ulSub);
      [...listLevel.children].forEach((listItem1) => {
        const anchor = listItem1.querySelector('a');
        const listLevel2 = listItem1.querySelector('ul');
        const liSub = document.createElement('li');
        liSub.classList.add('sidebar-item-heading');

        if (anchor) {
          anchor.classList.remove('button');
          if (anchor.href === (window.location.href || window.location.pathname)) {
            anchor.classList.add('active');
          }
          liSub.append(anchor);
        }
        if (anchor || listLevel2) {
          ulSub.append(liSub);
        }

        if (listLevel2) {
          buildStaticGroupedList(level + 1, listLevel2, liSub);
        }
      });
    }
  };

  const buildStaticGroupedSidebar = () => {
    const ul = document.createElement('ul');
    ul.classList.add('sidebar-item');
    ul.classList.add('level-2');

    [...block.children].forEach((section) => {
      const title = section.querySelector('h3');

      const li = document.createElement('li');
      li.classList.add('sidebar-item-heading');
      ul.append(li);

      if (title) {
        const span = document.createElement('span');
        span.textContent = title.textContent;
        li.append(span);
      }

      buildStaticGroupedList(3, section.querySelector('ul'), li);
    });

    return ul;
  };

  const buildStaticSidebar = () => {
    const anchors = block.querySelectorAll('a');

    const ul = document.createElement('ul');
    ul.classList.add('sidebar-item');
    anchors.forEach((anchor) => {
      anchor.classList.remove('button');
      if (anchor.href === (window.location.href || window.location.pathname)) {
        anchor.classList.add('active');
      }
      const li = document.createElement('li');
      li.classList.add('sidebar-item-heading');
      li.append(anchor);
      ul.append(li);
    });

    return ul;
  };

  let sidebarContent;
  if (classList.contains('dynamic') && !classList.contains('start-level-1')) {
    sidebarContent = await buildDynamicSidebar();
  } else if (classList.contains('start-level-1') && classList.contains('dynamic')) {
    sidebarContent = await buildDynamicSidebar(true);
  } else if (classList.contains('grouped')) {
    sidebarContent = buildStaticGroupedSidebar();
  } else {
    sidebarContent = buildStaticSidebar();
  }
  block.innerHTML = '';
  block.append(sidebarContent);
  const wrapper = block.closest('.sidebar-wrapper');
  let aside = document.querySelector('aside');
  if (!aside) {
    aside = document.createElement('aside');
    aside.appendChild(wrapper);
    const mainWrapper = document.createElement('div');
    mainWrapper.classList.add('main-wrapper');
    const main = document.querySelector('main');
    main.parentNode.insertBefore(mainWrapper, main);
    mainWrapper.appendChild(aside);
    mainWrapper.appendChild(main);
    document.querySelector('.sidebar-container')?.remove();
  }
}
