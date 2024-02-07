varying float noiseVal;
uniform float colorVariance;
uniform float u_time;

// reference: https://www.shadertoy.com/view/XljGzV
// h,s,l components are expected to be in [0..1]
vec3 hsl2rgb( in vec3 c ) {
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );

    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

void main() {
    float time = u_time*0.04;
    float finHue = fract(mix(time, time + colorVariance, noiseVal/2.));
    vec4 color = vec4(hsl2rgb(vec3(finHue, 1.0, noiseVal / 4.)), .15);

    gl_FragColor = color;
}