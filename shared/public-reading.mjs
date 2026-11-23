// V20 — Public document excerpts for navigation, never semantic assertions.
// Input files have already passed the v10 manifest byte/size verification.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const MAX_FILES = 48;
const MAX_SOURCE_BYTES = 96 * 1024;
const MAX_TOTAL_SOURCE_BYTES = 650 * 1024;
const MAX_SUMMARY = 420;
const MAX_EXCERPT = 320;
const MAX_TOPICS = 10;
const MAX_SECTIONS = 8;

const eligible = (name) => name === 'README.md' || name === 'AI_START_HERE.md' ||
  /^docs\/(?:[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_.-]+\.md$/.test(name) ||
  /^ai\/(?:CONTEXT|QUESTIONS|GLOSSARY)\.md$/.test(name);
const cleanText = (value) => String(value || '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\*\*|__|(?<!\w)[*_](?!\w)|`/g, '')
  .replace(/\s+/g, ' ').trim();
function clip(value, max) {
  const s = cleanText(value);
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, Math.max(0, cut.lastIndexOf(' '))) + '…';
}
const unhelpful = (line) => !line || /^\s*(?:---+|<!--|\[!|https?:\/\/|```)/.test(line) ||
  /^(?:Version\s|v\d|\*\*Version|State ref\s*:|SHA-?256|npm |pip |python |node |```)/i.test(line);

// Preserve the literal prose, without making a summary or converting Markdown
// bullets into graph nodes. A source heading/bullet is not a qualified label.
export function extractPublicMarkdown(markdown, filePath, digest = '') {
  if (typeof markdown !== 'string' || markdown.length > MAX_SOURCE_BYTES) throw Error('Texte documentaire au-delà du budget.');
  const lines = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  let fenced = false;
  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (/^\s*(```|~~~)/.test(raw)) { fenced = !fenced; continue; }
    if (fenced || /^\s*\|/.test(raw) || /^\s*<\/?(?:script|style)/i.test(raw)) continue;
    const heading = /^(#{1,4})\s+(.+)$/.exec(raw);
    if (heading) { const text = cleanText(heading[2]); if (text) parsed.push({kind:'heading',level:heading[1].length,text,line:i+1}); continue; }
    const bullet = /^[-*+]\s+(.+)$/.exec(raw);
    if (bullet) {const text = cleanText(bullet[1]);if (text) parsed.push({kind:'bullet',text,line:i+1});continue;}
    if (unhelpful(raw) || /^[#>|_\- ]+$/.test(raw)) continue;
    const text = cleanText(raw);
    if(text.length >= 32 && !/^(?:\w+:\/\/|\{\s*"|\[\s*\{)/.test(text))parsed.push({kind:'prose',text,line:i+1});
  }
  const headings = parsed.filter(x=>x.kind==='heading');
  const defaultTitle = filePath === 'README.md' ? 'Présentation du Kristal' :
    filePath.replace(/\.md$/i, '').split('/').at(-1).replace(/^\d+[_\-]*/, '').replace(/[_-]+/g,' ');
  const title = clip(headings.find(h=>h.level===1)?.text || defaultTitle, 150);
  const first = parsed.find(x=>x.kind==='prose' && !/^(?:\*?Version\b|Kristal Standard|State ref|Ce fichier est généré)/i.test(x.text));
  const description = clip(first?.text || parsed.find(x=>x.kind==='bullet')?.text || '', MAX_EXCERPT);
  const sections = headings.filter(h=>h.level>=2 && h.level<=3).slice(0,MAX_SECTIONS)
    .map(({text,line})=>({title:clip(text,110),line}));
  const topics=[]; let current = null;
  const skipSections=/^(?:installation|validation|build|commandes|tests?|changelog|déploiement|state|licence|usage technique|références|standardisation)/i;
  for(const item of parsed){
    if(item.kind==='heading'){current=item.text;continue;}
    if(item.kind!=='bullet'||!current||skipSections.test(current))continue;
    if(topics.length >= MAX_TOPICS)break;
    const [left,right] = item.text.split(/\s+[—–:]\s+/,2);
    if(!left || left.length > 110)continue;
    const term = clip(left,95);
    if(topics.some(t=>t.title.toLocaleLowerCase('fr')===term.toLocaleLowerCase('fr')))continue;
    topics.push({title:term,detail:clip(right||item.text,210),section:clip(current,90),line:item.line});
  }
  return {path:filePath,sha256:digest,title,excerpt:description,sections,topics,
    heading_line:headings[0]?.line||null,excerpt_line:first?.line||null};
}

export function projectPublicReading(checked, collection) {
  const prefix=path.join(collection,'kristals',checked.slug);
  const files=checked.files.filter(f=>eligible(f.path) && f.size<=MAX_SOURCE_BYTES)
    .sort((a,b)=>{
      const rank=x=>x==='README.md'?0:x.startsWith('docs/')?1:x==='AI_START_HERE.md'?2:3;
      return rank(a.path)-rank(b.path)||a.path.localeCompare(b.path,'fr');
    });
  let total=0;
  const documents=[];
  for(const f of files){
    if(documents.length>=MAX_FILES || total+f.size>MAX_TOTAL_SOURCE_BYTES)break;
    const file=path.join(prefix,...f.path.split('/'));
    // Defence in depth: the previous v10 inspection rejects undeclared files
    // and symlinks; also refuse a symlink introduced after that inspection.
    if(fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile())throw Error('Source documentaire modifiée ou symbolique : '+f.path);
    const bytes=fs.readFileSync(file);
    if(bytes.length!==f.size)throw Error('Source documentaire modifiée : '+f.path);
    if('sha256:'+createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Empreinte documentaire modifiée : '+f.path);
    const value=extractPublicMarkdown(new TextDecoder('utf-8',{fatal:true}).decode(bytes),f.path,f.sha256);
    total+=bytes.length;
    documents.push(value);
  }
  const overview=documents.find(x=>x.path==='README.md')||documents.find(x=>x.path==='AI_START_HERE.md')||documents[0];
  return {
    format:'konstellation.light-reading/1.0',
    status:'source-public-documents-unqualified',
    semantic_assertions_created:0,
    overview_path:overview?.path||null,
    intro:overview?.excerpt?.slice(0,MAX_SUMMARY)||'',
    topics:overview?.topics||[],
    documents,
    scanned_files:documents.length,
  };
}
