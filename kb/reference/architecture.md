---
title: "dsh-file-preview Architecture"
category: reference
service: dsh-file-preview
version: "2.0.0"
tags: [architecture, dsh, plugin, cordis, remote, client]
last_updated: "2026-09-06"
created: "2026-09-04"
description: "The two halves of the plugin, the seam that claims file-open gestures, and why the package is standalone."
---

# dsh-file-preview Architecture

## Purpose

Show a file from a conversation in the browser, without widening what the browser can read beyond what the addressed session could already reach.

## Two halves, one package

| Half | Entry | Responsibility |
|---|---|---|
| Host | `@softspark/dsh-file-preview/host` | `FilePreviewGateway`, a `TypertRemoteService` exposing one Remote, `previewFile`. Owns authorization, size bounds, format selection and decoding. |
| Browser | `@softspark/dsh-file-preview/client` | Claims file-open gestures, renders the modal, sanitises active documents, owns the dictionaries. |

Both rows are registered by this package's own `cordis.patch.yml`, so the bundle installs standalone.

## The interception seam

On an unmodified harness every conversation file-open — tool rows, produced-file chips, unique inline mentions — reaches the same call:

```js
remote.session.openWorkspacePath({ path: resolveWorkspacePath(cwd, path) })
```

The Remote exposes a configurable getter-only method. The browser half replaces its property descriptor with a getter that resolves the original getter for each caller, preserving Cordis caller context. Unhandled paths retain their original request, cancellation signal, and carrier result. Unload restores the original descriptor unless another wrapper replaced it later.

This is why the package needs no patch, no fork, and no extension point that exists only in a modified harness. The cost is that the wrapper sees *every* `openWorkspacePath` call, so anything it cannot render is handed back to the harness unchanged.

If the harness stops exposing `openWorkspacePath`, the plugin refuses to mount. A rename must fail loudly at start rather than turn into a plugin that silently swallows gestures.

## Session identity

The stock call site passes only a resolved path. The session is taken from `sessions.list.getSnapshot().current`, and the host authorizes against that session alone.

## Standalone by construction

Peer dependencies are exact published DeepSeek Harness packages. Nothing resolves through a checkout of the harness monorepo, so the repository builds and tests anywhere.

## Related

- [Security model](security.md)
- [Setup](../howto/setup.md)
