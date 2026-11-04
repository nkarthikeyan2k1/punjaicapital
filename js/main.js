/* =====================================================================
   DRAFT 5A — loader, hero logo, menu, 4-step registration.
   ===================================================================== */
(function(){
'use strict';
var SCRIPT_URL = 'PASTE_WEB_APP_URL_HERE';   // Google Apps Script web app URL
var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#year').textContent = new Date().getFullYear();
var BIB = 'PCSC-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));

/* ---------- Mobile menu ---------- */
var sheet = $('#sheet'), menuBtn = $('#menuBtn');
function menu(open){ sheet.classList.toggle('open', open); document.body.classList.toggle('menu-open', open); sheet.setAttribute('aria-hidden', String(!open)); menuBtn.setAttribute('aria-expanded', String(open)); if (open) $('#sheetClose').focus(); }
addEventListener('keydown', function(e){ if (e.key === 'Escape' && sheet.classList.contains('open')){ menu(false); menuBtn.focus(); } });
menuBtn.addEventListener('click', function(){ menu(true); });
$('#sheetClose').addEventListener('click', function(){ menu(false); menuBtn.focus(); });
$$('#sheet a').forEach(function(a){ a.addEventListener('click', function(){ menu(false); }); });

/* ---------- Loader → logo flies into the hero mark, then floats gently ---------- */
var pre = $('#pre'), badge = $('#heroMark'), badgeWave = $('#heroWave'), badgeIcon = $('#heroIcon'), revealed = false;
function float(){
  if (REDUCE) return;
  (function f(now){ var t = now / 1000; badgeWave.style.transform = 'translate3d(0,' + (Math.sin(t * 1.6) * 5).toFixed(1) + 'px,0) rotate(' + (Math.sin(t * 1.6 + .9) * 2.5).toFixed(2) + 'deg)'; requestAnimationFrame(f); })(performance.now());
}
function reveal(){
  if (revealed) return; revealed = true;
  document.body.classList.add('loaded');
  var icon = $('#preIcon'), ir = icon.getBoundingClientRect(), tr = badgeIcon.getBoundingClientRect();
  if (REDUCE || !ir.width || !tr.width || tr.bottom < 0 || tr.top > innerHeight){ pre.classList.add('done'); badge.classList.add('on'); float(); return; }
  var fly = icon.cloneNode(); fly.className = 'flyer'; fly.removeAttribute('id');
  fly.style.left = ir.left + 'px'; fly.style.top = ir.top + 'px'; fly.style.width = ir.width + 'px'; fly.style.height = ir.height + 'px';
  document.body.appendChild(fly); icon.style.visibility = 'hidden'; pre.classList.add('done');
  var s = tr.width / ir.width, dx = tr.left - ir.left, dy = tr.top - ir.top;
  var anim = fly.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: 'translate(' + (dx * .55) + 'px,' + (dy * .55 - 50) + 'px) scale(' + (1 + (s - 1) * .55) + ') rotate(-6deg)', offset: .6 },
    { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }
  ], { duration: 1000, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
  setTimeout(function(){ badge.classList.add('on'); }, 650);
  anim.onfinish = function(){ fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = function(){ fly.remove(); }; float(); };
}
$('#preSkip').addEventListener('click', reveal);
setTimeout(reveal, REDUCE ? 200 : 1950);

/* ---------- Carousels: dots under every .carousel (scroll, swipe or tap a dot) ---------- */
$$('.carousel').forEach(function(c){
  var dots = document.createElement('div'), stops = [], raf = 0;
  dots.className = 'dots'; dots.setAttribute('role', 'group'); dots.setAttribute('aria-label', (c.getAttribute('aria-label') || 'Carousel') + ' · pages');
  c.parentNode.insertBefore(dots, c.nextSibling);
  function setup(){
    var cols = [];
    Array.prototype.forEach.call(c.children, function(k){ if (cols.indexOf(k.offsetLeft) < 0) cols.push(k.offsetLeft); });
    cols.sort(function(a, b){ return a - b; });
    var x0 = cols[0] || 0, w = c.clientWidth, per = cols.filter(function(x){ return x - x0 < w - 4; }).length || 1;
    var max = c.scrollWidth - w, pages = Math.ceil(cols.length / per);
    stops = []; for (var i = 0; i < pages; i++) stops.push(Math.min(cols[i * per] - x0, max));
    dots.hidden = pages < 2 || max < 4;
    dots.innerHTML = stops.map(function(_, i){ return '<button type="button" aria-label="Page ' + (i + 1) + ' of ' + pages + '"></button>'; }).join('');
    $$('button', dots).forEach(function(b, i){ b.addEventListener('click', function(){ c.scrollTo({ left: stops[i], behavior: REDUCE ? 'auto' : 'smooth' }); }); });
    sync();
  }
  function sync(){
    raf = 0; var x = c.scrollLeft, max = c.scrollWidth - c.clientWidth, cur = 0, best = 1e9;
    stops.forEach(function(s, i){ var d = Math.abs(s - x); if (d < best){ best = d; cur = i; } });
    if (x >= max - 4) cur = stops.length - 1;
    $$('button', dots).forEach(function(b, i){ b.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
  }
  c.addEventListener('scroll', function(){ if (!raf) raf = requestAnimationFrame(sync); }, { passive: true });
  var t; addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(setup, 150); });
  addEventListener('load', setup);
  setup();
});

/* ---------- Share links (after registering) ---------- */
function pageUrl(){ return /^https?:/.test(location.href) ? location.href.split('#')[0] : 'https://www.instagram.com/punjaicapitals'; }
function links(){
  var t = encodeURIComponent('I just joined Punjai Capitals Sports Club, a free running and cycling club in Punjai Puliampatti. Come run with us!'), u = encodeURIComponent(pageUrl());
  $('#shWa').href = 'https://wa.me/?text=' + t + '%20' + u;
  $('#shX').href = 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u + '&hashtags=PunjaiCapitals';
  $('#shFb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + u;
}
links();

/* ---------- Registration: 4 steps → Google Apps Script ---------- */
var form = $('#joinForm'), steps = $$('.step', form), stepN = 1, result = $('#result');
var titles = ['About you', 'Emergency contact', 'Health & kit', 'One last thing'], nexts = ['Next: emergency contact', 'Next: health & kit', 'Next: final step', 'Submit registration'];
var v = function(i){ return $('#' + i).value.trim(); };
var today = new Date(); $('#dob').max = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
['phone', 'ecPhone'].forEach(function(id){ $('#' + id).addEventListener('input', function(){ this.value = this.value.replace(/\D/g, '').slice(0, 10); }); });
var REQ = {
  1: [['name', 'Please enter your full name.'], ['phone', 'Enter a valid 10-digit mobile number.', 'tel'], ['dob', 'Please select your date of birth.'], ['gender', 'Please select your gender.'], ['email', 'Enter a valid email or leave it empty.', 'email'], ['area', 'Please enter your area or village.'], ['occupation', 'Please select your occupation.'], ['level', 'Please select your experience.']],
  2: [['ecName', 'Please enter the emergency contact name.'], ['ecRel', 'Please select the emergency contact relationship.'], ['ecPhone', 'Enter a valid 10-digit emergency contact number.', 'tel']],
  3: [['blood', 'Please select your blood group.'], ['jersey', 'Please select your jersey size.'], ['healthDetails', 'Please mention your health condition in the details box.', 'health']],
  4: [['heard', 'Please tell us how you heard about us.'], ['fit', 'Please tick the fitness declaration.', 'check'], ['consent', 'Please tick the consent box.', 'check']]
};
function check(n){
  $$('[aria-invalid]', form).forEach(function(x){ x.removeAttribute('aria-invalid'); });
  var list = REQ[n];
  for (var i = 0; i < list.length; i++){
    var id = list[i][0], msg = list[i][1], kind = list[i][2], el = $('#' + id), bad;
    if (kind === 'tel') bad = !/^[6-9]\d{9}$/.test(el.value);
    else if (kind === 'email') bad = !!v('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'));
    else if (kind === 'health') bad = $('#health').selectedIndex === 1 && !v('healthDetails');
    else if (kind === 'check') bad = !el.checked;
    else bad = !v(id);
    if (bad){ result.className = 'err'; result.textContent = msg; el.setAttribute('aria-invalid', 'true'); el.focus(); return false; }
  }
  result.className = ''; result.textContent = ''; return true;
}
function go(n){
  stepN = n; steps.forEach(function(s){ s.classList.toggle('on', +s.getAttribute('data-step') === n); });
  $$('.track span').forEach(function(s, i){ s.classList.toggle('on', i < n); });
  $('#stepTitle').textContent = titles[n - 1]; $('#stepCount').textContent = 'STEP ' + n + ' OF 4 · * REQUIRED';
  $('#backBtn').disabled = n === 1; $('#nextBtn').textContent = nexts[n - 1];
  var first = $('.step.on input, .step.on select', form); if (first) first.focus({ preventScroll: true });
}
$('#backBtn').addEventListener('click', function(){ if (stepN > 1) go(stepN - 1); });
$('#nextBtn').addEventListener('click', function(){ if (!check(stepN)) return; if (stepN < 4) go(stepN + 1); else submit(); });
form.addEventListener('submit', function(e){ e.preventDefault(); $('#nextBtn').click(); });
function success(n){
  $$('.step,.form__foot,.track,.step__head', form).forEach(function(x){ x.style.display = 'none'; });
  $('#doneTitle').textContent = "You're in, " + n.split(' ')[0] + '!';
  $('#bib').textContent = BIB;
  var dc = $('#doneCard'); dc.classList.add('on'); dc.focus();
  document.dispatchEvent(new CustomEvent('pcs:registered', { detail: { name: n, bib: BIB } }));
}
function submit(){
  var n = v('name'), btn = $('#nextBtn');
  if (SCRIPT_URL.indexOf('PASTE') === 0){ result.className = ''; result.textContent = 'Demo mode: the form works, but it is not connected to the Google Sheet yet.'; success(n); return; }
  btn.disabled = true; btn.textContent = 'Submitting…'; result.className = ''; result.textContent = 'Submitting your registration…';
  var payload = { name: n, mobile: $('#phone').value, dob: $('#dob').value, gender: v('gender'), email: v('email'), area: v('area'), occupation: v('occupation'), level: v('level'), strava: v('strava'), ecName: v('ecName'), ecRel: v('ecRel'), ecPhone: $('#ecPhone').value, blood: v('blood'), health: v('health'), healthDetails: v('healthDetails'), jersey: v('jersey'), heard: v('heard'), message: v('message'), fit: 'Yes' };
  fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
    .then(function(x){ return x.json(); })
    .then(function(j){ if (!j || !j.ok) throw new Error('fail'); result.textContent = ''; success(n); form.reset(); })
    .catch(function(){ result.className = 'err'; result.textContent = 'Could not submit. Please check your connection and try again, or message the club on Instagram.'; })
    .then(function(){ btn.disabled = false; btn.textContent = nexts[3]; });
}
})();

/* ---------- Gobi race-day reel ---------- */
(function(){
  var v = document.getElementById('gobiReel'), b = document.getElementById('reelBtn'); if (!v || !b) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches, user = null;
  function ui(){ var on = !v.paused; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.querySelector('span').textContent = on ? 'Pause' : 'Play';
    b.querySelector('path').setAttribute('d', on ? 'M3 2H6V12H3ZM8 2H11V12H8Z' : 'M3 2V12L12 7Z'); }
  v.addEventListener('play', ui); v.addEventListener('pause', ui);
  b.addEventListener('click', function(){ if (v.paused){ user = true; v.play().catch(function(){}); } else { user = false; v.pause(); } });
  if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ es.forEach(function(e){
    if (e.isIntersecting){ if (!RM && user !== false){ v.preload = 'auto'; v.play().catch(function(){}); } } else if (!v.paused) v.pause();
  }); }, { threshold: .35 }).observe(v);
})();
