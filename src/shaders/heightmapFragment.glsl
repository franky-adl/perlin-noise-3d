// #pragma glslify: snoise2 = require(glsl-noise/simplex/2d)
#pragma glslify: pnoise2 = require(glsl-noise/periodic/2d)

void main() {
    // The size of the computation (sizeX * sizeY) is defined as 'resolution' automatically in the shader.
    // sizeX and sizeY are passed as params when you make a new GPUComputationRenderer instance.
    vec2 cellSize = 1.0 / resolution.xy;

    // gl_FragCoord is in pixels (coordinates range from 0.0 to the width/height of the window,
    // note that the window isn't the visible one on your browser here, since the gpgpu renders to its virtual screen
    // thus the uv still is 0..1
    vec2 uv = gl_FragCoord.xy * cellSize;

    // if coords are 5x, periodic is 2x, then the pattern is repeated for 5/2 = 2.5x
    // so if you want to have a completely repeated pattern at the edges, go for same factor for both coords and periodic
    float newHeight = pnoise2(uv * 10., vec2(10.0)) * 20.;

    gl_FragColor = vec4(vec3(newHeight), 1.0);
}