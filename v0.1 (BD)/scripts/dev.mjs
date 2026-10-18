import { spawn } from 'node:child_process';
const api=spawn(process.execPath,['--watch','server/index.mjs'],{stdio:'inherit',env:process.env});
const web=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0'],{stdio:'inherit',env:process.env});
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;api.kill();web.kill();process.exitCode=code;}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
api.on('exit',code=>stop(code || 0));web.on('exit',code=>stop(code || 0));
