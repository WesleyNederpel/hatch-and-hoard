(function (HH) {
  'use strict';
  // Polyline path helper. build(waypoints) -> { length, pointAt(d), distTo(x,y), samples(step) }
  HH.sim.path = {
    build: function (waypoints) {
      var pts = waypoints.map(function (p) { return { x: p[0], y: p[1] }; });
      var segs = [], total = 0, i;
      for (i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
        segs.push({ ax: a.x, ay: a.y, dx: dx, dy: dy, len: len, start: total, angle: Math.atan2(dy, dx) });
        total += len;
      }
      function pointAt(d) {
        if (!segs.length) return { x: pts.length ? pts[0].x : 0, y: pts.length ? pts[0].y : 0, angle: 0 };
        if (d < 0) d = 0;
        if (d > total) d = total;
        var lo = 0, hi = segs.length - 1;
        while (lo < hi) { // binary search for the segment containing d
          var mid = (lo + hi + 1) >> 1;
          if (segs[mid].start <= d) lo = mid; else hi = mid - 1;
        }
        var s = segs[lo], t = s.len > 0 ? (d - s.start) / s.len : 0;
        if (t > 1) t = 1;
        return { x: s.ax + s.dx * t, y: s.ay + s.dy * t, angle: s.angle };
      }
      function distTo(x, y) {
        var best = Infinity;
        if (!segs.length) return pts.length ? Math.hypot(x - pts[0].x, y - pts[0].y) : 1e9;
        for (var k = 0; k < segs.length; k++) {
          var s = segs[k], t = 0;
          if (s.len > 0) {
            t = ((x - s.ax) * s.dx + (y - s.ay) * s.dy) / (s.len * s.len);
            if (t < 0) t = 0; else if (t > 1) t = 1;
          }
          var px = s.ax + s.dx * t - x, py = s.ay + s.dy * t - y, d2 = px * px + py * py;
          if (d2 < best) best = d2;
        }
        return Math.sqrt(best);
      }
      function samples(step) {
        var out = [];
        if (!(step > 0)) step = 10;
        for (var d = 0; d < total; d += step) { var p = pointAt(d); out.push({ x: p.x, y: p.y, d: d }); }
        var e = pointAt(total); out.push({ x: e.x, y: e.y, d: total });
        return out;
      }
      return { length: total, pointAt: pointAt, distTo: distTo, samples: samples };
    }
  };
})(globalThis.HH);
