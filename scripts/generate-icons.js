import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

function createPng(size) {
  const width = size
  const height = size
  // Create RGBA buffer
  const rowSize = width * 4 + 1 // +1 for filter byte
  const rawData = Buffer.alloc(rowSize * height)

  const radius = size * 0.42
  const cx = size / 2
  const cy = size / 2

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize
    rawData[rowOffset] = 0 // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= radius) {
        // Turf green with cricket seam
        const isSeam = Math.abs(dx * 0.7 + dy * 0.7) < size * 0.04
        if (isSeam) {
          rawData[pxOffset] = 255     // R
          rawData[pxOffset + 1] = 255 // G
          rawData[pxOffset + 2] = 255 // B
          rawData[pxOffset + 3] = 255 // A
        } else {
          rawData[pxOffset] = 34      // R: Turf Green #22C55E
          rawData[pxOffset + 1] = 197 // G
          rawData[pxOffset + 2] = 94  // B
          rawData[pxOffset + 3] = 255 // A
        }
      } else {
        // Transparent or dark background
        rawData[pxOffset] = 8       // R: #080C0E
        rawData[pxOffset + 1] = 12  // G
        rawData[pxOffset + 2] = 14  // B
        rawData[pxOffset + 3] = 255 // A
      }
    }
  }

  const deflated = zlib.deflateSync(rawData)

  // Helper to build chunk
  function buildChunk(type, data) {
    const len = data.length
    const buf = Buffer.alloc(8 + len + 4)
    buf.writeUInt32BE(len, 0)
    buf.write(type, 4, 4, 'ascii')
    data.copy(buf, 8)

    // Calculate CRC32
    const crc = calcCrc32(buf.subarray(4, 8 + len))
    buf.writeUInt32BE(crc, 8 + len)
    return buf
  }

  // Simple CRC32 implementation
  function calcCrc32(buf) {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i]
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
      }
    }
    return (c ^ 0xffffffff) >>> 0
  }

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const ihdrChunk = buildChunk('IHDR', ihdr)

  // IDAT chunk
  const idatChunk = buildChunk('IDAT', deflated)

  // IEND chunk
  const iendChunk = buildChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk])
}

const publicDir = path.resolve('public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPng(192))
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPng(512))
console.log('Generated icon-192.png and icon-512.png')
