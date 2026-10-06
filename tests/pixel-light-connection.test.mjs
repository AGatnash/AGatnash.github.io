import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../public/pixel-light/connection.js', import.meta.url), 'utf8');
const {permittedLight, openLight} = await import('data:text/javascript,' + encodeURIComponent(source));
test('automatic selection uses only granted devices and avoids ambiguous or revoked choices', async () => {
  const a = {id:'a', name:'Pixel-G1s'}, b = {id:'b', name:'Pixel-G1s'};
  assert.equal(await permittedLight({}, 'a'), undefined);
  assert.equal(await permittedLight({getDevices: async()=>[]}, 'a'), undefined);
  assert.equal(await permittedLight({getDevices: async()=>[a,b]}, 'b'), b);
  assert.equal(await permittedLight({getDevices: async()=>[a,b]}), undefined);
  assert.equal(await permittedLight({getDevices: async()=>[a]}), a);
  assert.equal(await permittedLight({getDevices: async()=>[a]}, 'revoked'), undefined);
});
test('connecting discovers the writable characteristic but sends no settings', async () => {
  let writes = 0;
  const characteristic = {properties:{writeWithoutResponse:true}, writeValueWithoutResponse(){writes++;}};
  const device = {gatt:{connect:async()=>({getPrimaryService:async id=>{
    assert.equal(id,'service'); return {getCharacteristic:async id=>{assert.equal(id,'control'); return characteristic;}};
  }}),disconnect(){}}};
  assert.equal(await openLight(device,'service','control'), characteristic);
  assert.equal(writes, 0);
});
test('unavailable light times out and a late connection is disconnected rather than accepted', async () => {
  let resolveConnect, disconnects = 0, discoveries = 0;
  const device = {gatt:{connect:()=>new Promise(resolve=>{resolveConnect=resolve;}),disconnect(){disconnects++;}}};
  await assert.rejects(openLight(device,'service','control',10),/timed out/);
  resolveConnect({getPrimaryService(){discoveries++;}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(discoveries,0); assert.equal(disconnects,2);
});
