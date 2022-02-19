import React, { useEffect, Suspense, useCallback, useState, useRef } from 'react'
import { Box, OrbitControls, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber';
import { BodyType, Physics, PhysicsStats, ShapeType, useRigidBody, UseRigidBodyOptions, Triplet } from 'use-ammojs'
import Head from 'next/head';

import { Gear } from '../components/Gear';

function App() {
    return (<>
        <Head>
            <title>Compound Demo: Use-Ammo.js</title>
        </Head>
        <Canvas shadows gl={{ alpha: false }} camera={{ fov: 50, position: [-2, 1, 7] }}>
            <Suspense fallback={null}>
                <Physics drawDebug>
                    <Scene />
                    <OrbitControls />
                    <ambientLight intensity={0.5} />
                    <spotLight position={[1, 8, 1]} angle={0.3} penumbra={1} intensity={1} castShadow />
                    <Stats />
                    <PhysicsStats top={48} />
                </Physics>
            </Suspense>
        </Canvas>
    </>);
}

function Floor(props: Partial<UseRigidBodyOptions>) {
  const [groundRef] = useRigidBody(() => ({
      bodyType: BodyType.STATIC,
      shapeType: ShapeType.BOX,
      ...props,
  }))
  return (
      <Box ref={groundRef} args={[10, 0.1, 10]} receiveShadow>
          <meshPhysicalMaterial attach="material" color="grey" />
      </Box>
  )
}

type OurCompoundBodyProps = Pick<UseRigidBodyOptions, 'position' | 'rotation'> & {
  mass?: number
}

function CompoundBody({ mass = 12, ...props }: OurCompoundBodyProps) {
  const boxSize: Triplet = [1, 1, 1]
  const sphereRadius = 0.65
  const [ref, api] = useRigidBody(() => ({
    bodyType: BodyType.DYNAMIC,
    shapeType: ShapeType.COMPOUND,
    mass,
    ...props,
    shapeConfig: {
      shapes: [
        {
          type: ShapeType.BOX,
          halfExtents: boxSize.map(v =>  v/2) as Triplet,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        },
        {
          type: ShapeType.SPHERE,
          sphereRadius, position: [1, 0, 0],
          offset: [-1, 0, 0],
          rotation: [0, 0, 0],
        },
      ],
    }
  }))

  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxBufferGeometry args={boxSize} />
        <meshNormalMaterial />
      </mesh>
      <mesh castShadow position={[1, 0, 0]}>
        <sphereBufferGeometry args={[sphereRadius, 16, 16]} />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}

function Scene() {
  const [ready, set] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => set(true), 2000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <>
      <color attach="background" args={['#f6d186']} />
      <hemisphereLight intensity={0.35} />
      <spotLight
        position={[5, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        castShadow
        shadow-mapSize-width={1028}
        shadow-mapSize-height={1028}
      />
      <Physics drawDebug>
          <Floor
            // rotation={[-Math.PI / 2, 0, 0]}
          />
          <CompoundBody position={[1.5, 5, 0.5]} rotation={[1.25, 0, 0]} />
          <CompoundBody
            position={[2.5, 3, 0.25]}
            rotation={[1.25, -1.25, 0]}
          />
          {ready && <CompoundBody position={[2.5, 4, 0.25]} rotation={[1.25, -1.25, 0]} />}
          <Gear
            {...{
              position: [0, 5, 0]
            } as any}
          />
      </Physics>
    </>
  )
}

export default App;
