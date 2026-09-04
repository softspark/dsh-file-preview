---
title: "dsh-file-preview Security Model"
category: reference
service: dsh-file-preview
tags: [security, authorization, sanitization, sandbox, preview]
last_updated: "2026-09-04"
created: "2026-09-04"
description: "What authorizes a read, what bounds it, and what makes an active document inert."
---

# dsh-file-preview Security Model

## The capability being granted

A preview turns "the browser can render a file" into "the browser can read a host file". Everything below exists to keep that capability no wider than what the addressed session could already reach.

## Authorization

Computed on the host, from session facts only. Two grounds:

| Ground | Check |
|---|---|
| Workspace containment | the path resolves inside the addressed session's `cwd` |
| Mutation provenance | that session performed a `write` or `edit` on exactly that file, with a later successful result |

Provenance uses mutual containment, so an entry grants the file it produced and never the directory holding it. Event parsing fails closed: a malformed call, a repeated call id, a failed result, or a missing result grants nothing.

Both refusals return `preview-outside-workspace`, so a rejection never discloses whether a file exists.

## Bounds

- Format is selected from the name before any read. An unsupported extension is refused without loading the file.
- Text, code, Markdown, HTML and SVG: 1 MiB. Images and PDF: 8 MiB.
- Size is checked from `stat` before the read and bounded again during it.
- Images and PDF must match their format signature; text must decode as strict UTF-8. A decode failure is `preview-unsupported`, never partial content.
- No failure carries file bytes.

## Active documents

HTML and SVG are rebuilt from an element and attribute allowlist rather than escaped. Scripts, event handlers, external references, forms, navigation and CSS network loads do not survive the rebuild.

## What this package does not do

No credential input, no network client of its own, no telemetry, no npm lifecycle scripts. It never calls the harness's native "open with the default application" on its own behalf — it only declines to intercept, leaving that gesture to the harness.

## Related

- [Architecture](architecture.md)
- Repository `SECURITY.md` for the reporting channel
