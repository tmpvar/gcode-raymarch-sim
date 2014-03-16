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
// console.log(this.depthArray);
//   ndfill(this.depthArray.hi(1024, 1024).lo(0, 0), function(i, j) {
//     return 1;
//   });

//   ndfill(this.depthArray.hi(2048, 2048).lo(1024, 1024), function(i, j) {
//     return 1;
//   });


  // ndfill(this.depthArray.lo(0, 0).hi(512, 512), function(i, j) {
  //   return 1;
  // });
  ndfill(this.depthArray.lo(1024-128, 1024-128).hi(1024, 1024), function(i, j) {
    return 1;
  });

  this.depthTexture = createTexture(gl, this.depthArray);
console.log(this.depthTexture);
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

  var time = this.raymarchProgram.uniforms.time = (Date.now() - start)/1000;

  var ctime = Math.cos(time);
  var stime = Math.sin(time);

  this.raymarchProgram.uniforms.cutterPosition = [
    stime/2, 0.2, ctime/2
  ];

  var areax = (Math.floor(ctime*1022) + 1024);
  var areay = (Math.floor(stime*1022) + 1024);

  //console.log(areax-1, areay-1, areax+1, areay+1);
  // this.depthArray.set(areax-2, areay-2, 1);
  // this.depthArray.set(areax-1, areay-1, 1);
  // this.depthArray.set(areax, areay, 1);
  // this.depthArray.set(areax+1, areay+1, 1);
  // this.depthArray.set(areax+2, areay+2, 1);
  var r = 40;
  ndfill(this.depthArray.hi(areax+r, areay+r).lo(areax-r, areay-r), function(i, j) {
    return .1;
  });

  this.depthTexture.setPixels(this.depthArray);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

shell.on('gl-render', render);


