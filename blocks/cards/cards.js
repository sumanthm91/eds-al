import { createOptimizedPicture as libCreateOptimizedPicture } from '../../scripts/aem.js';
import { createOptimizedSrc } from '../../scripts/scripts.js';

function createOptimizedPicture(src, alt, lazy, sizes, considerOrigin) {
  if (considerOrigin) {
    const optimizedPicture = libCreateOptimizedPicture(src, alt, lazy, sizes);
    const url = new URL(src, window.location.href);
    const { origin } = url;
    optimizedPicture.querySelectorAll('source').forEach((source) => {
      const path = source.getAttribute('srcset');
      if (path.startsWith('/')) source.setAttribute('srcset', `${origin}${path}`);
    });
    optimizedPicture.querySelectorAll('img').forEach((source) => {
      const path = source.getAttribute('src');
      if (path.startsWith('/')) source.setAttribute('src', `${origin}${path}`);
    });
    return optimizedPicture;
  }
  return libCreateOptimizedPicture(src, alt, lazy, sizes);
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => {
    // if its an absolute url then ask to consider origin while forming picture src
    if (/^https?:\/\//i.test(img.src)) {
      img.closest('picture').replaceWith(createOptimizedPicture(createOptimizedSrc(img.src), img.alt, false, [{ width: '750' }], true));
    } else {
      img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
    }
  });

  const pictures = ul.querySelectorAll('picture');
  pictures.forEach((pic) => {
    const link = pic.parentElement.nextElementSibling.querySelector('a');
    if (link && link.tagName === 'A' && link.href) {
      const listItem = pic.closest('li');
      if (listItem) {
        const listWrapper = listItem.innerHTML;
        listItem.innerHTML = `<a href="${link.href}"></a>${listWrapper}`;
      }
    }
  });

  block.textContent = '';
  block.append(ul);
}
