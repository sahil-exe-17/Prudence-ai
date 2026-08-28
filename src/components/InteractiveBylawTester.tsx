import { useState } from 'react';
import { Sliders, CheckCircle2, Shield, Building, Globe } from 'lucide-react';

type CityRule = {
  code: string;
  city: string;
  name: string;
  minFrontSetback: number; // in meters
  maxFar: number;
  minOpenSpacePct: number;
  clause: string;
};

const cityRules: CityRule[] = [
  { code: 'BBMP 2026', city: 'Bengaluru', name: 'BBMP Building Bye-Laws 2026', minFrontSetback: 6.0, maxFar: 2.25, minOpenSpacePct: 15, clause: 'Clause 14.2 (Table 4.1)' },
  { code: 'DCPR 2034', city: 'Mumbai', name: 'MCGM DCPR Regulations 2034', minFrontSetback: 4.5, maxFar: 2.50, minOpenSpacePct: 20, clause: 'Regulation 33(10) Fire' },
  { code: 'UBBL 2016', city: 'Delhi / NCR', name: 'Unified Building Bye-Laws 2016', minFrontSetback: 5.0, maxFar: 2.00, minOpenSpacePct: 18, clause: 'Clause 7.5 Setback Norms' },
  { code: 'NBC 2016', city: 'National Code', name: 'National Building Code 2016', minFrontSetback: 6.0, maxFar: 2.50, minOpenSpacePct: 15, clause: 'Part 4 Fire Safety' },
  { code: 'RERA 2016', city: 'India', name: 'Real Estate Regulatory Act', minFrontSetback: 4.0, maxFar: 2.00, minOpenSpacePct: 15, clause: 'Sec 4 Carpet Disclosure' },
  { code: 'GHMC 2024', city: 'Hyderabad', name: 'GHMC Building Regulations', minFrontSetback: 5.0, maxFar: 2.40, minOpenSpacePct: 15, clause: 'High-Rise Clearance' },
];

export function InteractiveBylawTester({ onLaunch }: { onLaunch?: () => void }) {
  const [selectedCity, setSelectedCity] = useState<CityRule>(cityRules[0]);
  const [frontSetback, setFrontSetback] = useState<number>(4.8);
  const [plotArea, setPlotArea] = useState<number>(432);

  const setbackDeficit = frontSetback - selectedCity.minFrontSetback;
  const isPass = setbackDeficit >= 0;
  const complianceScore = isPass ? 94 : Math.max(50, Math.round(94 + setbackDeficit * 15));

  return (
    <div className="py-12 w-full">
      {/* Section Subheader */}
      <div className="flex flex-col items-center text-center mb-12">
        <span className="font-mono text-xs font-bold text-[#81b7c2] uppercase tracking-widest">
          REGULATORY MATRIX INSPECTOR
        </span>
        <h2 className="font-space text-3xl md:text-5xl font-bold text-[#f4f0e8] mt-2">
          Test building codes across major jurisdictions.
        </h2>
      </div>

      {/* Floating City Pills Selector (NO BOX WRAPPER) */}
      <div className="flex justify-center gap-3 overflow-x-auto pb-4 max-w-5xl mx-auto px-4">
        {cityRules.map((rule) => {
          const isSelected = selectedCity.code === rule.code;
          return (
            <button
              key={rule.code}
              type="button"
              onClick={() => setSelectedCity(rule)}
              className={`px-4 py-2 font-mono text-xs rounded-full border transition font-semibold shrink-0 ${
                isSelected
                  ? 'border-[#81b7c2] bg-[#81b7c2]/15 text-[#81b7c2]'
                  : 'border-white/10 bg-transparent text-[#8c999c] hover:text-[#f4f0e8] hover:border-white/20'
              }`}
            >
              <span>{rule.code} ({rule.city})</span>
            </button>
          );
        })}
      </div>

      {/* Open Spatial Display (NO NESTED BOXES) */}
      <div className="max-w-4xl mx-auto mt-10 pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center px-4">
        {/* Left Sliders Column */}
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="text-[#8c999c]">FRONT SETBACK PROVIDED:</span>
              <span className="text-[#f4f0e8] font-bold text-base">{frontSetback.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="8.0"
              step="0.1"
              value={frontSetback}
              onChange={(e) => setFrontSetback(parseFloat(e.target.value))}
              className="w-full accent-[#81b7c2] cursor-pointer h-1 bg-white/10 rounded-lg"
            />
            <div className="flex justify-between font-mono text-[10px] text-[#8c999c]">
              <span>2.0 m</span>
              <span>Required: {selectedCity.minFrontSetback.toFixed(2)} m</span>
              <span>8.0 m</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="text-[#8c999c]">PLOT AREA:</span>
              <span className="text-[#81b7c2] font-bold text-base">{plotArea} sq m</span>
            </div>
            <input
              type="range"
              min="200"
              max="1200"
              step="10"
              value={plotArea}
              onChange={(e) => setPlotArea(parseInt(e.target.value, 10))}
              className="w-full accent-[#81b7c2] cursor-pointer h-1 bg-white/10 rounded-lg"
            />
            <div className="flex justify-between font-mono text-[10px] text-[#8c999c]">
              <span>200 sq m</span>
              <span>Max FAR: {selectedCity.maxFar}</span>
              <span>1200 sq m</span>
            </div>
          </div>
        </div>

        {/* Right Metric Gauge Display */}
        <div className="border-l border-white/10 pl-8 space-y-4">
          <div className="font-mono text-xs text-[#8c999c]">
            <span>{selectedCity.name}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 bg-transparent ${isPass ? 'border-[#81b7c2]' : 'border-[#f26a3d]'}`}>
              <span className="font-space text-2xl font-bold text-[#f4f0e8]">{complianceScore}%</span>
            </div>

            <div className="flex flex-col gap-1 font-mono text-xs">
              <span className="text-[#8c999c]">Clause Reference:</span>
              <span className="text-[#f4f0e8] font-bold">{selectedCity.clause}</span>
              <span className="text-[#8c999c] mt-1">Setback Margin:</span>
              <span className={`font-bold ${isPass ? 'text-[#81b7c2]' : 'text-[#f26a3d]'}`}>
                {setbackDeficit >= 0 ? `+${setbackDeficit.toFixed(2)} m (Clear)` : `${setbackDeficit.toFixed(2)} m (Deficit)`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
