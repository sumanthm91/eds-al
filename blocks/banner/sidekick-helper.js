/** Helpers for sidekick specific customizations * */

/**
 * Listener to handle the image replacement using DAM image
 * @param {*} block
 * @param {*} target
 */
// Observer to capture the text changes and update the anchor link
export default function initImageAnchorChangeListener(block, target) {
  const imageLink = block.querySelector(`.${target.className}-link`);
  imageLink?.addEventListener('paste', async (e) => {
    setTimeout(() => {
      const updatedAnchor = e.target.querySelector('a');
      e.target.href = updatedAnchor.href;
      target.src = e.target.href;
      e.target.innerText = updatedAnchor.innerText;
      target.setAttribute('src', e.target.href);
      target.querySelectorAll('source').forEach((source) => {
        source.srcset = e.target.href;
      });
    });
  });
}
