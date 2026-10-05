import fs from 'fs';
import path from 'path';
import { buildApplicationDocumentationPDF } from '../src/utils/pdfGenerator';

console.log('Generating French PDF documentation...');
const docFr = buildApplicationDocumentationPDF('fr');
const bufferFr = Buffer.from(docFr.output('arraybuffer'));
const outputPathFr = path.resolve(process.cwd(), 'public', 'Documentation_Fonctionnalites_Provenda_FR.pdf');
fs.writeFileSync(outputPathFr, bufferFr);
// Also write default
fs.writeFileSync(path.resolve(process.cwd(), 'public', 'Documentation_Fonctionnalites_Provenda.pdf'), bufferFr);
console.log(`French PDF created: ${outputPathFr} (${bufferFr.length} bytes)`);

console.log('Generating English PDF documentation...');
const docEn = buildApplicationDocumentationPDF('en');
const bufferEn = Buffer.from(docEn.output('arraybuffer'));
const outputPathEn = path.resolve(process.cwd(), 'public', 'Documentation_Fonctionnalites_Provenda_EN.pdf');
fs.writeFileSync(outputPathEn, bufferEn);
console.log(`English PDF created: ${outputPathEn} (${bufferEn.length} bytes)`);
