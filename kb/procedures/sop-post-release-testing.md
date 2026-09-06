---
title: "SOP: Post-Release Testing"
category: procedures
service: dsh-file-preview
version: "2.0.0"
tags: [sop, post-release, smoke-test, provenance, dsh]
created: "2026-09-06"
last_updated: "2026-09-06"
description: "Verify the registry artifact in an isolated DSH profile, including provenance, authorization, and browser file opening."
---

# SOP: Post-Release Testing

## Prerequisites

- The release workflow succeeded and npm serves the exact version.
- Node.js 22.19.0 or newer, pnpm 11.24.0, DSH 0.1.2-rc.1.
- A disposable DSH_HOME and workspace, with telemetry disabled.
- A browser and a model credential for a real session. Credentials stay outside committed evidence.

## Procedure

1. Inspect `npm view @softspark/dsh-file-preview@X.Y.Z --json`. Confirm the version and `dist.attestations.provenance.predicateType` equal `https://slsa.dev/provenance/v1`.
2. Install the exact registry version into the disposable profile: `DSH_HOME=<tmp> dsh plugin --profile web add @softspark/dsh-file-preview@X.Y.Z --save-exact`.
3. In that profile directory, run `npm audit signatures --registry https://registry.npmjs.org`. Record signatures and attestations separately; the presence of metadata alone is insufficient.
4. Inspect the composed config. It must contain one `file-preview` host row and one `ui-file-preview` browser row naming the package root.
5. Start the isolated web profile. Create a session in its workspace and have it write a Markdown file. Open the produced-file chip and confirm the browser dialog renders the marker, closes, and reopens.
6. Preview a workspace text file, image, PDF, and inert HTML/SVG sample. Confirm scripts, external references, and navigation in markup cannot execute.
7. Confirm unsupported extensions still reach the native opener. Without an active session, previewable paths must also retain the native behavior.
8. Attempt another session's outside file and a workspace symlink pointing outside. Confirm refusal contains no file bytes. An outside file is allowed only after this session's successful write/edit event.
9. Remove the bundle from the disposable profile and restart. The native opener must be restored. Stop DSH.
10. Record exact package/runtime versions, commands, date, and outcomes below. Candidate tarballs and mocked tests do not establish post-release verification.

## Verification record

No complete registry-artifact browser verification is recorded for 1.0.0.
Executed 2.0.0 source gates and isolated browser qualification are recorded in
[the dated verification record](release-verification-20260906.md). Registry
verification is added there only after the exact published artifact is checked.

## Rollback

Stop the disposable profile. Do not overwrite a published version. Deprecate a defective release and publish a corrected version after repeating these checks.
