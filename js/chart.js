/* The charting engine. Every chart in the programme comes out of this file, so
   students meet one set of axes rather than five.

   Two rules shape the whole thing:

   1. Charts are built as self-contained SVG with presentation attributes, never
      styled from site.css. An SVG loaded into a canvas for export is rendered in
      isolation - no stylesheet, no webfont - so anything the export needs has to
      be on the element itself. The chart font is therefore a system stack.
   2. Nothing about a chart is interactive here. Handles, dragging and readouts
      belong to the tool; this file draws what it is told and hands back the
      scales so the tool can map a pointer to a data value. */

export const SVG_NS = 'http://www.w3.org/2000/svg';

/* System faces only. A webfont would silently fall back inside the export. */
const CHART_FONT = "'Segoe UI', Carlito, Arial, sans-serif";

const INK = '#06232B';
const PEN = '#1D3F8F';
const RULE = '#B7C8C4';
const GRID = '#D8E2DF';
const SAGE = '#4A6A70';
const PAPER = '#FFFFFF';

/* Slide exports must clear 28px type at 1920 wide, so the slide renderer builds
   its own chart at these sizes rather than scaling the screen one up. */
export const SCREEN_FONTS = { label: 13, title: 14 };
export const SLIDE_FONTS = { label: 30, title: 34 };

export function svgEl(name, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  if (text !== undefined) node.textContent = String(text);
  return node;
}

/* ---- scales -------------------------------------------------------------- */

function niceNum(range, round) {
  const exponent = Math.floor(Math.log10(range || 1));
  const fraction = range / Math.pow(10, exponent);
  let nice;
  if (round) {
    if (fraction < 1.5) nice = 1;
    else if (fraction < 3) nice = 2;
    else if (fraction < 7) nice = 5;
    else nice = 10;
  } else if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exponent);
}

/* Round limits outwards to human numbers, so the girls read 0, 20, 40 rather
   than 0, 17.3, 34.6. */
export function niceScale(min, max, { startAtZero = false, targetTicks = 6 } = {}) {
  let lo = startAtZero ? Math.min(0, min) : min;
  let hi = max;

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, step: 0.5, ticks: [0, 0.5, 1] };
  if (lo === hi) { lo -= 0.5; hi += 0.5; }

  const step = niceNum((hi - lo) / Math.max(2, targetTicks - 1), true);
  const niceMin = Math.floor(lo / step) * step;
  const niceMax = Math.ceil(hi / step) * step;

  const ticks = [];
  /* Accumulating with += drifts on values like 0.1; multiplying does not. */
  const count = Math.round((niceMax - niceMin) / step);
  for (let i = 0; i <= count; i += 1) ticks.push(Number((niceMin + i * step).toPrecision(12)));

  return { min: niceMin, max: niceMax, step, ticks };
}

export function makeScale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1;
  return {
    domainMin,
    domainMax,
    to: (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin),
    from: (px) => domainMin + ((px - rangeMin) / (rangeMax - rangeMin)) * span
  };
}

export function tickLabel(value, step) {
  const decimals = step < 1 ? Math.min(4, Math.ceil(-Math.log10(step))) : 0;
  return value.toFixed(decimals);
}

/* ---- the chart ----------------------------------------------------------- */

function axisTitle(label, unit) {
  const text = String(label ?? '').trim();
  const units = String(unit ?? '').trim();
  if (!text) return '';
  return units ? `${text} (${units})` : text;
}

export function renderChart(spec) {
  const {
    width = 640,
    height = 430,
    points = [],
    xLabel = '',
    xUnit = '',
    yLabel = '',
    yUnit = '',
    title = '',
    axis = {},
    fit = null,
    dataRange = null,
    prediction = null,
    fonts = SCREEN_FONTS,
    showHandles = false,
    background = PAPER
  } = spec;

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);

  /* The default limits are the data's own, not the data plus zero. Folding zero
     in here would make the "start at zero" toggle inert for positive data and
     take the axis-scaling drill in Lesson 4 with it. Zero is pulled in by
     niceScale, and only when asked. */
  const hasPoints = points.length > 0;
  const startAtZero = axis.startAtZero ?? false;

  /* The prediction is folded into the domain so the axis stretches to reach it.
     Ask for 2040 and the chart has to show you how far past your evidence that
     is; leaving the marker off the edge would hide exactly the thing Lesson 5
     is about. */
  const predicting = prediction && Number.isFinite(prediction.x) && Number.isFinite(prediction.y);
  const xsAll = predicting ? [...xs, prediction.x] : xs;
  const ysAll = predicting ? [...ys, prediction.y] : ys;
  const spread = xsAll.length > 0;

  const xNice = niceScale(
    axis.xMin ?? (spread ? Math.min(...xsAll) : 0),
    axis.xMax ?? (spread ? Math.max(...xsAll) : 1),
    { startAtZero }
  );
  const yNice = niceScale(
    axis.yMin ?? (spread ? Math.min(...ysAll) : 0),
    axis.yMax ?? (spread ? Math.max(...ysAll) : 1),
    { startAtZero }
  );

  /* Margins are driven by type size so the slide render does not clip its own
     much larger axis titles. */
  const pad = fonts.label;
  const margin = {
    top: title ? fonts.title * 2.4 : pad * 1.6,
    right: pad * 2.2,
    bottom: fonts.title * 3.4,
    left: fonts.title * 3.9
  };

  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;

  const x = makeScale(xNice.min, xNice.max, plotLeft, plotRight);
  const y = makeScale(yNice.min, yNice.max, plotBottom, plotTop);

  const svg = svgEl('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    'font-family': CHART_FONT,
    role: 'img'
  });

  svg.append(svgEl('rect', { x: 0, y: 0, width, height, fill: background }));

  /* An accessible name that says what the chart is, for a student on a screen
     reader and for anyone tabbing the handles. */
  const described = title || axisTitle(yLabel, yUnit) || 'Chart';
  svg.append(svgEl('title', {}, `${described}. ${points.length} points.`));

  if (title) {
    svg.append(svgEl('text', {
      x: width / 2,
      y: margin.top * 0.55,
      'text-anchor': 'middle',
      'font-size': fonts.title * 1.25,
      'font-weight': '700',
      fill: INK
    }, title));
  }

  /* ---- extrapolation band, drawn under everything else ---- */
  if (dataRange && fit) {
    const hatchId = `beyond-${Math.random().toString(36).slice(2, 8)}`;
    const pattern = svgEl('pattern', {
      id: hatchId,
      width: 8,
      height: 8,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)'
    });
    pattern.append(svgEl('rect', { width: 8, height: 8, fill: '#F0F0EE' }));
    pattern.append(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: '#C9C9C4', 'stroke-width': 2.5 }));
    const defs = svgEl('defs');
    defs.append(pattern);
    svg.append(defs);

    /* Hatched as well as tinted: the region must read in greyscale and to a
       colourblind student, and it carries a word too. */
    for (const [from, to] of [[xNice.min, dataRange.xMin], [dataRange.xMax, xNice.max]]) {
      if (to <= from) continue;
      svg.append(svgEl('rect', {
        x: x.to(from),
        y: plotTop,
        width: x.to(to) - x.to(from),
        height: plotBottom - plotTop,
        fill: `url(#${hatchId})`
      }));
    }

    const rightBand = xNice.max - dataRange.xMax;
    if (rightBand > 0) {
      /* Anchored to the right edge of the plot rather than to the start of the
         band. The band is often only a tick or two wide, and left-anchoring ran
         the caption off the edge of the export, where it read "beyond our da".
         Full label size, not a fraction of it: this is the one caption that has
         to survive being filmed off a screen, and the slide floor is 28px. */
      svg.append(svgEl('text', {
        x: plotRight - pad * 0.4,
        y: plotTop + fonts.label * 1.4,
        'text-anchor': 'end',
        'font-size': fonts.label,
        'font-style': 'italic',
        fill: SAGE
      }, 'beyond our data'));
    }
  }

  /* ---- grid and ticks ---- */
  for (const tick of yNice.ticks) {
    const py = y.to(tick);
    svg.append(svgEl('line', {
      x1: plotLeft, y1: py, x2: plotRight, y2: py,
      stroke: GRID, 'stroke-width': 1
    }));
    svg.append(svgEl('text', {
      x: plotLeft - pad * 0.6, y: py + fonts.label * 0.35,
      'text-anchor': 'end', 'font-size': fonts.label, fill: SAGE
    }, tickLabel(tick, yNice.step)));
  }

  for (const tick of xNice.ticks) {
    const px = x.to(tick);
    svg.append(svgEl('line', {
      x1: px, y1: plotTop, x2: px, y2: plotBottom,
      stroke: GRID, 'stroke-width': 1
    }));
    svg.append(svgEl('text', {
      x: px, y: plotBottom + fonts.label * 1.5,
      'text-anchor': 'middle', 'font-size': fonts.label, fill: SAGE
    }, tickLabel(tick, xNice.step)));
  }

  /* ---- axes ---- */
  svg.append(svgEl('line', {
    x1: plotLeft, y1: plotBottom, x2: plotRight, y2: plotBottom,
    stroke: INK, 'stroke-width': Math.max(1.5, fonts.label / 8)
  }));
  svg.append(svgEl('line', {
    x1: plotLeft, y1: plotTop, x2: plotLeft, y2: plotBottom,
    stroke: INK, 'stroke-width': Math.max(1.5, fonts.label / 8)
  }));

  const xTitle = axisTitle(xLabel, xUnit);
  if (xTitle) {
    svg.append(svgEl('text', {
      x: (plotLeft + plotRight) / 2,
      y: height - fonts.title * 0.8,
      'text-anchor': 'middle',
      'font-size': fonts.title,
      'font-weight': '700',
      fill: INK
    }, xTitle));
  }

  const yTitle = axisTitle(yLabel, yUnit);
  if (yTitle) {
    const cy = (plotTop + plotBottom) / 2;
    const cx = fonts.title * 1.1;
    svg.append(svgEl('text', {
      x: cx, y: cy,
      'text-anchor': 'middle',
      'font-size': fonts.title,
      'font-weight': '700',
      fill: INK,
      transform: `rotate(-90 ${cx} ${cy})`
    }, yTitle));
  }

  /* ---- fit line ---- */
  if (fit) {
    const clampToPlot = (px) => Math.max(plotLeft, Math.min(plotRight, px));
    const gradient = (fit.y2 - fit.y1) / ((fit.x2 - fit.x1) || 1e-9);
    const at = (xv) => fit.y1 + gradient * (xv - fit.x1);

    /* Solid across the data, dashed outside it: the eye should be able to tell
       measured from guessed without reading the caption. */
    const segments = dataRange
      ? [
          [xNice.min, dataRange.xMin, true],
          [dataRange.xMin, dataRange.xMax, false],
          [dataRange.xMax, xNice.max, true]
        ]
      : [[xNice.min, xNice.max, false]];

    for (const [from, to, dashed] of segments) {
      if (to <= from) continue;
      svg.append(svgEl('line', {
        x1: clampToPlot(x.to(from)),
        y1: y.to(at(from)),
        x2: clampToPlot(x.to(to)),
        y2: y.to(at(to)),
        stroke: PEN,
        'stroke-width': Math.max(2.2, fonts.label / 5),
        'stroke-dasharray': dashed ? `${fonts.label * 0.7} ${fonts.label * 0.5}` : null,
        'stroke-linecap': 'round'
      }));
    }
  }

  /* ---- points ---- */
  const dotRadius = Math.max(4, fonts.label / 2.6);
  for (const [px, py] of points) {
    svg.append(svgEl('circle', {
      cx: x.to(px), cy: y.to(py), r: dotRadius, fill: INK
    }));
  }

  /* ---- prediction marker ---- */
  if (prediction && Number.isFinite(prediction.y)) {
    const px = x.to(prediction.x);
    const py = y.to(prediction.y);
    if (px >= plotLeft && px <= plotRight) {
      svg.append(svgEl('line', {
        x1: px, y1: plotBottom, x2: px, y2: py,
        stroke: PEN, 'stroke-width': 1.4, 'stroke-dasharray': '4 4', opacity: 0.75
      }));
      svg.append(svgEl('line', {
        x1: plotLeft, y1: py, x2: px, y2: py,
        stroke: PEN, 'stroke-width': 1.4, 'stroke-dasharray': '4 4', opacity: 0.75
      }));
      /* White halo under the marker so it stays visible on top of a data point. */
      svg.append(svgEl('circle', { cx: px, cy: py, r: dotRadius + 3, fill: PAPER, opacity: 0.9 }));
      svg.append(svgEl('circle', {
        cx: px, cy: py, r: dotRadius + 1, fill: 'none', stroke: PEN, 'stroke-width': 3
      }));
    }
  }

  /* ---- drag handles, screen only ---- */
  if (showHandles && fit) {
    const handles = svgEl('g', { 'data-export': 'no' });
    for (const [index, key] of [[0, 'a'], [1, 'b']]) {
      const hx = index === 0 ? fit.x1 : fit.x2;
      const hy = index === 0 ? fit.y1 : fit.y2;
      const group = svgEl('g', {
        class: 'handle',
        'data-handle': key,
        tabindex: '0',
        role: 'slider',
        'aria-label': index === 0 ? 'Left end of your line' : 'Right end of your line'
      });
      /* 44px of grabbable area, invisible, so a finger has something to land on
         without a 44px dot covering the data. */
      group.append(svgEl('circle', {
        cx: x.to(hx), cy: y.to(hy), r: 22, fill: 'transparent', 'pointer-events': 'all'
      }));
      group.append(svgEl('circle', {
        cx: x.to(hx), cy: y.to(hy), r: 9, fill: PAPER, stroke: PEN, 'stroke-width': 3
      }));
      handles.append(group);
    }
    svg.append(handles);
  }

  svg.append(svgEl('rect', {
    x: plotLeft, y: plotTop, width: plotRight - plotLeft, height: plotBottom - plotTop,
    fill: 'none', stroke: RULE, 'stroke-width': 1
  }));

  return { svg, x, y, xNice, yNice, area: { plotLeft, plotRight, plotTop, plotBottom } };
}

/* ---- export -------------------------------------------------------------- */

function serialise(svg) {
  const clone = svg.cloneNode(true);
  for (const node of clone.querySelectorAll('[data-export="no"]')) node.remove();
  clone.setAttribute('xmlns', SVG_NS);
  return new XMLSerializer().serializeToString(clone);
}

function rasterise(markup, width, height) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('canvas gave no image'))), 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('the chart could not be turned into an image'));
    };
    image.src = url;
  });
}

/* 2x so it survives being printed on the Card or filmed off a screen. */
export function toPngBlob(svg, { scale = 2 } = {}) {
  const width = Number(svg.getAttribute('width'));
  const height = Number(svg.getAttribute('height'));
  return rasterise(serialise(svg), width * scale, height * scale);
}

/* 1920x1080 for the film crews. Built from a fresh chart at slide type sizes
   rather than a scaled-up screen chart, so the 28px minimum is a property of
   the render rather than a coincidence of the scale factor. */
export async function toSlideBlob(spec, { title = '', commentary = '' } = {}) {
  const W = 1920;
  const H = 1080;
  const MARGIN = 96; /* 5% safe area */
  const titleSize = 54;
  const commentarySize = 32;

  const chartTop = MARGIN + (title ? titleSize * 1.6 : 0);
  const chartBottom = H - MARGIN - (commentary ? commentarySize * 1.8 : 0);
  const chartWidth = W - MARGIN * 2;
  const chartHeight = chartBottom - chartTop;

  const { svg: inner } = renderChart({
    ...spec,
    width: chartWidth,
    height: chartHeight,
    fonts: SLIDE_FONTS,
    showHandles: false,
    title: ''
  });

  const slide = svgEl('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${W} ${H}`,
    width: W,
    height: H,
    'font-family': CHART_FONT
  });
  slide.append(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }));

  if (title) {
    slide.append(svgEl('text', {
      x: W / 2, y: MARGIN + titleSize,
      'text-anchor': 'middle', 'font-size': titleSize, 'font-weight': '700', fill: INK
    }, title));
  }

  const holder = svgEl('g', { transform: `translate(${MARGIN} ${chartTop})` });
  holder.append(inner);
  slide.append(holder);

  if (commentary) {
    slide.append(svgEl('text', {
      x: W / 2, y: H - MARGIN,
      'text-anchor': 'middle', 'font-size': commentarySize, fill: SAGE
    }, commentary));
  }

  return rasterise(serialise(slide), W, H);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ---- helpers the tools share --------------------------------------------- */

/* Maps a pointer event to data coordinates. getScreenCTM is the only thing that
   stays correct when the SVG is scaled to fit its container, which it always is. */
export function pointerToData(svg, event, xScale, yScale) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
  return { x: xScale.from(point.x), y: yScale.from(point.y) };
}

/* Two columns of numbers out of whatever the student pasted. Tabs, commas or
   spaces; blank lines and a header row are skipped rather than rejected. */
export function parsePairs(text) {
  const rows = [];
  const skipped = [];

  for (const [index, raw] of String(text).split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[\t,;]|\s{2,}|\s/).filter((p) => p !== '');
    if (parts.length < 2) { skipped.push(index + 1); continue; }
    const a = Number(parts[0].replace(/[^0-9.eE+-]/g, ''));
    const b = Number(parts[1].replace(/[^0-9.eE+-]/g, ''));
    if (!Number.isFinite(a) || !Number.isFinite(b)) { skipped.push(index + 1); continue; }
    rows.push([a, b]);
  }

  return { rows, skipped };
}

export function leastSquares(points) {
  const n = points.length;
  if (n < 2) return null;
  const meanX = points.reduce((s, p) => s + p[0], 0) / n;
  const meanY = points.reduce((s, p) => s + p[1], 0) / n;
  let top = 0;
  let bottom = 0;
  for (const [px, py] of points) {
    top += (px - meanX) * (py - meanY);
    bottom += (px - meanX) ** 2;
  }
  if (bottom === 0) return null;
  const m = top / bottom;
  return { m, c: meanY - m * meanX };
}

/* Sensible rather than exact: a Year 8 reading "y = 8.7x + 4" has learnt more
   than one reading "y = 8.7431x + 4.0092". */
export function roundSensibly(value) {
  const size = Math.abs(value);
  if (size === 0) return 0;
  if (size >= 100) return Math.round(value);
  if (size >= 10) return Number(value.toFixed(1));
  if (size >= 1) return Number(value.toFixed(2));
  return Number(value.toPrecision(2));
}
