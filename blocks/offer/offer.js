export default function decorate(block) {
  const title = block.querySelector('h1')?.textContent || '';
  const subtitle = block.querySelector('h2')?.textContent || '';
  const description = block.querySelector('h3')?.textContent || '';
  const placeholder = block.querySelector('p:nth-of-type(1)')?.textContent || '';
  const date = block.querySelector('h5')?.textContent || '';

  const categories = [...block.querySelectorAll('p em a')].map((link) => ({
    href: link.href,
    text: link.textContent,
  }));

  const validity = block.querySelector('p:last-of-type')?.textContent || '';

  block.innerHTML = `
    <h2 class="offer-title">${title}</h2>
    <h3 class="offer-subtitle">${subtitle}</h3>
    <p class="offer-description">${description}</p>
    <p class="offer-placeholder">${placeholder}</p>
    <p class="offer-date">${date}</p>
    <div class="offer-categories">
      ${categories.map(category => `<a href="${category.href}" class="offer-category">${category.text}</a>`).join('')}
    </div>
    <p class="offer-validity">${validity}</p>
  `;
}
