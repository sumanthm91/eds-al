import { fetchCategories } from '../../scripts/commerce.js';
import { fetchIndex, fetchPlaceholdersForLocale, getLanguageAttr } from '../../scripts/scripts.js';

const fetchDynamicCategories = async () => {
  const { commerce_categories: categories } = await fetchCategories(true);
  let dynamicCategories = [];
  if (categories?.items?.length > 0) {
    dynamicCategories = categories.items[0].children;
  }

  return dynamicCategories;
};

export const fetchStaticCategories = async () => {
  const lang = getLanguageAttr();
  const { data } = await fetchIndex('query-index', `${lang}/`, true);

  if (!data) {
    return [];
  }

  function buildTreeList(paths) {
    const root = {
      path: '/',
      title: '',
      image: '',
      description: '',
      lastModified: '',
      include_in_menu: 1,
      id: '',
      level: 1,
      children: [],
    };

    paths.forEach((item, idx) => {
      const pathParts = item.path.split('/').filter((part) => part !== '');
      let currentNode = root;

      const initialLevel = 2;
      for (let i = 0; i < pathParts.length; i += 1) {
        const part = pathParts[i];
        // Splits the url fragments from the query index to generate parent child relationship
        const fullPath = `${currentNode.path}${currentNode.path === '/' ? '' : '/'}${part}`;
        let childNode = currentNode.children.find((node) => node.path === fullPath);

        if (!childNode) {
          childNode = {
            path: fullPath,
            title: item.title,
            image: item.image,
            description: item.description,
            lastModified: item.lastModified,
            include_in_menu: 1,
            id: `static-${idx}`,
            level: i + initialLevel,
            children: [],
          };
          currentNode.children.push(childNode);
        }

        currentNode = childNode;
      }
    });

    function transformObj(obj) {
      if (obj?.path?.length > 1) {
        obj.url_path = obj.path.substring(1);
        obj.name = obj.title;
        delete obj.path;
        delete obj.title;
      }
      if (obj?.children?.length > 0) {
        obj.children.forEach((child) => transformObj(child));
      }
    }

    root.children.map((item) => transformObj(item));
    return root.children;
  }

  return buildTreeList(data);
};

export const mergeCategories = (category1, category2) => {
  const map = new Map();

  function addToMap(arr) {
    arr.forEach((item) => {
      if (!map.has(item.url_path)) {
        map.set(item.url_path, item);
      } else {
        const existingItem = map.get(item.url_path);
        if (item.children) {
          existingItem.children = existingItem.children
            ? mergeCategories(existingItem.children, item.children)
            : item.children;
        }
      }
    });
  }

  addToMap(category1);
  addToMap(category2);

  return Array.from(map.values());
};

const fetchAllCategories = async () => {
  const [dynamicCategories, staticCategories] = await Promise.all([
    fetchDynamicCategories(),
    fetchStaticCategories(),
  ]);

  return mergeCategories(dynamicCategories, staticCategories);
};

const generateHTML = (categories, viewAllPlaceholder, level = 1) => {
  const lang = getLanguageAttr();

  const ul = document.createElement('ul');
  if (level) {
    ul.classList.add('sitemap-wrapper', `sitemap-level-${level}`);
  }

  categories.forEach((node) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/${lang}/${node.url_path}`;
    a.textContent = node.name;
    li.appendChild(a);

    if (node.display_view_all === 1) {
      const viewAllLink = document.createElement('a');
      viewAllLink.classList.add('view-all');
      viewAllLink.setAttribute('href', `/${lang}/${node.url_path}/view-all`);
      viewAllLink.innerText = viewAllPlaceholder || 'View All';
      li.append(viewAllLink);
      ul.append(li);
    }

    if (node?.children?.length > 0) {
      const nestedUl = generateHTML(node.children, null);
      li.appendChild(nestedUl);
    }

    ul.appendChild(li);
  });

  return ul;
};

export default async function decorate(block) {
  const categories = await fetchAllCategories();
  const placeholders = await fetchPlaceholdersForLocale();
  const { viewAll: viewAllPlaceholder } = placeholders;

  const html = generateHTML(categories, viewAllPlaceholder);
  block.innerHTML = '';
  block.appendChild(html);
}
