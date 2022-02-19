import { UUID } from "../../lib/types";
import { RigidBody } from "../wrappers/rigid-body";
import { Matrix4 } from "three";

export const bodies: Record<UUID, RigidBody> = {};
export const matrices: Record<UUID, Matrix4> = {};
export const indexes: Record<UUID, number> = {};
export const ptrToIndex: Record<number, number> = {};

export const ptrToRigidBody: Record<number, UUID> = {};

export const uuids: UUID[] = [];
