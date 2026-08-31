import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  polygonCentroid,
  wallLength,
  type PlanModel,
  type PlanWall,
} from '../lib/planModel';

const BRAND = 0xf26a3d;
const CYAN = 0x81b7c2;
const CRITICAL = 0xff4d3d;
const PASS = 0x27c93f;

type ViewerProps = {
  model: PlanModel;
  /** Object URL of the source drawing — projected onto the ground plane. */
  blueprintUrl?: string;
  showBlueprint?: boolean;
  showLabels?: boolean;
  showMarkers?: boolean;
  wireframe?: boolean;
  autoRotate?: boolean;
  /** 0 = stacked storeys, 1 = fully exploded axonometric. */
  explode?: number;
  /** Storey to isolate — the rest ghost back. null shows the whole stack. */
  activeLevel?: number | null;
  className?: string;
};

/* ------------------------------------------------------------------ *
 * Holographic surface shader
 * ------------------------------------------------------------------ */

const HOLO_VERTEX = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const HOLO_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uSweep;
  uniform float uOpacity;
  varying vec3 vNormalW;
  varying vec3 vWorld;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), viewDir)), 2.0);

    // Horizontal interference lines, the classic projected-hologram tell.
    float scan = 0.5 + 0.5 * sin(vWorld.y * 22.0 - uTime * 2.4);
    float scanBand = smoothstep(0.6, 1.0, scan) * 0.35;

    // Bright band that rises through the model as it materialises.
    float sweep = smoothstep(0.7, 1.0, 1.0 - abs(vWorld.y - uSweep) / 0.75);

    vec3 color = mix(uColor, uAccent, clamp(fresnel + sweep, 0.0, 1.0));
    float alpha = uOpacity * (0.16 + 0.62 * fresnel + scanBand + 0.55 * sweep);
    gl_FragColor = vec4(color * (0.65 + 1.0 * fresnel + 0.7 * sweep), alpha);
  }
`;

function makeHoloMaterial(color: number, accent: number, opacity: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uAccent: { value: new THREE.Color(accent) },
      uTime: { value: 0 },
      uSweep: { value: -10 },
      uOpacity: { value: opacity },
    },
    vertexShader: HOLO_VERTEX,
    fragmentShader: HOLO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  // Remembered so a ghosted storey can be faded back to its own full strength.
  material.userData.baseOpacity = opacity;
  return material;
}

function makeEdgeMaterial(color: number, opacity: number) {
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  material.userData.baseOpacity = opacity;
  return material;
}

/* ------------------------------------------------------------------ *
 * Wall solid decomposition around door / window openings
 * ------------------------------------------------------------------ */

type Slab = { u: number; v: number; du: number; dv: number };

/**
 * Splits one wall into the rectangular pieces that survive after its openings
 * are punched out. `u` runs along the wall, `v` is height above the slab.
 */
function wallSlabs(wall: PlanWall, openings: { t: number; width: number; height: number; sill: number }[]): Slab[] {
  const length = wallLength(wall);
  const height = wall.height;
  if (!openings.length) return [{ u: 0, v: 0, du: length, dv: height }];

  const holes = openings
    .map((opening) => {
      const centre = opening.t * length;
      const half = Math.min(opening.width, length) / 2;
      return {
        start: Math.max(0, centre - half),
        end: Math.min(length, centre + half),
        sill: Math.max(0, opening.sill),
        top: Math.min(height, opening.sill + opening.height),
      };
    })
    .filter((hole) => hole.end - hole.start > 0.05)
    .sort((a, b) => a.start - b.start);

  const slabs: Slab[] = [];
  let cursor = 0;
  for (const hole of holes) {
    if (hole.start > cursor + 0.02) {
      slabs.push({ u: cursor, v: 0, du: hole.start - cursor, dv: height });
    }
    const span = hole.end - hole.start;
    if (hole.sill > 0.02) slabs.push({ u: hole.start, v: 0, du: span, dv: hole.sill });
    if (height - hole.top > 0.02) slabs.push({ u: hole.start, v: hole.top, du: span, dv: height - hole.top });
    cursor = Math.max(cursor, hole.end);
  }
  if (length - cursor > 0.02) slabs.push({ u: cursor, v: 0, du: length - cursor, dv: height });
  return slabs;
}

/* ------------------------------------------------------------------ *
 * Sprite labels
 * ------------------------------------------------------------------ */

/**
 * Builds a billboarded text label. `worldHeight` is in metres, so labels stay
 * readable regardless of how large the building is.
 */
function makeLabelSprite(text: string, color: string, worldHeight = 0.9, alwaysOnTop = true) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;

  const font = '600 34px "IBM Plex Mono", ui-monospace, monospace';
  context.font = font;
  const width = Math.ceil(context.measureText(text).width) + 40;
  canvas.width = Math.max(64, width);
  canvas.height = 64;

  context.font = font;
  context.textBaseline = 'middle';
  context.fillStyle = 'rgba(8, 9, 10, 0.72)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
  context.fillStyle = color;
  context.fillText(text, 20, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: !alwaysOnTop })
  );
  sprite.scale.set(worldHeight * (canvas.width / canvas.height), worldHeight, 1);
  return sprite;
}

/* ------------------------------------------------------------------ *
 * Viewer
 * ------------------------------------------------------------------ */

export function HolographicPlanViewer({
  model,
  blueprintUrl,
  showBlueprint = true,
  showLabels = true,
  showMarkers = true,
  wireframe = false,
  autoRotate = true,
  explode = 0,
  activeLevel = null,
  className,
}: ViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Live prop mirrors so the animation loop reads current values without
  // tearing down and rebuilding the whole scene on every toggle.
  const optionsRef = useRef({
    showLabels,
    showMarkers,
    wireframe,
    autoRotate,
    explode,
    showBlueprint,
    activeLevel,
  });
  optionsRef.current = {
    showLabels,
    showMarkers,
    wireframe,
    autoRotate,
    explode,
    showBlueprint,
    activeLevel,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08090a, 0.012);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 2000);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      // No WebGL — the caller keeps showing the 2D sheet.
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    const { plot, setbacks, levels, floorHeight } = model;
    const halfW = plot.width / 2;
    const halfD = plot.depth / 2;
    /** Plan metres to world units (plan Y runs south, world Z runs south). */
    const toWorld = (x: number, y: number) => new THREE.Vector3(x - halfW, 0, y - halfD);

    const root = new THREE.Group();
    scene.add(root);

    /* --- shared geometry & materials ------------------------------- */

    const unitBox = track(new THREE.BoxGeometry(1, 1, 1));
    const unitEdges = track(new THREE.EdgesGeometry(unitBox));

    // Every storey owns its materials, which is what lets one floor stay solid
    // while the rest of the stack ghosts back to a faint context frame.
    type LevelMaterials = {
      exterior: THREE.ShaderMaterial;
      interior: THREE.ShaderMaterial;
      slab: THREE.ShaderMaterial;
      roomFill: THREE.ShaderMaterial;
      exteriorEdge: THREE.LineBasicMaterial;
      interiorEdge: THREE.LineBasicMaterial;
      all: (THREE.ShaderMaterial | THREE.LineBasicMaterial)[];
    };

    const holoMaterials: THREE.ShaderMaterial[] = [];
    const makeLevelMaterials = (): LevelMaterials => {
      const exterior = track(makeHoloMaterial(BRAND, 0xffd7c4, 0.95));
      const interior = track(makeHoloMaterial(CYAN, 0xdff4f8, 0.7));
      const slab = track(makeHoloMaterial(BRAND, 0xffffff, 0.45));
      const roomFill = track(makeHoloMaterial(CYAN, 0xffffff, 0.22));
      const exteriorEdge = track(makeEdgeMaterial(BRAND, 0.95));
      const interiorEdge = track(makeEdgeMaterial(CYAN, 0.6));
      holoMaterials.push(exterior, interior, slab, roomFill);
      return {
        exterior,
        interior,
        slab,
        roomFill,
        exteriorEdge,
        interiorEdge,
        all: [exterior, interior, slab, roomFill, exteriorEdge, interiorEdge],
      };
    };
    const levelMaterials: LevelMaterials[] = [];

    /* --- ground: grid, plot boundary, setback envelope -------------- */

    const gridSize = Math.max(plot.width, plot.depth) * 1.9;
    const grid = new THREE.GridHelper(gridSize, Math.round(gridSize / 1), 0x2a3336, 0x161c1e);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = -0.02;
    root.add(grid);
    disposables.push(grid.geometry, grid.material as THREE.Material);

    const outlineMaterial = track(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    const setbackMaterial = track(
      new THREE.LineDashedMaterial({
        color: BRAND,
        transparent: true,
        opacity: 0.85,
        dashSize: 0.45,
        gapSize: 0.3,
      })
    );

    const rectLoop = (x: number, y: number, w: number, d: number, y0: number) => {
      const points = [
        toWorld(x, y),
        toWorld(x + w, y),
        toWorld(x + w, y + d),
        toWorld(x, y + d),
        toWorld(x, y),
      ].map((point) => point.setY(y0));
      return track(new THREE.BufferGeometry().setFromPoints(points));
    };

    root.add(new THREE.Line(rectLoop(0, 0, plot.width, plot.depth, 0.01), outlineMaterial));

    const setbackLine = new THREE.Line(
      rectLoop(
        setbacks.left,
        setbacks.front,
        Math.max(0.5, plot.width - setbacks.left - setbacks.right),
        Math.max(0.5, plot.depth - setbacks.front - setbacks.rear),
        0.02
      ),
      setbackMaterial
    );
    setbackLine.computeLineDistances();
    root.add(setbackLine);

    /* --- the uploaded 2D drawing, projected on the ground ----------- */

    let blueprintPlane: THREE.Mesh | null = null;
    if (blueprintUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(
        blueprintUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const planeGeometry = track(new THREE.PlaneGeometry(plot.width, plot.depth));
          const planeMaterial = track(
            new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 0.4,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
            })
          );
          blueprintPlane = new THREE.Mesh(planeGeometry, planeMaterial);
          blueprintPlane.rotation.x = -Math.PI / 2;
          blueprintPlane.position.y = 0.005;
          blueprintPlane.visible = optionsRef.current.showBlueprint;
          root.add(blueprintPlane);
          disposables.push(texture);
        },
        undefined,
        () => {
          /* a drawing that will not decode simply means no ground projection */
        }
      );
    }

    /* --- storeys ---------------------------------------------------- */

    type LevelGroup = { group: THREE.Group; baseY: number; index: number };
    const levelGroups: LevelGroup[] = [];
    const risers: { mesh: THREE.Object3D; target: number; delay: number }[] = [];

    const openingsByWall = new Map<number, { t: number; width: number; height: number; sill: number }[]>();
    for (const opening of model.openings) {
      const list = openingsByWall.get(opening.wall) || [];
      list.push(opening);
      openingsByWall.set(opening.wall, list);
    }

    let wallOrdinal = 0;
    for (let level = 0; level < levels; level += 1) {
      const materials = makeLevelMaterials();
      levelMaterials.push(materials);
      const group = new THREE.Group();
      const baseY = level * floorHeight;
      group.position.y = baseY;
      root.add(group);
      levelGroups.push({ group, baseY, index: level });

      // Floor slab for this storey, sized to the walls that sit on it.
      const levelWalls = model.walls.filter((wall) => wall.level === level);
      if (levelWalls.length) {
        const bounds = levelWalls.reduce(
          (acc, wall) => ({
            minX: Math.min(acc.minX, wall.x1, wall.x2),
            minY: Math.min(acc.minY, wall.y1, wall.y2),
            maxX: Math.max(acc.maxX, wall.x1, wall.x2),
            maxY: Math.max(acc.maxY, wall.y1, wall.y2),
          }),
          { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
        );
        const slab = new THREE.Mesh(unitBox, materials.slab);
        slab.scale.set(
          Math.max(0.5, bounds.maxX - bounds.minX) + 0.4,
          0.12,
          Math.max(0.5, bounds.maxY - bounds.minY) + 0.4
        );
        const centre = toWorld((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
        slab.position.set(centre.x, 0.06, centre.z);
        group.add(slab);

        const slabEdge = new THREE.LineSegments(unitEdges, materials.exteriorEdge);
        slabEdge.scale.copy(slab.scale);
        slabEdge.position.copy(slab.position);
        group.add(slabEdge);
      }

      // Room floor fills, faint, so the plan layout stays legible from above.
      for (const room of model.rooms.filter((item) => item.level === level)) {
        const shape = new THREE.Shape();
        room.polygon.forEach((point, index) => {
          const world = toWorld(point.x, point.y);
          if (index === 0) shape.moveTo(world.x, world.z);
          else shape.lineTo(world.x, world.z);
        });
        shape.closePath();
        const geometry = track(new THREE.ShapeGeometry(shape));
        const fill = new THREE.Mesh(geometry, materials.roomFill);
        fill.rotation.x = Math.PI / 2;
        fill.position.y = 0.14;
        group.add(fill);
      }

      // Walls, punched for their openings.
      for (const wall of levelWalls) {
        const wallIdx = model.walls.indexOf(wall);
        const length = wallLength(wall);
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        const start = toWorld(wall.x1, wall.y1);
        const dirX = Math.cos(angle);
        const dirZ = Math.sin(angle);
        const isExterior = wall.kind === 'exterior';

        const pieces = wallSlabs(wall, openingsByWall.get(wallIdx) || []);
        const wallGroup = new THREE.Group();
        wallGroup.scale.y = 0.001;
        group.add(wallGroup);
        risers.push({ mesh: wallGroup, target: 1, delay: level * 0.35 + (wallOrdinal % 14) * 0.045 });
        wallOrdinal += 1;

        for (const piece of pieces) {
          const centreU = piece.u + piece.du / 2;
          const px = start.x + dirX * centreU;
          const pz = start.z + dirZ * centreU;

          const mesh = new THREE.Mesh(unitBox, isExterior ? materials.exterior : materials.interior);
          mesh.scale.set(piece.du, piece.dv, wall.thickness);
          mesh.position.set(px, 0.12 + piece.v + piece.dv / 2, pz);
          mesh.rotation.y = -angle;
          wallGroup.add(mesh);

          const edge = new THREE.LineSegments(
            unitEdges,
            isExterior ? materials.exteriorEdge : materials.interiorEdge
          );
          edge.scale.copy(mesh.scale);
          edge.position.copy(mesh.position);
          edge.rotation.y = mesh.rotation.y;
          wallGroup.add(edge);
          mesh.userData.isSolid = true;
        }
      }
    }

    /* --- room labels ------------------------------------------------ */

    const labelSprites: THREE.Sprite[] = [];
    // Scale label text with the building so it stays legible on any plot size.
    const labelHeight = Math.min(1.3, Math.max(0.5, Math.max(plot.width, plot.depth) * 0.026));

    for (const room of model.rooms) {
      if (room.area < 6) continue;
      const sprite = makeLabelSprite(`${room.name}  ${room.area.toFixed(1)}m²`, '#81b7c2', labelHeight, false);
      if (!sprite) continue;
      const centroid = polygonCentroid(room.polygon);
      const world = toWorld(centroid.x, centroid.y);
      sprite.position.set(world.x, room.level * floorHeight + floorHeight * 0.55, world.z);
      sprite.userData.level = room.level;
      root.add(sprite);
      labelSprites.push(sprite);
      disposables.push(sprite.material);
    }

    /* --- violation beacons ------------------------------------------ */

    const beacons: { group: THREE.Group; phase: number }[] = [];
    const ringGeometry = track(new THREE.RingGeometry(0.5, 0.72, 40));
    const beamGeometry = track(new THREE.CylinderGeometry(0.07, 0.07, 1, 12, 1, true));

    model.markers.forEach((marker, index) => {
      const color = marker.severity === 'PASS' ? PASS : marker.severity === 'CRITICAL' ? CRITICAL : BRAND;
      const group = new THREE.Group();
      const world = toWorld(marker.x, marker.y);
      group.position.set(world.x, 0, world.z);

      const ringMaterial = track(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.2;
      group.add(ring);

      const beamHeight = levels * floorHeight + 1.6;
      const beamMaterial = track(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.scale.y = beamHeight;
      beam.position.y = beamHeight / 2;
      group.add(beam);

      const label = makeLabelSprite(
        `${marker.id} ${marker.label}`.slice(0, 34),
        marker.severity === 'PASS' ? '#27c93f' : '#f26a3d',
        labelHeight * 1.15
      );
      if (label) {
        label.position.y = beamHeight + 0.7;
        group.add(label);
        disposables.push(label.material);
      }

      root.add(group);
      beacons.push({ group, phase: index * 0.7 });
    });

    /* --- camera framing & orbit controls ----------------------------- */

    const modelHeight = levels * floorHeight;

    /**
     * Distance that fits the model's bounding sphere in both axes. Plots are
     * often long and thin, so fitting on vertical FOV alone clips them in a
     * wide panel (and vice versa).
     */
    const fitRadius = () => {
      const sphere = 0.5 * Math.hypot(plot.width, plot.depth, modelHeight * 1.6);
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      return (sphere / Math.sin(Math.max(0.15, Math.min(vFov, hFov)) / 2)) * 1.08;
    };

    let radiusBase = fitRadius();
    const orbit = {
      theta: Math.PI * 0.72,
      phi: Math.PI * 0.32,
      radius: radiusBase,
      targetTheta: Math.PI * 0.72,
      targetPhi: Math.PI * 0.32,
      targetRadius: radiusBase,
    };
    const focus = new THREE.Vector3(0, modelHeight * 0.38, 0);

    const applyCamera = () => {
      orbit.theta += (orbit.targetTheta - orbit.theta) * 0.12;
      orbit.phi += (orbit.targetPhi - orbit.phi) * 0.12;
      orbit.radius += (orbit.targetRadius - orbit.radius) * 0.12;
      const sinPhi = Math.sin(orbit.phi);
      camera.position.set(
        focus.x + orbit.radius * sinPhi * Math.cos(orbit.theta),
        focus.y + orbit.radius * Math.cos(orbit.phi),
        focus.z + orbit.radius * sinPhi * Math.sin(orbit.theta)
      );
      camera.lookAt(focus);
    };

    let pointerDown = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      orbit.targetTheta -= dx * 0.006;
      orbit.targetPhi = Math.min(Math.PI * 0.495, Math.max(0.08, orbit.targetPhi - dy * 0.005));
    };
    const onPointerUp = (event: PointerEvent) => {
      pointerDown = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      orbit.targetRadius = Math.min(
        radiusBase * 3.2,
        Math.max(radiusBase * 0.25, orbit.targetRadius * (1 + Math.sign(event.deltaY) * 0.12))
      );
    };

    const element = renderer.domElement;
    element.style.touchAction = 'none';
    element.style.cursor = 'grab';
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });

    /* --- animation --------------------------------------------------- */

    let frameId = 0;
    const clock = new THREE.Clock();
    let elapsed = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      elapsed += Math.min(clock.getDelta(), 0.05);
      const options = optionsRef.current;

      // Build-in: walls rise storey by storey.
      for (const riser of risers) {
        if (elapsed < riser.delay) continue;
        const current = riser.mesh.scale.y;
        riser.mesh.scale.y = current + (riser.target - current) * 0.09;
      }

      // Rising scan band, looping through the full model height.
      const sweepSpan = modelHeight + 3;
      const sweepY = ((elapsed * 1.9) % (sweepSpan + 2)) - 1;
      for (const material of holoMaterials) {
        material.uniforms.uTime.value = elapsed;
        material.uniforms.uSweep.value = sweepY;
      }

      const isolated = typeof options.activeLevel === 'number' ? options.activeLevel : null;

      // Storey explode.
      for (const level of levelGroups) {
        const target = level.baseY + level.index * options.explode * floorHeight * 1.25;
        level.group.position.y += (target - level.group.position.y) * 0.14;
        level.group.traverse((child) => {
          if ((child as THREE.Mesh).userData?.isSolid) child.visible = !options.wireframe;
        });
      }

      // Storey isolation: the chosen floor holds full strength while the rest
      // fade to a faint frame, so the stack still reads as one building.
      levelMaterials.forEach((materials, index) => {
        const factor = isolated === null || isolated === index ? 1 : 0.09;
        for (const material of materials.all) {
          const base = Number(material.userData.baseOpacity ?? 1);
          const target = base * factor;
          if ((material as THREE.ShaderMaterial).isShaderMaterial) {
            const uniform = (material as THREE.ShaderMaterial).uniforms.uOpacity;
            uniform.value += (target - uniform.value) * 0.16;
          } else {
            material.opacity += (target - material.opacity) * 0.16;
          }
        }
      });

      for (const sprite of labelSprites) {
        const level = Number(sprite.userData.level || 0);
        // Stacked storeys would bury the model in text, so upper-floor labels
        // only appear once the user isolates a storey or pulls the stack apart.
        sprite.visible =
          options.showLabels &&
          (isolated === null ? level === 0 || options.explode > 0.15 : level === isolated);
        sprite.position.y =
          level * floorHeight + floorHeight * 0.55 + level * options.explode * floorHeight * 1.25;
      }

      // Ease the orbit target up to the isolated storey so it fills the frame.
      const focusTargetY =
        isolated === null
          ? modelHeight * 0.38
          : (levelGroups[isolated]?.group.position.y ?? 0) + floorHeight * 0.5;
      focus.y += (focusTargetY - focus.y) * 0.08;

      for (const beacon of beacons) {
        beacon.group.visible = options.showMarkers;
        const pulse = 1 + Math.sin(elapsed * 3 + beacon.phase) * 0.22;
        beacon.group.children[0].scale.set(pulse, pulse, pulse);
      }

      if (blueprintPlane) blueprintPlane.visible = options.showBlueprint;

      if (options.autoRotate && !pointerDown) orbit.targetTheta += 0.0022;

      applyCamera();
      renderer.render(scene, camera);
    };

    applyCamera();
    animate();

    /* --- resize ------------------------------------------------------ */

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      // Keep the user's zoom level relative to a freshly-fitted framing.
      const next = fitRadius();
      const zoomRatio = orbit.targetRadius / radiusBase;
      radiusBase = next;
      orbit.targetRadius = next * zoomRatio;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('wheel', onWheel);
      for (const item of disposables) item.dispose();
      renderer.dispose();
      if (container.contains(element)) container.removeChild(element);
    };
  }, [model, blueprintUrl]);

  return <div ref={mountRef} className={className ?? 'absolute inset-0 h-full w-full'} />;
}
