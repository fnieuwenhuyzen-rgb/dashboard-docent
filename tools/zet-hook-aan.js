// node tools/zet-hook-aan.js [--uit]: zet de pre-commit-controle aan (git config core.hooksPath tools/hooks) of uit.
// Werkt voor deze repo en al zijn worktrees. Raakt niets anders aan.
const cp = require('child_process'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const GIT = process.env.GIT_EXE || (process.env.LOCALAPPDATA && fs.existsSync(path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd', 'git.exe')) ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd', 'git.exe') : 'git');
const uit = process.argv.includes('--uit');
if (uit) cp.execFileSync(GIT, ['config', '--unset', 'core.hooksPath'], { cwd: root, stdio: 'inherit' });
else cp.execFileSync(GIT, ['config', 'core.hooksPath', 'tools/hooks'], { cwd: root, stdio: 'inherit' });
console.log(uit ? 'Pre-commit-controle staat uit.' : 'Pre-commit-controle staat aan: elke commit met gegevens wordt eerst gecontroleerd.');
