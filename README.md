# @softspark/dsh-file-preview

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@softspark/dsh-file-preview.svg)](https://www.npmjs.com/package/@softspark/dsh-file-preview)
[![CI](https://github.com/softspark/dsh-file-preview/actions/workflows/ci.yml/badge.svg)](https://github.com/softspark/dsh-file-preview/actions/workflows/ci.yml)

Read-only file preview inside a DeepSeek Harness conversation. Click a file the agent produced or mentioned and it opens in the browser, instead of launching a desktop application.

Works on the **published harness**. No patch, no fork, no modified checkout.

## What's New in v2.0.0

- DSH `0.1.2-rc.1` support through its Session Remote opener and immutable host event snapshots.
- Enforced 70% coverage, filesystem authorization integration tests, and browser registration tests.
- Complete post-release SOP and published browser TypeScript declarations.

Version 2 requires DSH `0.1.2-rc.1`. Keep plugin `1.0.0` when using DSH `0.1.1-rc.2`.

## Contents

- [Why](#why)
- [Requirements](#requirements)
- [Install](#install)
- [What it previews](#what-it-previews)
- [How it claims a click](#how-it-claims-a-click)
- [Security](#security)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Why

Without it, opening a file from a conversation hands the path to the host operating system. That is the wrong gesture when the harness runs on a remote machine, in a container, or when the file is a diff you want to glance at without leaving the page.

## Requirements

- Node.js 22.19.0 or newer
- DeepSeek Harness `0.1.2-rc.1`
- `pnpm` for the profile plugin manager

## Install

```bash
dsh plugin --profile web add @softspark/dsh-file-preview --save-exact
```

Restart DSH. The package registers both of its rows itself.

## What it previews

| Kind | Formats | Bound |
|---|---|---|
| Text and code | `.txt` `.md` `.json` `.yaml` `.toml` `.csv` `.ts` `.js` `.py` `.go` `.rs` `.sql` and more | 1 MiB |
| Markup | `.html` `.svg`, sanitised to an allowlist | 1 MiB |
| Images | `.png` `.jpg` `.gif` `.webp` | 8 MiB |
| Documents | `.pdf` | 8 MiB |

Anything else reaches the harness's own opener untouched, exactly as before the plugin was installed.

## How it claims a click

Every conversation file-open in DSH 0.1.2 reaches `remote.session.openWorkspacePath({ path })`. The browser half wraps its getter while preserving the native request, cancellation signal, and caller context. Removing the package restores the original descriptor.

If a future harness stops exposing that method, the plugin refuses to mount rather than silently swallowing clicks.

## Security

A preview must not become an arbitrary host-file read. Authorization is computed on the host from session facts alone: a file is readable when it sits inside the addressed session's workspace, or when that same session produced it through a successful write or edit. Failures never carry file bytes, and both refusal grounds return the same code so a rejection cannot be used to probe for a file's existence.

Full model in [`kb/reference/security.md`](kb/reference/security.md) and [`SECURITY.md`](SECURITY.md).

## Documentation

| Document | Purpose |
|---|---|
| [Architecture](kb/reference/architecture.md) | The two halves and the interception seam |
| [Security model](kb/reference/security.md) | Authorization, bounds, sanitization |
| [Setup](kb/howto/setup.md) | Install and confirm |
| [Common issues](kb/troubleshooting/common-issues.md) | Why a preview refuses or does not open |
| [Release SOP](kb/procedures/sop-release.md) | How a version ships |
| [Post-release SOP](kb/procedures/sop-post-release-testing.md) | Registry provenance, browser behavior, and authorization checks |

## Contributing

See [CONTRIBUTING](.github/CONTRIBUTING.md). `pnpm run verify` is the gate.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full release history.
