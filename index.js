var glslify = require('glslify');
var shell = require('gl-now')();
var ndarray = require('ndarray');
var ndfill = require('ndarray-fill');
var createTexture = require('gl-texture2d');

var createRaymarchProgram = glslify({
  vertex: './shaders/raymarch.vert',
  fragment: './shaders/raymarch.frag'
});

var uniforms = {
  time : 0,
  mouse : [0, 0],
  resolution: [0, 0]
};

shell.on('gl-init', function() {
  var gl = this.gl;

  this.raymarchProgram = createRaymarchProgram(this.gl);
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

  ndfill(this.depthArray.lo(0, 0).hi(2048, 2048), function(i, j) {
    return 0.05;
  });

  this.depthTexture = createTexture(gl, this.depthArray);

  this.depthTexture.bind('depth');
});

var elapsed = 0;
var start = Date.now(), first = false;
var render = function(t) {
  var gl = this.gl;

  this.raymarchProgram.uniforms.resolution = [
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  ];

  this.raymarchProgram.uniforms.time = (Date.now() - start)/1000;

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

shell.on('gl-render', render);


