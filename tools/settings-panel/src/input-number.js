// Define the custom element class
class InputNumber extends HTMLElement {
  constructor() {
    super();
    // Create a shadow root
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Get props data
    const props = this.getAttribute('props').split(',').reduce((acc, item) => {
      const [key, value] = item.split(':');
      acc[key] = value;
      return acc;
    }, {});
    const styles = this.getAttribute('styles').split(';');
    const key = this.getAttribute('key');
    this.render(props);
    const EVENT_NAME = 'updated';
    // Create
    const inputText = this.shadowRoot.querySelector('.input-text');

    function getMatchingData(data, k) {
      return data.filter((style) => style.includes(k));
    }

    const matchingData = getMatchingData(styles, key);
    if (matchingData.length > 0) {
      const value = matchingData[0].split(':')[1];
      inputText.setAttribute('value', Number(value.trim()));
    }

    inputText.addEventListener('change', (e) => {
      // console.info('input value:', e.target.value);
      // Dispatch custom event with selected value
      this.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { fieldType: 'number', data: e.target.value } }));
    });
  }

  render(props) {
    // Define the template
    this.shadowRoot.innerHTML = `
        <style>
          .input-text {
            width: 95%;
          }
        </style>
        <input class="input-text" type="number" min="${props.min}" max="${props.max}" step="${props.step}" value="0">
      `;
  }
}
// Define the custom element
customElements.define('input-number', InputNumber);
