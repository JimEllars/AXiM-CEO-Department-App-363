# AXiM CEO Department App

## Cloudflare deployment

- Frontend: https://axim-ceo-department-app-363.pages.dev
- API Worker: https://ceo-edge-worker.jrellars.workers.dev
- Telemetry: Cloudflare KV namespace `axim-ceo-department-telemetry`

Set `VITE_CEO_WORKER_URL` to the Worker URL when building the frontend.

Before accepting production requests, add `AXIM_CORE_SECRET` and
`CEO_CLIENT_SECRET` as Worker secrets. The shared client secret must never be
included in a Vite environment variable because Vite embeds those values in the
browser bundle.
