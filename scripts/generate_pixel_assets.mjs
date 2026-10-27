// Generates the game's pixel-art sheets without a canvas or third-party packages.
// Run with: node scripts/generate_pixel_assets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const output = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/sprites');
mkdirSync(output, { recursive: true });
const CELL = 32, SCALE = 2, FRAMES = 4;

// PNG chunks use the standard CRC-32 checksum over their type and payload.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const b of Buffer.concat([name, data])) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, name, data, checksum]);
}
function png(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; // 8-bit RGBA
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(scanlines, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function sheet(rows) {
  const width = CELL * FRAMES, height = CELL * rows;
  const pixels = Buffer.alloc(width * height * 4);
  return {
    width, height, pixels,
    draw(col, row) {
      return (x, y, w, h, color) => {
        const hex = color.replace('#', '');
        const rgba = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
        for (let py = Math.max(0, y * SCALE); py < Math.min(CELL, (y + h) * SCALE); py++) {
          for (let px = Math.max(0, x * SCALE); px < Math.min(CELL, (x + w) * SCALE); px++) {
            const offset = ((row * CELL + py) * width + col * CELL + px) * 4;
            for (let i = 0; i < 4; i++) pixels[offset + i] = rgba[i];
          }
        }
      };
    },
  };
}
const O = '#202336', SKIN = '#e7ad78', SKIN_DARK = '#ad684c', WHITE = '#fff0c6';
const directions = ['down', 'up', 'left', 'right'];
function person(p, frame, direction, palette, captain = false, attacking = false) {
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const step = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const [cloth, light, dark, hair, trim] = palette;
  // Boots, legs and a dark silhouette keep the figure legible at native size.
  p(4 + step, 13, 3, 2, O); p(9 - step, 13, 3, 2, O);
  p(4 + step, 13, 2, 1, dark); p(9 - step, 13, 2, 1, dark);
  p(4, 8 + bob, 8, 5 - bob, O); p(5, 8 + bob, 6, 4 - bob, cloth);
  p(3, 9 + bob, 2, 3, O); p(11, 9 + bob, 2, 3, O);
  p(4, 9 + bob, 1, 2, SKIN); p(11, 9 + bob, 1, 2, SKIN);
  p(5, 10 + bob, 6, 1, trim); p(7, 10 + bob, 2, 1, WHITE);
  p(4, 3 + bob, 8, 6, O); p(5, 4 + bob, 6, 4, SKIN);
  p(4, 2 + bob, 8, 2, hair); p(5, 1 + bob, 6, 1, hair);
  if (direction === 'up') {
    p(5, 3 + bob, 6, 4, hair); p(6, 3 + bob, 3, 1, light);
    p(6, 8 + bob, 4, 2, dark);
  } else if (direction === 'down') {
    p(6, 5 + bob, 1, 1, O); p(9, 5 + bob, 1, 1, O);
    p(7, 7 + bob, 2, 1, SKIN_DARK); p(5, 3 + bob, 2, 1, hair);
  } else {
    const right = direction === 'right';
    p(right ? 9 : 5, 5 + bob, 1, 1, O); p(right ? 10 : 5, 6 + bob, 1, 1, SKIN_DARK);
    p(right ? 5 : 10, 4 + bob, 1, 3, hair);
  }
  p(5, 8 + bob, 2, 1, light); p(9, 8 + bob, 2, 1, light);
  if (captain) {
    p(3, 2 + bob, 2, 2, trim); p(11, 2 + bob, 2, 2, trim);
    p(4, 1 + bob, 1, 2, trim); p(11, 1 + bob, 1, 2, trim);
    p(2, 8 + bob, 3, 2, dark); p(11, 8 + bob, 3, 2, dark);
    p(2, 8 + bob, 2, 1, trim); p(12, 8 + bob, 2, 1, trim);
    p(13, 5, 1, 8, O); p(14, 4, 1, 7, trim); p(13, 11, 2, 1, WHITE);
  } else {
    p(6, 3 + bob, 4, 1, trim); // headband
    if (!attacking) { p(12, 10 + bob, 1, 4, dark); p(13, 8 + bob, 1, 4, '#d9e3df'); }
  }
  if (attacking) {
    // Four distinct phases: wind-up, swing, impact and recovery.
    const cyan = '#53c9e8', blade = '#e0f7f8', gold = '#edc267';
    if (frame === 0 || frame === 3) {
      const x = direction === 'left' ? 2 : 13;
      p(x, 5 + (frame === 3 ? 1 : 0), 1, 6, cyan);
      p(x, 5 + (frame === 3 ? 1 : 0), 1, 3, blade);
      p(x - 1, 10, 3, 1, gold);
    } else if (direction === 'up') {
      p(7, 0, 2, 5, cyan); p(8, 0, 1, 4, blade); p(6, 4, 4, 1, gold);
      if (frame === 2) { p(4, 0, 2, 1, blade); p(11, 1, 2, 1, cyan); }
    } else if (direction === 'down') {
      p(7, 11, 2, 5, cyan); p(8, 12, 1, 4, blade); p(6, 11, 4, 1, gold);
      if (frame === 2) { p(4, 15, 2, 1, blade); p(11, 14, 2, 1, cyan); }
    } else {
      const x = direction === 'left' ? 0 : 11;
      p(x, 8, 5, 2, cyan); p(x, 8, 5, 1, blade);
      p(direction === 'left' ? 4 : 11, 7, 1, 4, gold);
      if (frame === 2) { p(direction === 'left' ? 0 : 15, 5, 1, 2, blade); p(direction === 'left' ? 1 : 14, 12, 1, 2, cyan); }
    }
  }
}
const tribes = {
  blood: ['#a73542','#e26967','#542a3b','#54252c','#f4bf74'],
  fire: ['#c65a2c','#f49b42','#783029','#522b28','#ffe181'],
  necro: ['#665486','#a48abb','#39344e','#27253b','#9de4c4'],
  beast: ['#718443','#b3ba6a','#45553a','#473529','#e8c184'],
  iron: ['#657887','#a9bec7','#36495c','#393d48','#edcf83'],
};
function monster(p, name, f) {
  const bob = f % 2;
  if (name === 'squirrel') {
    p(10, 3 + bob, 4, 7, O); p(11, 4 + bob, 3, 5, '#b96a36'); p(12, 5 + bob, 2, 3, '#e7a65e');
    p(3, 7 + bob, 8, 6, O); p(4, 8 + bob, 6, 4, '#c8793d'); p(6, 10 + bob, 3, 2, '#f4cd92');
    p(3, 4 + bob, 5, 5, O); p(4, 5 + bob, 4, 3, '#d7914c'); p(3, 3 + bob, 2, 2, O); p(4, 4 + bob, 1, 1, '#f3c58d'); p(5, 6 + bob, 1, 1, O);
    p(4, 13, 2, 1, O); p(8, 13, 2, 1, O);
  } else if (name === 'rabbit') {
    p(4, 1 + bob, 2, 6, O); p(8, 1 + bob, 2, 6, O); p(5, 2 + bob, 1, 4, '#e9a8a7'); p(9, 2 + bob, 1, 4, '#e9a8a7');
    p(3, 5 + bob, 8, 5, O); p(4, 6 + bob, 6, 3, '#ede5d9'); p(5, 7 + bob, 1, 1, O); p(8, 7 + bob, 1, 1, O); p(6, 8 + bob, 2, 1, '#e79b99');
    p(4, 9 + bob, 8, 4, O); p(5, 10 + bob, 6, 2, '#d7d1cf'); p(3, 12, 3, 2, O); p(9, 12, 3, 2, O); p(11, 9 + bob, 2, 2, WHITE);
  } else if (name === 'worm') {
    // 'worm' is the green informant grunt in the game, not an animal.
    p(2,3,1,10,'#419b63'); p(13,3,1,10,'#419b63'); p(3,2,10,1,'#419b63'); p(3,13,10,1,'#419b63');
    p(4,3+bob,8,6,O); p(5,4+bob,6,4,'#84c77f'); p(5,3+bob,6,2,'#315b48');
    p(6,6+bob,1,1,O); p(9,6+bob,1,1,O); p(7,7+bob,2,1,'#416e4b');
    p(4,9+bob,8,4-bob,O); p(5,9+bob,6,3-bob,'#4e8757'); p(7,10+bob,2,1,'#d3d782');
    p(4,13,3,2,O); p(9,13,3,2,O); p(3,9+bob,1,3,'#84c77f'); p(12,9+bob,1,3,'#84c77f');
  } else {
    p(3, 4 + bob, 10, 9, O); p(4, 5 + bob, 8, 6, '#65905a'); p(5, 4 + bob, 2, 2, '#94bd75'); p(9, 4 + bob, 2, 2, '#94bd75');
    p(5, 7 + bob, 2, 1, '#ffdd82'); p(9, 7 + bob, 2, 1, '#ffdd82'); p(6, 7 + bob, 1, 1, O); p(9, 7 + bob, 1, 1, O);
    p(6, 10 + bob, 4, 1, O); p(7, 10 + bob, 1, 1, WHITE); p(4, 12, 3, 2, O); p(9, 12, 3, 2, O);
    p(1, 8 + bob, 2, 4, O); p(13, 8 + bob, 2, 4, O);
  }
}
function tile(p, name, v) {
  const colors = {
    grass: ['#3d713b','#528b47','#315c36'], dirt: ['#93643e','#b07d4f','#765039'], stone_floor: ['#66727d','#8c99a0','#46545e'],
    wall: ['#697684','#9da8ab','#3f4d59'], haunted_grass: ['#465b52','#60756a','#34453f'], fortress_floor: ['#555769','#787b8b','#373b4e'],
    lava: ['#bb3e2c','#f47a31','#742b30'], water: ['#346b89','#62a6b8','#26516f'], tree: ['#3d713b','#5f9b4c','#294c36'],
    shrine: ['#9d7853','#d4ad77','#674a39'], tavern: ['#9b744f','#d6a477','#543d35'],
  };
  const [base, light, dark] = colors[name]; p(0,0,16,16,base);
  if (['stone_floor','fortress_floor','wall'].includes(name)) {
    p(0,0,16,1,dark); p(0,8,16,1,dark); p(7,0,1,8,dark); p(3,8,1,8,dark); p(12,8,1,8,dark);
    p(1,1,5,1,light); p(9,2,5,1,light); p(5,9,5,1,light);
    if (name === 'wall') { p(0,0,16,2,dark); p(0,0,16,1,light); p(1,5,3,1,light); }
  } else if (name === 'water' || name === 'lava') {
    for (let y=2; y<16; y+=5) { const x=(y*3+v*3)%11; p(x,y,4,1,light); p((x+6)%12,y+2,3,1,dark); }
    if (name === 'lava') { p(3+v,5,2,1,'#ffd26a'); p(10,12,2,1,'#ffd26a'); }
  } else {
    for (let i=0;i<10;i++) { const x=(i*7+v*3)%15, y=(i*11+v*5)%15; p(x,y,2,1,i%2 ? light : dark); }
    if (name === 'grass' && v === 1) { p(7,6,1,1,'#ffdf79'); p(8,7,1,1,'#f2a19b'); }
    if (name === 'haunted_grass') { p(10,5,1,3,'#a5bd97'); p(9,6,3,1,'#a5bd97'); }
  }
  if (name === 'tree') {
    p(6,9,4,6,'#503b2d'); p(7,10,2,5,'#9e7042'); p(3,3,10,8,dark); p(4,2,8,8,'#35663d'); p(5,2,6,1,light); p(3,5,3,3,'#4e8846'); p(9,4,3,3,'#4e8846'); p(6,6,2,1,'#80ad58');
  } else if (name === 'shrine') {
    p(3,6,10,8,dark); p(4,6,8,7,'#e1cfaa'); p(5,8,2,5,'#b84437'); p(9,8,2,5,'#b84437'); p(2,5,12,2,'#553a36'); p(3,4,10,1,'#b4553e'); p(7,3,2,2,'#efca81');
  } else if (name === 'tavern') {
    p(2,7,12,8,dark); p(3,7,10,7,'#e2bd80'); p(2,5,12,2,'#673b32'); p(3,4,10,1,'#a6533b'); p(6,9,4,5,'#684433'); p(4,8,2,2,'#f9d889'); p(11,8,2,2,'#f9d889');
  }
}
function effect(p, name, f) {
  const c = { hellfire: ['#8e3034','#f16c31','#ffe080'], shadow: ['#403052','#815b9b','#d1a8d9'], nova: ['#c57c38','#ffe197','#fff5d5'], slash: ['#5b8da2','#b6e6e6','#ffffff'], heal: ['#3e9d79','#8fe6b1','#e3ffcf'] }[name];
  const [dark, mid, bright] = c;
  if (name === 'hellfire') {
    p(4,10,8,4,dark); p(3,8,10,4,mid); p(5,5-f%2,3,7,mid); p(9,4+f%2,2,8,mid); p(6,8,4,5,bright); p(7,6,2,3,bright);
  } else if (name === 'shadow') {
    p(3,5,10,7,dark); p(5,3,6,11,dark); p(4+f%2,6,8,5,mid); p(7,4,2,8,mid); p(6,7,4,3,bright); p(2,3+f,1,1,mid); p(13,11-f,1,1,mid);
  } else if (name === 'nova') {
    const r=2+f; p(8-r,7,2*r,2,mid); p(7,8-r,2,2*r,mid); p(5,5,6,6,mid); p(6,6,4,4,bright); p(3,3,2,2,dark); p(11,11,2,2,dark); p(11,3,2,2,dark); p(3,11,2,2,dark);
  } else if (name === 'slash') {
    p(3+f,11,3,2,dark); p(5+f,9,3,2,mid); p(7+f,7,3,2,mid); p(9+f,5,3,2,bright); p(11+f,3,2,2,bright); p(4+f,10,2,1,bright); p(6+f,8,2,1,bright);
  } else {
    p(7,4,2,8,mid); p(4,7,8,2,mid); p(7,5,2,6,bright); p(5,7,6,2,bright); p(3,3+f%2,1,2,dark); p(2,4+f%2,3,1,dark); p(12,10-f%2,1,3,dark); p(11,11-f%2,3,1,dark);
  }
}
const manifest = { version: 1, frameSize: { width: CELL, height: CELL }, sheets: {} };
function generate(name, names, draw, animation) {
  const s = sheet(names.length);
  const entries = {};
  names.forEach((key, row) => {
    entries[key] = { frames: [] };
    for (let frame=0; frame<FRAMES; frame++) {
      draw(s.draw(frame,row), key, frame);
      entries[key].frames.push({ x: frame*CELL, y: row*CELL, width: CELL, height: CELL });
    }
  });
  writeFileSync(resolve(output, `${name}.png`), png(s.width,s.height,s.pixels));
  manifest.sheets[name] = { file: `${name}.png`, width: s.width, height: s.height, frameCount: FRAMES, frameDurationMs: animation ? 150 : null, entries };
}
generate('player', [...directions, ...directions.map(d => `attack_${d}`)], (p,d,f) => person(p,f,d.replace('attack_', ''),['#4777a3','#8cb9ca','#344c67','#302b35','#e9c66b'],false,d.startsWith('attack_')), true);
generate('captains', Object.keys(tribes), (p,n,f) => person(p,f,'down',tribes[n],true), true);
generate('monsters', ['squirrel','rabbit','worm','grunt'], (p,n,f) => monster(p,n,f), true);
generate('tiles', ['grass','dirt','stone_floor','wall','haunted_grass','fortress_floor','lava','water','tree','shrine','tavern'], tile, false);
generate('effects', ['hellfire','shadow','nova','slash','heal'], effect, true);
writeFileSync(resolve(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated five sprite sheets and manifest in ${output}`);
