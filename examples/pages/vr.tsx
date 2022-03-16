import React, { useEffect, Suspense, useCallback } from 'react'
import { OrbitControls, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber';
import { VRCanvas, ARCanvas } from '@react-three/xr';
import { Physics, PhysicsStats } from 'use-ammojs'
import Head from 'next/head';

import { Scene } from '../components/VrDemo'

const isVr = true; // For development purposes
const MainCanvas = isVr ? VRCanvas : Canvas;

function App() {
    return (<>
        <Head>
            <title>VR Demo: Use-Ammo.js</title>
        </Head>
        <MainCanvas {...{ shadowMap: true } as any}>
            <Suspense fallback={null}>
                <Physics
                    // fixedTimeStep={1 / 120}
                    // fixedTimeStep={1 / 200}
                    drawDebug
                    // drawDebugMode={{
                    //     DrawWireframe: true,
                    // }}
                >
                    <Scene isVr={isVr} />
                    <OrbitControls />
                    <ambientLight intensity={0.5} castShadow />
                    <pointLight position={[0, 0, 0]} castShadow />
                    <spotLight position={[1, 8, 1]} angle={0.3} penumbra={1} intensity={1} castShadow />
                    <Stats />
                    <PhysicsStats top={48} />
                </Physics>
            </Suspense>
        </MainCanvas>
    </>);
}

export default App;
