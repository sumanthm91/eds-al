// Define the custom element class
class InputImage extends HTMLElement {
  constructor() {
    super();
    // Create a shadow root
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Get props data
    this.render();
    const EVENT_NAME = 'updated';
    // Create
    this.inputImage = this.shadowRoot.querySelector('.input-image');
    this.inputImage.addEventListener('paste', async (e) => {
      console.debug('url pasted', e);
      this.inputImage.classList.remove('error');
      await this.readClipboardText();
      setTimeout(() => {
        const isDMOpenAPIUrl = /^(https?:\/\/(.*)\/adobe\/assets\/urn:aaid:aem:(.*))/gm.test(this.inputImage.value);
        if(isDMOpenAPIUrl) {
          this.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { fieldType: 'image', data: this.inputImage.value } }));
        } else {
          this.inputImage.classList.add('error');
          console.debug('Invalid Image URL');
        }
      }, 1000);
    });
    this.inputImage.addEventListener('change', (e) => {
      // console.info('input value:', e.target.value);
      // Dispatch custom event with selected value
      const isDMOpenAPIUrl = /^(https?:\/\/(.*)\/adobe\/assets\/urn:aaid:aem:(.*))/gm.test(e.target.value);
        if(isDMOpenAPIUrl) {
          this.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { fieldType: 'image', data: e.target.value } }));
        } else {
          this.inputImage.classList.add('error');
          console.debug('Invalid Image URL');
        }
    });
  }

  async readClipboardText() {
    navigator.clipboard.read().then((clipboardItems) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const item of clipboardItems) {
        // eslint-disable-next-line no-restricted-syntax
        for (const type of item.types) {
          if (type === 'text/html') {
            item.getType(type).then((blob) => {
              blob.text().then((htmlText) => {
                // Parse the HTML to extract the content
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const anchorElement = doc.querySelector('a');
                if (anchorElement) {
                  const href = anchorElement.getAttribute('href');
                  const text = anchorElement.textContent;
                  console.debug(`Link: ${href}, Text: ${text}`);
                  this.inputImage.value = href;
                  return href;
                }
              });
            });
          }
        }
      }
    });
  }

  render() {
    // Define the template
    this.shadowRoot.innerHTML = `
        <style>

          input.input-image.error {
            border: 1px solid red;
          }

          input.input-image + .error-message {
            display: none;
            color: red;
            font-size: 12px;
            margin-top: 5px;
          }
        
          input.input-image.error + .error-message {
            display: block;
          }

        </style>
        <input class="input-image" type="text" value="">
        <span class="error-message">Invalid Image URL</span>
      `;
  }
}
// Define the custom element
customElements.define('input-image', InputImage);
