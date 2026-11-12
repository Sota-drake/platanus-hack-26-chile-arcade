// RAM RUNNER - Platanus Hack 26
// Endless 3-track runner en San Francisco. El precio de la RAM sube, tu puntaje tambien.

const W = 800, H = 600, HZ = 210, GY = 540, LX = 170, BL = 1.5, NB = 26;
const SK = 'ram-runner-scores-v1', MAXN = 8, BOSS_T = 14, FOG = 0xf0dcc8;

// DO NOT replace existing keys - they match the physical arcade cabinet wiring.
const CABINET_KEYS = {
  P1_U: ['w'], P1_D: ['s'], P1_L: ['a'], P1_R: ['d'],
  P1_1: ['u', ' '], P1_2: ['i'], P1_3: ['o'], P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
  P2_U: ['ArrowUp'], P2_D: ['ArrowDown'], P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
  P2_1: ['r'], P2_2: ['t'], P2_3: ['y'], P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
  START1: ['Enter'], START2: ['2'],
};

function nk(k) { return typeof k !== 'string' || !k ? '' : k === ' ' ? 'space' : k.toLowerCase(); }
const KB = {};
for (const [a, ks] of Object.entries(CABINET_KEYS)) for (const k of ks) KB[nk(k)] = a;

const GR = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ0123', '456789-<>'];
// clase de cada obstaculo: 0 bajo (salto), 1 alto (deslizar), 2 muro (cambiar de carril)
const CL = [0, 1, 2, 2, 1, 0];
const WHY = ['Te chocaste con un robot de reparto', 'El letrero LED te dej\u00f3 sin cabeza', 'Te arroll\u00f3 un cable car'];
const BS = [
  ['\u00a1ME ECHARON DE MI EMPRESA!', 'PERO T\u00da TE VIENES CONMIGO.', 'YO SOLO QUER\u00cdA PASARLO BIEN UN RATO...', '\u00a1SABES LO DIF\u00cdCIL QUE ES HACER ESTOS CHIPS!', 'ESTO NO ES UNA BURBUJA, ES UN ECOSISTEMA.', 'SI ME VOY, ME LLEVO TODA LA RAM.'],
  ['\u00a1VOLV\u00cd! ME RECONTRATARON... Y ME ECHARON.', 'PERO T\u00da SIGUES AC\u00c1, \u00bfNO?', 'ESTOS CHIPS NO SE HACEN SOLOS.', 'LA RAM SE ACABA. TODO SE ACABA.', 'FUE UNA BURBUJA... \u00bfY QU\u00c9?', 'ME VOY CON OTRA IA... DOS VECES.'],
];
const BOUT = ['ME VOY... A FUNDAR OTRA EMPRESA.', 'VOLVER\u00c9. SIEMPRE VUELVO.'];
const DIST = ['MARKET STREET', 'SOMA', 'MISSION BAY', 'HAYES VALLEY', 'THE EMBARCADERO', 'NOB HILL', 'PRESIDIO'];
const HPAL = [0xf2a7b8, 0x8fd3e8, 0xf7dc7a, 0xa8dca0, 0xd9b3f0, 0xf4a06a, 0xf6f0e0];

const PA = ['..rrrr..', '.rrrrrr.', '.hseseh.', '..ssss..', '.hhhhhh.', 'shhhhhhs', 's.hhhh.s', '..hhhh..'];
const PP = { r: 0xe84a4a, h: 0xff8a2a, s: 0xffc9a0, e: 0x111111, l: 0x2a2f8f };
const BOSS = ['...gggg...', '..gggggg..', '..ssssss..', '..kkskkk..', '..ssssss..', '...smms...', '.jjjjjjjj.', 'jjxjjjjxjj', 'jjxjjjjxjj', 'sjjjjjjjjs', '.jj....jj.', '.jj....jj.'];
const BOSS2 = ['...gggg...', '..gggggg..', '..ssssss..', '..kkskkk..', 's.ssssss.s', 'j..smms..j', 'jjjjjjjjjj', 'jjxjjjjxjj', 'jjxjjjjxjj', '.jjjjjjjj.', '.jj....jj.', '.jj....jj.'];
const BP = { g: 0x9aa0b4, s: 0xe9b48c, k: 0x0a0a0a, m: 0xb04040, j: 0x15151c, x: 0x5a5a78 };

let Z, g, R, ph = 'menu', scores = [], nick = '', pr = {}, hd = {}, cur = { r: 0, c: 0, k: -1 };
let ban, hS, hR, hT, hN, pauseTx, bossTx, bossLb, nickTx, lbM, lbO, ovT, ovR, ovS, ovP;
let txM = [], txN = [], txO = [], txH = [], gridT = [], mu = false, ms = 0;

new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, parent: 'game-root', backgroundColor: '#3a9bf0',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: { create, update },
});

// ---------- helpers ----------
const sc = (z) => 1 / (1 + z * 0.32);
const sy = (z) => HZ + (GY - HZ) * sc(z);
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const hs = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const ln = (e) => (e.o === 2 ? 3 : 0);
function off(y) { return R.wb ? R.wb * Math.sin(R.t * 4 + y * 0.04) * ((y - HZ) / (GY - HZ)) : 0; }
function X(l, z) { return 400 + l * LX * sc(z) + off(sy(z)); }
function mix(a, b, t) {
  const r = (a >> 16 & 255) * (1 - t) + (b >> 16 & 255) * t, gg = (a >> 8 & 255) * (1 - t) + (b >> 8 & 255) * t, bl = (a & 255) * (1 - t) + (b & 255) * t;
  return ((r | 0) << 16) | ((gg | 0) << 8) | (bl | 0);
}
const fg = (c, z) => mix(c, FOG, Math.min(0.8, Math.max(0, z) / 42));
function bx(x, y, w, h, c, a = 1) { g.fillStyle(c, a); g.fillRect(x, y, w, h); }
function art(r, p, x, y, ps, k = 1) {
  for (let i = 0; i < r.length; i++) for (let j = 0; j < r[i].length; j++) {
    const c = r[i][j];
    if (c !== '.') { g.fillStyle(p[c]); g.fillRect(x + j * ps, y + i * ps * k, ps, ps * k + 0.5); }
  }
}
// banda en el suelo
function band(a, b, z0, z1, c, al = 1) {
  z0 = Math.max(z0, -2); z1 = Math.max(z1, -2); if (z1 <= z0) return;
  const y0 = sy(z0), y1 = sy(z1), xa0 = X(a, z0), xb0 = X(b, z0), xa1 = X(a, z1), xb1 = X(b, z1);
  g.fillStyle(fg(c, z0), al);
  g.fillTriangle(xa0, y0, xb0, y0, xb1, y1);
  g.fillTriangle(xa0, y0, xb1, y1, xa1, y1);
}
// pared vertical a lo largo de la calle (l fijo, z0..z1, alturas h0..h1)
function wall(l, z0, z1, h0, h1, c, al = 1, nf = 0) {
  z0 = Math.max(z0, -2); z1 = Math.max(z1, -2); if (z1 <= z0) return;
  const s0 = sc(z0), s1 = sc(z1), y0 = sy(z0), y1 = sy(z1), x0 = X(l, z0), x1 = X(l, z1);
  g.fillStyle(nf ? c : fg(c, z0), al);
  g.fillTriangle(x0, y0 - h0 * s0, x1, y1 - h0 * s1, x1, y1 - h1 * s1);
  g.fillTriangle(x0, y0 - h0 * s0, x1, y1 - h1 * s1, x0, y0 - h1 * s0);
}
// techo horizontal a altura h
function roof(a, b, z0, z1, h, c, al = 1, nf = 0) {
  z0 = Math.max(z0, -2); z1 = Math.max(z1, -2); if (z1 <= z0) return;
  const s0 = sc(z0), s1 = sc(z1), y0 = sy(z0) - h * s0, y1 = sy(z1) - h * s1;
  const xa0 = X(a, z0), xb0 = X(b, z0), xa1 = X(a, z1), xb1 = X(b, z1);
  g.fillStyle(nf ? c : fg(c, z0), al);
  g.fillTriangle(xa0, y0, xb0, y0, xb1, y1);
  g.fillTriangle(xa0, y0, xb1, y1, xa1, y1);
}
function T(x, y, s, z, c, k = '#07031a', ox = 0.5) {
  return Z.add.text(x, y, s, { fontFamily: 'monospace', fontSize: z + 'px', color: c, fontStyle: 'bold', align: 'center', stroke: k, strokeThickness: z > 40 ? 8 : 4 }).setOrigin(ox, 0.5).setDepth(10);
}
function set(o, s) { if (o._s !== s) { o._s = s; o.setText(s); } }
function vis(a, v) { a.forEach((o) => o.setVisible(v)); }
function take(...c) { let r = false; for (const k of c) if (pr[k]) { pr[k] = false; r = true; } return r; }
function P(c) { return take('P1_' + c, 'P2_' + c); }
function burst(x, y, n, cols) {
  for (let i = 0; i < n; i++) {
    const p = Z.add.rectangle(x, y, 5, 5, cols[i % cols.length]).setDepth(6), a = Math.random() * 6.28, d = 20 + Math.random() * 40;
    Z.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 350, onComplete: () => p.destroy() });
  }
}

// ---------- audio ----------
function tone(f, d, ty = 'square', v = 0.08, f2 = 0, dl = 0) {
  try {
    const c = Z.sound.context, o = c.createOscillator(), gn = c.createGain(), n = c.currentTime + dl;
    o.type = ty; o.frequency.setValueAtTime(f, n);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, n + d);
    gn.gain.setValueAtTime(v, n); gn.gain.exponentialRampToValueAtTime(0.001, n + d);
    o.connect(gn); gn.connect(c.destination); o.start(n); o.stop(n + d);
  } catch (e) { /* sin audio */ }
}
function sfx(t) {
  if (t === 'j') tone(300, 0.15, 'square', 0.1, 750);
  else if (t === 's') tone(500, 0.15, 'sawtooth', 0.08, 180);
  else if (t === 'l') tone(600, 0.04, 'square', 0.04);
  else if (t === 'c') { tone(1200, 0.06, 'square', 0.06); tone(1800, 0.09, 'square', 0.06, 0, 0.05); }
  else if (t === 'k') tone(700, 0.1, 'square', 0.1, 1400);
  else if (t === 'b') tone(800, 0.25, 'triangle', 0.15, 100);
  else if (t === 'p') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, 'square', 0.07, 0, i * 0.06));
  else if (t === 'd') { tone(220, 0.6, 'sawtooth', 0.2, 35); tone(110, 0.7, 'square', 0.12, 30); }
  else if (t === 'e') tone(160, 0.35, 'sawtooth', 0.12, 80);
  else if (t === 't') tone(240, 0.25, 'square', 0.1, 900);
  else if (t === 'g') { tone(90 + Math.random() * 90, 0.14, 'sawtooth', 0.07, 40); tone(2000 + Math.random() * 2000, 0.05, 'square', 0.03); }
}
function music() {
  if (mu) return;
  mu = true;
  try { Z.sound.context.resume(); } catch (e) { /* nada */ }
  Z.time.addEvent({
    delay: 125, loop: true, callback: () => {
      const b = [55, 55, 65.41, 49][(ms >> 4) & 3], s = ms & 15;
      if (!(s & 1)) tone(b * (s & 2 ? 2 : 1), 0.11, 'sawtooth', 0.05);
      if (s % 4 === 0) tone(130, 0.12, 'sine', 0.18, 40);
      tone(b * [8, 10, 12, 10, 16, 12, 10, 6][ms & 7], 0.1, 'square', 0.022);
      if (s & 1) tone(7000, 0.02, 'square', 0.01);
      ms++;
    },
  });
}

// ---------- storage ----------
function store() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(k) { try { const r = window.localStorage.getItem(k); return r === null ? { found: false } : { found: true, value: JSON.parse(r) }; } catch (e) { return { found: false }; } },
    async set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } },
  };
}
function uniq(l) {
  const m = {};
  for (const e of l) { const k = e.n.toUpperCase(); if (!m[k] || e.s > m[k].s) m[k] = { n: k, s: e.s }; }
  return Object.values(m).sort((a, b) => b.s - a.s).slice(0, 10);
}
async function load() {
  try {
    const r = await store().get(SK);
    if (!r || !r.found || !Array.isArray(r.value)) return [];
    return uniq(r.value.filter((x) => x && typeof x.n === 'string' && typeof x.s === 'number').map((x) => ({ n: x.n.slice(0, MAXN), s: x.s })));
  } catch (e) { return []; }
}
function lbText(n) {
  return scores.length ? scores.slice(0, n).map((e, i) => String(i + 1).padStart(2, ' ') + '. ' + e.n.padEnd(MAXN, ' ') + ' ' + String(e.s).padStart(7, ' ')).join('\n') : 'AUN NO HAY CORREDORES';
}
function refreshLB() { set(lbM, lbText(8)); set(lbO, lbText(5)); }

// ---------- state ----------
function reset() {
  R = { t: 0, sd: 0, sp: 7, score: 0, ram: 100, mv: 1, bc: 0, last: 100, up: true, hist: [], ht: 0, lane: 0, px: 0, jy: 0, vy: 0, sl: 0, sh: 0, ox: 0, mg: 0, E: [], spT: 1.2, bT: 0, pT: 0, evT: 16, ev: null, evL: 0, bossT: 42, boss: 0, bl: 0, bt: 0, bo: 0, bx: 0, btl: 0, aS: 0, aT: 0, atk: [], tel: [], wb: 0, id: 1, dn: 0, why: '', ov: 0, fl: 0 };
  for (let i = 0; i < 40; i++) R.hist.push(40 + i * 1.5 + Math.random() * 6);
}
function showPhase(p) {
  ph = p; pr = {};
  vis(txM, p === 'menu'); vis(txN, p === 'name'); vis(txO, p === 'over'); vis(txH, p === 'play' || p === 'pause');
  pauseTx.setVisible(p === 'pause');
  if (p !== 'play' && p !== 'pause') { bossTx.setVisible(false); bossLb.setVisible(false); }
}
function nameScr() { cur.k = -1; showPhase('name'); }
function startRun() { reset(); showPhase('play'); say('\u00a1CORRE, ' + nick + '!', '#ffd23f'); }
function say(s, c) {
  ban.setText(s).setColor(c).setAlpha(1).setScale(1.3);
  Z.tweens.killTweensOf(ban);
  Z.tweens.add({ targets: ban, scale: 1, duration: 150 });
  Z.tweens.add({ targets: ban, alpha: 0, delay: 1500, duration: 500 });
}
function pop(x, y, s, c) {
  const o = T(x, y, s, 18, c).setDepth(12);
  Z.tweens.add({ targets: o, y: y - 40, alpha: 0, duration: 700, onComplete: () => o.destroy() });
}

// ---------- create ----------
function create() {
  Z = this; g = Z.add.graphics().setDepth(1);
  window.addEventListener('keydown', (e) => {
    const a = KB[nk(e.key)];
    if (!a) return;
    if (e.key.indexOf('Arrow') === 0 || e.key === ' ') e.preventDefault();
    if (!hd[a]) pr[a] = true;
    hd[a] = true;
  });
  window.addEventListener('keyup', (e) => { const a = KB[nk(e.key)]; if (a) hd[a] = false; });
  reset();

  const S = '#39ff88', Y = '#ffd23f', K = '#ff2bd6', C = '#2bd9ff', Wt = '#f4f1ff';
  const title = T(400, 72, 'RAM RUNNER', 64, Y, '#c8372d');
  Z.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const sub = T(400, 122, 'SAN FRANCISCO \u00b7 El precio sube. T\u00fa corres.', 16, Wt, '#1d1147');
  const lh = T(400, 178, '- TOP CORREDORES -', 16, K);
  lbM = T(400, 198, '', 15, Wt).setAlign('left').setOrigin(0.5, 0);
  const st = T(400, 452, 'PRESIONA START', 26, S, '#1d1147');
  Z.tweens.add({ targets: st, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
  const h1 = T(400, 508, 'IZQ/DER: carril   ARRIBA o BTN1: salto   ABAJO o BTN2: deslizar', 13, C, '#1d1147');
  const h2 = T(400, 534, 'Cada RAM que juntas sube el precio. Sobrevive a CHAQUETA DE CUERO', 13, Wt, '#1d1147');
  txM = [title, sub, lh, lbM, st, h1, h2];
  const nh = T(400, 56, 'TU NICKNAME', 34, S, '#ff2bd6');
  nickTx = T(400, 118, '_', 46, Y);
  const nf = T(400, 452, 'JOYSTICK: mover   BTN1: elegir   BTN2: borrar', 14, C);
  const nf2 = T(400, 478, '<  borrar     >  listo     (o START cuando termines)', 14, Wt);
  txN = [nh, nickTx, nf, nf2];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
    const o = T(130 + c * 60, 205 + r * 52, GR[r][c], 24, Wt);
    gridT.push(o); txN.push(o);
  }
  ovT = T(400, 148, 'OUT OF MEMORY', 44, '#ff4d6d');
  ovR = T(400, 196, '', 16, Y);
  ovS = T(400, 238, '', 28, S);
  ovP = T(400, 276, '', 18, K);
  lbO = T(400, 312, '', 15, Wt).setAlign('left').setOrigin(0.5, 0);
  const op = T(400, 478, 'BTN1: REINTENTAR     BTN2: CAMBIAR NICK', 16, C);
  txO = [ovT, ovR, ovS, ovP, lbO, op];
  hS = T(20, 22, '', 24, Y, '#07031a', 0);
  hR = T(780, 22, '', 24, S, '#07031a', 1);
  hN = T(400, 22, '', 14, Wt);
  hT = T(400, 580, '', 15, C);
  txH = [hS, hR, hN, hT];
  ban = T(400, 255, '', 26, Y).setDepth(11).setAlpha(0);
  pauseTx = T(400, 300, 'PAUSA', 56, Y).setDepth(12);
  bossTx = T(400, 81, '', 16, '#07031a', '#ffffff').setDepth(11);
  bossLb = T(400, 41, 'CHAQUETA DE CUERO', 13, '#ffffff', '#c8372d').setDepth(11);

  showPhase('menu');
  load().then((l) => { scores = l; refreshLB(); });
  refreshLB();
}

// ---------- update ----------
function update(_, d) {
  const dt = Math.min(d / 1000, 0.05);
  if (ph === 'menu') {
    R.t += dt; R.sd += 5 * dt;
    if (take('START1', 'START2', 'P1_1', 'P2_1')) { music(); sfx('k'); nameScr(); }
  } else if (ph === 'name') {
    R.t += dt; R.sd += 5 * dt; nameUpd();
  } else if (ph === 'play') play(dt);
  else if (ph === 'pause') { if (take('START1', 'START2')) showPhase('play'); }
  else if (ph === 'over') {
    R.ov -= dt;
    if (R.ov > 0) pr = {};
    else if (take('P1_1', 'P2_1', 'START1', 'START2')) { sfx('k'); startRun(); }
    else if (take('P1_2', 'P2_2')) { sfx('k'); nameScr(); }
  }
  draw(); hudUpd();
}

function nameUpd() {
  let mv = false;
  if (P('L')) { cur.c = (cur.c + 9) % 10; mv = true; }
  if (P('R')) { cur.c = (cur.c + 1) % 10; mv = true; }
  if (P('U')) { cur.r = (cur.r + 3) % 4; mv = true; }
  if (P('D')) { cur.r = (cur.r + 1) % 4; mv = true; }
  if (mv) sfx('l');
  if (P('2') && nick) { nick = nick.slice(0, -1); sfx('l'); }
  const ok = take('START1', 'START2'), sel = P('1');
  if (ok && nick) { sfx('k'); startRun(); return; }
  if (sel) {
    const ch = GR[cur.r][cur.c];
    if (ch === '<') nick = nick.slice(0, -1);
    else if (ch === '>') { if (nick) { sfx('k'); startRun(); return; } }
    else if (nick.length < MAXN) nick += ch;
    sfx('l');
  }
  const k = cur.r * 10 + cur.c;
  if (k !== cur.k) { cur.k = k; gridT.forEach((o, i) => o.setColor(i === k ? '#ffd23f' : '#f4f1ff')); }
  set(nickTx, nick + '_');
}

function play(dt) {
  if (take('START1', 'START2')) { showPhase('pause'); return; }
  R.t += dt;
  const ox = R.ox > 0;
  if (P('L') && R.lane > -1) { R.lane--; sfx('l'); }
  if (P('R') && R.lane < 1) { R.lane++; sfx('l'); }
  if (P('U') | P('1')) { if (R.jy <= 0) { R.vy = 640; R.sl = 0; sfx('j'); } }
  if (P('D') | P('2')) { if (R.jy > 0) R.vy = -900; else { R.sl = 0.6; sfx('s'); } }
  R.px += (R.lane - R.px) * Math.min(1, dt * 14);
  if (R.jy > 0 || R.vy > 0) { R.vy -= 1900 * dt; R.jy += R.vy * dt; if (R.jy <= 0) { R.jy = 0; R.vy = 0; } }
  R.sl = Math.max(0, R.sl - dt); R.fl = Math.max(0, R.fl - dt); R.bo = Math.max(0, R.bo - dt);
  R.sp = (7 + Math.min(R.t * 0.12, 8.5)) * (ox ? 1.25 : 1);
  R.sd += R.sp * dt; R.score += R.sp * dt * 6 * (ox ? 2 : 1);
  R.ox = Math.max(0, R.ox - dt); R.mg = Math.max(0, R.mg - dt);
  R.ht += dt;
  if (R.ht > 0.6) { R.ht = 0; R.up = R.ram > R.last ? true : R.ram < R.last ? false : R.up; R.last = R.ram; R.hist.push(R.ram); R.hist.shift(); }
  const dn = Math.floor(R.t / 30);
  if (dn > R.dn) { R.dn = dn; if (!R.ev && !R.boss) say(DIST[dn % DIST.length], '#ffffff'); }

  if (!R.ev && !R.boss) {
    if (R.t >= R.bossT) startBoss();
    else if (R.t >= R.evT) startEv(Math.random() < 0.5 ? 'b' : 'h');
  }
  if (R.ev) {
    R.evL -= dt;
    if (R.ev === 'b') { R.bT -= dt; if (R.bT <= 0) { R.bT = 0.28; coins(ri(-1, 1), 34, ri(3, 5), 0); } }
    else {
      R.pT -= dt;
      if (R.pT <= 0) { R.pT = 0.35 + Math.random() * 0.35; R.E.push(phantom(ri(-1, 1), ri(14, 26))); if (Math.random() < 0.35) R.E.push({ k: 'x', l: ri(-1, 1), z: ri(14, 26), h: 0 }); }
    }
    if (R.evL <= 0) endEv();
  }
  if (R.boss) bossAI(dt);
  else if (R.ev !== 'b') {
    R.spT -= dt;
    if (R.spT <= 0) { R.spT = Math.max(0.5, 1.15 - R.t * 0.007) + Math.random() * 0.25; row(); }
  }

  for (const e of R.E) {
    e.z -= R.sp * dt;
    if (e.age !== undefined) e.age += dt;
    if (e.k === 'c' && R.mg > 0 && e.z < 10) e.l += (R.px - e.l) * Math.min(1, dt * 5);
    if (e.k === 'f' && e.v && e.z < e.vz) { e.d = 1; burst(X(e.l, e.z), sy(e.z) - 40 * sc(e.z), 10, [0xff2bd6, 0x2bd9ff, 0x39ff88]); sfx('g'); }
  }
  for (const e of R.E) {
    if (e.d || e.k === 'f' || e.z > 0.5 || e.z + ln(e) < -0.5) continue;
    if (Math.abs(R.px - e.l) > 0.62) continue;
    if (e.k === 'o') {
      const c = CL[e.o], hit = c === 0 ? R.jy < 45 : c === 1 ? (R.sl <= 0 && R.jy < 70) : true;
      if (hit) {
        if (R.sh > 0) { R.sh = 0; e.d = 1; sfx('b'); pop(X(R.px, 0), GY - 90, 'ESCUDO ROTO', '#2bd9ff'); R.fl = 0.3; }
        else { die(e.thr ? 'CHAQUETA DE CUERO te dej\u00f3 en visto' : WHY[e.o]); return; }
      }
    } else if (e.k === 'c') {
      if (Math.abs(R.jy - e.h) < 55) {
        e.d = 1; const v = Math.round(R.ram / 10 * R.mv) * (R.ox > 0 ? 2 : 1); R.score += v; sfx('c');
        R.ram += R.ev === 'b' ? 2 + R.ram * 0.015 : 1 + R.ram * 0.005; Z.tweens.killTweensOf(hR); hR.setScale(1); Z.tweens.add({ targets: hR, scale: 1.18, duration: 70, yoyo: true });
        pop(X(e.l, 0), GY - 110, '+' + v, '#39ff88');
      }
    } else if (e.k === 'x') {
      if (Math.abs(R.jy - e.h) < 55) { e.d = 1; sfx('g'); pop(X(e.l, 0), GY - 110, 'ESPEJISMO', '#ff2bd6'); }
    } else { e.d = 1; power(e.p); R.score += 50; }
  }
  R.E = R.E.filter((e) => !e.d && e.z + ln(e) > -1.5);
}

function power(p) {
  if (p === 0) { R.sh = 1; say('ESCUDO: PROMPT M\u00c1GICO', '#2bd9ff'); }
  else if (p === 1) { R.ox = 6; say('OVERCLOCK x2', '#ffd23f'); }
  else { R.mg = 7; say('IM\u00c1N DE RAM', '#ff2bd6'); }
  sfx('p');
}
function startEv(k) {
  R.ev = k; R.evL = 8; R.bT = 0; R.pT = 0.6;
  if (k === 'b') say('\u00a1BURBUJA IA! LLUEVE RAM', '#39ff88');
  else { say('ALUCINACI\u00d3N: NO CONF\u00cdES EN LO QUE VES', '#ffffff'); R.wb = 10; sfx('g'); }
}
function endEv() {
  if (R.ev === 'b') { R.ram *= 0.5; R.mv *= 1.6; R.up = false; say('LA BURBUJA REVENT\u00d3: RAM -50%\nPERO CADA RAM VALE M\u00c1S AHORA', '#ff2bd6'); sfx('e'); }
  else R.E = R.E.filter((e) => e.k !== 'f' && e.k !== 'x');
  R.wb = 0; R.ev = null; R.evT = R.t + ri(15, 22);
}
function phantom(l, z) { return { k: 'f', o: ri(0, 2), l, z, id: R.id++, age: 0, v: Math.random() < 0.6 ? 1 : 0, vz: ri(5, 12) }; }

// ---------- jefe ----------
function startBoss() {
  R.bc++; R.boss = 1; R.bl = BOSS_T; R.bt = 0; R.bx = 0; R.btl = 0; R.aS = 0; R.aT = 0; R.tel = [];
  R.E = R.E.filter((e) => (e.k !== 'o' && e.k !== 'f') || e.z < 10);
  say('\u00a1CHAQUETA DE CUERO!', '#ff4d6d'); sfx('e');
}
function bossAI(dt) {
  R.bl -= dt; R.bt += dt;
  R.bx += (R.btl - R.bx) * Math.min(1, dt * 4);
  if (R.bl <= 0) { endBoss(); return; }
  if (R.bt < 1.4) return;
  R.aT -= dt;
  if (R.aS === 0 && R.aT <= 0) { pickAtk(); R.aS = 1; R.aT = Math.max(0.55, 0.95 - R.bt * 0.025); }
  else if (R.aS === 1 && R.aT <= 0) { throwAtk(); R.aS = 2; R.aT = 0.4; }
  else if (R.aS === 2 && R.aT <= 0) { R.aS = 0; R.aT = Math.max(0.3, 0.8 - R.bt * 0.03); R.tel = []; }
}
function pickAtk() {
  const f = ri(-1, 1), q = Math.random(), A = [];
  for (let l = -1; l <= 1; l++) {
    if (q < 0.45) { if (l !== f) A.push([l, 3]); }
    else if (q < 0.65) A.push([l, 5]);
    else if (q < 0.85) A.push([l, 4]);
    else if (l !== f) A.push([l, A.length ? 5 : 3]);
  }
  R.atk = A; R.btl = A.reduce((s, a) => s + a[0], 0) / A.length;
  R.tel = A.map((a) => [a[0], a[1] === 3 ? 0xff4d6d : a[1] === 5 ? 0xffd23f : 0x2bd9ff]);
  sfx('t');
}
function throwAtk() {
  const bsx = 400 + R.bx * 110;
  for (const [l, o] of R.atk) R.E.push({ k: 'o', o, l, z: 40, thr: 1, sx: bsx - X(l, 40) });
  for (let l = -1; l <= 1; l++) if (!R.atk.some((a) => a[0] === l) && Math.random() < 0.6) coins(l, 38, 3, 0);
  burst(bsx, HZ - 50, 8, [0x39ff88, 0xffffff]); sfx('e');
}
function endBoss() {
  R.boss = 0; R.bo = 1.4; R.tel = []; R.bossT = R.t + 55; R.evT = Math.max(R.evT, R.t + 10); R.score += 1500; R.spT = 2.5;
  for (let l = -1; l <= 1; l++) coins(l, 28, 6, 0);
  say('\u00a1DERROTADO! +1500', '#39ff88'); sfx('p');
}

function coins(l, z, n, h) { for (let i = 0; i < n; i++) R.E.push({ k: 'c', l, z: z + i * 0.9, h }); }
function row() {
  const z0 = 34, f = ri(-1, 1), a = Math.random(), hl = R.ev === 'h';
  if (a < 0.22) coins(ri(-1, 1), z0, 6, 0);
  else if (a < 0.72) {
    for (let l = -1; l <= 1; l++) {
      if (l === f) {
        if (hl && Math.random() < 0.7) R.E.push(phantom(l, z0));
        else if (Math.random() < 0.4) coins(l, z0, 4, 0);
        continue;
      }
      if (Math.random() < 0.8) { const q = Math.random(); R.E.push({ k: 'o', o: q < 0.4 ? 0 : q < 0.7 ? 1 : 2, l, z: z0 }); }
    }
  } else if (a < 0.82) R.E.push({ k: 'p', p: ri(0, 2), l: ri(-1, 1), z: z0, h: 0 });
  else { const l = ri(-1, 1); R.E.push({ k: 'o', o: 0, l, z: z0 }); for (let i = -1; i <= 1; i++) R.E.push({ k: 'c', l, z: z0 + i * 1.3, h: 70 }); }
}
function die(why) {
  R.why = why; R.ov = 1.2; sfx('d');
  Z.cameras.main.shake(300, 0.012); Z.cameras.main.flash(200, 255, 40, 80);
  const s = Math.min(99999999, Math.floor(R.score));
  showPhase('over');
  set(ovR, why); set(ovS, 'PUNTAJE ' + s); set(ovP, 'guardando...');
  load().then((l) => {
    const key = nick.toUpperCase(), prev = l.find((e) => e.n === key);
    scores = uniq(l.concat({ n: key, s }));
    const rk = scores.findIndex((x) => x.n === key);
    set(ovP, rk < 0 ? 'No entraste al top 10' : prev && prev.s >= s ? 'TU MEJOR: ' + prev.s + ' (PUESTO #' + (rk + 1) + ')' : (prev ? '\u00a1NUEVO R\u00c9CORD! ' : '') + '\u00a1PUESTO #' + (rk + 1) + '!');
    refreshLB();
    store().set(SK, scores);
  }).catch(() => set(ovP, ''));
}

// ---------- draw ----------
function hudUpd() {
  if (ph !== 'play' && ph !== 'pause') return;
  set(hS, 'PTS ' + String(Math.min(99999999, Math.floor(R.score))).padStart(6, '0'));
  const hl = R.ev === 'h' && Math.random() < 0.3;
  set(hR, 'DDR5 $' + (hl ? ri(5, 999) : Math.round(R.ram)) + '');
  hR.setColor(hl ? '#ff2bd6' : R.up ? '#39ff88' : '#ff4d6d');
  set(hN, nick);
  set(hT, [R.sh ? 'ESCUDO' : '', R.ox > 0 ? 'x2 ' + Math.ceil(R.ox) + 's' : '', R.mg > 0 ? 'IMAN ' + Math.ceil(R.mg) + 's' : ''].filter(Boolean).join('   '));
}

function scene() {
  // cielo
  for (let i = 0; i < 16; i++) bx(0, i * HZ / 16, W, HZ / 16 + 1, mix(0x3a9bf0, 0xffe2b8, Math.pow(i / 15, 1.4)));
  g.fillStyle(0xfff3c4, 0.25); g.fillCircle(590, 150, 62); g.fillStyle(0xfff6d6, 0.95); g.fillCircle(590, 150, 34);
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 190 + 60 + R.t * 5) % 900) - 50, cy = 60 + (i * 37) % 70;
    g.fillStyle(0xffffff, 0.85); g.fillCircle(cx, cy, 16); g.fillCircle(cx + 18, cy - 6, 20); g.fillCircle(cx + 40, cy, 15); bx(cx - 2, cy, 44, 12, 0xffffff, 0.85);
  }
  // skyline: Transamerica y Salesforce
  for (let i = 0; i < 31; i++) { const h = 24 + ((i * 47) % 41) * 1.5; bx(i * 26, HZ - h, 27, h, 0x9aaed2); }
  g.fillStyle(0x8396c0); g.fillTriangle(330, HZ - 132, 314, HZ, 346, HZ); bx(318, HZ - 50, 6, 50, 0x8396c0); bx(336, HZ - 50, 6, 50, 0x8396c0);
  bx(462, HZ - 118, 22, 118, 0x8396c0); g.fillTriangle(462, HZ - 118, 484, HZ - 118, 473, HZ - 134);
  // Golden Gate
  const gg = 0xc8402a;
  bx(0, HZ - 14, W, 5, gg);
  for (const tx of [170, 630]) { bx(tx - 14, HZ - 108, 6, 108, gg); bx(tx + 8, HZ - 108, 6, 108, gg); bx(tx - 14, HZ - 90, 28, 4, gg); bx(tx - 14, HZ - 62, 28, 4, gg); bx(tx - 14, HZ - 108, 28, 4, gg); }
  g.lineStyle(2, gg, 1); g.beginPath();
  for (let x = 170; x <= 630; x += 12) { const u = (x - 400) / 230, y = HZ - 30 - 74 * u * u; if (x === 170) g.moveTo(x, y); else g.lineTo(x, y); }
  g.strokePath();
  g.lineBetween(170, HZ - 104, 0, HZ - 36); g.lineBetween(630, HZ - 104, 800, HZ - 36);
  g.lineStyle(1, gg, 0.8);
  for (let x = 182; x < 630; x += 14) { const u = (x - 400) / 230; g.lineBetween(x, HZ - 30 - 74 * u * u, x, HZ - 14); }
  bx(0, HZ - 22, W, 22, FOG, 0.35);
  // precio de la RAM
  const h = R.hist, mn = Math.min(...h), mx = Math.max(...h);
  g.lineStyle(4, 0x0b7a3e, 0.9); g.beginPath();
  h.forEach((v, i) => { const x = 20 + i * 760 / (h.length - 1), y = 185 - (v - mn) / (mx - mn + 1) * 120; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.strokePath();
}

function backdrop() {
  bx(0, HZ, W, H - HZ, 0xb9b3b6);
  for (let i = 0, x = -10; x < W; i++) {
    const w = 44 + (i * 29) % 37, c = mix(HPAL[(i * 3) % 7], FOG, 0.6), wc = mix(c, 0x4a5a80, 0.5), t = HZ - (i * 13) % 8;
    bx(x, t, w - 2, 240, c); bx(x, t, w - 2, 5, mix(c, 0x000000, 0.25));
    for (let r = 0; r < 3; r++) for (let k = 0; k < (w / 18 | 0); k++) bx(x + 6 + k * 18, t + 20 + r * 42, 8, 16, wc);
    x += w;
  }
}

// cara frontal (mira hacia la camara) a distancia z fija, entre l=a y l=b
function front(a, b, z, h0, h1, c, al = 1) {
  z = Math.max(z, -2);
  const s = sc(z), y = sy(z), xa = X(a, z), xb = X(b, z);
  g.fillStyle(fg(c, z), al);
  g.fillTriangle(xa, y - h0 * s, xb, y - h0 * s, xb, y - h1 * s);
  g.fillTriangle(xa, y - h0 * s, xb, y - h1 * s, xa, y - h1 * s);
}

function building(sd, gi, z0, z1) {
  const lot = gi >> 1, r = hs(lot, sd), tw = r < 0.12, l = sd * 2.1, s = sc(z0);
  const hh = tw ? 900 : 250 + ((r * 1000 | 0) % 3) * 60;
  const col = tw ? 0x6fa3d8 : HPAL[(r * 100 | 0) % 7];
  if (!tw) wall(sd * 4, z0, z1, 0, 430, [0xb7c3dc, 0xc8bdd8, 0xd6c8b4][lot % 3]);
  wall(l, z0, z1, 0, hh, col);
  if (!(gi & 1) && z0 > -1.2) {
    const a = l, b = sd * 4;
    front(a, b, z0, 0, hh, mix(col, 0xffffff, 0.15));
    front(a, b, z0, hh - 14, hh, mix(col, 0x000000, 0.35));
    wall(l, z0, z0 + 0.07, 0, hh, mix(col, 0x000000, 0.4));
    if (tw && sc(z0) > 0.1) for (let f = 0; f < 9; f++) front(a + sd * 0.2, b - sd * 0.2, z0, 40 + f * 95, 90 + f * 95, 0xb8def8);
  }
  if (!tw) { wall(l, z0, z1, hh - 12, hh, mix(col, 0x000000, 0.35)); if (hh < 330) roof(l, sd * 4, z0, z1, hh, mix(col, 0x000000, 0.3)); }
  if (s > 0.14) {
    if (tw) { for (let f = 0; f < 9; f++) for (const u of [0.1, 0.8]) wall(l, z0 + u, z0 + u + 0.6, 40 + f * 95, 90 + f * 95, 0xa8d6f5); }
    else {
      const fl = hh / 100 | 0;
      for (let f = 0; f < fl; f++) wall(l, z0 + 0.35, z1 - 0.35, 40 + f * 100, 95 + f * 100, hs(gi * 3 + f, sd) > 0.6 ? 0xffe9a0 : 0x3d5a80);
      if (!(gi & 1)) wall(l, z0 + 0.4, z0 + 1.0, 0, 70, 0x5a3a2a);
    }
    if (!tw && hs(lot, sd + 5) > 0.78) {
      wall(l, z0 + 0.1, z1 - 0.1, 130, 250, 0x1b1147);
      wall(l, z0 + 0.35, z1 - 0.35, 160, 220, [0x39ff88, 0xff2bd6, 0x2bd9ff][lot % 3], 1, 1);
    }
  }
}

function draw() {
  g.clear();
  scene();
  backdrop();
  const fr = R.sd % BL, par = Math.floor(R.sd / BL), hl = R.ev === 'h';
  for (let n = NB; n >= -1; n--) {
    const z0 = Math.max(-2, n * BL - fr), z1 = n * BL - fr + BL, gi = par + n, al = gi & 1, zm = (z0 + z1) / 2, s = sc(zm);
    band(-2.1, -1.55, z0, z1, al ? 0xd2cabd : 0xc8c0b3); band(1.55, 2.1, z0, z1, al ? 0xd2cabd : 0xc8c0b3);
    band(-1.6, -1.52, z0, z1, 0x8a8478); band(1.52, 1.6, z0, z1, 0x8a8478);
    band(-1.52, 1.52, z0, z1, al ? 0x4f4d57 : 0x55535e);
    band(-0.5, 0.5, z0, z1, al ? 0x8c867b : 0x948e82);
    band(-0.2, -0.14, z0, z1, 0xe9edf5); band(0.14, 0.2, z0, z1, 0xe9edf5);
    if (!al) band(-0.36, 0.36, z0, z0 + 0.4, 0x6b4a32);
    if (al) { band(-0.55, -0.49, z0, z1, 0xf4f1ff, 0.75); band(0.49, 0.55, z0, z1, 0xf4f1ff, 0.75); }
    band(-2.1, -1.55, z0, z0 + 0.07, 0xa59d8c); band(1.55, 2.1, z0, z0 + 0.07, 0xa59d8c);
    building(-1, gi, z0, z1); building(1, gi, z0, z1);
    for (const sd of [-1, 1]) {
      const x = X(sd * 1.78, zm), y = sy(zm);
      if (gi % 3 === 0) { bx(x - 3 * s, y - 40 * s, 6 * s, 40 * s, 0x6b4a32); g.fillStyle(fg(0x3fa34d, zm)); g.fillCircle(x, y - 62 * s, 26 * s); }
      else if (gi % 3 === 1) { bx(x - 2 * s, y - 150 * s, 4 * s, 150 * s, 0x3a3a44); g.fillStyle(0xffe08a); g.fillCircle(x, y - 152 * s, 7 * s); }
    }
  }
  // jefe
  if (R.boss || R.bo > 0) drawBoss(); else { bossTx.setVisible(false); bossLb.setVisible(false); }
  // aviso de ataques
  if (R.boss) for (const [l, c] of R.tel) band(l - 0.46, l + 0.46, 0, 20, c, 0.2 + 0.15 * Math.sin(R.t * 24));
  if (R.boss) { bx(250, 50, 300, 10, 0x07031a, 0.7); bx(251, 51, 298 * Math.max(0, R.bl / BOSS_T), 8, 0xff4d6d); }
  // entidades y jugador
  const L = R.E.slice().sort((a, b) => b.z - a.z);
  let pd = false;
  for (const e of L) { if (!pd && e.z <= 0.15) { drawP(); pd = true; } drawE(e); }
  if (!pd) drawP();
  if (R.fl > 0) bx(0, 0, W, H, 0x2bd9ff, R.fl * 0.5);
  if (hl) {
    const k = R.t * 10 | 0;
    for (let i = 0; i < 5; i++) bx(0, hs(k, i) * H, W, 2 + hs(k, i + 9) * 10, [0xff2bd6, 0x2bd9ff, 0x39ff88][i % 3], 0.16);
    for (let y = 0; y < H; y += 6) bx(0, y, W, 1, 0x000000, 0.07);
    const p = 0.12 + 0.08 * Math.sin(R.t * 9);
    bx(0, 0, W, 40, 0xff2bd6, p); bx(0, H - 40, W, 40, 0xff2bd6, p); bx(0, 0, 40, H, 0x2bd9ff, p); bx(W - 40, 0, 40, H, 0x2bd9ff, p);
  }
  if (ph === 'menu') { bx(210, 160, 380, 250, 0x07031a, 0.85); bx(210, 160, 380, 3, 0xff2bd6); bx(210, 407, 380, 3, 0x2bd9ff); }
  if (ph === 'name') {
    bx(0, 0, W, H, 0x07031a, 0.8);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
      const a = r * 10 + c === cur.k;
      bx(130 + c * 60 - 26, 205 + r * 52 - 22, 52, 44, a ? 0xff2bd6 : 0x1b1233, 0.9);
    }
  }
  if (ph === 'over') { bx(150, 105, 500, 410, 0x07031a, 0.88); bx(150, 105, 500, 3, 0xff4d6d); bx(150, 512, 500, 3, 0x2bd9ff); }
  if (ph === 'pause') bx(0, 0, W, H, 0x07031a, 0.6);
}

function drawBoss() {
  let ps = 9, xo = 0, yo = 0;
  const out = R.bo > 0 && !R.boss;
  if (out) { const k = 1 - R.bo / 1.4; yo = -k * 240; xo = k * 220; ps *= 1 - k * 0.55; }
  else ps *= Math.min(1, R.bt / 0.8);
  const bsx = 400 + R.bx * 110 + xo, wind = R.aS === 1 || (R.aS === 2 && R.aT > 0.15);
  if (!out || (R.t * 20 | 0) & 1) art(wind ? BOSS2 : BOSS, BP, bsx - 5 * ps, HZ - 12 * ps + Math.sin(R.t * 3) * 3 + yo, ps);
  const show = (R.boss && R.bt >= 0.8) || out;
  set(bossTx, out ? BOUT[(R.bc - 1) % 2] : BS[(R.bc - 1) % 2][Math.min(5, Math.floor(R.bt / 2.2))]);
  if (show) bx(400 - bossTx.width / 2 - 12, 64, bossTx.width + 24, 34, 0xffffff, 0.95);
  bossTx.setVisible(show && ph !== 'pause'); bossLb.setVisible(!!R.boss && ph !== 'pause');
}

function drawP() {
  if (ph === 'menu' || ph === 'name') return;
  const x = X(R.px, 0), f = (R.t * 12 | 0) & 1, j = R.jy > 0, sl = R.sl > 0 && !j, ps = 6, w = 8 * ps;
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, GY + 3, w * (1 - Math.min(R.jy, 200) / 300), 10);
  if (R.ox > 0) for (let i = 1; i <= 3; i++) bx(x - w / 2, GY - R.jy - 40 + i * 6, w, 8, 0xffd23f, 0.12 * (4 - i));
  const legs = j ? ['.ll..ll.', '..l..l..'] : f ? ['..llll..', '..l..l..'] : ['.ll..ll.', 'll....ll'];
  const k = sl ? 0.55 : 1;
  art(PA.concat(legs), PP, x - w / 2, GY - R.jy - 10 * ps * k, ps, k);
  if (R.sh > 0) { g.lineStyle(3, 0x2bd9ff, 0.8); g.strokeCircle(x, GY - R.jy - 30, 44 + Math.sin(R.t * 8) * 2); }
}

function drawE(e) {
  const z = e.z, l = e.l, car = (e.k === 'o' || e.k === 'f') && e.o === 2;
  if (z < -1.4 && !(car && z + 3 > -2)) return;
  const s = sc(Math.max(z, -1.4)), y0 = sy(Math.max(z, -1.4));
  let x = X(l, z), y = y0;
  if (e.thr && z > 26) { x += e.sx * Math.min(1, (z - 26) / 14); y -= (z - 26) * 30 * s; }
  let fa = Math.max(0, Math.min(1, (36 - z) / 6));
  const fk = e.k === 'f';
  if (fk) {
    if (hs(Math.floor(R.t * 14), e.id) < 0.15) return;
    fa *= Math.min(1, e.age * 4) * 0.9;
  }
  const o = e.o;
  if (e.k === 'o' || fk) {
    const a = fa;
    if (o === 0) {
      const w = 84 * s;
      g.fillStyle(0x1b1f3a, a); g.fillCircle(x - 26 * s, y - 9 * s, 9 * s); g.fillCircle(x + 26 * s, y - 9 * s, 9 * s);
      bx(x - w / 2, y - 48 * s, w, 36 * s, 0xf4f7fb, a); bx(x - w / 2 + 8 * s, y - 42 * s, w - 16 * s, 18 * s, 0x1b1f3a, a);
      const bl = (R.t * 3 | 0) % 6 ? 1 : 0.1;
      bx(x - 16 * s, y - 36 * s, 8 * s, 6 * s * bl, 0x2bd9ff, a); bx(x + 8 * s, y - 36 * s, 8 * s, 6 * s * bl, 0x2bd9ff, a);
      bx(x + w / 2 - 12 * s, y - 70 * s, 3 * s, 22 * s, 0x888aa8, a); bx(x + w / 2 - 9 * s, y - 70 * s, 12 * s, 8 * s, 0xff7a1a, a);
    } else if (o === 1) {
      const w = 140 * s;
      bx(x - w / 2, y - 74 * s, 6 * s, 74 * s, 0x8d8fa3, a); bx(x + w / 2 - 6 * s, y - 74 * s, 6 * s, 74 * s, 0x8d8fa3, a);
      bx(x - w / 2, y - 74 * s, w, 26 * s, 0x15112e, a); bx(x - w / 2, y - 74 * s, w, 3 * s, 0xffd23f, a);
      for (let i = 0; i < 10; i++) bx(x - w / 2 + (6 + i * 13) * s, y - 66 * s + ((i + (R.t * 6 | 0)) % 3) * 5 * s, 6 * s, 5 * s, [0x39ff88, 0xff2bd6, 0x2bd9ff][i % 3], a);
    } else if (o === 2) {
      // cable car largo con techo y laterales
      const hh = 122, ww = 0.3;
      if (l < 0) { wall(l + ww, z, z + 3, 0, hh, 0xd9c9a3, a, 0); wall(l + ww, z + 0.4, z + 1.2, 60, 100, 0x9fd0f5, a); wall(l + ww, z + 1.8, z + 2.6, 60, 100, 0x9fd0f5, a); }
      if (l > 0) { wall(l - ww, z, z + 3, 0, hh, 0xd9c9a3, a, 0); wall(l - ww, z + 0.4, z + 1.2, 60, 100, 0x9fd0f5, a); wall(l - ww, z + 1.8, z + 2.6, 60, 100, 0x9fd0f5, a); }
      roof(l - ww, l + ww, z, z + 3, hh, 0x9b2f26, a);
      if (z > -1.4) {
      const w = 104 * s;
      bx(x - w / 2, y - hh * s, w, hh * s, 0xf3e4c0, a); bx(x - w / 2, y - hh * s, w, 26 * s, 0xc8372d, a); bx(x - w / 2, y - 30 * s, w, 12 * s, 0xc8372d, a);
      bx(x - w / 2 + 8 * s, y - 92 * s, 36 * s, 34 * s, 0x9fd0f5, a); bx(x + w / 2 - 44 * s, y - 92 * s, 36 * s, 34 * s, 0x9fd0f5, a);
      g.fillStyle(0xffe08a, a); g.fillCircle(x - 22 * s, y - 20 * s, 7 * s); g.fillCircle(x + 22 * s, y - 20 * s, 7 * s);
      bx(x - w / 2, y - 6 * s, w, 6 * s, 0x2a2a33, a);
      }
    } else if (o === 3) {
      const w = 130 * s, hh = 132 * s;
      bx(x - w / 2, y - hh, w, hh, 0x39ff88, a); bx(x - w / 2 + 6 * s, y - hh + 6 * s, w - 12 * s, hh - 12 * s, 0x0b1f1a, a);
      for (let k = 0; k < 2; k++) {
        const cy = y - hh * (0.72 - k * 0.42);
        g.fillStyle(0x145a3a, a); g.fillCircle(x, cy, 26 * s); g.fillStyle(0x39ff88, a); g.fillCircle(x + Math.sin(R.t * 12 + k) * 5 * s, cy, 8 * s);
      }
    } else if (o === 4) {
      const w = 140 * s;
      g.fillStyle(0x39ff88, a * 0.25); g.fillEllipse(x, y - 61 * s, w * 1.2, 40 * s);
      bx(x - w / 2, y - 74 * s, w, 26 * s, 0x0b1f1a, a); bx(x - w / 2, y - 74 * s, w, 4 * s, 0x39ff88, a);
      g.fillStyle(0x145a3a, a); g.fillCircle(x - 30 * s, y - 61 * s, 10 * s); g.fillCircle(x + 30 * s, y - 61 * s, 10 * s);
    } else {
      const w = 100 * s, hh = 42 * s;
      bx(x - w / 2, y - hh, w, hh, 0x0b1f1a, a); bx(x - w / 2, y - hh, w, 5 * s, 0x39ff88, a);
      g.fillStyle(0x145a3a, a); g.fillCircle(x, y - hh * 0.45, 13 * s); g.fillStyle(0x39ff88, a); g.fillCircle(x + Math.sin(R.t * 14) * 4 * s, y - hh * 0.45, 5 * s);
    }
    if (fk) for (let i = 0; i < 3; i++) bx(x - 60 * s + hs(R.t * 9 | 0, e.id + i) * 20 * s, y - hs(R.t * 11 | 0, e.id * i + 1) * 120 * s, 100 * s, 3 * s, [0xff2bd6, 0x2bd9ff, 0x39ff88][i], 0.7);
  } else if (e.k === 'c' || e.k === 'x') {
    const w = 36 * s, hh = 14 * s, cy = y - (e.h + 28) * s + Math.sin(R.t * 6 + e.z * 2) * 3 * s;
    bx(x - w / 2, cy - hh / 2, w, hh, 0x1fbf5a, fa);
    for (let i = 0; i < 3; i++) bx(x - w / 2 + (4 + i * 11) * s, cy - hh / 2 + 2 * s, 8 * s, 6 * s, 0x10231a, fa);
    bx(x - w / 2, cy + hh / 2, w, 3 * s, 0xffd23f, fa);
  } else {
    const r = 18 * s, cy = y - (e.h + 34) * s, c = [0x2bd9ff, 0xffd23f, 0xff2bd6][e.p];
    g.fillStyle(c, (0.25 + 0.15 * Math.sin(R.t * 8)) * fa); g.fillCircle(x, cy, r * 1.5);
    g.fillStyle(c, fa); g.fillCircle(x, cy, r);
    g.fillStyle(0x07031a, fa);
    if (e.p === 0) { g.fillCircle(x, cy, r * 0.5); g.fillStyle(c, fa); g.fillCircle(x, cy, r * 0.28); }
    else if (e.p === 1) {
      g.fillTriangle(x + r * 0.1, cy - r * 0.7, x - r * 0.35, cy + r * 0.1, x + r * 0.05, cy + r * 0.1);
      g.fillTriangle(x - r * 0.1, cy + r * 0.7, x + r * 0.35, cy - r * 0.1, x - r * 0.05, cy - r * 0.1);
    } else {
      bx(x - r * 0.45, cy - r * 0.5, r * 0.25, r, 0x07031a, fa); bx(x + r * 0.2, cy - r * 0.5, r * 0.25, r, 0x07031a, fa); bx(x - r * 0.45, cy + r * 0.3, r * 0.9, r * 0.25, 0x07031a, fa);
    }
  }
}
