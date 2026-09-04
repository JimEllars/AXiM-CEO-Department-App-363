/* global console */
const fs = require('fs');
const code = fs.readFileSync('sprint-final-update.patch', 'utf8');
console.log(code.substring(0, 1500));
console.log('...');
console.log(code.substring(code.length - 1500));
