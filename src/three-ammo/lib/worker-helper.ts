import { Matrix4, Object3D, InstancedMesh } from "three";
import { iterateGeometries } from "../../three-to-ammo";
import AmmoWorker from "web-worker:../worker/ammo.worker";
import {
  BodyConfig,
  MessageType,
  SerializedMesh,
  ShapeFit,
  SharedBuffers,
  SharedSoftBodyBuffers,
  SoftBodyConfig,
  UUID,
  WorkerRequestId,
  WorldConfig,
} from "./types";
import { isSharedArrayBufferSupported } from "../../utils/utils";
import { ShapeDescriptor } from "../../physics";

export function createAmmoWorker(): Worker {
  return new AmmoWorker();
}

export function WorkerHelpers(ammoWorker: Worker) {
  const transform = new Matrix4();
  const inverse = new Matrix4();

  let lastRequestId: number = 0;
  let requests: Record<WorkerRequestId, (data: any) => void> = {};

  const bodyUpdates: Array<any> = [];
  const motionUpdates: Array<any> = [];

  return {
    initWorld(worldConfig: WorldConfig, sharedBuffers: SharedBuffers) {
      if (isSharedArrayBufferSupported) {
        ammoWorker.postMessage({
          type: MessageType.INIT,
          worldConfig,
          sharedBuffers,
          isSharedArrayBufferSupported,
        });
      } else {
        console.warn(
          "use-ammojs uses fallback to slower ArrayBuffers. To use the faster SharedArrayBuffers make sure that your environment is crossOriginIsolated. (see https://web.dev/coop-coep/)"
        );

        ammoWorker.postMessage(
          {
            type: MessageType.INIT,
            worldConfig,
            sharedBuffers,
            isSharedArrayBufferSupported,
          },
          [
            sharedBuffers.rigidBodies.headerIntArray.buffer,
            sharedBuffers.debug.vertexFloatArray.buffer,
            ...sharedBuffers.softBodies.map((sb) => sb.vertexFloatArray.buffer),
          ]
        );
      }
    },

    async makeAsyncRequest<T = any>(data): Promise<T> {
      return new Promise((resolve) => {
        const requestId = lastRequestId++;

        requests[requestId] = resolve;

        ammoWorker.postMessage({
          ...data,
          requestId,
        });
      });
    },

    resolveAsyncRequest(data) {
      if (requests[data.requestId]) {
        requests[data.requestId](data);
        delete requests[data.requestId];
      }
    },

    transferSharedBuffers(sharedBuffers: SharedBuffers) {
      ammoWorker.postMessage(
        { type: MessageType.TRANSFER_BUFFERS, sharedBuffers },
        [
          sharedBuffers.rigidBodies.headerIntArray.buffer,
          sharedBuffers.debug.vertexFloatArray.buffer,
          ...sharedBuffers.softBodies.map((sb) => sb.vertexFloatArray.buffer),
        ]
      );
    },

    addRigidBody(
      uuid: UUID,
      mesh: Object3D,
      shapeDescriptor: ShapeDescriptor,
      options: BodyConfig,
    ) {
      let serializedMesh: SerializedMesh | undefined = undefined;

      const getMatrixWorld = (): Matrix4 => {
        if (mesh instanceof InstancedMesh) {
          const instanceIndex = parseInt(uuid.split('/')[1]);
          const mat = new Matrix4();
          mesh.getMatrixAt(instanceIndex, mat);
          return mat;
        }
        return mesh.matrixWorld;
      }

      // if (shapeDescriptor.meshToUse && shapeDescriptor?.shapeConfig?.fit !== ShapeFit.MANUAL) {
      if (shapeDescriptor.meshToUse) {
        inverse.copy(mesh.parent!.matrix).invert();
        transform.multiplyMatrices(inverse, mesh.parent!.matrix);
        const vertices: any[] = [];
        const matrices: any[] = [];
        const indexes: any[] = [];

        mesh.updateMatrixWorld(true);
        iterateGeometries(mesh, options, (vertexArray, matrix, index) => {
          vertices.push(vertexArray);
          matrices.push(matrix);
          indexes.push(index);
        });

        const mat = getMatrixWorld();

        serializedMesh = {
          vertices,
          matrices,
          indexes,
          matrixWorld: mat.elements,
        };
      }

      inverse.copy(mesh.parent!.matrixWorld).invert();
      transform.multiplyMatrices(inverse, getMatrixWorld());
      ammoWorker.postMessage({
        type: MessageType.ADD_RIGIDBODY,
        uuid,
        matrix: transform.elements,
        serializedMesh,
        shapeConfig: shapeDescriptor.shapeConfig,
        options,
      });
    },

    updateRigidBody(uuid, options) {
      /*
      ammoWorker.postMessage({
        type: MessageType.UPDATE_RIGIDBODY,
        uuid,
        options,
      });
      */
      bodyUpdates.push({ uuid, options });
    },

    flushRigidBodyUpdates() {
      const updatesByUuid: Record<UUID, BodyConfig> = bodyUpdates.reduce(
        (acc, { uuid, options }) => {
          if (!acc[uuid]) {
            acc[uuid] = {};
          }
          Object.assign(acc[uuid], options);
          return acc;
        },
        {}
      );
      const finalBodyUpdates = Object.keys(updatesByUuid).map((uuid) => ({
        uuid,
        options: updatesByUuid[uuid],
      }));

      if (finalBodyUpdates.length === 0) {
        return;
      }

      ammoWorker.postMessage({
        type: MessageType.BULK_UPDATE_RIGIDBODY,
        // updates: bodyUpdates,
        updates: finalBodyUpdates,
      });
      bodyUpdates.length = 0;
    },

    removeRigidBody(uuid) {
      ammoWorker.postMessage({
        type: MessageType.REMOVE_RIGIDBODY,
        uuid,
      });
    },

    addSoftBody(
      uuid: UUID,
      sharedSoftBodyBuffers: SharedSoftBodyBuffers,
      softBodyConfig: SoftBodyConfig
    ) {
      console.log('addSoftBody', isSharedArrayBufferSupported, uuid,softBodyConfig);
      if (isSharedArrayBufferSupported) {
        ammoWorker.postMessage({
          type: MessageType.ADD_SOFTBODY,
          uuid,
          sharedSoftBodyBuffers,
          softBodyConfig,
        });
      } else {
        ammoWorker.postMessage(
          {
            type: MessageType.ADD_SOFTBODY,
            uuid,
            sharedSoftBodyBuffers,
            softBodyConfig,
          },
          [sharedSoftBodyBuffers.vertexFloatArray.buffer]
        );
      }
    },

    removeSoftBody(uuid: UUID) {
      ammoWorker.postMessage({
        type: MessageType.REMOVE_SOFTBODY,
        uuid,
      });
    },

    bodySetShapesOffset(bodyUuid, offset) {
      ammoWorker.postMessage({
        type: MessageType.SET_SHAPES_OFFSET,
        bodyUuid,
        offset,
      });
    },

    addConstraint(constraintId, bodyAUuid, bodyBUuid, options) {
      ammoWorker.postMessage({
        type: MessageType.ADD_CONSTRAINT,
        constraintId,
        bodyAUuid,
        bodyBUuid,
        options,
      });
    },

    updateConstraint(constraintId, options) {
      ammoWorker.postMessage({
        type: MessageType.UPDATE_CONSTRAINT,
        constraintId,
        options,
      });
    },

    removeConstraint(constraintId) {
      ammoWorker.postMessage({
        type: MessageType.REMOVE_CONSTRAINT,
        constraintId,
      });
    },

    enableDebug(enable, debugSharedArrayBuffer) {
      ammoWorker.postMessage({
        type: MessageType.ENABLE_DEBUG,
        enable,
        debugSharedArrayBuffer,
      });
    },

    updateDebugMode(debugMode) {
      ammoWorker.postMessage({
        type: MessageType.UPDATE_DEBUG_MODE,
        debugMode,
      });
    },

    resetDynamicBody(uuid) {
      ammoWorker.postMessage({
        type: MessageType.RESET_DYNAMIC_BODY,
        uuid,
      });
    },

    activateBody(uuid) {
      ammoWorker.postMessage({
        type: MessageType.ACTIVATE_BODY,
        uuid,
      });
    },

    bodySetMotionState(uuid, position, rotation) {
      ammoWorker.postMessage({
        type: MessageType.SET_MOTION_STATE,
        uuid,
        position,
        rotation,
      });
      // motionUpdates.push({ uuid, position, rotation });
    },

    flushMotionUpdates() {
      const updatesByUuid: Record<UUID, BodyConfig> = motionUpdates.reduce(
        (acc, { uuid, ...options }) => {
          if (!acc[uuid]) {
            acc[uuid] = {};
          }
          // Object.assign(acc[uuid], options);
          Object.assign(acc[uuid], {
            position: options.position || acc[uuid].position,
            rotation: options.rotation || acc[uuid].rotation,
          });
          return acc;
        },
        {}
      );
      const finalMotionUpdates = Object.keys(updatesByUuid).map((uuid) => ({
        uuid,
        // options: updatesByUuid[uuid],
        ...updatesByUuid[uuid],
      }));
      if (motionUpdates.length === 0) {
        return;
      }

      ammoWorker.postMessage({
        type: MessageType.BULK_SET_MOTION_STATE,
        // updates: motionUpdates,
        updates: finalMotionUpdates,
      });
      motionUpdates.length = 0;
    },

    bodySetLinearVelocity(uuid, velocity) {
      ammoWorker.postMessage({
        type: MessageType.SET_LINEAR_VELOCITY,
        uuid,
        velocity,
      });
    },

    bodyApplyImpulse(uuid, impulse, relativeOffset) {
      if (!relativeOffset) {
        ammoWorker.postMessage({
          type: MessageType.APPLY_CENTRAL_IMPULSE,
          uuid,
          impulse,
        });
      } else {
        ammoWorker.postMessage({
          type: MessageType.APPLY_IMPULSE,
          uuid,
          impulse,
          relativeOffset,
        });
      }
    },

    bodyApplyForce(uuid, force, relativeOffset) {
      if (!relativeOffset) {
        ammoWorker.postMessage({
          type: MessageType.APPLY_CENTRAL_FORCE,
          uuid,
          force,
        });
      } else {
        ammoWorker.postMessage({
          type: MessageType.APPLY_FORCE,
          uuid,
          force,
          relativeOffset,
        });
      }
    },

    setSimulationSpeed(simulationSpeed: number) {
      ammoWorker.postMessage({
        type: MessageType.SET_SIMULATION_SPEED,
        simulationSpeed,
      });
    },

    setGravity(gravity: WorldConfig['gravity']) {
      ammoWorker.postMessage({
        type: MessageType.SET_GRAVITY,
        gravity,
      });
    },
  };
}
