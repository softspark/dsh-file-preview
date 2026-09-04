---
title: "Install dsh-file-preview"
category: howto
service: dsh-file-preview
tags: [setup, install, dsh, profile, bundle]
last_updated: "2026-09-04"
created: "2026-09-04"
description: "Install the bundle into a DSH profile and confirm it claimed the file-open gesture."
---

# Install dsh-file-preview

## Requirements

- Node.js 22.19.0 or newer.
- `pnpm` for the DSH profile plugin manager.
- DeepSeek Harness `0.1.1-rc.2`.

No harness modification is required. The plugin works on the published harness.

## Install

```bash
dsh plugin --profile web add @softspark/dsh-file-preview --save-exact
```

Restart DSH and open a session. The bundle registers both rows itself.

## Confirm

1. Ask the agent to write a file, then click the produced-file chip. The preview modal opens.
2. Click a file the plugin cannot render, for example a `.zip`. The harness's own open runs instead, exactly as before the plugin was installed.

## Remove

```bash
dsh plugin --profile web remove @softspark/dsh-file-preview
```

Removing the package restores the harness's native open for every path.

## Related

- [Architecture](../reference/architecture.md)
- [Common issues](../troubleshooting/common-issues.md)
