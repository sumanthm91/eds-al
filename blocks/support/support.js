export default async function decorate(block) {
  // Get content from block
  const title = block.querySelector('h2')?.textContent || '';
  const description = block.querySelector('h2 + p')?.textContent || '';
  
  // Get all support items
  const supportItems = Array.from(block.querySelectorAll('div > div > div:first-child')).slice(1);
  
  // Map support items to their respective icons
  const iconMap = {
    'Product registration': 'add',
    'Product support': 'computer',
    'Order support': 'support',
    'Repair Request': 'repair',
    'Live Chat': 'chat',
    'Whats app': 'whatsapp',
    'Email Us': 'email',
    'Call Us': 'phone'
  };

  // Create support grid HTML
  const supportGridHTML = supportItems.map(item => {
    const itemTitle = item.querySelector('h3')?.textContent.replace('Order ', '') || '';
    const itemDescription = item.querySelector('p')?.textContent || '';
    const itemUrl = item.parentElement.querySelector('div:last-child a')?.href || '#';
    const iconName = iconMap[itemTitle.trim()] || 'default';
    const actionText = {
      'Product registration': 'Register now',
      'Product support': 'Get support',
      'support': 'Get help',
      'Repair Request': 'Request now',
      'Live Chat': 'Chat now',
      'Whats app': 'Chat on WhatsApp',
      'Email Us': 'Email now',
      'Call Us': 'Call now'
    }[itemTitle.trim()] || 'Learn more';

    return `
      <div class="support-card">
        <div class="icon">
          <img src="/icons/${iconName}.svg" alt="${itemTitle} icon">
        </div>
        <h2>${itemTitle}</h2>
        <p>${itemDescription}</p>
        <a href="${itemUrl}">${actionText} <span class="icon-arrow">→</span></a>
      </div>
    `;
  }).join('');

  // Create final HTML structure
  block.innerHTML = `
    <h1>${title}</h1>
    <p>${description}</p>
    <div class="support-grid">
      ${supportGridHTML}
    </div>
  `;
}
