import { Euler, MathUtils, Object3D, Quaternion, Vector3 } from "three";
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

export function useRigidBody(
  options: UseRigidBodyOptions | (() => UseRigidBodyOptions),
  fwdRefOrObject3D?: Ref<Object3D> | Object3D,
  deps: DependencyList = []
): [MutableRefObject<Object3D | null>, RigidbodyApi] {
  const fwdRef = isRef(fwdRefOrObject3D) ? fwdRefOrObject3D : undefined;
  const ref = useForwardedRef<Object3D>(fwdRef);

  const physicsContext = useAmmoPhysicsContext();
  const { addRigidBody, removeRigidBody } = physicsContext;

  const [bodyUUID] = useState(() => MathUtils.generateUUID());

  useEffect(() => {
    // For backwards compatibility
    const object3D = isRef(fwdRefOrObject3D) ? undefined : fwdRefOrObject3D;
    const objectToUse = object3D ? object3D : ref.current!;
    if (!objectToUse) {
      throw new Error("useRigidBody ref does not contain a object");
    }

    if (typeof options === "function") {
      options = options();
    }
    const {
      bodyType,
      shapeType,
      shapeConfig,
      position,
      rotation,
      mesh,
      ...rest
    } = options;

    if (position) {
      if (isVector3(position) || isSerializedVector3(position)) {
        objectToUse.position.set(position.x, position.y, position.z);
      } else if (position.length === 3) {
        objectToUse.position.set(position[0], position[1], position[2]);
      } else {
        throw new Error("invalid position: expected Vector3 or VectorTuple");
      }

      objectToUse.updateMatrixWorld();
    }

    if (rotation) {
      if (isEuler(rotation)) {
        objectToUse.rotation.copy(rotation);
      } else if (isQuaternion(rotation)) {
        objectToUse.rotation.setFromQuaternion(rotation);
      } else if (isSerializedQuaternion(rotation)) {
        const q = new Quaternion(rotation[0], rotation[1], rotation[2], rotation[3]);
        objectToUse.rotation.setFromQuaternion(q);
      } else if (rotation.length === 3 || rotation.length === 4) {
        objectToUse.rotation.set(
          rotation[0],
          rotation[1],
          rotation[2],
          rotation[3]
        );
      } else {
        throw new Error("invalid rotation: expected Euler or EulerTuple");
      }

      objectToUse.updateMatrixWorld();
    }

    const meshToUse = mesh ? mesh : objectToUse;

    addRigidBody(
      bodyUUID,
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

    return () => {
      removeRigidBody(bodyUUID);
    };
  }, deps);

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
