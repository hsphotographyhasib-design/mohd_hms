const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const exists = fs.existsSync(dest);
  const stats = exists && fs.statSync(dest);
  const isDirectory = fs.existsSync(src) && fs.statSync(src).isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying static assets for standalone build...');

const publicSrc = path.join(__dirname, 'public');
const publicDest = path.join(__dirname, '.next', 'standalone', 'public');
copyRecursiveSync(publicSrc, publicDest);

const staticSrc = path.join(__dirname, '.next', 'static');
const staticDest = path.join(__dirname, '.next', 'standalone', '.next', 'static');
copyRecursiveSync(staticSrc, staticDest);

console.log('Static assets copied successfully.');
console.log('Your standalone app is ready for Hostinger in the ".next/standalone" folder.');
console.log('You can use the root "server.js" to run it in Hostinger Node.js App.');
