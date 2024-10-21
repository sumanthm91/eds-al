import { EVENT_QUEUE, targetClickTrackingEvent } from '../../scripts/target-events.js';
import { loadBlocks } from '../../scripts/aem.js';
import { createModalFromContent, openModal, decorateMain } from '../../scripts/scripts.js';

export async function renderPersonalizationDialog(blockData) {
  const PERSONALIZATION_DIALOG_ID = 'personalization-dialog';

  const personalizationOverlay = document.createElement('div');
  personalizationOverlay.appendChild(blockData);

  await createModalFromContent(
    PERSONALIZATION_DIALOG_ID,
    '',
    personalizationOverlay.outerHTML,
    [PERSONALIZATION_DIALOG_ID],
  );
  openModal(PERSONALIZATION_DIALOG_ID);
}

export default async function decorate(block) {
  const key = block.dataset.targetId;
  const dataListener = async () => {
    const personalizedFragment = EVENT_QUEUE.find((el) => el.key === key)?.data[0]?.data.content;
    if (typeof personalizedFragment !== 'string') {
      return;
    }
    block.innerHTML = personalizedFragment;
    decorateMain(block);

    const blockEl = block.querySelector('.block.banner');
    blockEl.dataset.targetId = key;
    await loadBlocks(block);

    if (block.classList.contains('target-popup')) {
      await renderPersonalizationDialog(block);
    }

    document.querySelectorAll('.personalization.block')?.forEach(
      (personalizationBlock) => personalizationBlock.addEventListener('click', ({ target: cta }) => {
        if (cta.tagName === 'A') {
          if (cta.getAttribute('href') === '#close') {
            document.querySelector('.personalization-dialog')?.close();
          } else {
            targetClickTrackingEvent({ key, personalizationCta: cta.title });
          }
        }
      }),
    );
  };
  window.addEventListener('target-response', dataListener, { once: true });
}
