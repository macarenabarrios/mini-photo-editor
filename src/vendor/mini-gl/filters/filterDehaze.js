import { Shader } from '../minigl.js'

// Dehaze. Simplified Koschmieder model: J = (I - A*(1-t)) / t
// Positive amount removes haze, negative adds atmospheric veil.
// Atmosphere A approximated as a warm grey (0.92, 0.94, 0.98).
export function filterDehaze(mini, amount = 0) {
  if (!amount) return

  const _fragment = `#version 300 es
    precision highp float;
    in vec2 texCoord;
    uniform sampler2D _texture;
    uniform float uAmount;
    out vec4 outColor;

    void main(){
      vec4 src = texture(_texture, texCoord);
      vec3 A = vec3(0.92, 0.94, 0.98);
      float t = clamp(1.0 - 0.4 * uAmount, 0.25, 2.0);
      vec3 j = (src.rgb - A * (1.0 - t)) / t;
      j = clamp(j, 0.0, 1.0);

      // Keep mid-tones mostly intact; strongest effect where haze lives (low contrast areas)
      float L = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      float veil = 1.0 - smoothstep(0.65, 0.98, L);
      vec3 rgb = mix(src.rgb, j, veil);

      outColor = vec4(rgb, src.a);
    }
  `

  const { gl } = mini
  mini._.$dehaze = mini._.$dehaze || new Shader(gl, null, _fragment)
  mini.runFilter(mini._.$dehaze, { uAmount: amount })
}
