import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeBuildingBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(7.8, 5.2, 9.8);
    camera.lookAt(0, 2.0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xf26a3d,
      transparent: true,
      opacity: 0.65,
    });

    const whiteLineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
    });

    const group = new THREE.Group();
    scene.add(group);

    function createAnimatedBox(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      delay = 0,
      isOrange = false
    ) {
      const geometry = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(edges, isOrange ? lineMaterial : whiteLineMaterial);
      line.position.set(x, y, z);
      line.scale.set(0, 0, 0);
      group.add(line);

      return {
        line,
        delay,
        targetScale: 1,
        currentScale: 0,
      };
    }

    // Enlarged 1.8x Scale Building Elements
    const elements = [
      createAnimatedBox(7.8, 0.15, 7.8, 0, -0.08, 0, 0, true),
      createAnimatedBox(0.15, 5.8, 0.15, -3.6, 2.9, -3.6, 0.3),
      createAnimatedBox(0.15, 5.8, 0.15, 3.6, 2.9, -3.6, 0.4),
      createAnimatedBox(0.15, 5.8, 0.15, -3.6, 2.9, 3.6, 0.5),
      createAnimatedBox(0.15, 5.8, 0.15, 3.6, 2.9, 3.6, 0.6),
      createAnimatedBox(7.4, 0.08, 7.4, 0, 2.9, 0, 0.9, true),
      createAnimatedBox(7.4, 0.08, 7.4, 0, 5.8, 0, 1.4, true),
      createAnimatedBox(0.15, 5.8, 3.0, 0, 2.9, 0, 1.8),
    ];

    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf26a3d, transparent: true, opacity: 0.95 });
    const markers: Array<{ mesh: THREE.Mesh; delay: number; phase: number }> = [];

    function addMarker(x: number, y: number, z: number, delay: number) {
      const geo = new THREE.SphereGeometry(0.14, 16, 16);
      const mesh = new THREE.Mesh(geo, markerMaterial);
      mesh.position.set(x, y, z);
      mesh.scale.set(0, 0, 0);
      group.add(mesh);
      markers.push({ mesh, delay, phase: Math.random() * Math.PI * 2 });
    }

    addMarker(-2.4, 3.2, 1.0, 2.2);
    addMarker(1.6, 1.0, -1.8, 2.6);
    addMarker(0, 6.0, 0, 3.0);

    let animationFrameId: number;
    const startTime = performance.now();

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;

      group.rotation.y += 0.0028;

      elements.forEach((el) => {
        if (elapsed > el.delay) {
          el.currentScale = Math.min(el.currentScale + 0.028, el.targetScale);
          el.line.scale.set(el.currentScale, el.currentScale, el.currentScale);
        }
      });

      markers.forEach((m) => {
        if (elapsed > m.delay) {
          const s = 1 + Math.sin(elapsed * 4 + m.phase) * 0.35;
          m.mesh.scale.set(s, s, s);
        }
      });

      renderer.render(scene, camera);
    }

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80 overflow-hidden z-0" />;
}
