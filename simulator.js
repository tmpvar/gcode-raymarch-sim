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

  var time = this.raymarchProgram.uniforms.time = Date.now()/1000;

  var ctime = Math.cos(time)/2;
  var stime = Math.sin(time)/2;

  this.raymarchProgram.uniforms.cutterPosition = [
    stime/2, ctime/2, - this._v -this._cutterRadius
  ];

  this.raymarchProgram.uniforms.cutterRadius = this._cutterRadius;

  this.raymarchProgram.uniforms.stockDimensions = this._stockDimensions;
  this.raymarchProgram.uniforms.stockPosition = this._stockPosition;
  this.raymarchProgram.uniforms.stockTop = this._stockTop;

  var max = Math.max;
  var min = Math.min;

  var areax =  Math.round(ctime*1024) + 1024;
  var areay = Math.round(stime*1024) + 1024;

  var r = this._cutterRadius / this._ratio;

  var depthArray = this.depthArray
                       .hi(areax+r, areay+r)
                       .lo(areax-r, areay-r);

  this._v += .0001;
  var r2 = r*2;

  for(var i=0; i<r2; ++i) {
    for(var j=0; j<r2; ++j) {
      var orig = depthArray.get(i, j);
      var map = this._tool.get(i, j);
      if (map === 0) {
        continue;
      }

      var computed = this._v + map;

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
};

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
  return units/this._scale;
};

GcodeRaymarchSimulator.prototype.cutterRadius = function(units) {
  this._physicalCutterRadius = units;
  this._cutterRadius = units/this._scale;
  this._cutterRadiusRatio = Math.floor(units / this._scale);
  return units;
};


module.exports = GcodeRaymarchSimulator;
