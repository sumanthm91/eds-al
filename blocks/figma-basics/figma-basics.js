export default function decorate(block) {
  // Get content from block
  const title = block.querySelector('h2')?.textContent || 'Figma basics';

  // Create content wrapper with decorative elements
  const contentWrapper = document.createElement('div');
  contentWrapper.classList.add('content-wrapper');

  // Add corner elements and decorative elements
  contentWrapper.innerHTML = `
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>
    <svg class="wave-decoration" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 50 Q50 0 100 50 Q150 100 200 50" fill="none"/>
      <circle cx="0" cy="50" r="4"/>
      <circle cx="50" cy="0" r="4"/>
      <circle cx="100" cy="50" r="4"/>
      <circle cx="150" cy="100" r="4"/>
      <circle cx="200" cy="50" r="4"/>
    </svg>
    <h2 class="title">${title.toLowerCase()}</h2>
    <div class="rectangle-wrapper rectangle-red-wrapper">
      <div class="rectangle-decoration rectangle-red"></div>
      <div class="rectangle-pointer rectangle-red-pointer"></div>
    </div>
    <div class="rectangle-wrapper rectangle-purple-wrapper">
      <div class="rectangle-pointer rectangle-purple-pointer"></div>
      <div class="rectangle-decoration rectangle-purple"></div>
    </div>
  `;

  // Replace block content
  block.innerHTML = '';
  block.append(contentWrapper);
}
