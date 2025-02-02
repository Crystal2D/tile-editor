#version 300 es

//
// NAME : "Refractor/Circle"
// TYPE : FRAGMENT
//

precision mediump float;

uniform vec4 uColor;
uniform vec4 uFillColor;
uniform vec2 uPosition;
uniform float uRadius;
uniform float uThickness;

out vec4 fragColor;

void main ()
{
    float thicknessOffset = uThickness * 0.5;

    float distance = distance(vec2(gl_FragCoord), uPosition);

    fragColor = vec4(vec3(uColor), uColor.a - distance + uRadius + thicknessOffset);
    
    if (distance < uRadius - thicknessOffset)
    {
        float factor = 1.0 - (uRadius - thicknessOffset) + distance;
        
        if (factor < 0.0) factor = 0.0;

        fragColor = mix(uFillColor, uColor, factor);
    }
}