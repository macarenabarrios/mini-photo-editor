import { Shader } from '../minigl.js'

// Texture filter: Camera Raw / Lightroom style
// Enhances or reduces mid-frequency details (skin pores, hair, bark, fabric)
// without affecting fine edges (noise) or large-scale contrast (structure).
//
// Single-pass frequency separation:
//   - Small blur (sigma ~1.5, 5x5): original minus noise
//   - Large blur (sigma ~4, 13x13): low-frequency structure
//   - Mid-band = smallBlur - largeBlur (texture-scale detail only)
//   - Result = original + midBand * amount
//
// Range: -100 to 100

export function filterTexture(mini, amount) {
  if (amount === 0) return

  const _fragment = `#version 300 es
        precision highp float;

        in vec2 texCoord;
        uniform sampler2D _texture;
        out vec4 outColor;

        uniform vec2 uResolution;
        uniform float uAmount;

        void main() {
            vec4 original = texture(_texture, texCoord);
            vec2 pixel = 1.0 / uResolution;

            // Small blur (sigma 1.5, 5x5) — removes high-freq noise, keeps texture + structure
            vec3 smallBlur = vec3(0.0);
            float sZ = 0.0;
            for (int i = -2; i <= 2; i++) {
                for (int j = -2; j <= 2; j++) {
                    float w = exp(-0.5 * float(i*i + j*j) / 2.25);
                    smallBlur += texture(_texture, texCoord + vec2(float(i), float(j)) * pixel).rgb * w;
                    sZ += w;
                }
            }
            smallBlur /= sZ;

            // Large blur (sigma 4, 13x13) — keeps only low-freq structure
            vec3 largeBlur = vec3(0.0);
            float lZ = 0.0;
            for (int i = -6; i <= 6; i++) {
                for (int j = -6; j <= 6; j++) {
                    float w = exp(-0.5 * float(i*i + j*j) / 16.0);
                    largeBlur += texture(_texture, texCoord + vec2(float(i), float(j)) * pixel).rgb * w;
                    lZ += w;
                }
            }
            largeBlur /= lZ;

            // Mid-frequency band = texture-scale detail
            vec3 midBand = smallBlur - largeBlur;

            // Apply: positive enhances texture, negative smooths it
            vec3 result = clamp(original.rgb + midBand * uAmount, 0.0, 1.0);
            outColor = vec4(result, original.a);
        }
    `

  const { gl } = mini
  const uResolution = [gl.canvas.width, gl.canvas.height]
  const uAmount = (amount / 100.0) * 2.5

  mini._.$texture = mini._.$texture || new Shader(gl, null, _fragment)
  mini.runFilter(mini._.$texture, { uAmount, uResolution })
}
