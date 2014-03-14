#ifdef GL_ES
precision mediump float;
#endif

#define M_PI 3.141593
#define RAYMARCH_CYCLES 64


uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;

/*
// TODO: since accessing an array needs to be a const expression
//       the array needs to be a texture or some such.
//       http://stackoverflow.com/questions/19755973/using-an-array-in-glsl-shaders-in-webgl

const int width = 100;
const int height = 100;
float depth[width * height];

float get_depth(int x, int y) {
  int start = y*width + x;
  for (int i = 0; i<100; i++) {
    return depth[i];
  }
}
*/


vec3 cutterPosition = vec3(0, 0.125, .4);
float cutterRadius = .15;

float solid_plane(vec3 p) {
  return p.y;
}

float solid_sphere(vec3 p, float s) {
  return length(p)-s;
}

float solid_box(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x,max(d.y,d.z)),0.0) +
         length(max(d,0.0));
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

vec2 map(in vec3 pos) {
  float box = solid_box(pos-vec3(0.0,0.05, 0.0), vec3(.5, .1, .5));
  float cyl = solid_capsule(pos-cutterPosition, vec3(.0, .0, 0.01), vec3(.0, .5, 0.01), cutterRadius);
  vec2 res = vec2(op_subtract(cyl, box), box);
  return res;
}

vec3 calcNormal(in vec3 pos) {
  vec3 eps = vec3(0.001, 0.0, 0.0);
  vec3 nor = vec3(
      map(pos+eps.xyy).x - map(pos-eps.xyy).x,
      map(pos+eps.yxy).x - map(pos-eps.yxy).x,
      map(pos+eps.yyx).x - map(pos-eps.yyx).x
  );
  return normalize(nor);
}

vec2 castRay(in vec3 ro, in vec3 rd, in float maxd) {
  float precis = 0.001;
  float h=precis;
  float t = 0.0;
  float m = -1.0;
  float closest = precis*100.0;
  for(int i=0; i<RAYMARCH_CYCLES; i++) {
    if(abs(h)<precis || t>maxd) {
      break;
    }

    t += h;
    vec2 res = map(ro+rd*t);
    h = res.x;
    m = res.y;
  }

  if (t>maxd) {
    m=-1.0;
  }

  return vec2(t, m);
}

vec3 render(in vec3 ro, in vec3 rd) {
  vec3 col = vec3(0.0);
  vec2 res = castRay(ro,rd,5.0);

  float t = res.x;
  float m = res.y;
  if(m>-0.5) {
    vec3 pos = ro + t*rd;
    vec3 nor = calcNormal(pos);

    //col = vec3(0.6) + 0.4*sin(vec3(0.05,0.08,0.10)*(m-1.0));
    col = vec3(0.6) + 0.4*sin(vec3(0.05,0.08,0.10)*(m-1.0));

    //float ao = calcAO(pos, nor);

    vec3 lig = normalize(vec3(-0.6, 0.7, -0.5));
    float amb = clamp(0.5+0.5*nor.y, 0.0, 1.0);
    float dif = clamp(dot(nor, lig), 0.0, 1.0);
    float bac = clamp(dot(nor, normalize(vec3(-lig.x,0.0,-lig.z))), 0.0, 1.0)*clamp(1.0-pos.y,0.0,1.0);

    float sh = 1.0;
    //if(dif>0.02) { sh = softshadow(pos, lig, 0.02, 10.0, 7.0); dif *= sh; }

    vec3 brdf = vec3(0.0);
    brdf += 0.20*amb*vec3(0.10,0.11,0.13);//*ao;
    brdf += 0.20*bac*vec3(0.15,0.15,0.15);//*ao;
    brdf += 1.20*dif*vec3(1.00,0.90,0.70);

    float pp = clamp(dot(reflect(rd,nor), lig), 0.0, 1.0);
    float spe = sh*pow(pp,16.0);
    float fre = pow(clamp(1.0+dot(nor,rd),0.0,1.0), 2.0);//*ao;

    col = col*brdf + vec3(1.0)*col*spe + 0.2*fre*(0.5+0.5*col);
  }

  col *= exp(-0.01*t*t);

  return vec3(clamp(col,0.0,1.0));
}

void main(void)
{
  vec2 q = gl_FragCoord.xy/resolution.xy;
  vec2 p = -1.0+2.0*q;
  p.x *= resolution.x/resolution.y;
  vec2 mo = mouse.xy/resolution.xy;


  // camera
  vec3 ro = vec3( -0.5+3.2*cos(0.1*time + 6.0*mo.x), 1.0 + 2.0*mo.y, 0.5 + 3.2*sin(0.1*time + 6.0*mo.x) );
  vec3 ta = vec3( -0.5, -0.4, 0.5 );

  // camera tx
  vec3 cw = normalize( ta-ro );
  vec3 cp = vec3( 0.0, 1.0, 0.0 );
  vec3 cu = normalize( cross(cw,cp) );
  vec3 cv = normalize( cross(cu,cw) );
  vec3 rd = normalize( p.x*cu + p.y*cv + 2.5*cw );

  cutterPosition.x = cos(time)/2.0;
  cutterPosition.z = sin(time)/2.0;

  vec3 col = render( ro, rd );

  col = sqrt( col );

  gl_FragColor = vec4( col, 1.0 );
}
