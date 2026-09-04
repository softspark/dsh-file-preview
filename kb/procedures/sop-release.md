---
title: "SOP: Release"
category: procedures
service: dsh-file-preview
tags: [sop, release, npm, provenance]
last_updated: "2026-09-04"
created: "2026-09-04"
description: "Prepare and publish a provenance-enabled dsh-file-preview release."
---

# SOP: Release

## Prerequisites

- The first public release of every SoftSpark module is `1.0.0`; `0.x` tags and publications are forbidden.
- Green `main` and a clean worktree.
- Fresh evidence that a real session opened a preview and that an unrenderable path still reached the harness's own opener.
- npm trusted publishing configured for the GitHub `npm` environment.

## Procedure

1. Move changelog entries from `Unreleased` to the target version.
2. Update `package.json`. Add no lifecycle scripts.
3. Run the complete pre-commit SOP.
4. Install the release candidate into a clean isolated DSH profile and run the two live checks from the prerequisites. A missing preview or a swallowed unrenderable path blocks the tag.
5. Review `npm pack --dry-run` output and the licence files it carries.
6. Create and push the signed tag `v<package-version>` only after both checks and all static gates pass.
7. Let `.github/workflows/publish.yml` verify and publish with provenance.

## Verification

The workflow succeeds, the registry version equals the Git tag, and provenance is present.

## Rollback

Do not reuse or overwrite a published version. Deprecate the defective version and publish a corrected patch.
