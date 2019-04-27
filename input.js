var mouse = module.exports.mouse = {
  down: false,
  pos: [0, 0],
  downPos: [0, 0],
  lastDownPos: [0, 0],
  lastZoom: 0,
  zoom: 0,
  far: [0, 0, 0],
  pick: [0, 0]
};

var keyboard = module.exports.keyboard = {}

module.exports.tick = function() {
  mouse.lastZoom = mouse.zoom;
  mouse.lastDownPos[0] = mouse.downPos[0];
  mouse.lastDownPos[1] = mouse.downPos[1];
}

function handleInput(e, dirtyCallback) {
  var x = e.clientX;
  var y = e.clientY;

  switch (e.type) {
    case 'mousedown':
      mouse.down = true;
      mouse.downPos[0] = x;
      mouse.downPos[1] = y;
      mouse.lastDownPos[0] = x;
      mouse.lastDownPos[1] = y;
    break;

    case 'mouseup':
      mouse.down = false;
      mouse.downPos[0] = 0;
      mouse.downPos[1] = 0;
      mouse.lastDownPos[0] = 0;
      mouse.lastDownPos[1] = 0;
    break;

    case 'mousemove':
      if (mouse.down) {
        mouse.lastDownPos[0] = mouse.downPos[0]
        mouse.lastDownPos[1] = mouse.downPos[1]
        mouse.downPos[0] = x;
        mouse.downPos[1] = y;
      }

      mouse.pos[0] = x;
      mouse.pos[1] = y;
    break;

    case 'mousewheel':
      mouse.lastZoom = mouse.zoom;
      mouse.zoom += e.wheelDeltaY;

      e.preventDefault();
    break;

    case 'keyup':
      keyboard[e.keyCode] = false
    break;

    case 'keydown' :
      keyboard[e.keyCode] = true
    break;
  }
}

['mousedown', 'mouseup', 'mousemove', 'mousewheel', 'keydown', 'keyup'].forEach(function(name) {
  document.addEventListener(name, handleInput, {passive: false});
});
