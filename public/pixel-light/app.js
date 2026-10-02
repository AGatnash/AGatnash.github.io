import {SERVICE, CONTROL, brightness, cct, hsi, sendPackets} from './protocol.js';
const $ = id => document.getElementById(id);
let device, characteristic, busy = false, connecting = false;
const connected = () => !!device?.gatt?.connected && !!characteristic;
function render() {
  $('fieldset').disabled = !connected() || busy;
  $('connect').hidden = connected(); $('connect').disabled = connecting || busy;
  $('disconnect').hidden = !connected(); $('disconnect').disabled = busy;
}
function disconnected() {
  characteristic = undefined;
  $('status').textContent = 'Not connected';
  $('message').textContent = 'Light disconnected. Reconnect to send another command. Nothing is replayed automatically.';
  render();
}
function explain(error) {
  if (error.name === 'NotFoundError') return 'No light selected. Tap Connect light to try again.';
  if (error.name === 'SecurityError') return 'Bluetooth permission was blocked. Open this HTTPS page in Chrome and allow access to your light.';
  return `${error.message || 'Bluetooth command failed.'} Keep the light nearby, disconnect other devices, then reconnect.`;
}
$('connect').addEventListener('click', async () => {
  connecting = true; render(); $('status').textContent = 'Choose your Pixel-G1s…';
  try {
    const selected = await navigator.bluetooth.requestDevice({filters: [{namePrefix: 'Pixel'}, {namePrefix: 'PIXEL'}], optionalServices: [SERVICE]});
    if (device) device.removeEventListener('gattserverdisconnected', disconnected);
    device = selected; device.addEventListener('gattserverdisconnected', disconnected);
    $('status').textContent = 'Connecting…';
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE);
    characteristic = await service.getCharacteristic(CONTROL);
    if (!characteristic.properties.writeWithoutResponse) throw new Error('This device does not support the required write mode.');
    $('status').textContent = `Connected · ${device.name || 'Pixel light'}`;
    $('message').textContent = 'Ready. Connecting does not change any light settings.';
  } catch (error) {
    characteristic = undefined; device?.gatt?.disconnect();
    $('status').textContent = 'Not connected'; $('message').textContent = explain(error);
  } finally { connecting = false; render(); }
});
$('disconnect').addEventListener('click', () => { device?.gatt?.disconnect(); disconnected(); });
for (const [id, suffix] of [['brightness','%'],['kelvin',' K'],['hue','°'],['saturation','%']]) {
  $(id).addEventListener('input', () => { $(`${id}-value`).textContent = $(id).value + suffix; });
}
async function apply(label, build) {
  if (busy || !connected()) return;
  busy = true; render(); $('message').textContent = `Sending ${label.toLowerCase()}…`;
  try {
    await sendPackets(characteristic, build(), connected);
    if (!connected()) throw new Error('Light disconnected before the command completed.');
    $('message').textContent = `${label} sent. Check the light to confirm; it does not report its settings back.`;
  } catch (error) {
    device?.gatt?.disconnect(); disconnected(); $('message').textContent = explain(error);
  } finally { busy = false; render(); }
}
const number = id => Number($(id).value);
$('apply-brightness').addEventListener('click', () => apply('Brightness', () => brightness(number('brightness'))));
$('apply-cct').addEventListener('click', () => apply('White temperature', () => cct(number('kelvin'),number('brightness'))));
$('apply-hsi').addEventListener('click', () => apply('Colour', () => hsi(number('hue'),number('saturation'),number('brightness'))));
$('controls').addEventListener('submit', e => e.preventDefault());
if (!window.isSecureContext || !navigator.bluetooth) {
  $('connect').disabled = true;
  $('status').textContent = 'Bluetooth unavailable';
  $('message').textContent = 'Open this page over HTTPS in Chrome on Android or a Bluetooth-enabled computer. iPhone browsers are not supported.';
}
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').then(async () => {
    await navigator.serviceWorker.ready;
    $('offline').textContent = 'Saved for offline use on this device.';
  }).catch(() => { $('offline').textContent = 'Offline saving failed. Keep an internet connection when opening this page.'; });
} else { $('offline').textContent = 'Offline access is unavailable in this browser.'; }
