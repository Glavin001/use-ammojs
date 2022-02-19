import { DynamicDrawUsage, Euler, InstancedMesh, MathUtils, Object3D, Quaternion, Vector3 } from "three";
import React, { DependencyList, MutableRefObject, Ref, useEffect, useState } from "react";

import { useAmmoPhysicsContext } from "../physics-context";
import {
  BodyConfig,
  BodyType,
  RotationTypes,
  ShapeConfig,
  ShapeType,
  Triplet,
  Vector3Types,
} from "../../three-ammo/lib/types";
import { createRigidBodyApi, RigidbodyApi } from "../api/rigidbody-api";
import {
  isEuler,
  isQuaternion,
  isSerializedQuaternion,
  isSerializedVector3,
  isVector3,
} from "../../three-ammo/worker/utils";
import { useForwardedRef } from "../../utils/useForwardedRef";
import { isRef } from "../../utils/isRef";
import { serializedVector3 } from "../../utils/serialize";

export type UseRigidBodyOptions = Omit<BodyConfig<Vector3Types>, "type"> & {
  shapeType: ShapeType;
  bodyType?: BodyType;

  // Overrides the physics shape. If not defined the referenced object3Ds mesh will be used. Origins must match.
  mesh?: Object3D;

  // use for manual overrides with the physics shape.
  shapeConfig?: Omit<ShapeConfig<Vector3Types>, "type">;

  position?: Vector3Types;

  rotation?: RotationTypes;
};

const temp = new Object3D();

export function useRigidBody(
  _options: UseRigidBodyOptions | ((instanceIndex: number) => UseRigidBodyOptions),
  fwdRefOrObject3D?: Ref<Object3D> | Object3D,
  deps: DependencyList = []
): [MutableRefObject<Object3D | null>, RigidbodyApi] {
  const fwdRef = isRef(fwdRefOrObject3D) ? fwdRefOrObject3D : undefined;
  const ref = useForwardedRef<Object3D>(fwdRef);

  const physicsContext = useAmmoPhysicsContext();
  const { addRigidBody, removeRigidBody } = physicsContext;

  const [bodyUUID] = useState(() => MathUtils.generateUUID());

  const allDeps = [
    fwdRefOrObject3D,
  ].concat(deps);

  useEffect(() => {
    // For backwards compatibility
    const object3D = isRef(fwdRefOrObject3D) ? undefined : fwdRefOrObject3D;
    const objectToUse = object3D ? object3D : ref.current!;
    if (!objectToUse) {
      throw new Error("useRigidBody ref does not contain a object");
    }

    const object = objectToUse;

    const objectCount =
      object instanceof InstancedMesh ? (object.instanceMatrix.setUsage(DynamicDrawUsage), object.count) : 1;

    const uuids =
      object instanceof InstancedMesh
        ? new Array(objectCount).fill(0).map((_, i) => `${bodyUUID}/${i}`)
        : [bodyUUID];

    uuids.forEach((uuid, index) => {

        const options = (typeof _options === "function") ? _options(index) : _options;

        const {
          bodyType,
          shapeType,
          shapeConfig,
          position,
          rotation,
          mesh,
          ...rest
        } = options;

        const meshToUse = mesh ? mesh : objectToUse;

        if (position) {
          if (isVector3(position) || isSerializedVector3(position)) {
            temp.position.set(position.x, position.y, position.z);
          } else if (position.length === 3) {
            temp.position.set(position[0], position[1], position[2]);
          } else {
            throw new Error("invalid position: expected Vector3 or VectorTuple");
          }
          temp.updateMatrixWorld();
        }

        if (rotation) {
          if (isEuler(rotation)) {
            temp.rotation.copy(rotation);
          } else if (isQuaternion(rotation)) {
            temp.rotation.setFromQuaternion(rotation);
          } else if (isSerializedQuaternion(rotation)) {
            const q = new Quaternion(rotation[0], rotation[1], rotation[2], rotation[3]);
            temp.rotation.setFromQuaternion(q);
          } else if (rotation.length === 3 || rotation.length === 4) {
            temp.rotation.set(
              rotation[0],
              rotation[1],
              rotation[2],
              rotation[3]
            );
          } else {
            throw new Error("invalid rotation: expected Euler or EulerTuple");
          }
          temp.updateMatrixWorld();
        }

        if (objectToUse instanceof InstancedMesh) {
          // FIXME: the objects will be treated as the same in some ways, such as for collision events
          objectToUse.setMatrixAt(index, temp.matrix);
          objectToUse.instanceMatrix.needsUpdate = true;
        } else {
          objectToUse.position.copy(temp.position);
          objectToUse.rotation.copy(temp.rotation);
        }

        addRigidBody(
          uuid,
          objectToUse,
          {
            meshToUse,
            shapeConfig: normalizeShapeConfig({
              type: shapeType,
              ...shapeConfig,
            }),
          },
          normalizeBodyConfig({
            type: bodyType,
            ...rest,
          }),
        );
      });

    return () => {
      uuids.forEach(uuid => {
        removeRigidBody(uuid);
      });
    };
  }, allDeps);

  return [ref, createRigidBodyApi(physicsContext, bodyUUID)];
}

function normalizeShapeConfig(shapeConfig: ShapeConfig<Vector3Types>): ShapeConfig {
  return {
    ...shapeConfig,
    offset: shapeConfig.offset && serializedVector3(shapeConfig.offset),
    halfExtents: shapeConfig.halfExtents && serializedVector3(shapeConfig.halfExtents),
    points: shapeConfig.points && shapeConfig.points.map(serializedVector3),
    shapes: shapeConfig.shapes && shapeConfig.shapes.map(normalizeShapeConfig),
  };
}

function normalizeBodyConfig(bodyConfig: BodyConfig<Vector3Types>): BodyConfig {
  return {
    ...bodyConfig,
    gravity: bodyConfig.gravity && serializedVector3(bodyConfig.gravity),
    angularFactor: bodyConfig.angularFactor && serializedVector3(bodyConfig.angularFactor),
  };
}


/**
 * @deprecated Use {@link useRigidBody} instead
 */
export const usePhysics = useRigidBody;
