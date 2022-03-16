import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Box, OrbitControls, PerspectiveCamera, Stage, Stats, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { BodyType, Physics, PhysicsStats, ShapeFit, ShapeType, Triplet, useRigidBody, UseRigidBodyOptions } from 'use-ammojs'
import * as THREE from 'three'
import { Color } from 'three'

// const USE_INSTANCED = true;

const CUBE_ARRAY_SIZE = 10
const CUBE_ARRAY_HEIGHT = 10
// const CUBE_ARRAY_SIZE_SQ = CUBE_ARRAY_SIZE * CUBE_ARRAY_SIZE

interface SceneProps {
  groupWidth: number;
  groupHeight: number;
}

interface InstancedGeometryProps extends SceneProps {
  colors: Float32Array;
  number: number;
  size: number;
  // groupWidth: number;
  // groupHeight: number;
}

const Boxes = ({ colors, number, size, groupWidth }: InstancedGeometryProps) => {
  // const position: Triplet = [Math.random() - 0.5, Math.random() * 2, Math.random() - 0.5];
  const args: Triplet = [size, size, size]

  const groupWidthSq = groupWidth * groupWidth;

  const [ref] = useRigidBody((index: number) => {
    const x = ((index % groupWidth) - groupWidth / 2) * 2
    const y = Math.floor(index / groupWidthSq) * 2 + 2
    // const y = Math.floor(index / CUBE_ARRAY_SIZE_SQ) * 1 + 0
    const z = (Math.floor((index % groupWidthSq) / groupWidth) - groupWidth / 2) * 2

    return ({
      bodyType: BodyType.DYNAMIC,
      shapeType: ShapeType.BOX,
      mass: 1,
      // ...props,
      position: [x, y, z],
      // shapeConfig: {
      //   fit: ShapeFit.MANUAL,
      //   halfExtents: args.map((v: number) => v / 2),
      // }
    });
  }, null, [groupWidth, groupWidthSq])

  //  const ref = useRef<THREE.InstancedMesh>();

  // const [ref, { at }] = useBox(() => ({
  //   args,
  //   mass: 1,
  //   position: [Math.random() - 0.5, Math.random() * 2, Math.random() - 0.5],
  // }))
  // useFrame(() => {
  //   at(Math.floor(Math.random() * number)).position.set(0, Math.random() * 2, 0)
  // })

  // useEffect(() => {
  //   const mesh = ref.current;
  //   if (!mesh) {
  //     return;
  //   }
  //   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  //   const dummy = new THREE.Object3D();
  //   for ( var i = 0; i < number; i ++ ) {
  //     const index = i;
  //     const x = ((index % CUBE_ARRAY_SIZE) - CUBE_ARRAY_SIZE / 2) * 2
  //     const y = Math.floor(index / CUBE_ARRAY_SIZE_SQ) * 2 + 2
  //     const z = (Math.floor((index % CUBE_ARRAY_SIZE_SQ) / CUBE_ARRAY_SIZE) - CUBE_ARRAY_SIZE / 2) * 2

  //     // dummy.position.set(Math.random() - 0.5, Math.random() * 2, Math.random() - 0.5);
  //     dummy.position.set(x, y, z);
  //     dummy.updateMatrix();
  //     mesh.setMatrixAt(i, dummy.matrix);
  //   }
  // }, [number])

  return (
    <instancedMesh receiveShadow castShadow ref={ref} args={[undefined, undefined, number]}>
      <boxBufferGeometry args={args}>
        <instancedBufferAttribute attachObject={['attributes', 'color']} args={[colors, 3]} />
      </boxBufferGeometry>
      <meshPhysicalMaterial attach="material" color="red" />
      {/* <meshLambertMaterial vertexColors /> */}
    </instancedMesh>
  )
}

const instancedGeometry = {
  box: Boxes,
}

// const InstancedCubes = () => {
const InstancedCubes = ({ size: groupSize, height: groupHeight }: { size: number; height: number; }) => {
  const groupWidthSq = groupSize * groupSize;
  // console.log('InstancedCubes', CUBE_ARRAY_SIZE, CUBE_ARRAY_HEIGHT)
  const geometry = 'box'
  const [number] = useState(groupWidthSq * groupHeight)
  const [boxSize] = useState(1)

  const colors = useMemo(() => {
    const array = new Float32Array(number * 3)
    const color = new Color()
    for (let i = 0; i < number; i++) {
      color
        // .set(niceColors[17][Math.floor(Math.random() * 5)])
        .set('red')
        .convertSRGBToLinear()
        .toArray(array, i * 3)
    }
    return array
  }, [number])

  const InstancedGeometry = instancedGeometry[geometry]

  return (
    <InstancedGeometry {...{ colors, number, size: boxSize, groupWidth: groupSize, groupHeight: groupHeight, }} />
  )
}

function StressDemo({ size: groupWidth, height: groupHeight, instanced }: { size: number; height: number; instanced: boolean; }) {
  // const { camera } = useThree()

  // useEffect(() => {
  //   camera.position.y = 5
  // }, [camera])

  const groupWidthSq = groupWidth * groupWidth

  return (
    <>
      {/* <Stage adjustCamera={false} shadows preset="soft" /> */}
      {/* <OrbitControls /> */}
      {/* <directionalLight intensity={0.6} position={[20, 40, 50]} castShadow /> */}
      <group position={[0, 5, 5]} scale={[0.1, 0.1, 0.1]}>
        <Text color="black" fontSize={12}>
          {groupWidthSq * groupHeight} Boxes
        </Text>
      </group>
      <group position={[0, 7, 5]} scale={[0.1, 0.1, 0.1]}>
        <Text color="black" fontSize={12}>
          {instanced ? 'Instanced' : 'Non-Instanced'}
        </Text>
      </group>
      <Physics>
        {instanced ? (
          <InstancedCubes size={groupWidth} height={groupHeight} />
        ) : (
          <Cubes groupWidth={groupWidth} groupHeight={groupHeight}  />
        )}
        <Ground />
        <Stats />
        <PhysicsStats top={48} />
      </Physics>
    </>
  )
}

function Cubes({ groupWidth, groupHeight }: SceneProps) {
  const groupWidthSq = groupWidth * groupWidth;
  return (
    <>
      {Array(groupWidthSq * groupHeight)
        .fill(null)
        .map((_, index) => {
          const x = ((index % groupWidth) - groupWidth / 2) * 2
          const y = Math.floor(index / groupWidthSq) * 2 + 2
          const z = (Math.floor((index % groupWidthSq) / groupWidth) - groupWidth / 2) * 2
          return <PhysicalBox key={index} position={[x, y, z]} />
        })}
    </>
  );
}

function PhysicalBox(props: Partial<Pick<UseRigidBodyOptions, 'position' | 'rotation'>> = {}) {
  const [ref] = useRigidBody(() => ({
    bodyType: BodyType.DYNAMIC,
    shapeType: ShapeType.BOX,
    ...props,
  }))

  return (
    <Box ref={ref} castShadow>
      <meshPhysicalMaterial attach="material" color="red" />
    </Box>
  )
}

function Ground() {
  const [groundRef] = useRigidBody(() => ({
    bodyType: BodyType.STATIC,
    shapeType: ShapeType.BOX,
    position: [0, 0, 0],
  }))

  return (
    <Box ref={groundRef} args={[200, 0.1, 200]} receiveShadow>
      <meshPhysicalMaterial attach="material" color="grey" />
    </Box>
  )
}

// const StressPage = ({ url: { query: { size = CUBE_ARRAY_SIZE, height = CUBE_ARRAY_HEIGHT } } }) => {
const StressPage = () => {
  const router = useRouter()
  if (!router.isReady) {
    return null;
  }
  // const { size = CUBE_ARRAY_SIZE, height = CUBE_ARRAY_HEIGHT } = router.query as any || {};
  const size = typeof router.query.size === 'string' ? parseInt(router.query.size) : CUBE_ARRAY_SIZE;
  const height = typeof router.query.height === 'string' ? parseInt(router.query.height) : CUBE_ARRAY_HEIGHT;
  const instanced = router.query.instanced === 'false' ? false : true;
  console.log('Stress test', { size, height, instanced });
  return (<>
    <Head>
      <title>Stress Demo: Use-Ammo.js</title>
    </Head>
    <div
      id="root"
      style={{ width: "100%", height: "100%", margin: 0, padding: 0 }}
    >
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 100, 50]} />
        <OrbitControls />
        <Suspense fallback={null}>
          <Stage adjustCamera={false} shadows preset="soft" />
          {/* <directionalLight intensity={0.6} position={[20, 40, 50]} castShadow /> */}
          <StressDemo size={size} height={height} instanced={instanced} />
        </Suspense>
      </Canvas>
    </div>
  </>);
}

export default StressPage;
