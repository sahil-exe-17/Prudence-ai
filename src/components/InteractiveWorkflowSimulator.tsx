import { useState, useEffect, useRef } from 'react';
import { 
  FileCode2, 
  Cpu, 
  FileCheck2, 
  Sparkles, 
  Layers, 
  Crosshair, 
  ChevronRight, 
  ShieldCheck, 
  Zap,
  Activity,
  ArrowDown
} from 'lucide-react';

interface StepData {
  id: 1 | 2 | 3;
  number: string;
  tag: string;
  title: string;
  subtitle: string;
  processTitle: string;
  processDesc: string;
  accentColor: string;
  glowShadow: string;
  borderColor: string;
}

const STEPS: StepData[] = [
  {
    id: 1,
    number: '01',
    tag: 'INPUT & GEOMETRY EXTRACTION',
    title: 'Upload Drawing',
    subtitle: 'DWG, DXF, or Vector PDF',
    processTitle: 'Layer & Geometry Extraction',
    processDesc: 'Extracts building envelope boundaries, structural column grids, and setback margins automatically from native CAD vector layers.',
    accentColor: '#81b7c2',
    glowShadow: 'rgba(129, 183, 194, 0.35)',
    borderColor: 'rgba(129, 183, 194, 0.4)',
  },
  {
    id: 2,
    number: '02',
    tag: 'MULTI-STATUTORY VERIFICATION',
    title: 'AI Bylaw Cross-Check',
    subtitle: 'Setbacks, FSI & Fire Codes',
    processTitle: 'Bylaw Rule Engine Cross-Check',
    processDesc: 'Cross-references extracted measurements against local municipal building codes (BBMP 2026, DCPR 2034, UBBL 2016, NBC 2016).',
    accentColor: '#f26a3d',
    glowShadow: 'rgba(242, 106, 61, 0.35)',
    borderColor: 'rgba(242, 106, 61, 0.4)',
  },
  {
    id: 3,
    number: '03',
    tag: 'OFFICIAL CERTIFICATE GENERATION',
    title: 'Download Certificate',
    subtitle: 'Certified Compliance Payload',
    processTitle: 'Structured JSON Certificate Generation',
    processDesc: 'Generates a certified digital audit report with exact clause references, deficiency metrics, and recommended remedies.',
    accentColor: '#27c93f',
    glowShadow: 'rgba(39, 201, 63, 0.35)',
    borderColor: 'rgba(39, 201, 63, 0.4)',
  },
];

export function InteractiveWorkflowSimulator({ onLaunch }: { onLaunch?: () => void }) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll spy effect: detects when user scrolls down to automatically illuminate and activate steps
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((el, index) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveStep((index + 1) as 1 | 2 | 3);
            }
          });
        },
        {
          rootMargin: '-20% 0px -40% 0px',
          threshold: 0.2,
        }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  // Compute laser line progress percentage down the vertical spine
  const lineProgress = activeStep === 1 ? '16%' : activeStep === 2 ? '50%' : '100%';

  return (
    <div className="py-12 w-full relative">
      {/* Background CAD crosshairs and ambient grid glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-[#81b7c2]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-[#f26a3d]/10 rounded-full blur-3xl" />
      </div>

      {/* Section Subheader */}
      <div className="flex flex-col items-center text-center mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#81b7c2]/10 border border-[#81b7c2]/30 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#81b7c2] animate-pulse" />
          <span className="font-mono text-xs font-bold text-[#81b7c2] uppercase tracking-widest">
            FLUID ENGINEERING TIMELINE
          </span>
        </div>
        <h2 className="font-space text-3xl md:text-5xl font-bold text-[#f4f0e8] mt-1 tracking-tight">
          Three steps from drawing to certified clearance.
        </h2>
        <p className="font-sans text-xs md:text-sm text-[#8c999c] mt-3 max-w-xl">
          Scroll down or click any step to trace the live geometric extraction, statutory cross-check, and automated payload generation.
        </p>
      </div>

      {/* Vertical Animated Timeline Wrapper */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        {/* Continuous Vertical Conduit Laser Spine (Desktop & Tablet) */}
        <div className="absolute left-7 sm:left-10 md:left-12 top-6 bottom-6 w-[2px] bg-white/10 z-0">
          {/* Active glowing animated laser trail */}
          <div
            className="w-full bg-gradient-to-b from-[#81b7c2] via-[#f26a3d] to-[#27c93f] transition-all duration-700 ease-out relative"
            style={{ height: lineProgress }}
          >
            {/* Glowing laser head particle */}
            <div className="absolute -bottom-2 -left-[5px] w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#00f0ff,0_0_20px_#81b7c2] animate-ping opacity-80" />
            <div className="absolute -bottom-1 -left-[3px] w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
          </div>
        </div>

        {/* Timeline Step Items */}
        <div className="space-y-12 sm:space-y-16 relative z-10">
          {STEPS.map((step, idx) => {
            const isActive = activeStep === step.id;
            const isPassed = activeStep > step.id;

            return (
              <div
                key={step.id}
                ref={(el) => (stepRefs.current[idx] = el)}
                onClick={() => setActiveStep(step.id)}
                className={`relative flex items-start gap-6 sm:gap-10 transition-all duration-500 cursor-pointer group ${
                  isActive ? 'opacity-100 translate-x-0' : 'opacity-70 hover:opacity-95'
                }`}
              >
                {/* Step Node Marker on Vertical Spine */}
                <div className="flex-shrink-0 relative mt-1">
                  {/* Outer Pulsing Ring when Active */}
                  {isActive && (
                    <div
                      className="absolute -inset-2 rounded-2xl animate-pulse opacity-60 pointer-events-none"
                      style={{
                        backgroundColor: step.accentColor,
                        filter: 'blur(8px)',
                      }}
                    />
                  )}

                  {/* Node Badge */}
                  <div
                    className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-mono font-bold border transition-all duration-500 backdrop-blur-md ${
                      isActive
                        ? 'text-[#08090a] scale-110 shadow-xl'
                        : isPassed
                        ? 'bg-[#151a1c] text-[#81b7c2] border-[#81b7c2]/40'
                        : 'bg-[#111416] text-[#8c999c] border-white/10 group-hover:border-white/30'
                    }`}
                    style={{
                      backgroundColor: isActive ? step.accentColor : undefined,
                      borderColor: isActive ? step.accentColor : undefined,
                      boxShadow: isActive ? `0 0 25px ${step.glowShadow}` : undefined,
                    }}
                  >
                    <span className="text-sm sm:text-base tracking-tighter">{step.number}</span>
                    <span className="text-[8px] opacity-70 tracking-widest uppercase">
                      {step.id === 1 ? 'CAD' : step.id === 2 ? 'AI' : 'NOC'}
                    </span>
                  </div>
                </div>

                {/* Step Content & Telemetry Panel (Card) */}
                <div
                  className={`flex-1 rounded-2xl border transition-all duration-500 backdrop-blur-md overflow-hidden ${
                    isActive
                      ? 'bg-[#111416]/95 shadow-2xl'
                      : 'bg-[#0d1012]/70 hover:bg-[#111416]/80'
                  }`}
                  style={{
                    borderColor: isActive ? step.borderColor : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: isActive ? `0 10px 30px -10px ${step.glowShadow}` : 'none',
                  }}
                >
                  {/* Top Bar with Step Tag & Coordinates */}
                  <div className="px-5 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: step.accentColor }}
                      />
                      <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#8c999c]">
                        {step.tag}
                      </span>
                    </div>

                    <div className="font-mono text-[10px] text-[#8c999c] hidden sm:flex items-center gap-3">
                      <span className="opacity-60">STATUS:</span>
                      <span
                        className="font-bold"
                        style={{ color: isActive ? step.accentColor : '#8c999c' }}
                      >
                        {isActive ? 'PROCESSING LIVE' : isPassed ? 'VERIFIED ✓' : 'STANDBY'}
                      </span>
                    </div>
                  </div>

                  {/* Main Grid: Info + Live Interactive Process HUD */}
                  <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Left Column: Title, Subtitle, and Process description */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="flex items-center gap-3">
                        {step.id === 1 && <FileCode2 className="w-5 h-5 text-[#81b7c2]" />}
                        {step.id === 2 && <Cpu className="w-5 h-5 text-[#f26a3d]" />}
                        {step.id === 3 && <FileCheck2 className="w-5 h-5 text-[#27c93f]" />}
                        <h3 className="font-space text-xl sm:text-2xl font-bold text-[#f4f0e8]">
                          {step.title}
                        </h3>
                      </div>

                      <p className="font-sans text-xs sm:text-sm font-medium text-[#81b7c2]">
                        {step.subtitle}
                      </p>

                      <div className="pt-2 border-t border-white/5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#8c999c] block mb-1">
                          ACTIVE PROCESS / 0{step.id} — {step.processTitle}
                        </span>
                        <p className="font-sans text-xs sm:text-sm text-[#8c999c] leading-relaxed">
                          {step.processDesc}
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Live Interactive Node Preview HUD */}
                    <div className="lg:col-span-6">
                      <div className="rounded-xl p-4 sm:p-5 bg-[#08090a]/80 border border-white/10 font-mono text-xs space-y-3 relative overflow-hidden group/hud">
                        {/* Subtle corner crosshairs */}
                        <Crosshair className="absolute top-2 right-2 w-3.5 h-3.5 text-white/20" />
                        
                        {/* Step 1 Live HUD */}
                        {step.id === 1 && (
                          <>
                            <div className="flex justify-between items-center text-[#8c999c] pb-2 border-b border-white/5">
                              <span className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-[#81b7c2]" />
                                FILE NAME:
                              </span>
                              <span className="text-[#f4f0e8] font-bold">BBMP_Ground_Floor.dwg</span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c]">
                              <span>PARSED LAYERS:</span>
                              <span className="text-[#81b7c2] font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#81b7c2] animate-ping" />
                                14 Vector Layers
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c]">
                              <span>SETBACK LINE:</span>
                              <span className="text-[#f26a3d] font-bold">Front Boundary Detected</span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c] pt-2 border-t border-white/5 text-[10px]">
                              <span>GEOMETRIC CRS:</span>
                              <span className="text-white/60">EPSG:3857 (Metric Millimeters)</span>
                            </div>
                          </>
                        )}

                        {/* Step 2 Live HUD */}
                        {step.id === 2 && (
                          <>
                            <div className="flex justify-between items-center text-[#8c999c] pb-2 border-b border-white/5">
                              <span className="flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-[#f26a3d]" />
                                BBMP Clause 14.2:
                              </span>
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                                DEFICIT -1.20m
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c]">
                              <span>NBC Sec 3.2 Gate Span:</span>
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                                DEFICIT -1.20m
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c]">
                              <span>Open Space Coverage:</span>
                              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold border border-yellow-500/30">
                                DEFICIT -4.6%
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c] pt-2 border-t border-white/5 text-[10px]">
                              <span>RULE ENGINE ENGINE:</span>
                              <span className="text-[#81b7c2]">Deterministic + Vision Check</span>
                            </div>
                          </>
                        )}

                        {/* Step 3 Live HUD */}
                        {step.id === 3 && (
                          <>
                            <div className="flex justify-between items-center text-[#8c999c] pb-2 border-b border-white/5">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#27c93f]" />
                                AUDIT SCORE:
                              </span>
                              <span className="text-[#27c93f] font-bold text-sm sm:text-base flex items-center gap-1">
                                76%
                                <span className="text-[10px] text-[#8c999c] font-normal">(Verified)</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c]">
                              <span>SANCTION STATUS:</span>
                              <span className="text-[#f4f0e8] font-bold">Conditional Approval</span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c]">
                              <span>CERTIFICATE PAYLOAD:</span>
                              <span className="text-[#81b7c2] font-bold">JSON Payload Ready</span>
                            </div>
                            <div className="flex justify-between items-center text-[#8c999c] pt-2 border-t border-white/5 text-[10px]">
                              <span>SECURITY SIGNATURE:</span>
                              <span className="text-white/60">SHA-256 Verified ✓</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Step Trigger Quick Bar at Bottom */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#8c999c]">EXPLORE STEP:</span>
            <div className="flex gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => setActiveStep(num as 1 | 2 | 3)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${
                    activeStep === num
                      ? 'bg-[#81b7c2] text-[#08090a] shadow-[0_0_15px_rgba(129,183,194,0.4)]'
                      : 'bg-white/5 text-[#8c999c] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  0{num}
                </button>
              ))}
            </div>
          </div>

          <div className="font-mono text-[11px] text-[#8c999c] flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#27c93f] animate-pulse" />
            <span>INTERACTIVE SCROLL & TELEMETRY ENGINE ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

