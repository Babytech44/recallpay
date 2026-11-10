# RecallPay
A hackathon prototype of a savings assistant that remembers what worked. Run with Node.js 20+: `npm start`, then open http://localhost:3000.

## What's working
- Editable savings goal and rule-based comparison of generic vs. personalized suggestions.
- Add and delete browser-local memories; feedback changes the suggestion and is saved locally.
- Optional read-only Sui balance lookup via Tatum. Set `TATUM_API_KEY` in the server environment before starting. No private wallet key is requested. The JSON-RPC endpoint may require updating to Tatum's current Sui gRPC API if unavailable.

## Honest limitations / next steps
This is a prototype, not yet hackathon compliant. Memories are browser-local only, not Walrus. The suggested responses are deterministic rules, not an LLM, and arbitrary notes aren't semantically interpreted. The expenses/starting memories are synthetic. Tatum has not been tested against a real key. There is no authentication, multi-user isolation, or backend persistence. Do not use real personal financial data. The app provides illustrative suggestions, not financial advice.

Next: set up a Walrus Memory account and delegate key; implement secure server-side remember/recall with the SDK and verify at least 10 Mainnet writes and recall after restart; test Tatum using real credentials; add isolated user identity, privacy controls, tests, deployment, demo, public repo, and blog post. Do not commit credentials.

## Walrus Mainnet: next integration step

The SDK-backed command-line integration is deliberately separate from the public web preview: the preview has no authentication, so exposing a shared delegate key through web-accessible read/write endpoints would let others use it. The web UI still uses **browser storage only** and does not read the SDK's memories yet. Do not use real financial data.

1. Use Node.js 22 or newer. Run `npm install`.
2. In the [Walrus Memory dashboard](https://memory.walrus.xyz/dashboard), create your own Mainnet account and delegate. Obtain its **MemWal account object ID** and the **delegate private key**. The delegate public key / agent ID requested by the hackathon form is a separate value.
3. Copy `.env.example` to `.env.local`, then edit it privately on your machine. Set `MEMWAL_ACCOUNT_ID` and `MEMWAL_PRIVATE_KEY`. Never share the private key or commit this file. Keep the namespace consistent across runs.
4. Run `npm run walrus:health`, then, only when ready to write ten synthetic demo memories on Mainnet, `npm run walrus:seed`. Writes can incur costs. Each accepted job is saved before waiting; only a completed job with a blob ID counts as confirmed. Records are saved under `receipts/` (ignored by git). If a job permanently fails, inspect its status and resolve it before deliberately removing its entry and retrying; an interrupted request before its job ID is saved can still produce a duplicate.
5. Run `npm run walrus:recall` in a **new process** and check that the text and blob IDs match what was written. A successful health check alone does not verify account permissions, writes, or recall. The script uses the Mainnet relayer fixed in code.

The Mainnet pathway has not yet been run with credentials, and the mock test does not prove live integration. After live verification, the next engineering step is authenticated per-user UI integration, followed by separate verified Tatum Sui access. Avoid placing a shared privileged service behind a publicly accessible unauthenticated endpoint.

Documentation: [Walrus SDK quick start](https://docs.wal.app/walrus-memory/sdk/quick-start), [SDK API](https://docs.wal.app/walrus-memory/sdk/api-reference), [hackathon requirements](https://tatum.io/hackathon/total-recall).

## Money-sticker planner prototype
The current interface has a manually entered naira planning balance, virtual stickers for expenses, plans and savings, a dated in-app upcoming list, and unexpected purchase logging. Available-to-plan = planning balance − active sticker allocations − logged unexpected purchases. Over-allocation is displayed as a shortfall rather than automatically changing a sticker. Hold-off excludes a sticker's allocation and records a browser-local decision; it does not cancel a subscription. Dates are one-off and hold-off does not automatically reset or generate recurring bills. Reminders appear only inside the app; there are no push/email notifications. Goal amounts are user-entered virtual allocations, not actual balances.

The personalized comparison uses deterministic rules based on sticker priority, balance and shortfall. Free-text journal memories are displayed but are not interpreted by this prototype. Data is browser-local, not private multi-user storage, and the Walrus CLI is not connected to the interface. Sui lookup is read-only and not sign-in, deposits, transfers or naira conversion. Live Walrus and Tatum integrations require credentials and have not been verified.
