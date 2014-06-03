var ndarray = require('ndarray');
var cwise = require('cwise');
var tool;
var toolDimensions;

var transfer = function(type, ab, obj) {
  obj = obj || {};
  obj.type = type;
  obj.arrayBuffer = ab;
  self.postMessage(obj, [ab]);
};

var applyTool = cwise({
  args : ['array', 'array', 'array', 'scalar'],
  body: function(imprint, tool, history, z) {
    var computed = tool + z;
    if (computed < history || !tool) {
      computed = history;
    } else {
      history = computed;
    }
    imprint = computed;
  }
});


var square = 2048;

var depthArray = ndarray(
  new Float32Array(square*square),
  [square, square]
);

var handlers = {
  tool : function(data) {
    toolDimensions = {
      width: data.width,
      height: data.height
    };

    tool = ndarray(
      new Float32Array(data.arrayBuffer),
      [data.width, data.height]
    );
  },

  move : function(data) {
    var pos = data.data;

    var d = toolDimensions.width;
    var r = d/2;

    var z = pos[2];

    var max = Math.max;
    var min = Math.min;

    var ad = d;

    var toolSliceMinX = 0;
    var toolSliceMaxX = d;
    var toolSliceMinY = 0;
    var toolSliceMaxY = d;

    var hrx = pos[0]+r;
    if (hrx > 2048) {
      toolSliceMaxX = r-(hrx-2048)
    }

    var hry = pos[1]+r;
    if (hry > 2048) {
      toolSliceMaxY = r-(hry-2048)
    }

    var lrx = pos[0]-r;
    if (lrx < 0) {
      toolSliceMinX = max(r+lrx, 0);
    }

    var lry = pos[1]-r;
    if (lry < 0) {
      toolSliceMinY = max(r+lry, 0);
    }

    var toolSlice = tool.hi(
      toolSliceMaxX,
      toolSliceMaxY
    ).lo(
      toolSliceMinX,
      toolSliceMinY
    );

    var lda = depthArray.hi(
      pos[0] + r,
      pos[1] + r
    ).lo(
      pos[0] - r,
      pos[1] - r
    );

    var dx = toolSliceMaxX - toolSliceMinX;
    var dy = toolSliceMaxY - toolSliceMinY;

    var imprint = ndarray(new Float32Array(dx * dy), [dx, dy]);

    applyTool(imprint, toolSlice, lda, z);

    transfer('toolpath', imprint.data.buffer, {
      width: dx,
      height: dy,
      y: pos[0] - toolSliceMinX,
      x: pos[1] - toolSliceMinY
    });

    // TODO: move from old point to incoming
    // TODO: collect volume removed
  }
};

self.onmessage = function(e) {
  if (e.data.type && handlers[e.data.type]) {
    handlers[e.data.type](e.data);
  } else {
    self.postMessage({
      type : 'log',
      message: 'unhandled ' + Object.keys(e.data).join(',')
    });
  }
}
