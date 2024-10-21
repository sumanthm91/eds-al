import { getMetadata } from '../../scripts/aem.js';
import { fetchPlaceholdersForLocale, buildUrlKey, fetchIndex } from '../../scripts/scripts.js';
import {
  getBreadcumbCategories, getBreadcumbCategoriesForProduct, isPDP, isPLP,
} from '../../scripts/commerce.js';
import { sendCategoriesToDataLayer, buildCategoryList } from '../../scripts/analytics/google-data-layer.js';

async function buildBreadcrumbsForHome() {
  const brandLogoLink = document.querySelector('div.brand-logo a');

  const homeUrl = brandLogoLink ? brandLogoLink.href : '/';
  const placeholders = await fetchPlaceholdersForLocale();
  const homePlaceholder = placeholders.breadcrumbsHomeLabel || 'Home';

  return { title: homePlaceholder, url: homeUrl };
}

async function buildBreadcrumbsFromJSON(json) {
  const crumbs = [];

  // add home link
  crumbs.push(await buildBreadcrumbsForHome());

  // TBD : filter out categories which are marked as remove_from_breadcrumb : 1
  json.categories.items[0].breadcrumbs?.forEach((item) => {
    crumbs.push({ title: item.category_name, url: `/${document.documentElement.lang}/${item.category_url_path}` });
  });

  // last link is current page and should not be linked
  if (json.categories.items[0].name) {
    crumbs.push({ title: json.categories.items[0].name, url: null });
  }
  crumbs[crumbs.length - 1]['aria-current'] = 'page';

  return crumbs;
}

async function buildBreadcrumbsFromIndex() {
  const crumbs = [];

  const lang = document.documentElement.lang || 'en';
  const placeholders = await fetchPlaceholdersForLocale();
  const { data } = await fetchIndex('query-index', `${lang}/`, true);

  const { pathname } = window.location;
  const pathParts = pathname.split('/').filter((part) => part);

  let currentPath = '';

  // Helper function to find all page names by path
  function getPageNameByPath(path, idx) {
    const pages = data?.filter((page) => page.path === path && page['hide-from-nav']?.toLowerCase() !== 'true');
    if (pages.length > 0) {
      const page = pages[0];
      const { navtitle, title } = page;
      return (navtitle === '0' ? '' : navtitle) || title;
    }

    // special case for home page part
    if (idx === 0) {
      return placeholders.breadcrumbsHomeLabel || 'Home';
    }
    return '';
  }

  pathParts.forEach((part, idx) => {
    currentPath += `/${part}`;
    const pageName = getPageNameByPath(currentPath, idx);

    if (!pageName) return;
    crumbs.push({ title: pageName, url: currentPath });
  });

  if ((crumbs.length > 0 && crumbs[crumbs.length - 1].url !== window.location.pathname)
    || crumbs.length === 0) {
    const ogtitle = getMetadata('og:title');
    const navtitle = getMetadata('nav-title');
    const title = navtitle || ogtitle;
    crumbs.push({ title, url: window.location.href });
  }

  if (crumbs.length > 1) {
    crumbs[crumbs.length - 1].url = null;
  }
  crumbs[crumbs.length - 1]['aria-current'] = 'page';

  return crumbs;
}

async function getBreadcumbForProductJSON(urlKey) {
  let breadcrumbCategories;
  const productSearch = await getBreadcumbCategoriesForProduct(urlKey);

  if (!productSearch?.productSearch?.items?.length) {
    return null;
  }

  const product = productSearch?.productSearch?.items?.[0]?.productView;

  // get category id from product which is used to get breadcrumb
  const categoryId = product?.attributes?.find((attr) => attr.name === 'breadcrumb_category_id')?.value;

  // extract breadcrumb from product
  if (categoryId) {
    const categories = product?.attributes?.find((attr) => attr.name === 'categories')?.value;
    if (categories) {
      const categoriesJSON = JSON.parse(categories);
      categoriesJSON?.forEach(({
      // eslint-disable-next-line camelcase
        id, name, url_path, breadcrumbs,
      }) => {
        if (id === categoryId) {
          breadcrumbCategories = {
            categories: {
              items: [
                {
                  breadcrumbs,
                  name: product.name,
                },
              ],
            },
          };
          // add category name/url to breadcrumb
          breadcrumbCategories.categories.items[0].breadcrumbs.push({
            category_name: name,
            // eslint-disable-next-line camelcase
            category_url_path: url_path,
          });
        }
      });
    }
  }

  return breadcrumbCategories;
}

export async function buildBreadcrumbs() {
  const breadcrumbs = document.createElement('nav');
  breadcrumbs.className = 'breadcrumbs';

  let breadcrumbCategories;

  // fetch metadata to determine template
  const template = getMetadata('template')?.toLowerCase().trim() || '';

  if (template === 'department' || isPLP()) {
    breadcrumbCategories = await getBreadcumbCategories(buildUrlKey());
    if (!breadcrumbCategories) {
      return null;
    }

    if (breadcrumbCategories?.commerce_categories) {
      const { commerce_categories: categories } = breadcrumbCategories;
      breadcrumbCategories = {
        categories,
      };
      if (!document.querySelector('.sidebar-wrapper .sidebar .sidebar-item')) {
        const categoryListName = buildCategoryList(categories);
        sendCategoriesToDataLayer(categoryListName, true);
      }
    }
  } else if (isPDP()) {
    breadcrumbCategories = await getBreadcumbForProductJSON(buildUrlKey());
    if (!breadcrumbCategories) {
      return null;
    }
  }

  let crumbs;
  if (breadcrumbCategories && breadcrumbCategories.categories.items
    && breadcrumbCategories.categories.items.length > 0) {
    crumbs = await buildBreadcrumbsFromJSON(
      breadcrumbCategories,
      document.location.href,
    );
  } else {
    crumbs = await buildBreadcrumbsFromIndex(document.location.href);
  }

  const ol = document.createElement('ol');
  ol.setAttribute('itemscope', '');
  ol.setAttribute('itemtype', 'https://schema.org/BreadcrumbList');
  ol.append(...crumbs.map((item, idx) => {
    const li = document.createElement('li');
    li.setAttribute('itemprop', 'itemListElement');
    li.setAttribute('itemscope', '');
    li.setAttribute('itemtype', 'https://schema.org/ListItem');
    if (item['aria-current']) li.setAttribute('aria-current', item['aria-current']);
    const meta = document.createElement('meta');
    meta.setAttribute('itemprop', 'position');
    meta.content = idx + 1;
    li.append(meta);
    const span = document.createElement('span');
    span.textContent = item.title;
    span.setAttribute('itemprop', 'title');

    if (item.url) {
      const a = document.createElement('a');
      a.href = item.url;
      a.title = item.title;
      a.setAttribute('itemprop', 'url');
      a.append(span);
      li.append(a);
    } else {
      li.append(span);
    }
    return li;
  }));

  breadcrumbs.append(ol);
  return breadcrumbs;
}

export default async function decorate(block) {
  const breadcrumbs = await buildBreadcrumbs();
  if (breadcrumbs) {
    block.append(breadcrumbs);
  }
}
