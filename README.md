# Dual Chain AI Trader V1

Solana + Robinhood Chain AI meme-token research and **paper trading** scaffold.

## What V1 does
- Normalizes token candidates from two chains.
- Runs a 10-stage handoff pipeline.
- Produces BUY / SELL / HOLD / VETO decisions.
- Applies hard risk limits.
- Records paper trades.
- Keeps live execution disabled.

## Important
This version intentionally does **not** contain private-key handling or live order execution.
Use it to validate the strategy with paper trading first.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Handoff
Every agent receives the previous agent's structured result. See `lib/agents.ts`.

## Next production steps
1. Connect reliable Solana and Robinhood Chain market-data providers.
2. Add Supabase persistence.
3. Run paper trading for a meaningful sample.
4. Add a separately isolated transaction signer/executor only after testing.
