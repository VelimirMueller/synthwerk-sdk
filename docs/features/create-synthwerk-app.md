---
title: create-synthwerk-app scaffold
slug: create-synthwerk-app
status: beta
epic: E7
owner: sdk
paths: ["packages/create-synthwerk-app/src/**", "packages/create-synthwerk-app/scripts/**", "packages/create-synthwerk-app/templates/**"]
api: ["GET /identity/v1/me", "POST /llm/v1/conversations", "POST /llm/v1/conversations/{id}/messages"]
events: []
mcp: []
updated: 2026-11-16
---

# create-synthwerk-app scaffold

> **In 30 seconds**
> - `create-synthwerk-app` 0.1.0 makes a new Vite app that signs in and chats.
> - React is the default template. `--template vue` gives the Vue template.
> - The app uses `@synthwerk/react` or `@synthwerk/vue` and `@synthwerk/tokens`. Vue also uses `@synthwerk/ui-vue`.
> - Each app has tests against a mock of the identity and llm APIs.
> - CI makes an app from each template and runs its checks (synthwerk#52).

## What it does

- The CLI copies a template into a new directory and sets the package name.
- It writes `.env.local` from `--api-url`, `--auth-url`, `--client-id` and `--project-id`.
- A terminal asks for the directory and the template. CI and `--yes` ask nothing.
- `--local` packs the `@synthwerk/*` packages from a synthwerk-sdk checkout into `<app>/.synthwerk/`.
- Then pnpm `overrides` in `pnpm-workspace.yaml` point the packages at these tarballs.
- The tarballs hold the same files as the npm packages.
- `--install` runs `pnpm install` after the scaffold.

### The app

- Sign-in: OIDC authorization code with PKCE through `oidc-client-ts`. The issuer is Zitadel.
- Tokens stay in memory. A reload signs the user out of the app, not out of Zitadel.
- `getToken({ refresh })` gives the SDK the access token. A refresh uses the refresh token once.
- After sign-in the app shows the org and roles from identity `GET /v1/me`.
- The chat uses `useChat()`. Tokens show as they stream. "Stop" aborts the stream.
- Without settings, the app names the missing `VITE_*` values.

## How to use

1. Build the checkout: `pnpm build`.
2. Make an app: `node packages/create-synthwerk-app/dist/cli.js ../my-app --local`. Add `-t vue` for Vue.
3. In the app: `pnpm install`.
4. Copy `.env.example` to `.env.local` and fill in the values.
5. In Zitadel, add a user agent app with PKCE. Allow the redirect URI `http://localhost:5173/`.
6. Start the app: `pnpm dev`.
7. After the npm publish (synthwerk-sdk#20): `pnpm create synthwerk-app my-app`.

## Rules and limits

| Rule | Value |
|---|---|
| Templates | `react` (default), `vue` |
| Node | 24 or later |
| Package manager | pnpm |
| Target directory | missing or empty (a `.git` folder alone counts as empty) |
| Flag values in `.env.local` | one line in double quotes, without `"`, `\` or `$`; URLs `http` or `https` only |
| `--local` | needs a built checkout (`dist` in each package) |
| Token storage in the app | memory only |
| App tests | mock of identity and llm; the real stack is tested in synthwerk-e2e |

## Events

| Type | When |
|---|---|
| None. | The scaffold and the apps emit no CloudEvents. |

## Errors

| Status | Problem type | Cause |
|---|---|---|
| exit 2 | none | Unknown flag or template, or a bad flag value. |
| exit 1 | none | Target not empty, template missing, no checkout or unbuilt package for `--local`, or `pnpm` failed. |

## Tests

- `tests/unit/create-app/args.test.ts` — `unknown template, two dirs, --sdk-dir without --local, bad URL or id - error`
- `tests/unit/create-app/scaffold.test.ts` — `react template - copies the files, renames _gitignore, sets the package name`
- `tests/unit/create-app/local.test.ts` — `packs each package into .synthwerk and points overrides at the tarballs`
- `tests/unit/create-app/run.test.ts` — `terminal - asks for dir and template, repeats a bad template answer`
- `tests/unit/create-app/templates.test.ts` — `package.json - same @synthwerk/* ranges as the workspace versions`
- `templates/*/tests/App.test.*` — `signs in, then shows the org from identity`
- `templates/*/tests/App.test.*` — `chats: sends the message and streams the answer`
- `templates/*/tests/auth.test.ts` — `getToken: a refresh or an expired token renews once for parallel calls`
- CI `build` stage: `pnpm --filter create-synthwerk-app check:templates` makes an app from each template, then runs `typecheck`, `test` and `build` in it.

## Changes

| Date | Change |
|---|---|
| 2026-11-16 | First version (#52): `create-synthwerk-app` 0.1.0 with the React and Vue templates. |
