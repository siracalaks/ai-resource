// Vektra Intelligence Engine — n8n Code node (cloud + DEEP READ version).
// This is the readable source of truth for what runs on n8n (sanitized — fill CONFIG).
// Live deploy uses Claude Haiku (brain) + Supabase (store); keys live in n8n only,
// never in this repo. Flow: Schedule Trigger -> THIS Code node.
//
// "Deep read": for each item it fetches the ACTUAL content (GitHub README via the
// GitHub API, or any web page via Firecrawl) and feeds it to the brain — so summaries
// say what the tool really does and exactly how the operator can use it.

const CONFIG = {
  keywords: ["image to video","ui ux design","shadcn","ai agent","n8n automation",
             "faceless video","supabase","mcp server","react component library"],
  // WHO is this for? The brain scores every item against THIS profile. Edit it to your own
  // work/goals — this is the only "personal" knob, and it stays out of git if you keep keys in n8n.
  profile: "a solo builder / small dev agency; values tools that save time, can be resold as a service, or unlock a new offering; prefers free or self-hostable",
  anthropic: "PASTE_ANTHROPIC_KEY",          // brain: claude-haiku-4-5
  gemini: "PASTE_GEMINI_KEY",                 // embeddings: gemini-embedding-001 (768-dim) — makes new intel searchable in "Sor"
  github: "",                                 // optional, raises rate limit + README reads
  firecrawl: "",                              // optional, deep-read non-GitHub pages
  youtube: "",                                // optional, YouTube Data API v3 — adds video tutorials/demos as intel
  apifyToken: "",                             // optional, Apify — enables Instagram hashtag trend signal (opt-in, paid)
  instagramTags: [],                          // e.g. ["uiux","webdesign"] — only scraped if apifyToken is set
  redditSubs: [],                             // e.g. ["SaaS","SideProject"] — top/week via Apify Reddit Scraper Lite (uses apifyToken; no Reddit OAuth)
  productHunt: "",                            // optional, Product Hunt developer token — top launches (trend/clone/lead)
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseKey: "PASTE_SERVICE_ROLE_KEY",
  // WhatsApp morning brief (Evolution API) — all four required, else the brief is skipped.
  evolutionUrl: "",        // Evolution base URL, e.g. https://evo.example.com
  evolutionInstance: "",   // Evolution instance name
  evolutionApiKey: "",     // Evolution apikey header value
  whatsappTo: "",          // recipient in intl format, e.g. 90532XXXXXXX
};

const http = this.helpers.httpRequest;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hn(kw){
  try{ const j=await http({url:"https://hn.algolia.com/api/v1/search?query="+encodeURIComponent(kw)+"&tags=story&hitsPerPage=6",json:true});
    return (j.hits||[]).map(h=>({source:"hackernews",title:h.title||h.story_title||"",url:h.url||("https://news.ycombinator.com/item?id="+h.objectID),signal:h.points||0})).filter(x=>x.title||x.url);
  }catch(e){ return []; }
}
async function gh(kw){
  try{ const headers={"User-Agent":"vektra",Accept:"application/vnd.github+json"}; if(CONFIG.github) headers.Authorization="Bearer "+CONFIG.github;
    const j=await http({url:"https://api.github.com/search/repositories?q="+encodeURIComponent(kw)+"&sort=stars&order=desc&per_page=4",headers,json:true});
    return (j.items||[]).map(it=>({source:"github",title:it.full_name+(it.description?" — "+it.description:""),url:it.html_url,signal:it.stargazers_count||0}));
  }catch(e){ return []; }
}

// YouTube Data API v3 — tutorials/demos as intel (optional).
async function yt(kw){
  if(!CONFIG.youtube) return [];
  try{ const j=await http({url:"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance&maxResults=4&q="+encodeURIComponent(kw)+"&key="+CONFIG.youtube,json:true});
    return (j.items||[]).map(it=>({source:"youtube",title:((it.snippet&&it.snippet.title)||"")+" — "+((it.snippet&&it.snippet.channelTitle)||""),url:"https://www.youtube.com/watch?v="+(it.id&&it.id.videoId),signal:0,desc:(it.snippet&&it.snippet.description)||""})).filter(x=>x.url&&x.url.indexOf("undefined")<0);
  }catch(e){ return []; }
}
// Product Hunt — top launches via GraphQL v2 (trend/clone/lead signal; gated on productHunt token).
async function ph(){
  if(!CONFIG.productHunt) return [];
  try{
    const r=await http({method:"POST",url:"https://api.producthunt.com/v2/api/graphql",json:true,
      headers:{Authorization:"Bearer "+CONFIG.productHunt,"Content-Type":"application/json",Accept:"application/json"},
      body:{query:"{ posts(first: 12, order: VOTES) { edges { node { name tagline url votesCount } } } }"}});
    const edges=(r&&r.data&&r.data.posts&&r.data.posts.edges)||[];
    return edges.map(e=>e.node).filter(Boolean).map(n=>({source:"producthunt",title:n.name+(n.tagline?" — "+n.tagline:""),url:n.url,signal:n.votesCount||0,desc:n.tagline||""})).filter(x=>x.url);
  }catch(e){ return []; }
}
// Reddit via Apify Reddit Scraper Lite — top/week from profit-focused subs (no Reddit app/OAuth needed).
async function rd(subs){
  if(!CONFIG.apifyToken || !subs || !subs.length) return [];
  try{
    const startUrls=subs.map(s=>({url:"https://www.reddit.com/r/"+s+"/top/?t=week"}));
    const r=await http({method:"POST",url:"https://api.apify.com/v2/acts/trudax~reddit-scraper-lite/run-sync-get-dataset-items?token="+CONFIG.apifyToken,json:true,
      headers:{"Content-Type":"application/json"},body:{startUrls:startUrls,maxItems:24,maxPostCount:24,skipComments:true},timeout:180000});
    return (r||[]).filter(p=>p&&p.title&&(p.dataType==="post"||p.url)).map(p=>({source:"reddit",title:"["+(p.communityName||("r/"+(p.parsedCommunityName||"")))+"] "+p.title,url:p.url,signal:0,desc:(p.body||p.title||"").slice(0,1500)})).filter(x=>x.url);
  }catch(e){ return []; }
}
// Apify Instagram hashtag scraper — social trend signal (opt-in, paid; gated on apifyToken).
async function ig(tags){
  if(!CONFIG.apifyToken || !tags || !tags.length) return [];
  try{ const r=await http({method:"POST",url:"https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token="+CONFIG.apifyToken,json:true,
      headers:{"Content-Type":"application/json"},body:{hashtags:tags,resultsLimit:8},timeout:120000});
    return (r||[]).map(p=>({source:"instagram",title:(((p.caption||"").replace(/\s+/g," ").slice(0,140))||("@"+(p.ownerUsername||"post"))),url:p.url||p.postUrl||"",signal:p.likesCount||0,desc:p.caption||""})).filter(x=>x.url);
  }catch(e){ return []; }
}

async function deepContent(item){
  try{
    if(item.desc) return String(item.desc).slice(0,2500);   // youtube/instagram carry their own text
    const m=item.url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)/);
    if(m && item.source==="github"){
      const headers={"User-Agent":"vektra",Accept:"application/vnd.github.raw"}; if(CONFIG.github) headers.Authorization="Bearer "+CONFIG.github;
      const txt=await http({url:"https://api.github.com/repos/"+m[1]+"/"+m[2]+"/readme",headers,json:false});
      return String(txt).slice(0,2500);
    }
    if(CONFIG.firecrawl && item.url.indexOf("http")===0){
      const r=await http({method:"POST",url:"https://api.firecrawl.dev/v1/scrape",json:true,
        headers:{Authorization:"Bearer "+CONFIG.firecrawl,"Content-Type":"application/json"},
        body:{url:item.url,formats:["markdown"],onlyMainContent:true}});
      return ((r.data&&r.data.markdown)||"").slice(0,2500);
    }
  }catch(e){}
  return "";
}

const SYS="You analyze a harvested dev/AI item for this operator: "+CONFIG.profile+". You are given the item's ACTUAL CONTENT (README/article). Read it. Value = saves time OR resellable as a service OR unlocks a new offering. Stay broad. ALSO apply a MONEY lens: opportunity_type = tool | idea | lead | trend | clone; money_score 0-100 = realistic revenue potential for the operator. Return STRICT JSON only.";
async function brain(item, content){
  const user="ITEM title: "+item.title+"\nsource: "+item.source+"\nsignal: "+item.signal+
    "\n--- CONTENT (read this) ---\n"+(content||"(no content; use title)").slice(0,2500)+
    '\n--- end ---\nReturn JSON: {"summary":"<=2 sentences, concrete","why_it_matters":"one line: exactly how the operator (per the profile) would use it, with a concrete step","relevance_score":0-100,"tags":["3-6 lowercase"],"stage":"01-ideation..09-learning-reference or null","type":"agent|skill|mcp|mvp|library|app|reference or null","opportunity_type":"tool|idea|lead|trend|clone","money_score":0-100,"action":"save|inbox|skip","confidence":0.0-1.0}';
  try{
    const r=await http({method:"POST",url:"https://api.anthropic.com/v1/messages",json:true,
      headers:{"x-api-key":CONFIG.anthropic,"anthropic-version":"2023-06-01","content-type":"application/json"},
      body:{model:"claude-haiku-4-5",max_tokens:420,system:SYS,messages:[{role:"user",content:user}]}});
    const txt=(r.content&&r.content[0]&&r.content[0].text)||"{}";
    const m=txt.match(/\{[\s\S]*\}/);
    return m?JSON.parse(m[0]):{};
  }catch(e){ return {}; }
}

// EMBED: gemini-embedding-001, 768 dims, batched with light 429 backoff.
// Sets `embedding` on each row so newly-harvested intel is searchable in "Sor" immediately.
async function embedAll(texts){
  const out=new Array(texts.length).fill(null);
  if(!CONFIG.gemini) return out;
  for(let i=0;i<texts.length;i+=40){
    const chunk=texts.slice(i,i+40);
    const body={requests:chunk.map(t=>({model:"models/gemini-embedding-001",content:{parts:[{text:(t||"").slice(0,1500)}]},outputDimensionality:768}))};
    for(let a=0;a<5;a++){
      try{
        const r=await http({method:"POST",url:"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key="+CONFIG.gemini,json:true,headers:{"Content-Type":"application/json"},body});
        const embs=r.embeddings||[];
        for(let k=0;k<chunk.length;k++){ out[i+k]= embs[k]&&embs[k].values ? embs[k].values : null; }
        break;
      }catch(e){
        const code=(e&&e.statusCode)||(e&&e.httpCode)||(e&&e.response&&e.response.statusCode)||0;
        if(code===429){ await sleep(8000*(a+1)); } else { break; }
      }
    }
    await sleep(400);
  }
  return out;
}
const vecStr=(v)=> (v&&v.length) ? ("["+v.join(",")+"]") : null;

let raw=[];
for(const kw of CONFIG.keywords){ raw.push(...await hn(kw)); raw.push(...await gh(kw)); if(CONFIG.youtube) raw.push(...await yt(kw)); await sleep(700); }
if(CONFIG.productHunt){ raw.push(...await ph()); }
if(CONFIG.apifyToken && CONFIG.redditSubs && CONFIG.redditSubs.length){ raw.push(...await rd(CONFIG.redditSubs)); }
if(CONFIG.apifyToken && CONFIG.instagramTags && CONFIG.instagramTags.length){ raw.push(...await ig(CONFIG.instagramTags)); }
const seen=new Set(); const items=[];
for(const it of raw){ if(!it.url||seen.has(it.url)) continue; seen.add(it.url); items.push(it); }

// QUALITY + BALANCE: group by source, sort each by signal desc, round-robin up to CAP.
// Keeps every source represented (Reddit/YouTube signal=0 aren't buried by GitHub stars) and
// picks the strongest items first instead of harvest order.
const CAP=40;
const bySrc={};
for(const it of items){ (bySrc[it.source]=bySrc[it.source]||[]).push(it); }
for(const s in bySrc){ bySrc[s].sort((a,b)=>(b.signal||0)-(a.signal||0)); }
const srcs=Object.keys(bySrc); const picked=[];
for(let i=0; picked.length<CAP; i++){ let added=false;
  for(const s of srcs){ if(bySrc[s][i]){ picked.push(bySrc[s][i]); added=true; if(picked.length>=CAP) break; } }
  if(!added) break; }

const rows=[];
for(const it of picked){
  const content=await deepContent(it);
  const b=await brain(it, content);
  rows.push({source_id:it.source,external_url:it.url,text:it.title,combined_text:it.title,
    summary:b.summary||null,why_it_matters:b.why_it_matters||null,relevance_score:(b.relevance_score!=null?b.relevance_score:null),
    stage:b.stage||null,type:b.type||null,tags:b.tags||[],is_new:true,
    opportunity_type:b.opportunity_type||null,money_score:(b.money_score!=null?b.money_score:null),
    for_review:((b.confidence!=null?b.confidence:0)<0.8),confidence:(b.confidence!=null?b.confidence:null),
    engagement:{signal:it.signal},content_hash:it.url});
}
// attach embeddings so new rows are immediately searchable in "Sor"
let embedded=0;
if(CONFIG.gemini && rows.length){
  const vecs=await embedAll(rows.map(r=> ((r.text||"")+" "+(r.summary||"")).trim()));
  rows.forEach((r,i)=>{ const s=vecStr(vecs[i]); if(s){ r.embedding=s; embedded++; } });
}
let stored=0;
if(rows.length){
  try{ await http({method:"POST",url:CONFIG.supabaseUrl+"/rest/v1/intel_items?on_conflict=content_hash",json:true,
    headers:{apikey:CONFIG.supabaseKey,Authorization:"Bearer "+CONFIG.supabaseKey,"Content-Type":"application/json",Prefer:"resolution=ignore-duplicates,return=minimal"},
    body:rows}); stored=rows.length;
  }catch(e){ const b=e&&e.response&&e.response.body; return [{json:{error:(b&&b.message)||(e&&e.message)||String(e)}}]; }
}

// AUTO-LIBRARIAN: promote high-value NEW items straight into the cloud library (library_embeddings)
// — the catalog grows by itself, no local machine, no files. The brain's `stage` is the folder.
// SAFE BY CONSTRUCTION: we store only the brain's bounded paraphrase (summary + why) + link — never
// raw tool/skill content — so a card can't carry hidden instructions. ALL auto cards are status:watch
// (unverified); skills are flagged in the UI; the install recipe is never stored or auto-run. So even
// skills can be CATALOGUED safely (cataloguing != installing); installing stays a deliberate human act.
const CANON_STAGES={"01-ideation":1,"02-design-ui":1,"03-frontend":1,"04-backend-database":1,"05-ai-agents":1,"06-video-media":1,"07-deployment-devops":1,"08-marketing-growth":1,"09-learning-reference":1};
function libName(text,url){
  const m=(text||"").match(/^([^\s/]+)\/([^\s—:-]+)/);
  if(m && /github\.com/.test(url||"")) return m[2];
  return ((String(text||"").split(/[—:|]| - /)[0].trim().split(/\s+/).slice(0,6).join(" "))||"untitled").slice(0,60);
}
async function promoteLibrary(rs){
  if(!CONFIG.supabaseUrl) return 0;
  const norm=u=>String(u||"").replace(/\/+$/,"").toLowerCase();
  let have=new Set();
  try{ const ex=await http({url:CONFIG.supabaseUrl+"/rest/v1/library_embeddings?select=source_url",headers:{apikey:CONFIG.supabaseKey,Authorization:"Bearer "+CONFIG.supabaseKey},json:true});
    have=new Set((ex||[]).map(r=>norm(r.source_url))); }catch(e){}
  const cards=[]; const used=new Set();
  for(const r of rs){
    if((r.relevance_score||0)<80) continue;       // high bar for permanence
    if(!r.type) continue;                          // must have a type (any of the 7); junk w/o type skipped
    if(!CANON_STAGES[r.stage] || !r.embedding) continue;  // must be one of the 9 real folders + have a vector
    const u=norm(r.external_url);
    if(!u || have.has(u) || used.has(u)) continue;
    used.add(u);
    cards.push({name:libName(r.text,r.external_url),
      text:((r.summary||r.text||"")+" — "+(r.why_it_matters||"")).slice(0,400),
      stage:r.stage, type:r.type, domain:(r.tags&&r.tags[0])||null,
      source_url:r.external_url, embedding:r.embedding});
  }
  if(!cards.length) return 0;
  try{ await http({method:"POST",url:CONFIG.supabaseUrl+"/rest/v1/library_embeddings",json:true,
    headers:{apikey:CONFIG.supabaseKey,Authorization:"Bearer "+CONFIG.supabaseKey,"Content-Type":"application/json",Prefer:"return=minimal"},
    body:cards}); return cards.length;
  }catch(e){ return 0; }
}
let promoted=0;
if(rows.length){ promoted=await promoteLibrary(rows); }

// WhatsApp morning brief — top-5 by relevance via Evolution API (gated; needs URL+instance+number).
async function whatsapp(rs, promotedN){
  if(!CONFIG.evolutionUrl||!CONFIG.evolutionInstance||!CONFIG.evolutionApiKey||!CONFIG.whatsappTo) return false;
  const top=rs.filter(r=>r.relevance_score!=null).sort((a,b)=>b.relevance_score-a.relevance_score).slice(0,5);
  if(!top.length) return false;
  const lines=top.map((r,i)=>(i+1)+". ["+r.relevance_score+(r.money_score!=null?"/💰"+r.money_score:"")+"] "+(r.text||"").slice(0,80)+"\n"+((r.why_it_matters||r.summary||"").slice(0,120))+"\n"+r.external_url);
  const msg="🧠 Vektra — bugünün en iyi "+top.length+" bulgusu\n\n"+lines.join("\n\n")+
    (promotedN?("\n\n📚 "+promotedN+" araç kütüphaneye otomatik eklendi (Sor'da aranır)."):"");
  try{
    await http({method:"POST",url:CONFIG.evolutionUrl.replace(/\/$/,"")+"/message/sendText/"+encodeURIComponent(CONFIG.evolutionInstance),json:true,
      headers:{apikey:CONFIG.evolutionApiKey,"Content-Type":"application/json"},
      body:{number:CONFIG.whatsappTo,text:msg}});
    return true;
  }catch(e){ return false; }
}
let notified=false;
if(stored){ notified=await whatsapp(rows, promoted); }
return [{json:{harvested:items.length,stored:stored,embedded:embedded,promoted:promoted,notified:notified}}];
