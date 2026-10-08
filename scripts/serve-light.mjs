#!/usr/bin/env node
// Static local preview only. No API or filesystem browsing.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fs.realpathSync(process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../light/site'));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try {
   const u=new URL(req.url,'http://127.0.0.1');
   if (req.method!=='GET' && req.method!=='HEAD') { res.writeHead(405).end();return; }
   const pieces=u.pathname.split('/').filter(Boolean);
   if (pieces.some(p=>p==='..' || p==='.' || p.startsWith('.'))) {res.writeHead(400).end();return;}
   const file=path.join(root, ...pieces, ...(pieces.length ? [] : ['index.html']));
   const stat=fs.lstatSync(file);
   if (!stat.isFile() || stat.isSymbolicLink() || !fs.realpathSync(file).startsWith(root+path.sep)) throw Error('not found');
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
   if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404).end('Not found');}
});
const port=Number(process.env.PORT || 4177);
server.listen(port,'127.0.0.1',()=>console.log(`Light preview http://127.0.0.1:${port}/`));
