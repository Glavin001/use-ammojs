import { MessageType } from "../lib/types";
import {
  copyToRigidBodyBuffer,
  rigidBodyEventReceivers,
} from "./managers/rigid-body-manager";
import {
  isBufferConsumed,
  releaseBuffer,
  sharedBuffers,
  world,
  worldEventReceivers,
} from "./managers/world-manager";
import { debugEventReceivers } from "./managers/debug-manager";
import { constraintEventReceivers } from "./managers/constraint-manager";
import {
  copyToSoftBodyBuffers,
  softBodyEventReceivers,
} from "./managers/soft-body-manager";
import { raycastEventReceivers } from "./managers/raycast-manager";
import { DEFAULT_TIMESTEP } from "../lib/constants";

let lastTick;
let prevFpsTime;
let substepCounter = 0;
let tickInterval;
let frames = 0;

let simulationSpeed = 1 / 1000;
const fpsRefreshInterval = 500;

function tick() {
  if (true) {
    const now = performance.now();
    const dt = now - lastTick;
    try {
      const numSubsteps = world.step(dt * simulationSpeed);

      const stepDuration = performance.now() - now;
      lastTick = now;
      substepCounter = (substepCounter + numSubsteps) % 2147483647; // limit to 32bit for transfer

      if (numSubsteps === 0) {
        return;
      }

      frames++;

      if (isBufferConsumed()) {
        sharedBuffers.rigidBodies.headerFloatArray[1] = stepDuration;
        sharedBuffers.rigidBodies.headerIntArray[2] = substepCounter;

        const shouldUpdateFps = now >= (prevFpsTime + fpsRefreshInterval);
        if (shouldUpdateFps) {
          sharedBuffers.rigidBodies.headerFloatArray[3] = ( frames * 1000 ) / ( now - prevFpsTime );

          prevFpsTime = now;
          frames = 0;
        }

        copyToRigidBodyBuffer();
        copyToSoftBodyBuffers();

        releaseBuffer();
      }
    } catch (err) {
      console.error("The ammo worker has crashed:", err);
      clearInterval(tickInterval);
      self.onmessage = null;

      releaseBuffer();
    }
  }
}

function setSimulationSpeed({ simulationSpeed: newSimulationSpeed }) {
  simulationSpeed = newSimulationSpeed / 1000;
}

const eventReceivers: Record<MessageType, (eventData: any) => void> = {
  [MessageType.SET_SIMULATION_SPEED]: setSimulationSpeed,
  ...worldEventReceivers,
  ...debugEventReceivers,
  ...rigidBodyEventReceivers,
  ...softBodyEventReceivers,
  ...constraintEventReceivers,
  ...raycastEventReceivers,
};

onmessage = async (event) => {
  // if (event.data?.type !== MessageType.TRANSFER_BUFFERS) {
  //   console.debug("physics worker received message: ", event.data);
  // }

  if (!eventReceivers[event.data?.type]) {
    console.error("unknown event type: ", event.data);
    return;
  }

  if (world) {
    if (event.data.type === MessageType.INIT) {
      console.error("Error: World is already initialized", event.data);
    } else {
      eventReceivers[event.data.type](event.data);
    }
  } else {
    if (event.data.type === MessageType.INIT) {
      await eventReceivers[MessageType.INIT](event.data);

      lastTick = performance.now();
      prevFpsTime = lastTick;
      const timestep = event.data?.worldConfig?.fixedTimeStep ?? DEFAULT_TIMESTEP;
      if (tickInterval) {
        clearInterval(tickInterval);
      }
      tickInterval = self.setInterval(
        tick,
        timestep,
      );
    } else {
      console.error("Error: World Not Initialized", event.data);
    }
  }
};
