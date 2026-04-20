// cubeParser.js
//
// Parses a .cube 3D LUT text file and returns its data ready for GPU upload.
// Ported from https://github.com/... (webgl-lut-playground)

/**
 * @param {string} content — raw contents of the .cube file
 * @returns {{ size: number, data: Float32Array, title?: string }}
 */
export function parseCubeFile(content) {
  const lines = content.split('\n')

  let size = 0
  let title
  const rgbValues = []

  for (const raw of lines) {
    const line = raw.trim()

    // Empty lines and comments
    if (line === '' || line.startsWith('#')) continue

    // LUT size per axis (e.g. 32 → 32×32×32 entries)
    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1], 10)
      continue
    }

    if (line.startsWith('TITLE')) {
      const m = line.match(/TITLE\s+"([^"]*)"/)
      if (m) title = m[1]
      continue
    }

    // Ignored metadata
    if (line.startsWith('DOMAIN_MIN') || line.startsWith('DOMAIN_MAX') || line.startsWith('LUT_1D_SIZE')) {
      continue
    }

    // Data line: "R G B" as three floats
    const parts = line.split(/\s+/)
    if (parts.length === 3) {
      const r = parseFloat(parts[0])
      const g = parseFloat(parts[1])
      const b = parseFloat(parts[2])
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        rgbValues.push(r, g, b)
      }
    }
  }

  if (!size) throw new Error('Invalid .cube file: missing LUT_3D_SIZE')

  const expectedLength = size ** 3 * 3
  if (rgbValues.length !== expectedLength) {
    throw new Error(
      'LUT data mismatch: expected ' + expectedLength + ' values, found ' + rgbValues.length
    )
  }

  return { size, data: new Float32Array(rgbValues), title }
}
