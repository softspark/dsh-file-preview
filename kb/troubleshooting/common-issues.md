---
title: "dsh-file-preview Common Issues"
category: troubleshooting
service: dsh-file-preview
tags: [troubleshooting, preview, interception, permissions]
last_updated: "2026-09-04"
created: "2026-09-04"
description: "Why a preview does not open, opens empty, or refuses."
---

# dsh-file-preview Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Plugin refuses to mount, log names the file-open seam | The harness no longer exposes `workspaces.openPath` | Check the harness version against the peer range; the plugin fails closed on purpose rather than swallowing gestures silently |
| Clicking a file still opens the OS application | The path's extension is not in the supported set | Expected. Unrenderable paths are handed back to the harness untouched |
| "This session is not allowed to read that file" | The file is outside the session workspace and that session did not produce it | Open it from the session that wrote it, or work inside the workspace |
| "The file is too large to preview" | Over 1 MiB of text or 8 MiB of image/PDF | Expected; bounds are checked before the read |
| "This file type cannot be previewed" on a text file | The bytes are not valid UTF-8 | Expected; a decode failure is never reported as partial content |
| Modal opens empty after a rename | The file moved between the gesture and the read | Reopen; the read resolves the path again |
