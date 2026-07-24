const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../images');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const createPNG = (width, height, r, g, b, a = 255) => {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const createChunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
  };
  
  const crc32 = (buf) => {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return ~crc >>> 0;
  };
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b, a);
    }
  }
  
  const deflate = (data) => {
    const zlib = require('zlib');
    return zlib.deflateSync(Buffer.from(data));
  };
  
  const compressedData = deflate(rawData);
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
};

const icons = [
  { name: 'home.png', color: [102, 102, 102] },
  { name: 'home-active.png', color: [30, 144, 255] },
  { name: 'ticket.png', color: [102, 102, 102] },
  { name: 'ticket-active.png', color: [30, 144, 255] },
  { name: 'taxi.png', color: [102, 102, 102] },
  { name: 'taxi-active.png', color: [30, 144, 255] },
  { name: 'order.png', color: [102, 102, 102] },
  { name: 'order-active.png', color: [30, 144, 255] },
  { name: 'profile.png', color: [102, 102, 102] },
  { name: 'profile-active.png', color: [30, 144, 255] },
];

icons.forEach(icon => {
  const png = createPNG(48, 48, icon.color[0], icon.color[1], icon.color[2]);
  fs.writeFileSync(path.join(iconsDir, icon.name), png);
  console.log(`Created ${icon.name}`);
});

console.log('All icons created successfully!');