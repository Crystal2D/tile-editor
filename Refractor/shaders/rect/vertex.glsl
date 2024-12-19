#version 300 es

//
// NAME : "Refractor/Rect"
// TYPE : VERTEX
//

layout(location = 0) in vec2 aVertexPos;

void main ()
{
    gl_Position = vec4(vec3(aVertexPos, 1), 1);
}