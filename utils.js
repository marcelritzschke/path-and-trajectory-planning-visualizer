// eslint-disable-next-line no-unused-vars
const Utils = {
  transformObjectToUsk(ego, object) {
    const x = object.x;
    const y = object.y;
    const theta = ego.angle * Math.PI / 180 - 90 * Math.PI / 180;

    let newX = x - ego.left;
    let newY = y - ego.top;
    newY *= -1;

    const res = this.rotatePoint(newX, newY, theta);
    newX = res[0];
    newY = res[1];

    object.x = newX;
    object.y = newY;
    object.angle = (object.angle - ego.angle) * Math.PI / 180;

    return object;
  },

  getStateInGlobalSystem(ego, state) {
    const x = state.x;
    const y = -state.y;
    const theta = ego.angle * Math.PI / 180 - 90 * Math.PI / 180;

    const res = this.rotatePoint(x, y, theta);
    let newX = res[0];
    let newY = res[1];

    newX += ego.x;
    newY += ego.y;

    state.x = newX;
    state.y = newY;
    state.theta = (ego.angle - state.theta / Math.PI * 180);

    return state;
  },

  rotatePoint(x, y, angle) {
    const buf = x;
    const newX = Math.cos(angle) * buf - Math.sin(angle) * y;
    const newY = Math.sin(angle) * buf + Math.cos(angle) * y;

    return [newX, newY];
  },

  updateDiagonalsRectangle(rect) {
    // TODO: figure out, maybe use scale ?
    const xBuf = rect.left;
    const yBuf = rect.top;
    console.log(rect);
    console.log(rect.item(0));
    const newRect = new fabric.Rect({
      left: rect.item(0).left,
      top: rect.item(0).top,
      width: rect.width * rect.scaleX,
      height: rect.height * rect.scaleY,
      angle: rect.angle,
      fill: '',
      originX: 'center',
      originY: 'center',
      stroke: 'black',
      strokeWidth: 2,
    });

    const newGroup = this.fillRectangleWithDiagonals(newRect);
    rect.forEachObject((obj) => {
      rect.remove(obj);
    });
    newGroup.forEachObject((obj) => {
      rect.addWithUpdate(obj);
    });
    rect.left = xBuf;
    rect.top = yBuf;
  },

  fillRectangleWithDiagonals(rect, gap = 10) {
    const width = rect.width * rect.scaleX;
    const height = rect.height * rect.scaleY;

    const group = new fabric.Group([rect], {
      left: rect.left,
      top: rect.top,
      originX: 'center',
      originY: 'center',
    });

    const lengthToGo = (width + height)/ Math.sin(45 * Math.PI / 180);
    for (let i=0; i<lengthToGo/ gap; i++) {
      const dist = i * gap * Math.sin(45 * Math.PI / 180);

      let startX;
      if (dist < width) {
        startX = dist;
      } else {
        startX = width;
      }
      let startY;
      if (dist < width) {
        startY = 0;
      } else if (dist > width + height) {
        startY = height;
      } else {
        startY = dist - width;
      }

      let endX;
      if (dist < height) {
        endX = 0;
      } else if (dist > width + height) {
        endX = width;
      } else {
        endX = dist - height;
      }
      let endY;
      if (dist < height) {
        endY = dist;
      } else {
        endY = height;
      }

      const start = this.rotatePoint(startX - width/ 2, startY - height / 2,
          rect.angle * Math.PI/ 180);
      const end = this.rotatePoint(endX - width / 2, endY - height/ 2,
          rect.angle * Math.PI/ 180);

      const line = new fabric.Line([
        start[0] + group.left,
        start[1] + group.top,
        end[0] + group.left,
        end[1] + group.top],
      {type: 'line', stroke: 'black'});
      group.addWithUpdate(line);
    }

    return group;
  },

  convertToPixels(scale, object) {
    object.x *= scale;
    object.y *= scale;

    if (Reflect.has(object, 'width')) {
      object.width *= scale;
    }
    if (Reflect.has(object, 'height')) {
      object.height *= scale;
    }

    return object;
  },

  convertToMetric(scale, object) {
    object.x /= scale;
    object.y /= scale;

    if (Reflect.has(object, 'width')) {
      object.width /= scale;
    }
    if (Reflect.has(object, 'height')) {
      object.height /= scale;
    }

    return object;
  },
};