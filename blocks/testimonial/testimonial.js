import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'testimonial-list';

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'testimonial-item';

    const [imageDiv, contentDiv] = row.children;
    
    // Handle image
    if (imageDiv.querySelector('picture')) {
      const picture = imageDiv.querySelector('picture');
      const img = picture.querySelector('img');
      const testimonialImage = document.createElement('div');
      testimonialImage.className = 'testimonial-image';
      testimonialImage.appendChild(
        createOptimizedPicture(img.src, img.alt || '', false, [{ width: '240' }])
      );
      li.appendChild(testimonialImage);
    }

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'testimonial-content';

    // Add star rating
    const starsDiv = document.createElement('div');
    starsDiv.className = 'testimonial-stars';
    starsDiv.textContent = '★★★★★';
    contentWrapper.appendChild(starsDiv);

    // Handle content
    if (contentDiv) {
      const paragraphs = contentDiv.querySelectorAll('p');
      if (paragraphs.length >= 2) {
        // First paragraph contains testimonial text and author name
        const [testimonialAndAuthor, company] = paragraphs;
        const parts = testimonialAndAuthor.innerHTML.split('<br><br>');
        
        if (parts.length >= 2) {
          const [testimonialText, author] = parts;
          
          // Add testimonial text
          const testimonialDiv = document.createElement('div');
          testimonialDiv.className = 'testimonial-text';
          testimonialDiv.textContent = testimonialText.replace(/^"|"$/g, '').trim();
          contentWrapper.appendChild(testimonialDiv);

          // Add author name
          const authorDiv = document.createElement('div');
          authorDiv.className = 'testimonial-author';
          authorDiv.textContent = author.trim();
          contentWrapper.appendChild(authorDiv);

          // Add company name with domain extension styling
          const companyText = company.textContent.trim();
          const companyDiv = document.createElement('div');
          companyDiv.className = 'testimonial-company';
          
          // Check if company text contains a dot to separate domain
          if (companyText.includes('.')) {
            const [name, extension] = companyText.split('.');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            const dotSpan = document.createElement('span');
            dotSpan.textContent = '.';
            const extensionSpan = document.createElement('span');
            extensionSpan.textContent = extension;
            extensionSpan.className = 'domain';
            
            companyDiv.appendChild(nameSpan);
            companyDiv.appendChild(dotSpan);
            companyDiv.appendChild(extensionSpan);
          } else {
            companyDiv.textContent = companyText;
          }
          contentWrapper.appendChild(companyDiv);
        }
      }
    }

    // Append content wrapper to li
    li.appendChild(contentWrapper);
    ul.appendChild(li);
  });

  block.textContent = '';
  block.appendChild(ul);
}
