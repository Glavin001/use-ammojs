import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Matrix4,
  Object3D,
  Vector3,
} from "three";
import React, { PropsWithChildren, useEffect, useState } from "react";
import { useFrame } from "react-three-fiber";
import { DefaultBufferSize } from "ammo-debug-drawer";
import { AmmoPhysicsContext, ConstraintOptions } from "./physics-context";
import {
  allocateCompatibleBuffer,
  AmmoDebugOptions,
  ammoDebugOptionsToNumber,
  isSharedArrayBufferSupported,
  removeUndefinedKeys,
} from "../utils/utils";
import {createAmmoWorker, WorkerHelpers} from "../three-ammo/lib/worker-helper";
import {
  BodyConfig,
  ShapeConfig,
  UpdateBodyOptions,
  WorldConfig,
} from "../three-ammo/lib/types";
import { CONSTANTS } from "../three-ammo/lib/constants";

interface AmmoPhysicsProps {
  // Draw a collision debug mesh into the scene
  drawDebug?: boolean;

  // Configures the debug options (not all options are tested)
  drawDebugMode?: AmmoDebugOptions;

  // default = [0, -9.8, 0]
  gravity?: [number, number, number];

  // default = 10e-6
  epsilon?: number;

  // default = 1/60
  fixedTimeStep?: number;

  // default = 4
  maxSubSteps?: number;

  // default = 10
  solverIterations?: number;
}

interface PhysicsState {
  workerHelpers: ReturnType<typeof WorkerHelpers>;
  debugGeometry: BufferGeometry;
  debugBuffer: SharedArrayBuffer | ArrayBuffer;
  bodyOptions: Record<string, BodyConfig>;
  uuids: string[];
  headerIntArray: Int32Array;
  object3Ds: Record<string, Object3D>;
  objectMatricesFloatArray: Float32Array;
  uuidToIndex: Record<string, number>;
  debugIndex: Uint32Array;
  addBody(uuid: string, mesh: Object3D, options?: BodyConfig);
  updateBody(uuid: string, options: UpdateBodyOptions);
  removeBody(uuid: string);
  addShapes(
    bodyUuid: string,
    shapesUuid: string,
    mesh: Object3D,
    options?: ShapeConfig
  );
  addConstraint(
    constraintId: string,
    bodyUuid: string,
    targetUuid: string,
    options?: ConstraintOptions
  );
}

const DEFAULT_DEBUG_MODE = { DrawWireframe: true };

export function Physics({
  drawDebug,
  drawDebugMode = DEFAULT_DEBUG_MODE,
  gravity,
  epsilon,
  fixedTimeStep,
  maxSubSteps,
  solverIterations,
  children,
}: PropsWithChildren<AmmoPhysicsProps>) {
  const [physicsState, setPhysicsState] = useState<PhysicsState>();

  useEffect(() => {
    const uuids: string[] = [];
    const object3Ds: Record<string, Object3D> = {};
    const uuidToIndex: Record<string, number> = {};
    const IndexToUuid: Record<number, string> = {};
    const bodyOptions: Record<string, BodyConfig> = {};

    const ammoWorker: Worker = createAmmoWorker();

    const workerHelpers = WorkerHelpers(ammoWorker);

    const objectBuffer = allocateCompatibleBuffer(
      4 * CONSTANTS.BUFFER_CONFIG.HEADER_LENGTH + //header
        4 *
          CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE *
          CONSTANTS.BUFFER_CONFIG.MAX_BODIES + //matrices
        4 * CONSTANTS.BUFFER_CONFIG.MAX_BODIES //velocities
    );
    const headerIntArray = new Int32Array(
      objectBuffer,
      0,
      CONSTANTS.BUFFER_CONFIG.HEADER_LENGTH
    );
    const objectMatricesIntArray = new Int32Array(
      objectBuffer,
      CONSTANTS.BUFFER_CONFIG.HEADER_LENGTH * 4,
      CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE *
        CONSTANTS.BUFFER_CONFIG.MAX_BODIES
    );
    const objectMatricesFloatArray = new Float32Array(
      objectBuffer,
      CONSTANTS.BUFFER_CONFIG.HEADER_LENGTH * 4,
      CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE *
        CONSTANTS.BUFFER_CONFIG.MAX_BODIES
    );

    objectMatricesIntArray[0] = CONSTANTS.BUFFER_STATE.UNINITIALIZED;

    const debugBuffer = allocateCompatibleBuffer(4 + 2 * DefaultBufferSize * 4);
    const debugIndex = new Uint32Array(debugBuffer, 0, 4);
    const debugVertices = new Float32Array(debugBuffer, 4, DefaultBufferSize);
    const debugColors = new Float32Array(
      debugBuffer,
      4 + DefaultBufferSize,
      DefaultBufferSize
    );
    const debugGeometry = new BufferGeometry();
    debugGeometry.setAttribute(
      "position",
      new BufferAttribute(debugVertices, 3).setUsage(DynamicDrawUsage)
    );
    debugGeometry.setAttribute(
      "color",
      new BufferAttribute(debugColors, 3).setUsage(DynamicDrawUsage)
    );

    const worldConfig: WorldConfig = removeUndefinedKeys({
      debugDrawMode: ammoDebugOptionsToNumber(drawDebugMode),
      gravity: gravity && new Vector3(gravity[0], gravity[1], gravity[2]),
      epsilon,
      fixedTimeStep,
      maxSubSteps,
      solverIterations,
    });

    if (isSharedArrayBufferSupported) {
      ammoWorker.postMessage({
        type: CONSTANTS.MESSAGE_TYPES.INIT,
        worldConfig,
        sharedArrayBuffer: objectBuffer,
      });
    } else {
      console.warn(
        "use-ammojs uses fallback to slower ArrayBuffers. To use the faster SharedArrayBuffers make sure that your environment is crossOriginIsolated. (see https://web.dev/coop-coep/)"
      );

      console.log("1 ", objectMatricesFloatArray.byteLength);
      ammoWorker.postMessage(
        {
          type: CONSTANTS.MESSAGE_TYPES.INIT,
          worldConfig,
          arrayBuffer: objectBuffer,
        },
        [objectBuffer]
      );
      console.log("2 ", objectMatricesFloatArray.byteLength);
    }

    const workerInitPromise = new Promise<PhysicsState>((resolve) => {
      ammoWorker.onmessage = async (event) => {
        if (event.data.type === CONSTANTS.MESSAGE_TYPES.READY) {
          resolve({
            workerHelpers,
            debugGeometry,
            debugBuffer,
            bodyOptions,
            uuids,
            headerIntArray,
            object3Ds,
            objectMatricesFloatArray,
            uuidToIndex,
            debugIndex,
            addBody,
            removeBody,
            addConstraint,
            addShapes,
            updateBody,
          });
          console.log("3 ", objectMatricesFloatArray.byteLength);
        } else if (event.data.type === CONSTANTS.MESSAGE_TYPES.BODY_READY) {
          const uuid = event.data.uuid;
          uuids.push(uuid);
          uuidToIndex[uuid] = event.data.index;
          IndexToUuid[event.data.index] = uuid;
        } else if (event.data.type === CONSTANTS.MESSAGE_TYPES.TRANSFER_DATA) {
          if (physicsState) {
            console.log("data transfer");
            setPhysicsState({
              ...physicsState,
              objectMatricesFloatArray: event.data.objectMatricesFloatArray,
            });
          }
        }
      };
    });

    workerInitPromise.then(setPhysicsState);

    function addBody(uuid, mesh, options: BodyConfig = {}) {
      removeUndefinedKeys(options);

      bodyOptions[uuid] = options;
      object3Ds[uuid] = mesh;
      workerHelpers.addBody(uuid, mesh, options);
    }

    function updateBody(uuid: string, options: UpdateBodyOptions) {
      removeUndefinedKeys(options);

      workerHelpers.updateBody(uuid, options);
    }

    function removeBody(uuid: string) {
      uuids.splice(uuids.indexOf(uuid), 1);
      delete IndexToUuid[uuidToIndex[uuid]];
      delete uuidToIndex[uuid];
      delete bodyOptions[uuid];
      delete object3Ds[uuid];
      workerHelpers.removeBody(uuid);
    }

    function addShapes(
      bodyUuid: string,
      shapesUuid: string,
      mesh: Object3D,
      options?: ShapeConfig
    ) {
      removeUndefinedKeys(options);

      workerHelpers.addShapes(bodyUuid, shapesUuid, mesh, options);
    }

    function addConstraint(
      constraintId: string,
      bodyUuid: string,
      targetUuid: string,
      options?: ConstraintOptions
    ) {
      removeUndefinedKeys(options);

      workerHelpers.addConstraint(constraintId, bodyUuid, targetUuid, options);
    }

    return () => {
      ammoWorker.terminate();
      setPhysicsState(undefined);
    };
  }, []);

  useFrame(() => {
    const transform = new Matrix4();
    const inverse = new Matrix4();
    const matrix = new Matrix4();
    const scale = new Vector3();

    if (!physicsState) {
      return;
    }

    const {
      workerHelpers,
      debugGeometry,
      bodyOptions,
      uuids,
      headerIntArray,
      object3Ds,
      objectMatricesFloatArray,
      uuidToIndex,
      debugIndex,
    } = physicsState;

    // console.log(objectMatricesFloatArray.byteLength);

    if (
      // Check if the worker is finished with the buffer
      (!isSharedArrayBufferSupported &&
        objectMatricesFloatArray.byteLength !== 0) ||
      (isSharedArrayBufferSupported &&
        Atomics.load(headerIntArray, 0) === CONSTANTS.BUFFER_STATE.READY)
    ) {
      for (let i = 0; i < uuids.length; i++) {
        const uuid = uuids[i];
        const type = bodyOptions[uuid].type
          ? bodyOptions[uuid].type
          : CONSTANTS.TYPE.DYNAMIC;
        const object3D = object3Ds[uuid];
        if (type === CONSTANTS.TYPE.DYNAMIC) {
          matrix.fromArray(
            objectMatricesFloatArray,
            uuidToIndex[uuid] * CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE
          );
          inverse.copy(object3D.parent!.matrixWorld).invert();
          transform.multiplyMatrices(inverse, matrix);
          transform.decompose(object3D.position, object3D.quaternion, scale);
        } else {
          objectMatricesFloatArray.set(
            object3D.matrixWorld.elements,
            uuidToIndex[uuid] * CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE
          );
        }

        // print velocities
        // console.log(
        //   uuid,
        //   objectMatricesFloatArray[indexes[uuid] * BUFFER_CONFIG.BODY_DATA_SIZE + 16],
        //   objectMatricesFloatArray[indexes[uuid] * BUFFER_CONFIG.BODY_DATA_SIZE + 17]
        // );

        // print coliisions
        // const collisions = [];
        // for (let j = 18; j < 26; j++) {
        //   const collidingIndex = objectMatricesIntArray[uuidToIndex[uuid] * BUFFER_CONFIG.BODY_DATA_SIZE + j];
        //   if (collidingIndex !== -1) {
        //     collisions.push(IndexToUuid[collidingIndex]);
        //   }
        // }
        // console.log(uuid, collisions);
      }

      if (isSharedArrayBufferSupported) {
        Atomics.store(headerIntArray, 0, CONSTANTS.BUFFER_STATE.CONSUMED);
      } else {
        workerHelpers.transferData(objectMatricesFloatArray);
      }
    }

    if (isSharedArrayBufferSupported) {
      /* DEBUG RENDERING */
      const index = Atomics.load(debugIndex, 0);
      if (!!index) {
        debugGeometry.attributes.position.needsUpdate = true;
        debugGeometry.attributes.color.needsUpdate = true;
        debugGeometry.setDrawRange(0, index);
      }
      Atomics.store(debugIndex, 0, 0);
    }
  });

  useEffect(() => {
    if (!isSharedArrayBufferSupported) {
      if (drawDebug) {
        console.warn("debug visuals require SharedArrayBuffer support");
      }
      return;
    }

    if (physicsState) {
      if (drawDebug) {
        workerHelpers.enableDebug(true, physicsState.debugBuffer);
      } else {
        workerHelpers.enableDebug(false, physicsState.debugBuffer);
      }
    }
  }, [drawDebug, physicsState]);

  if (!physicsState) {
    return null;
  }

  const { workerHelpers, debugGeometry } = physicsState;

  return (
    <AmmoPhysicsContext.Provider
      value={{
        ...workerHelpers,

        // workerHelpers Overrides
        addBody: physicsState.addBody,
        removeBody: physicsState.removeBody,
        addShapes: physicsState.addShapes,
        addConstraint: physicsState.addConstraint,
        updateBody: physicsState.updateBody,

        object3Ds: physicsState.object3Ds,
      }}
    >
      {drawDebug && (
        <lineSegments
          geometry={debugGeometry}
          frustumCulled={false}
          renderOrder={999}
        >
          <lineBasicMaterial
            attach="material"
            vertexColors={true}
            depthTest={true}
          />
        </lineSegments>
      )}
      {children}
    </AmmoPhysicsContext.Provider>
  );
}
