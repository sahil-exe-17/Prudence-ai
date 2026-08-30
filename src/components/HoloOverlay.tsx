import { Box, Eye, Grid3x3, Layers, Map, RotateCw, Tag } from 'lucide-react';
import { planStats, type PlanModel } from '../lib/planModel';

export type HoloOptions = {
  labels: boolean;
  markers: boolean;
  blueprint: boolean;
  wireframe: boolean;
  autoRotate: boolean;
  explode: number;
};

/** Materialising / reconstruction placeholder shown before geometry arrives. */
export function HoloBuildingState({ status }: { status: 'idle' | 'building' | 'ready' }) {
  const message =
    status === 'building'
      ? 'Vectorising drawing into 3D geometry…'
      : 'Waiting for the compliance pass to finish';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-lg border-2 border-[#f26a3d]/70 animate-ping" />
        <div className="absolute inset-2 rounded-lg border border-[#81b7c2]/60 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Box size={26} className="text-[#f26a3d]" />
        </div>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#81b7c2]">{message}</p>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
        active
          ? 'border-[#f26a3d] bg-[#f26a3d]/15 text-[#f26a3d]'
          : 'border-[rgba(255,255,255,0.14)] text-[#8c999c] hover:border-[#81b7c2] hover:text-[#81b7c2]'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Read-out and controls floating over the WebGL hologram. */
export function HoloOverlay({
  model,
  options,
  onChange,
}: {
  model: PlanModel;
  options: HoloOptions;
  onChange: (next: Partial<HoloOptions>) => void;
}) {
  const stats = planStats(model);
  const isAi = model.source === 'ai';

  return (
    <>
      {/* Provenance + derived metrics */}
      <div className="absolute left-3 top-3 z-30 max-w-[16rem] rounded-lg border border-[#f26a3d]/40 bg-[#08090a]/90 px-3 py-2.5 backdrop-blur-md pointer-events-none">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${isAi ? 'bg-[#27c93f]' : 'bg-[#81b7c2]'} animate-pulse`}
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#f26a3d]">
            {isAi ? 'Vision-traced model' : 'Derived model'}
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-[#8c999c]">
          {model.providerMessage}
        </p>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
          {[
            ['Plot', `${model.plot.width.toFixed(1)} × ${model.plot.depth.toFixed(1)} m`],
            ['Built-up', `${stats.builtUp.toFixed(1)} m²`],
            ['Coverage', `${stats.coverage.toFixed(1)} %`],
            ['FSI', stats.fsi.toFixed(2)],
            ['Storeys', `${model.levels} @ ${model.floorHeight.toFixed(2)} m`],
            ['Height', `${stats.height.toFixed(2)} m`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[#5f6c70] uppercase tracking-wide">{label}</dt>
              <dd className="text-[#f4f0e8] font-bold">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-2 font-mono text-[9px] text-[#5f6c70]">
          {stats.walls} walls · {stats.openings} openings · confidence {(model.confidence * 100).toFixed(0)}%
        </p>
      </div>

      {/* View controls */}
      <div className="absolute right-3 top-3 z-30 flex flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-1.5 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#08090a]/90 p-1.5 backdrop-blur-md">
          <Toggle
            active={options.wireframe}
            onClick={() => onChange({ wireframe: !options.wireframe })}
            icon={<Grid3x3 size={11} />}
            label="Wire"
          />
          <Toggle
            active={options.labels}
            onClick={() => onChange({ labels: !options.labels })}
            icon={<Tag size={11} />}
            label="Rooms"
          />
          <Toggle
            active={options.markers}
            onClick={() => onChange({ markers: !options.markers })}
            icon={<Eye size={11} />}
            label="Pins"
          />
          <Toggle
            active={options.blueprint}
            onClick={() => onChange({ blueprint: !options.blueprint })}
            icon={<Map size={11} />}
            label="2D"
          />
          <Toggle
            active={options.autoRotate}
            onClick={() => onChange({ autoRotate: !options.autoRotate })}
            icon={<RotateCw size={11} />}
            label="Spin"
          />
        </div>

        {model.levels > 1 && (
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#08090a]/90 px-2.5 py-1.5 backdrop-blur-md">
            <Layers size={12} className="text-[#81b7c2]" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={options.explode}
              onChange={(event) => onChange({ explode: Number(event.target.value) })}
              className="h-1 w-24 accent-[#f26a3d] cursor-pointer"
              title="Explode storeys"
            />
            <span className="font-mono text-[10px] font-bold text-[#f26a3d] w-8 text-right">
              {Math.round(options.explode * 100)}%
            </span>
          </div>
        )}
      </div>

      {model.notes.length > 0 && (
        <div className="absolute bottom-14 left-3 z-30 max-w-[22rem] pointer-events-none">
          {model.notes.slice(0, 2).map((note, index) => (
            <p key={index} className="font-mono text-[9px] leading-relaxed text-[#5f6c70]">
              › {note}
            </p>
          ))}
        </div>
      )}

      <p className="absolute bottom-3 right-3 z-30 font-mono text-[9px] uppercase tracking-[0.15em] text-[#5f6c70] pointer-events-none">
        Drag to orbit · scroll to zoom
      </p>
    </>
  );
}
