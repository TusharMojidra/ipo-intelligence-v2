import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AppTheme } from './Header';

interface Hero3DVisualProps {
  theme?: AppTheme;
}

/**
 * 3D Interactive IPO Listing Stage (Framed Crucible)
 * 
 * Specifically designed to sit inside the Hero's right-hand stage:
 * - 3D Frosted Gemstone Bullish Candlesticks with wicks
 * - Ceremonial Champagne Gold Listing Day Bell & Clapper
 * - Ascending Laser Trajectory Ribbon to the Listing Peak
 * - Orbiting Golden Capital Coins / Rupee Discs
 * - Institutional Demand Columns (QIB, HNI, RII)
 * - Cursor Parallax with smooth lerp physics inside its dedicated stage
 */
export const Hero3DVisual: React.FC<Hero3DVisualProps> = ({ theme = 'midnight' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();

    // Dimensions
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 10.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y';
    container.appendChild(renderer.domElement);

    // Main 3D Stage Group
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5eb, 1.6);
    dirLight.position.set(5, 7, 6);
    scene.add(dirLight);

    // Theme palette mappings
    const isEmerald = theme === 'emerald';
    const isCyber = theme === 'cyber';

    // Midnight Blue (v1.1 Default): Sky blue 0x38bdf8 + Indigo 0x818cf8
    // Emerald: Mint 0x10b981 + Gold 0xf59e0b
    // Cyber/Charcoal: Violet 0xa855f7 + Rose 0xec4899
    const primaryColor = isEmerald ? 0x10b981 : isCyber ? 0xa855f7 : 0x38bdf8;
    const secondaryColor = isEmerald ? 0xf59e0b : isCyber ? 0xec4899 : 0x818cf8;

    // Reactive point lights
    const primaryLight = new THREE.PointLight(primaryColor, 4.0, 16);
    primaryLight.position.set(4, 4, 4);
    scene.add(primaryLight);

    const secondaryLight = new THREE.PointLight(secondaryColor, 3.0, 16);
    secondaryLight.position.set(-4, -2, 4);
    scene.add(secondaryLight);

    // -------------------------------------------------------------
    // 1. Materials for Financial Objects
    // -------------------------------------------------------------
    // Frosted Emerald Gemstone Candlesticks (Alpha)
    const bullCandleMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x064e3b,
      emissiveIntensity: 0.35,
      metalness: 0.25,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const wickMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });

    // Satin Champagne Gold for Listing Bell
    const bellMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
      metalness: 0.92,
      roughness: 0.2,
      clearcoat: 0.8,
    });

    // Dark Titanium Arch
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.3,
    });

    // Deep Obsidian Pedestal
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x11131a,
      metalness: 0.6,
      roughness: 0.4,
    });

    // -------------------------------------------------------------
    // 2. Base Trading Pedestal / Stage
    // -------------------------------------------------------------
    const pedestalGeom = new THREE.CylinderGeometry(4.4, 4.8, 0.4, 32);
    const pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
    pedestal.position.set(0, -2.6, 0);
    stageGroup.add(pedestal);

    const ringGeom = new THREE.TorusGeometry(4.6, 0.05, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: primaryColor, transparent: true, opacity: 0.7 });
    const stageRing = new THREE.Mesh(ringGeom, ringMat);
    stageRing.rotation.x = Math.PI / 2;
    stageRing.position.set(0, -2.4, 0);
    stageGroup.add(stageRing);

    // -------------------------------------------------------------
    // 3. 3D Candlesticks (Stepping Upward Like Listing Momentum)
    // -------------------------------------------------------------
    const candlesGroup = new THREE.Group();
    stageGroup.add(candlesGroup);

    interface CandleData {
      x: number;
      bodyY: number;
      bodyHeight: number;
      wickTop: number;
      wickBottom: number;
    }

    const candleConfigs: CandleData[] = [
      { x: -3.0, bodyY: -1.6, bodyHeight: 0.9, wickTop: 0.5, wickBottom: 0.4 },
      { x: -2.0, bodyY: -1.2, bodyHeight: 1.2, wickTop: 0.6, wickBottom: 0.5 },
      { x: -1.0, bodyY: -0.7, bodyHeight: 1.6, wickTop: 0.7, wickBottom: 0.4 },
      { x: 0.1, bodyY: -0.2, bodyHeight: 2.0, wickTop: 0.8, wickBottom: 0.6 },
      { x: 1.2, bodyY: 0.5, bodyHeight: 2.4, wickTop: 0.9, wickBottom: 0.5 },
      { x: 2.3, bodyY: 1.2, bodyHeight: 2.8, wickTop: 1.1, wickBottom: 0.7 },
    ];

    const candleMeshes: THREE.Mesh[] = [];

    candleConfigs.forEach((c) => {
      const cGroup = new THREE.Group();
      cGroup.position.set(c.x, c.bodyY, -0.2);

      // Body
      const bGeom = new THREE.BoxGeometry(0.46, c.bodyHeight, 0.46);
      const bMesh = new THREE.Mesh(bGeom, bullCandleMat);
      cGroup.add(bMesh);
      candleMeshes.push(bMesh);

      // Upper Wick
      const upWickGeom = new THREE.CylinderGeometry(0.035, 0.035, c.wickTop, 8);
      const upWick = new THREE.Mesh(upWickGeom, wickMat);
      upWick.position.y = c.bodyHeight / 2 + c.wickTop / 2;
      cGroup.add(upWick);

      // Lower Wick
      const lowWickGeom = new THREE.CylinderGeometry(0.035, 0.035, c.wickBottom, 8);
      const lowWick = new THREE.Mesh(lowWickGeom, wickMat);
      lowWick.position.y = -(c.bodyHeight / 2 + c.wickBottom / 2);
      cGroup.add(lowWick);

      candlesGroup.add(cGroup);
    });

    // -------------------------------------------------------------
    // 4. 3D Ceremonial Listing Day Bell / Gong
    // -------------------------------------------------------------
    const bellGroup = new THREE.Group();
    bellGroup.position.set(2.6, 1.8, 0.5);
    stageGroup.add(bellGroup);

    // Arch frame
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.9, -1.8, 0),
      new THREE.Vector3(-0.9, 0.8, 0),
      new THREE.Vector3(0, 1.3, 0),
      new THREE.Vector3(0.9, 0.8, 0),
      new THREE.Vector3(0.9, -1.8, 0),
    ]);
    const archGeom = new THREE.TubeGeometry(archCurve, 32, 0.06, 12, false);
    const archMesh = new THREE.Mesh(archGeom, archMat);
    bellGroup.add(archMesh);

    // Bell body
    const bellMeshGroup = new THREE.Group();
    bellMeshGroup.position.set(0, 0.4, 0);

    const bellTopGeom = new THREE.CylinderGeometry(0.18, 0.35, 0.45, 24);
    const bellTop = new THREE.Mesh(bellTopGeom, bellMat);
    bellMeshGroup.add(bellTop);

    const bellBodyGeom = new THREE.CylinderGeometry(0.35, 0.75, 0.7, 24);
    const bellBody = new THREE.Mesh(bellBodyGeom, bellMat);
    bellBody.position.y = -0.45;
    bellMeshGroup.add(bellBody);

    const lipGeom = new THREE.TorusGeometry(0.75, 0.08, 16, 32);
    const lipMesh = new THREE.Mesh(lipGeom, bellMat);
    lipMesh.rotation.x = Math.PI / 2;
    lipMesh.position.y = -0.8;
    bellMeshGroup.add(lipMesh);

    const clapperGeom = new THREE.SphereGeometry(0.16, 16, 16);
    const clapperMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const clapper = new THREE.Mesh(clapperGeom, clapperMat);
    clapper.position.y = -0.85;
    bellMeshGroup.add(clapper);

    bellGroup.add(bellMeshGroup);

    // -------------------------------------------------------------
    // 5. 3D Ascending Listing Trend Ribbon
    // -------------------------------------------------------------
    const trendCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.4, -2.0, 0.4),
      new THREE.Vector3(-2.0, -1.4, 0.6),
      new THREE.Vector3(-0.8, -0.8, 0.5),
      new THREE.Vector3(0.2, 0.0, 0.8),
      new THREE.Vector3(1.3, 0.9, 0.9),
      new THREE.Vector3(2.3, 2.3, 1.0),
    ]);
    const trendGeom = new THREE.TubeGeometry(trendCurve, 64, 0.065, 12, false);
    const trendMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: primaryColor,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.1,
    });
    const trendMesh = new THREE.Mesh(trendGeom, trendMat);
    stageGroup.add(trendMesh);

    // Peak Milestone Node
    const peakGeom = new THREE.SphereGeometry(0.22, 16, 16);
    const peakMat = new THREE.MeshBasicMaterial({ color: secondaryColor });
    const peakNode = new THREE.Mesh(peakGeom, peakMat);
    peakNode.position.set(2.3, 2.3, 1.0);
    stageGroup.add(peakNode);

    // -------------------------------------------------------------
    // 6. Floating Orbiting Capital Coins
    // -------------------------------------------------------------
    const coins: { mesh: THREE.Mesh; angle: number; radius: number; speed: number; y: number }[] = [];
    const coinGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.07, 24);

    for (let i = 0; i < 4; i++) {
      const coinMesh = new THREE.Mesh(coinGeom, bellMat);
      coinMesh.rotation.x = Math.PI / 2.5;
      stageGroup.add(coinMesh);

      coins.push({
        mesh: coinMesh,
        angle: (i * Math.PI) / 2,
        radius: 2.0 + (i % 2) * 0.7,
        speed: 0.8 + i * 0.2,
        y: 1.0 + (i % 3) * 0.5,
      });
    }

    // -------------------------------------------------------------
    // 7. Mini 3D Institutional Subscription Demand Pillars
    // -------------------------------------------------------------
    const pillarMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    
    // QIB Pillar
    const qibPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.8, 16), pillarMat);
    qibPillar.position.set(-1.8, -1.6, 1.2);
    stageGroup.add(qibPillar);

    // HNI Pillar
    const hniPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.3, 16), pillarMat);
    hniPillar.position.set(-1.2, -1.8, 1.3);
    stageGroup.add(hniPillar);

    // RII Pillar
    const riiPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 16), pillarMat);
    riiPillar.position.set(-0.7, -1.95, 1.4);
    stageGroup.add(riiPillar);

    // -------------------------------------------------------------
    // 8. Cursor, Touch & Gyroscope Parallax Tracking within Stage
    // -------------------------------------------------------------
    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    let lastInteraction = performance.now();
    let isTouching = false;

    const updateCoordinates = (clientX: number, clientY: number, factor = 1.0) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = Math.max(-1.8, Math.min(1.8, x * factor));
      mouse.targetY = Math.max(-1.8, Math.min(1.8, y * factor));
      lastInteraction = performance.now();
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateCoordinates(e.clientX, e.clientY, 1.0);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isTouching = true;
        updateCoordinates(e.touches[0].clientX, e.touches[0].clientY, 1.4);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateCoordinates(e.touches[0].clientX, e.touches[0].clientY, 1.4);
      }
    };

    const handleTouchEnd = () => {
      isTouching = false;
    };

    // Gyroscope / DeviceOrientation for physical mobile tilt
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null && !isTouching) {
        const tiltX = Math.max(-1.6, Math.min(1.6, e.gamma / 22));
        const tiltY = Math.max(-1.6, Math.min(1.6, (e.beta - 45) / 25));
        mouse.targetX = tiltX;
        mouse.targetY = -tiltY;
        lastInteraction = performance.now();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // -------------------------------------------------------------
    // 9. Animation Loop
    // -------------------------------------------------------------
    let animationId: number;
    const startTime = performance.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) * 0.001;

      // Smooth cursor / touch lerp damping
      mouse.x += (mouse.targetX - mouse.x) * 0.055;
      mouse.y += (mouse.targetY - mouse.y) * 0.055;

      // Ambient idle breathing wave if no active touch/mouse for > 1.2s
      const idleSeconds = (performance.now() - lastInteraction) * 0.001;
      const ambientX = idleSeconds > 1.2 ? Math.sin(elapsed * 0.9) * 0.22 : 0;
      const ambientY = idleSeconds > 1.2 ? Math.cos(elapsed * 0.7) * 0.14 : 0;

      // Parallax tilt of the stage
      stageGroup.rotation.y = mouse.x * 0.45 + ambientX;
      stageGroup.rotation.x = -mouse.y * 0.25 + ambientY;
      stageGroup.position.x = mouse.x * 0.4 + ambientX * 0.5;
      stageGroup.position.y = mouse.y * 0.25 + ambientY * 0.5;

      // Light drift tracking cursor & touch
      primaryLight.position.x = 4 + mouse.x * 4;
      primaryLight.position.y = 4 + mouse.y * 3;

      // Animate Listing Bell pendulum swing
      bellMeshGroup.rotation.z = Math.sin(elapsed * 3.5) * 0.16 + mouse.x * 0.1;

      // Orbit Capital Coins
      coins.forEach((c) => {
        const curAngle = c.angle + elapsed * c.speed;
        c.mesh.position.x = 2.6 + Math.cos(curAngle) * c.radius;
        c.mesh.position.z = 0.5 + Math.sin(curAngle) * c.radius;
        c.mesh.position.y = c.y + Math.sin(elapsed * 2 + c.angle) * 0.2;
        c.mesh.rotation.y = elapsed * 2;
        c.mesh.rotation.z = Math.sin(elapsed + c.angle) * 0.3;
      });

      // Floating pulse of candles
      candleMeshes.forEach((mesh, idx) => {
        mesh.scale.y = 1 + Math.sin(elapsed * 2 + idx * 0.6) * 0.04;
      });

      // Pulse peak node
      const peakScale = 1 + Math.sin(elapsed * 4) * 0.15;
      peakNode.scale.set(peakScale, peakScale, peakScale);

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
      }
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose
      pedestalGeom.dispose();
      pedestalMat.dispose();
      ringGeom.dispose();
      ringMat.dispose();
      bullCandleMat.dispose();
      wickMat.dispose();
      bellMat.dispose();
      archGeom.dispose();
      archMat.dispose();
      bellTopGeom.dispose();
      bellBodyGeom.dispose();
      lipGeom.dispose();
      clapperGeom.dispose();
      clapperMat.dispose();
      trendGeom.dispose();
      trendMat.dispose();
      peakGeom.dispose();
      peakMat.dispose();
      coinGeom.dispose();
      pillarMat.dispose();
      renderer.dispose();
    };
  }, [theme]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      title="Interactive 3D IPO Listing Stage - Move cursor to tilt & inspect"
    />
  );
};
