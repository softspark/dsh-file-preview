import { describe, expect, it, vi } from 'vitest'
import { interceptOpenPath } from '../src/client/intercept.ts'

/** A stand-in for the harness service: the method lives on the prototype, as it
 *  does in `@deepseek-ai/dsh-client-runtime`. */
class Workspaces {
  async openPath(_path: string): Promise<void> {}
}

describe('interceptOpenPath', () => {
  it('claims a path this package renders and never calls the harness opener', async () => {
    const workspaces = new Workspaces()
    const native = vi.spyOn(Workspaces.prototype, 'openPath')
    const seen: string[] = []

    interceptOpenPath(workspaces, (path) => { seen.push(path); return true })
    await workspaces.openPath('/w/notes.md')

    expect(seen).toEqual(['/w/notes.md'])
    expect(native).not.toHaveBeenCalled()
    native.mockRestore()
  })

  it('hands an unrenderable path back to the harness untouched', async () => {
    const workspaces = new Workspaces()
    const native = vi.spyOn(Workspaces.prototype, 'openPath').mockResolvedValue()

    interceptOpenPath(workspaces, () => false)
    await workspaces.openPath('/w/archive.zip')

    // The user who installed a preview plugin must not lose native open for
    // everything the plugin cannot show.
    expect(native).toHaveBeenCalledWith('/w/archive.zip')
    native.mockRestore()
  })

  it('restores the original method on dispose', async () => {
    const workspaces = new Workspaces()
    const before = workspaces.openPath
    const dispose = interceptOpenPath(workspaces, () => true)

    expect(workspaces.openPath).not.toBe(before)
    dispose()
    expect(workspaces.openPath).toBe(before)
  })

  it('leaves a later wrapper in place when disposed out of order', () => {
    const workspaces = new Workspaces()
    interceptOpenPath(workspaces, () => true)
    const outer = async (): Promise<void> => {}
    // Another plugin wraps us afterwards; our disposer must not clobber it.
    const dispose = interceptOpenPath(workspaces, () => true)
    workspaces.openPath = outer
    dispose()

    expect(workspaces.openPath).toBe(outer)
  })

  it('refuses to mount when the harness has no such seam', () => {
    const broken = { openPath: undefined } as unknown as Workspaces

    expect(() => interceptOpenPath(broken, () => true))
      .toThrow(/does not expose the file-open seam/u)
  })
})
