import { Ref } from "react";
import { Object3D } from "three";

export function isRef(
  fwdRefOrObject3D: Object3D | React.Ref<Object3D> | undefined
): fwdRefOrObject3D is Ref<Object3D> {
  return !!(
    fwdRefOrObject3D &&
    typeof fwdRefOrObject3D === "object" &&
    "current" in fwdRefOrObject3D
  );
}
