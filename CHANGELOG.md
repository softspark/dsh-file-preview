# Changelog

All notable changes follow Keep a Changelog and Semantic Versioning.

## [1.0.0] - 2026-09-04

### Added

- Session-authorized file preview for DeepSeek Harness, shipped as one profile bundle: a host `filePreview` Remote and a browser modal.
- Authorization from host-side session facts only: a file is readable when it sits inside the addressed session's workspace, or when that same session produced it through a successful `write` or `edit`. Client-supplied paths never widen the grant.
- Bounded, transport-safe payloads: complete UTF-8 text, code and Markdown up to 1 MiB; raster images and PDF up to 8 MiB. Format is selected from the name before any byte is read, so an unsupported file is refused without being loaded.
- Inert rendering of active documents: HTML and SVG are sanitised to an element and attribute allowlist, with scripts, event handlers, external references, forms and navigation removed.
- Interception of conversation file-open gestures on an unmodified harness, by wrapping `workspaces.openPath`. Paths this package cannot render reach the harness's own opener untouched.
- English and Polish dictionaries.
