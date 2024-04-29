// #pragma glslify: snoise2 = require(glsl-noise/simplex/2d)
#pragma glslify: pnoise3 = require(glsl-noise/periodic/3d)

uniform float u_time;
uniform float time_speed;
varying vec2 vUv;

void main() {
    // if coords are 5x, periodic is 2x, then the pattern is repeated for 5/2 = 2.5x
    // so if you want to have a completely repeated pattern at the edges, go for same factor for both coords and periodic
    float newHeight = pnoise3(vec3(vUv * 10., u_time * time_speed), vec3(10.0)) * 20.;

    gl_FragColor = vec4(vec3(newHeight), 1.0);
}