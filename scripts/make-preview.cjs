const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const target = path.resolve(__dirname, '../../research-notices-preview.html');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="assets/styles.css">', () => '<style>\n' + fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8') + '\n</style>');
for (const name of ['data/notices.js', 'assets/model.js', 'assets/app.js']) {
  html = html.replace('<script defer src="' + name + '"></script>', '');
}
const data = JSON.parse(JSON.stringify(require(path.join(root, 'data/notices.js'))));
data.meta.offlinePreview = true;
for (const notice of data.notices) for (const image of notice.bodyImages || []) {
  const file = path.join(root, image.href);
  const mime = image.href.endsWith('.jpg') ? 'image/jpeg' : image.href.endsWith('.webp') ? 'image/webp' : 'image/png';
  image.href = 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64');
}
const scripts = ['data/notices.js', 'assets/model.js', 'assets/app.js'].map(name => {
  const code = name === 'data/notices.js' ? 'window.ResearchNoticesData = ' + JSON.stringify(data).replace(/</g,'\\u003c') + ';' : fs.readFileSync(path.join(root,name),'utf8');
  return '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
}).join('\n');
html = html.replace('<a href="admin.html" class="text-link">공고 관리</a>', '<span>관리 기능은 배포 사이트 또는 로컬 미리보기에서 이용</span>');
html = html.replace('</body>', () => scripts + '\n</body>');
html = html.replace('href="assets/favicon.svg"', 'href="data:image/svg+xml,' + encodeURIComponent(fs.readFileSync(path.join(root, 'assets/favicon.svg'), 'utf8')) + '"');
html += '\n<!--\nDesign guidance: Unslop by Damir Sokolovsky (@heydamir), CC BY 4.0.\nhttps://heydamir.design/unslop\nLucide icon licenses:\n' + fs.readFileSync(path.join(root, 'licenses/lucide.txt'), 'utf8') + '\n-->\n';
fs.writeFileSync(target, html, 'utf8');
console.log('Created offline preview: ' + target);
