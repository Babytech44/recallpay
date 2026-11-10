import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { seed, fixtures, receiptFile } from '../scripts/walrus-core.mjs';
test('records only completed writes and resumes without duplicate submissions', async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'recallpay-')); const file=path.join(dir,'receipts.json');let calls=0;let fail=true;
 const mock={async remember(){return {job_id:'job-'+(++calls)}},async waitForRememberJob(id){if(id==='job-2'&&fail){fail=false;throw Error('temporary')}return {blob_id:'blob-'+id}}};
 try {await assert.rejects(seed(mock,file,()=>{}),/temporary/); let before=JSON.parse(await readFile(file));assert.equal(before.writes.length,2);assert.equal(before.writes.filter(x=>x.blobId).length,1);let done=await seed(mock,file,()=>{});assert.equal(done.writes.filter(x=>x.blobId).length,10);assert.equal(calls,fixtures.length);await seed(mock,file,()=>{});assert.equal(calls,10);assert.notEqual(receiptFile('a','x'),receiptFile('b','x'));}finally{await rm(dir,{recursive:true,force:true})}
});
