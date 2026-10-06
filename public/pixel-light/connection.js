export async function permittedLight(bluetooth, rememberedId) {
  if (typeof bluetooth?.getDevices !== 'function') return undefined;
  const devices = await bluetooth.getDevices();
  if (rememberedId) return devices.find(device => device.id === rememberedId);
  const lights = devices.filter(device => /^pixel-g1s$/i.test(device.name || ''));
  return lights.length === 1 ? lights[0] : undefined;
}

export async function openLight(device, serviceId, controlId, timeoutMs = 15000) {
  let expired = false;
  let timer;
  const checkDeadline = () => {
    if (expired) { device.gatt.disconnect(); throw new Error('Connection timed out. Tap Connect light to retry.'); }
  };
  const connect = async () => {
    const server = await device.gatt.connect(); checkDeadline();
    const service = await server.getPrimaryService(serviceId); checkDeadline();
    const characteristic = await service.getCharacteristic(controlId); checkDeadline();
    if (!characteristic.properties.writeWithoutResponse) throw new Error('This device does not support the required write mode.');
    return characteristic;
  };
  try {
    return await Promise.race([connect(), new Promise((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        device.gatt.disconnect();
        reject(new Error('Connection timed out. Tap Connect light to retry.'));
      }, timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}
