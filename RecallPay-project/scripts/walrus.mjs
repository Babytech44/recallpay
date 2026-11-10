import { MemWal } from '@mysten-incubation/memwal';
import { seed, receiptFile } from './walrus-core.mjs';
const [action,...args]=process.argv.slice(2);
const accountId=process.env.MEMWAL_ACCOUNT_ID, key=process.env.MEMWAL_PRIVATE_KEY, namespace=process.env.MEMWAL_NAMESPACE||'recallpay-demo';
if(!['health','seed','recall'].includes(action)){console.error('Use: node --env-file=.env.local scripts/walrus.mjs health | seed | recall [query]');process.exit(1)}
if(!accountId||!key){console.error('Missing MEMWAL_ACCOUNT_ID or MEMWAL_PRIVATE_KEY. Copy .env.example to .env.local and configure your own credentials.');process.exit(1)}
const client=MemWal.create({key,accountId,namespace,serverUrl:'https://relayer.memory.walrus.xyz'});
try {
 if(action==='health'){await client.health();console.log('Walrus Mainnet relayer health check succeeded. This alone does not verify write or recall permissions.');}
 if(action==='seed'){console.log('Writing synthetic demo memories to the Walrus Mainnet relayer. This may incur costs.');const result=await seed(client,receiptFile(accountId,namespace));console.log(`Confirmed ${result.writes.filter(x=>x.blobId).length} writes in ${receiptFile(accountId,namespace)}. Run recall separately to verify retrieval.`)}
 if(action==='recall'){const query=args.join(' ')||'What savings strategies and preferences work for the demo user?';const result=await client.recall({query,limit:10});console.log(JSON.stringify({query,results:result.results,total:result.total},null,2));if(!result.results?.length)console.warn('No matches returned; do not treat this as a successful retrieval.');}
} catch(err){console.error('Walrus operation failed:',err.message);process.exitCode=1}
