import path from 'node:path'

const MUTATION_TOOL_NAMES = new Set(['write', 'edit'])

type UnknownRecord = Record<string, unknown>

interface NativeResult {
  callId: string
  isSuccessful: boolean
}

function asRecord(value: unknown): UnknownRecord | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as UnknownRecord
}

function eventBody(event: UnknownRecord): UnknownRecord {
  return asRecord(event.data) ?? event
}

function mutationPath(name: unknown, args: unknown, cwd?: string): string | undefined {
  if (typeof name !== 'string' || !MUTATION_TOOL_NAMES.has(name)) return undefined
  const filePath = asRecord(args)?.file_path
  if (typeof filePath !== 'string' || filePath.length === 0 || filePath.includes('\0')) return undefined
  if (path.isAbsolute(filePath)) return path.normalize(filePath)
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) return undefined
  return path.resolve(cwd, filePath)
}

function nativeCallPath(body: UnknownRecord, cwd?: string): string | undefined {
  if (typeof body.arguments !== 'string') return undefined
  try {
    return mutationPath(body.name, JSON.parse(body.arguments), cwd)
  } catch {
    return undefined
  }
}

function nativeResult(body: UnknownRecord): NativeResult | undefined {
  const message = asRecord(body.message) ?? body
  const callId = asRecord(message.source)?.callId
  if (typeof callId !== 'string' || callId.length === 0) return undefined
  const content = message.content
  if (!Array.isArray(content) || content.length === 0) return { callId, isSuccessful: false }
  const firstBlock = asRecord(content[0])
  return {
    callId,
    isSuccessful: firstBlock?.type === 'tool-result' && firstBlock.isError === false,
  }
}

/**
 * Return paths established by successful write/edit events in one session.
 * Native calls require a later matching successful result. Parsing fails closed.
 * @param events - immutable session event stream.
 * @param cwd - absolute session working directory used for relative paths.
 */
export function successfulMutationPaths(events: readonly unknown[], cwd?: string): readonly string[] {
  const pendingNativeCalls = new Map<string, string>()
  const invalidCallIds = new Set<string>()
  const successfulPaths = new Set<string>()

  for (const candidate of events) {
    const event = asRecord(candidate)
    if (event === undefined || typeof event.type !== 'string') continue
    const body = eventBody(event)

    if (event.type === 'tool/call') {
      const callId = body.callId
      if (typeof callId !== 'string' || callId.length === 0) continue
      if (pendingNativeCalls.has(callId) || invalidCallIds.has(callId)) {
        pendingNativeCalls.delete(callId)
        invalidCallIds.add(callId)
        continue
      }
      const filePath = nativeCallPath(body, cwd)
      if (filePath !== undefined) pendingNativeCalls.set(callId, filePath)
      continue
    }

    if (event.type === 'tool/result') {
      const result = nativeResult(body)
      if (result === undefined) continue
      const filePath = pendingNativeCalls.get(result.callId)
      pendingNativeCalls.delete(result.callId)
      invalidCallIds.add(result.callId)
      if (filePath !== undefined && result.isSuccessful) successfulPaths.add(filePath)
      continue
    }

    if (event.type === 'tool/code-dispatch' && body.isError === false) {
      const filePath = mutationPath(body.name, body.arguments, cwd)
      if (filePath !== undefined) successfulPaths.add(filePath)
    }
  }

  return [...successfulPaths]
}
