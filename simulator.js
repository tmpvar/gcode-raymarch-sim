var createShader = require('gl-shader');
var ndarray = require('ndarray');
var createTexture = require('gl-texture2d');
var createCamera = require('orbit-camera')
var mat4 = require('gl-mat4');
var fs = require('fs')

var fragmentShader = fs.readFileSync(__dirname + '/shaders/raymarch.vert', 'utf-8')
var vertexShader = fs.readFileSync(__dirname + '/shaders/raymarch.frag', 'utf-8')

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

  this._invMVP = mat4.create()
  this._uvmatrix = mat4.create()

  var worker = this.worker = new Worker('./simulator-worker.js');
  worker.emit = function(type, data) {
    worker.postMessage({
      type: type,
      data: data
    });
  };

  worker.transfer = function(type, ab, obj) {
    obj = obj || {};
    obj.type = type;
    obj.arrayBuffer = ab;

    worker.postMessage(obj, [ab]);
  };

  var sim = this;

  worker.onmessage = function(e) {
    if (e.data.type === 'toolpath') {
      var data = e.data;

      var x = data.x;
      var y = data.y;

      sim.depthTexture.setPixels(
        ndarray(
          new Float32Array(e.data.arrayBuffer),
          [data.width, data.height]
        ),
        x, y
      );
    }
  }
}

GcodeRaymarchSimulator.prototype.init = function(gl) {
  this._gl = gl;

  this.raymarchProgram = createShader(
    gl,
    fragmentShader,
    vertexShader
  );

  this._eye = [
    0,
    0,
    3
  ];

  this._camera = createCamera(
    this._eye.concat(),
    [0.25, 0.25, 0.125],
    [0, 1, 0]
  );

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

  this.depthTexture.bind();
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

  this.raymarchProgram.uniforms.cutterPosition = this._cutterPosition;
  this.raymarchProgram.uniforms.cutterRadius = this._cutterRadius;
  this.raymarchProgram.uniforms.stockDimensions = this._stockDimensions;
  this.raymarchProgram.uniforms.stockPosition = this._stockPosition;
  this.raymarchProgram.uniforms.stockTop = this._stockTop;
  this.raymarchProgram.uniforms.eye = this._eye;
  this.raymarchProgram.uniforms.uvmatrix = this._uvmatrix;
  this.raymarchProgram.uniforms.invMVP = this._invMVP;

  gl.drawArrays(gl.TRIANGLES, 0, 6);
};


GcodeRaymarchSimulator.prototype.moveTool = function(x, y, z) {

  var sy = this.scaleValue(x);
  var sx = this.scaleValue(y);
  var sz = this.scaleValue(z);

  var stockDimensions = this._stockDimensions;

  this._cutterPosition = [sx, sy, sz].map(function(a, i) {
    return a - stockDimensions[i]/2;
  });

  var time = Date.now()/1000;

  var ctime = Math.cos(time)/2;
  var stime = Math.sin(time)/2;


  this._physicalCutterPosition = [y, x, z];

  this._cutterPosition[2] = this._v + (-sz);

  if (z > 0) {
    return;
  }

  var r = this._cutterRadius / this._ratio;
  var rx = Math.round(sy * 2048);
  var ry = Math.round(sx * 2048);
  var rz = Math.round(sz * 2048);

  this.worker.emit('move', [rx, ry, this._v + (-sz)]);
};

GcodeRaymarchSimulator.prototype.tool = function(ndarray) {
  this._tool = ndarray;

  this.worker.transfer('tool', ndarray.data.buffer, {
    width : ndarray.shape[0],
    height : ndarray.shape[1]
  });
};

GcodeRaymarchSimulator.prototype.scale = function(units) {
  this._scale = units;
  return this._scale;
};

GcodeRaymarchSimulator.prototype.stockDimensions = function(x, y, z) {
  var scale = this._scale;
  this._physicalStockDimensions = [y, x, z];

  this._stockDimensions = this._physicalStockDimensions.map(function(a) {
    return a/scale;
  });

  this._stockPosition = this._stockDimensions.map(function(a) {
    return a/2;
  });

  this._stockTop = this._stockDimensions[2] + this._stockPosition[2];
  this._v = this._stockPosition[2] - this._cutterRadius;
  return [x, y, z];
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
