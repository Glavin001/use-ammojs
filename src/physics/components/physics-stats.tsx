import { useEffect, useRef, useState } from "react";
import Stats from "stats.js";
import { useAmmoPhysicsContext } from "../physics-context";
import { useFrame } from "@react-three/fiber";

interface PhysicsStatsProps {
  top?: number | string;
  left?: number | string;
  bottom?: number | string;
  right?: number | string;
}

const panelIndexOffset = 3;
const numPanels = 2;

export function PhysicsStats({
  top = 0,
  left = 0,
  right = "auto",
  bottom = "auto",
}: PhysicsStatsProps) {
  const { physicsPerformanceInfoRef } = useAmmoPhysicsContext();
  const [ panel, setPanel ] = useState<number>(0);

  const lastTickTimeRef = useRef(0);

  const [physicsPanel] = useState(() => {
    return new Stats.Panel("Physics (ms)", "#f8f", "#212");
  });
  const [physicsPanel2] = useState(() => {
    return new Stats.Panel("Physics (FPS)", "#ff8", "#221");
  });

  const [stats] = useState(() => {
    const stats = new Stats();

    stats.addPanel(physicsPanel);
    stats.addPanel(physicsPanel2);

    // stats.dom.style.pointerEvents = "none";

    return stats;
  });

  useEffect(() => {
    stats.showPanel(panel + panelIndexOffset);
  }, [stats, panel, panelIndexOffset]);

  useEffect(() => {
    document.body.appendChild(stats.dom);

    return () => {
      document.body.removeChild(stats.dom);
    };
  }, []);

  useEffect(() => {
    const onClick = () => {
      setPanel(prev => (prev + 1) % numPanels);
    };
    stats.dom.addEventListener("click", onClick);
    return () => {
      stats.dom.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    stats.dom.style.top = typeof top === "number" ? top + "px" : top;
    stats.dom.style.left = typeof left === "number" ? left + "px" : left;
    stats.dom.style.right = typeof right === "number" ? right + "px" : right;
    stats.dom.style.bottom =
      typeof bottom === "number" ? bottom + "px" : bottom;
  }, [top, left, right, bottom]);

  useFrame(() => {
    if (
      lastTickTimeRef.current !==
      physicsPerformanceInfoRef.current.substepCounter
    ) {
      lastTickTimeRef.current =
        physicsPerformanceInfoRef.current.substepCounter;

      if (physicsPerformanceInfoRef.current.lastTickMs > 0) {
        physicsPanel.update(physicsPerformanceInfoRef.current.lastTickMs, 16);
        physicsPanel2.update(physicsPerformanceInfoRef.current.fps, 200);
      }
    }
  });

  return null;
}
