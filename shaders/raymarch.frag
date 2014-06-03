#ifdef GL_ES
precision highp float;
#endif

#define M_PI 3.141593
#define RAYMARCH_CYCLES 64
#define RAYMARCH_PRECISION 0.0001

uniform float depth_stride;
uniform vec2 mouse;
uniform vec2 resolution;
uniform sampler2D depth;

uniform vec3 cutterPosition;
uniform float cutterRadius;

// stock uniforms
uniform vec3 stockDimensions;
uniform vec3 stockPosition;
uniform float stockTop;

float depth_get(in vec2 uv) {
  return texture2D(depth, uv).x;
}

float solid_plane(vec3 p) {
  return p.y;
}

float solid_sphere(vec3 p, float s) {
  return length(p)-s;
}

float solid_box(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}


// float pointseg_distance(in vec3 start, in vec3 end, in vec3 point) {
//   vec3 c = point - start; // Vector from a to Point
//   vec3 v = normalize(end - start); // Unit Vector from a to b
//   float d = length(end - start); // Length of the line segment
//   float t = dot(v, c);  // Intersection point Distance from a

//   // Check to see if the point is on the line
//   // if not then return the endpoint
//   if(t < 0.0) {
//     return distance(start, point);
//   }

//   if(t > d) {
//     return distance(end, point);
//   }

//   // move from point a to the nearest point on the segment
//   return distance(start + (v * t), point);
// }

float solid_depthmap(vec3 p, float amount) {
  float r = 1.0/2048.0;

  // if (abs(p.x) > .5 || abs(p.y) > .5) {
  //   return RAYMARCH_PRECISION/10.0;
  // }

  vec2 pos = floor(p.xy * 2048.0) / 2048.0;
  float depth = depth_get(p.xy + (stockPosition.xy - stockDimensions.xy/2.0));

  // if (depth == 0.0) {
  //   return min(amount, RAYMARCH_PRECISION);
  // }

  float d = r*10.0;//* 2.25;

  return solid_box(
    p - vec3(p.xy, stockTop),
    vec3(d, d, depth)
  );
}

float solid_cylinder(vec3 p, vec3 c) {
  return length(p.xz-c.xy)-c.z;
}

float solid_capsule( vec3 p, vec3 a, vec3 b, float r ) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h ) - r;
}

float op_union(float d1, float d2) {
  return min(d1, d2);
}

float op_subtract( float d1, float d2 ) {
  return max(-d1, d2);
}

float op_intersect( float d1, float d2 ) {
  return max(d1, d2);
}

vec2 map(in vec3 origin, in vec3 dir, in float amount) {

  vec3 pos = origin + dir * amount;

  if (pos.z < 0.0) {
    return vec2(RAYMARCH_PRECISION * .99, -1.0);
  }

  float box = solid_box(
    pos - stockPosition,
    stockDimensions/2.0
  );

  float cyl = solid_capsule(
    pos - stockPosition - vec3(cutterPosition.xy, (stockDimensions.z - cutterRadius/2.0) - cutterPosition.z) - vec3(cutterRadius, cutterRadius, 0.0),
    vec3(0.0, 0.0, 0.0),
    vec3(0.0, 0.0, 0.25),
    cutterRadius
  );

  float res;
  res = solid_depthmap(pos, amount);
  res = op_subtract(res, box);
  res = op_union(cyl, res);

  return vec2(res, 10.0);
}

vec3 calcNormal(in vec3 origin, in vec3 dir, in float t) {
  vec3 pos = origin + dir * t;
  vec3 eps = vec3(0.001, 0.0, 0.0);
  vec3 nor = vec3(
      map(origin+eps.xyy, dir, t).x - map(origin-eps.xyy, dir, t).x,
      map(origin+eps.yxy, dir, t).x - map(origin-eps.yxy, dir, t).x,
      map(origin+eps.yyx, dir, t).x - map(origin-eps.yyx, dir, t).x
  );
  return max(eps, normalize(nor));
}

vec3 castRay(in vec3 ro, in vec3 rd, in float maxd) {

  float h=RAYMARCH_PRECISION;
  float t = 0.0;
  float m = -1.0;

  for(int i=0; i<RAYMARCH_CYCLES; i++) {
    vec3 pos = ro + rd * t;
    if(h < RAYMARCH_PRECISION) {
      break;
    }

    if (t>maxd) {
      m=-1.0;
      break;
    }

    vec2 res = map(ro, rd, t);
    h = max(res.x, RAYMARCH_PRECISION);
    h = res.x;
    t += h * .75;//max(h * .25, -h);
    m = res.y;

  }

  return vec3(t, m, dot(t, m));
}

vec3 render(in vec3 ro, in vec3 rd) {
  vec3 col = vec3(0.0);
  vec3 res = castRay(ro,rd,5.0);

  float t = res.x;
  float m = res.y;
  vec3 v = max(calcNormal(ro, rd, t), 1.0 / res);
  return vec3(dot(clamp(v, 0.2, smoothstep(0.4, .6, min(m, t))), normalize(res)));
}

void main(void)
{
  vec2 q = gl_FragCoord.xy/resolution.xy;
  vec2 p = -1.0+2.0*q;
  p.x *= resolution.x/resolution.y;
  vec2 mo = mouse.xy/resolution.xy;


  // camera
  vec3 ro = vec3(1.0 + sin(6.0 * mo.x), 0.0, 3.0 * mo.y);
  vec3 ta = vec3(0.0, 0.0, 0.0);//vec3( -0.5, -0.2, 0.5 );

  // camera tx
  vec3 cw = normalize( ta-ro );
  vec3 cp = vec3( 0.0, 0.0, 1.0 );
  vec3 cu = normalize( cross(cw,cp) );
  vec3 cv = normalize( cross(cu,cw) );
  vec3 rd = normalize( p.x*cu + p.y*cv + 2.5*cw );


  vec3 col = render( ro, rd );
  /*
  float qd = depth_get(p);
  if (qd > 0.0) {
     gl_FragColor = vec4(qd, 1.0-qd, qd, 1.0);
  } else {
  */
    // float clen = length(col);
    // if (clen == 0.0) {
    //   gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    // } else {
      gl_FragColor = vec4(sqrt(col), 1.0);
    // }
  //}
}
