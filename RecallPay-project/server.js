const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {getBalance} = require('./tatum');
let tatumRequests=[];const tatumCache=new Map();
// Public demo: only return a small allowlist of synthetic fixture memories.
// This is not authentication or a general-purpose user memory API.
const allowedDemoMemories = new Set([
  'Demo user found a 30% spending cut too restrictive.',
  'Demo user found a smaller weekly spending limit easier to follow.'
]);
const feedbackTexts = {'too_strict':'RecallPay demo feedback: the savings advice was too strict.', 'helpful':'RecallPay demo feedback: the savings advice was helpful.'};
let recallCache = null, recallInFlight = null, writeBusy = false, writeTimes = [], attemptTimes = [];
function clientForDemo(MemWal) {return MemWal.create({key:process.env.MEMWAL_PRIVATE_KEY,accountId:process.env.MEMWAL_ACCOUNT_ID,serverUrl:'https://relayer.memory.walrus.xyz',namespace:'recallpay-demo'});}
function sameSecret(provided,expected){if(typeof provided!=='string'||typeof expected!=='string'||expected.length<32)return false;return crypto.timingSafeEqual(crypto.createHash('sha256').update(provided).digest(),crypto.createHash('sha256').update(expected).digest());}

async function fetchDemoMemories() {
  if (recallCache && Date.now() - recallCache.at < 60000) return recallCache.data;
  if (recallInFlight) return recallInFlight;
  recallInFlight = (async () => {
    const { MemWal } = await import('@mysten-incubation/memwal');
    const client = clientForDemo(MemWal);
    const found = await client.recall({query:'What savings strategies and preferences work for the demo user?',limit:10});
    const results = (found.results || []).filter(x => allowedDemoMemories.has(x.text) && typeof x.blob_id === 'string' && /^[A-Za-z0-9_-]{1,150}$/.test(x.blob_id)).map(x=>({text:x.text,blobId:x.blob_id}));
    const feedbackResult=await client.recall({query:'RecallPay demo feedback savings advice',limit:100,sort:'recent'});
    const candidates=(feedbackResult.results||[]).filter(x=>Object.values(feedbackTexts).includes(x.text)&&typeof x.blob_id==='string'&&/^[A-Za-z0-9_-]{1,150}$/.test(x.blob_id)&&typeof x.created_at==='string'&&Number.isFinite(Date.parse(x.created_at))).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
    // If two conflicting records share a timestamp, don't guess which one is newest.
    const top=candidates[0]; const tied=top&&candidates.some(x=>x.text!==top.text&&Date.parse(x.created_at)===Date.parse(top.created_at));
    const feedback=top&&!tied?{choice:top.text===feedbackTexts.too_strict?'too_strict':'helpful',text:top.text,blobId:top.blob_id,createdAt:top.created_at}:null;
    const data = {source:'Walrus Mainnet', memories:results, feedback};
    recallCache = {at:Date.now(),data};
    return data;
  })();
  try { return await recallInFlight; } finally { recallInFlight = null; }
}
const server = http.createServer(async (req,res)=>{
  if(req.url==='/api/demo-memories' && req.method==='GET') {
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(!process.env.MEMWAL_ACCOUNT_ID || !process.env.MEMWAL_PRIVATE_KEY) {res.writeHead(503);return res.end(JSON.stringify({error:'Walrus demo is not configured on the server.'}));}
    try {const data=await fetchDemoMemories();return res.end(JSON.stringify(data));}
    catch(e) {res.writeHead(502);return res.end(JSON.stringify({error:'Walrus recall is unavailable. Try again later.'}));}
  }
  if(req.url==='/api/demo-feedback' && req.method==='POST') {
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(!process.env.MEMWAL_ACCOUNT_ID||!process.env.MEMWAL_PRIVATE_KEY||!process.env.DEMO_WRITE_TOKEN||process.env.DEMO_WRITE_TOKEN.length<32){res.writeHead(503);return res.end(JSON.stringify({error:'Protected feedback writing is not configured.'}));}
    const now=Date.now();attemptTimes=attemptTimes.filter(t=>now-t<60000);writeTimes=writeTimes.filter(t=>now-t<3600000);
    if(attemptTimes.length>=12 || writeTimes.length>=5){res.writeHead(429);return res.end(JSON.stringify({error:'Demo limit reached. Please try later.'}));}attemptTimes.push(now);
    if(!String(req.headers['content-type']||'').startsWith('application/json')){res.writeHead(415);return res.end(JSON.stringify({error:'JSON required.'}));}
    try {
      let raw='';for await (const c of req){raw+=c;if(raw.length>2048){res.writeHead(413);return res.end(JSON.stringify({error:'Request too large.'}));}}
      const input=JSON.parse(raw);
      if(!sameSecret(input.token,process.env.DEMO_WRITE_TOKEN)){res.writeHead(403);return res.end(JSON.stringify({error:'Incorrect demo access code.'}));}
      if(!Object.hasOwn(feedbackTexts,input.choice)){res.writeHead(400);return res.end(JSON.stringify({error:'Choose an available demo response.'}));}
      if(writeBusy){res.writeHead(429);return res.end(JSON.stringify({error:'Another write is in progress.'}));}
      writeBusy=true;writeTimes.push(now);
      try {const {MemWal}=await import('@mysten-incubation/memwal');const client=clientForDemo(MemWal);const job=await client.remember(feedbackTexts[input.choice]);const result=await client.waitForRememberJob(job.job_id);if(!result.blob_id)throw Error('No blob ID');recallCache=null;return res.end(JSON.stringify({message:'Feedback confirmed on Walrus Mainnet.',blobId:result.blob_id}));}
      catch {res.writeHead(502);return res.end(JSON.stringify({error:'Write could not be confirmed. It may still complete; check the Walrus dashboard before retrying to avoid duplicate writes.'}));}
      finally{writeBusy=false;}
    } catch {res.writeHead(400);return res.end(JSON.stringify({error:'Invalid request.'}));}
  }
  if(req.url==='/api/wallet' && req.method==='POST') {
    let raw=''; for await (const chunk of req) {raw+=chunk;if(raw.length>2048){res.writeHead(413);return res.end();}}
    res.setHeader('Content-Type','application/json');
    try {
      const {address}=JSON.parse(raw);
      if(!/^0x[0-9a-fA-F]{64}$/.test(address)) {res.writeHead(400);return res.end(JSON.stringify({error:'Enter a Sui address: 0x followed by 64 hexadecimal characters.'}));}
      if(!process.env.TATUM_API_KEY){res.writeHead(503);return res.end(JSON.stringify({error:'Tatum is not configured yet. Add TATUM_API_KEY to the server environment.'}));}
      const normalized=address.toLowerCase(), now=Date.now();
      const cached=tatumCache.get(normalized);
      if(cached && now-cached.at<60000) return res.end(JSON.stringify({balance:cached.balance,address,source:'Tatum Sui Mainnet gRPC (cached up to 60 seconds)'}));
      tatumRequests=tatumRequests.filter(t=>now-t<3600000);
      if(tatumRequests.length>=60 || tatumRequests.filter(t=>now-t<60000).length>=10){res.writeHead(429);return res.end(JSON.stringify({error:'Demo lookup limit reached. Please try again later.'}));}
      tatumRequests.push(now);
      const balance=await getBalance(normalized,process.env.TATUM_API_KEY);
      if(tatumCache.size>=100)tatumCache.delete(tatumCache.keys().next().value);
      tatumCache.set(normalized,{balance,at:Date.now()});
      return res.end(JSON.stringify({balance,address,source:'Tatum Sui Mainnet gRPC'}));
    } catch(e){res.writeHead(502);return res.end(JSON.stringify({error:'Wallet lookup failed. Check your Tatum configuration and try again.'}));}
  }
  const file=req.url==='/'?'index.html':req.url.slice(1).split('?')[0];
  if(!['index.html','app.js','style.css'].includes(file)){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html'); fs.createReadStream(path.join(__dirname,file)).pipe(res);
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('RecallPay listening'));
