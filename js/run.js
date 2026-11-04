/* =====================================================================
   THE 42.2K SCROLL RUN — opt-in, ported from Draft 4. Vanilla JS.

   Off by default. The hero button "Start the 42.2K scroll run" (#runCta)
   switches it on: the club logo runs straight to the START line and
   turns into the runner. As you scroll, the runner follows a track of
   straight runs with rounded 90° turns down the page, through every
   visible section:

     <section data-lane="l|r|m|c" data-km="5">   lane + km checkpoint
       l / r = left or right side lane, c = centre,
       m = the middle, between the two columns of the .lane-grid inside
           (phones fall back to data-lane-mobile="l|r")

   The runner, mates and dog live inside <main> (page coordinates), so
   they scroll with the track on phones instead of jumping.

   Sections without data-lane (or hidden ones) are skipped. The run ends
   at the #finish section (42.2K) with a summary + finisher certificate.
   Tap the button again, or "End run", to switch everything off.
   ===================================================================== */
(function(){
'use strict';
var cta = document.getElementById('runCta');
if (!cta) return;

var RACE_KM = 42.2;
var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var clamp = function(v, a, b){ return v < a ? a : v > b ? b : v; };
var lerp = function(a, b, t){ return a + (b - a) * t; };
var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
var NS = 'http://www.w3.org/2000/svg';
var body = document.body, main = $('#main'), hero = $('#top'), finSec = $('#finish'), finArch = $('#finishArch');
var vw = document.documentElement.clientWidth, vh = innerHeight, mobile = innerWidth <= 760;

function el(html){ var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

/* ---------- Runner figure: the club's white runner, front view (orange bib) running down the
   track, back view on a cool-down jog up. Unchanged from Draft 4. ---------- */
function makeFigure(host, white, bib){
  var o = '<path data-o="ll" stroke-width="9.8"/><path data-o="rl" stroke-width="9.8"/><ellipse data-o="lsh" fill="#1A0904" stroke="none"/><ellipse data-o="rsh" fill="#1A0904" stroke="none"/>' +
          '<path data-o="torso" stroke-width="3.4" fill="#1A0904"/><path data-o="la" stroke-width="9.4"/><path data-o="ra" stroke-width="9.4"/><circle data-o="head" r="8.6" fill="#1A0904" stroke="none"/>';
  var f = '<path data-f="ll" stroke-width="6.6"/><path data-f="rl" stroke-width="6.6"/><ellipse data-f="lsh" stroke="none" style="fill:var(--accent)"/><ellipse data-f="rsh" stroke="none" style="fill:var(--accent)"/>' +
          '<path data-f="torso" stroke="none" fill="' + white + '"/>' + (bib ? '<rect data-f="bib" width="9" height="7" rx="1.5" fill="#D4440F" stroke="none"/>' : '') +
          '<path data-f="la" stroke-width="6.2"/><path data-f="ra" stroke-width="6.2"/><circle data-f="head" r="7" fill="' + white + '" stroke="none"/>';
  host.innerHTML = '<svg viewBox="0 0 60 82"><g class="hop"><g fill="none" stroke="#1A0904" stroke-linecap="round" stroke-linejoin="round">' + o + '</g><g fill="none" stroke="' + white + '" stroke-linecap="round" stroke-linejoin="round">' + f + '</g></g></svg>';
  var P = {}; $$('[data-o],[data-f]', host).forEach(function(n){ var k = n.getAttribute('data-o') || n.getAttribute('data-f'); (P[k] = P[k] || []).push(n); });
  return { host: host, svg: host.firstChild, hop: host.querySelector('.hop'), P: P };
}
function d(a){ var s = 'M' + a[0][0].toFixed(1) + ' ' + a[0][1].toFixed(1); for (var i = 1; i < a.length; i++) s += 'L' + a[i][0].toFixed(1) + ' ' + a[i][1].toFixed(1); return s; }
function set(F, k, v){ F.P[k].forEach(function(n){ n.setAttribute('d', v); }); }
function shoe(F, k, x, y, rx, ry){ var n = F.P[k]; n[0].setAttribute('cx', x.toFixed(1)); n[0].setAttribute('cy', y.toFixed(1)); n[0].setAttribute('rx', (rx + 1.7).toFixed(1)); n[0].setAttribute('ry', (ry + 1.7).toFixed(1)); n[1].setAttribute('cx', x.toFixed(1)); n[1].setAttribute('cy', y.toFixed(1)); n[1].setAttribute('rx', rx.toFixed(1)); n[1].setAttribute('ry', ry.toFixed(1)); }
/* ph = stride phase · A = running 0..1 · W = watch check · C = cheer · B = warm-up bounce · back = seen from behind */
function pose(F, ph, A, W, C, B, t, back){
  var y0 = -Math.abs(Math.sin(ph)) * 2.6 * A - Math.abs(Math.sin(t * 7)) * 3 * B + (1 - A) * Math.sin(t * 2.2) * .4;
  var cx = 30 + Math.sin(ph) * 1.4 * A;
  var shY = 22 + y0, sh = { l: [cx - 9.5, shY], r: [cx + 9.5, shY] };
  set(F, 'torso', 'M' + (cx - 10.5).toFixed(1) + ' ' + (20 + y0).toFixed(1) + 'L' + (cx + 10.5).toFixed(1) + ' ' + (20 + y0).toFixed(1) + 'L' + (cx + 7).toFixed(1) + ' ' + (45 + y0).toFixed(1) + 'L' + (cx - 7).toFixed(1) + ' ' + (45 + y0).toFixed(1) + 'Z');
  [-1, 1].forEach(function(s){
    var hip = [cx + s * 4.5, 44 + y0];
    var lift = Math.max(0, Math.sin(ph + (s < 0 ? 0 : Math.PI))) * A + B * .45 * Math.max(0, Math.sin(t * 7 + (s < 0 ? 0 : Math.PI)));
    var knee = [hip[0] + s * (1.5 + lift), hip[1] + 12.5 - 7 * lift], foot = [hip[0] + s * (2 + .5 * lift), hip[1] + 25 - 13 * lift];
    set(F, s < 0 ? 'll' : 'rl', d([hip, knee, foot]));
    shoe(F, s < 0 ? 'lsh' : 'rsh', foot[0] + s * .6, foot[1] + 2.2, 4.4 + 1.8 * lift, 2.5 + 1.4 * lift);
  });
  [-1, 1].forEach(function(s){
    var a = s < 0 ? sh.l : sh.r, fw = Math.sin(ph + (s < 0 ? Math.PI : 0)) * A, f = Math.max(0, fw), b = Math.max(0, -fw);
    var el2 = [a[0] + s * (3 + .6 * A), a[1] + 10 - 3 * f + b];
    var hand = [lerp(el2[0] + s * .5, el2[0] - s * (2 + 4 * f) + s * 2 * b, A), lerp(el2[1] + 9, el2[1] - 2 - 8 * f + 5 * b, A)];
    if (B > 0){ var pump = Math.sin(t * 7 + (s < 0 ? 0 : Math.PI)); el2 = [a[0] + s * 4, a[1] + 9]; hand = [el2[0] - s * 2, el2[1] - 4 - 5 * pump]; }
    if (s < 0 && W > 0){ el2 = [lerp(el2[0], a[0] - 3, W), lerp(el2[1], a[1] + 9, W)]; hand = [lerp(hand[0], cx - 1, W), lerp(hand[1], a[1] + 5, W)]; }
    if (C > 0){ el2 = [lerp(el2[0], a[0] + s * 5, C), lerp(el2[1], a[1] - 8, C)]; hand = [lerp(hand[0], a[0] + s * 9, C), lerp(hand[1], a[1] - 18, C)]; }
    set(F, s < 0 ? 'la' : 'ra', d([a, el2, hand]));
  });
  F.P.head.forEach(function(n){ n.setAttribute('cx', cx.toFixed(1)); n.setAttribute('cy', (11 + y0 + W * 1.5).toFixed(1)); });
  if (F.P.bib){ var bb = F.P.bib[0]; bb.setAttribute('x', (cx - 4.5).toFixed(1)); bb.setAttribute('y', (27 + y0).toFixed(1)); bb.style.opacity = back ? 0 : 1; }
}

/* ---------- Run state (reset on every start) ---------- */
var active = false, raf = 0, cleanups = [], flyer = null;
var route, paths, pTrace, pGlow, posts, water, arch, runner, R, mates = [], dog, bubble, stat, statKm, statPace, statTime, ring, toasts, exitBtn;
var RT = { ok: false }, zones = { mates: [0, 0], dog: [0, 0] }, waterY = -1e9, waterDone = false;
var RW = 62, RH = 85, SW = 150, SH = 54, ready = false;
var cur, prevL, prevY, phase, amp, idleT, watchW, cheerW, lastTime, speed, slowT, upT, coolSaid, wwSaid, back, goSaid, lean, sx, sy2, dogSaid, tick;
var T0, runT0, lastSplit, splitLog, CPS, bubbleUntil, bubbleKey, finished, RUN;
var BIB = 'PCSC-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));
var SEGS = [[0, 5], [5, 10], [10, 15], [15, 21.1], [21.1, 30], [30, 40], [40, 42.2]];

function reset(){
  RT = { ok: false }; waterDone = false; ready = false;
  cur = 0; prevL = 0; prevY = 0; phase = 0; amp = 0; idleT = 0; watchW = 0; cheerW = 0; lastTime = performance.now(); speed = 0; slowT = 0;
  upT = 0; coolSaid = 0; wwSaid = 0; back = false; goSaid = false; lean = 0; sx = 24; sy2 = vh - 90; dogSaid = false; tick = 0;
  T0 = performance.now(); runT0 = 0; lastSplit = 0; splitLog = []; bubbleUntil = 0; bubbleKey = ''; finished = false;
  RUN = { total: 0, proj: 0, pace: '--', per: [] };
  CPS = [{ km: 5, msg: 'Nice and steady.' }, { km: 10, msg: 'Double digits. Look at you.' }, { km: 15, msg: 'Settling in. Grab some water.' }, { km: 21.1, msg: 'Halfway! That was a half marathon.' }, { km: 30, msg: 'The wall. Keep going.' }, { km: 40, msg: 'Second wind! 2.2 to go.' }];
}

/* ---------- Build the run's elements ---------- */
function mount(){
  route = document.createElementNS(NS, 'svg'); route.setAttribute('class', 'route'); route.setAttribute('aria-hidden', 'true');
  ['lane-bg', 'centre', 'glow', 'trace'].forEach(function(c){ var p = document.createElementNS(NS, 'path'); p.setAttribute('class', c); route.appendChild(p); });
  main.insertBefore(route, main.firstChild);
  paths = $$('path', route); pTrace = $('.trace', route); pGlow = $('.glow', route);
  posts = el('<div aria-hidden="true"></div>'); main.appendChild(posts);
  water = el('<svg class="water" viewBox="0 0 62 46" aria-hidden="true"><g fill="#8FD3FF"><circle class="drop" cx="40" cy="8" r="2.6" style="--tx:8px"/><circle class="drop" cx="46" cy="14" r="2" style="--tx:14px"/><circle class="drop" cx="36" cy="14" r="1.8" style="--tx:-6px"/></g>' +
    '<path d="M4 26H58M10 26V46M52 26V46" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M13 25l1.6-9h7.8l1.6 9zM27 25l1.6-9h7.8l1.6 9zM41 25l1.6-9h7.8l1.6 9z" fill="#F27235" stroke="currentColor" stroke-width="1.2"/></svg>');
  main.appendChild(water);
  arch = el('<svg class="run-arch" viewBox="0 0 190 200" aria-hidden="true"><path d="M14 200V40M176 200V40" stroke="#FFF3E8" stroke-width="5" stroke-linecap="round"/>' +
    '<g class="flag"><path d="M8 40Q95-4 182 40L182 70Q95 26 8 70Z" fill="#D4440F" stroke="#FFF3E8" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<text x="95" y="52" text-anchor="middle" font-family="Big Shoulders, Arial Narrow, sans-serif" font-weight="900" font-size="24" letter-spacing="3" fill="#FFFFFF">START</text></g></svg>');
  hero.appendChild(arch);
  runner = el('<div class="runner" aria-hidden="true"></div>'); main.appendChild(runner); R = makeFigure(runner, '#FFFFFF', true);
  mates = [0, 1, 2].map(function(){ var m = el('<div class="mate" aria-hidden="true"></div>'); main.appendChild(m); return makeFigure(m, '#FFD3B0', true); });
  dog = el('<div class="dog" aria-hidden="true"><svg viewBox="0 0 64 40"><g fill="#C97B3C" stroke="#1A0904" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M10 16q-8-6-6-14q4 8 10 10z"/><path d="M14 26L6 39M22 27L18 39M40 27L48 39M46 25L56 36"/><path d="M10 14Q12 10 26 11L44 12Q50 12 52 16L52 26Q40 30 22 29Q12 28 10 22z"/><path d="M46 14L50 3L54 10L60 9L63 15L58 20L50 20z"/></g><circle cx="56.5" cy="13" r="1.3" fill="#1A0904"/></svg></div>');
  main.appendChild(dog);
  bubble = el('<div class="bubble" aria-hidden="true"></div>'); main.appendChild(bubble);
  stat = el('<div class="stat off dock" aria-hidden="true"><div class="stat__row"><svg class="stat__ring" viewBox="0 0 46 46"><circle cx="23" cy="23" r="18" stroke="rgba(255,243,232,.2)"/><circle class="js-ring" cx="23" cy="23" r="18" stroke="#FF9A5C" stroke-linecap="round" stroke-dasharray="113.1" stroke-dashoffset="113.1" transform="rotate(-90 23 23)"/></svg>' +
    '<span class="stat__km"><span class="js-km">0.0</span><small>KM</small></span></div><div class="stat__sub"><span class="stat__pace js-pace">--:-- /km</span> · <span class="js-time">0:00</span></div></div>');
  main.appendChild(stat); statKm = $('.js-km', stat); statPace = $('.js-pace', stat); statTime = $('.js-time', stat); ring = $('.js-ring', stat);
  toasts = el('<div class="toasts" role="status" aria-live="polite"></div>'); body.appendChild(toasts);
  exitBtn = el('<button class="runexit" type="button"><svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3L13 13M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>End run</button>');
  body.appendChild(exitBtn);
  var crowd = $('#crowd');
  if (crowd && !crowd.children.length){
    var fig = '<svg viewBox="0 0 34 60"><circle cx="17" cy="9" r="6" fill="currentColor"/><path d="M17 16V40M17 22L6 8M17 22L28 8M17 40L10 58M17 40L24 58" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/></svg>';
    for (var k = 0; k < (mobile ? 6 : 14); k++) crowd.insertAdjacentHTML('beforeend', fig);
  }
}
function unmount(){
  [route, posts, water, arch, runner, dog, bubble, stat, toasts, exitBtn, flyer].concat(mates.map(function(m){ return m.host; }))
    .forEach(function(n){ if (n && n.parentNode) n.parentNode.removeChild(n); });
  mates = []; flyer = null;
}

/* ---------- Track: straight runs + rounded 90° turns through each section's lane ---------- */
/* Builds the SVG path AND evenly spaced points along it in plain JS (lines + quadratic corners).
   Asking the browser for points (getPointAtLength) took ~1s on a long page; this takes ~1ms. */
function track(pts, r, step){
  var s = 'M' + pts[0][0] + ' ' + pts[0][1], fine = [pts[0]];
  for (var i = 1; i < pts.length - 1; i++){
    var a = pts[i - 1], b = pts[i], c = pts[i + 1];
    var d1 = Math.hypot(b[0] - a[0], b[1] - a[1]), d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (!d1 || !d2) continue;
    var rr = Math.min(r, d1 / 2, d2 / 2);
    var p1 = [b[0] + (a[0] - b[0]) * rr / d1, b[1] + (a[1] - b[1]) * rr / d1], p2 = [b[0] + (c[0] - b[0]) * rr / d2, b[1] + (c[1] - b[1]) * rr / d2];
    s += 'L' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'Q' + b[0] + ' ' + b[1] + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    fine.push(p1);
    for (var k = 1; k <= 12; k++){ var t = k / 12, u = 1 - t; fine.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
  }
  var z = pts[pts.length - 1]; s += 'L' + z[0] + ' ' + z[1]; fine.push(z);
  // walk the fine polyline and drop a sample every `step` px
  var xs = [fine[0][0]], ys = [fine[0][1]], ls = [0], done = 0, next = step;
  for (var j = 1; j < fine.length; j++){
    var p = fine[j - 1], q = fine[j], seg = Math.hypot(q[0] - p[0], q[1] - p[1]);
    while (seg && next <= done + seg){ var f = (next - done) / seg; xs.push(p[0] + (q[0] - p[0]) * f); ys.push(p[1] + (q[1] - p[1]) * f); ls.push(next); next += step; }
    done += seg;
  }
  xs.push(z[0]); ys.push(z[1]); ls.push(done);
  return { d: s, xs: xs, ys: ys, ls: ls, total: done };
}
function laneX(s, lane){
  if (lane === 'c') return Math.round(vw / 2);
  if (lane === 'm'){                                                 // middle: the gap between the two columns
    var g = s.querySelector('.lane-grid'), kids = g ? g.children : [], ra = kids[0] && kids[0].getBoundingClientRect();
    for (var i = 1; ra && i < kids.length; i++){ var rb = kids[i].getBoundingClientRect(); if (rb.left > ra.right) return Math.round((ra.right + rb.left) / 2); }
    lane = 'l';
  }
  var w = s.querySelector(':scope > .wrap') || s, r = w.getBoundingClientRect(), cs = getComputedStyle(w);
  return Math.round(lane === 'l' ? r.left + parseFloat(cs.paddingLeft) / 2 : r.right - parseFloat(cs.paddingRight) / 2);
}
function build(){
  if (!active) return;
  vw = document.documentElement.clientWidth; vh = innerHeight; mobile = innerWidth <= 760;
  var mr = main.getBoundingClientRect(), top = mr.top + scrollY, H = main.offsetHeight;
  var Y = function(cy){ return Math.round(cy - mr.top); };            // viewport y → y inside <main>
  route.setAttribute('width', vw); route.setAttribute('height', H); route.setAttribute('viewBox', '0 0 ' + vw + ' ' + H);
  var wps = [], secs = $$('#main > section');
  for (var i = 0; i < secs.length; i++){
    var s = secs[i], lane = s.getAttribute('data-lane');
    if (!lane || s.hidden || !s.getClientRects().length) continue;
    if (lane === 'm' && mobile) lane = s.getAttribute('data-lane-mobile') || 'l';
    var r = s.getBoundingClientRect(), x = laneX(s, lane), km = s.hasAttribute('data-km') ? parseFloat(s.getAttribute('data-km')) : null;
    if (s === hero){                                               // start line sits in the next section's lane
      for (var nx = i + 1; nx < secs.length; nx++){ var ns = secs[nx]; if (ns.getAttribute('data-lane') && !ns.hidden){ if (ns.getAttribute('data-lane') === lane) x = laneX(ns, lane); break; } }
      if (mobile) x = Math.round(vw / 2);                              // phones: start line centred under the hero buttons
      arch.style.left = x + 'px';
      var aB = parseFloat(getComputedStyle(arch).bottom) || 56;
      wps.push({ x: x, y: Y(r.bottom) - aB, km: 0 });
      wps.push({ x: x, y: Y(r.bottom) - 1 });
      continue;
    }
    var band = parseFloat(getComputedStyle(s).paddingTop) || 0;       // empty band at the top: the track turns here
    if (s === finSec){
      wps.push({ x: x, y: Y(r.top) + Math.round(band * .45) });
      wps.push({ x: x, y: Y($('#finishTape').getBoundingClientRect().top), km: RACE_KM });
      break;
    }
    wps.push({ x: x, y: Y(r.top) + Math.max(1, Math.round(band * .5)), km: km });
    wps.push({ x: x, y: Y(r.bottom) - 1 });
  }
  for (var w = 1; w < wps.length; w++) if (wps[w].y <= wps[w - 1].y) wps[w].y = wps[w - 1].y + 1;
  if (wps.length < 2) return;
  // orthogonal: go straight down, then turn 90° and run across in the empty band
  var pts = [[wps[0].x, wps[0].y]];
  for (var n = 1; n < wps.length; n++){
    var a = pts[pts.length - 1], b = wps[n];
    if (Math.abs(b.x - a[0]) > 3) pts.push([a[0], b.y]);
    pts.push([b.x, b.y]);
  }
  var T = track(pts, mobile ? 22 : 56, 5), total = T.total, xs = T.xs, ys = T.ys, ls = T.ls, vs = [0], v = 0;
  paths.forEach(function(p){ p.setAttribute('d', T.d); });
  [pTrace, pGlow].forEach(function(p){ p.setAttribute('pathLength', total.toFixed(1)); });   // dash units = our own length
  for (var l = 1; l < xs.length; l++){ v += Math.abs(ys[l] - ys[l - 1]) + Math.abs(xs[l] - xs[l - 1]) * .35 + .001; vs.push(v); }   // across-runs cost less scroll
  // knots: every waypoint pins scroll-y to a route position
  var kY = [], kV = [], kmA = [], j = 0;
  wps.forEach(function(wp){
    var best = j, bd = 1e9;
    for (var s2 = j; s2 < xs.length; s2++){ var dist = Math.hypot(xs[s2] - wp.x, ys[s2] - wp.y); if (dist < bd){ bd = dist; best = s2; } else if (dist > bd + 400) break; }
    j = best; var YY = wp.y + top;
    if (!kY.length || (YY > kY[kY.length - 1] && vs[best] > kV[kV.length - 1])){ kY.push(YY); kV.push(vs[best]); }
    if (wp.km !== null && wp.km !== undefined) kmA.push({ y: YY, km: wp.km });
  });
  RT = { ok: true, top: top, total: total, xs: xs, ys: ys, ls: ls, vs: vs, kY: kY, kV: kV, kmA: kmA, start: kY[0], end: kY[kY.length - 1] };
  pTrace.style.strokeDasharray = pGlow.style.strokeDasharray = total + ' ' + total;
  // km markers painted on the road
  posts.innerHTML = wps.filter(function(p){ return p.km > 0 && p.km < RACE_KM; }).map(function(p){
    var edge = p.x > vw - 70 ? ' kmpost--r' : p.x < 70 ? ' kmpost--l' : '';      // keep the label on screen
    return '<span class="kmpost' + edge + '" style="left:' + p.x + 'px;top:' + p.y + 'px">' + (p.km === 21.1 ? 'HALF · 21.1K' : p.km + 'K') + '</span>';
  }).join('');
  // water station (15K), running mates (Sunday runs), the dog (training hills)
  var why = $('#why');
  if (why && why.getClientRects().length){ var wr = why.getBoundingClientRect(), wx = laneX(why, why.getAttribute('data-lane') || 'l'); water.style.left = wx + 'px'; water.style.top = Y(wr.top + wr.height * .5) + 'px'; waterY = Y(wr.top + wr.height * .5) + top; }
  var zone = function(id){ var z = $(id); if (!z || !z.getClientRects().length) return [0, 0]; var zr = z.getBoundingClientRect(); return [zr.top + scrollY, zr.bottom + scrollY]; };
  zones.mates = zone('#sundays'); zones.dog = zone('#training');
  measure();
}
function measure(){
  RW = runner.offsetWidth; RH = runner.offsetHeight; SW = stat.offsetWidth; SH = stat.offsetHeight;
}
function at(T){   // route point for a scroll target (document y)
  var kY = RT.kY, kV = RT.kV, n = kY.length, v;
  if (T <= kY[0]) v = kV[0]; else if (T >= kY[n - 1]) v = kV[n - 1];
  else { var i = 0; while (i < n - 2 && T >= kY[i + 1]) i++; v = lerp(kV[i], kV[i + 1], (T - kY[i]) / (kY[i + 1] - kY[i])); }
  var vs = RT.vs, lo = 0, hi = vs.length - 1;
  while (hi - lo > 1){ var m = (lo + hi) >> 1; if (vs[m] < v) lo = m; else hi = m; }
  var f = vs[hi] === vs[lo] ? 0 : clamp((v - vs[lo]) / (vs[hi] - vs[lo]), 0, 1);
  return { x: lerp(RT.xs[lo], RT.xs[hi], f), y: lerp(RT.ys[lo], RT.ys[hi], f), l: lerp(RT.ls[lo], RT.ls[hi], f), dx: RT.xs[Math.min(hi + 2, vs.length - 1)] - RT.xs[Math.max(lo - 2, 0)] };
}
function kmAt(T){
  var A = RT.kmA; if (!A.length) return 0;
  if (T <= A[0].y) return A[0].km; if (T >= A[A.length - 1].y) return A[A.length - 1].km;
  for (var i = 0; i < A.length - 1; i++) if (T < A[i + 1].y) return lerp(A[i].km, A[i + 1].km, (T - A[i].y) / (A[i + 1].y - A[i].y));
  return RACE_KM;
}

/* ---------- Toasts + speech bubble ---------- */
function fmt(ms){ var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function toast(label, msg){
  if (!toasts) return;
  var max = mobile ? 1 : 2; while (toasts.children.length >= max) toasts.firstChild.remove();
  var t = document.createElement('div'); t.className = 'toast'; t.innerHTML = '<b>' + label + '</b><span>' + msg + '</span>';
  toasts.appendChild(t); requestAnimationFrame(function(){ t.classList.add('on'); });
  setTimeout(function(){ t.classList.add('out'); setTimeout(function(){ t.remove(); }, 600); }, 3200);
}
function say(txt, ms, key){ if (!bubble) return; if (key && key === bubbleKey && performance.now() < bubbleUntil) return; bubble.textContent = txt; bubble.classList.add('on'); bubbleUntil = performance.now() + (ms || 1800); bubbleKey = key || txt; }

/* ---------- Finish: run summary, finisher certificate, sharing ---------- */
function hms(min){ var t = Math.round(min * 60), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, ss = t % 60; return h + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); }
function finish(now){
  if (finished) return; finished = true; finArch.classList.add('finished');
  var total = now - (runT0 || T0), sec = total / 1000;
  RUN.total = total;
  RUN.proj = 150 + 270 * (1 - Math.exp(-sec / 300));          // projected marathon: 2:30 (fast scroll) … 7:00 (slow)
  var pk = RUN.proj / RACE_KM; RUN.pace = Math.floor(pk) + ':' + String(Math.round((pk % 1) * 60) % 60).padStart(2, '0') + ' /km';
  toast('42.2K · ' + fmt(total), 'Finisher! Grab your certificate below.'); confetti();
  $('#sumTime').textContent = fmt(total); $('#sumProj').textContent = hms(RUN.proj);
  $('#sumNote').textContent = 'Projected marathon finish ' + hms(RUN.proj) + ' (' + RUN.pace + '), based on how you scrolled. Not bad for a thumb.';
  splitLog.push({ km: RACE_KM, t: now });
  var prev = runT0 || T0;
  RUN.per = SEGS.map(function(sg){ var hit = splitLog.filter(function(x){ return x.km === sg[1]; })[0], t = hit ? hit.t : now, val = Math.sqrt(Math.max(.2, (t - prev) / 1000) / (sg[1] - sg[0])); prev = t; return { label: sg[1] + 'K', v: val }; });
  var mx = Math.max.apply(null, RUN.per.map(function(q){ return q.v; })); RUN.per.forEach(function(q){ q.h = q.v / mx; });
  $('#splits').innerHTML = RUN.per.map(function(q, i){ return '<div><i style="height:' + Math.max(8, q.h * 78) + 'px;animation-delay:' + (i * .08) + 's"></i><span>' + q.label + '</span></div>'; }).join('');
  $('#summary').classList.add('on');
  var nm = $('#name') && $('#name').value.trim(); if (nm && !$('#certName').value) $('#certName').value = nm;
  links(); renderCert();
}
/* Certificate: drawn on a canvas — 1080×1350 (feed post) and 1080×1920 (story) */
var certC = {}, imgsP = null;
function loadImg(src){ return new Promise(function(res){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = function(){ res(null); }; i.src = src; }); }
function fontsP(){ if (!document.fonts || !document.fonts.load) return Promise.resolve(); return Promise.all(['900 120px "Big Shoulders"', '700 30px "JetBrains Mono"'].map(function(f){ return document.fonts.load(f).catch(function(){}); })); }
function drawCert(W, H, imgs){
  var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
  var DF = '"Big Shoulders","Arial Narrow",Impact,sans-serif', MF = '"JetBrains Mono",ui-monospace,monospace', story = H > 1600;
  var name = ($('#certName').value.trim() || 'Scroll runner').toUpperCase(), pad = 84;
  var L = story ? { my: 560, mr: 170, yF: 880, yN: 1010, yT: 1075, yS: 1210, ySp: 1330, spH: 230, yC: 1700 } : { my: 450, mr: 145, yF: 715, yN: 828, yT: 886, yS: 975, ySp: 1060, spH: 110, yC: 0 };
  x.fillStyle = '#0E0C09'; x.fillRect(0, 0, W, H);
  var g = x.createRadialGradient(W * .8, H * .16, 10, W * .8, H * .16, W); g.addColorStop(0, 'rgba(212,68,15,.55)'); g.addColorStop(1, 'rgba(212,68,15,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(246,238,220,.05)'; x.lineWidth = 2; for (var gy = 0; gy < H; gy += 60){ x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
  var top = story ? 140 : 84;
  if (imgs[0]) x.drawImage(imgs[0], pad, top, 400, 400 * imgs[0].height / imgs[0].width);
  x.fillStyle = '#BDB199'; x.font = '700 26px ' + MF; x.textAlign = 'right'; x.fillText(BIB, W - pad, top + 44);
  x.textAlign = 'center';
  var mx2 = W / 2, my = L.my, mr = L.mr;
  x.strokeStyle = '#D4440F'; x.lineWidth = 36; x.lineCap = 'butt'; x.beginPath(); x.moveTo(mx2 - 125, my - mr - 120); x.lineTo(mx2 - 34, my - mr + 14); x.moveTo(mx2 + 125, my - mr - 120); x.lineTo(mx2 + 34, my - mr + 14); x.stroke();
  x.fillStyle = '#F2A341'; x.beginPath(); x.arc(mx2, my, mr, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(14,12,9,.35)'; x.lineWidth = 5; x.beginPath(); x.arc(mx2, my, mr * .78, 0, Math.PI * 2); x.stroke();
  if (imgs[1]){ var iw = mr * .5, ih = iw * imgs[1].height / imgs[1].width; x.save(); x.globalAlpha = .9; x.filter = 'brightness(0)'; x.drawImage(imgs[1], mx2 - iw / 2, my - mr * .7, iw, ih); x.restore(); }
  x.fillStyle = '#0E0C09'; x.font = '900 ' + Math.round(mr * .62) + 'px ' + DF; x.fillText('42.2', mx2, my + mr * .58);
  x.fillStyle = '#F2A341'; x.font = '900 ' + (story ? 170 : 150) + 'px ' + DF; x.fillText('FINISHER', mx2, L.yF);
  var fs = story ? 120 : 104; x.font = '900 ' + fs + 'px ' + DF; while (x.measureText(name).width > W - pad * 2 && fs > 40){ fs -= 4; x.font = '900 ' + fs + 'px ' + DF; }
  x.fillStyle = '#F6EEDC'; x.fillText(name, mx2, L.yN);
  x.fillStyle = '#BDB199'; x.font = '700 24px ' + MF; x.fillText('42.2K SCROLL MARATHON · PUNJAI PULIAMPATTI, ERODE', mx2, L.yT);
  [['SCROLL TIME', fmt(RUN.total)], ['PROJECTED', hms(RUN.proj)], ['PACE', RUN.pace.replace(' /km', '')]].forEach(function(st, i){
    var cxx = W * (i * 2 + 1) / 6; x.fillStyle = '#BDB199'; x.font = '700 22px ' + MF; x.fillText(st[0], cxx, L.yS);
    x.fillStyle = '#F6EEDC'; x.font = '900 ' + (story ? 76 : 64) + 'px ' + DF; x.fillText(st[1], cxx, L.yS + (story ? 78 : 66));
  });
  var n = RUN.per.length || 7, bw = (W - pad * 2) / n, base = L.ySp + L.spH;
  RUN.per.forEach(function(q, i){ var bh = Math.max(10, q.h * (L.spH - 34)); x.fillStyle = '#F2A341'; x.fillRect(pad + i * bw + 10, base - 30 - bh, bw - 20, bh); x.fillStyle = '#8F8573'; x.font = '700 ' + (story ? 20 : 17) + 'px ' + MF; x.fillText(q.label, pad + i * bw + bw / 2, base - 4); });
  if (story){ x.fillStyle = '#F6EEDC'; x.font = '900 72px ' + DF; x.fillText('NOW COME RUN', mx2, L.yC); x.fillStyle = '#F2A341'; x.fillText('THE REAL ONE.', mx2, L.yC + 78); }
  x.fillStyle = '#D4440F'; x.fillRect(0, H - 130, W, 130);
  x.fillStyle = '#FFFFFF'; x.textAlign = 'left'; x.font = '900 42px ' + DF; x.fillText('RUN TOGETHER. RISE TOGETHER.', pad, H - 70);
  x.font = '700 22px ' + MF; x.fillText('@punjaicapitals · ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), pad, H - 32);
  x.textAlign = 'right'; x.fillText('42.2K FINISHER', W - pad, H - 32);
  return c;
}
function renderCert(){
  if (!imgsP) imgsP = Promise.all([loadImg('assets/pcs-wordmark.png'), loadImg('assets/pcs-runner-icon.png')]);
  return Promise.all([imgsP, fontsP()]).then(function(r){
    certC.post = drawCert(1080, 1350, r[0]); certC.story = drawCert(1080, 1920, r[0]);
    try { $('#certPrev').src = certC.post.toDataURL('image/jpeg', .72); } catch (e){ $('#certPrev').alt = 'Preview appears once the site is online'; }
  });
}
function certMsg(t){ $('#certMsg').textContent = t; }
function blobOf(kind){ return new Promise(function(res, rej){ try { certC[kind].toBlob(function(b){ if (b) res(b); else rej(new Error('blob')); }, 'image/png'); } catch (e){ rej(e); } }); }
function fname(kind){ return 'punjai-capitals-42k-finisher-' + kind + '.png'; }
function download(kind, msg){
  renderCert().then(function(){ return blobOf(kind); }).then(function(b){
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname(kind); document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 2000); certMsg(msg || 'Saved ' + fname(kind));
  }).catch(function(){ certMsg('Your browser blocked the image. Open the live site in Chrome or Safari and try again.'); });
}
function shareText(){ return 'I just finished the 42.2K scroll marathon with Punjai Capitals Sports Club. Projected finish ' + hms(RUN.proj) + '. Run together. Rise together.'; }
function pageUrl(){ return /^https?:/.test(location.href) ? location.href.split('#')[0] : 'https://www.instagram.com/punjaicapitals'; }
function shareImg(kind, fallback){
  renderCert().then(function(){ return blobOf(kind); }).then(function(b){
    var file = new File([b], fname(kind), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: 'Punjai Capitals 42.2K finisher', text: shareText() + ' ' + pageUrl() });
    download(kind, fallback);
  }).catch(function(e){ if (e && e.name === 'AbortError') return; download(kind, fallback); });
}
function links(){
  var t = encodeURIComponent(shareText()), u = encodeURIComponent(pageUrl());
  $('#runShX').href = 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u + '&hashtags=PunjaiCapitals,ScrollMarathon';
  $('#runShWa').href = 'https://wa.me/?text=' + t + '%20' + u;
  $('#runShFb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + u;
}
$('#dlPost').addEventListener('click', function(){ download('post'); });
$('#dlStory').addEventListener('click', function(){ download('story'); });
$('#certShare').addEventListener('click', function(){ shareImg('post', 'Image saved. Attach it to your post on any app.'); });
$('#runShIg').addEventListener('click', function(){ shareImg('story', 'Story image saved. Open Instagram › Your story › pick the image.'); });
['runShX', 'runShWa', 'runShFb'].forEach(function(id){ $('#' + id).addEventListener('click', function(){ links(); certMsg('Tip: download the post image too and attach it.'); }); });
var nameT; $('#certName').addEventListener('input', function(){ clearTimeout(nameT); nameT = setTimeout(renderCert, 250); });
function confetti(){
  if (REDUCE) return;
  var c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c);
  var x = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight, cols = ['#D4440F', '#F27235', '#FF9A5C', '#FFD3B0', '#F6EEDC', '#F2A341'];
  var ps = []; for (var i = 0; i < (mobile ? 90 : 160); i++) ps.push({ x: W / 2, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 3, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, w: 6 + Math.random() * 7, h: 3 + Math.random() * 4, c: cols[i % cols.length] });
  var t0 = performance.now();
  (function f(now){ var e = now - t0; x.clearRect(0, 0, W, H);
    ps.forEach(function(p){ p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - e / 2600); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); });
    if (e < 2600) requestAnimationFrame(f); else c.remove(); })(t0);
}

/* ---------- Main loop ---------- */
function loop(now){
  if (!active) return;
  var dt = Math.min((now - lastTime) / 1000, .05); lastTime = now;
  var sy = scrollY, tS = now / 1000;
  if (RT.ok){
    var anchor = vh * (mobile ? .62 : .58);
    runner.style.opacity = ready ? 1 : 0;
    if (ready && !goSaid){ goSaid = true; say("Let's go! Scroll to run.", 2400, 'go'); }

    // 1) the runner waits on the start line, then follows the track as you scroll
    var target = clamp(sy + anchor, RT.start, RT.end);
    if (!cur){ cur = target; prevY = cur; }                            // no fake speed burst on the first frame
    cur += (target - cur) * (REDUCE ? 1 : 1 - Math.exp(-dt * 4.2));
    var p = at(cur), dl = p.l - prevL; prevL = p.l;
    var vy = (cur - prevY) / Math.max(dt, 1e-3); prevY = cur;
    speed = lerp(speed, Math.abs(vy), 1 - Math.exp(-dt * 6));
    var moving = speed > 25, atStart = cur <= RT.start + 4, atEnd = cur >= RT.end - 2;
    if (moving && !runT0 && !atStart){ runT0 = now; lastSplit = now; }
    // scrolling up = a calm cool-down jog, seen from behind
    if (vy < -40){ upT += dt; back = true; } else if (vy > 40){ upT = 0; back = false; }
    if (back && upT > .8 && now - coolSaid > 15000 && !atStart){ coolSaid = now; say('Cool-down jog. Take it easy!', 2000, 'cool'); }
    if (vy < -2600 && now - wwSaid > 20000){ wwSaid = now; say('Wrong way, captain!', 1400, 'ww'); }
    var dogOn = cur > zones.dog[0] + vh * .1 && cur < zones.dog[1] - vh * .2 && vy > 0;
    if (!REDUCE) phase += Math.abs(dl) * (dogOn ? .09 : back ? .05 : .065);
    amp = lerp(amp, REDUCE ? 0 : clamp(speed / 520, 0, 1) * (back ? .7 : 1), 1 - Math.exp(-dt * 5));
    idleT = moving ? 0 : idleT + dt;
    watchW = lerp(watchW, idleT > 2.2 && !atStart && !finished ? 1 : 0, 1 - Math.exp(-dt * 4));
    cheerW = lerp(cheerW, atEnd ? 1 : 0, 1 - Math.exp(-dt * 4));
    var warm = atStart && !moving && !REDUCE && ready ? 1 : 0;
    pose(R, phase, amp, watchW, cheerW, warm, tS, back);
    // lean into the 90° turns
    var hz = clamp(p.dx / 14, -1, 1) * (back ? -1 : 1) * Math.min(1, amp * 2);
    lean = lerp(lean, hz * 10, 1 - Math.exp(-dt * 8));
    var rx = p.x - RW / 2, ry = p.y - RH * .87;                     // page coordinates inside <main>
    runner.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    R.svg.style.transform = 'rotate(' + lean.toFixed(1) + 'deg)';
    bubble.style.transform = 'translate3d(' + Math.min(p.x + RW * .42, vw - 230).toFixed(1) + 'px,' + (ry - 16).toFixed(1) + 'px,0)';
    var off = RT.total - p.l; pTrace.style.strokeDashoffset = off; pGlow.style.strokeDashoffset = off;
    if (!waterDone && Math.abs(cur - waterY) < 80){ waterDone = true; water.classList.add('splash'); say('Water station! Grab and go.', 2000); }
    var inMates = cur > zones.mates[0] + vh * .15 && cur < zones.mates[1];
    mates.forEach(function(m, i){
      if (!m.host.offsetWidth) return;
      m.host.classList.toggle('on', inMates); if (!inMates) return;
      var q = at(cur - (i + 1) * (mobile ? 42 : 60)), mw = m.host.offsetWidth, mh = m.host.offsetHeight;
      pose(m, phase + (i + 1) * 1.3, amp, 0, 0, 0, tS, back);
      m.host.style.transform = 'translate3d(' + (q.x - mw / 2).toFixed(1) + 'px,' + (q.y - mh * .87).toFixed(1) + 'px,0)';
    });
    if (inMates && vy > 60) say('Sunday group run! Mind if we join?', 1600, 'mates');
    dog.classList.toggle('on', dogOn);
    if (dogOn){ var dq = at(cur - (mobile ? 64 : 100)); dog.style.transform = 'translate3d(' + (dq.x - dog.offsetWidth / 2).toFixed(1) + 'px,' + (dq.y - dog.offsetHeight * .9).toFixed(1) + 'px,0)'; if (!dogSaid){ dogSaid = true; say('Is that… a dog?!', 2200); } }
    if (now > bubbleUntil) bubble.classList.remove('on');

    // 2) stats ride above the runner (page coordinates); parked bottom-right before the start and at the finish
    var km = kmAt(cur), follow = ready && !atEnd && !atStart;
    stat.classList.toggle('off', !ready);
    if (follow){
      var tx2 = clamp(p.x - SW / 2, 8, vw - SW - 8), ty2 = ry - SH - 10;
      if (stat.classList.contains('dock')){ stat.classList.remove('dock'); sx = tx2; sy2 = ty2; }
      var kk = REDUCE ? 1 : 1 - Math.exp(-dt * 10);
      sx = lerp(sx, tx2, kk); sy2 = lerp(sy2, ty2, kk);
      stat.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy2.toFixed(1) + 'px,0)';
    } else if (!stat.classList.contains('dock')){ stat.classList.add('dock'); stat.style.transform = ''; }
    if (now - tick > 100){
      tick = now; statKm.textContent = km.toFixed(1); ring.style.strokeDashoffset = (113.1 * (1 - km / RACE_KM)).toFixed(1);
      statTime.textContent = fmt(runT0 ? (finished ? RUN.total : now - runT0) : 0);
      if (back && moving){ statPace.textContent = 'COOL-DOWN'; statPace.className = 'stat__pace walk'; }
      else if (moving && !atEnd){
        var pace = clamp(10.2 - speed / 210, 2.9, 9.5), mm = Math.floor(pace), ss = Math.round((pace - mm) * 60); if (ss === 60){ mm++; ss = 0; }
        statPace.textContent = mm + ':' + String(ss).padStart(2, '0') + ' /km'; statPace.className = 'stat__pace' + (pace < 3.7 ? ' fire' : pace > 7.6 ? ' walk' : '');
        slowT = pace > 7.8 && amp > .12 ? slowT + .1 : 0;
        if (pace < 3.7) say('3:30 /km — easy, Usain!', 1500, 'fire');
        else if (slowT > 1.2){ say('Walk break? Totally allowed.', 1800, 'walk'); slowT = -6; }
      } else { statPace.textContent = '--:-- /km'; statPace.className = 'stat__pace'; }
      CPS.forEach(function(c){ if (!c.done && km >= c.km - .01){ c.done = true; toast(c.km + 'K SPLIT · ' + fmt(now - (lastSplit || now)), c.msg); splitLog.push({ km: c.km, t: now }); lastSplit = now; } });
    }
    if (atEnd && ready) finish(now);
  }
  raf = requestAnimationFrame(loop);
}

/* ---------- Start / stop ---------- */
function listen(t, ev, fn, opt){ t.addEventListener(ev, fn, opt); cleanups.push(function(){ t.removeEventListener(ev, fn, opt); }); }
function loadFont(){
  if ($('#runFont')) return;
  var l = document.createElement('link'); l.id = 'runFont'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@800;900&display=swap';
  document.head.appendChild(l);
}
function setCta(on){
  cta.setAttribute('aria-pressed', String(on));
  $('.runcta__t', cta).textContent = on ? 'Scroll down to run · tap to end' : 'Start the 42.2K scroll run';
  $('.runcta__tag', cta).textContent = on ? 'End' : 'Play';
}
function flyIn(){   // the hero logo runs straight to the START line and becomes the runner
  var src = $('#heroIcon'), ir = src.getBoundingClientRect();
  if (!RT.ok || REDUCE || !ir.width){ ready = true; return; }
  var p = at(clamp(scrollY + vh * (mobile ? .62 : .58), RT.start, RT.end));
  var w = RW * 1.25, h = w * ir.height / ir.width;                                   // land feet-first where the runner stands
  var tl = p.x - w / 2, tt = p.y + RT.top - scrollY - RH * .87 + RH - h;
  var fly = document.createElement('img'); fly.src = src.src; fly.alt = ''; fly.className = 'run-flyer';
  fly.style.left = ir.left + 'px'; fly.style.top = ir.top + 'px'; fly.style.width = ir.width + 'px'; fly.style.height = ir.height + 'px';
  document.body.appendChild(fly); flyer = fly;
  var s = w / ir.width, dx = tl - ir.left, dy = tt - ir.top;
  var anim = fly.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: 'translate(' + (dx * .5) + 'px,' + (dy * .5 - 80) + 'px) scale(' + lerp(1, s, .5) + ') rotate(-10deg)', offset: .55 },
    { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }
  ], { duration: 560, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
  anim.onfinish = function(){ ready = true; fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = function(){ fly.remove(); if (flyer === fly) flyer = null; }; };
}
function start(){
  if (active) return; active = true;
  vw = document.documentElement.clientWidth; vh = innerHeight; mobile = innerWidth <= 760;
  reset(); loadFont();
  body.classList.add('run'); finSec.hidden = false;
  mount(); setCta(true);
  build(); flyIn();
  var rb; var rebuild = function(){ clearTimeout(rb); rb = setTimeout(build, 120); };
  var lastW = vw;   // phones resize the height when the address bar slides; only a width change needs a new track
  listen(window, 'resize', function(){ vh = innerHeight; var w = document.documentElement.clientWidth; if (w !== lastW){ lastW = w; rebuild(); } });
  // re-measure only when the page height really changes (images, fonts, opened FAQ…), not on the observer's first call
  if ('ResizeObserver' in window){
    var lastH = main.offsetHeight;
    var ro = new ResizeObserver(function(){ var h = main.offsetHeight; if (Math.abs(h - lastH) > 2){ lastH = h; rebuild(); } });
    ro.observe(main); cleanups.push(function(){ ro.disconnect(); });
  }
  var io = new IntersectionObserver(function(es){ es.forEach(function(en){ finSec.classList.toggle('cheer', en.isIntersecting); }); });
  io.observe(finSec); cleanups.push(function(){ io.disconnect(); });
  var form = $('#joinForm');
  if (form){
    listen(form, 'focusin', function(ev){ if (ev.target.matches('input,select,textarea')) body.classList.add('typing'); });
    listen(form, 'focusout', function(){ setTimeout(function(){ if (!form.contains(document.activeElement)) body.classList.remove('typing'); }, 50); });
  }
  var toTop = $('#toTop'); if (toTop) listen(toTop, 'click', function(){ say('Cool-down jog!', 2600, 'cool'); });
  listen(runner, 'click', function(){ R.hop.classList.remove('hi5'); void R.hop.getBoundingClientRect(); R.hop.classList.add('hi5'); say(['High five!', 'Run with us!', 'Every pace welcome!'][Math.floor(Math.random() * 3)], 1600); });
  listen(exitBtn, 'click', stop);
  toast('0.0K · START', 'On your marks. Scroll down to run the 42.2K.');
  raf = requestAnimationFrame(loop);
}
function stop(){
  if (!active) return; active = false;
  cancelAnimationFrame(raf);
  cleanups.forEach(function(fn){ fn(); }); cleanups = [];
  unmount();
  body.classList.remove('run', 'typing');
  finSec.hidden = true; finSec.classList.remove('cheer'); finArch.classList.remove('finished'); $('#summary').classList.remove('on');
  setCta(false); cta.focus({ preventScroll: true });
}
cta.addEventListener('click', function(){ if (active) stop(); else start(); });
})();
