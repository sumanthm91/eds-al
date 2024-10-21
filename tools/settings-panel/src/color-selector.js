// Define the custom element class
class ColorSelector extends HTMLElement {
  constructor() {
    super();
    // Create a shadow root
    this.attachShadow({ mode: 'open' });
    // Define the template
    this.shadowRoot.innerHTML = `
      <style>
       * {
        box-sizing: border-box;
       }
        /* Define styles for the color selector */
        .color-selector {
          position: relative;
          display: inline-block;
          font-size: 11px;
          width: 100%;
        }

        .select-selected {
          background-color: #fff;
          padding: 5px 12px;
          border: 1px solid #ccc;
          cursor: pointer;
          border-radius: 5px;
          text-align: center;
        }

        .select-items {
          display: none;
          position: absolute;
          top: 20px;
          padding: 15px 5px;
          background-color: #fff;
          min-width: 100%;
          border: 1px solid #ccc;
          z-index: 1;
          max-height: 200px;
          overflow-y: auto;
        }

        .select-items::before {
          content: '';
          position: absolute;
          top: -5px;
          right: 15px;
          width: 0;
          height: 0;
          border: 9px solid transparent;
          border-bottom-color: #fff;
        }

        .select-items.show {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .select-items div[data-value] {
          margin: 2px;
          height: 20px;
          width: 100px;
          border: 1px solid #ccc;
          border-radius: 15px;
          cursor: pointer;
          display: inline-flex;
          justify-content: center;
        }

        .select-items div[data-value]:hover {
          background-color: #f2f2f2;
        }

        .select-close {
          position: absolute;
          left: 5px;
          top: 3px;
          padding: 2px;
          cursor: pointer;
          border: 1px solid #ccc;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: inline-flex;
          justify-content: center;
          background: #ccc;
          opacity: 0.9;
        }

        .select-close:hover {
          opacity: 1;
        }
      </style>

      <div class="color-selector">
        <div class="select-selected">Select Color</div>
        <div class="select-items">
        <div class="select-close" title="close">X</div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    // Get color data
    const colors = this.getAttribute('props').split(',');
    const styles = this.getAttribute('styles').split(';');
    const key = this.getAttribute('key');
    const EVENT_NAME = 'updated';
    const EVENT_ACTIVE = 'color-active';

    // Add event listeners
    const selectSelected = this.shadowRoot.querySelector('.select-selected');
    const selectClose = this.shadowRoot.querySelector('.select-close');
    const selectItemsContainer = this.shadowRoot.querySelector('.select-items');

    function getMatchingData(data, k) {
      return data.filter((style) => style.includes(k));
    }
    // Add color options
    const selectItems = this.shadowRoot.querySelector('.select-items');
    colors.forEach((color) => {
      const [name, value] = color.split(': ');
      const option = document.createElement('div');
      option.setAttribute('data-name', name);
      option.setAttribute('title', value);
      option.setAttribute('data-value', value);
      option.innerText = value;
      option.setAttribute('style', `background-color:${value};`);
      selectItems.appendChild(option);
    });

    const matchingData = getMatchingData(styles, key);
    if (matchingData.length > 0) {
      const color = matchingData[0].split(':')[1];
      selectSelected.innerText = color;
      selectSelected.setAttribute('style', `background-color:${color};`);
    }

    selectSelected.addEventListener('click', () => {
      selectItemsContainer.classList.toggle('show');
      this.dispatchEvent(new CustomEvent(EVENT_ACTIVE, { detail: selectItemsContainer.classList.contains('show') }));
    });

    selectItemsContainer.querySelectorAll('div[data-value]').forEach((item) => {
      item.addEventListener('click', () => {
        const value = item.getAttribute('data-value');
        selectSelected.textContent = item.textContent;
        selectSelected.setAttribute('style', `background-color:${value};`);
        selectItemsContainer.classList.remove('show');
        // console.info('Selected color:', e, value);
        // Dispatch custom event with selected value
        this.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { fieldType: 'colors', data: value } }));
        this.dispatchEvent(new CustomEvent(EVENT_ACTIVE, { detail: selectItemsContainer.classList.contains('show') }));
      });
    });

    selectClose.addEventListener('click', () => {
      selectItemsContainer.classList.remove('show');
      this.dispatchEvent(new CustomEvent(EVENT_ACTIVE, { detail: selectItemsContainer.classList.contains('show') }));
    });
  }
}

// Define the custom element
customElements.define('color-selector', ColorSelector);
