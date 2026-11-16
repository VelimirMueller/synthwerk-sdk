# create-synthwerk-app

Scaffolds a Synthwerk app: Vite with React (default) or Vue, OIDC sign-in and a streamed chat. Not on npm yet.

```sh
# From a built synthwerk-sdk checkout (the @synthwerk/* packages are not on npm yet):
pnpm build
node packages/create-synthwerk-app/dist/cli.js ../my-app --local            # React
node packages/create-synthwerk-app/dist/cli.js ../my-app --local -t vue     # Vue

# After the npm publish:
pnpm create synthwerk-app my-app --template vue
```

- `--template react|vue` picks the template. React is the default. A terminal asks for the directory and template; CI and `--yes` ask nothing.
- `--api-url`, `--auth-url`, `--client-id` and `--project-id` write `.env.local`. Without them the app names the missing values.
- `--local` packs `@synthwerk/*` from a synthwerk-sdk checkout into `<app>/.synthwerk/` and points pnpm `overrides` at the tarballs. To move to npm, delete that block in `pnpm-workspace.yaml` and the `.synthwerk/` folder, then run `pnpm install`.
- `--install` runs `pnpm install` after the scaffold.
- The app signs in with OIDC code + PKCE (`oidc-client-ts`, tokens in memory) and hands the token to the SDK through `getToken`.
- Each app has tests (Vitest) against a mock of the identity and llm APIs: `pnpm test`, `pnpm typecheck`, `pnpm build`.

Reference: [docs/features/create-synthwerk-app.md](../../docs/features/create-synthwerk-app.md).
