import { MutableRefObject, useEffect, useState, DependencyList } from "react";
import { useAmmoPhysicsContext } from "../physics-context";
import { MathUtils, Object3D } from "three";
import {
  CommonConstraintConfig,
  SingleBodyConstraintConfig,
  TwoBodyConstraintConfig,
  UUID,
} from "../../three-ammo/lib/types";
import { ConstraintApi, createConstraintApi } from "../api/constraint-api";

export type SingleBodyConstraintRefs = {
  bodyARef: MutableRefObject<Object3D | undefined>;
  bodyBRef?: undefined;
};

export type TwoBodyConstraintRefs = {
  bodyARef: MutableRefObject<Object3D | undefined>;
  bodyBRef: MutableRefObject<Object3D | undefined>;
};

export type UseSingleBodyConstraintProps = (
  CommonConstraintConfig &
  SingleBodyConstraintRefs &
  SingleBodyConstraintConfig
);

export type UseTwoBodyConstraintProps = (
  CommonConstraintConfig &
  SingleBodyConstraintRefs &
  SingleBodyConstraintConfig
);

export type UseConstraintProps = CommonConstraintConfig &
  (
    | (SingleBodyConstraintRefs & SingleBodyConstraintConfig)
    | (TwoBodyConstraintRefs & TwoBodyConstraintConfig)
  );

export function useSingleBodyConstraint(
  props: UseSingleBodyConstraintProps,
  deps: DependencyList = []
) {
  return useConstraint(props, deps);
}

export function useTwoBodyConstraint(
  props: UseTwoBodyConstraintProps,
  deps: DependencyList = []
) {
  return useConstraint(props, deps);
}

export type UseConstraintReturn = [
  MutableRefObject<Object3D | undefined> | undefined,
  MutableRefObject<Object3D | undefined> | undefined,
  ConstraintApi,
];
export { ConstraintApi };

export function useConstraint(props: UseConstraintProps, deps: DependencyList = []): UseConstraintReturn {
  const physicsContext = useAmmoPhysicsContext();
  const {
    addConstraint,
    // updateConstraint,
    removeConstraint,
  } = physicsContext;

  const [constraintId] = useState(() => MathUtils.generateUUID());

  const allDeps = [
    props.bodyARef, props.bodyARef.current,
    props.bodyBRef, props.bodyBRef?.current,
  ].concat(deps)

  useEffect(() => {
    console.log('refresh constraint', props, deps);
    const uuidA: UUID | undefined =
      props.bodyARef.current?.userData?.useAmmo?.rigidBody?.uuid;
    const uuidB: UUID | undefined =
      props.bodyBRef?.current?.userData?.useAmmo?.rigidBody?.uuid;

    if (props.bodyBRef === undefined && uuidA) {
      const { bodyARef, bodyBRef, ...constraintConfig } = props;

      addConstraint(
        constraintId,
        uuidA,
        undefined,
        constraintConfig as SingleBodyConstraintConfig
      );

      return () => {
        console.log('remove constraint', constraintId);
        removeConstraint(constraintId);
      };
    } else if (uuidA && uuidB) {
      const { bodyARef, bodyBRef, ...constraintConfig } = props;

      addConstraint(
        constraintId,
        uuidA,
        uuidB,
        constraintConfig as TwoBodyConstraintConfig
      );

      return () => {
        console.log('remove constraint', constraintId);
        removeConstraint(constraintId);
      };
    }

    return () => {
      console.log('remove constraint', constraintId);
    };
  }, allDeps);

  return [
    props.bodyARef,
    props.bodyBRef,
    createConstraintApi(physicsContext, constraintId, props.type),
  ];
}
