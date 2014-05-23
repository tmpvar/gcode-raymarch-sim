var GcodeRaymarchSimulator = require('./simulator');
var skateboard = require('skateboard');
var ndarray = require('ndarray');
var ndfill = require('ndarray-fill');
var split = require('split');
var fc = require('fc');
var domready = require('domready');
var qs = require('querystring');
var search = qs.parse(window.location.search.replace('?', ''));
var sim = window.simulator = new GcodeRaymarchSimulator();

var cutterRadius = sim.scaleValue(sim.cutterRadius(parseFloat(search.diameter || 1.25)/2));
sim.stockDimensions(70, 70, 25);

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
    var cx = 20 + Math.sin(time)*10;
    var cy = 20 + Math.cos(time)*10;
    sim.moveTool(cx, cy, cz)
  }, 0);
}

domready(function() {
  var gl = fc(function(dt) {
    sim.render(gl, dt);
  }, false, 3);

  sim.init(gl);

  gl.start();
});
