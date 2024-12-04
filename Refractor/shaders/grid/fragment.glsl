#version 300 es

//
// NAME : "Refractor/Grid"
// TYPE : FRAGMENT
//

precision mediump float;

uniform vec4 uColor;
uniform vec2 uOffset;
uniform vec2 uSize;
uniform float uThickness;

out vec4 fragColor;

void main ()
{
    float x = gl_FragCoord.x - uOffset.x;
    float y = gl_FragCoord.y - uOffset.y;

    if (mod(x + uThickness * 0.5, uSize.x) <= uThickness || mod(y + uThickness * 0.5, uSize.y) <= uThickness) fragColor = uColor;
}