var glslify = require('glslify');
var shell = require('gl-now')();

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

  this.buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  //   - 1.0, - 1.0, 1.0,
  //   - 1.0, - 1.0, 1.0,
  //   1.0, - 1.0, 1.0,
  //   1.0, - 1.0, 1.0
  // ]), gl.STATIC_DRAW);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    1, 1, 0,
    -1, 1, 0,
    -1, -1, 0,
    1, 1, 0,
    1, -1, 0,
    -1, -1, 0
  ]), gl.STATIC_DRAW)


  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
  this.raymarchProgram.attributes.position.pointer();

  gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

  this.raymarchProgram.bind();

});

var elapsed = 0;
var start = Date.now(), first = false;
var render = function(t) {
  var gl = this.gl;

  this.raymarchProgram.uniforms.resolution = [
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  ];

  this.raymarchProgram.uniforms.time = (Date.now() - start)/100;


  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

shell.on('gl-render', render);


