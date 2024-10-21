/**
 * loads and decorates the scrollable-banner
 * @param {Element} block The scrollable-banner block element
 */
export default async function decorate(block) {
  const picture = block.querySelector('picture');
  const picContainer = picture.parentElement;
  const sources = Array.from(picture.querySelectorAll('source'));
  const img = picture.querySelector('img');
  let imgSource = img.src;

  // Set the background image based on the current viewport size
  const setBackground = () => {
    const source = sources.find((s) => window.matchMedia(s.media).matches);
    if (source) {
      imgSource = source.getAttribute('srcset');
    } else {
      const fallbackSource = sources.find((s) => !s.media);
      if (fallbackSource) {
        imgSource = fallbackSource.getAttribute('srcset');
      }
    }

    block.style.backgroundImage = `url(${imgSource})`;
  };

  setBackground();

  const resizeObserver = new ResizeObserver(() => {
    setBackground();
  });

  resizeObserver.observe(block);
  picContainer.remove();
}
