# Security Policy

## Supported versions

Version `1.0.0` receives security fixes on `main`.

## Reporting a vulnerability

Email **biuro@softspark.eu**. Do not open a public issue.

Include the affected commit, reproduction steps, impact, and a minimal proof of concept. Remove credentials, authorization headers, workspace contents, prompts, and personal data before sending the report.

SoftSpark will acknowledge a report within 48 hours and coordinate remediation and disclosure with the reporter.

## Security design

### The threat this package exists to avoid

A preview turns "the browser can render a file" into "the browser can read a host file". Every decision below exists so that capability cannot widen beyond what the addressed session could already reach.

### Authorization

Authorization is computed on the host from session facts, never from anything the client sends. A path is readable on exactly two grounds:

- it resolves inside the addressed session's workspace, or
- that same session produced it, proven by a `write` or `edit` tool call with a later successful result in that session's own event stream.

A provenance entry grants exactly the file it produced — containment is checked in both directions, so the directory holding a produced file is not granted. Parsing of the event stream fails closed: a malformed call, a repeated call id, a failed result, or a missing result grants nothing.

Both refusals return the same code, so a rejection never discloses whether a file exists.

### Content

Format is selected from the file name before any byte is read; an unsupported extension is refused without a read. Text, code and Markdown are capped at 1 MiB, images and PDF at 8 MiB, and the size is checked from `stat` before the read as well as bounded during it. Image and PDF payloads must match their format signature. Text must decode as strict UTF-8; a decode failure is reported as unsupported rather than as partial content.

No failure carries file bytes.

### Active documents

HTML and SVG reach the browser as sanitised documents built from an element and attribute allowlist. Scripts, event handlers, external references, forms, navigation and CSS network loads are removed rather than escaped. Rendering happens in the page's own DOM from a rebuilt tree, so a document cannot smuggle markup past the allowlist.

### Interception

The plugin wraps `workspaces.openPath` on the harness's own service. It claims only paths it can render; everything else reaches the harness's opener unchanged, so installing this package never removes native behaviour. If the harness stops exposing that method, the plugin refuses to mount instead of silently swallowing gestures.

### Scope

The package contains no credential input, no network client of its own, no telemetry, and no npm lifecycle scripts.
