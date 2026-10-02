export const SERVICE = '0000ffe0-0000-1000-8000-00805f9b34fb';
export const CONTROL = '0000ffe1-0000-1000-8000-00805f9b34fb';
function integer(value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`Expected integer ${min}–${max}`);
  return value;
}
export function crc16(bytes) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc;
}
export function escape(bytes) {
  return bytes.flatMap(b => b === 4 || b === 11 ? [52, b] : b === 52 ? [52, 0] : [b]);
}
export function frame(command, payload) {
  const prefix = [0, 0, 0, 0, 0, 0, command >>> 8, command & 255];
  const crc = crc16([...prefix, payload.length, ...payload]);
  const inner = [4, ...prefix, ...escape([payload.length, ...payload, crc >>> 8, crc & 255]), 11];
  const count = Math.ceil(inner.length / 11);
  if (count > 4) throw new RangeError('Frame too long');
  return Array.from({length: count}, (_, i) => {
    const chunk = inner.slice(i * 11, (i + 1) * 11);
    return Uint8Array.from(count === 1 ? [241, 221, chunk.length + 4, 0, 0, 0, 0, ...chunk] :
      [241, 221, chunk.length + 5, 0, 0, 0, 0, (count - 1) * 16 + i, ...chunk]);
  });
}
export const brightness = value => frame(0x0105, [0, integer(value, 0, 100)]);
export function cct(kelvin, level) {
  integer(kelvin, 2500, 8500); integer(level, 0, 100);
  return frame(0x0111, [kelvin >>> 8, kelvin & 255, 0, level]);
}
export function hsi(hue, saturation, level) {
  integer(hue, 0, 360); integer(saturation, 0, 100); integer(level, 0, 100);
  return frame(0x0143, [hue >>> 8, hue & 255, 0, saturation, 0, level]);
}
// No queued replay: a failed or disconnected write stops the command immediately.
export async function sendPackets(characteristic, packets, connected, pause = ms => new Promise(r => setTimeout(r, ms))) {
  for (const packet of packets) {
    if (!connected()) throw new Error('Light disconnected. Reconnect and apply again.');
    await characteristic.writeValueWithoutResponse(packet);
    await pause(100);
  }
}
