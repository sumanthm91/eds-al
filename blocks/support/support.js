export default function decorate(block) {
  // Extract header content
  const headerDiv = block.children[0];
  const headerContent = headerDiv?.querySelector('div');
  const headerTitle = headerContent?.querySelector('h2')?.textContent.replace(/<\/?strong>/g, '') || 'Need help?';
  const headerText = headerContent?.querySelector('p')?.firstChild?.textContent?.trim() || 'We\'re here to provide all the help you need.';
  const headerLink = headerContent?.querySelector('a');
  const headerLinkHref = headerLink?.getAttribute('href') || '#';

  // Create support items array from remaining divs
  const supportItems = [];
  for (let i = 1; i < block.children.length; i++) {
    const item = block.children[i];
    const itemContent = item.querySelector('div');
    
    if (!itemContent) continue;

    const titleEl = itemContent.querySelector('h3');
    const title = titleEl?.textContent.replace(/<\/?strong>/g, '').trim() || '';
    const description = itemContent.querySelector('p')?.textContent.trim() || '';
    const link = item.querySelector('a:last-child');
    const linkHref = link?.getAttribute('href') || '#';
    
    // Extract link text from title, removing 'support' if present
    let linkText = title.replace(/\s*support\s*$/i, '').trim();
    
    // If title is empty or just contained 'support', use a default
    if (!linkText) {
      linkText = description.split('.')[0].trim() || 'Learn More';
    }

    supportItems.push({
      title,
      description,
      linkHref,
      linkText
    });
  }

  // Build new HTML structure
  const newHtml = `
    <div class="support-header">
      <h2>${headerTitle}</h2>
      <p>${headerText}</p>
      <a href="${headerLinkHref}" class="support-cta">Get Support</a>
    </div>
    <div class="support-grid">
      ${supportItems.map(item => `
        <div class="support-item">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <a href="${item.linkHref}">${item.linkText}</a>
        </div>
      `).join('')}
    </div>
  `;

  // Replace block content
  block.innerHTML = newHtml;
}
