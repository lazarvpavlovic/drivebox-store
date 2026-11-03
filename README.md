# DRIVEBOX

React + Vite storefront for DRIVEBOX.

## Setup
1. Install Node.js.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the Supabase Project URL and **Publishable** key (or legacy anon public key).
5. Run `npm run dev`; use `npm run build` to verify the production build.

Never put a Supabase Secret key (`sb_secret_...`) in this project or any public repository.

## Deploy
Deploy this project on Vercel (or another Vite-compatible host), not directly as raw source on GitHub Pages. Add the two environment variables in the hosting dashboard.

The checkout expects the existing `create_drivebox_order` RPC and its parameter names to match the database setup. Verify the RPC signature before accepting real orders. This starter is not yet a verified production checkout.
