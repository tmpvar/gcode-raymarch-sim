var GcodeRaymarchSimulator = require('./simulator');
var skateboard = require('skateboard');
var ndarray = require('ndarray');
var ndfill = require('ndarray-fill');
var split = require('split');
var fc = require('fc');
var mat4 = require('gl-mat4');
var qs = require('querystring');
var input = require('./input')
var search = qs.parse(window.location.search.replace('?', ''));
var sim = window.simulator = new GcodeRaymarchSimulator();

var cutterRadius = sim.scaleValue(sim.cutterRadius(parseFloat(search.diameter || 1.25)/2));
var stockDimensions = sim.stockDimensions(
  search.stockWidth || 50,
  search.stockHeight || 50,
  search.stockDepth || 30
);

var r = Math.floor(cutterRadius / sim._ratio);
var r2 = r*2;
var tool = ndarray(new Float32Array(r2 * r2), [r2, r2]);

ndfill(tool, function(i, j) {

  // x difference, where r is the radius of the tool and i is the x coord
  var di = (i - r);

  // y difference
  var dj = (j - r);
  var dz = Math.sqrt(r * r);

  // compute the distance from 0,0 to x,y
  var l = Math.sqrt(di * di + dj * dj);

  if (l > r) {
    return 0;
  }

  return (Math.sqrt(dz * dz - l * l) / r) * cutterRadius;
});

if (search.skate) {
  var numeric = function(a) {
    return typeof a === 'number';
  }

  skateboard(function(stream) {
    stream.write('ready\n');

    stream.on('data', function(d) {
      try {
        var obj = JSON.parse(d);
        if (obj.x !== null) {
          sim.moveTool(obj.x, obj.y, obj.z);
        }
      } catch(e) {}
    });

  });
} else {
  cz = 0;
  setInterval(function() {
    cz -= 0.001;
    var time = Date.now()/1000;
    var cx = stockDimensions[0]/2 + Math.sin(time)*stockDimensions[0]/2;
    var cy = stockDimensions[1]/2 + Math.cos(time)*stockDimensions[1]/2;
    sim.moveTool(cx, cy, cz)
  }, 0);
}


var panSpeed = .01;
var panScratch = [0, 0, 0]
var gl = fc(function(dt) {

  panScratch[0] = 0
  panScratch[1] = 0
  panScratch[2] = 0

  var update = false

  if (input.keyboard[37]) {
    panScratch[0] = -panSpeed
    update = true
  }

  if (input.keyboard[38]) {
    panScratch[1] = -panSpeed
    update = true
  }

  if (input.keyboard[39]) {
    panScratch[0] = panSpeed
    update = true
  }

  if (input.keyboard[40]) {
    panScratch[1] = panSpeed
    update = true
  }

  if (input.mouse.down) {
    var w = gl.canvas.width;
    var h = gl.canvas.height;

    v2scratch[0]  = 2.0 * input.mouse.downPos[0]/w - 1.0;
    v2scratch[1]  = 2.0 * input.mouse.downPos[1]/h - 1.0;
    v2scratch2[0] = 2.0 * input.mouse.lastDownPos[0]/w - 1.0;
    v2scratch2[1] = 2.0 * input.mouse.lastDownPos[1]/h - 1.0;

    sim._camera.rotate(v2scratch, v2scratch2);
  }

  sim._camera.zoom((input.mouse.zoom - input.mouse.lastZoom) * -.001);

  update && sim._camera.pan(panScratch);
  updateCamera()

  sim.render(gl, dt);
  input.tick()
}, true, 3);

sim.init(gl);
sim.tool(tool);

var m4scratch = mat4.create();
function getEye(out, view) {
  mat4.invert(m4scratch, view);
  out[0] = m4scratch[12];
  out[1] = m4scratch[13];
  out[2] = m4scratch[14]
  return out;
}

var v2scratch = [0, 0]
var v2scratch2 = [0,0]
var model = mat4.create()
var view = mat4.create()
var projection = mat4.create()
var worldToClip = mat4.create()

function updateCamera () {
  var w = gl.canvas.width;
  var h = gl.canvas.height;

  sim._camera.view(view);

  getEye(sim._eye, view);

  mat4.identity(model);
  mat4.identity(worldToClip);
  mat4.identity(sim._invMVP);

  mat4.perspective(
    projection,
    Math.PI/4.0,
    w/h,
    0.1,
    1000.0
  );

  mat4.multiply(worldToClip, projection, view);
  mat4.copy(sim._uvmatrix, view)
  mat4.invert(sim._invMVP, worldToClip);
  mat4.multiply(sim._invMVP, sim._invMVP, projection);
}
