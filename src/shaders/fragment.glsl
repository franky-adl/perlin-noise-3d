float PI = 3.141592653589793238;
uniform float time;
varying float perlin;

void main() {
    gl_FragColor = vec4(perlin/2., 0., 1. - perlin/2., .2);
}