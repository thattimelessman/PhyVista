import React, { useRef, useEffect, useState, useCallback } from 'react';

export default function PathCanvas({ theme, pathPoints, heading, isRunning }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const isVista = theme === 'vista';

  const getPlotConfig = (W, H) => {
    const paddingLeft   = 45;
    const paddingRight  = 10;
    const paddingTop    = 10;
    const paddingBottom = 50;
    return {
      paddingLeft, paddingRight, paddingTop, paddingBottom,
      plotW: W - paddingLeft - paddingRight,
      plotH: H - paddingTop  - paddingBottom,
    };
  };

  const getBounds = (pts) => {
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 10;
    const rangeY = maxY - minY || 10;
    const m = 0.18;
    return {
      dataMinX: minX - rangeX * m,
      dataMaxX: maxX + rangeX * m,
      dataMinY: minY - rangeY * m,
      dataMaxY: maxY + rangeY * m,
      dataRangeX: (maxX + rangeX * m) - (minX - rangeX * m),
      dataRangeY: (maxY + rangeY * m) - (minY - rangeY * m),
    };
  };

  // hoverState = { nearest: {x,y} } or null
  const draw = useCallback((hoverState = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width, H = rect.height;
    const { paddingLeft, paddingTop, paddingBottom, plotW, plotH } = getPlotConfig(W, H);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Style constants — matched to Recharts props in AnalysisTab
    const GRID_STROKE = '#999999';
    const AXIS_STROKE = '#000000';
    const TICK_FONT   = '11px sans-serif';
    const TICK_COLOR  = '#666666';
    const PATH_COLOR  = isVista ? '#2563eb' : '#000000';

    const hasPts = pathPoints && pathPoints.length >= 2;
    const bounds = hasPts
      ? getBounds(pathPoints)
      : { dataMinX: -5, dataMaxX: 5, dataMinY: -5, dataMaxY: 5, dataRangeX: 10, dataRangeY: 10 };
    const { dataMinX, dataMaxX, dataMinY, dataMaxY, dataRangeX, dataRangeY } = bounds;

    const toCanvas = (x, y) => ({
      cx: paddingLeft + ((x - dataMinX) / dataRangeX) * plotW,
      cy: paddingTop  + (1 - (y - dataMinY) / dataRangeY) * plotH,
    });

    // ── Grid ────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = GRID_STROKE;
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i <= 5; i++) {
      const xPx = paddingLeft + (i / 5) * plotW;
      ctx.beginPath(); ctx.moveTo(xPx, paddingTop); ctx.lineTo(xPx, paddingTop + plotH); ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const yPx = paddingTop + (i / 5) * plotH;
      ctx.beginPath(); ctx.moveTo(paddingLeft, yPx); ctx.lineTo(paddingLeft + plotW, yPx); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // ── Axes ─────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = AXIS_STROKE;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop + plotH);
    ctx.lineTo(paddingLeft + plotW, paddingTop + plotH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + plotH);
    ctx.stroke();
    ctx.restore();

    // ── Tick labels ──────────────────────────────────────────────
    ctx.save();
    ctx.font      = TICK_FONT;
    ctx.fillStyle = TICK_COLOR;

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 5; i++) {
      const frac = i / 5;
      const xPx  = paddingLeft + frac * plotW;
      const val  = dataMinX + frac * dataRangeX;
      ctx.fillText(val.toFixed(1), xPx, paddingTop + plotH + 5);
    }

    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const frac = i / 5;
      const yPx  = paddingTop + frac * plotH;
      const val  = dataMaxY - frac * dataRangeY;
      ctx.fillText(val.toFixed(1), paddingLeft - 4, yPx);
    }
    ctx.restore();

    // ── Empty state ──────────────────────────────────────────────
    if (!hasPts) {
      ctx.fillStyle    = '#9ca3af';
      ctx.font         = '11px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Path will appear here once simulation runs', paddingLeft + plotW / 2, paddingTop + plotH / 2);
      drawLegend(ctx, W, H, paddingLeft, paddingTop, plotW, plotH, isVista);
      return;
    }

    // ── Path line ────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = PATH_COLOR;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.beginPath();
    pathPoints.forEach((p, i) => {
      const { cx, cy } = toCanvas(p.x, p.y);
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.restore();

    // ── Start dot ───────────────────────────────────────────────
    const sp = toCanvas(pathPoints[0].x, pathPoints[0].y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(sp.cx, sp.cy, 5, 0, Math.PI * 2);
    ctx.fillStyle   = '#16a34a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── Vehicle arrow ────────────────────────────────────────────
    const last  = pathPoints[pathPoints.length - 1];
    const prev  = pathPoints[Math.max(0, pathPoints.length - 4)];
    const ep    = toCanvas(last.x, last.y);
    const pp    = toCanvas(prev.x, prev.y);
    const angle = Math.atan2(ep.cy - pp.cy, ep.cx - pp.cx) + Math.PI / 2;
    const arrowColor = isRunning ? '#dc2626' : '#f97316';
    ctx.save();
    ctx.translate(ep.cx, ep.cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(7, 7); ctx.lineTo(0, 3); ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fillStyle   = arrowColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.restore();

    // ── Hover overlay: vertical line + active dot ────────────────
    // Matches exactly what Recharts renders on hover
    if (hoverState && hoverState.nearest) {
      const np = toCanvas(hoverState.nearest.x, hoverState.nearest.y);

      // Vertical cursor line (Recharts uses a thin light grey line)
      ctx.save();
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(np.cx, paddingTop);
      ctx.lineTo(np.cx, paddingTop + plotH);
      ctx.stroke();
      ctx.restore();

      // Active dot — Recharts default: r=4, filled with line color, white stroke r=2
      ctx.save();
      ctx.beginPath();
      ctx.arc(np.cx, np.cy, 4, 0, Math.PI * 2);
      ctx.fillStyle   = PATH_COLOR;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.restore();
    }

    // ── Legend ───────────────────────────────────────────────────
    drawLegend(ctx, W, H, paddingLeft, paddingTop, plotW, plotH, isVista);

  }, [pathPoints, heading, theme, isRunning]);

  // Legend — bottom-center, matching Recharts legendProps layout
  function drawLegend(ctx, W, H, paddingLeft, paddingTop, plotW, plotH, isVista) {
    const items = [
      { color: isVista ? '#2563eb' : '#000000', label: 'Path',    type: 'line'  },
      { color: '#16a34a',                        label: 'Start',   type: 'dot'   },
      { color: '#dc2626',                        label: 'Vehicle', type: 'arrow' },
    ];
    const itemW  = 68;
    const total  = items.length * itemW;
    let startX   = paddingLeft + (plotW - total) / 2;
    const y      = paddingTop + plotH + 38; // well below x-axis ticks, clear separation

    ctx.save();
    ctx.font         = '11px sans-serif';
    ctx.textBaseline = 'middle';

    items.forEach((item) => {
      const iconCX = startX + 8;

      if (item.type === 'line') {
        ctx.strokeStyle = item.color;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + 16, y);
        ctx.stroke();
      } else if (item.type === 'dot') {
        ctx.beginPath();
        ctx.arc(iconCX, y, 4, 0, Math.PI * 2);
        ctx.fillStyle   = item.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 1;
        ctx.stroke();
      } else if (item.type === 'arrow') {
        ctx.save();
        ctx.translate(iconCX, y);
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(4, 4); ctx.lineTo(0, 1); ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#666666';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, startX + 20, y);
      startX += itemW;
    });

    ctx.restore();
  }

  // Mouse move — replicates Recharts hover: find nearest point, draw overlay, show tooltip
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !pathPoints || pathPoints.length < 2) {
      setTooltip(null);
      draw(null);
      return;
    }

    const rect   = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const W = rect.width, H = rect.height;
    const { paddingLeft, paddingTop, plotW, plotH } = getPlotConfig(W, H);

    if (mouseX < paddingLeft || mouseX > paddingLeft + plotW ||
        mouseY < paddingTop  || mouseY > paddingTop  + plotH) {
      setTooltip(null);
      draw(null);
      return;
    }

    const bounds = getBounds(pathPoints);
    const { dataMinX, dataRangeX, dataMinY, dataRangeY, dataMaxY } = bounds;

    const dataX = dataMinX + ((mouseX - paddingLeft) / plotW) * dataRangeX;
    const dataY = dataMaxY - ((mouseY - paddingTop)  / plotH) * dataRangeY;

    let nearest = null, minDist = Infinity;
    pathPoints.forEach(p => {
      const d = Math.hypot(p.x - dataX, p.y - dataY);
      if (d < minDist) { minDist = d; nearest = p; }
    });

    if (!nearest || minDist > dataRangeX * 0.15) {
      setTooltip(null);
      draw(null);
      return;
    }

    // Canvas coords of nearest point for tooltip anchor
    const npCx = paddingLeft + ((nearest.x - dataMinX) / dataRangeX) * plotW;
    const npCy = paddingTop  + (1 - (nearest.y - dataMinY) / dataRangeY) * plotH;

    draw({ nearest });

    setTooltip({
      x: npCx,
      y: npCy,
      px: nearest.x.toFixed(2),
      py: nearest.y.toFixed(2),
    });
  }, [pathPoints, draw]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    draw(null);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => draw(null));
    observer.observe(canvas);
    draw(null);
    return () => observer.disconnect();
  }, [draw]);

  // Flip tooltip if near edges
  const getTooltipPos = () => {
    if (!tooltip || !canvasRef.current) return {};
    const rect  = canvasRef.current.getBoundingClientRect();
    const flipX = tooltip.x + 130 > rect.width;
    const flipY = tooltip.y - 10  < 0;
    return {
      left: flipX ? tooltip.x - 118 : tooltip.x + 14,
      top:  flipY ? tooltip.y + 8   : tooltip.y - 10,
    };
  };

  return (
    <div className="relative w-full" style={{ height: '280px' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display:   'block',
          width:     '100%',
          height:    '100%',
          cursor:    pathPoints && pathPoints.length >= 2 ? 'crosshair' : 'default',
          border:    theme === 'vista' ? '1px solid #d1d5db' : '1px solid #e5e7eb',
          boxSizing: 'border-box',
        }}
      />

      {/* Tooltip — exactly matches AnalysisTab tooltipProps */}
      {tooltip && (
        <div style={{
          position:        'absolute',
          ...getTooltipPos(),
          pointerEvents:   'none',
          zIndex:          20,
          backgroundColor: '#f5f5f5',
          border:          '2px solid #666',
          fontSize:        '11px',
          fontFamily:      'sans-serif',
          padding:         '4px 8px',
          lineHeight:      '1.7',
          minWidth:        '90px',
          whiteSpace:      'nowrap',
        }}>
          <div style={{ color: '#333', marginBottom: '1px', fontWeight: 600 }}>Position</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ color: '#555' }}>X (m)</span>
            <span style={{ color: isVista ? '#2563eb' : '#000', fontWeight: 600 }}>{tooltip.px}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ color: '#555' }}>Y (m)</span>
            <span style={{ color: isVista ? '#2563eb' : '#000', fontWeight: 600 }}>{tooltip.py}</span>
          </div>
        </div>
      )}
    </div>
  );
}