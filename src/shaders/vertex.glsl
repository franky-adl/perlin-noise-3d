#pragma glslify: voronoi = require('./voronoi3d.glsl')
#pragma glslify: cnoise = require('./perlin3d.glsl')

float PI = 3.141592653589793238;
uniform float u_time;
uniform int noiseAlgo;
uniform float noiseRange;
uniform float randomFactor;
attribute vec2 reference;
varying float noiseVal;

float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233)))*43758.5453123);
}

void main() {
  float rF = randomFactor;
  vec3 tweakedPos = position + vec3(random(reference.xy), random(reference.yx * vec2(3.0)), random(reference.xy * vec2(5.0))) * rF;
  vec4 mvPosition = modelViewMatrix * vec4(tweakedPos, 1.);

  float fF = 3.;
  float ps = 0.;
  float ps2 = 0.;
  float edgeFactor = 4.0;
  float xy = abs(position.x)*abs(position.y);
  float xz = abs(position.x)*abs(position.z);
  float yz = abs(position.z)*abs(position.y);
  // approximate a consistent point size for cube edges
  float tmp = max(xy,xz);
  tmp = max(tmp,yz);
  ps2 = smoothstep(0.8, 1.0, tmp);

  if (noiseAlgo == 1) {
    noiseVal = cnoise(position * (noiseRange + sin(u_time/3.0)) + vec3(sin(u_time/2.7), cos(u_time/3.6), sin(u_time/5.5)) * fF) + 1.0;
    // point size from the noise
    ps = smoothstep(0.6, 2.0, noiseVal) * 5.;
    gl_PointSize = mix(ps, ps2*edgeFactor, ps2);
  } else if (noiseAlgo == 2) {
    vec2 res = voronoi(position * (noiseRange + sin(u_time/3.0)), u_time);
    noiseVal = res.x;
    ps = smoothstep(0.0, 1.3, noiseVal) * 5.;
    gl_PointSize = mix(ps, ps2*edgeFactor, ps2);
  }

  gl_Position = projectionMatrix * mvPosition;
}