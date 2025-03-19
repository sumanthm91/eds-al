/*
 * Potential Block
 * Display career potential information with image and text
 */

export default function decorate(block) {
  const content = block.querySelector('div');
  if (content) {
    // Extract image and text content
    const imageDiv = content.querySelector('div:first-child');
    const textDiv = content.querySelector('div:nth-child(2)');

    // Create the inner structure
    const innerDiv = document.createElement('div');
    
    // Add image section if it exists
    if (imageDiv) {
      const imageSection = document.createElement('div');
      const picture = imageDiv.querySelector('picture');
      if (picture) {
        imageSection.appendChild(picture.cloneNode(true));
      }
      innerDiv.appendChild(imageSection);
    }

    // Add text section if it exists
    if (textDiv) {
      const textSection = document.createElement('div');
      const [heading, paragraph] = ['h2', 'p'].map(tag => textDiv.querySelector(tag));

      [heading, paragraph].forEach(element => {
        if (element) textSection.appendChild(element.cloneNode(true));
      });
      innerDiv.appendChild(textSection);
    }

    // Replace block content with new structure
    block.textContent = '';
    block.appendChild(innerDiv);
  }
}
