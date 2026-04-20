import { Shader } from '../minigl.js'

// Sharpen filter: Camera Raw style (single slider)
// Unsharp mask with edge-aware luminance masking.
// Protects flat/smooth areas (sky, skin) from noise amplification.
// Range: 0 to 100

export function filterSharpen(mini, amount) {
  if (amount <= 0) return

  const _fragment = `#version 300 es
        precision highp float;

        in vec2 texCoord;
        uniform sampler2D _texture;
        out vec4 outColor;

        uniform vec2 uResolution;
        uniform float uAmount;

        float luma(vec3 c) {
            return dot(c, vec3(0.2126, 0.7152, 0.0722));
        }

        void main() {
            vec4 original = texture(_texture, texCoord);
            vec2 pixel = 1.0 / uResolution;

            // Gaussian blur (sigma=1.2, 5x5) — radius for fine detail sharpening
            vec3 blurred = vec3(0.0);
            float Z = 0.0;
            for (int i = -2; i <= 2; i++) {
                for (int j = -2; j <= 2; j++) {
                    float w = exp(-0.5 * float(i*i + j*j) / 1.44); // sigma=1.2
                    blurred += texture(_texture, texCoord + vec2(float(i), float(j)) * pixel).rgb * w;
                    Z += w;
                }
            }
            blurred /= Z;

            // High-pass detail
            vec3 detail = original.rgb - blurred;

            // Edge-aware mask: gradient magnitude on luminance
            float lumL = luma(texture(_texture, texCoord + vec2(-pixel.x, 0.0)).rgb);
            float lumR = luma(texture(_texture, texCoord + vec2( pixel.x, 0.0)).rgb);
            float lumU = luma(texture(_texture, texCoord + vec2(0.0, -pixel.y)).rgb);
            float lumD = luma(texture(_texture, texCoord + vec2(0.0,  pixel.y)).rgb);
            float edge = length(vec2(lumR - lumL, lumD - lumU));

            // Mask: sharpen edges fully, fade on flat areas
            float mask = smoothstep(0.003, 0.04, edge);

            vec3 result = clamp(original.rgb + detail * uAmount * mask, 0.0, 1.0);
            outColor = vec4(result, original.a);
        }
    `

  const { gl } = mini
  const uResolution = [gl.canvas.width, gl.canvas.height]
  const uAmount = (amount / 100.0) * 2.0

  mini._.$sharpen = mini._.$sharpen || new Shader(gl, null, _fragment)
  mini.runFilter(mini._.$sharpen, { uAmount, uResolution })
}
