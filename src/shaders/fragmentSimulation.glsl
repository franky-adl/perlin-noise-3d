uniform float time;
uniform float delta;
uniform sampler2D texturePosition;


void main()	{

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 tmpPos = texture2D( texturePosition, uv );
    // feed tmpPos into Perlin 3D to get value
    // float perlin = cnoise(tmpPos.xyz * 100.);

    // gl_FragColor = vec4( vec3(perlin, 0., 0.), 1. );
    gl_FragColor = vec4( vec3(tmpPos.xyz), 1. );

}