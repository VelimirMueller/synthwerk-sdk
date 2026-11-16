# Synthwerk app

Made with `create-synthwerk-app`. It signs in with OIDC and chats through the Synthwerk SDK.

## Start

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. In Zitadel, add a user agent app (PKCE, no secret). Allow the redirect URI `http://localhost:5173/`.
4. `pnpm dev`

## Checks

- `pnpm test`: app tests against a mock of the identity and llm APIs. No network.
- `pnpm typecheck` and `pnpm build`.

## Files

- `src/auth.ts`: the sign-in (`oidc-client-ts`, tokens in memory). Swap it for your own auth library.
- `src/config.ts`: the `VITE_*` settings.
- `tests/support/mock-edge.ts`: the API mock of the tests.

## npm or local packages

- A `--local` scaffold adds a pnpm `overrides` block and a `.synthwerk/` folder with package tarballs.
- For the npm versions, delete both, then run `pnpm install`.
