import {
  Box,
  ChevronDown,
  ChevronUp,
  Eye,
  Grid3x3,
  Layers,
  Map,
  RotateCw,
  Tag,
  Wand2,
} from 'lucide-react';
import { levelStats, planStats, type PlanModel } from '../lib/planModel';
import type { CorrectedPlan } from '../lib/remediation';
import type { OverlayMode } from './HolographicPlanViewer';

export type HoloOptions = {
  labels: boolean;
  markers: boolean;
  blueprint: boolean;
  wireframe: boolean;
  autoRotate: boolean;
  explode: number;
  /** Isolated storey index, or null for the whole stack. */
  activeLevel: number | null;
  /** Whether the compliant envelope is shown against the as-drawn building. */
  overlayMode: OverlayMode;
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
  corrected,
}: {
  model: PlanModel;
  options: HoloOptions;
  onChange: (next: Partial<HoloOptions>) => void;
  corrected?: CorrectedPlan | null;
}) {
  const stats = planStats(model);
  const storeys = levelStats(model);
  const isAi = model.source === 'ai';
  const active = options.activeLevel;
  const activeStorey = active === null ? null : storeys[active] ?? null;

  /** Steps the isolated storey, clamped to the stack. */
  const step = (delta: number) => {
    const next = (active === null ? 0 : active) + delta;
    if (next < 0 || next >= storeys.length) return;
    onChange({ activeLevel: next });
  };

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
        {isAi && (
          <p className="mt-1 font-mono text-[10px] text-[#81b7c2]">
            Traced from: <span className="font-bold">{model.sourcePanel}</span>
          </p>
        )}
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

        {/* Corrected-envelope switch. Only offered when there is a fix to show. */}
        {corrected && (
          <div className="rounded-lg border border-[#27c93f]/40 bg-[#08090a]/90 p-1.5 backdrop-blur-md">
            <div className="mb-1 flex items-center gap-1.5 px-0.5">
              <Wand2 size={11} className="text-[#27c93f]" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#27c93f]">
                Corrected envelope
              </span>
            </div>
            <div className="flex gap-1">
              {(
                [
                  ['side-by-side', 'Compare'],
                  ['both', 'Overlay'],
                  ['as-drawn', 'As drawn'],
                  ['corrected', 'Legal'],
                ] as [OverlayMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChange({ overlayMode: mode })}
                  className={`rounded-md border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                    options.overlayMode === mode
                      ? 'border-[#27c93f] bg-[#27c93f]/15 text-[#27c93f]'
                      : 'border-[rgba(255,255,255,0.12)] text-[#8c999c] hover:border-[#27c93f] hover:text-[#27c93f]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Storey selector — the stack drawn top-down, as on a section sheet. */}
        <div className="rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#08090a]/90 p-1.5 backdrop-blur-md">
          <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#5f6c70]">
              Storeys
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => step(1)}
                disabled={active !== null && active >= storeys.length - 1}
                title="Storey up"
                className="rounded border border-[rgba(255,255,255,0.14)] p-0.5 text-[#8c999c] transition hover:border-[#81b7c2] hover:text-[#81b7c2] disabled:opacity-30 disabled:hover:border-[rgba(255,255,255,0.14)] disabled:hover:text-[#8c999c]"
              >
                <ChevronUp size={11} />
              </button>
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={active === null || active <= 0}
                title="Storey down"
                className="rounded border border-[rgba(255,255,255,0.14)] p-0.5 text-[#8c999c] transition hover:border-[#81b7c2] hover:text-[#81b7c2] disabled:opacity-30 disabled:hover:border-[rgba(255,255,255,0.14)] disabled:hover:text-[#8c999c]"
              >
                <ChevronDown size={11} />
              </button>
            </div>
          </div>

          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto pr-0.5">
            {[...storeys].reverse().map((storey) => {
              const isActive = active === storey.level;
              return (
                <button
                  key={storey.level}
                  type="button"
                  // Clicking the isolated storey again returns to the full stack.
                  onClick={() => onChange({ activeLevel: isActive ? null : storey.level })}
                  title={`${storey.rooms} rooms · ${storey.walls} walls · +${storey.elevation.toFixed(2)} m`}
                  className={`flex items-center justify-between gap-3 rounded-md border px-2 py-1 font-mono text-[10px] transition ${
                    isActive
                      ? 'border-[#f26a3d] bg-[#f26a3d]/15 text-[#f26a3d]'
                      : 'border-[rgba(255,255,255,0.12)] text-[#8c999c] hover:border-[#81b7c2] hover:text-[#81b7c2]'
                  }`}
                >
                  <span className="font-bold uppercase tracking-wider">{storey.label}</span>
                  <span className="tabular-nums opacity-80">{storey.area.toFixed(0)} m²</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onChange({ activeLevel: null })}
              title="Show the whole stack"
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                active === null
                  ? 'border-[#81b7c2] bg-[#81b7c2]/15 text-[#81b7c2]'
                  : 'border-[rgba(255,255,255,0.12)] text-[#8c999c] hover:border-[#81b7c2] hover:text-[#81b7c2]'
              }`}
            >
              <Layers size={11} />
              <span>All {model.levels}</span>
            </button>
          </div>

          {activeStorey && (
            <p className="mt-1 px-0.5 font-mono text-[9px] text-[#5f6c70]">
              {activeStorey.rooms} rooms · {activeStorey.openings} openings · +
              {activeStorey.elevation.toFixed(2)} m
            </p>
          )}

          {model.levels > 1 && (
            <div className="mt-1.5 flex items-center gap-2 border-t border-[rgba(255,255,255,0.08)] px-0.5 pt-1.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#5f6c70]">Split</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={options.explode}
                onChange={(event) => onChange({ explode: Number(event.target.value) })}
                className="h-1 flex-1 accent-[#f26a3d] cursor-pointer"
                title="Explode storeys"
              />
              <span className="w-8 text-right font-mono text-[10px] font-bold text-[#f26a3d]">
                {Math.round(options.explode * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* What compliance actually requires, and what it costs. */}
      {corrected && options.overlayMode !== 'as-drawn' && (
        <div className="absolute bottom-14 right-3 z-30 max-w-[19rem] rounded-lg border border-[#27c93f]/40 bg-[#08090a]/92 px-3 py-2.5 backdrop-blur-md">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#27c93f]">
            Required corrections
          </p>

          <ul className="mt-2 space-y-1.5">
            {corrected.corrections
              .filter((item) => item.geometric)
              .slice(0, 6)
              .map((item) => (
                <li key={item.ruleId} className="font-mono text-[10px] leading-relaxed">
                  <span className="text-[#f4f0e8]">{item.title}</span>
                  {item.delta !== undefined && (
                    <span className="ml-1 font-bold text-[#27c93f]">
                      {item.kind === 'height' || item.kind === 'fsi' || item.kind === 'coverage'
                        ? `-${item.delta.toFixed(2)}${item.unit === 'm' ? ' m' : ` ${item.unit}`}`
                        : `${item.delta.toFixed(2)} m inward`}
                    </span>
                  )}
                  <span className="block text-[#5f6c70]">{item.clause}</span>
                </li>
              ))}
          </ul>

          <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t border-[rgba(255,255,255,0.08)] pt-2 font-mono text-[10px]">
            {[
              ['Footprint', `-${corrected.impact.footprintLost.toFixed(0)} m²`],
              ['Built-up', `-${corrected.impact.builtUpLost.toFixed(0)} m²`],
              ['Storeys', `-${corrected.impact.levelsRemoved}`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="uppercase tracking-wide text-[#5f6c70]">{label}</dt>
                <dd className="font-bold text-[#f4f0e8]">{value}</dd>
              </div>
            ))}
          </dl>

          {corrected.advisories.length > 0 && (
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-[#8c999c]">
              {corrected.advisories.length} further violation
              {corrected.advisories.length === 1 ? '' : 's'} cannot be fixed by geometry alone
              (parking, disclosures, clear widths) — see the audit list.
            </p>
          )}
        </div>
      )}

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
