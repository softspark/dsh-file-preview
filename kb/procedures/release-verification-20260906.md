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

Real-filesystem integration tests verify workspace boundaries, outside symlink
refusal, successful-write provenance, size limits and cancellation. Browser
registration tests verify unsupported-path/no-session fallback and restoration
of the original getter. Those tests do not establish the live-browser matrix
of image/PDF/active-markup, authorization and bundle removal checks from the
post-release SOP. Registry-artifact results are recorded after publication.
