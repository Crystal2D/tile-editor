#version 300 es

//
// NAME : "Refractor/Rect"
// TYPE : FRAGMENT
//

precision mediump float;

uniform vec4 uColor;
uniform vec2 uMin;
uniform vec2 uMax;
uniform float uThickness;

out vec4 fragColor;

void main ()
{
    float thicknessOffset = uThickness * 0.5;

    if (gl_FragCoord.x >= uMin.x - thicknessOffset && gl_FragCoord.x <= uMax.x + thicknessOffset)
    {
        if (gl_FragCoord.y >= uMin.y - thicknessOffset && gl_FragCoord.y <= uMin.y + thicknessOffset) fragColor = uColor;
        if (gl_FragCoord.y >= uMax.y - thicknessOffset && gl_FragCoord.y <= uMax.y + thicknessOffset) fragColor = uColor;
    }

    if (gl_FragCoord.y >= uMin.y - thicknessOffset && gl_FragCoord.y <= uMax.y + thicknessOffset)
    {
        if (gl_FragCoord.x >= uMin.x - thicknessOffset && gl_FragCoord.x <= uMin.x + thicknessOffset) fragColor = uColor;
        if (gl_FragCoord.x >= uMax.x - thicknessOffset && gl_FragCoord.x <= uMax.x + thicknessOffset) fragColor = uColor;
    }
}