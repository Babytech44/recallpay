# RecallPay

### Your money has plans. RecallPay helps you remember.

RecallPay is a consumer finance planning prototype built for the Tatum x Walrus Total Recall hackathon. It helps people plan monthly expenses, future moments, and savings while keeping track of what is left for unexpected purchases.

**Live demo:** https://recallpay.onrender.com/

**Track:** Consumer Finance Apps

## Try the demo

1. Open the live link and select **Try the demo**. The first load may take a minute because the free hosting service can sleep when inactive.
2. Explore monthly expenses, future expenses, savings, and reminders.
3. Log an unexpected purchase and see how it changes the amount left to plan.
4. Open **Memory journal** and select **Recall demo memories from Walrus**.
5. Compare the generic advice with the advice informed by recalled memories. The app displays the fictional memories and their blob IDs.
6. Open **Sui wallet** to look up a public Sui address through Tatum.

## How Walrus Memory changes the advice

A generic suggestion might tell someone to reduce spending without considering what they have already tried.

In our fictional demo, feedback that a previous suggestion was **too strict** is written to Walrus Memory on Mainnet. When RecallPay recalls that feedback in a later session, it suggests a smaller weekly contribution instead.

The protected feedback demo also supports a **helpful** response. Advice changes through explicit rules; the app is not retraining an AI model.

We wrote and recalled at least 10 synthetic demo memories on Walrus Mainnet. Write receipts were saved from the workflow, and recalled memories display blob IDs in the app.

## Tatum and Sui

RecallPay uses **Tatum Sui Mainnet gRPC** to look up the SUI balance of a public address. We verified the lookup in the live app.

The lookup is read-only. It does not sign a user in, move funds, or include the SUI balance in the naira planning balance.

## Technology

- **Frontend:** HTML, CSS, and JavaScript
- **Backend:** Node.js
- **Persistent demo memory:** Walrus Memory SDK and Mainnet relayer
- **Onchain data:** Tatum Sui Mainnet gRPC
- **Hosting:** Render

## Privacy and limitations

- This is a prototype, not a banking service or financial advice.
- Starting amounts and Walrus demo memories are fictional.
- Allocations are virtual. RecallPay does not hold, lock, or move money.
- The app does not automatically pay or cancel bills.
- Reminders are currently in-app only.
- Google, Telegram, and Sui wallet sign-in are not yet implemented.
- Personal notes remain in browser storage and are separate from the shared Walrus demo.
- The feedback write is protected by a private operator code. The shared demo and its basic limits are not production-grade user isolation or security.
- Do not enter real personal financial information into the demo.

## Run locally

The application is inside the `RecallPay-project` folder. With a supported Node.js version installed:

```bash
npm install
npm test
npm start
```

Open `http://localhost:3000`.

Never commit API keys, Walrus delegate private keys, or the demo access code to the repository.

## Hackathon

Built for the [Tatum x Walrus Total Recall hackathon](https://tatum.io/hackathon/total-recall).

- [Walrus memory test workflow](https://github.com/Babytech44/recallpay/actions/workflows/walrus-memory-test.yml)
- [Tatum Sui gRPC test workflow](https://github.com/Babytech44/recallpay/actions/workflows/tatum-grpc-test.yml)
