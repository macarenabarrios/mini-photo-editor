import { Shader } from '../minigl.js'

/**
 * Applies a 3D LUT (.cube) to the image using a WebGL2 sampler3D.
 *
 * Uniforms:
 *   _texture (sampler2D)  — bound automatically by runFilter via ping-pong
 *   u_lut    (sampler3D)  — bound by us to texture unit 1
 *   u_mix    (float)      — 0..1 blend between original and graded
 *
 * Params:
 *   lut: { id, size, data: Float32Array }  — parsed .cube
 *   mix: 0..1
 *
 * Caching: we store uploaded 3D textures in `mini._.$lut3dCache` keyed by lut.id
 * so moving the mix slider doesn't re-upload the LUT to the GPU.
 */
export function filterLUT3D(mini, lut, mix = 1) {
  const { gl } = mini
  if (!lut || !lut.data || !lut.size) return

  const _fragment = `#version 300 es
    precision highp float;
    precision highp sampler3D;

    in vec2 texCoord;
    uniform sampler2D _texture;
    uniform sampler3D u_lut;
    uniform float u_mix;
    out vec4 outColor;

    // mini-gl runs filters in LINEAR space (image uploaded as SRGB8_ALPHA8
    // gets auto-decoded to linear on sample). .cube LUTs are authored in sRGB
    // space, so we must go linear->sRGB before the lookup and back after.
    vec3 fromLinear(vec3 linearRGB) {
      bvec3 cutoff = lessThan(linearRGB, vec3(0.0031308));
      vec3 higher = vec3(1.055) * pow(linearRGB, vec3(1.0/2.4)) - vec3(0.055);
      vec3 lower  = linearRGB * vec3(12.92);
      return mix(higher, lower, cutoff);
    }
    vec3 toLinear(vec3 sRGB) {
      bvec3 cutoff = lessThan(sRGB, vec3(0.04045));
      vec3 higher = pow((sRGB + vec3(0.055)) / vec3(1.055), vec3(2.4));
      vec3 lower  = sRGB / vec3(12.92);
      return mix(higher, lower, cutoff);
    }

    void main() {
      vec4 color = texture(_texture, texCoord);
      vec3 srgb   = fromLinear(color.rgb);
      vec3 graded = texture(u_lut, srgb).rgb;  // LUT operates in sRGB
      vec3 back   = toLinear(graded);
      outColor = vec4(mix(color.rgb, back, u_mix), color.a);
    }
  `

  // Shader cache (one compile for the lifetime of mini)
  mini._.$lut3d = mini._.$lut3d || new Shader(gl, null, _fragment)

  // 3D texture cache — keyed by the LUT's stable id so we only upload once per LUT
  mini._.$lut3dCache = mini._.$lut3dCache || new Map()
  let entry = mini._.$lut3dCache.get(lut.id)
  if (!entry) {
    // Enable linear filtering on float textures (so trilinear interpolation works)
    gl.getExtension('OES_texture_float_linear')

    const texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE1) // use unit 1 so we don't clobber the image on unit 0
    gl.bindTexture(gl.TEXTURE_3D, texture)
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGB32F,
      lut.size,
      lut.size,
      lut.size,
      0,
      gl.RGB,
      gl.FLOAT,
      lut.data,
    )
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)

    entry = { texture, size: lut.size }
    mini._.$lut3dCache.set(lut.id, entry)
  }

  // Bind the cached 3D texture to unit 1 before drawing
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_3D, entry.texture)

  mini.runFilter(mini._.$lut3d, { u_lut: { unit: 1 }, u_mix: mix })

  // Leave unit 0 active so subsequent filters behave as expected
  gl.activeTexture(gl.TEXTURE0)
}

/**
 * Releases a cached 3D LUT texture from the GPU.
 * Call this when the user removes a LUT from the editor.
 */
export function disposeLUT3D(mini, id) {
  const cache = mini._.$lut3dCache
  if (!cache) return
  const entry = cache.get(id)
  if (!entry) return
  mini.gl.deleteTexture(entry.texture)
  cache.delete(id)
}
