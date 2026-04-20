import { Shader } from '../minigl.js'

// Whites/Blacks (Camera Raw / Color Engine style).
// Both params in range -1..+1. "whites" pushes the extreme highs (L>0.7),
// "blacks" pushes the extreme lows (L<0.3). No-op when both are 0.
export function filterWhitesBlacks(mini, whites = 0, blacks = 0) {
  if (!whites && !blacks) return

  const _fragment = `#version 300 es
    precision highp float;
    in vec2 texCoord;
    uniform sampler2D _texture;
    uniform float uWhites;
    uniform float uBlacks;
    out vec4 outColor;

    float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

    void main(){
      vec4 src = texture(_texture, texCoord);
      float L = luma(src.rgb);

      float wMask = smoothstep(0.7, 1.0, L);
      float bMask = 1.0 - smoothstep(0.0, 0.3, L);

      vec3 rgb = src.rgb;
      rgb *= (1.0 + 0.5 * uWhites * wMask);
      rgb *= (1.0 + 0.5 * uBlacks * bMask);
      rgb = clamp(rgb, 0.0, 1.0);
      outColor = vec4(rgb, src.a);
    }
  `

  const { gl } = mini
  mini._.$wb = mini._.$wb || new Shader(gl, null, _fragment)
  mini.runFilter(mini._.$wb, { uWhites: whites, uBlacks: blacks })
}
