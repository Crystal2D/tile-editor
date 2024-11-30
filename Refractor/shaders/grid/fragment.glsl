#version 300 es

//
// NAME : "Refractor/Grid"
// TYPE : FRAGMENT
//

precision mediump float;

uniform vec4 uColor;
uniform vec2 uOffset;
uniform vec2 uSize;

out vec4 fragColor;

void main ()
{   
    fragColor = vec4(1, 1, 1 ,1);

    // float x = gl_FragCoord.x - uOffset.x;
    // float y = gl_FragCoord.y - uOffset.y;
    
    // if (int(mod(x, uSize.x)) == 0 || int(mod(y, uSize.y)) == 0) fragColor = uColor;
    // else fragColor = vec4(0.25, 0, 0.5, 1);
}