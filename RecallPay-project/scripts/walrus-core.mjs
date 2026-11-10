import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const fixtures = [
  'Demo user wants to save 500,000 naira in three months.',
  'Demo user has already saved 180,000 naira toward the goal.',
  'Demo user found a 30% spending cut too restrictive.',
  'Demo user found a smaller weekly spending limit easier to follow.',
  'Demo user prefers gradual, realistic changes over aggressive targets.',
  'Demo user wants to review savings progress every Sunday.',
  'Demo user prefers food spending suggestions that allow an occasional treat.',
  'Demo user wants to keep an emergency buffer before increasing savings.',
  'Demo user found automatic weekly transfers useful for staying consistent.',
  'Demo user wants reminders to be encouraging, not judgmental.'
];
export function receiptFile(accountId, namespace) {
  const scope = createHash('sha256').update(`${accountId}\0${namespace}`).digest('hex').slice(0,16);
  return path.join('receipts', `walrus-${scope}.json`);
}
async function load(file) {
  try { return JSON.parse(await readFile(file,'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return { writes: [] }; throw e; }
}
async function persist(file, data) {
  await mkdir(path.dirname(file), {recursive:true});
  await writeFile(file, JSON.stringify(data,null,2)+'\n', {mode:0o600});
}
export async function seed(client, file, log=console.log) {
  const evidence=await load(file);
  for (const [index,text] of fixtures.entries()) {
    const fixtureHash=createHash('sha256').update(text).digest('hex');
    if(evidence.writes.some(x=>x.fixtureHash===fixtureHash && x.blobId)) { log(`Skipping ${index+1}/10: already confirmed in this receipt file.`); continue; }
    log(`Writing ${index+1}/10…`);
    // Save the job ID before waiting, so an interrupted process does not automatically submit the same fixture again.
    let entry=evidence.writes.find(x=>x.fixtureHash===fixtureHash);
    if(!entry) { const job=await client.remember(text); entry={fixtureHash,jobId:job.job_id}; evidence.writes.push(entry); await persist(file,evidence); }
    const result=await client.waitForRememberJob(entry.jobId);
    if(!result.blob_id) throw new Error(`Job ${entry.jobId} completed without a blob ID; not counted.`);
    entry.blobId=result.blob_id; entry.confirmedAt=new Date().toISOString(); await persist(file,evidence);
    log(`Confirmed ${index+1}/10 · blob ${entry.blobId}`);
  }
  return evidence;
}
