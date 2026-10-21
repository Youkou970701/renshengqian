import {createHash} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const hashFiles=files=>{const h=createHash('sha256');for(const p of files.sort()){h.update(relative(root,p)+'\n');h.update(readFileSync(p));}return h.digest('hex');};
function tree(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?tree(join(dir,d.name)):[join(dir,d.name)]);}
export function engineHash(){return hashFiles([...tree(join(root,'src/engine')).filter(p=>/\.(?:js|json)$/.test(p)),...tree(join(root,'src/content/events')).filter(p=>p.endsWith('.js')),join(root,'src/content/presentation.js'),join(root,'src/content/verdicts.js'),join(root,'data/cn-stats.json')]);}
export function definitionsHash(){return hashFiles([join(root,'src/content/achievements.js')]);}
