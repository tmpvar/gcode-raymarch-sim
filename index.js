var GcodeRaymarchSimulator = require('./simulator')

var ndarray = require('ndarray');
var ndfill = require('ndarray-fill');

var fc = require('fc');
var domready = require('domready');

var sim = new GcodeRaymarchSimulator();

var cutterRadius = sim.scaleValue(sim.cutterRadius(3.175));
sim.stockDimensions(10, 50, 25);

var r = Math.floor(cutterRadius / sim._ratio);
var r2 = r*2;
var tool = ndarray(new Float32Array((r2* r2)), [r2, r2]);

ndfill(tool, function(i, j) {

  // x difference, where r is the radius of the tool and i is the x coord
  var di = (i - r);

  // y difference
  var dj = (j - r);

  // this is weird because we have to convert the top of the stock,
  // known to be at 0.05 in the "world"
  //
  // basically this gives us the difference between the center of the
  // ball and the top of the stock

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

domready(function() {
  var gl = fc(function(dt) {
    sim.render(gl, dt);
  }, false, 3);

  sim.init(gl);

  gl.start();
});
