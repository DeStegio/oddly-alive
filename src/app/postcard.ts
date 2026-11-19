import { FACES } from '../characters/faces';
import { MOOD_EXPRESSION, type Mood } from '../engine/types';
import { ROOMS, type RoomId } from './rooms';
import { seedToCode } from './share';

/**
 * Postcards (INT-107): an original illustration of the current scene plus a
 * line about the house's mood and the scene code. Contains no memory, no
 * nickname, no counts — only room, mood, seed and night.
 */
export interface PostcardScene {
  room: RoomId;
  mood: Mood;
  seed: number;
  night: boolean;
}

const C = {
  ink: '#24232b',
  canvas: '#f6f1e8',
  night: '#1d1b26',
  coral: '#f57963',
  blue: '#657be8',
  yellow: '#f5d873',
  mint: '#a6d7b3',
  lavender: '#b9a5db',
  floor: '#e9dcc4',
};

const TINT: Record<Mood, string> = {
  neutral: 'transparent',
  curious: C.blue,
  playful: C.yellow,
  shy: C.lavender,
  annoyed: C.coral,
  excited: C.yellow,
  sleepy: '#4a4566',
  mischievous: C.mint,
  confused: C.lavender,
  affectionate: C.coral,
};

export const W = 1200;
export const H = 800;

function pimSvg(mood: Mood, x: number, y: number, s: number) {
  const f = FACES[MOOD_EXPRESSION[mood]];
  const eye = (cx: number, cy: number, r: number) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${C.ink}" stroke-width="3"/>` +
    (f.lid >= 0.95
      ? `<path d="M${cx - r} ${cy} q ${r} ${r * 0.6} ${r * 2} 0" fill="none" stroke="${C.ink}" stroke-width="3"/>`
      : `<circle cx="${cx + 2}" cy="${cy + 2}" r="${r * 0.42 * f.pupil}" fill="${C.ink}"/>` +
        (f.lid > 0.1 ? `<rect x="${cx - r - 1}" y="${cy - r - 1}" width="${r * 2 + 2}" height="${(r * 2 + 2) * f.lid}" fill="${C.lavender}" stroke="${C.ink}" stroke-width="3"/>` : ''));
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="102" cy="162" rx="78" ry="7" fill="${C.ink}" opacity="0.18"/>
    <path d="M18 122 C 14 70, 58 20, 108 20 C 160 20, 188 60, 186 106 C 184 146, 152 160, 102 160 C 52 160, 22 154, 18 122 Z" fill="${C.lavender}" stroke="${C.ink}" stroke-width="3"/>
    <ellipse cx="60" cy="116" rx="13" ry="7" fill="${C.coral}" opacity="${f.blush * 0.75}"/>
    <ellipse cx="144" cy="114" rx="13" ry="7" fill="${C.coral}" opacity="${f.blush * 0.75}"/>
    ${eye(78, 88, 17)}${eye(124, 86, 18)}
    <path d="${f.browL}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
    <path d="${f.browR}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
    <path d="${f.mouth}" fill="${f.mouthFilled ? C.ink : 'none'}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

function backdrop(scene: PostcardScene) {
  const dark = scene.night || scene.room === 'after-hours' || scene.room === 'secret';
  const stars = Array.from({ length: 22 }, (_, i) => {
    const sx = 60 + ((scene.seed >>> (i % 16)) + i * 97) % 560;
    const sy = 60 + ((scene.seed >>> ((i + 5) % 16)) + i * 53) % 300;
    return `<circle cx="${sx}" cy="${sy}" r="${2 + (i % 3)}" fill="#fffaf1" opacity="0.85"/>`;
  }).join('');
  switch (scene.room) {
    case 'playground':
      return `<rect x="60" y="560" width="600" height="20" fill="${C.floor}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="140" y="470" width="90" height="90" rx="10" fill="${C.blue}" stroke="${C.ink}" stroke-width="3"/>
        <circle cx="300" cy="520" r="40" fill="${C.coral}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="380" y="440" width="24" height="120" rx="4" fill="${C.mint}" stroke="${C.ink}" stroke-width="3" transform="rotate(14 392 560)"/>
        <circle cx="520" cy="230" r="34" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/><path d="M520 264 q -8 20 6 40" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
    case 'mood':
      return `<path d="M200 600 V 230 Q 200 110 360 110 Q 520 110 520 230 V 600 Z" fill="${TINT[scene.mood] === 'transparent' ? '#c9dafc' : TINT[scene.mood]}" stroke="${C.ink}" stroke-width="8"/>
        <path d="M360 110 V 600 M200 380 H 520" stroke="${C.ink}" stroke-width="6"/>`;
    case 'after-hours':
      return `${stars}<circle cx="560" cy="170" r="80" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/><rect x="40" y="560" width="640" height="200" fill="#3a3150"/>`;
    case 'secret':
      return `<radialGradient id="torch"><stop offset="0" stop-color="#f2d46b" stop-opacity="0.35"/><stop offset="1" stop-color="#f2d46b" stop-opacity="0"/></radialGradient><circle cx="360" cy="380" r="300" fill="url(#torch)"/>
        <rect x="200" y="470" width="300" height="130" rx="10" fill="#8a5a3c" stroke="${C.ink}" stroke-width="3"/>`;
    case 'memory':
      return `<rect x="90" y="140" width="540" height="420" rx="18" fill="#d9b98d" stroke="${C.ink}" stroke-width="3"/>
        <rect x="130" y="180" width="200" height="140" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3" transform="rotate(-3 230 250)"/>
        <rect x="370" y="200" width="200" height="160" fill="#fffaf1" stroke="${C.ink}" stroke-width="3" transform="rotate(2 470 280)"/>`;
    default:
      return `${dark ? stars : ''}<rect x="40" y="560" width="640" height="200" fill="${dark ? '#171620' : C.floor}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M150 480 Q 150 450 180 450 L 560 450 Q 590 450 590 480 L 590 560 L 150 560 Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M80 300 L 100 240 L 140 240 L 160 300 Z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/><line x1="120" y1="300" x2="120" y2="580" stroke="${C.ink}" stroke-width="6"/>`;
  }
}

/** The illustration (no text — text is drawn with the page's fonts). */
export function buildPostcardSvg(scene: PostcardScene): string {
  const dark = scene.night || scene.room === 'after-hours' || scene.room === 'secret';
  const bg = dark ? C.night : C.canvas;
  const tint = TINT[scene.mood];
  const showPim = scene.room !== 'playground' && scene.room !== 'memory';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    ${tint !== 'transparent' ? `<rect width="${W}" height="${H}" fill="${tint}" opacity="0.12"/>` : ''}
    <clipPath id="pic"><rect x="40" y="40" width="680" height="720" rx="16"/></clipPath>
    <g clip-path="url(#pic)">${backdrop(scene)}${showPim ? pimSvg(scene.mood, 230, 300, 1.4) : ''}
      <circle cx="${showPim ? 560 : 600}" cy="${showPim ? 330 : 360}" r="30" fill="${C.blue}" stroke="${C.ink}" stroke-width="3"/>
      <circle cx="${showPim ? 562 : 602}" cy="${showPim ? 326 : 356}" r="13" fill="#fff" stroke="${C.ink}" stroke-width="2.5"/>
      <circle cx="${showPim ? 564 : 604}" cy="${showPim ? 327 : 357}" r="5.5" fill="${C.ink}"/>
    </g>
    <rect x="40" y="40" width="680" height="720" rx="16" fill="none" stroke="${C.ink}" stroke-width="5"/>
    <line x1="760" y1="580" x2="1150" y2="580" stroke="${dark ? '#f3ede2' : C.ink}" stroke-opacity="0.3" stroke-width="2"/>
    <line x1="760" y1="625" x2="1150" y2="625" stroke="${dark ? '#f3ede2' : C.ink}" stroke-opacity="0.3" stroke-width="2"/>
    <line x1="760" y1="670" x2="1150" y2="670" stroke="${dark ? '#f3ede2' : C.ink}" stroke-opacity="0.3" stroke-width="2"/>
    <g transform="translate(1030 60)">
      <rect width="120" height="140" fill="${C.yellow}" stroke="${C.ink}" stroke-width="4" stroke-dasharray="10 5"/>
      ${pimSvg(scene.mood, 12, 30, 0.48)}
    </g>
    <g fill="none" stroke="${dark ? '#f3ede2' : C.ink}" stroke-opacity="0.45" stroke-width="3">
      <circle cx="980" cy="140" r="58"/><path d="M900 120 q 40 -16 80 0 t 80 0 M900 150 q 40 -16 80 0 t 80 0"/>
    </g>
  </svg>`;
}

export interface PostcardText {
  kicker: string;
  title: string;
  line: string;
  code: string;
}

export function postcardText(scene: PostcardScene): PostcardText {
  return {
    kicker: 'Greetings from the',
    title: ROOMS[scene.room].label,
    line: `The house was feeling ${scene.mood}${scene.night ? ', after hours' : ''}.`,
    code: `scene ${seedToCode(scene.seed)} · oddly alive`,
  };
}

/** Render to a PNG blob in the browser (canvas + the page's loaded fonts). */
export async function renderPostcard(scene: PostcardScene): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildPostcardSvg(scene))}`;
  await img.decode();
  ctx.drawImage(img, 0, 0);
  await document.fonts?.ready;
  const dark = scene.night || scene.room === 'after-hours' || scene.room === 'secret';
  const t = postcardText(scene);
  ctx.fillStyle = dark ? '#f3ede2' : C.ink;
  ctx.font = '700 22px "Instrument Sans Variable", "Instrument Sans", sans-serif';
  ctx.fillText(t.kicker.toUpperCase(), 760, 250);
  ctx.font = '800 76px "Fraunces Variable", Fraunces, Georgia, serif';
  wrap(ctx, t.title, 760, 310, 400, 74);
  ctx.font = 'italic 500 30px "Fraunces Variable", Fraunces, Georgia, serif';
  wrap(ctx, t.line, 760, 470, 400, 38);
  ctx.font = '600 18px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(t.code, 760, 720);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png'));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
