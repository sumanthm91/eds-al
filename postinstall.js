const fs = require('fs');
const path = require('path');

fs.copyFileSync(path.resolve(__dirname, './node_modules/@adobe/magento-storefront-event-collector/dist/index.js'), path.resolve(__dirname, './scripts/commerce-events-collector.js'));
fs.copyFileSync(path.resolve(__dirname, './node_modules/@adobe/magento-storefront-events-sdk/dist/index.js'), path.resolve(__dirname, './scripts/commerce-events-sdk.js'));

// Define the dropins folder
const dropinsDir = path.join('scripts', '__dropins__');

// Remove existing dropins folder
if (fs.existsSync(dropinsDir)) {
  fs.rmSync(dropinsDir, { recursive: true });
}

// Create scripts/__dropins__ directory if not exists
fs.mkdirSync(dropinsDir, { recursive: true });

// Copy specified files from node_modules/@dropins to scripts/__dropins__
fs.readdirSync('node_modules/@dropins', { withFileTypes: true }).forEach((file) => {
  let sourcePath = path.join('node_modules', '@dropins', file.name);

  // handle symlinks (through npm link)
  if (file.isSymbolicLink()) {
    sourcePath = path.join('node_modules', '@dropins', file.name, 'dist');
  }

  // Skip if is not folder
  if (!file.isDirectory() && !file.isSymbolicLink()) {
    return;
  }
  fs.cpSync(sourcePath, path.join(dropinsDir, file.name), {
    recursive: true,
    filter: (src) => (!src.endsWith('package.json')),
  });
});

console.log('🫡 Drop-ins installed successfully!');
