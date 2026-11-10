const http = require('http');
const fs = require('fs');
const path = require('path');
// Public demo: only return a small allowlist of synthetic fixture memories.
// This is not authentication or a general-purpose user memory API.
const allowedDemoMemories = new Set([
  'Demo user found a 30% spending cut too restrictive.',
  'Demo user found a smaller weekly spending limit easier to follow.'
]);
let recallCache = null, recallInFlight = null;
async function fetchDemoMemories() {
  if (recallCache && Date.now() - recallCache.at < 60000) return recallCache.data;
  if (recallInFlight) return recallInFlight;
  recallInFlight = (async () => {
    const { MemWal } = await import('@mysten-incubation/memwal');
    const client = MemWal.create({key:process.env.MEMWAL_PRIVATE_KEY,accountId:process.env.MEMWAL_ACCOUNT_ID,serverUrl:'https://relayer.memory.walrus.xyz',namespace:'recallpay-demo'});
    const found = await client.recall({query:'What savings strategies and preferences work for the demo user?',limit:10});
    const results = (found.results || []).filter(x => allowedDemoMemories.has(x.text) && typeof x.blob_id === 'string' && /^[A-Za-z0-9_-]{1,150}$/.test(x.blob_id)).map(x=>({text:x.text,blobId:x.blob_id}));
    const data = {source:'Walrus Mainnet', memories:results};
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
  if(req.url==='/api/wallet' && req.method==='POST') {
    let raw=''; for await (const chunk of req) {raw+=chunk;if(raw.length>2048){res.writeHead(413);return res.end();}}
    res.setHeader('Content-Type','application/json');
    try {
      const {address}=JSON.parse(raw);
      if(!/^0x[0-9a-fA-F]{64}$/.test(address)) {res.writeHead(400);return res.end(JSON.stringify({error:'Enter a Sui address: 0x followed by 64 hexadecimal characters.'}));}
      if(!process.env.TATUM_API_KEY){res.writeHead(503);return res.end(JSON.stringify({error:'Tatum is not configured yet. Add TATUM_API_KEY to the server environment.'}));}
      const response=await fetch('https://sui-mainnet.gateway.tatum.io',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.TATUM_API_KEY},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'suix_getBalance',params:[address,'0x2::sui::SUI']})});
      const data=await response.json(); if(!response.ok||data.error||!data.result) throw new Error(data.error?.message||'Tatum request failed');
      return res.end(JSON.stringify({balance:data.result.totalBalance,address,source:'Tatum Sui Mainnet'}));
    } catch(e){res.writeHead(502);return res.end(JSON.stringify({error:'Wallet lookup failed. Check your Tatum configuration and try again.'}));}
  }
  const file=req.url==='/'?'index.html':req.url.slice(1).split('?')[0];
  if(!['index.html','app.js','style.css'].includes(file)){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html'); fs.createReadStream(path.join(__dirname,file)).pipe(res);
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('RecallPay listening'));
