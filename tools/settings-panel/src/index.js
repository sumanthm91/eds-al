// Define the custom element class
import './color-selector.js';
import './input-number.js';
import './input-image.js';
import './input-text.js';
import toKebabCase from './utils.js';

class SettingsPanel extends HTMLElement {
  constructor() {
    super();
    // Create a shadow root
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Get props data
    const dataProps = JSON.parse(this.getAttribute('props'));
    const dataStyles = this.getAttribute('styles');
    this.render();
    this.settingsPanel = this.shadowRoot.querySelector('.settings--panel');
    this.initHandlers(dataProps, dataStyles);
    this.EVENT_NAME = 'CONFIG_UPDATED';
    this.TOGGLE_EVENT = 'TOGGLE_EVENT';
  }

  render() {
    // create a settings panel for block configurations that can be toggled to expand/collapse
    this.shadowRoot.innerHTML = `
    <style>
        .settings--panel {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 100;
        }
        .settings--header {
          padding: 10px;
          position: absolute;
          right: 0;
        }
        .settings--toggle {
          background-color: #000;
          border: 1px solid #fff;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          padding: 7px 5px;
          transition: transform 0.3s;
        }

        .settings--toggle svg {
          width: 16px;
          height: 16px;
          fill: #e9dfdf00;
          margin-left: 10px;
          margin: 0px 5px;
          transform: scale(1.5);
          stroke: #fff;
          position: relative;
          top: 3px;
        }

        .settings--body {
          display: none;
          padding: 10px;
          background-color: #fff;
          text-align: left;
          position: relative;
          right: 5px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        /* add arrow on top of the settings panel */
        .settings--body::after {
          content: '';
          position: absolute;
          top: -18px;
          right: 15px;
          width: 0;
          height: 0;
          border: 9px solid transparent;
          border-bottom-color: #fff;
        }

        .settings--body.color-selector-shown::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1;
          border-radius: 4px;
        }

        .settings--body > div {
          display: flex;
          padding: 2px 0;
        }
        
        .settings--body > div > label {
            flex: 1;
            min-width: 160px;
        }
        
        .settings--body > div > color-selector {
            flex: 1;
        }
        .settings--panel.expanded .settings--body {
          display: block;
          margin-top: 60px;
        }

        .settings--panel.expanded .settings--toggle svg {
          fill: #fff;
          stroke: #fff;
        }

        .settings--panel.expanded .settings--toggle {
          transform: rotate(180deg);
        }

        

        .color-selector-wrapper, .range-slider-wrapper, .input-number-wrapper, .input-image-wrapper, .input-text-wrapper {
          font-size: 12px;
          white-space: nowrap;
        }

        .input-number-wrapper input-number {
          width: 100%;
        }

        .input-text-wrapper input-text {
          width: 100%;
        }

        .input-image-wrapper input-image {
          width: 100%;
        }
          
      </style>
    <div class="settings--panel">
      <div class="settings--header">
        <button class="settings--toggle">
          <svg class="settings-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 1c-1.1 0-2 .9-2 2v2.1c-.3.1-.6.1-.9.2l-1.6-1.6c-.4-.4-1-.4-1.4 0l-1.6 1.6c-.4.4-.4 1 0 1.4l1.6 1.6c-.1.3-.1.6-.2.9H5c-1.1 0-2 .9-2 2s.9 2 2 2h2.1c.1.3.1.6.2.9L4.7 15.6c-.4.4-.4 1 0 1.4l1.6 1.6c.4.4 1 .4 1.4 0l1.6-1.6c.3.1.6.1.9.2V19c0 1.1.9 2 2 2s2-.9 2-2v-2.1c.3-.1.6-.1.9-.2l1.6 1.6c.4.4 1 .4 1.4 0l1.6-1.6c.4-.4.4-1 0-1.4l-1.6-1.6c.1-.3.1-.6.2-.9H19c1.1 0 2-.9 2-2s-.9-2-2-2h-2.1c-.1-.3-.1-.6-.2-.9l1.6-1.6c.4-.4.4-1 0-1.4l-1.6-1.6c-.4-.4-1-.4-1.4 0l-1.6 1.6c-.3-.1-.6-.1-.9-.2V3c0-1.1-.9-2-2-2zm0 14c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
          </svg>
        </button>
      </div>
      <div class="settings--body"></div>
      </div>`;
  }

  initHandlers(props, dataStyles) {
    const settingsToggle = this.settingsPanel.querySelector('.settings--toggle');
    settingsToggle.addEventListener('click', () => {
      this.settingsPanel.classList.toggle('expanded');
      const isExpanded = this.settingsPanel.classList.contains('expanded');
      this.dispatchEvent(new CustomEvent(
        this.TOGGLE_EVENT,
        { detail: { isExpanded } },
      ));
    });
    this.settingsBody = this.settingsPanel.querySelector('.settings--body');
    // add color selector for block configurations
    if (Object.entries(props).length) {
      const dataAttributes = Object.entries(props).map(([key, value]) => {
        const obj = {};
        obj[`${toKebabCase(key)}`] = value;
        return obj;
      });
      dataAttributes.forEach((dataAttribute) => {
        const [key] = Object.keys(dataAttribute);
        const [value] = Object.values(dataAttribute);
        // first word of the key is the field type
        const fieldType = key.split('-')[0];
        // exclude field type and construct color variable
        const cssVariable = `--${key.split('-').slice(1).join('-')}`;
        switch (fieldType) {
          case 'colors':
            // eslint-disable-next-line
            const selector = this.createControls('color-selector', cssVariable, value, dataStyles);
            this.settingsBody.appendChild(selector);
            break;
          case 'range':
            // eslint-disable-next-line
            const rangeSlider = this.createControls('range-slider', cssVariable, value, dataStyles);
            this.settingsBody.appendChild(rangeSlider);
            break;
          case 'number':
            // eslint-disable-next-line
            const inputNumber = this.createControls('input-number', cssVariable, value, dataStyles);
            this.settingsBody.appendChild(inputNumber);
            break;
          case 'text':
            // eslint-disable-next-line
            const inputText = this.createControls('input-text', cssVariable, value, dataStyles);
            this.settingsBody.appendChild(inputText);
            break;
          case 'image':
            // eslint-disable-next-line
            const inputImage = this.createControls('input-image', cssVariable, value, dataStyles);
            this.settingsBody.appendChild(inputImage);
            break;
          default:
        }
      });
    }
  }

  createControls(controlName, cssVariable, props, dataStyles) {
    const controlWrapper = document.createElement('div');
    const control = document.createElement(controlName);
    control.setAttribute('props', props);
    control.setAttribute('styles', dataStyles);
    control.setAttribute('key', cssVariable);
    controlWrapper.classList.add(`${controlName}-wrapper`);
    controlWrapper.innerHTML = `<label>${cssVariable.split('--')[1]}:</label>`;
    controlWrapper.appendChild(control);
    control.addEventListener('updated', (e) => {
      const { data, fieldType } = e.detail;
      this.dispatchEvent(new CustomEvent(
        this.EVENT_NAME,
        { detail: { cssVariable, data, fieldType } },
      ));
    });
    if (controlName === 'color-selector') {
      control.addEventListener('color-active', (e) => {
        const { detail } = e;
        this.settingsBody.classList.toggle('color-selector-shown', detail);
      });
    }
    return controlWrapper;
  }
}

// Define the custom element
customElements.define('settings-panel', SettingsPanel);
