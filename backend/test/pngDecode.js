// backend/test/pngDecode.js: a small PNG decoder for the tests that check sprite sheets pixel by pixel.
// Reads every non-interlaced PNG a sheet can be saved as (grey, RGB, palette, grey + alpha, RGBA; 1 to 16 bits; tRNS),
// so a lossless recompression that picks a smaller format (a palette for a sheet of few colours) reads back the same pixels.
// Returns { w, h, px }: px is 8-bit RGBA, 4 bytes a pixel, row after row.
import fs from 'node:fs';
import zlib from 'node:zlib';

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function decodePng(fileOrBuffer) {
    const buf = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fs.readFileSync(fileOrBuffer);
    let pos = 8, w = 0, h = 0, depth = 8, type = 6, interlace = 0, palette = null, trns = null;
    const idat = [];
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos), name = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
        if (name === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; interlace = data[12]; }
        else if (name === 'PLTE') palette = data;
        else if (name === 'tRNS') trns = data;
        else if (name === 'IDAT') idat.push(data);
        pos += 12 + len;
    }
    if (interlace) throw new Error('interlaced PNGs are not read here');
    const channels = CHANNELS[type];
    const bitsPerPixel = channels * depth, bpp = Math.max(1, bitsPerPixel >> 3), stride = Math.ceil(w * bitsPerPixel / 8);
    const raw = zlib.inflateSync(Buffer.concat(idat)), lines = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? lines[y * stride + x - bpp] : 0, b = y ? lines[(y - 1) * stride + x] : 0, c = x >= bpp && y ? lines[(y - 1) * stride + x - bpp] : 0;
            let v = line[x];
            if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
            else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
            lines[y * stride + x] = v & 255;
        }
    }
    // sample n of a row: the raw value at `depth` bits
    const sample = (row, n) => {
        if (depth === 8) return lines[row + n];
        if (depth === 16) return lines.readUInt16BE(row + n * 2);
        const bit = n * depth, byte = lines[row + (bit >> 3)];
        return (byte >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
    };
    const to8 = (v) => depth === 16 ? v >> 8 : depth === 8 ? v : Math.round(v * 255 / ((1 << depth) - 1));
    const px = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        const row = y * stride;
        for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            if (type === 3) {
                const i = sample(row, x);
                px[o] = palette[i * 3]; px[o + 1] = palette[i * 3 + 1]; px[o + 2] = palette[i * 3 + 2];
                px[o + 3] = trns && i < trns.length ? trns[i] : 255;
            } else if (type === 0 || type === 4) {
                const g = sample(row, x * channels);
                px[o] = px[o + 1] = px[o + 2] = to8(g);
                px[o + 3] = type === 4 ? to8(sample(row, x * channels + 1)) : (trns && g === trns.readUInt16BE(0) ? 0 : 255);
            } else {
                const r = sample(row, x * channels), gr = sample(row, x * channels + 1), bl = sample(row, x * channels + 2);
                px[o] = to8(r); px[o + 1] = to8(gr); px[o + 2] = to8(bl);
                px[o + 3] = type === 6 ? to8(sample(row, x * channels + 3))
                    : (trns && r === trns.readUInt16BE(0) && gr === trns.readUInt16BE(2) && bl === trns.readUInt16BE(4) ? 0 : 255);
            }
        }
    }
    return { w, h, px };
}
