#version 300 es

//
// NAME : "Refractor/Grid"
// TYPE : VERTEX
//

uniform mat3 uMatrix;

layout(location = 0) in vec2 aVertexPos;

void main ()
{
    gl_Position = vec4(uMatrix * vec3(aVertexPos, 1), 1);
}