import THREE from "three";
import { RotationTypes, SerializedQuaternion, SerializedVector3, Vector3Types } from "../three-ammo/lib/types";
import { isEuler, isQuaternion, isSerializedQuaternion, isSerializedVector3, isVector3 } from "../three-ammo/worker/utils";

export function serializedVector3(v: Vector3Types): SerializedVector3 {
    if (isSerializedVector3(v)) {
        return v;
    } else if (isVector3(v)) {
        return {
            x: v.x,
            y: v.y,
            z: v.z,
        };
    } else if (Array.isArray(v)) {
        if (v.length === 3) {
            return {
                x: v[0],
                y: v[1],
                z: v[2],
            };
        }
    }
    throw new Error("invalid Vector3 (or position) type: expected Vector3 or VectorTuple");
}

export function serializedQuaternion(r: RotationTypes): SerializedQuaternion {
    if (isSerializedQuaternion(r)) {
        return r;
    } else if (isQuaternion(r)) {
        return {
            _x: r.x,
            _y: r.y,
            _z: r.z,
            _w: r.w,
        }
    } else if (isEuler(r)) {
        const q = new THREE.Quaternion();
        q.setFromEuler(r);
        return serializedQuaternion(q);
    } else if (Array.isArray(r)) {
        if (r.length === 4 || r.length === 3) {
            // Euler
            const e = new THREE.Euler(r[0], r[1], r[2], r[3]);
            return serializedQuaternion(e);
        }
    }
    throw new Error("invalid rotation: expected Euler or EulerTuple");
}
