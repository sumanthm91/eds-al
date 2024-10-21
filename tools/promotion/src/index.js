import React from 'react';
import * as ReactDOM from 'react-dom';
import Picker from './picker.js';
import './styles.css';

/**
 * List of blocks to be available in the picker.
 * 
 * Format: Object with key -> block mapping. Each block is defined by the following properties:
 *   key: Unique key, must be same as the key in the object
 *   name: Displayed name of the block
 *   output: Function that receives the selected product(s) and/or category(ies) and returns the HTML to be copied into the clipboard
 *   selection: Define if single or multi selection: single or multiple
 *   type: Define what can be selected: any, item or folder
 */
const blocks = {
    'identifier': {
        'key': 'identifier',
        'name': 'Identifier only',
        'output': i => i.isFolder ? i.id : i.sku,
        'selection': 'single',
        'type': 'any',
    },
};

const app = document.getElementById("app");
if (app) {
    ReactDOM.render(<Picker
        blocks={blocks} />, app);
}