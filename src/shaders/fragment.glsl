varying float noiseVal;

void main() {
    gl_FragColor = vec4(noiseVal/2., 0., 1. - noiseVal/2., .2);
}