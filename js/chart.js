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
/* Amber against the fit line's blue. Blue and amber stay apart under the two
   common forms of colour blindness, and the dash pattern and key carry it for
   everyone else. */
const COMPUTER = '#B98A05';
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

/* For a value quoted on its own rather than as one of a row of ticks: a median
   of 6.5 has to keep its half, and a smallest of 2 must not read "2.0". */
export function plainNumber(value) {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(2)));
}

/* ---- the chart ----------------------------------------------------------- */

function axisTitle(label, unit) {
  const text = String(label ?? '').trim();
  const units = String(unit ?? '').trim();
  if (!text) return '';
  return units ? `${text} (${units})` : text;
}

/* Grid, ticks, axis lines and axis titles. Shared by every chart in the
   programme so the girls meet one set of axes rather than five. Ticks arrive
   already positioned, because a category axis and a number axis place them by
   quite different rules but should look identical once drawn. */
function drawAxes(svg, {
  area, fonts, height, xTicks = [], yTicks = [], xTitle, yTitle,
  grid = 'both', showY = true
}) {
  const { plotLeft, plotRight, plotTop, plotBottom } = area;
  const pad = fonts.label;

  for (const tick of yTicks) {
    if (grid === 'both' || grid === 'y') {
      svg.append(svgEl('line', {
        x1: plotLeft, y1: tick.px, x2: plotRight, y2: tick.px,
        stroke: GRID, 'stroke-width': 1
      }));
    }
    svg.append(svgEl('text', {
      x: plotLeft - pad * 0.6, y: tick.px + fonts.label * 0.35,
      'text-anchor': 'end', 'font-size': fonts.label, fill: SAGE
    }, tick.label));
  }

  for (const tick of xTicks) {
    if (grid === 'both' || grid === 'x') {
      svg.append(svgEl('line', {
        x1: tick.px, y1: plotTop, x2: tick.px, y2: plotBottom,
        stroke: GRID, 'stroke-width': 1
      }));
    }
    svg.append(svgEl('text', {
      x: tick.px, y: plotBottom + fonts.label * 1.5,
      'text-anchor': 'middle', 'font-size': fonts.label, fill: SAGE
    }, tick.label));
  }

  svg.append(svgEl('line', {
    x1: plotLeft, y1: plotBottom, x2: plotRight, y2: plotBottom,
    stroke: INK, 'stroke-width': Math.max(1.5, fonts.label / 8)
  }));

  /* A dot plot and a box plot are number lines. Drawing a vertical axis they
     have no scale for would invite her to read one off it. */
  if (showY) {
    svg.append(svgEl('line', {
      x1: plotLeft, y1: plotTop, x2: plotLeft, y2: plotBottom,
      stroke: INK, 'stroke-width': Math.max(1.5, fonts.label / 8)
    }));
  }

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
    compare = null,
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

  /* Ids have to be unique per chart: two charts on one page share a document,
     and a duplicate id would silently point both at the first one. */
  const uid = Math.random().toString(36).slice(2, 8);
  const defs = svgEl('defs');
  svg.append(defs);

  /* Any straight line across the full x range can leave the plot vertically.
     Clipping is the only thing that reliably keeps a steep fit inside its axes. */
  const clipId = `plot-${uid}`;
  const clip = svgEl('clipPath', { id: clipId });
  clip.append(svgEl('rect', {
    x: plotLeft, y: plotTop, width: plotRight - plotLeft, height: plotBottom - plotTop
  }));
  defs.append(clip);

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

  /* Collected while the bands are built, painted after the lines. */
  const fades = [];

  /* ---- extrapolation band, drawn under everything else ---- */
  if (dataRange && fit) {
    const hatchId = `beyond-${uid}`;
    const pattern = svgEl('pattern', {
      id: hatchId,
      width: 8,
      height: 8,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)'
    });
    pattern.append(svgEl('rect', { width: 8, height: 8, fill: '#F0F0EE' }));
    pattern.append(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: '#C9C9C4', 'stroke-width': 2.5 }));
    defs.append(pattern);

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

    /* A wash that thickens with distance from the last real measurement, so the
       line fades out as the evidence for it does. It says "trust this less the
       further you go" without claiming a number, which is the honest thing to
       show a Year 8 - a real prediction interval needs residual spread, and
       residuals are out by the pitch rule. Drawn over the lines and under the
       points, the marker and the caption. */
    for (const [edge, from, to] of [
      ['left', xNice.min, dataRange.xMin],
      ['right', dataRange.xMax, xNice.max]
    ]) {
      if (to <= from) continue;
      const fadeId = `fade-${edge}-${uid}`;
      const gradient = svgEl('linearGradient', {
        id: fadeId, x1: '0', y1: '0', x2: '1', y2: '0'
      });
      /* Clear where the data stops, heaviest at the far edge of the axis. */
      const stops = edge === 'right'
        ? [['0%', 0], ['100%', 0.72]]
        : [['0%', 0.72], ['100%', 0]];
      for (const [offset, opacity] of stops) {
        gradient.append(svgEl('stop', { offset, 'stop-color': PAPER, 'stop-opacity': opacity }));
      }
      defs.append(gradient);
      fades.push({ from, to, fadeId });
    }
  }

  drawAxes(svg, {
    area: { plotLeft, plotRight, plotTop, plotBottom },
    fonts,
    height,
    xTicks: xNice.ticks.map((t) => ({ px: x.to(t), label: tickLabel(t, xNice.step) })),
    yTicks: yNice.ticks.map((t) => ({ px: y.to(t), label: tickLabel(t, yNice.step) })),
    xTitle: axisTitle(xLabel, xUnit),
    yTitle: axisTitle(yLabel, yUnit)
  });

  /* ---- lines, all inside one clipped group ---- */
  const lines = svgEl('g', { 'clip-path': `url(#${clipId})` });
  svg.append(lines);

  /* The computer's line, when she asks for it. Drawn under her own so hers
     stays the subject. Distinguished three ways - colour, a dotted pattern and
     a named key - because a colourblind girl has to be able to tell which is
     which, and this is the one view whose entire point is the comparison. */
  if (compare && Number.isFinite(compare.m) && Number.isFinite(compare.c)) {
    const at = (xv) => compare.m * xv + compare.c;
    lines.append(svgEl('line', {
      x1: x.to(xNice.min), y1: y.to(at(xNice.min)),
      x2: x.to(xNice.max), y2: y.to(at(xNice.max)),
      stroke: COMPUTER,
      'stroke-width': Math.max(2, fonts.label / 6.5),
      'stroke-dasharray': `${(fonts.label * 0.16).toFixed(2)} ${(fonts.label * 0.5).toFixed(2)}`,
      'stroke-linecap': 'round'
    }));
  }

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
      lines.append(svgEl('line', {
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

  /* ---- the uncertainty wash, over the lines ---- */
  for (const { from, to, fadeId } of fades) {
    svg.append(svgEl('rect', {
      x: x.to(from),
      y: plotTop,
      width: x.to(to) - x.to(from),
      height: plotBottom - plotTop,
      fill: `url(#${fadeId})`
    }));
  }

  /* Caption goes on after the wash, or the thing naming the region would be the
     one thing the region faded out. */
  if (dataRange && fit && xNice.max > dataRange.xMax) {
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

  /* ---- points ---- */
  const dotRadius = Math.max(4, fonts.label / 2.6);
  for (const [px, py] of points) {
    /* Carrying the data values lets a caller find one point again after the
       chart is drawn - the L2 room rings one and labels it P. Nothing in the
       engine reads them back. */
    svg.append(svgEl('circle', {
      cx: x.to(px), cy: y.to(py), r: dotRadius, fill: INK,
      'data-x': px, 'data-y': py
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

  /* ---- key, only when there are two lines to tell apart ---- */
  if (compare && fit) {
    const rowH = fonts.label * 1.55;
    const swatch = fonts.label * 2.4;
    const keyW = swatch + fonts.label * 9.4;
    const keyX = plotLeft + fonts.label * 0.6;
    const keyY = plotTop + fonts.label * 0.6;

    const key = svgEl('g', {});
    /* Backed in paper so it stays readable where it lands over the points. */
    key.append(svgEl('rect', {
      x: keyX, y: keyY, width: keyW, height: rowH * 2 + fonts.label * 0.5,
      fill: PAPER, opacity: 0.88, stroke: RULE, 'stroke-width': 1
    }));

    const rows = [
      [PEN, null, 'your line'],
      [COMPUTER, `${(fonts.label * 0.16).toFixed(2)} ${(fonts.label * 0.5).toFixed(2)}`, "the computer's line"]
    ];

    rows.forEach(([colour, dash, label], index) => {
      const cy = keyY + fonts.label * 0.25 + rowH * (index + 0.5);
      key.append(svgEl('line', {
        x1: keyX + fonts.label * 0.5, y1: cy,
        x2: keyX + fonts.label * 0.5 + swatch, y2: cy,
        stroke: colour,
        'stroke-width': Math.max(2.2, fonts.label / 5),
        'stroke-dasharray': dash,
        'stroke-linecap': 'round'
      }));
      key.append(svgEl('text', {
        x: keyX + fonts.label * 1.2 + swatch,
        y: cy + fonts.label * 0.35,
        'font-size': fonts.label,
        fill: INK
      }, label));
    });

    svg.append(key);
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

/* ---- one variable -------------------------------------------------------- */

/* Categories are drawn in the order she typed them. Sorting by size would make
   a tidier chart out of data she no longer recognises. */
export function tally(values) {
  const counts = new Map();
  for (const value of values) {
    const key = String(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => ({ label, count }));
}

function medianOf(sorted) {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* The method they are taught and can check by hand: split at the median, and
   with an odd count the median itself belongs to neither half. Any of the other
   defensible quartile conventions would disagree with her exercise book. */
export function fiveNumberSummary(values) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;

  const half = Math.floor(n / 2);
  const lower = sorted.slice(0, half);
  const upper = sorted.slice(n % 2 === 0 ? half : half + 1);

  const q1 = lower.length ? medianOf(lower) : sorted[0];
  const q3 = upper.length ? medianOf(upper) : sorted[n - 1];

  return { min: sorted[0], q1, median: medianOf(sorted), q3, max: sorted[n - 1], iqr: q3 - q1, n };
}

export function suggestBinWidth(values) {
  const numbers = values.filter(Number.isFinite);
  if (numbers.length < 2) return 1;
  const range = Math.max(...numbers) - Math.min(...numbers);
  if (range === 0) return 1;
  return niceNum(range / 8, true) || 1;
}

export function binValues(values, width) {
  const numbers = values.filter(Number.isFinite);
  if (!numbers.length || !(width > 0)) return [];

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const start = Math.floor(min / width) * width;
  const count = Math.max(1, Math.ceil((max - start) / width + 1e-9));

  const bins = [];
  for (let i = 0; i < count; i += 1) {
    const from = start + i * width;
    bins.push({ from, to: from + width, count: 0 });
  }

  for (const value of numbers) {
    /* Bins are [from, to), so the largest value sits exactly on the last upper
       edge and has to be pushed back into the bin below it. */
    let index = Math.floor((value - start) / width + 1e-9);
    if (index >= count) index = count - 1;
    if (index < 0) index = 0;
    bins[index].count += 1;
  }

  return bins;
}

/* Enough hues to cover the eight categories a pie is allowed, chosen to stay
   apart in greyscale as well. The slice labels carry the meaning regardless. */
const SLICE_COLOURS = [
  '#003DA5', '#B98A05', '#4A6A70', '#A8B8B4',
  '#1D3F8F', '#06232B', '#7E9793', '#DCE6E3'
];

function renderPie({ svg, width, height, fonts, slices, title, margin }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0) || 1;
  const legendW = Math.min(width * 0.42, fonts.label * 16);
  const cx = (width - legendW) / 2 + fonts.label;
  const cy = margin.top + (height - margin.top - fonts.label * 2) / 2;
  const r = Math.min((width - legendW) / 2 - fonts.label, (height - margin.top - fonts.label * 3) / 2);

  let angle = -Math.PI / 2;
  slices.forEach((slice, index) => {
    const sweep = (slice.count / total) * Math.PI * 2;
    const colour = SLICE_COLOURS[index % SLICE_COLOURS.length];

    if (slices.length === 1) {
      svg.append(svgEl('circle', { cx, cy, r, fill: colour }));
    } else {
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(angle + sweep);
      const y2 = cy + r * Math.sin(angle + sweep);
      svg.append(svgEl('path', {
        d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`,
        fill: colour,
        stroke: PAPER,
        'stroke-width': 2
      }));
    }
    angle += sweep;
  });

  /* A key rather than labels on the slices: a thin slice has nowhere to put its
     name, and the name is the only thing telling two colours apart. */
  const legendX = width - legendW + fonts.label;
  const rowH = fonts.label * 1.8;
  const legendTop = cy - (slices.length * rowH) / 2;

  slices.forEach((slice, index) => {
    const rowY = legendTop + index * rowH;
    svg.append(svgEl('rect', {
      x: legendX, y: rowY, width: fonts.label, height: fonts.label,
      fill: SLICE_COLOURS[index % SLICE_COLOURS.length]
    }));
    const percent = Math.round((slice.count / total) * 100);
    svg.append(svgEl('text', {
      x: legendX + fonts.label * 1.6,
      y: rowY + fonts.label * 0.9,
      'font-size': fonts.label,
      fill: INK
    }, `${slice.label} — ${slice.count} (${percent}%)`));
  });
}

export function renderUni(spec) {
  const {
    kind = 'dot',
    width = 660,
    height = 440,
    values = [],
    label = '',
    unit = '',
    countLabel = 'How many',
    title = '',
    binWidth = null,
    fonts = SCREEN_FONTS,
    background = PAPER,
    axis = {}
  } = spec;

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

  const svg = svgEl('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    'font-family': CHART_FONT,
    role: 'img'
  });
  svg.append(svgEl('rect', { x: 0, y: 0, width, height, fill: background }));
  svg.append(svgEl('title', {}, `${title || label || 'Chart'}. ${values.length} values.`));

  if (title) {
    svg.append(svgEl('text', {
      x: width / 2, y: margin.top * 0.55,
      'text-anchor': 'middle', 'font-size': fonts.title * 1.25,
      'font-weight': '700', fill: INK
    }, title));
  }

  const area = { plotLeft, plotRight, plotTop, plotBottom };
  const valueTitle = axisTitle(label, unit);
  const numbers = values.map(Number).filter(Number.isFinite);
  let summary = null;

  if (kind === 'pie') {
    renderPie({ svg, width, height, fonts, slices: tally(values), title, margin });
    return { svg, area, summary: null };
  }

  if (kind === 'column') {
    const cats = tally(values);
    const maxCount = Math.max(1, ...cats.map((c) => c.count));
    const yNice = niceScale(0, maxCount, { startAtZero: true, targetTicks: 5 });
    const y = makeScale(yNice.min, yNice.max, plotBottom, plotTop);
    const band = (plotRight - plotLeft) / Math.max(1, cats.length);

    drawAxes(svg, {
      area, fonts, height,
      xTicks: cats.map((c, i) => ({ px: plotLeft + band * (i + 0.5), label: c.label })),
      yTicks: yNice.ticks.map((t) => ({ px: y.to(t), label: tickLabel(t, yNice.step) })),
      xTitle: valueTitle, yTitle: countLabel, grid: 'y'
    });

    cats.forEach((c, i) => {
      const barW = band * 0.68;
      svg.append(svgEl('rect', {
        x: plotLeft + band * (i + 0.5) - barW / 2,
        y: y.to(c.count),
        width: barW,
        height: plotBottom - y.to(c.count),
        fill: '#003DA5'
      }));
    });

    return { svg, area, summary: null };
  }

  if (kind === 'histogram') {
    const bwidth = binWidth ?? suggestBinWidth(numbers);
    const bins = binValues(numbers, bwidth);
    const maxCount = Math.max(1, ...bins.map((b) => b.count));
    const xNice = { min: bins[0]?.from ?? 0, max: bins[bins.length - 1]?.to ?? 1 };
    const yNice = niceScale(0, maxCount, { startAtZero: true, targetTicks: 5 });
    const x = makeScale(xNice.min, xNice.max, plotLeft, plotRight);
    const y = makeScale(yNice.min, yNice.max, plotBottom, plotTop);

    /* Ticks on the bin edges, not on nice round numbers, so the boundary she
       reads off the axis is the boundary the bar actually uses. */
    const edges = bins.map((b) => b.from).concat(bins.length ? [bins[bins.length - 1].to] : []);
    const stride = Math.ceil(edges.length / 9);

    drawAxes(svg, {
      area, fonts, height,
      xTicks: edges.filter((_, i) => i % stride === 0)
        .map((e) => ({ px: x.to(e), label: tickLabel(e, bwidth) })),
      yTicks: yNice.ticks.map((t) => ({ px: y.to(t), label: tickLabel(t, yNice.step) })),
      xTitle: valueTitle, yTitle: countLabel, grid: 'y'
    });

    for (const bin of bins) {
      if (bin.count === 0) continue;
      svg.append(svgEl('rect', {
        x: x.to(bin.from),
        y: y.to(bin.count),
        width: Math.max(1, x.to(bin.to) - x.to(bin.from)),
        height: plotBottom - y.to(bin.count),
        fill: '#003DA5',
        stroke: PAPER,
        'stroke-width': 1
      }));
    }

    return { svg, area, summary: null, binWidth: bwidth, bins };
  }

  /* dot and box both sit on a plain number line */
  const xNice = niceScale(
    axis.min ?? Math.min(...numbers),
    axis.max ?? Math.max(...numbers),
    { startAtZero: axis.startAtZero ?? false }
  );
  const x = makeScale(xNice.min, xNice.max, plotLeft, plotRight);

  drawAxes(svg, {
    area, fonts, height,
    xTicks: xNice.ticks.map((t) => ({ px: x.to(t), label: tickLabel(t, xNice.step) })),
    yTicks: [],
    xTitle: valueTitle,
    yTitle: '',
    grid: 'x',
    showY: false
  });

  if (kind === 'box') {
    summary = fiveNumberSummary(numbers);
    if (summary) {
      const midY = (plotTop + plotBottom) / 2;
      const boxH = Math.min((plotBottom - plotTop) * 0.46, fonts.label * 11);
      const stroke = Math.max(2, fonts.label / 6);

      /* Whiskers to the smallest and largest values. Year 8 box plots do not
         carry the 1.5 IQR outlier rule, and inventing one here would put marks
         on the chart she has no way to explain. */
      svg.append(svgEl('line', {
        x1: x.to(summary.min), y1: midY, x2: x.to(summary.q1), y2: midY,
        stroke: INK, 'stroke-width': stroke
      }));
      svg.append(svgEl('line', {
        x1: x.to(summary.q3), y1: midY, x2: x.to(summary.max), y2: midY,
        stroke: INK, 'stroke-width': stroke
      }));
      for (const end of [summary.min, summary.max]) {
        svg.append(svgEl('line', {
          x1: x.to(end), y1: midY - boxH * 0.28, x2: x.to(end), y2: midY + boxH * 0.28,
          stroke: INK, 'stroke-width': stroke
        }));
      }

      svg.append(svgEl('rect', {
        x: x.to(summary.q1), y: midY - boxH / 2,
        width: Math.max(1, x.to(summary.q3) - x.to(summary.q1)), height: boxH,
        fill: '#E9EEF8', stroke: '#003DA5', 'stroke-width': stroke
      }));
      svg.append(svgEl('line', {
        x1: x.to(summary.median), y1: midY - boxH / 2,
        x2: x.to(summary.median), y2: midY + boxH / 2,
        stroke: '#003DA5', 'stroke-width': stroke * 1.6
      }));

      /* Every one of the five named on the chart, so the picture and the panel
         say the same thing and the export explains itself. */
      const marks = [
        ['smallest', summary.min], ['Q1', summary.q1], ['median', summary.median],
        ['Q3', summary.q3], ['largest', summary.max]
      ];
      /* Full label size. Shrinking these put them at 27.6px in the slide
         export, under the 28px floor the film brief sets - the same slip as the
         extrapolation caption, so the suite now checks every chart type. */
      marks.forEach(([name, value], index) => {
        svg.append(svgEl('text', {
          x: x.to(value),
          y: index % 2 ? midY - boxH * 0.75 : midY + boxH * 0.95 + fonts.label * 0.6,
          'text-anchor': 'middle', 'font-size': fonts.label, fill: SAGE
        }, `${name} ${plainNumber(value)}`));
      });
    }
    return { svg, area, summary };
  }

  /* dot plot: one dot per measurement, stacked where they repeat */
  const groups = new Map();
  for (const value of numbers) groups.set(value, (groups.get(value) ?? 0) + 1);
  const tallest = Math.max(1, ...groups.values());

  /* Dots grow to use the height rather than sitting in a thin line along the
     bottom of an empty box, and shrink again when a tall stack needs the room. */
  const room = plotBottom - plotTop - fonts.label;
  const radius = Math.max(2, Math.min(fonts.label * 0.9, room * 0.55 / Math.max(1, tallest * 2.4)));

  for (const [value, count] of groups) {
    for (let i = 0; i < count; i += 1) {
      svg.append(svgEl('circle', {
        cx: x.to(value),
        cy: plotBottom - radius * 1.6 - i * radius * 2.4,
        r: radius,
        fill: INK
      }));
    }
  }

  return { svg, area, summary: null, tallest };
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
export async function toSlideBlob(spec, { title = '', commentary = '', render = renderChart } = {}) {
  const W = 1920;
  const H = 1080;
  const MARGIN = 96; /* 5% safe area */
  const titleSize = 54;
  const commentarySize = 32;

  const chartTop = MARGIN + (title ? titleSize * 1.6 : 0);
  const chartBottom = H - MARGIN - (commentary ? commentarySize * 1.8 : 0);
  const chartWidth = W - MARGIN * 2;
  const chartHeight = chartBottom - chartTop;

  const { svg: inner } = render({
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

/* One column. Values stay as typed so categories survive; `numeric` says
   whether they all read as numbers, and the tool lets her overrule it. */
export function parseColumn(text) {
  const raw = [];
  const skipped = [];

  for (const [index, line] of String(text).split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    /* Tolerate a two-column paste by taking the first field. */
    const first = trimmed.split(/[\t,;]/)[0].trim();
    if (!first) { skipped.push(index + 1); continue; }
    raw.push(first);
  }

  const looksNumeric = (v) => /\d/.test(v) && Number.isFinite(Number(v.replace(/[^0-9.eE+-]/g, '')));

  /* A single non-numeric line on top of numbers is a column heading, not a
     category. Keeping it would turn her whole column categorical. */
  let header = null;
  if (raw.length > 1 && !looksNumeric(raw[0]) && raw.slice(1).every(looksNumeric)) {
    header = raw.shift();
  }

  const numeric = raw.length > 0 && raw.every(looksNumeric);
  const numbers = numeric ? raw.map((v) => Number(v.replace(/[^0-9.eE+-]/g, ''))) : [];

  return { values: raw, numbers, numeric, header, skipped };
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
