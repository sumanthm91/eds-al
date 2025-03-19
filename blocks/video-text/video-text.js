function getYoutubeEmbedUrl(url) {
  // Handle different YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube.com/embed/${match[2]}`
    : null;
}
export default async function decorate(block) {


  // Get content from block
  const title = block.querySelector('h2')?.innerHTML || '';
  const description = block.querySelector('p')?.textContent || '';
  const videoUrl = block.querySelector('a')?.href || '';

  // Get YouTube embed URL
  const embedUrl = getYoutubeEmbedUrl(videoUrl);
  if (!embedUrl) {
    console.error('Invalid YouTube URL');
    return;
  }

  // Create content wrapper for text
  const textContent = document.createElement('div');
  textContent.classList.add('text-content');
  textContent.innerHTML = `
    <h2>${title}</h2>
    <p>${description}</p>
  `;

  // Create video container
  const videoContainer = document.createElement('div');
  videoContainer.classList.add('video-container');
  videoContainer.innerHTML = `
    <iframe 
      src="${embedUrl}" 
      title="YouTube video player" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;

  // Create wrapper div and add content
  const wrapper = document.createElement('div');
  wrapper.append(textContent);
  wrapper.append(videoContainer);

  // Replace block content
  block.innerHTML = '';
  block.append(wrapper);
}