---
title: "Release verification on 2026-09-06"
category: procedures
service: dsh-file-preview
version: "2.0.0"
tags: [release, verification, browser, provenance]
created: "2026-09-06"
last_updated: "2026-09-06"
description: "Executed qualification and publication checks for dsh-file-preview 2.0.0."
---

# Release qualification

## Published artifact

Version 2.0.0 is public and npm `latest` resolves to it. The signed tag was
verified locally against the repository SSH key before it was pushed.

- [Release](https://github.com/softspark/dsh-file-preview/releases/tag/v2.0.0)
- [Exact-head CI](https://github.com/softspark/dsh-file-preview/actions/runs/34054462811): success
- [Publish workflow](https://github.com/softspark/dsh-file-preview/actions/runs/34055025094): success
- Tag commit: `26cf72e1c147d659df5d8f152f6d042bd8a84b41`

Registry metadata returned SLSA provenance v1. A fresh npm 11.13.0 artifact
consumer verified **2 registry signatures and 2 attestations** for the plugin
and its direct dependency. Lifecycle scripts and automatic host peer
installation were disabled for this artifact-inspection consumer. This is
independent of the complete DSH profile qualification below.

All concrete exported JavaScript and TypeScript declaration targets exist,
including the host and browser entries. LICENSE, NOTICE and cordis.patch.yml
are present. Source, tests, scripts, KB and .github are excluded.

## Pre-release runtime and source checks

Runtime: DSH 0.1.2-rc.1, Node.js 22.22.2, pnpm 11.24.0.

The final source passed `pnpm run verify`, `pnpm run build`, and the source
audit on 2026-09-06. All 41 tests passed. Coverage was 89.45% lines and 74.29%
branches, above the enforced 70% thresholds. Every exported JavaScript and
declaration artifact existed, and the source audit returned zero findings.

The dependency audit reported no known vulnerabilities. Dependency signature
verification reported 856 verified registry signatures and 148 attestations.
These are dependency checks before publication, not proof of this package's
future registry artifact.

In the isolated DSH profile, a real session used its write tool to produce
`ui-smoke-notes.md`. The browser opened its actual file link, displayed
`UI_PREVIEW_20260906`, closed the modal, and reopened it after the final profile
restart. There were no browser page or console errors. The installed candidate
client matched the build used for that run. A subsequent rebuild changed only
CSS export-map property ordering, with identical keys and values.

Before tagging, the actual write tool produced a link to
`ui-smoke-native-fallback-20260906.zip`. Its placeholder was backed up and
replaced by a valid empty 22-byte ZIP. Clicking the actual Open button caused
the original openWorkspacePath RPC to return HTTP 200 with
`{ok:true,value:{opened:true}}`. No preview dialog appeared, and the browser
recorded no errors. The native OS opener was permitted and executed, not mocked.

Real-filesystem integration tests verify workspace boundaries, outside symlink
refusal, successful-write provenance, size limits and cancellation. Browser
registration tests verify unsupported-path/no-session fallback and restoration
of the original getter. Those tests do not establish the live-browser matrix
of image/PDF/active-markup, authorization and bundle removal checks from the
post-release SOP. Registry-artifact results are recorded after publication.
