import React, { useEffect } from "react";
import { useTexture } from "@react-three/drei";
import { MeshPhysicalMaterialProps } from "@react-three/fiber";
import * as THREE from "three";

export const RockMaterial = (props: Partial<MeshPhysicalMaterialProps>) => {
    const textures = useTexture([
        "AmbientOcclusion.jpg", "Color.jpg", "Displacement.jpg", "Normal.jpg", "Roughness.jpg"
    ].map(url => `/textures/rock/${url}`));

    // useEffect(() => {
        textures
            .forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(50, 50);
            });
    // }, [...textures])

    const [aoMap, map, displacementMap, normalMap, roughnessMap] = textures;

    return (
        <meshPhysicalMaterial
            aoMap={aoMap}
            map={map}
            displacementMap={displacementMap}
            normalMap={normalMap}
            roughnessMap={roughnessMap}
            displacementScale={0.001}
            {...props}
        />
    );
};
