// Schrijft alleen public/data/beoordeling.json uit de modellen, zonder de lessen in basis.json te raken.
// Gebruik als een andere sessie aan basis.json werkt. koppel-beoordeling.js doet dit ook, plus het materiaal in de lessen.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const modellen = fs.readdirSync(__dirname).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
fs.writeFileSync(path.join(root, 'public/data/beoordeling.json'), JSON.stringify(modellen.map(M => { const { map, pta, ...rest } = M; return rest; })), 'utf8');
console.log(modellen.length + ' modellen geschreven');
