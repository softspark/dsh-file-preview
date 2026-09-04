# dsh-file-preview

## Overview

A DeepSeek Harness plugin: read-only file preview inside a conversation. One npm package carrying both halves — a host Remote and a browser plugin — installed as a single profile bundle.

## Tech stack

TypeScript (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), React 18 for the modal, Vitest, rolldown plus lightningcss for the browser bundle, pnpm.

## Commands

| Command | Purpose |
|---|---|
| `pnpm run verify` | The gate: required files, version surfaces, config, typecheck, tests |
| `pnpm test` | Vitest |
| `pnpm run build` | Host artifacts and the browser bundle |

## Key conventions

- **Standard TC39 decorators only.** `experimentalDecorators` makes `@Remote` fail to typecheck.
- **Authorization lives on the host.** Never let a client-supplied value widen a read.
- **A failure never carries file bytes.** Refusal codes are a closed set.
- **The interception seam delegates by default.** Anything this package cannot render must reach the harness's own opener unchanged.
- `lib/` is build output and is never committed.
