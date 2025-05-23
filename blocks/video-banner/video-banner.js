import { createOptimizedPicture } from '../../scripts/scripts.js';

export default function decorate(block) {
  const videoBannerURL = block.querySelector('div > div > div').textContent.trim();
  block.innerHTML = `
    <div class="video-banner-card">
      <video autoplay muted loop class="video-banner-video">
        <source src="${videoBannerURL}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>
  `;
}
