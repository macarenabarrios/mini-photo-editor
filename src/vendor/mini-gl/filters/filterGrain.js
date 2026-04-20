import { Shader } from '../minigl.js'

// Procedural grain with size + roughness.
//  amount: 0..1 intensity
//  size:   0..1 grain cell scale (larger = coarser)
//  rough:  0..1 mix between fine and coarse octaves
export function filterGrain(mini, { amount = 0, size = 0.25, rough = 0.5 } = {}) {
  if (!amount) return

  const _fragment = `#version 300 es
    precision highp float;
    in vec2 texCoord;
    uniform sampler2D _texture;
    uniform vec2 uResolution;
    uniform float uAmount;
    uniform float uSize;
    uniform float uRough;
    out vec4 outColor;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 78.233);
      return fract(p.x * p.y);
    }
    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0 - 2.0*f);
      return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
    }

    void main(){
      vec4 src = texture(_texture, texCoord);
      float scale = mix(1.0, 6.0, uSize); // 1=fine, 6=coarse
      vec2 p = texCoord * uResolution / scale;
      float n1 = noise(p);
      float n2 = noise(p * 2.7);
      float g = mix(n1, (n1 + n2) * 0.5, uRough) - 0.5;

      float L = dot(src.rgb, vec3(0.299, 0.587, 0.114));
      float protect = smoothstep(0.0, 0.15, L) * (1.0 - smoothstep(0.85, 1.0, L));

      vec3 rgb = src.rgb + vec3(g) * uAmount * 0.5 * protect;
      outColor = vec4(clamp(rgb, 0.0, 1.0), src.a);
    }
  `

  const { gl } = mini
  const uResolution = [gl.canvas.width, gl.canvas.height]
  mini._.$grain = mini._.$grain || new Shader(gl, null, _fragment)
  mini.runFilter(mini._.$grain, {
    uAmount: amount,
    uSize: size,
    uRough: rough,
    uResolution,
  })
}
