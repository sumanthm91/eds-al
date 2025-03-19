/**
 * Embed Block
 * Shows videos and social posts directly on your page
 * https://www.aem.live/developer/block-collection/embed
 */

import { getConfigValue } from '../../scripts/configs.js';

// Constants for reuse
const IFRAME_STYLES = 'border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;';
const WRAPPER_STYLES = 'left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;';
const COMMON_IFRAME_ATTRS = 'allowfullscreen="" scrolling="no" loading="lazy"';

/**
 * Loads a script dynamically and executes callback when loaded
 * @param {string} url - Script URL to load
 * @param {Function} callback - Function to execute after script loads
 * @param {string} [type] - Script type attribute
 * @returns {HTMLScriptElement} The created script element
 */
const loadScript = (url, callback, type) => {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.src = url;
  if (type) {
    script.setAttribute('type', type);
  }
  script.onload = callback;
  head.append(script);
  return script;
};

/**
 * Creates default embed HTML for URLs not matching specific providers
 * @param {URL} url - URL object to embed
 * @returns {string} HTML string for the embed
 */
const getDefaultEmbed = (url) => {
  try {
    return `<div style="${WRAPPER_STYLES}">
      <iframe 
        src="${url.href}"
        style="${IFRAME_STYLES}"
        ${COMMON_IFRAME_ATTRS}
        allow="encrypted-media"
        title="Content from ${url.hostname}">
      </iframe>
    </div>`;
  } catch (error) {
    console.error('Error creating default embed:', error);
    return '<div class="embed-error">Unable to load embed content</div>';
  }
};

/**
 * Creates YouTube embed HTML
 * @param {URL} url - YouTube URL to embed
 * @param {boolean} autoplay - Whether to autoplay the video
 * @returns {string} HTML string for the YouTube embed
 */
const embedYoutube = (url, autoplay) => {
  try {
    const usp = new URLSearchParams(url.search);
    const suffix = autoplay ? '&mute=1&autoplay=1' : '';
    let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
    
    if (url.origin.includes('youtu.be')) {
      [, vid] = url.pathname.split('/');
    }

    const embedUrl = vid 
      ? `https://www.youtube.com/embed/${vid}?rel=0&v=${vid}${suffix}`
      : `https://www.youtube.com${url.pathname}`;

    return `<div style="${WRAPPER_STYLES}">
      <iframe 
        src="${embedUrl}"
        style="${IFRAME_STYLES}"
        ${COMMON_IFRAME_ATTRS}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
        title="Content from YouTube">
      </iframe>
    </div>`;
  } catch (error) {
    console.error('Error creating YouTube embed:', error);
    return '<div class="embed-error">Unable to load YouTube content</div>';
  }
};

/**
 * Creates Twitter embed HTML
 * @param {URL} url - Twitter URL to embed
 * @returns {string} HTML string for the Twitter embed
 */
const embedTwitter = (url) => {
  try {
    loadScript('https://platform.twitter.com/widgets.js');
    return `<blockquote class="twitter-tweet"><a href="${url.href}"></a></blockquote>`;
  } catch (error) {
    console.error('Error creating Twitter embed:', error);
    return '<div class="embed-error">Unable to load Twitter content</div>';
  }
};

// Configuration for supported embed types
const EMBEDS_CONFIG = [
  {
    match: ['youtube', 'youtu.be'],
    embed: embedYoutube,
    autoplay: false, // Will be updated by config
  },
  {
    match: ['twitter'],
    embed: embedTwitter,
  },
];

// Preload the YouTube autoplay config value
getConfigValue('yt-video-autoplay')
  .then(value => {
    EMBEDS_CONFIG[0].autoplay = value;
  })
  .catch(error => {
    console.error('Failed to load YouTube autoplay config:', error);
  });

/**
 * Loads the appropriate embed content into the block
 * @param {HTMLElement} block - Block element to load embed into
 * @param {string} link - URL to embed
 * @param {boolean} [autoplay] - Whether to autoplay the content
 */
export const loadEmbed = (block, link, autoplay) => {
  if (block.classList.contains('embed-is-loaded')) {
    return;
  }

  try {
    const url = new URL(link);
    const config = EMBEDS_CONFIG.find((e) => e.match.some((match) => link.includes(match)));

    if (config) {
      block.innerHTML = config.embed(url, autoplay || config.autoplay);
      block.classList = `block embed embed-${config.match[0]}`;
    } else {
      block.innerHTML = getDefaultEmbed(url);
      block.classList = 'block embed';
    }
    
    block.classList.add('embed-is-loaded');
  } catch (error) {
    console.error('Error loading embed:', error);
    block.innerHTML = '<div class="embed-error">Unable to load embed content</div>';
    block.classList = 'block embed embed-error';
  }
};

/**
 * Decorates the embed block
 * @param {HTMLElement} block - The embed block element
 */
export default function decorate(block) {
  try {
    const placeholder = block.querySelector('picture');
    const linkElement = block.querySelector('a');
    
    if (!linkElement) {
      throw new Error('No link found in embed block');
    }

    const link = linkElement.href;
    block.textContent = '';

    if (placeholder) {
      const wrapper = document.createElement('div');
      wrapper.className = 'embed-placeholder';
      wrapper.innerHTML = '<div class="embed-placeholder-play"><button type="button" title="Play"></button></div>';
      wrapper.prepend(placeholder);
      wrapper.addEventListener('click', () => {
        loadEmbed(block, link, true);
      });
      block.append(wrapper);
    } else {
      // Lazy load embed when it comes into view
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          loadEmbed(block, link);
        }
      });
      observer.observe(block);
    }
  } catch (error) {
    console.error('Error decorating embed block:', error);
    block.innerHTML = '<div class="embed-error">Unable to load embed content</div>';
    block.classList = 'block embed embed-error';
  }
}
