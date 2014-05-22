var glslify = require('glslify');
var ndarray = require('ndarray');
var ndfill = require('ndarray-fill');
var createTexture = require('gl-texture2d');
var Vec2 = require('vec2');
var fc = require('fc');
var domready = require('domready');

var createRaymarchProgram = glslify({
  vertex: './shaders/raymarch.vert',
  fragment: './shaders/raymarch.frag'
});

// Physical representation (in mm)
var physicalCutterRadius = 3.175;
var physicalStockDimensions = [100, 100, 10];


// Simulation vars
var simScale = 100;
var scaleToSim = function(a) {
  return a/simScale;
};

var cutterRadius = physicalCutterRadius/simScale;
var stockDimensions = physicalStockDimensions.map(scaleToSim);

var mouse = [0, window.innerHeight];
document.addEventListener('mousemove', function(ev) {
  mouse[0] = ev.clientX;
  mouse[1] = ev.clientY;
});

var elapsed = 0;
var start = Date.now();
var first = false;
var v = -0.05 - cutterRadius/2;

var ratio = (1/2048);

var r = Math.floor(cutterRadius / ratio);
var tool = ndarray(new Float32Array((r*2 * r*2)), [r*2, r*2]);

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

domready(function() {
  var gl = fc(render, true, 3);

  this.raymarchProgram = createRaymarchProgram(gl);
  this.raymarchProgram.bind();

  this.buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    1, 1, 0,
    -1, 1, 0,
    -1, -1, 0,
    1, 1, 0,
    1, -1, 0,
    -1, -1, 0
  ]), gl.STATIC_DRAW)
  this.raymarchProgram.attributes.position.pointer();


  this.depthBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.depthBuffer);

  var width = this.raymarchProgram.uniforms.depth_width = 2048;
  var height = this.raymarchProgram.uniforms.depth_height = 2048;

  this.raymarchProgram.uniforms.depth_stride = width;

  this.depthArray = ndarray(new Float32Array(width*height), [width, height]);

  this.depthTexture = createTexture(gl, this.depthArray);

  this.depthTexture.bind('depth');

  var r2 = r*2;
  function render(t) {

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    //Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)


    this.raymarchProgram.uniforms.resolution = [
      gl.drawingBufferWidth,
      gl.drawingBufferHeight
    ];

    this.raymarchProgram.uniforms.mouse = mouse;

    var time = this.raymarchProgram.uniforms.time = (Date.now() - start)/1000;

    var ctime = Math.cos(time)/2;
    var stime = Math.sin(time)/2;

    this.raymarchProgram.uniforms.cutterPosition = [
      stime/2, ctime/2, -v - cutterRadius
    ];

    this.raymarchProgram.uniforms.cutterRadius = cutterRadius;

    this.raymarchProgram.uniforms.stockDimensions = stockDimensions;

    var max = Math.max;
    var min = Math.min;

    var areax =  Math.round(ctime*1024) + 1024;
    var areay = Math.round(stime*1024) + 1024;

    var depthArray = this.depthArray
                         .hi(areax+r, areay+r)
                         .lo(areax-r, areay-r);

    v += .0001;
    for(var i=0; i<r2; ++i) {
      for(var j=0; j<r2; ++j) {
        var orig = depthArray.get(i, j);
        var map = tool.get(i, j);
        if (map === 0) {
          continue;
        }

        var computed = v + map;

        if (computed > orig) {
          depthArray.set(i, j, computed);
        }
      }
    }

    this.depthTexture.setPixels(
      depthArray,
      max(areay - r, 1),
      max(areax - r, 1)
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
});
