
# Intent‑Centric Payments — Anoma‑style Prototype

Single‑file React prototype showing **intent‑centric** cross‑chain payments UX: you declare *what* you want, a solver computes *how* to execute atomically across chains with optional privacy and gas abstraction.

https://user-images.githubusercontent.com/—/— (demo gif placeholder)

## Quickstart

```bash
# Node 18+ recommended
pnpm i   # or: npm i / yarn
pnpm dev # runs on http://localhost:5173
```

## Stack

- Vite + React + TypeScript
- Tailwind (minimal), Radix Primitives (Tabs, Select, Slider, Checkbox)
- framer‑motion, lucide‑react

## Where is the code?

All logic lives in `src/App.tsx`. Minimal UI wrappers in `src/components/ui/*` so the demo is portable without shadcn setup.

## What’s simulated?

- Liquidity/quotes (AMMs, bridges), privacy (ZK), and atomicity are mocked for demo.
- Replace `solveIntent(...)` with real adapters to DEXs/bridges + proof system.
- Plug a *solver marketplace* by requesting off‑chain quotes and ranking by your policy.

## License

MIT
