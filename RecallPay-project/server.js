const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer(async (req,res)=>{
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
