/**
 * WebGL availability check for the 3D games. jsdom (tests) and some old
 * or locked-down devices have no GL context — those get a friendly
 * fallback screen instead of a crash.
 */
export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
