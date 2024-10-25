import { createOptimizedPicture } from '../../scripts/scripts.js';

export default function decorate(block) {
  const offerData = {
    h1: block.querySelector('h1')?.textContent,
    h2: block.querySelector('h2')?.textContent,
    h3: block.querySelector('h3')?.textContent,
    p1: block.querySelectorAll('p')[0]?.textContent,
    p2: block.querySelectorAll('p')[1]?.textContent,
    h5: block.querySelector('h5')?.textContent,
    links: Array.from(block.querySelectorAll('p em a')).map(a => ({ href: a.href, text: a.textContent })),
    p3: block.querySelectorAll('p')[block.querySelectorAll('p').length - 1]?.textContent,
  };

  block.innerHTML = `
    <h2>${offerData.h1}</h2>
    <h1>${offerData.h2}</h1>
    <p>${offerData.h3}</p>
    <p>${offerData.p1}</p>
    <p>${offerData.h5}</p>
    <div class="categories">
      ${offerData.links.map(link => `<a href="${link.href}" class="button">${link.text}</a>`).join('')}
    </div>
    <p>${offerData.p3}</p>
  `;
}
