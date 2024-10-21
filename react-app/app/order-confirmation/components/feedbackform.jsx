import React, { useEffect } from 'react';
import { decorateIcons } from '../../../../scripts/aem.js';

function Feedbackform({ closeModal, formUrl }) {
  useEffect(() => {
    if (document.querySelector('.feedback-form-header')) {
      decorateIcons(document.querySelector('.feedback-form-header'));
    }
  }, []);
  return (
    <div className="modal">
      <div className="modal-content">
        <div className="feedback-form-header">
          <span
            className="icon icon-close"
            role="button"
            tabIndex="0"
            aria-label="Close"
            onClick={closeModal}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                closeModal();
              }
            }}
          />
        </div>
        <div className="feedback-form-body">
          <iframe
            src={formUrl}
            width="100%"
            height="784px"
            loading="lazy"
            title="Order Confirmation Feedback form"
          />
        </div>
      </div>
    </div>
  );
}

export default Feedbackform;
