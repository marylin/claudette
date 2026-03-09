// Provides no-op stubs for window.electronAPI when running outside Electron
// (e.g., opening localhost:5173 in a regular browser during development).
// This prevents "Cannot read properties of undefined" crashes.

const noop = () => Promise.resolve(null as any)
const noopListener = () => () => {}

if (!window.electronAPI) {
  ;(window as any).electronAPI = new Proxy({} as any, {
    get(_target, prop) {
      // Listener methods return cleanup functions
      if (typeof prop === 'string' && prop.startsWith('on')) {
        return noopListener
      }
      // Everything else returns a resolved promise
      return noop
    },
  })
  console.warn(
    '[Claudette] Running outside Electron — electronAPI is shimmed with no-ops. Use `npm run start` to launch with Electron.'
  )
}
