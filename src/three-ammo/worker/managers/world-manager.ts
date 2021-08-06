import { BUFFER_CONFIG } from "../../lib/constants";
import { initializeAmmoWasm } from "../ammo-wasm-initialize";
import { World } from "../wrappers/world";
import {
  ClientMessageType,
  ISharedBuffers,
  MessageType,
} from "../../lib/types";

export let world;

export let freeIndexArray: Int32Array;

export let vector3Tmp1: Ammo.btVector3;
export let vector3Tmp2: Ammo.btVector3;
export let quatTmp1: Ammo.btQuaternion;

export let usingSharedArrayBuffer = false;

export let sharedBuffers: ISharedBuffers;

async function initWorld({
  wasmUrl,
  sharedBuffers: transferredBuffers,
  worldConfig,
  isSharedArrayBufferSupported,
}) {
  const Ammo = await initializeAmmoWasm(wasmUrl);

  vector3Tmp1 = new Ammo.btVector3(0, 0, 0);
  vector3Tmp2 = new Ammo.btVector3(0, 0, 0);
  quatTmp1 = new Ammo.btQuaternion(0, 0, 0, 0);

  freeIndexArray = new Int32Array(BUFFER_CONFIG.MAX_BODIES);
  for (let i = 0; i < BUFFER_CONFIG.MAX_BODIES - 1; i++) {
    freeIndexArray[i] = i + 1;
  }
  freeIndexArray[BUFFER_CONFIG.MAX_BODIES - 1] = -1;

  usingSharedArrayBuffer = isSharedArrayBufferSupported;

  sharedBuffers = transferredBuffers;

  world = new World(worldConfig || {});

  if (usingSharedArrayBuffer) {
    postMessage({ type: ClientMessageType.READY });
  } else {
    postMessage({ type: ClientMessageType.READY, sharedBuffers }, [
      sharedBuffers.rigidBodies.headerIntArray.buffer,
      sharedBuffers.debug.vertexFloatArray.buffer,
      ...sharedBuffers.softBodies.map((sb) => sb.vertexFloatArray.buffer),
    ]);
  }
}

function transferBuffers({ sharedBuffers: receivedSharedBuffers }) {
  sharedBuffers = receivedSharedBuffers;
}

export const worldEventReceivers = {
  [MessageType.INIT]: initWorld,
  [MessageType.TRANSFER_BUFFERS]: transferBuffers,
};
