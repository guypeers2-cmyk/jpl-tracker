// Zoekt klassen in styles.css die nergens in index.html of app.js voorkomen (schatting). Gebruik: node scripts/css-unused.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8') + fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const classes = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));
const unused = [...classes].filter(c => !src.includes(c));
console.log(`Klassen in styles.css: ${classes.size}, mogelijk ongebruikt: ${unused.length}`);
if (unused.length) console.log(unused.join(', '));
