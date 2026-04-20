import { Shader } from '../minigl.js'

// HSL color mixer over 8 hue bands (Camera Raw style).
// Bands centers in degrees: red=0, orange=30, yellow=60, green=120,
// aqua=180, blue=240, purple=270, magenta=300.
// Each band accepts {h, s, l} in -1..+1 (±1 ≈ ±30° hue shift, ±100% sat, ±100% luma).
export function filterHSL(mini, hsl) {
  if (!hsl) return
  const order = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta']
  const centers = [0.0, 30.0, 60.0, 120.0, 180.0, 240.0, 270.0, 300.0]

  // Pack uniforms
  const H = order.map((k) => hsl[k]?.h || 0)
  const S = order.map((k) => hsl[k]?.s || 0)
  const L = order.map((k) => hsl[k]?.l || 0)
  const any = H.concat(S, L).some((v) => v !== 0)
  if (!any) return

  const _fragment = `#version 300 es
    precision highp float;
    in vec2 texCoord;
    uniform sampler2D _texture;
    uniform float uCenters[8];
    uniform float uH[8];
    uniform float uS[8];
    uniform float uL[8];
    out vec4 outColor;

    vec3 rgb2hsv(vec3 c){
      vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0*d + e)), d / (q.x + e), q.x);
    }
    vec3 hsv2rgb(vec3 c){
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float bandWeight(float hueDeg, float center){
      float d = abs(hueDeg - center);
      d = min(d, 360.0 - d);
      // Gaussian-ish window, 30deg half-width
      return exp(-(d*d) / (2.0 * 30.0 * 30.0));
    }

    void main(){
      vec4 src = texture(_texture, texCoord);
      vec3 hsv = rgb2hsv(src.rgb);
      float hueDeg = hsv.x * 360.0;

      float hShift = 0.0;
      float sMul = 1.0;
      float lShift = 0.0;
      float totalW = 0.0;
      for (int i = 0; i < 8; i++){
        float w = bandWeight(hueDeg, uCenters[i]);
        hShift += uH[i] * 30.0 * w;     // +/- 30deg at extreme
        sMul   *= mix(1.0, 1.0 + uS[i], w); // +/-100% sat at extreme
        lShift += uL[i] * 0.25 * w;     // +/-25% value
        totalW += w;
      }

      hsv.x = fract((hueDeg + hShift) / 360.0 + 1.0);
      hsv.y = clamp(hsv.y * sMul, 0.0, 1.0);
      hsv.z = clamp(hsv.z + lShift, 0.0, 1.0);

      vec3 rgb = hsv2rgb(hsv);
      outColor = vec4(rgb, src.a);
    }
  `

  const { gl } = mini
  mini._.$hsl = mini._.$hsl || new Shader(gl, null, _fragment)
  mini.runFilter(mini._.$hsl, {
    uCenters: [centers],
    uH: [H],
    uS: [S],
    uL: [L],
  })
}
