// RAM RUNNER - Platanus Hack 26
// Endless 3-lane runner en un data center. El precio de la RAM sube, tu puntaje tambien.

const W = 800, H = 600, HZ = 210, GY = 540, LX = 170, BL = 1.5, NB = 34;
const SK = 'ram-runner-scores-v1', MAXN = 8;

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
const WHY = ['Te tropezaste con un servidor', 'El cable de fibra te corto el paso', 'Te aplasto un cluster de GPUs'];
const BL_ = ['\u00a1TE PROMETI H100 Y TE DEJE EN VISTO!', 'ME FUI CON OTRA IA... DOS VECES.', 'NO ES INFIDELIDAD, ES DIVERSIFICAR.', '\u00a1LA RAM ES MIA, MIA, MIA!', 'TU STARTUP YA NO ESCALA. CHAO.'];

const PA = ['..hhhh..', '.hhhhhh.', '.hseseh.', '..ssss..', '.bbbbbb.', 'sbbbbbbs', 's.bbbb.s', '..bbbb..'];
const PP = { h: 0xff4fd8, s: 0xffc9a0, e: 0x111111, b: 0x2bd9ff, l: 0x2a2f8f };
const BOSS = ['...gggg...', '..gggggg..', '..ssssss..', '..kkskkk..', '..ssssss..', '...smms...', '.jjjjjjjj.', 'jjxjjjjxjj', 'jjxjjjjxjj', 'sjjjjjjjjs', '.jj....jj.', '.jj....jj.'];
const BP = { g: 0x9aa0b4, s: 0xe9b48c, k: 0x0a0a0a, m: 0xb04040, j: 0x15151c, x: 0x5a5a78 };

let Z, g, R, ph = 'menu', scores = [], nick = '', pr = {}, hd = {}, cur = { r: 0, c: 0, k: -1 };
let ban, hS, hR, hT, hN, pauseTx, bossTx, nickTx, lbM, lbO, ovT, ovR, ovS, ovP;
let txM = [], txN = [], txO = [], txH = [], gridT = [], mu = false, ms = 0;

new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, parent: 'game-root', backgroundColor: '#07031a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: { create, update },
});

// ---------- helpers ----------
const sc = (z) => 1 / (1 + z * 0.32);
const sy = (z) => HZ + (GY - HZ) * sc(z);
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function off(y) { return R.wb ? R.wb * Math.sin(R.t * 4 + y * 0.04) * ((y - HZ) / (GY - HZ)) : 0; }
function X(l, z) { return 400 + l * LX * sc(z) + off(sy(z)); }
function mix(a, b, t) {
  const r = (a >> 16 & 255) * (1 - t) + (b >> 16 & 255) * t, gg = (a >> 8 & 255) * (1 - t) + (b >> 8 & 255) * t, bl = (a & 255) * (1 - t) + (b & 255) * t;
  return ((r | 0) << 16) | ((gg | 0) << 8) | (bl | 0);
}
function bx(x, y, w, h, c, a = 1) { g.fillStyle(c, a); g.fillRect(x, y, w, h); }
function art(r, p, x, y, ps, k = 1) {
  for (let i = 0; i < r.length; i++) for (let j = 0; j < r[i].length; j++) {
    const c = r[i][j];
    if (c !== '.') { g.fillStyle(p[c]); g.fillRect(x + j * ps, y + i * ps * k, ps, ps * k + 0.5); }
  }
}
function band(a, b, z0, z1, c, al = 1) {
  const y0 = sy(z0), y1 = sy(z1), xa0 = X(a, z0), xb0 = X(b, z0), xa1 = X(a, z1), xb1 = X(b, z1);
  g.fillStyle(c, al);
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
async function load() {
  try {
    const r = await store().get(SK);
    if (!r || !r.found || !Array.isArray(r.value)) return [];
    return r.value.filter((x) => x && typeof x.n === 'string' && typeof x.s === 'number').map((x) => ({ n: x.n.slice(0, MAXN), s: x.s })).slice(0, 10);
  } catch (e) { return []; }
}
function lbText(n) {
  return scores.length ? scores.slice(0, n).map((e, i) => String(i + 1).padStart(2, ' ') + '. ' + e.n.padEnd(MAXN, ' ') + ' ' + String(e.s).padStart(7, ' ')).join('\n') : 'AUN NO HAY CORREDORES';
}
function refreshLB() { set(lbM, lbText(8)); set(lbO, lbText(5)); }

// ---------- state ----------
function reset() {
  R = { t: 0, sd: 0, sp: 7, score: 0, ram: 100, last: 100, up: true, hist: [], ht: 0, lane: 0, px: 0, jy: 0, vy: 0, sl: 0, sh: 0, ox: 0, mg: 0, E: [], spT: 1.2, bT: 0, evT: 16, ev: null, evL: 0, bossT: 42, boss: 0, bl: 0, bt: 0, wb: 0, why: '', ov: 0, fl: 0 };
  for (let i = 0; i < 40; i++) R.hist.push(40 + i * 1.5 + Math.random() * 6);
}
function showPhase(p) {
  ph = p; pr = {};
  vis(txM, p === 'menu'); vis(txN, p === 'name'); vis(txO, p === 'over'); vis(txH, p === 'play' || p === 'pause');
  pauseTx.setVisible(p === 'pause');
  if (p !== 'play' && p !== 'pause') bossTx.setVisible(false);
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
  // menu
  const title = T(400, 72, 'RAM RUNNER', 64, S, '#ff2bd6');
  Z.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const sub = T(400, 122, 'El precio sube. Tu corres.', 16, Y);
  const lh = T(400, 178, '- TOP CORREDORES -', 16, K);
  lbM = T(400, 198, '', 15, Wt).setAlign('left').setOrigin(0.5, 0);
  const st = T(400, 452, 'PRESIONA START', 26, S);
  Z.tweens.add({ targets: st, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
  const h1 = T(400, 508, 'IZQ/DER: carril   ARRIBA o BTN1: salto   ABAJO o BTN2: deslizar', 13, C);
  const h2 = T(400, 534, 'Junta RAM, esquiva servidores y sobrevive a CHAQUETA DE CUERO', 13, Wt);
  txM = [title, sub, lh, lbM, st, h1, h2];
  // nick
  const nh = T(400, 56, 'TU NICKNAME', 34, S, '#ff2bd6');
  nickTx = T(400, 118, '_', 46, Y);
  const nf = T(400, 452, 'JOYSTICK: mover   BTN1: elegir   BTN2: borrar', 14, C);
  const nf2 = T(400, 478, '<  borrar     >  listo     (o START cuando termines)', 14, Wt);
  txN = [nh, nickTx, nf, nf2];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
    const o = T(130 + c * 60, 205 + r * 52, GR[r][c], 24, Wt);
    gridT.push(o); txN.push(o);
  }
  // game over
  ovT = T(400, 148, 'OUT OF MEMORY', 44, '#ff4d6d');
  ovR = T(400, 196, '', 16, Y);
  ovS = T(400, 238, '', 28, S);
  ovP = T(400, 276, '', 18, K);
  lbO = T(400, 312, '', 15, Wt).setAlign('left').setOrigin(0.5, 0);
  const op = T(400, 478, 'BTN1: REINTENTAR     BTN2: CAMBIAR NICK', 16, C);
  txO = [ovT, ovR, ovS, ovP, lbO, op];
  // hud
  hS = T(20, 22, '', 24, Y, '#07031a', 0);
  hR = T(780, 22, '', 24, S, '#07031a', 1);
  hN = T(400, 22, '', 14, Wt);
  hT = T(400, 580, '', 15, C);
  txH = [hS, hR, hN, hT];
  ban = T(400, 255, '', 26, Y).setDepth(11).setAlpha(0);
  pauseTx = T(400, 300, 'PAUSA', 56, Y).setDepth(12);
  bossTx = T(400, 100, '', 16, '#07031a', '#ffffff').setDepth(11);

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
  R.sl = Math.max(0, R.sl - dt); R.fl = Math.max(0, R.fl - dt);
  R.sp = (7 + Math.min(R.t * 0.12, 8.5)) * (ox ? 1.25 : 1);
  R.sd += R.sp * dt; R.score += R.sp * dt * 6 * (ox ? 2 : 1);
  R.ox = Math.max(0, R.ox - dt); R.mg = Math.max(0, R.mg - dt);
  R.ram *= 1 + dt * 0.012;
  R.ht += dt;
  if (R.ht > 0.6) { R.ht = 0; R.up = R.ram >= R.last; R.last = R.ram; R.hist.push(R.ram); R.hist.shift(); }

  // eventos
  if (!R.ev && !R.boss) {
    if (R.t >= R.bossT) startBoss();
    else if (R.t >= R.evT) startEv(Math.random() < 0.5 ? 'b' : 'h');
  }
  if (R.ev) {
    R.evL -= dt;
    if (R.ev === 'b') { R.ram *= 1 + dt * 0.3; R.bT -= dt; if (R.bT <= 0) { R.bT = 0.28; coins(ri(-1, 1), 34, ri(3, 5), 0); } }
    if (R.evL <= 0) endEv();
  }
  if (R.boss) {
    R.bl -= dt; R.bt += dt;
    R.spT -= dt;
    if (R.spT <= 0) { R.spT = 0.85; bossRow(); }
    if (R.bl <= 0) endBoss();
  } else if (R.ev !== 'b') {
    R.spT -= dt;
    if (R.spT <= 0) { R.spT = Math.max(0.5, 1.15 - R.t * 0.007) + Math.random() * 0.25; row(); }
  }

  for (const e of R.E) {
    e.z -= R.sp * dt;
    if (e.k === 'c' && R.mg > 0 && e.z < 10) e.l += (R.px - e.l) * Math.min(1, dt * 5);
  }
  for (const e of R.E) {
    if (e.d || e.k === 'f' || e.z > 0.5 || e.z < -0.5) continue;
    if (Math.abs(R.px - e.l) > 0.62) continue;
    if (e.k === 'o') {
      const hit = e.o === 0 ? R.jy < 45 : e.o === 1 ? (R.sl <= 0 && R.jy < 70) : true;
      if (hit) {
        if (R.sh > 0) { R.sh = 0; e.d = 1; sfx('b'); pop(X(R.px, 0), GY - 90, 'ESCUDO ROTO', '#2bd9ff'); R.fl = 0.3; }
        else { die(R.boss && e.o === 2 ? 'CHAQUETA DE CUERO te dejo en visto' : WHY[e.o]); return; }
      }
    } else if (e.k === 'c') {
      if (Math.abs(R.jy - e.h) < 55) {
        e.d = 1; const v = Math.round(R.ram / 10) * (R.ox > 0 ? 2 : 1); R.score += v; sfx('c');
        pop(X(e.l, 0), GY - 110, '+' + v, '#39ff88');
      }
    } else { e.d = 1; power(e.p); R.score += 50; }
  }
  R.E = R.E.filter((e) => !e.d && e.z > -1.5);
}

function power(p) {
  if (p === 0) { R.sh = 1; say('ESCUDO: PROMPT MAGICO', '#2bd9ff'); }
  else if (p === 1) { R.ox = 6; say('OVERCLOCK x2', '#ffd23f'); }
  else { R.mg = 7; say('IMAN DE RAM', '#ff2bd6'); }
  sfx('p');
}
function startEv(k) {
  R.ev = k; R.evL = 6.5; R.bT = 0;
  if (k === 'b') say('\u00a1BURBUJA IA! LLUEVE RAM', '#39ff88');
  else { say('ALUCINACION: no todo es real', '#ff2bd6'); R.wb = 14; }
}
function endEv() {
  if (R.ev === 'b') { R.ram *= 0.5; R.up = false; say('LA BURBUJA REVENTO  RAM -50%', '#ff2bd6'); sfx('e'); }
  R.wb = 0; R.ev = null; R.evT = R.t + ri(15, 22);
}
function startBoss() { R.boss = 1; R.bl = 12; R.bt = 0; R.spT = 1; say('\u00a1CHAQUETA DE CUERO!', '#ff4d6d'); sfx('e'); }
function endBoss() {
  R.boss = 0; R.bossT = R.t + 55; R.evT = Math.max(R.evT, R.t + 10); R.score += 1500;
  say('\u00a1SOBREVIVISTE! +1500', '#39ff88'); sfx('p'); bossTx.setVisible(false);
}
function coins(l, z, n, h) { for (let i = 0; i < n; i++) R.E.push({ k: 'c', l, z: z + i * 0.9, h }); }
function row() {
  const z0 = 34, f = ri(-1, 1), a = Math.random();
  if (a < 0.22) coins(ri(-1, 1), z0, 6, 0);
  else if (a < 0.72) {
    for (let l = -1; l <= 1; l++) {
      if (l === f) { if (Math.random() < 0.4) coins(l, z0, 4, 0); continue; }
      if (Math.random() < 0.8) { const q = Math.random(); R.E.push({ k: 'o', o: q < 0.4 ? 0 : q < 0.7 ? 1 : 2, l, z: z0 }); }
    }
    if (R.ev === 'h') for (let i = 0; i < 2; i++) R.E.push({ k: 'f', o: ri(0, 2), l: ri(-1, 1), z: z0 + ri(0, 6) });
  } else if (a < 0.82) R.E.push({ k: 'p', p: ri(0, 2), l: ri(-1, 1), z: z0, h: 0 });
  else { const l = ri(-1, 1); R.E.push({ k: 'o', o: 0, l, z: z0 }); for (let i = -1; i <= 1; i++) R.E.push({ k: 'c', l, z: z0 + i * 1.3, h: 70 }); }
}
function bossRow() {
  const f = ri(-1, 1);
  for (let l = -1; l <= 1; l++) { if (l === f) coins(l, 34, 3, 0); else R.E.push({ k: 'o', o: 2, l, z: 34 }); }
}
function die(why) {
  R.why = why; R.ov = 1.2; sfx('d');
  Z.cameras.main.shake(300, 0.012); Z.cameras.main.flash(200, 255, 40, 80);
  const s = Math.floor(R.score);
  showPhase('over');
  set(ovR, why); set(ovS, 'PUNTAJE ' + s); set(ovP, 'guardando...');
  load().then((l) => {
    l.push({ n: nick, s });
    l.sort((a, b) => b.s - a.s);
    scores = l.slice(0, 10);
    const rk = scores.findIndex((x) => x.n === nick && x.s === s);
    set(ovP, rk >= 0 ? '\u00a1PUESTO #' + (rk + 1) + ' EN LA TABLA!' : 'No entraste al top 10');
    refreshLB();
    store().set(SK, scores);
  }).catch(() => set(ovP, ''));
}

// ---------- draw ----------
function hudUpd() {
  if (ph !== 'play' && ph !== 'pause') return;
  set(hS, 'PTS ' + String(R.score | 0).padStart(6, '0'));
  set(hR, 'DDR5 $' + Math.round(R.ram) + (R.up ? ' ^' : ' v'));
  hR.setColor(R.up ? '#39ff88' : '#ff4d6d');
  set(hN, nick);
  set(hT, [R.sh ? 'ESCUDO' : '', R.ox > 0 ? 'x2 ' + Math.ceil(R.ox) + 's' : '', R.mg > 0 ? 'IMAN ' + Math.ceil(R.mg) + 's' : ''].filter(Boolean).join('   '));
}

function draw() {
  g.clear();
  for (let i = 0; i < 14; i++) bx(0, i * HZ / 14, W, HZ / 14 + 1, mix(0x07031a, 0x7a1a86, i / 13));
  g.fillStyle(0xff8a3d); g.fillCircle(400, HZ, 100);
  for (let k = 0; k < 6; k++) { const y = HZ - 72 + k * 13; bx(295, y, 210, 2 + k, mix(0x07031a, 0x7a1a86, y / HZ)); }
  // grafico de precio
  const h = R.hist, mn = Math.min(...h), mx = Math.max(...h);
  g.lineStyle(3, 0x39ff88, 0.55); g.beginPath();
  h.forEach((v, i) => { const x = 20 + i * 760 / (h.length - 1), y = 185 - (v - mn) / (mx - mn + 1) * 120; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.strokePath();
  // jefe
  if (R.boss && ph !== 'over') {
    const e = Math.min(1, R.bt / 0.8), ps = 7 * e;
    art(BOSS, BP, 400 - 5 * ps, HZ - 12 * ps + Math.sin(R.t * 3) * 3, ps);
    set(bossTx, BL_[Math.floor(R.bt / 2.4) % BL_.length]);
    bx(400 - bossTx.width / 2 - 12, 82, bossTx.width + 24, 36, 0xffffff, 0.92);
    bossTx.setVisible(e >= 1 && ph !== 'pause');
  }
  // suelo
  bx(0, HZ, W, H - HZ, 0x120626);
  g.lineStyle(1, 0xff2bd6, 0.2);
  for (let i = -9; i <= 9; i++) g.lineBetween(400, HZ, 400 + i * 140, H);
  const fr = R.sd % BL, par = Math.floor(R.sd / BL);
  for (let n = NB; n >= 0; n--) {
    const z0 = n * BL - fr, z1 = z0 + BL, al = (n + par) & 1;
    bx(0, sy(z0), W, 1 + sc(z0) * 1.5, 0xff2bd6, 0.25);
    band(-1.5, 1.5, z0, z1, al ? 0x1b1233 : 0x241845);
    band(-1.58, -1.45, z0, z1, al ? 0x2bd9ff : 0xff2bd6);
    band(1.45, 1.58, z0, z1, al ? 0x2bd9ff : 0xff2bd6);
    if (al) { band(-0.53, -0.47, z0, z1, 0xf4f1ff, 0.5); band(0.47, 0.53, z0, z1, 0xf4f1ff, 0.5); }
    if (!al) for (const sd of [-1, 1]) {
      const z = z0 + BL * 0.5, s = sc(z), x = X(sd * 2.25, z), y = sy(z), w = 90 * s, hh = 190 * s;
      bx(x - w / 2, y - hh, w, hh, 0x0d0820); bx(x - w / 2 + 3 * s, y - hh + 3 * s, w - 6 * s, hh - 6 * s, 0x1f1547);
      for (let i = 0; i < 5; i++) bx(x - w / 2 + 10 * s, y - hh + (16 + i * 30) * s, 10 * s, 6 * s, ((n * 7 + i * 3 + (R.t * 3 | 0)) % 5 < 2) ? 0x39ff88 : 0xff2bd6);
    }
  }
  // entidades y jugador
  const L = R.E.slice().sort((a, b) => b.z - a.z);
  let pd = false;
  for (const e of L) { if (!pd && e.z <= 0.15) { drawP(); pd = true; } drawE(e); }
  if (!pd) drawP();
  if (R.fl > 0) bx(0, 0, W, H, 0x2bd9ff, R.fl * 0.5);
  if (R.ev === 'h') for (let i = 0; i < 6; i++) bx(0, Math.random() * H, W, ri(2, 14), [0xff2bd6, 0x2bd9ff, 0x39ff88][i % 3], 0.12);
  // paneles
  if (ph === 'menu') { bx(210, 160, 380, 250, 0x07031a, 0.85); bx(210, 160, 380, 3, 0xff2bd6); bx(210, 407, 380, 3, 0x2bd9ff); }
  if (ph === 'name') {
    bx(0, 0, W, H, 0x07031a, 0.8);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
      const a = r * 10 + c === cur.k;
      bx(130 + c * 60 - 26, 205 + r * 52 - 22, 52, 44, a ? 0xff2bd6 : 0x1b1233, a ? 0.9 : 0.9);
    }
  }
  if (ph === 'over') { bx(150, 105, 500, 410, 0x07031a, 0.88); bx(150, 105, 500, 3, 0xff4d6d); bx(150, 512, 500, 3, 0x2bd9ff); }
  if (ph === 'pause') bx(0, 0, W, H, 0x07031a, 0.6);
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
  const z = e.z, s = sc(z), y = sy(z), x = X(e.l, z);
  if (s > 1.9) return;
  const fa = Math.max(0, Math.min(1, (36 - z) / 6));
  if (e.k === 'o' || e.k === 'f') {
    const a = (e.k === 'f' ? 0.3 + 0.25 * Math.sin(R.t * 18 + e.l * 3) : 1) * fa, o = e.o;
    if (o === 0) {
      const w = 118 * s, hh = 42 * s;
      bx(x - w / 2, y - hh, w, hh, 0x4a4f7a, a); bx(x - w / 2, y - hh, w, 8 * s, 0xff3b6b, a);
      for (let i = 0; i < 4; i++) bx(x - w / 2 + (10 + i * 26) * s, y - hh + 16 * s, 14 * s, 6 * s, (i + (R.t * 4 | 0)) % 3 ? 0x39ff88 : 0x1a2a2a, a);
    } else if (o === 1) {
      const w = 136 * s;
      bx(x - w / 2, y - 74 * s, 6 * s, 74 * s, 0x888aa8, a); bx(x + w / 2 - 6 * s, y - 74 * s, 6 * s, 74 * s, 0x888aa8, a);
      for (let i = 0; i < 8; i++) bx(x - w / 2 + i * w / 8, y - 74 * s, w / 8, 26 * s, i & 1 ? 0xffd23f : 0x18181f, a);
    } else {
      const w = 130 * s, hh = 132 * s;
      bx(x - w / 2, y - hh, w, hh, 0x39ff88, a); bx(x - w / 2 + 6 * s, y - hh + 6 * s, w - 12 * s, hh - 12 * s, 0x0b1f1a, a);
      for (let k = 0; k < 2; k++) {
        const cy = y - hh * (0.72 - k * 0.42);
        g.fillStyle(0x145a3a, a); g.fillCircle(x, cy, 26 * s); g.fillStyle(0x39ff88, a); g.fillCircle(x, cy, 8 * s);
      }
    }
  } else if (e.k === 'c') {
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
