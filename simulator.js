var glslify = require('glslify');
var ndarray = require('ndarray');
var createTexture = require('gl-texture2d');

var createRaymarchProgram = glslify({
  vertex: './shaders/raymarch.vert',
  fragment: './shaders/raymarch.frag'
});

function GcodeRaymarchSimulator() {
  this._mouse = [];
  this._v = 0;
  this.cutterRadius(0.01);
  this._ratio = 1/2048;
  this._scale = 100;
  this._stockTop = 0;
  this._stockDimensions = [0,0,0];
  this._stockPosition = [0,0,0];
  this._cutterPosition = [0,0,0];
}

GcodeRaymarchSimulator.prototype.init = function(gl) {

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
}


GcodeRaymarchSimulator.prototype.render = function(gl, dt) {
  var time = Date.now()/1000;

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  //Set viewport
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  this.raymarchProgram.uniforms.resolution = [
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  ];

  this.raymarchProgram.uniforms.mouse = this._mouse;
  this.raymarchProgram.uniforms.cutterPosition = this._cutterPosition;


  this.raymarchProgram.uniforms.cutterRadius = this._cutterRadius;

  this.raymarchProgram.uniforms.stockDimensions = this._stockDimensions;
  this.raymarchProgram.uniforms.stockPosition = this._stockPosition;
  this.raymarchProgram.uniforms.stockTop = this._stockTop;


  gl.drawArrays(gl.TRIANGLES, 0, 6);
};


GcodeRaymarchSimulator.prototype.moveTool = function(x, y, z) {
  var sx = this.scaleValue(x);
  var sy = this.scaleValue(y);
  var sz = this.scaleValue(z);

  var time = this.raymarchProgram.uniforms.time = Date.now()/1000;

  var ctime = Math.cos(time)/2;
  var stime = Math.sin(time)/2;


  this._physicalCutterPosition = [x, y, z];
  var stockDimensions = this._stockDimensions;
  this._cutterPosition = [sx, sy, sz].map(function(a, i) {
    return a - stockDimensions[i]/2;
  });

  this._cutterPosition[2] = this._v + (-sz);

  if (z > 0) {
    return;
  }

  var r = this._cutterRadius / this._ratio;
  var rx = Math.round(sy * 2048);
  var ry = Math.round(sx * 2048);
  var rz = Math.round(sz * 2048);

  var depthArray = this.depthArray
                       .hi(rx+r, ry+r)
                       .lo(rx-r, ry-r);

  var r2 = r*2;

  for(var i=0; i<r2; ++i) {
    for(var j=0; j<r2; ++j) {
      var orig = depthArray.get(i, j);
      var map = this._tool.get(i, j);
      if (map === 0 || isNaN(map)) {
        continue;
      }

      var computed = this._v+(-sz)+map;

      if (computed > orig) {
        depthArray.set(i, j, computed);
      }
    }
  }

  this.depthTexture.setPixels(
    depthArray,
    Math.max(ry - r, 1),
    Math.max(rx - r, 1)
  );

}

GcodeRaymarchSimulator.prototype.tool = function(ndarray) {
  this._tool = ndarray;
};

GcodeRaymarchSimulator.prototype.mouse = function(x, y) {
  this._mouse[0] = x;
  this._mouse[1] = y;
};

GcodeRaymarchSimulator.prototype.scale = function(units) {
  this._scale = units;
  return this._scale;
};

GcodeRaymarchSimulator.prototype.stockDimensions = function(x, y, z) {
  var scale = this._scale;
  this._physicalStockDimensions = [x, y, z];

  this._stockDimensions = this._physicalStockDimensions.map(function(a) {
    return a/scale;
  });

  this._stockPosition = this._stockDimensions.map(function(a) {
    return a/2;
  });

  this._stockTop = this._stockDimensions[2] + this._stockPosition[2];
  this._v = this._stockPosition[2]-this._stockDimensions[2]/2 - this._cutterRadius;
}

GcodeRaymarchSimulator.prototype.scaleValue = function(units) {
  if (Array.isArray(units)) {
    return units.map(this.scaleValue.bind(this));
  } else {
    return units/this._scale;
  }
};

GcodeRaymarchSimulator.prototype.cutterRadius = function(units) {
  this._physicalCutterRadius = units;
  this._cutterRadius = units/this._scale;
  this._cutterRadiusRatio = Math.floor(units / this._scale);
  return units;
};


module.exports = GcodeRaymarchSimulator;
