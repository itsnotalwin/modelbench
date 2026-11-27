/* ============================================================
   Vectra Studio — starter artwork ("Harbor morning")
   ============================================================ */
'use strict';
(() => {
  const S = App.S;
  const mk = (type, geo, style, name) => S.create(type, { geo, style, name });
  const noStroke = { stroke: 'none' };

  function wing(x, y, w, name) {
    // a small stroked quadratic-looking curve: two anchors with symmetric controls
    return mk('path', {
      anchors: [
        { x, y, in: null, out: [w * 0.24, -w * 0.34], smooth: true },
        { x: x + w, y, in: [-w * 0.24, -w * 0.34], out: null, smooth: true }
      ],
      closed: false
    }, { fill: 'none', stroke: '#3f4b5b', strokeWidth: 3, dash: '', opacity: 1 }, name);
  }

  function doc() {
    const shapes = [];

    shapes.push(mk('rect', { x: 0, y: 0, w: 1080, h: 480 },
      Object.assign({ fill: '#f7e9cf' }, noStroke), 'Sky'));

    shapes.push(mk('ellipse', { cx: 830, cy: 150, rx: 104, ry: 104 },
      Object.assign({ fill: '#f2b23e', opacity: 0.22 }, noStroke), 'Sun glow'));
    shapes.push(mk('ellipse', { cx: 830, cy: 150, rx: 64, ry: 64 },
      Object.assign({ fill: '#f2b23e' }, noStroke), 'Sun'));

    const cloud1 = S.create('group', { name: 'Cloud' });
    cloud1.children = [
      mk('ellipse', { cx: 180, cy: 122, rx: 64, ry: 26 }, Object.assign({ fill: '#ffffff', opacity: 0.92 }, noStroke), 'Puff'),
      mk('ellipse', { cx: 244, cy: 108, rx: 50, ry: 22 }, Object.assign({ fill: '#ffffff', opacity: 0.92 }, noStroke), 'Puff'),
      mk('ellipse', { cx: 128, cy: 110, rx: 38, ry: 18 }, Object.assign({ fill: '#ffffff', opacity: 0.92 }, noStroke), 'Puff')
    ];
    shapes.push(cloud1);

    const cloud2 = S.create('group', { name: 'Cloud 2' });
    cloud2.children = [
      mk('ellipse', { cx: 610, cy: 92, rx: 48, ry: 19 }, Object.assign({ fill: '#ffffff', opacity: 0.85 }, noStroke), 'Puff'),
      mk('ellipse', { cx: 658, cy: 82, rx: 34, ry: 15 }, Object.assign({ fill: '#ffffff', opacity: 0.85 }, noStroke), 'Puff')
    ];
    shapes.push(cloud2);

    shapes.push(wing(486, 148, 34, 'Bird wing'));
    shapes.push(wing(528, 148, 34, 'Bird wing'));
    shapes.push(wing(392, 106, 26, 'Bird wing'));
    shapes.push(wing(425, 106, 26, 'Bird wing'));

    shapes.push(mk('polygon', {
      pts: [{ x: 0, y: 480 }, { x: 150, y: 300 }, { x: 320, y: 432 }, { x: 430, y: 358 }, { x: 560, y: 480 }],
      sides: 5
    }, Object.assign({ fill: '#b7c3d4' }, noStroke), 'Mountains (far)'));

    shapes.push(mk('polygon', {
      pts: [{ x: 240, y: 480 }, { x: 480, y: 252 }, { x: 740, y: 480 }],
      sides: 3
    }, Object.assign({ fill: '#8ba0b6' }, noStroke), 'Mountain'));

    shapes.push(mk('rect', { x: 0, y: 480, w: 1080, h: 240 },
      Object.assign({ fill: '#6ea6c4' }, noStroke), 'Sea'));

    const wave = (x, y, name) => mk('path', {
      anchors: [
        { x, y, in: null, out: [27, -9], smooth: true },
        { x: x + 120, y, in: [-27, 9], out: [27, -9], smooth: true },
        { x: x + 240, y, in: [-27, 9], out: null, smooth: false }
      ],
      closed: false
    }, { fill: 'none', stroke: '#4f83a3', strokeWidth: 3, dash: '', opacity: 1 }, name);
    shapes.push(wave(90, 545, 'Wave'));
    shapes.push(wave(600, 612, 'Wave'));
    shapes.push(wave(300, 664, 'Wave'));

    const boat = S.create('group', { name: 'Sailboat' });
    boat.children = [
      mk('polygon', { pts: [{ x: 762, y: 458 }, { x: 762, y: 545 }, { x: 686, y: 545 }], sides: 3 },
        Object.assign({ fill: '#f4f7fa' }, noStroke), 'Sail (left)'),
      mk('polygon', { pts: [{ x: 772, y: 472 }, { x: 772, y: 545 }, { x: 832, y: 545 }], sides: 3 },
        Object.assign({ fill: '#dde6ee' }, noStroke), 'Sail (right)'),
      mk('line', { x1: 766, y1: 548, x2: 766, y2: 452, fill: 'none' },
        { stroke: '#3e4c59', strokeWidth: 5 }, 'Mast'),
      mk('polygon', { pts: [{ x: 688, y: 553 }, { x: 836, y: 553 }, { x: 804, y: 600 }, { x: 722, y: 600 }], sides: 4 },
        Object.assign({ fill: '#3e4c59' }, noStroke), 'Hull')
    ];
    shapes.push(boat);

    return { title: 'Harbor morning', w: 1080, h: 720, bg: '#ffffff', shapes };
  }

  App.SAMPLE = { doc };
})();
