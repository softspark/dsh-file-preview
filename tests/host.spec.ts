import { mkdtemp, mkdir, symlink, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { FsError } from '@deepseek-ai/dsh-fs'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FilePreviewGateway } from '../src/host.ts'
import { schemas } from '../src/remote.ts'
import { TYPERT } from '../src/typert.ts'

describe('FilePreviewGateway with the published local filesystem backend', () => {
  let root: string
  let cwd: string
  let fs: LocalFileSystem
  let gateway: FilePreviewGateway
  let events: unknown[]

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'file-preview-test-'))
    cwd = join(root, 'workspace')
    await mkdir(cwd)
    const ctx = new Context()
    fs = new LocalFileSystem(ctx, { cwd, diffBasisMaxBytes: 10 * 1024 * 1024 })
    events = []
    ctx.provide('sessions', {
      get: (id: string) => id === 'current' ? { header: { cwd }, snapshotEvents: () => events } : undefined,
    })
    gateway = new FilePreviewGateway(ctx)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    // Only the disposable fixture created by this test is removed.
    await rm(root, { recursive: true, force: true })
  })

  it('reads a workspace file through the decorated Remote and validates its wire result', async () => {
    await writeFile(join(cwd, 'notes.md'), '# marker')
    const result = await gateway.previewFile({ sessionId: 'current', path: 'notes.md' })
    expect(schemas.result.parse(result)).toEqual({
      ok: true, value: { kind: 'text', mimeType: 'text/markdown', content: '# marker', size: 8 },
    })
    expect(TYPERT.invocations[0]?.method).toBe('previewFile')
  })

  it('refuses another session and an outside symlink without returning file bytes', async () => {
    const secret = join(root, 'outside.txt')
    await writeFile(secret, 'outside marker')
    await symlink(secret, join(cwd, 'alias.txt'))
    for (const input of [
      { sessionId: 'unknown', path: secret },
      { sessionId: 'current', path: secret },
      { sessionId: 'current', path: 'alias.txt' },
    ]) {
      expect(await gateway.previewFile(input)).toEqual({
        ok: false, error: { code: 'preview-outside-workspace', path: input.path },
      })
    }
  })

  it('authorizes exactly a successfully produced outside file, excluding its neighbours', async () => {
    const output = join(root, 'output.txt')
    await writeFile(output, 'generated')
    events.push({ type: 'tool/code-dispatch', data: { name: 'write', arguments: { file_path: output }, isError: false } })
    expect((await gateway.previewFile({ sessionId: 'current', path: output })).ok).toBe(true)
    expect(await gateway.previewFile({ sessionId: 'current', path: join(root, 'neighbour.txt') }))
      .toMatchObject({ ok: false, error: { code: 'preview-outside-workspace' } })
  })

  it('rejects directories, unknown formats, oversized files, and invalid UTF-8 before exposing bytes', async () => {
    await writeFile(join(cwd, 'archive.zip'), 'zip')
    await writeFile(join(cwd, 'huge.txt'), Buffer.alloc(1024 * 1024 + 1))
    await writeFile(join(cwd, 'binary.txt'), Buffer.from([0xff]))
    const cases = [
      ['.', 'preview-not-file'], ['archive.zip', 'preview-unsupported'],
      ['huge.txt', 'preview-too-large'], ['binary.txt', 'preview-unsupported'],
      ['missing.txt', 'preview-not-found'],
    ] as const
    for (const [path, code] of cases) {
      expect(await gateway.previewFile({ sessionId: 'current', path }))
        .toMatchObject({ ok: false, error: { code } })
    }
  })

  it.each([
    ['FS_NOT_FOUND', 'preview-not-found'],
    ['FS_NOT_DIRECTORY', 'preview-not-file'],
    ['FS_NOT_REGULAR_FILE', 'preview-not-file'],
    ['FS_TOO_LARGE', 'preview-too-large'],
    ['FS_PERMISSION_DENIED', 'permission-denied'],
    ['FS_SANDBOX_DENIED', 'permission-denied'],
  ] as const)('translates %s without exposing backend error details', async (code, expected) => {
    vi.spyOn(fs, 'resolve').mockRejectedValueOnce(new FsError('private backend detail', code))
    expect(await gateway.previewFile({ sessionId: 'current', path: 'notes.md' }))
      .toEqual({ ok: false, error: { code: expected, path: 'notes.md' } })
  })

  it('returns a closed error for cancelled or unexpected I/O failures', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(await gateway.previewFile({ sessionId: 'current', path: 'notes.md' }, controller.signal))
      .toMatchObject({ ok: false, error: { code: 'io-error' } })
  })
})
