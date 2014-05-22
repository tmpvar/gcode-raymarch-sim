var GcodeRaymarchSimulator = require('./simulator');

var ndarray = require('ndarray');
var ndfill = require('ndarray-fill');

var fc = require('fc');
var domready = require('domready');

var sim = window.simulator = new GcodeRaymarchSimulator();

var cutterRadius = sim.scaleValue(sim.cutterRadius(1.25));
sim.stockDimensions(20, 50, 10);

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


sim.tool(tool);

sim.mouse(0, window.innerHeight);
document.addEventListener('mousemove', function(ev) {
  sim.mouse(ev.clientX, ev.clientY);
});

cz = 0;
setInterval(function() {
  cz -= 0.001;
  var time = Date.now()/1000;
  var cx = 20 + Math.sin(time)*10;
  var cy = 20 + Math.cos(time)*10;
  sim.moveTool(cx, cy, cz)
}, 0);


domready(function() {
  var gl = fc(function(dt) {
    sim.render(gl, dt);
  }, false, 3);

  sim.init(gl);

  gl.start();
});
