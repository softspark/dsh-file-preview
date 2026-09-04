import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { successfulMutationPaths } from '../src/preview-policy.ts'

const CWD = '/workspace/project'

function nativeCall(callId: string, filePath: string, name: 'write' | 'edit' = 'write'): unknown {
  return { type: 'tool/call', data: { callId, name, arguments: JSON.stringify({ file_path: filePath }) } }
}

function nativeResult(callId: string, isError: boolean): unknown {
  return {
    type: 'tool/result',
    data: { message: { source: { callId }, content: [{ type: 'tool-result', isError }] } },
  }
}

describe('successfulMutationPaths', () => {
  it('records a native mutation only after its successful result', () => {
    expect(successfulMutationPaths([
      nativeCall('write-1', 'notes/readme.md'),
      nativeResult('write-1', false),
    ], CWD)).toEqual([path.join(CWD, 'notes/readme.md')])
  })

  it('ignores failed, duplicate-success, unpaired, and running native calls', () => {
    expect(successfulMutationPaths([
      nativeCall('failed', '/tmp/failed.txt'),
      nativeResult('failed', true),
      nativeResult('failed', false),
      nativeResult('unknown', false),
      nativeCall('running', '/tmp/running.txt'),
    ], CWD)).toEqual([])
  })

  it('records only explicitly successful code dispatch mutations', () => {
    expect(successfulMutationPaths([
      { type: 'tool/code-dispatch', data: { name: 'edit', arguments: { file_path: 'generated/output.ts' }, isError: false } },
      { type: 'tool/code-dispatch', data: { name: 'write', arguments: { file_path: '/tmp/failed.txt' }, isError: true } },
      { type: 'tool/code-dispatch', data: { name: 'write', arguments: { file_path: '/tmp/running.txt' } } },
    ], CWD)).toEqual([path.join(CWD, 'generated/output.ts')])
  })

  it('normalizes paths and preserves first successful order', () => {
    expect(successfulMutationPaths([
      nativeCall('relative', 'src/../README.md', 'edit'),
      nativeResult('relative', false),
      nativeCall('absolute', '/tmp/build/../artifact.pdf'),
      nativeResult('absolute', false),
      { type: 'tool/code-dispatch', data: { name: 'edit', arguments: { file_path: '/tmp/artifact.pdf' }, isError: false } },
    ], CWD)).toEqual([path.join(CWD, 'README.md'), '/tmp/artifact.pdf'])
  })

  it('ignores malformed arguments and relative paths without an absolute cwd', () => {
    expect(successfulMutationPaths([
      { type: 'tool/call', data: { callId: 'malformed', name: 'write', arguments: '{"file_path":' } },
      nativeResult('malformed', false),
      nativeCall('relative', 'output.txt'),
      nativeResult('relative', false),
    ], 'relative/cwd')).toEqual([])
  })
})
