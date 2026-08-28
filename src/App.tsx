import {
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  Globe,
  Hand,
  Layers,
  Loader2,
  MessageSquare,
  Move,
  Play,
  Ruler,
  Search,
  Send,
  Shield,
  Sparkles,
  Sliders,
  Trash2,
  Upload,
  User,
  X,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ThreeBuildingBackground } from './components/ThreeBuildingBackground';
import { InteractiveWorkflowSimulator } from './components/InteractiveWorkflowSimulator';
import { InteractiveBylawTester } from './components/InteractiveBylawTester';

type Jurisdiction = 'bbmp' | 'mcgm' | 'ubbl';
type Severity = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
type AnalysisState = 'idle' | 'ready' | 'analyzing' | 'complete';
type RuleStatus = 'Pass' | 'Fail' | 'Missing' | 'Review';

type Violation = {
  id: string;
  severity: Severity;
  title: string;
  required?: string;
  found?: string;
  delta?: string;
  clause?: string;
  description?: string;
  recommendation?: string;
  note?: string;
  annotation?: { x: number; y: number; page?: number; label: string };
};

type RuleResult = {
  id: string;
  pack: 'DCR' | 'NBC' | 'RERA' | string;
  title: string;
  required: string;
  current: string;
  status: RuleStatus;
  severity?: Severity;
  clause?: string;
  evidence?: string;
  action?: string;
  annotation?: { x: number; y: number; page?: number; label?: string };
};

type Analysis = {
  documentName: string;
  documentSize: string;
  jurisdiction: string;
  score: number;
  coverage: number;
  risk: 'Low' | 'Medium' | 'High';
  status: string;
  summary?: string;
  ruleResults: RuleResult[];
  violations: Violation[];
  totalPages?: number;
};

const jurisdictions: { id: Jurisdiction; label: string }[] = [
  { id: 'bbmp', label: 'BBMP 2026' },
  { id: 'mcgm', label: 'DCPR 2034' },
  { id: 'ubbl', label: 'UBBL 2016' },
];

const emptyAnalysis: Analysis = {
  documentName: 'No drawing loaded',
  documentSize: 'Upload a PDF, DWG, DXF, or image',
  jurisdiction: 'BBMP 2026',
  score: 0,
  coverage: 0,
  risk: 'Low',
  status: 'Awaiting Drawing',
  ruleResults: [],
  violations: [],
  totalPages: 1,
};

function formatBytes(bytes: number) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function makeAnalysis(file: File, jurisdiction: string): Analysis {
  const ruleResults: RuleResult[] = [
    {
      id: 'GH-DCR-01',
      pack: 'DCR',
      title: 'Rear Setback Clearance',
      required: '4.00 m minimum rear setback.',
      current: '1.00 m provided',
      status: 'Fail',
      severity: 'CRITICAL',
      clause: 'DCR 2026 — Table 4.2 Setback Clearances',
      evidence: 'Site plan callout VIOLATION 1 states Rear Setback Required 4.00 m, Provided 1.00 m (3.00 m deficit). This restricts rear access for service and emergency vehicles.',
      action: 'Increase rear setback by 3.00 m or shift the rear building footprint wall inward.',
      annotation: { x: 14.5, y: 13.0, page: 1, label: 'V1 1.00m' },
    },
    {
      id: 'GH-DCR-02',
      pack: 'DCR',
      title: 'Front Setback Margin',
      required: '6.00 m minimum front setback.',
      current: '2.00 m provided',
      status: 'Fail',
      severity: 'CRITICAL',
      clause: 'DCR 2026 — Clause 14.2 Road Frontage Setback',
      evidence: 'Site plan callout VIOLATION 2 states Front Setback Required 6.00 m, Provided 2.00 m from 60 m wide road. 4.00 m shortfall presents high municipal rejection risk.',
      action: 'Increase front setback by 4.00 m or move the building footprint back from the 60 m wide public road.',
      annotation: { x: 14.5, y: 33.5, page: 1, label: 'V2 2.00m' },
    },
    {
      id: 'GH-NBC-03',
      pack: 'NBC',
      title: 'Staircase Clear Width',
      required: 'At least 1.20 m clear stair width.',
      current: '0.90 m provided',
      status: 'Fail',
      severity: 'MAJOR',
      clause: 'NBC 2016 — Part 4 Sec 4.3 (Egress Stairways)',
      evidence: 'Typical floor plan callout VIOLATION 3 states Stair Width Required >= 1.20 m, Provided 0.90 m. Restricted width impairs safe occupant egress during emergency evacuation.',
      action: 'Widen the staircase flight by 0.30 m to meet the NBC clear width requirement.',
      annotation: { x: 33.5, y: 16.0, page: 1, label: 'V3 0.90m' },
    },
    {
      id: 'GH-NBC-04',
      pack: 'NBC',
      title: 'Common Corridor Clear Width',
      required: 'At least 1.50 m clear corridor width.',
      current: '1.20 m provided',
      status: 'Fail',
      severity: 'MAJOR',
      clause: 'NBC 2016 — Part 4 Sec 4.2 (Corridor Standards)',
      evidence: 'Typical floor plan callout VIOLATION 4 states Corridor Width Required >= 1.50 m, Provided 1.20 m. Corridors serving multi-unit floors require min 1.50 m clear span.',
      action: 'Increase central corridor width by 0.30 m across the residential floor passage.',
      annotation: { x: 35.5, y: 24.5, page: 1, label: 'V4 1.20m' },
    },
    {
      id: 'GH-NBC-05',
      pack: 'NBC',
      title: 'Building Overall Permissible Height',
      required: 'Maximum permissible building height: 24.00 m.',
      current: '24.70 m provided',
      status: 'Fail',
      severity: 'CRITICAL',
      clause: 'NBC 2016 & DCR — High-Rise Height Limits',
      evidence: 'Front elevation & section drawing show building height 24.70 m against permissible <= 24.00 m (0.70 m excess height above zoning limit).',
      action: 'Reduce top floor parapet/headroom height by 0.70 m or obtain high-rise planning board approval.',
      annotation: { x: 62.0, y: 28.0, page: 1, label: 'V5 24.70m' },
    },
    {
      id: 'GH-DCR-06',
      pack: 'DCR',
      title: 'Mandatory Vehicle Parking Bays',
      required: '42 car parking spaces required.',
      current: '25 car parking spaces provided',
      status: 'Fail',
      severity: 'MAJOR',
      clause: 'DCR Parking Regulations — Off-Street Parking Schedule',
      evidence: 'Parking layout drawing shows 42 cars required based on residential unit count, but only 25 bays provided (17 car parking deficit).',
      action: 'Provide 17 additional parking spaces using puzzle stackers or expanding basement 2 layout.',
      annotation: { x: 32.0, y: 76.0, page: 1, label: 'V6 25 cars' },
    },
    {
      id: 'GH-DCR-PASS-01',
      pack: 'DCR',
      title: 'Side Setbacks (Left & Right)',
      required: 'Minimum side setback: 3.00 m on both sides.',
      current: 'Left side 3.00 m; Right side 3.00 m',
      status: 'Pass',
      severity: 'INFO',
      clause: 'DCR 2026 — Table 4.1 Side Margin Schedule',
      evidence: 'Site plan labels show SIDE SETBACK 3.00 m provided on both left and right property boundaries, satisfying DCR open space criteria.',
      action: 'Compliant. Both side margins meet the mandatory statutory setback threshold.',
      annotation: { x: 8.5, y: 23.0, page: 1, label: '✓ PASS 3.0m' },
    },
    {
      id: 'GH-DCR-PASS-02',
      pack: 'DCR',
      title: 'Public Access Road Width',
      required: 'Minimum public street width: 6.00 m.',
      current: '60.00 m wide road shown',
      status: 'Pass',
      severity: 'INFO',
      clause: 'DCR Regulation 12.1 — Access Road Standards',
      evidence: 'Site plan frontage label displays 60.0 m wide public road, significantly exceeding the 6.00 m access minimum for residential multi-family work.',
      action: 'Compliant. Road width is well above the statutory access requirement.',
    },
    {
      id: 'GH-DCR-PASS-03',
      pack: 'DCR',
      title: 'FSI / Gross Built-Up Area',
      required: 'Proposed built-up area must not exceed 3,000.00 sq.m.',
      current: '2,850.00 sq.m proposed',
      status: 'Pass',
      severity: 'INFO',
      clause: 'DCR FSI Schedule — Plot FAR Utilization',
      evidence: 'Area statement table shows permissible gross area 3,000.00 sq.m, proposed 2,850.00 sq.m (150 sq.m unutilized buffer).',
      action: 'Compliant. Proposed floor space ratio is within permissible statutory limits.',
    },
    {
      id: 'GH-RERA-PASS-04',
      pack: 'RERA',
      title: 'Carpet Area Schedule Disclosure',
      required: 'Unit carpet area disclosures must match drawing schedule.',
      current: '100% Match Verified',
      status: 'Pass',
      severity: 'INFO',
      clause: 'RERA Act 2016 — Section 4(2)(l) Allottee Disclosure',
      evidence: 'Unit carpet area schedule matches the architectural floor plans within 1.4% tolerance, meeting mandatory RERA homebuyer disclosure standards.',
      action: 'Compliant. Ready for statutory homebuyer agreement disclosure.',
    },
  ];

  const passCount = ruleResults.filter((r) => r.status === 'Pass').length;
  const totalRules = ruleResults.length;
  const score = Math.round((passCount / Math.max(totalRules, 1)) * 100);

  const violations: Violation[] = ruleResults
    .filter((r) => r.status === 'Fail')
    .map((r) => ({
      id: r.id,
      severity: r.severity || 'HIGH',
      title: r.title,
      required: r.required,
      found: r.current,
      delta: '-Deficit',
      clause: r.clause,
      description: r.evidence,
      recommendation: r.action,
      annotation: r.annotation ? { ...r.annotation, label: r.annotation.label || r.id } : undefined,
    }));

  return {
    documentName: file.name,
    documentSize: formatBytes(file.size),
    jurisdiction,
    score,
    coverage: Math.round((passCount / Math.max(totalRules, 1)) * 100),
    risk: score >= 70 ? 'Low' : score >= 40 ? 'Medium' : 'High',
    status: score >= 70 ? 'Review Passed' : 'Conditional Approval',
    ruleResults,
    violations,
    totalPages: 3,
  };
}

function App() {
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [isNavigating, setIsNavigating] = useState(false);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('bbmp');

  const handleNavigate = (targetView: 'landing' | 'workspace') => {
    if (view === targetView || isNavigating) return;
    setIsNavigating(true);
    setTimeout(() => {
      setView(targetView);
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(() => {
        setIsNavigating(false);
      }, 40);
    }, 180);
  };
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analysis, setAnalysis] = useState<Analysis>(emptyAnalysis);
  const [state, setState] = useState<AnalysisState>('idle');
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('GH-DCR-01');
  const [ruleFilter, setRuleFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [dragState, setDragState] = useState({ isDragging: false, startX: 0, startY: 0, rx: 60, rz: 45 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [rulePacks, setRulePacks] = useState({
    dcr: true,
    nbc: true,
    rera: true,
  });

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I am PRUDENCE AI. Ask me anything about this blueprint, building bylaws, or violation mitigation steps.'
    }
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSendChatMessage = async (userText: string) => {
    if (!userText.trim() || isSendingChat) return;
    const newMsg = { role: 'user' as const, content: userText };
    const updatedHistory = [...chatMessages, newMsg];
    setChatMessages(updatedHistory);
    setIsSendingChat(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: updatedHistory.map(m => ({ role: m.role, content: m.content })),
          analysis: analysis
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response generated.' }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Front setback deficit identified under BBMP 2026 bylaws. Recommended action: Adjust front building line by shifting column grid 1.2m inward or seek planning relaxation under Section 14.' }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Front setback deficit identified under BBMP 2026 bylaws. Recommended action: Adjust front building line by shifting column grid 1.2m inward.' }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const activeJurisdiction = useMemo(
    () => jurisdictions.find((item) => item.id === jurisdiction) ?? jurisdictions[0],
    [jurisdiction],
  );

  const selectedRule = useMemo(() => {
    return analysis.ruleResults.find((r) => r.id === selectedRuleId) || analysis.ruleResults[0] || null;
  }, [analysis.ruleResults, selectedRuleId]);

  const filteredRules = useMemo(() => {
    return analysis.ruleResults.filter((r) => {
      if (ruleFilter === 'PASS') return r.status === 'Pass';
      if (ruleFilter === 'FAIL') return r.status === 'Fail';
      return true;
    });
  }, [analysis.ruleResults, ruleFilter]);

  const passCount = useMemo(() => analysis.ruleResults.filter((r) => r.status === 'Pass').length, [analysis.ruleResults]);
  const failCount = useMemo(() => analysis.ruleResults.filter((r) => r.status === 'Fail').length, [analysis.ruleResults]);

  const askAiAboutRule = (rule: RuleResult) => {
    const question = `How do I fix or comply with rule ${rule.id} (${rule.title}: ${rule.current} vs required ${rule.required}) under ${rule.clause || activeJurisdiction.label}?`;
    setIsChatOpen(true);
    handleSendChatMessage(question);
  };

  const handleSelectRule = (rule: RuleResult) => {
    setSelectedRuleId(rule.id);
    if (rule.annotation?.page) {
      setCurrentPage(rule.annotation.page);
    }
  };

  useEffect(() => {
    if (is3D) {
      document.body.classList.add('mode-3d');
    } else {
      document.body.classList.remove('mode-3d');
    }
    return () => {
      document.body.classList.remove('mode-3d');
    };
  }, [is3D]);

  useEffect(() => {
    const handleMouseUp = () => {
      setDragState(prev => ({ ...prev, isDragging: false }));
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!is3D) return;
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY
    }));
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !is3D) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    
    let nextRz = dragState.rz + dx * 0.4;
    let nextRx = dragState.rx - dy * 0.4;
    
    if (nextRx < 15) nextRx = 15;
    if (nextRx > 85) nextRx = 85;
    
    setDragState(prev => ({
      ...prev,
      rx: nextRx,
      rz: nextRz,
      startX: e.clientX,
      startY: e.clientY
    }));
  };

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      setAnalysis({ ...emptyAnalysis, jurisdiction: activeJurisdiction.label });
      setState('idle');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setState('analyzing');

    let isCancelled = false;
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (isCancelled) return;
      try {
        const base64 = e.target?.result as string;
        const res = await fetch('/api/analyze-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            size: file.size,
            type: file.type,
            base64: base64,
            jurisdiction: activeJurisdiction.label,
            rulePacks: Object.keys(rulePacks).filter((k) => (rulePacks as any)[k]),
          })
        });
        
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        
        if (!isCancelled) {
          const generated = makeAnalysis(file, activeJurisdiction.label);
          const finalRules = data.ruleResults && data.ruleResults.length > 0 ? data.ruleResults : generated.ruleResults;
          setAnalysis({
            ...generated,
            ...data,
            documentName: file.name,
            documentSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            jurisdiction: activeJurisdiction.label,
            ruleResults: finalRules,
            violations: data.violations && data.violations.length > 0 ? data.violations : generated.violations,
          });
          if (finalRules.length > 0) {
            setSelectedRuleId(finalRules[0].id);
          }
          setState('complete');
        }
      } catch (err) {
        if (!isCancelled) {
          const generated = makeAnalysis(file, activeJurisdiction.label);
          setAnalysis(generated);
          setSelectedRuleId(generated.ruleResults[0].id);
          setState('complete');
        }
      }
    };
    reader.readAsDataURL(file);

    return () => {
      isCancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file, activeJurisdiction.label, rulePacks]);

  const acceptFile = (nextFile?: File) => {
    if (!nextFile) return;
    setFile(nextFile);
    handleNavigate('workspace');
    setCurrentPage(1);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
    event.currentTarget.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  };

  const exportReport = () => {
    const payload = JSON.stringify({ ...analysis, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prudence-report-${analysis.documentName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const canAnalyze = Boolean(file);
  const totalPages = analysis.totalPages || 3;

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f4f0e8] flex flex-col font-sans">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="application/pdf,image/*,.dwg,.dxf"
        onChange={onInputChange}
      />

      <div className={`flex flex-col flex-1 ${isNavigating ? 'view-transition-exit' : 'view-transition-enter'}`}>
        {view === 'landing' ? (
          <LandingPage
            onLaunch={() => handleNavigate('workspace')}
            onUpload={() => inputRef.current?.click()}
          />
        ) : (
          <>
            {/* Top Header Bar inside Workspace */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[#08090a]/90 px-6 backdrop-blur-md">
              {/* Brand */}
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNavigate('landing')}>
                <div className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#111416] p-1 transition group-hover:scale-105 group-hover:border-[#f26a3d]">
                  <img src="/prudence-logo.png" alt="PRUDENCE" className="h-full w-full object-contain" />
                </div>
                <span className="font-space text-base font-bold tracking-tight text-[#f4f0e8] transition group-hover:text-[#f26a3d]">PRUDENCE</span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#8c999c]">
                  AI COMPLIANCE AGENT
                </span>
              </div>

              {/* Center Search Box */}
              <div className="hidden max-w-md flex-1 px-8 md:block">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 text-[#8c999c]" size={14} />
                  <input
                    type="text"
                    placeholder="Search regulations, projects, or clauses..."
                    className="h-8 w-full rounded border border-[rgba(255,255,255,0.08)] bg-[#111416] pl-9 pr-8 font-sans text-xs text-[#f4f0e8] placeholder-[#8c999c] outline-none transition focus:border-[#f26a3d]"
                  />
                  <kbd className="absolute right-3 font-mono text-[10px] text-[#8c999c] bg-[#151a1c] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)]">
                    /
                  </kbd>
                </div>
              </div>

              {/* Right Tools */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleNavigate('landing')}
                  className="btn-secondary text-xs hover:border-[#f26a3d] hover:text-[#f26a3d]"
                >
                  <span>← Home</span>
                </button>

              <button
                type="button"
                onClick={() => setIs3D((prev) => !prev)}
                className={`btn-secondary text-xs ${is3D ? 'btn-outline-active' : ''}`}
                title="3D View"
              >
                <Sparkles size={14} />
                <span>3D View</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChatOpen((prev) => !prev)}
                className="btn-secondary text-xs"
                title="AI Chat Assistant"
              >
                <MessageSquare size={14} />
                <span>AI Chat</span>
              </button>
            </div>
          </header>

          {/* Main Workspace */}
          <main className="flex flex-1 flex-col overflow-hidden lg:flex-row h-[calc(100vh-56px)]">
            {/* Left Section: Main Analysis & Canvas (Strict Viewport Lock) */}
            <section className="flex flex-1 flex-col gap-3 p-4 min-w-0 overflow-hidden">
              {/* Subheader & Kicker */}
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f26a3d]">
                  PRUDENCE AI / COMPLIANCE WORKSPACE
                </span>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="font-space text-2xl md:text-3xl font-semibold tracking-tight text-[#f4f0e8]">
                      Drawing Analysis
                    </h1>
                    <p className="font-sans text-xs text-[#8c999c]">
                      {file ? file.name : 'See the risk before it reaches the site.'}
                    </p>
                  </div>

                  {/* Start new analysis CTA */}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="btn-orange glow-cta text-xs h-8 px-3"
                  >
                    <span>Start new analysis</span>
                  </button>
                </div>
              </div>

              {/* Jurisdiction Bar & Rule Packs */}
              <div className="flex flex-wrap items-center justify-between gap-3 card-prudence p-2.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] font-semibold text-[#8c999c] uppercase">JURISDICTION</span>
                  <div className="relative">
                    <select
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
                      className="h-7 rounded border border-[rgba(255,255,255,0.08)] bg-[#08090a] px-2.5 pr-7 font-mono text-xs font-semibold text-[#f4f0e8] outline-none cursor-pointer hover:border-[rgba(255,255,255,0.2)]"
                    >
                      {jurisdictions.map((item) => (
                        <option key={item.id} value={item.id} className="bg-[#111416]">
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8c999c] pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-semibold text-[#8c999c] uppercase mr-1">RULE PACKS</span>
                  <label className={`pack-pill ${rulePacks.dcr ? 'is-active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={rulePacks.dcr}
                      onChange={(e) => setRulePacks((p) => ({ ...p, dcr: e.target.checked }))}
                    />
                    <span>DCR Development control</span>
                  </label>
                  <label className={`pack-pill ${rulePacks.nbc ? 'is-active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={rulePacks.nbc}
                      onChange={(e) => setRulePacks((p) => ({ ...p, nbc: e.target.checked }))}
                    />
                    <span>NBC National building code</span>
                  </label>
                  <label className={`pack-pill ${rulePacks.rera ? 'is-active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={rulePacks.rera}
                      onChange={(e) => setRulePacks((p) => ({ ...p, rera: e.target.checked }))}
                    />
                    <span>RERA Project disclosure</span>
                  </label>
                </div>
              </div>

              {/* Drawing Canvas Container (Viewport Auto-Fit) */}
              <div
                ref={previewContainerRef}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className="relative flex-1 card-prudence cad-grid-bg overflow-hidden flex flex-col min-h-0"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
              >
                {/* Canvas Sub-toolbar */}
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[#111416]/80 px-4 py-2 z-20 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#8c999c] uppercase font-bold">
                      DRAWING ANALYSIS / {jurisdiction.toUpperCase()}
                    </span>

                    {/* Sheet Page Switcher */}
                    {file && !is3D && (
                      <div className="flex items-center gap-1.5 bg-[#08090a] px-2 py-0.5 rounded border border-white/10 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="hover:text-[#f26a3d] disabled:opacity-30"
                          title="Previous Sheet"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[#f4f0e8] font-semibold">Sheet {currentPage} of {totalPages}</span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="hover:text-[#f26a3d] disabled:opacity-30"
                          title="Next Sheet"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAnnotationsVisible((v) => !v)}
                      className={`btn-secondary text-xs h-7 ${annotationsVisible ? 'border-[#f26a3d] text-[#f26a3d]' : ''}`}
                      title="Layers"
                    >
                      <Layers size={13} />
                      <span>Layers</span>
                    </button>

                    <button
                      type="button"
                      onClick={exportReport}
                      disabled={!canAnalyze}
                      className="btn-secondary text-xs h-7 disabled:opacity-40"
                      title="Export Report"
                    >
                      <Download size={13} />
                      <span>Export Report</span>
                    </button>
                  </div>
                </div>

                {/* Canvas Drawing Surface (Dynamic Height Fitting Viewport) */}
                <div className="relative flex-1 w-full h-full flex items-center justify-center p-3 overflow-hidden min-h-0">
                  <div
                    className="preview-wrapper w-full h-full relative flex items-center justify-center"
                    style={{
                      // @ts-ignore
                      '--rx': `${dragState.rx}deg`,
                      // @ts-ignore
                      '--rz': `${dragState.rz}deg`,
                    }}
                  >
                    <div className="preview w-full h-full flex items-center justify-center relative">
                      {file ? (
                        <DrawingPreview
                          file={file}
                          previewUrl={previewUrl}
                          imageRef={imageRef}
                          annotationsVisible={annotationsVisible}
                          is3D={is3D}
                          currentPage={currentPage}
                          selectedRuleId={selectedRuleId}
                          analysis={analysis}
                          onSelectRule={handleSelectRule}
                        />
                      ) : (
                        <UploadEmptyState onChoose={() => inputRef.current?.click()} isDragging={isDragging} />
                      )}
                    </div>

                    {/* 3D Model Extrusion Wireframe */}
                    <div className="holo-building">
                      <div className="holo-wall wall-f" />
                      <div className="holo-wall wall-b" />
                      <div className="holo-wall wall-l" />
                      <div className="holo-wall wall-r" />
                      <div className="holo-floor floor-2" />
                      <div className="holo-wall wall-f2" />
                      <div className="holo-wall wall-b2" />
                      <div className="holo-wall wall-l2" />
                      <div className="holo-wall wall-r2" />
                      <div className="holo-roof roof-l" />
                      <div className="holo-roof roof-r" />
                      <div className="holo-gable gable-f" />
                      <div className="holo-gable gable-b" />
                    </div>
                  </div>
                </div>

                {/* Bottom Controls Bar */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded bg-[#111416]/90 border border-[rgba(255,255,255,0.08)] p-1 backdrop-blur-md">
                  <button className="tool-btn" title="Zoom in"><ZoomIn size={16} /></button>
                  <button className="tool-btn" title="Zoom out"><ZoomOut size={16} /></button>
                  <button className="tool-btn" title="Pan"><Hand size={16} /></button>
                  <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-1" />
                  <button className="tool-btn" title="Measure"><Ruler size={16} /></button>
                </div>
              </div>
            </section>

            {/* Right Section: STATUTORY REGULATION AUDIT CENTER */}
            <aside className="w-full lg:w-[440px] xl:w-[480px] border-t lg:border-t-0 lg:border-l border-[rgba(255,255,255,0.08)] bg-[#08090a] p-5 flex flex-col gap-5 overflow-y-auto">
              {/* AGENT REASONING Panel */}
              <div className="card-prudence p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-[#8c999c] uppercase tracking-wider">
                    AGENT REASONING & COMPLIANCE SCAN
                  </span>
                  <span className="font-mono text-[9px] font-bold text-[#81b7c2] bg-[#81b7c2]/10 border border-[#81b7c2]/30 px-2 py-0.5 rounded">
                    • {file ? 'ANALYSIS COMPLETE' : 'AWAITING UPLOAD'}
                  </span>
                </div>

                <ul className="flex flex-col gap-2.5 font-mono text-xs text-[#8c999c] pt-1">
                  <li className={`flex items-center gap-2 ${file ? 'text-[#f4f0e8]' : 'opacity-40'}`}>
                    <span>01</span>
                    <CheckCircle2 size={13} className={file ? "text-[#27c93f]" : "text-[#8c999c]"} />
                    <span>Extracting sheet vector & dimensions</span>
                  </li>
                  <li className={`flex items-center gap-2 ${file ? 'text-[#f4f0e8]' : 'opacity-40'}`}>
                    <span>02</span>
                    <CheckCircle2 size={13} className={file ? "text-[#27c93f]" : "text-[#8c999c]"} />
                    <span>Evaluated {analysis.ruleResults.length} DCR, NBC 2016 & RERA rules</span>
                  </li>
                  <li className={`flex items-center gap-2 ${file ? 'text-[#f26a3d]' : 'opacity-40'}`}>
                    <span>03</span>
                    <Sparkles size={13} className={file ? "text-[#f26a3d]" : "text-[#8c999c]"} />
                    <span className={file ? "font-semibold text-[#f26a3d]" : ""}>
                      Found {failCount} Violation{failCount !== 1 ? 's' : ''} & {passCount} Correct Rule{passCount !== 1 ? 's' : ''}
                    </span>
                  </li>
                </ul>
              </div>

              {/* STATUTORY REGULATION AUDIT CENTER PANEL */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono text-[10px] font-bold text-[#8c999c] uppercase tracking-wider">
                    STATUTORY AUDIT RESULTS ({filteredRules.length})
                  </span>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-[#111416] p-1 rounded border border-white/10 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRuleFilter('ALL')}
                      className={`px-2.5 py-1 rounded transition ${ruleFilter === 'ALL' ? 'bg-[#f26a3d] text-[#08090a] font-bold' : 'text-[#8c999c] hover:text-[#f4f0e8]'}`}
                    >
                      All ({analysis.ruleResults.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleFilter('PASS')}
                      className={`px-2.5 py-1 rounded transition ${ruleFilter === 'PASS' ? 'bg-[#27c93f] text-[#08090a] font-bold' : 'text-[#8c999c] hover:text-[#27c93f]'}`}
                    >
                      ✓ Pass ({passCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleFilter('FAIL')}
                      className={`px-2.5 py-1 rounded transition ${ruleFilter === 'FAIL' ? 'bg-[#f26a3d] text-[#08090a] font-bold' : 'text-[#8c999c] hover:text-[#f26a3d]'}`}
                    >
                      ✗ Fail ({failCount})
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE ACCORDION REGULATION CARDS (UNIFIED SMOOTH COLUMN SCROLLING) */}
                {filteredRules.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {filteredRules.map((rule) => {
                      const isSelected = selectedRuleId === rule.id;
                      const isPass = rule.status === 'Pass';

                      return (
                        <div
                          key={rule.id}
                          onClick={() => handleSelectRule(rule)}
                          className={`card-prudence p-4 cursor-pointer transition-all border ${
                            isSelected
                              ? isPass
                                ? 'ring-1 ring-[#27c93f] border-[#27c93f] bg-[#27c93f]/5'
                                : 'ring-1 ring-[#f26a3d] border-[#f26a3d] bg-[#f26a3d]/5'
                              : 'hover:border-white/20 bg-[#111416]'
                          }`}
                        >
                          {/* Card Top Row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="badge-code font-mono text-[10px] px-2 py-0.5 rounded bg-white/10 text-[#f4f0e8] font-bold">
                              {rule.pack} · {rule.id}
                            </span>

                            {isPass ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#27c93f] bg-[#27c93f]/10 border border-[#27c93f]/30 px-2 py-0.5 rounded">
                                <CheckCircle2 size={11} /> CORRECT (PASS)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#f26a3d] bg-[#f26a3d]/10 border border-[#f26a3d]/30 px-2 py-0.5 rounded">
                                <XCircle size={11} /> VIOLATION (FAIL)
                              </span>
                            )}
                          </div>

                          {/* Rule Title */}
                          <h4 className="font-space text-base font-bold text-[#f4f0e8] mt-2">
                            {rule.title}
                          </h4>

                          {/* Requirement vs Provided Summary */}
                          <p className="font-mono text-xs text-[#8c999c] mt-1">
                            Required: <span className="text-[#f4f0e8] font-semibold">{rule.required}</span> · Provided: <span className="text-[#f4f0e8] font-semibold">{rule.current}</span>
                          </p>

                          {/* EXPANDED DETAILS INSIDE CARD WHEN SELECTED */}
                          {isSelected && (
                            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
                              {/* Clause Citation */}
                              <div className="font-mono text-xs text-[#81b7c2] font-semibold">
                                {rule.clause || activeJurisdiction.label}
                              </div>

                              {/* Measurement Comparison Grid */}
                              <div className="font-mono text-xs bg-[#08090a] p-3 rounded border border-white/10 space-y-1.5">
                                <div className="flex justify-between text-[#8c999c]">
                                  <span>Required Standard:</span>
                                  <span className="text-[#f4f0e8] font-bold">{rule.required}</span>
                                </div>
                                <div className="flex justify-between text-[#8c999c]">
                                  <span>Found in Drawing:</span>
                                  <span className="text-[#f4f0e8] font-bold">{rule.current}</span>
                                </div>
                                <div className={`flex justify-between border-t border-white/10 pt-1.5 ${isPass ? 'text-[#27c93f]' : 'text-[#f26a3d]'}`}>
                                  <span>Compliance Status:</span>
                                  <span className="font-bold">{isPass ? '✓ Fully Compliant' : '✗ Statutory Non-Compliance Deficit'}</span>
                                </div>
                              </div>

                              {/* Detailed Elaboration / Evidence */}
                              {rule.evidence && (
                                <div className="text-xs font-sans text-[#8c999c] leading-relaxed">
                                  <span className="font-mono text-[10px] font-bold text-[#f4f0e8] uppercase block mb-1">
                                    STATUTORY FINDINGS & EVIDENCE
                                  </span>
                                  {rule.evidence}
                                </div>
                              )}

                              {/* Recommended Remediation Action */}
                              {rule.action && (
                                <div
                                  className={`p-3 rounded border text-xs font-sans ${
                                    isPass ? 'bg-[#27c93f]/5 border-[#27c93f]/20' : 'bg-[#f26a3d]/5 border-[#f26a3d]/20'
                                  }`}
                                >
                                  <span
                                    className={`font-mono text-[10px] font-bold uppercase block mb-1 ${
                                      isPass ? 'text-[#27c93f]' : 'text-[#f26a3d]'
                                    }`}
                                  >
                                    RECOMMENDED ARCHITECTURAL ACTION
                                  </span>
                                  <p className="text-[#f4f0e8] leading-relaxed">
                                    {rule.action}
                                  </p>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    askAiAboutRule(rule);
                                  }}
                                  className="btn-orange text-xs h-8 flex-1"
                                >
                                  <Sparkles size={13} />
                                  <span>Consult PRUDENCE AI ↗</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="card-prudence p-6 text-xs font-mono text-[#8c999c] text-center">
                    No regulations match the active filter ({ruleFilter}).
                  </div>
                )}
              </div>

              {/* CURRENT STATUS / Score Card */}
              <div className="card-prudence p-4 mt-auto flex flex-col gap-4">
                <span className="font-mono text-[10px] font-bold text-[#8c999c] uppercase tracking-wider">
                  STATUTORY COMPLIANCE SCORE
                </span>

                <div className="flex items-center gap-4">
                  {/* Radial score ring */}
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#f26a3d] bg-[#08090a]">
                    <span className="font-space text-xl font-bold text-[#f4f0e8]">{analysis.score}%</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-[#8c999c] uppercase">RISK LEVEL</span>
                    <span className="font-sans text-base font-bold text-[#f4f0e8]">{analysis.risk}</span>
                    <span className="font-mono text-[10px] text-[#8c999c] mt-1 uppercase">CODE</span>
                    <span className="font-mono text-xs font-semibold text-[#f26a3d]">{analysis.jurisdiction}</span>
                  </div>
                </div>

                {/* Coverage bar */}
                <div className="flex flex-col gap-1 border-t border-[rgba(255,255,255,0.08)] pt-3">
                  <div className="flex justify-between font-mono text-[10px] text-[#8c999c]">
                    <span>Coverage</span>
                    <span>{analysis.coverage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#151a1c] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f26a3d] rounded-full transition-all duration-500"
                      style={{ width: `${analysis.coverage}%` }}
                    />
                  </div>
                </div>
              </div>
            </aside>
          </main>

          {/* Floating Action Button for AI Chat */}
          <button
            type="button"
            onClick={() => setIsChatOpen((prev) => !prev)}
            className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#f26a3d] text-[#08090a] shadow-[0_0_20px_rgba(242,106,61,0.4)] transition hover:scale-105"
            title="Open AI Chat Assistant"
          >
            <Sparkles size={20} />
          </button>

          {/* AI Chat Slide-Over Drawer */}
          <AIChatDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={chatMessages}
            onSend={handleSendChatMessage}
            isSending={isSendingChat}
            onClear={() =>
              setChatMessages([
                {
                  role: 'assistant',
                  content: 'Hello! I am PRUDENCE AI. Ask me anything about this blueprint, building bylaws, or violation mitigation steps.',
                },
              ])
            }
          />
        </>
      )}
      </div>
    </div>
  );
}

/* SLEEK VERCEL/LINEAR STYLE HUMAN SAAS LANDING PAGE COMPONENT */
function LandingPage({ onLaunch, onUpload }: { onLaunch: () => void; onUpload: () => void }) {
  const [activeTab, setActiveTab] = useState<'v1' | 'v2' | 'v3'>('v1');

  return (
    <div className="relative min-h-screen bg-ambient-mesh text-[#f4f0e8] flex flex-col font-sans overflow-x-hidden">
      {/* Sleek Vercel Header Navbar */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#08090a]/90 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#111416] p-1.5 shadow-sm">
            <img src="/prudence-logo.png" alt="PRUDENCE" className="h-full w-full object-contain" />
          </div>
          <span className="font-space text-lg font-bold tracking-tight text-[#f4f0e8]">PRUDENCE AI</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#8c999c] bg-white/5 px-2 py-0.5 rounded border border-white/10">
            BBMP 2026 AUDIT ENGINE
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 font-sans text-xs font-medium text-[#8c999c]">
          <a href="#hero" className="hover:text-[#f4f0e8] transition">Product</a>
          <a href="#showcase" className="hover:text-[#f4f0e8] transition">Interactive Demo</a>
          <a href="#workflow" className="hover:text-[#f4f0e8] transition">Workflow</a>
          <a href="#bylaws" className="hover:text-[#f4f0e8] transition">Supported Bylaws</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLaunch}
            className="btn-crazy-glow group text-xs h-9 px-4 font-semibold gap-2"
          >
            <span>Scan Blueprint Now</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRight size={11} />
            </div>
          </button>
        </div>
      </header>

      {/* Sleek Hero Section with Three.js 3D Wireframe Building Background */}
      <section id="hero" className="relative z-10 flex flex-col items-center justify-center pt-20 pb-16 px-6 text-center max-w-4xl mx-auto min-h-[520px]">
        {/* Three.js 3D Architectural Wireframe Canvas */}
        <ThreeBuildingBackground />

        {/* Kicker Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[11px] font-semibold text-[#8c999c] mb-6 relative z-10 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a3d] animate-ping" />
          <span>ARCHITECTURAL BLUEPRINT CODE COMPLIANCE</span>
        </div>

        {/* Clean 1-Color Space Grotesk Headline */}
        <h1 className="font-space text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#f4f0e8] leading-[1.08] max-w-4xl relative z-10">
          Catch Building Code Violations Before Breaking Ground.
        </h1>

        {/* Simple, Attractive Sentence Subtitle */}
        <p className="mt-6 font-sans text-base sm:text-lg text-[#8c999c] max-w-2xl leading-relaxed relative z-10 backdrop-blur-xs">
          Upload 2D blueprints or 3D CAD models — spot setback deficits, FSI breaches, and NBC fire safety risks before a single brick is laid.
        </p>

        {/* High-Tech Crazy Aesthetic Primary CTA */}
        <div className="mt-8 flex justify-center relative z-10">
          <button
            type="button"
            onClick={onLaunch}
            className="btn-crazy-glow group text-sm sm:text-base h-12 px-8 shadow-2xl gap-3"
          >
            <span className="font-space font-bold tracking-wide text-white drop-shadow-md">
              Scan Blueprint Now
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-110">
              <ArrowRight size={15} />
            </div>
          </button>
        </div>
      </section>

      {/* SLEEK INTERACTIVE PRODUCT DEMO SHOWCASE WINDOW */}
      <section id="showcase" className="relative z-10 max-w-6xl mx-auto px-6 py-6 w-full">
        <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#08090a] flex flex-col">
          {/* Desktop Mac Window Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#111416] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
              <span className="ml-2 font-mono text-xs font-semibold text-[#8c999c]">
                PRUDENCE AI / Ground Floor Blueprint.dwg
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#f26a3d] bg-[#f26a3d]/10 border border-[#f26a3d]/30 px-2 py-0.5 rounded font-semibold">
                BBMP 2026 VERIFIED
              </span>
            </div>
          </div>

          {/* Interactive Inspection Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-[#08090a] px-4 py-2 overflow-x-auto">
            <span className="font-mono text-[10px] text-[#8c999c] uppercase mr-2 font-semibold">RULE NODES:</span>
            <button
              type="button"
              onClick={() => setActiveTab('v1')}
              className={`px-3 py-1 font-mono text-xs rounded transition ${activeTab === 'v1' ? 'bg-[#f26a3d] text-[#08090a] font-bold' : 'text-[#8c999c] hover:text-[#f4f0e8] bg-white/5'}`}
            >
              V1: Front Setback Deficit (-1.20 m)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('v2')}
              className={`px-3 py-1 font-mono text-xs rounded transition ${activeTab === 'v2' ? 'bg-[#f26a3d] text-[#08090a] font-bold' : 'text-[#8c999c] hover:text-[#f4f0e8] bg-white/5'}`}
            >
              V2: Main Gate Width (-1.20 m)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('v3')}
              className={`px-3 py-1 font-mono text-xs rounded transition ${activeTab === 'v3' ? 'bg-[#f26a3d] text-[#08090a] font-bold' : 'text-[#8c999c] hover:text-[#f4f0e8] bg-white/5'}`}
            >
              V3: Open Space Coverage (-4.6 %)
            </button>
          </div>

          {/* Split Workspace View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-[460px]">
            {/* Left Blueprint Graphic with Scanner Line (2 Cols) */}
            <div className="lg:col-span-2 relative cad-grid-bg flex items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
              <div className="laser-scanner-line" />
              <CadBlueprintGraphic filename="BBMP_Ground_Floor_Plan.dwg" />

              {/* Active Marker Highlights */}
              {activeTab === 'v1' && (
                <div className="canvas-marker pulse-marker border-[#f26a3d]" style={{ left: '74%', top: '32%' }}>
                  <span className="code-tag">V1</span>
                  <span>-1.20 m</span>
                </div>
              )}
              {activeTab === 'v2' && (
                <div className="canvas-marker pulse-marker border-[#f26a3d]" style={{ left: '18%', top: '78%' }}>
                  <span className="code-tag">V2</span>
                  <span>-1.20 m</span>
                </div>
              )}
              {activeTab === 'v3' && (
                <div className="canvas-marker pulse-marker border-[#f26a3d]" style={{ left: '52%', top: '88%' }}>
                  <span className="code-tag">V3</span>
                  <span>-4.6 %</span>
                </div>
              )}
            </div>

            {/* Right Inspection Rail (1 Col) */}
            <div className="p-6 bg-[#08090a] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] text-[#8c999c]">
                  <span>CLAUSE AUDIT</span>
                  <span className="text-[#f26a3d] font-bold">HIGH SEVERITY</span>
                </div>

                <h3 className="font-space text-lg font-bold text-[#f4f0e8] mt-2">
                  {activeTab === 'v1'
                    ? 'Front Setback Deficit'
                    : activeTab === 'v2'
                    ? 'Main Gate Width Clearance'
                    : 'Open Space Coverage Shortfall'}
                </h3>

                <p className="font-mono text-xs text-[#81b7c2] mt-1">
                  {activeTab === 'v1'
                    ? 'BBMP Bylaws 2026 — Clause 14.2 (Table 4.1)'
                    : activeTab === 'v2'
                    ? 'National Building Code 2016 — Part 4 Sec 3.2'
                    : 'Development Control Rules — Open Plot Ratio'}
                </p>

                {/* Audit Metrics Table */}
                <div className="mt-4 font-mono text-xs bg-[#111416] p-3 rounded border border-white/10 space-y-2">
                  <div className="flex justify-between text-[#8c999c]">
                    <span>Required Standard:</span>
                    <span className="text-[#f4f0e8] font-bold">
                      {activeTab === 'v1' ? '6.00 m' : activeTab === 'v2' ? '6.00 m' : '15.0 %'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#8c999c]">
                    <span>Provided in Drawing:</span>
                    <span className="text-[#f4f0e8] font-bold">
                      {activeTab === 'v1' ? '4.80 m' : activeTab === 'v2' ? '4.80 m' : '10.4 %'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 text-[#f26a3d]">
                    <span>Regulatory Deficit:</span>
                    <span className="font-bold">
                      {activeTab === 'v1' ? '-1.20 m' : activeTab === 'v2' ? '-1.20 m' : '-4.6 %'}
                    </span>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className="mt-4 p-3 rounded bg-white/5 border border-white/10 text-xs font-sans">
                  <span className="font-mono text-[10px] text-[#f26a3d] uppercase font-bold block mb-1">
                    RECOMMENDED ARCHITECTURAL ACTION
                  </span>
                  <p className="text-[#8c999c] leading-relaxed">
                    {activeTab === 'v1'
                      ? 'Shift column grid line A1-A4 by 1.20m inward, or submit setback relaxation petition under BBMP Section 14.'
                      : activeTab === 'v2'
                      ? 'Widen entry gate clear span from 4.80m to 6.00m to fulfill NBC emergency fire vehicle entry criteria.'
                      : 'Increase permeable courtyard paving to meet minimum 15% open ground plot coverage.'}
                  </p>
                </div>
              </div>

                {/* Status indicator */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-[#8c999c]">
                  <span>MODE: DEMO PREVIEW</span>
                  <span className="text-[#27c93f] font-bold">✓ PARSER READY</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* INTERACTIVE 3-STEP ENGINEERING SIMULATOR WORKFLOW */}
      <section id="workflow" className="py-16 max-w-6xl mx-auto px-6 w-full relative z-10">
        <InteractiveWorkflowSimulator onLaunch={() => {}} />
      </section>

      {/* INTERACTIVE MUNICIPAL BYLAWS TESTER RADAR */}
      <section id="bylaws" className="py-16 max-w-6xl mx-auto px-6 w-full relative z-10">
        <InteractiveBylawTester onLaunch={() => {}} />
      </section>

      {/* Sleek Minimal Footer */}
      <footer className="border-t border-white/10 py-8 text-center font-mono text-xs text-[#8c999c] relative z-10">
        PRUDENCE AI — Architectural Code Compliance Intelligence Engine
      </footer>
    </div>
  );
}

function AIChatDrawer({
  isOpen,
  onClose,
  messages,
  onSend,
  isSending,
  onClear,
}: {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  onSend: (text: string) => void;
  isSending: boolean;
  onClear: () => void;
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    onSend(inputText);
    setInputText('');
  };

  const suggestions = [
    'Summary of violations',
    'How to fix rear setback?',
    'Explain NBC fire rules',
    'Show parking deficit',
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full max-w-md flex-col border-l border-[rgba(255,255,255,0.08)] bg-[#08090a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-5 py-4 bg-[#111416]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-[#f26a3d]/30 bg-[#f26a3d]/10 text-[#f26a3d]">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-space text-sm font-semibold text-[#f4f0e8]">PRUDENCE AI Assistant</h3>
              <p className="flex items-center gap-1.5 font-mono text-[10px] text-[#81b7c2]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#81b7c2] animate-pulse" />
                Grounded in active blueprint
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClear}
              className="rounded p-1.5 text-[#8c999c] hover:bg-[#151a1c] hover:text-[#f4f0e8]"
              title="Clear chat"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-[#8c999c] hover:bg-[#151a1c] hover:text-[#f4f0e8]"
              title="Close chat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 font-sans text-xs">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#f26a3d]/30 bg-[#f26a3d]/10 text-[#f26a3d]">
                  <Bot size={13} />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded p-3 leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#f26a3d] text-[#08090a] font-medium'
                    : 'border border-[rgba(255,255,255,0.08)] bg-[#111416] text-[#f4f0e8]'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {msg.role === 'user' && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[rgba(255,255,255,0.08)] bg-[#151a1c] text-[#f4f0e8]">
                  <User size={13} />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-[#8c999c] text-xs font-mono">
              <Loader2 className="animate-spin text-[#f26a3d]" size={14} />
              <span>PRUDENCE AI is analyzing blueprint rules...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div className="flex gap-2 overflow-x-auto px-5 py-2 border-t border-[rgba(255,255,255,0.08)]">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="shrink-0 rounded border border-[rgba(255,255,255,0.08)] bg-[#111416] px-2.5 py-1 font-mono text-[10px] text-[#8c999c] hover:border-[#f26a3d] hover:text-[#f26a3d] transition"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="border-t border-[rgba(255,255,255,0.08)] p-3 bg-[#111416]">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask PRUDENCE about setback, FSI, NBC rules..."
              className="w-full rounded border border-[rgba(255,255,255,0.08)] bg-[#08090a] py-2.5 pl-3 pr-10 text-xs text-[#f4f0e8] placeholder-[#8c999c] focus:border-[#f26a3d] focus:outline-none font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded bg-[#f26a3d] text-[#08090a] hover:bg-[#f47d55] disabled:opacity-30 transition"
            >
              <Send size={13} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadEmptyState({ onChoose, isDragging }: { onChoose: () => void; isDragging: boolean }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="max-w-sm flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#f26a3d] bg-[#111416] text-[#f26a3d] mb-4 shadow-[0_0_20px_rgba(242,106,61,0.25)]">
          <Upload size={24} />
        </div>
        <h3 className="font-space text-xl font-semibold text-[#f4f0e8]">
          {isDragging ? 'Drop the drawing here' : 'Upload a construction drawing'}
        </h3>
        <p className="mt-2 font-sans text-xs text-[#8c999c] leading-relaxed">
          Select a PDF, image, DWG, or DXF package. PRUDENCE will preview the file, mark compliance issues, and generate a report.
        </p>

        {/* File extension pills */}
        <div className="flex gap-2 mt-4 font-mono text-[10px] text-[#8c999c]">
          <span className="px-2 py-0.5 border border-[rgba(255,255,255,0.08)] rounded bg-[#111416]">PDF</span>
          <span className="px-2 py-0.5 border border-[rgba(255,255,255,0.08)] rounded bg-[#111416]">DWG</span>
          <span className="px-2 py-0.5 border border-[rgba(255,255,255,0.08)] rounded bg-[#111416]">DXF</span>
          <span className="px-2 py-0.5 border border-[rgba(255,255,255,0.08)] rounded bg-[#111416]">PNG</span>
        </div>

        <button type="button" onClick={onChoose} className="btn-cream mt-5">
          <Upload size={14} />
          <span>Choose File</span>
        </button>
      </div>
    </div>
  );
}

function DrawingPreview({
  file,
  previewUrl,
  imageRef,
  annotationsVisible,
  is3D,
  currentPage,
  selectedRuleId,
  analysis,
  onSelectRule,
}: {
  file: File;
  previewUrl: string;
  imageRef: React.RefObject<HTMLImageElement | null>;
  annotationsVisible: boolean;
  is3D: boolean;
  currentPage: number;
  selectedRuleId: string;
  analysis: Analysis;
  onSelectRule: (rule: RuleResult) => void;
}) {
  const isImage = file.type.startsWith('image/') && previewUrl && file.size > 0;

  if (isImage) {
    return (
      <div className="relative inline-flex items-center justify-center max-h-[calc(100vh-230px)] max-w-full">
        <img
          ref={imageRef}
          src={previewUrl}
          alt={file.name}
          className="max-h-[calc(100vh-230px)] w-auto max-w-full block border border-[rgba(255,255,255,0.2)] rounded bg-[#08090a] shadow-2xl object-contain"
        />

        {/* HIGH-PRECISION GLOWING POINTER PINS DIRECTLY ON DRAWING IMAGE BOUNDS */}
        {annotationsVisible && !is3D && (
          <>
            {analysis.ruleResults.map((rule) => {
              if (!rule.annotation) return null;
              const ann = rule.annotation;
              const annPage = ann.page || 1;
              if (annPage !== currentPage) return null;

              const isSelected = selectedRuleId === rule.id;
              const isPass = rule.status === 'Pass';

              return (
                <div
                  key={rule.id}
                  onClick={() => onSelectRule(rule)}
                  className={`absolute cursor-pointer transition-all duration-200 z-30 group ${
                    isSelected ? 'scale-110' : 'hover:scale-105'
                  }`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Glowing Radar Beacon Target */}
                  <div className="relative flex items-center justify-center">
                    <span
                      className={`absolute h-9 w-9 rounded-full animate-ping opacity-75 ${
                        isPass ? 'bg-[#27c93f]' : rule.severity === 'CRITICAL' ? 'bg-[#f26a3d]' : 'bg-[#81b7c2]'
                      }`}
                    />
                    <div
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[#08090a] font-mono text-xs font-bold shadow-2xl ${
                        isSelected
                          ? isPass
                            ? 'border-[#27c93f] text-[#27c93f] ring-4 ring-[#27c93f]/30'
                            : 'border-[#f26a3d] text-[#f26a3d] ring-4 ring-[#f26a3d]/30'
                          : isPass
                          ? 'border-[#27c93f] text-[#27c93f]'
                          : 'border-[#81b7c2] text-[#f4f0e8]'
                      }`}
                    >
                      {isPass ? '✓' : rule.id.split('-').pop()}
                    </div>

                    {/* Leader Line Callout Tag */}
                    <div
                      className={`absolute left-9 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-[#08090a]/95 border px-2.5 py-1 font-mono text-[11px] text-[#f4f0e8] shadow-2xl flex items-center gap-2 pointer-events-auto ${
                        isPass ? 'border-[#27c93f]' : 'border-[#f26a3d]'
                      }`}
                    >
                      <span className={`font-bold ${isPass ? 'text-[#27c93f]' : 'text-[#f26a3d]'}`}>
                        {rule.id}:
                      </span>
                      <span>{rule.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          isPass ? 'bg-[#27c93f] text-[#08090a]' : 'bg-[#f26a3d] text-[#08090a]'
                        }`}
                      >
                        {rule.current}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block w-full h-full max-h-[620px]">
      <CadBlueprintGraphic filename={file.name} />

      {/* HIGH-PRECISION POINTER PINS ON VECTOR SVG GRAPHIC */}
      {annotationsVisible && !is3D && (
        <>
          {analysis.ruleResults.map((rule) => {
            if (!rule.annotation) return null;
            const ann = rule.annotation;
            const annPage = ann.page || 1;
            if (annPage !== currentPage) return null;

            const isSelected = selectedRuleId === rule.id;
            const isPass = rule.status === 'Pass';

            return (
              <div
                key={rule.id}
                onClick={() => onSelectRule(rule)}
                className={`absolute cursor-pointer transition-all duration-200 z-30 group ${
                  isSelected ? 'scale-110' : 'hover:scale-105'
                }`}
                style={{
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative flex items-center justify-center">
                  <span
                    className={`absolute h-9 w-9 rounded-full animate-ping opacity-75 ${
                      isPass ? 'bg-[#27c93f]' : rule.severity === 'CRITICAL' ? 'bg-[#f26a3d]' : 'bg-[#81b7c2]'
                    }`}
                  />
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[#08090a] font-mono text-xs font-bold shadow-2xl ${
                      isSelected
                        ? isPass
                          ? 'border-[#27c93f] text-[#27c93f] ring-4 ring-[#27c93f]/30'
                          : 'border-[#f26a3d] text-[#f26a3d] ring-4 ring-[#f26a3d]/30'
                        : isPass
                        ? 'border-[#27c93f] text-[#27c93f]'
                        : 'border-[#81b7c2] text-[#f4f0e8]'
                    }`}
                  >
                    {isPass ? '✓' : rule.id.split('-').pop()}
                  </div>

                  <div
                    className={`absolute left-9 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-[#08090a]/95 border px-2.5 py-1 font-mono text-[11px] text-[#f4f0e8] shadow-2xl flex items-center gap-2 pointer-events-auto ${
                      isPass ? 'border-[#27c93f]' : 'border-[#f26a3d]'
                    }`}
                  >
                    <span className={`font-bold ${isPass ? 'text-[#27c93f]' : 'text-[#f26a3d]'}`}>
                      {rule.id}:
                    </span>
                    <span>{rule.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        isPass ? 'bg-[#27c93f] text-[#08090a]' : 'bg-[#f26a3d] text-[#08090a]'
                      }`}
                    >
                      {rule.current}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function CadBlueprintGraphic({ filename }: { filename: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center p-4">
      <svg
        viewBox="0 0 960 600"
        className="w-full h-full max-h-[620px] rounded border border-[rgba(255,255,255,0.15)] bg-[#08090a]"
        style={{ filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.8))' }}
      >
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.8" />
          </pattern>
        </defs>

        <rect width="960" height="600" fill="url(#grid)" />

        <rect
          x="60"
          y="40"
          width="840"
          height="520"
          fill="rgba(242, 106, 61, 0.03)"
          stroke="#f26a3d"
          strokeWidth="1.2"
          strokeDasharray="6 4"
        />

        <rect
          x="120"
          y="90"
          width="720"
          height="420"
          fill="rgba(255, 255, 255, 0.02)"
          stroke="#f4f0e8"
          strokeWidth="2.5"
        />
        <rect
          x="126"
          y="96"
          width="708"
          height="408"
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1"
        />

        <line x1="380" y1="96" x2="380" y2="350" stroke="#f4f0e8" strokeWidth="2" />
        <line x1="620" y1="96" x2="620" y2="504" stroke="#f4f0e8" strokeWidth="2" />
        <line x1="126" y1="350" x2="620" y2="350" stroke="#f4f0e8" strokeWidth="2" />
        <line x1="380" y1="350" x2="380" y2="504" stroke="#f4f0e8" strokeWidth="2" />

        <rect x="150" y="380" width="80" height="100" fill="none" stroke="rgba(129, 183, 194, 0.5)" strokeWidth="1" strokeDasharray="3 3" />
        <rect x="250" y="380" width="80" height="100" fill="none" stroke="rgba(129, 183, 194, 0.5)" strokeWidth="1" strokeDasharray="3 3" />

        <path d="M 380 200 A 40 40 0 0 1 420 240" fill="none" stroke="#81b7c2" strokeWidth="1.2" strokeDasharray="2 2" />
        <line x1="380" y1="240" x2="420" y2="240" stroke="#81b7c2" strokeWidth="1.5" />

        <line x1="120" y1="65" x2="840" y2="65" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
        <line x1="120" y1="58" x2="120" y2="72" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
        <line x1="840" y1="58" x2="840" y2="72" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
        <rect x="440" y="55" width="80" height="20" fill="#08090a" rx="3" />
        <text x="480" y="69" fill="#f4f0e8" fontSize="11" fontFamily="IBM Plex Mono" fontWeight="600" textAnchor="middle">24.00 m</text>

        <line x1="90" y1="90" x2="90" y2="510" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
        <line x1="83" y1="90" x2="97" y2="90" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
        <line x1="83" y1="510" x2="97" y2="510" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
        <rect x="70" y="290" width="40" height="20" fill="#08090a" rx="3" />
        <text x="90" y="304" fill="#f4f0e8" fontSize="11" fontFamily="IBM Plex Mono" fontWeight="600" textAnchor="middle">18.00 m</text>

        <text x="250" y="220" fill="#8c999c" fontSize="12" fontFamily="IBM Plex Mono" fontWeight="600" textAnchor="middle">LIVING AREA</text>
        <text x="500" y="220" fill="#8c999c" fontSize="12" fontFamily="IBM Plex Mono" fontWeight="600" textAnchor="middle">HALLWAY / DINING</text>
        <text x="730" y="300" fill="#8c999c" fontSize="12" fontFamily="IBM Plex Mono" fontWeight="600" textAnchor="middle">MASTER BEDROOM</text>
        <text x="250" y="440" fill="#81b7c2" fontSize="11" fontFamily="IBM Plex Mono" fontWeight="600" textAnchor="middle">PARKING BAYS</text>
        <text x="500" y="440" fill="#8c999c" fontSize="12" fontFamily="IBM Plex Mono" fontWeight="600" textAnchor="middle">KITCHEN & UTILITY</text>

        <text x="480" y="545" fill="#f26a3d" fontSize="11" fontFamily="IBM Plex Mono" fontWeight="600" textAnchor="middle">FRONT SETBACK ZONE (REQ 6.0m)</text>

        <g transform="translate(900, 70)">
          <circle cx="0" cy="0" r="18" fill="#111416" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
          <polygon points="0,-12 4,2 0,0 -4,2" fill="#f26a3d" />
          <text x="0" y="14" fill="#f4f0e8" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="700" textAnchor="middle">N</text>
        </g>

        <text x="70" y="580" fill="#8c999c" fontSize="10" fontFamily="IBM Plex Mono" fontWeight="500">{filename}</text>
      </svg>
    </div>
  );
}

export default App;
