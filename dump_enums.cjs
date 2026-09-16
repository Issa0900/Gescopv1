const fs = require('fs');
const path = require('path');
const files = fs.readdirSync('base44/entities').filter(f => f.endsWith('.jsonc'));
const enums = {};
files.forEach(f => {
  const c = fs.readFileSync(path.join('base44/entities', f), 'utf8');
  const lines = c.split('\n');
  let currentField = '';
  lines.forEach((l, i) => {
    if (l.includes('": {')) currentField = l.split('"')[1];
    if (l.includes('"enum":')) {
      const enumValues = [];
      for (let j = i + 1; j < i + 10; j++) {
        if (!lines[j]) break;
        if (lines[j].includes(']')) break;
        const val = lines[j].match(/"([^"]+)"/);
        if (val) enumValues.push(val[1]);
      }
      enums[f.replace('.jsonc', '') + '.' + currentField] = enumValues;
    }
  });
});
console.log(JSON.stringify(enums, null, 2));
