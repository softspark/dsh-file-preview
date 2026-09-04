---
title: "dsh-file-preview Architecture"
category: reference
service: dsh-file-preview
tags: [architecture, dsh, plugin, cordis, remote, client]
last_updated: "2026-09-04"
created: "2026-09-04"
description: "The two halves of the plugin, the seam that claims file-open gestures, and why the package is standalone."
---

# dsh-file-preview Architecture

## Purpose

Show a file from a conversation in the browser, without widening what the browser can read beyond what the addressed session could already reach.

## Two halves, one package

| Half | Entry | Responsibility |
|---|---|---|
| Host | `@softspark/dsh-file-preview` | `FilePreviewGateway`, a `TypertRemoteService` exposing one Remote, `previewFile`. Owns authorization, size bounds, format selection and decoding. |
| Browser | `@softspark/dsh-file-preview/client` | Claims file-open gestures, renders the modal, sanitises active documents, owns the dictionaries. |

Both rows are registered by this package's own `cordis.patch.yml`, so the bundle installs standalone.

## The interception seam

On an unmodified harness every conversation file-open — tool rows, produced-file chips, unique inline mentions — reaches the same call:

```js
workspaces.openPath(resolveWorkspacePath(cwd, path))
```

The browser half wraps that one method. Cordis gives each fiber its own traceable proxy of a service, but a method written through that proxy lands on the shared instance, so the wrapper is visible to the conversation fiber that captured `ctx.workspaces` earlier.

This is why the package needs no patch, no fork, and no extension point that exists only in a modified harness. The cost is that the wrapper sees *every* `openPath` call, so anything it cannot render is handed back to the harness unchanged.

If the harness stops exposing `openPath`, the plugin refuses to mount. A rename must fail loudly at start rather than turn into a plugin that silently swallows gestures.

## Session identity

The stock call site passes only a resolved path. The session is taken from `sessions.list.getSnapshot().current`, and the host authorizes against that session alone.

## Standalone by construction

Peer dependencies are exact published DeepSeek Harness packages. Nothing resolves through a checkout of the harness monorepo, so the repository builds and tests anywhere.

## Related

- [Security model](security.md)
- [Setup](../howto/setup.md)
