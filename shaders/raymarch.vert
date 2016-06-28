attribute vec3 position;
uniform mat4 uvmatrix;

varying vec3 v_uv;
varying vec3 v_dir;
varying float v_aspect;
varying float v_fov;

#define PI 3.14159

uniform vec2 resolution;

void main() {
  v_uv = 0.5 * (position+1.0);
  v_fov = tan((PI/4.0)/2.0);

  gl_Position = vec4(position, 1.0);

  v_aspect = resolution.x/resolution.y;

  v_dir = (vec4(
    position.x * v_fov * v_aspect,
    position.y * v_fov,
    -1.0,
    1.0
  ) * uvmatrix).xyz;
}
