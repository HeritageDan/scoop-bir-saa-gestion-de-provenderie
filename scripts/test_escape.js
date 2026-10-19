import { execSync } from 'child_process';

function esc(txt) {
  return txt
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

const title = esc('01 | TABLEAU DE BORD OPÉRATIONNEL');
const sub = esc('Supervision en direct des ventes, marges, dépenses et alertes de stock');
const b1 = esc('• Indicateurs clés en direct : Chiffre d\'Affaires brut et net, marge réalisée, dépenses');
const b2 = esc('• Détection proactive des alertes : Alertes stock faible et ruptures magasin');
const b3 = esc('• Transactions et flux récents : Dernières factures et encaissements en FCFA');

const vf = [
  'drawbox=x=280:y=800:w=1600:h=250:color=black@0.90:t=fill',
  'drawbox=x=280:y=800:w=1600:h=5:color=0x10b981:t=fill',
  'drawbox=x=310:y=820:w=150:h=26:color=0x10b981:t=fill',
  `drawtext=fontfile='C\\:/Windows/Fonts/segoeuib.ttf':text='MODULE 01 / 15':x=325:y=824:fontsize=14:fontcolor=0x064e3b`,
  `drawtext=fontfile='C\\:/Windows/Fonts/segoeuib.ttf':text='${title}':x=480:y=820:fontsize=26:fontcolor=white`,
  `drawtext=fontfile='C\\:/Windows/Fonts/segoeui.ttf':text='${sub}':x=310:y=860:fontsize=16:fontcolor=0x34d399`,
  `drawtext=fontfile='C\\:/Windows/Fonts/segoeui.ttf':text='${b1}':x=310:y=895:fontsize=15:fontcolor=white`,
  `drawtext=fontfile='C\\:/Windows/Fonts/segoeui.ttf':text='${b2}':x=310:y=925:fontsize=15:fontcolor=white`,
  `drawtext=fontfile='C\\:/Windows/Fonts/segoeui.ttf':text='${b3}':x=310:y=955:fontsize=15:fontcolor=white`,
  'drawbox=x=310:y=1020:w=1540:h=4:color=white@0.2:t=fill',
  'drawbox=x=310:y=1020:w=120:h=4:color=0x10b981:t=fill'
].join(',');

const cmd = `ffmpeg -y -i screenshots/01_dashboard.png -vf "${vf}" -frames:v 1 test_frame_escaped.png`;
console.log('Running test command...');
execSync(cmd);
console.log('SUCCESS: test_frame_escaped.png created!');
