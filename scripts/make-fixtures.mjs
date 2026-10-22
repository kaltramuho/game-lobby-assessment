import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const studios = [
  { id: 'calder', name: 'Calder' },
  { id: 'oster', name: 'Oster' },
  { id: 'veldt', name: 'Veldt' },
  { id: 'marlowe', name: 'Marlowe' },
  { id: 'kite', name: 'Kite & Co' },
  { id: 'sable', name: 'Sable' },
  { id: 'northwind', name: 'Northwind' },
  { id: 'redlamp', name: 'Redlamp' },
];

const slots = [
  'Glass Orchard', 'Night Ferry', 'Copper Saints', 'Paper Tigers', 'Salt Cathedral',
  'Wren\'s Wheel', 'Hotel Imperial', 'Red Meridian', 'Low Lamp', 'Kindling',
  'The Quiet Multiplier', 'Orchard Thief', 'Brass Pelican', 'Eleven Windows', 'Soft Currency',
  'Milk Teeth', 'Black Shore', 'Gilded Mute', 'Ferry Lights', 'Second House',
  'Yellow Archive', 'Marble Room', 'Crowns of Salt', 'Tiny Meteor', 'Velour',
  'Paper Crown', 'Night Shift', 'Glassworks', 'The Last Chair', 'Warm Static',
  'Copper Weather', 'Saints of Odds', 'Long Odds', 'Short Deck', 'Inland',
  'Ribbon', 'Half a Moon', 'Studio Apartment', 'Red Pencil', 'Northline',
  'Kettle', 'August Wheel', 'Pine Tariff', 'Velvet Audit', 'Small Lightning',
  'House Sparrow', 'Closed Kitchen', 'April Index', 'Goldfish', 'Static Mercy',
  'Lantern Tax', 'Mild Horses', 'Third Rail', 'Sugar Ledger', 'Winter Stake',
  'Opaque', 'Kind Regards', 'Low Ceiling', 'Museum Hours', 'Salt License',
];

const tables = [
  'The Long Table', 'Felt Sunday', 'Slow Blackjack', 'Pair of Gloves', 'Bankers Hour',
  'Three Seats', 'No Side Bets', 'Cedar Room', 'Even Money', 'The Counts Nap',
  'Push or Leave', 'Split Decision', 'Soft Seventeen', 'Green Lamp', 'Late Seating',
  'Four Colors', 'Quiet Pit', 'Full Shoe', 'Dealers Thumb', 'Last Box',
];

const live = [
  'Low Tide Roulette', 'Camera Three', 'Evening Spin', 'The Pit Window', 'Live Shoe',
  'Red Camera', 'Studio B', 'Hosts Choice', 'Midnight Wheel', 'Plain Roulette',
  'Salon Feed', 'Table Nine', 'Open Mic', 'Croupier Watch', 'Pit Lane',
  'Warm Felt', 'Second Camera', 'Live Holdem', 'Night Pit', 'Broadcast Shoe',
];

if (slots.length !== 60 || tables.length !== 20 || live.length !== 20) {
  throw new Error(`Expected 60/20/20 titles, got ${slots.length}/${tables.length}/${live.length}`);
}

const titles = [...slots, ...tables, ...live];

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function categoryOf(index) {
  if (index < 60) return 'slots';
  if (index < 80) return 'table';
  return 'live';
}

function rtpFor(index, category) {
  if (category === 'slots') return Math.round((94.1 + ((index * 53) % 340) / 100) * 100) / 100;
  if (category === 'table') return Math.round((97.3 + ((index * 17) % 160) / 100) * 100) / 100;
  return Math.round((96.8 + ((index * 19) % 180) / 100) * 100) / 100;
}

const games = titles.map((title, index) => {
  const category = categoryOf(index);
  const studio = studios[index % studios.length];
  const tags = [];
  if (index < 12) tags.push('new');
  if (index % 6 === 0) tags.push('hot');
  if (category === 'slots' && index % 5 === 0) tags.push('ways');
  if (index % 9 === 0) tags.push('jackpot');
  if (index % 8 === 3) tags.push('classic');
  if (index % 13 === 0) tags.push('high-limit');
  if (tags.length === 0) tags.push(index % 2 === 0 ? 'classic' : 'hot');
  const trimmed = tags.slice(0, 3);
  const high = trimmed.includes('high-limit');
  const released = new Date(Date.UTC(2026, 9, 18));
  released.setUTCDate(released.getUTCDate() - index * 4);
  let trend = 28 + ((index * 13) % 48);
  if (trimmed.includes('hot')) trend += 18;
  if (index < 8) trend += 22;
  const id = slug(title);
  if (id === 'glass-orchard') trend = 100;
  return {
    id,
    title,
    providerId: studio.id,
    provider: studio.name,
    category,
    tags: trimmed,
    rtp: id === 'glass-orchard' ? 96.98 : rtpFor(index, category),
    minBet: high ? 5 : category === 'live' ? 1 : 0.2,
    maxBet: high ? 500 : category === 'table' ? 200 : 100,
    trend: Math.min(100, trend),
    releasedAt: released.toISOString().slice(0, 10),
    playable: id === 'glass-orchard',
  };
});

const ids = new Set();
for (const game of games) {
  if (ids.has(game.id)) throw new Error(`Duplicate id ${game.id}`);
  ids.add(game.id);
}

const tagSet = new Set(games.flatMap((game) => game.tags));
for (const tag of ['new', 'hot', 'jackpot', 'classic', 'ways', 'high-limit']) {
  if (!tagSet.has(tag)) throw new Error(`Missing tag ${tag}`);
}

fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'games.json'), JSON.stringify(games, null, 2));

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([name, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function iconPng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5 - size / 2) / (size / 2);
      const dy = (y + 0.5 - size / 2) / (size / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = row + 1 + x * 4;
      let r = 0x14;
      let g = 0x12;
      let b = 0x10;
      if (dist > 0.46 && dist < 0.66) {
        r = 0xe0;
        g = 0x8a;
        b = 0x3c;
      } else if (dist <= 0.18) {
        r = 0xf4;
        g = 0xec;
        b = 0xe2;
      }
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(root, 'public', 'icon-192.png'), iconPng(192));
fs.writeFileSync(path.join(root, 'public', 'icon-512.png'), iconPng(512));
console.log(`wrote ${games.length} games`);
