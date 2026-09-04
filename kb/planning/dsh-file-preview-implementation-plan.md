---
title: "dsh-file-preview Implementation Plan"
category: planning
service: dsh-file-preview
tags: [planning, preview, security, plan, pre-mortem]
last_updated: "2026-09-04"
created: "2026-09-03"
description: "Approved scope, success criteria, delivery phases and pre-mortem for the in-conversation file preview."
---

# DSH File Preview Plugin — Implementation Plan

## Objective

Provide a read-only browser preview for files linked from DSH Web while keeping file bytes behind the existing localhost/SSH trust posture and filesystem policy.

## Approved scope

- Package the feature as an out-of-tree Host + Client + Bundle plugin.
- Keep the current DSH monorepo as a build and compatibility fixture, not a product fork.
- Maintain exact-version patches only for missing extension points, and remove them when upstream provides equivalent APIs.
- Accept `127/8`, `localhost`, `[::1]`, and label-aware `*.localhost` browser authorities; reject non-loopback authorities.
- Permit files inside the addressed session workspace and off-workspace files proven by a successful same-session mutation result.
- Render bounded UTF-8 text, code, and Markdown; bounded raster images and PDF; sanitized static HTML and SVG. Never execute artifact scripts.
- Refuse unsupported binaries and special files without returning their bytes.

## Success criteria

1. Existing tool-row paths, produced-file chips, and unique inline file mentions open the same preview modal.
2. `/tmp/verify-1170/notes.md` opens only when its successful write/edit provenance belongs to the addressed session.
3. Attempts to read another session's artifact, a failed mutation, a symlink escape, a directory, or a special file fail closed.
4. HTML and SVG scripts, event handlers, external references, forms, navigation, and CSS network loads cannot execute or load.
5. Native open remains available only when the page is loopback and `host.describe.canOpenPath` is true.
6. Focus, Escape, cancellation, loading, error, truncation, and binary states are keyboard- and screen-reader-usable.
7. Focused tests, typecheck, lint, package build, bundle install, and the existing Web GUI smoke test pass against DSH `0.1.1-rc.2`.

## Delivery phases

1. Prove the scaffold builds and installs against the pinned DSH tag.
2. Add test-first, exact-version bridge patches for the central file-open router and `*.localhost` classification.
3. Replace the scaffold Host API with a loopback-only preview service and authoritative path authorization.
4. Replace the dock preview with one shared modal and inert renderers.
5. Assemble the bundle, document installation and compatibility, and publish no remote repository.
6. Install into the existing Web profile, rebuild affected Web artifacts, refresh the existing URL, and run the live rubric.

## Pre-mortem

| Failure | Early signal | Mitigation |
| --- | --- | --- |
| The plugin cannot claim existing file clicks | Router test cannot observe all three link sources | Keep one central core extension point and reject DOM interception. |
| The profile resolves a different core package than the patch target | Build or boot reports missing router service | Pin the DSH tag and fail installation on an exact-version mismatch. |
| Preview becomes arbitrary host-file read | A request succeeds without workspace containment or mutation provenance | Authorize on the Host from session facts; never trust client-provided allowlists. |
| A file changes between validation and read | Race test returns bytes from a swapped inode | Read through one opened descriptor and validate the opened regular file before returning bytes. |
| Active content reaches the DSH origin | Security test observes script, navigation, or network activity | Sanitize, use an opaque sandboxed iframe, omit script and same-origin privileges, and revoke object URLs. |
| Upstream churn makes patches permanent | Patch no longer applies cleanly to the next DSH tag | Keep patches small, upstream-ready, versioned, and covered by compatibility CI. |
