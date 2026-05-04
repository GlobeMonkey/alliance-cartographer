const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const styleRegex = /<style>([\s\S]*?)<\/style>/;
const styleMatch = html.match(styleRegex);

if (!fs.existsSync('css')) fs.mkdirSync('css');
if (styleMatch) {
  fs.writeFileSync('css/style.css', styleMatch[1].trim(), 'utf8');
  console.log('CSS extracted to css/style.css');
}

if (!fs.existsSync('js')) fs.mkdirSync('js');

// We don't overwrite index.html yet, we will write it via AI tool directly to have more control
