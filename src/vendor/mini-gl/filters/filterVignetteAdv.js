import { Shader } from '../minigl.js'

// Post-crop vignette (Camera Raw style).
//  amount:    -1..+1   negative = darken, positive = lighten
//  midpoint:   0..1    how far out the falloff starts (0=edge, 1=center)
//  feather:    0..1    softness of the transition
//  roundness: -1..+1   -1 = portrait oval, +1 = landscape oval
//  style:      0=Highlight priority, 1=Color priority, 2=Paint overlay
export function filterVignetteAdv(
  mini,
  { amount = 0, midpoint = 0.5, feather = 0.5, roundness = 0, style = 0 } = {},
) {
  if (!amount) return

  const _fragment = `#version 300 es
    precision highp float;
    in vec2 texCoord;
    uniform sampler2D _texture;
    uniform vec2 uResolution;
    uniform float uAmount;
    uniform float uMidpoint;
    uniform float uFeather;
    uniform float uRoundness;
    uniform float uStyle;
    out vec4 outColor;

    void main(){
      vec4 src = texture(_texture, texCoord);
      vec2 p = texCoord * 2.0 - 1.0;

      // Aspect correction + roundness (shape the ellipse)
      float ar = uResolution.x / max(uResolution.y, 1.0);
      vec2 q = p;
      // roundness: >0 widens horizontally, <0 widens vertically
      float rx = mix(1.0, ar, clamp(-uRoundness, 0.0, 1.0));
      float ry = mix(1.0, 1.0/ar, clamp(uRoundness, 0.0, 1.0));
      q.x *= rx;
      q.y *= ry;
      float d = length(q);

      float inner = uMidpoint * 1.2;
      float outer = inner + mix(0.05, 1.2, uFeather);
      float mask = smoothstep(inner, outer, d);

      vec3 rgb = src.rgb;
      if (uStyle > 1.5) {
        // Paint overlay: plain mix to black or white
        vec3 target = uAmount < 0.0 ? vec3(0.0) : vec3(1.0);
        rgb = mix(rgb, target, mask * abs(uAmount));
      } else if (uStyle > 0.5) {
        // Color priority: uniform multiplicative
        rgb *= (1.0 + uAmount * mask);
      } else {
        // Highlight priority: preserve highlights when darkening
        float L = dot(src.rgb, vec3(0.2126, 0.7152, 0.0722));
        float preserve = uAmount < 0.0 ? (1.0 - smoothstep(0.6, 1.0, L) * 0.7) : 1.0;
        rgb *= (1.0 + uAmount * mask * preserve);
      }

      outColor = vec4(clamp(rgb, 0.0, 1.0), src.a);
    }
  `

  const { gl } = mini
  const uResolution = [gl.canvas.width, gl.canvas.height]
  mini._.$vignAdv = mini._.$vignAdv || new Shader(gl, null, _fragment)
  mini.runFilter(mini._.$vignAdv, {
    uAmount: amount,
    uMidpoint: midpoint,
    uFeather: feather,
    uRoundness: roundness,
    uStyle: Math.max(0, Math.min(2, Math.round(style))),
    uResolution,
  })
}
