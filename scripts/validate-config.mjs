// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 Lukasz Krzemien (biuro@softspark.eu)
// Source: https://github.com/softspark/dsh-file-preview

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const patch = readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

// Both halves, named by this package alone. A row pointing anywhere else would
// make the bundle depend on a package the install does not carry.
for (const expected of [
  "- id: file-preview",
  "  name: '@softspark/dsh-file-preview'",
  "- id: ui-file-preview",
  "  name: '@softspark/dsh-file-preview/client'",
]) {
  if (!patch.includes(expected)) throw new Error(`cordis.patch.yml is missing: ${expected}`);
}

if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') {
  throw new Error('package.json must declare the DSH bundle patch');
}

// A lifecycle script would run on every consumer install; the hardening posture
// this package documents depends on there being none.
for (const lifecycle of ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly', 'postpublish']) {
  if (manifest.scripts?.[lifecycle] !== undefined) throw new Error(`lifecycle script forbidden: ${lifecycle}`);
}

// Harness peers must be exact: a range would let a profile resolve a harness
// whose file-open seam this package has never been tested against. React is
// deliberately a range — the harness supplies it, and pinning a patch version
// would fight whatever the host profile already resolved.
for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
  if (!name.startsWith('@deepseek-ai/')) continue;
  if (/[\^~*]|\s-\s/u.test(range)) throw new Error(`harness peer must be exact: ${name}@${range}`);
}

if (manifest.license !== 'Apache-2.0') throw new Error('license must be Apache-2.0');
if (manifest.private === true) throw new Error('publishable package cannot be private');

console.log('DSH bundle and package configuration valid');
