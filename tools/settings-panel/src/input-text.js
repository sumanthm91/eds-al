// Define the custom element class
class InputText extends HTMLElement {
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
    const inputText = this.shadowRoot.querySelector('.input-text');
    inputText.addEventListener('change', (e) => {
      // console.info('input value:', e.target.value);
      // Dispatch custom event with selected value
      this.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { fieldType: 'text', data: e.target.value } }));
    });
  }

  render() {
    // Define the template
    this.shadowRoot.innerHTML = `
        <style>
          .input-text {
            width: 100%;
            height: 100%;
          }
        </style>
        <input class="input-text" type="text" value="">
      `;
  }
}
// Define the custom element
customElements.define('input-text', InputText);
