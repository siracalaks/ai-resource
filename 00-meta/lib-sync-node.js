// Vektra Library Sync — n8n Code node (sanitized — fill CFG).
// Mirrors the cloud library (Supabase library_embeddings) into THIS GitHub repo as
// .md cards + registry.csv/json, via the GitHub Contents API. This replaces the
// GitHub Action (which needs Actions billing) — runs fully inside n8n, free.
// Workflow: Schedule Trigger (daily) -> THIS Code node. Keys live in n8n only.
const CFG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseKey: "PASTE_SERVICE_ROLE_KEY",      // reads library_embeddings
  github: "PASTE_GITHUB_PAT",                  // PAT with `repo` (contents:write) scope
  ghOwner: "your-github-username",
  ghRepo: "vektra",
  ghBranch: "master",
};
const http = this.helpers.httpRequest;
const OWNER=CFG.ghOwner, REPO=CFG.ghRepo, BRANCH=CFG.ghBranch||"master";
const GH="https://api.github.com/repos/"+OWNER+"/"+REPO+"/contents/";
const ghH={Authorization:"Bearer "+CFG.github,"User-Agent":"vektra","Accept":"application/vnd.github+json"};
const CANON={"01-ideation":1,"02-design-ui":1,"03-frontend":1,"04-backend-database":1,"05-ai-agents":1,"06-video-media":1,"07-deployment-devops":1,"08-marketing-growth":1,"09-learning-reference":1};
const MAX_PER_RUN=25;

const slug=(s)=>(String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60))||"untitled";
const norm=(u)=>String(u||"").replace(/\/+$/,"").toLowerCase();
const b64e=(s)=>Buffer.from(String(s),"utf8").toString("base64");
const b64d=(s)=>Buffer.from(String(s),"base64").toString("utf8");

async function ghGet(path){
  try{ return await http({url:GH+encodeURI(path)+"?ref="+BRANCH,headers:ghH,json:true}); }
  catch(e){ return null; }
}
async function ghPut(path, content, message, sha){
  const body={message:message, content:b64e(content), branch:BRANCH};
  if(sha) body.sha=sha;
  return await http({method:"PUT",url:GH+encodeURI(path),headers:ghH,json:true,body});
}

// 1) cloud library
const lib=await http({url:CFG.supabaseUrl+"/rest/v1/library_embeddings?select=name,text,stage,type,domain,source_url&limit=5000",
  headers:{apikey:CFG.supabaseKey,Authorization:"Bearer "+CFG.supabaseKey},json:true});

// 2) current registry.json from the repo
const regFile=await ghGet("registry.json");
let reg=[]; let regSha=null;
if(regFile && regFile.content){ try{ reg=JSON.parse(b64d(regFile.content)); regSha=regFile.sha; }catch(e){} }
const have=new Set(reg.map(x=>norm(x.source_url)));
const TODAY=new Date().toISOString().slice(0,10);

// 3) write any new cloud card as a stage-folder .md (folder is implicit in the path)
let added=0; const used=new Set();
for(const x of (lib||[])){
  if(added>=MAX_PER_RUN) break;
  const u=norm(x.source_url), stage=x.stage;
  if(!u || have.has(u) || used.has(u) || !CANON[stage]) continue;
  used.add(u);
  const name=x.name||"untitled";
  let path=stage+"/"+slug(name)+".md";
  if(await ghGet(path)){ have.add(u); continue; }     // file already there
  const typ=x.type||"reference", domain=x.domain||"null";
  const what=String(x.text||name).replace(/\s+/g," ").trim();
  const card="---\nname: "+name+"\nstage: "+stage+"\ntype: "+typ+"\ndomain: "+domain+
    "\ncost: <free | freemium | paid | self-hostable>\nconn_type: <mcp | cli | git-clone | api | skill | npm | self-host | reference>"+
    "\nstatus: watch\nadded: "+TODAY+"\nsource_url: "+x.source_url+
    "\nstars: null\nlast_commit: null\nweekly_downloads: null\nused_by: null\ntrust_score: null\nverified: false\nlast_checked: null\n---\n\n"+
    "<!-- Auto-synced from the cloud library (engine auto-promoted). status: watch — verify the recipe before relying on it. -->\n\n"+
    "# "+name+"\n\n**What it does:** "+what+"\n\n**Connection recipe:**\n```bash\n# VERIFY before use — do not invent.\n```\n";
  try{ await ghPut(path, card, "chore(library): add "+name+" [skip ci]");
    reg.push({name:name,stage:stage,type:typ,domain:(x.domain||""),cost:"",conn_type:"",status:"watch",added:TODAY,source_url:x.source_url});
    have.add(u); added++;
  }catch(e){}
}

// 4) update registry.json + registry.csv once, if anything was added
if(added){
  try{ await ghPut("registry.json", JSON.stringify(reg,null,2)+"\n", "chore(library): registry +"+added+" [skip ci]", regSha); }catch(e){}
  const cols=["name","stage","type","domain","cost","conn_type","status","added","source_url"];
  const esc=(v)=>{ v=String(v==null?"":v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  const csv=cols.join(",")+"\n"+reg.map(r=>cols.map(c=>esc(r[c])).join(",")).join("\n")+"\n";
  const csvFile=await ghGet("registry.csv");
  try{ await ghPut("registry.csv", csv, "chore(library): registry.csv [skip ci]", csvFile?csvFile.sha:null); }catch(e){}
}
return [{json:{library:(lib||[]).length, added:added}}];
