import { useState } from 'react';
import { FileText, CheckCircle2, Download, ShieldCheck, Sparkles, Layers, ArrowRight } from 'lucide-react';

export function InteractiveWorkflowSimulator({ onLaunch }: { onLaunch?: () => void }) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  return (
    <div className="py-12 w-full">
      {/* Section Subheader */}
      <div className="flex flex-col items-center text-center mb-16">
        <span className="font-mono text-xs font-bold text-[#81b7c2] uppercase tracking-widest">
          FLUID ENGINEERING TIMELINE
        </span>
        <h2 className="font-space text-3xl md:text-5xl font-bold text-[#f4f0e8] mt-2">
          Three steps from drawing to certified clearance.
        </h2>
      </div>

      {/* Borderless Horizontal Vector Line Timeline */}
      <div className="relative max-w-5xl mx-auto mb-14 px-4">
        {/* Connecting vector guide line */}
        <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-[#81b7c2]/40 to-transparent -translate-y-1/2 z-0 hidden sm:block" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-10">
          {/* Node 1 */}
          <div
            onClick={() => setActiveStep(1)}
            className={`cursor-pointer flex flex-col items-center text-center group transition ${
              activeStep === 1 ? 'scale-105' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <div
              className={`h-16 w-16 rounded-2xl flex items-center justify-center font-mono text-lg font-bold border transition duration-300 ${
                activeStep === 1
                  ? 'bg-[#81b7c2] text-[#08090a] border-[#81b7c2] shadow-[0_0_25px_rgba(129,183,194,0.4)]'
                  : 'bg-[#111416] text-[#8c999c] border-white/10 group-hover:border-white/30'
              }`}
            >
              01
            </div>
            <h4 className="font-space text-lg font-bold text-[#f4f0e8] mt-4">Upload Drawing</h4>
            <p className="font-sans text-xs text-[#8c999c] mt-1 max-w-[200px]">DWG, DXF, or Vector PDF</p>
          </div>

          {/* Node 2 */}
          <div
            onClick={() => setActiveStep(2)}
            className={`cursor-pointer flex flex-col items-center text-center group transition ${
              activeStep === 2 ? 'scale-105' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <div
              className={`h-16 w-16 rounded-2xl flex items-center justify-center font-mono text-lg font-bold border transition duration-300 ${
                activeStep === 2
                  ? 'bg-[#f26a3d] text-[#08090a] border-[#f26a3d] shadow-[0_0_25px_rgba(242,106,61,0.4)]'
                  : 'bg-[#111416] text-[#8c999c] border-white/10 group-hover:border-white/30'
              }`}
            >
              02
            </div>
            <h4 className="font-space text-lg font-bold text-[#f4f0e8] mt-4">AI Bylaw Cross-Check</h4>
            <p className="font-sans text-xs text-[#8c999c] mt-1 max-w-[200px]">Setbacks, FSI & Fire Codes</p>
          </div>

          {/* Node 3 */}
          <div
            onClick={() => setActiveStep(3)}
            className={`cursor-pointer flex flex-col items-center text-center group transition ${
              activeStep === 3 ? 'scale-105' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <div
              className={`h-16 w-16 rounded-2xl flex items-center justify-center font-mono text-lg font-bold border transition duration-300 ${
                activeStep === 3
                  ? 'bg-[#81b7c2] text-[#08090a] border-[#81b7c2] shadow-[0_0_25px_rgba(129,183,194,0.4)]'
                  : 'bg-[#111416] text-[#8c999c] border-white/10 group-hover:border-white/30'
              }`}
            >
              03
            </div>
            <h4 className="font-space text-lg font-bold text-[#f4f0e8] mt-4">Download Certificate</h4>
            <p className="font-sans text-xs text-[#8c999c] mt-1 max-w-[200px]">Certified Compliance Payload</p>
          </div>
        </div>
      </div>

      {/* Open Interactive Spatial Display View (NO NESTED BOXES) */}
      <div className="max-w-4xl mx-auto pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <span className="font-mono text-xs font-bold text-[#81b7c2] uppercase">ACTIVE PROCESS / 0{activeStep}</span>
          <h3 className="font-space text-2xl font-bold text-[#f4f0e8] mt-2">
            {activeStep === 1 && 'Layer & Geometry Extraction'}
            {activeStep === 2 && 'Bylaw Rule Engine Cross-Check'}
            {activeStep === 3 && 'Structured JSON Certificate Generation'}
          </h3>

          <p className="font-sans text-sm text-[#8c999c] mt-3 leading-relaxed">
            {activeStep === 1 &&
              'Extracts building envelope boundaries, structural column grids, and setback margins automatically from native CAD vector layers.'}
            {activeStep === 2 &&
              'Cross-references extracted measurements against local municipal building codes (BBMP 2026, DCPR 2034, UBBL 2016, NBC 2016).'}
            {activeStep === 3 &&
              'Generates a certified digital audit report with exact clause references, deficiency metrics, and recommended remedies.'}
          </p>
        </div>

        {/* Live Interactive Node Preview */}
        <div className="py-6 px-8 border-l border-white/10 space-y-4">
          {activeStep === 1 && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>FILE NAME:</span>
                <span className="text-[#f4f0e8] font-bold">BBMP_Ground_Floor.dwg</span>
              </div>
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>PARSED LAYERS:</span>
                <span className="text-[#81b7c2] font-bold">14 Vector Layers</span>
              </div>
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>SETBACK LINE:</span>
                <span className="text-[#f26a3d] font-bold">Front Boundary Detected</span>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>BBMP Clause 14.2:</span>
                <span className="badge-high">DEFICIT -1.20m</span>
              </div>
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>NBC Sec 3.2 Gate Span:</span>
                <span className="badge-medium">DEFICIT -1.20m</span>
              </div>
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>Open Space Coverage:</span>
                <span className="badge-low">DEFICIT -4.6%</span>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>AUDIT SCORE:</span>
                <span className="text-[#81b7c2] font-bold text-base">76%</span>
              </div>
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>STATUS:</span>
                <span className="text-[#f4f0e8] font-bold">Conditional Approval</span>
              </div>
              <div className="flex justify-between items-center text-[#8c999c]">
                <span>CERTIFICATE:</span>
                <span className="text-[#81b7c2] font-bold">JSON Payload Ready</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
