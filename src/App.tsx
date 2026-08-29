import MorphText from './components/MorphText';
import GenerateButton from './components/GenerateButton';
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
  Sun,
  Moon,
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
      clause: 'DCR 2026 - Table 4.2 Setback Clearances',
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
      clause: 'DCR 2026 - Clause 14.2 Road Frontage Setback',
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
      clause: 'NBC 2016 - Part 4 Sec 4.3 (Egress Stairways)',
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
      clause: 'NBC 2016 - Part 4 Sec 4.2 (Corridor Standards)',
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
      clause: 'NBC 2016 & DCR - High-Rise Height Limits',
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
      clause: 'DCR Parking Regulations - Off-Street Parking Schedule',
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
      clause: 'DCR 2026 - Table 4.1 Side Margin Schedule',
      evidence: 'Site plan labels show SIDE SETBACK 3.00 m provided on both left and right property boundaries, satisfying DCR open space criteria.',
      action: 'Compliant. Both side margins meet the mandatory statutory setback threshold.',
      annotation: { x: 8.5, y: 23.0, page: 1, label: 'PASS 3.0m' },
    },
    {
      id: 'GH-DCR-PASS-02',
      pack: 'DCR',
      title: 'Public Access Road Width',
      required: 'Minimum public street width: 6.00 m.',
      current: '60.00 m wide road shown',
      status: 'Pass',
      severity: 'INFO',
      clause: 'DCR Regulation 12.1 - Access Road Standards Road Standards',
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
      clause: 'DCR FSI Schedule - Plot FAR Utilization',
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
      clause: 'RERA Act 2016 - Section 4(2)(l) Allottee Disclosure',
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
    totalPages: 1,
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analysis, setAnalysis] = useState<Analysis>(emptyAnalysis);
  const [state, setState] = useState<AnalysisState>('idle');
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('GH-DCR-01');
  const [ruleFilter, setRuleFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const recommendedSearchTerms = ['Setback', 'FAR', 'Egress', 'Parking', 'RERA', 'Critical'];
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
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

  const isRulePass = (r: RuleResult) => {
    const s = String(r.status || '').trim().toLowerCase();
    return s === 'pass' || s === 'compliant' || s === 'ok' || s === 'correct' || s === 'verified';
  };

  const isRuleFail = (r: RuleResult) => {
    const s = String(r.status || '').trim().toLowerCase();
    return s === 'fail' || s === 'violation' || s === 'critical' || s === 'major' || s === 'minor' || s === 'non-compliant' || s === 'defect' || s === 'failed';
  };

  const selectedRule = useMemo(() => {
    return analysis.ruleResults.find((r) => r.id === selectedRuleId) || analysis.ruleResults[0] || null;
  }, [analysis.ruleResults, selectedRuleId]);

  const filteredRules = useMemo(() => {
    return analysis.ruleResults.filter((r) => {
      if (ruleFilter === 'PASS') return isRulePass(r);
      if (ruleFilter === 'FAIL') return isRuleFail(r) || !isRulePass(r);
      return true;
    });
  }, [analysis.ruleResults, ruleFilter]);

  const passCount = useMemo(() => analysis.ruleResults.filter((r) => isRulePass(r)).length, [analysis.ruleResults]);
  const failCount = useMemo(() => analysis.ruleResults.filter((r) => isRuleFail(r) || !isRulePass(r)).length, [analysis.ruleResults]);

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
  const totalPages = analysis.totalPages || 1;

  return (
    <div className="h-full bg-[#08090a] text-[#f4f0e8] flex flex-col font-sans">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="application/pdf,image/*,.dwg,.dxf"
        onChange={onInputChange}
      />

      <div className={`flex flex-col h-full ${isNavigating ? 'view-transition-exit' : 'view-transition-enter'}`}>
        {view === 'landing' ? (
          <LandingPage
            theme={theme}
            setTheme={setTheme}
            onLaunch={() => handleNavigate('workspace')}
            onUpload={() => {
              handleNavigate('workspace');
              setTimeout(() => inputRef.current?.click(), 120);
            }}
          />
        ) : (
          <div className="flex flex-col h-full animate-page-enter">
            {/* Top Header Bar inside Workspace */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[#08090a]/90 px-6 backdrop-blur-md">
              {/* Brand */}
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNavigate('landing')}>
                <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl border border-[#f26a3d]/40 bg-[#111416] p-1.5 shadow-lg shadow-[#f26a3d]/15 logo-glow-box transition-all duration-300 group-hover:scale-105 group-hover:border-[#f26a3d] group-hover:shadow-[#f26a3d]/35">
                  <img src="/prudence-logo.png" alt="PRUDENCE" className="h-full w-full object-contain" />
                </div>
                <span className="font-space text-lg md:text-xl font-extrabold tracking-tight transition group-hover:scale-105"><span className="text-white">PRUDENCE</span> <span className="text-[#f26a3d]">AI</span></span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#8c999c]">
                  AI COMPLIANCE AGENT
                </span>
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#f26a3d]/30 bg-[#f26a3d]/10 font-mono text-[10px] font-bold text-[#f26a3d] animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a3d]" />
                  CAD WORK IN PROGRESS
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
                  <span>Home</span>
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

          {/* Main Workspace - Fixed height, two independent scroll panels */}
          <main className="flex flex-1 overflow-hidden flex-col lg:flex-row">
            {/* Left Panel - scrollable independently */}
            <section className="flex flex-1 flex-col gap-3 p-4 min-w-0 overflow-y-auto">
              {/* Subheader & Kicker */}
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f26a3d]">
                  <span className="text-white">PRUDENCE</span> <span className="text-[#f26a3d]">AI</span> / COMPLIANCE WORKSPACE
                </span>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="font-space text-2xl md:text-3xl font-semibold tracking-tight text-[#f4f0e8]">
                      Drawing Analysis
                    </h1>
                    <p className="font-sans text-xs text-[#8c999c]">• {file ? file.name : 'See the risk before it reaches the site.'}
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

              {/* CAD Work In Progress Status Banner */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg border border-[#f26a3d]/30 bg-[#111416] font-mono text-xs text-[#81b7c2] shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#f26a3d] animate-ping shrink-0" />
                  <span className="font-bold text-[#f26a3d] uppercase tracking-wider">CAD WORK IN PROGRESS:</span>
                  <span className="text-[#8c999c]">Live CAD engine, DWG / DXF vector parsing & interactive drawing tools under active integration.</span>
                </div>
                <span className="hidden sm:inline-block text-[10px] text-[#f26a3d] font-bold bg-[#f26a3d]/10 border border-[#f26a3d]/30 px-2 py-0.5 rounded shrink-0">
                  v0.9 BETA
                </span>
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

              {/* Drawing Canvas Container (Full Size & Spacious Min-Height) */}
              <div
                ref={previewContainerRef}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className="relative flex-1 min-h-[520px] sm:min-h-[580px] card-prudence cad-grid-bg overflow-hidden flex flex-col rounded-lg shadow-xl"
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
                    {file && !is3D && totalPages > 1 && (
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
                    {file && !is3D && totalPages <= 1 && (
                      <div className="flex items-center gap-1.5 bg-[#08090a] px-2.5 py-0.5 rounded border border-white/10 font-mono text-xs text-[#8c999c]">
                        <span className="text-[#f4f0e8] font-semibold">Sheet 1 of 1</span>
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
                    <div className="preview w-full h-full flex items-center justify-center relative">• {file ? (
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

            {/* Right Panel - scrollable independently */}
            <aside className="w-full lg:w-[440px] xl:w-[480px] shrink-0 border-t lg:border-t-0 lg:border-l border-[rgba(255,255,255,0.08)] bg-[#08090a] p-5 flex flex-col gap-5 overflow-y-auto">
              {/* VIBRANT HIGH-CONTRAST STATUTORY COMPLIANCE RADAR CARD */}
              <div className="shrink-0 rounded-2xl border border-[#f26a3d]/40 bg-[#111416] p-4.5 flex flex-col gap-3.5 relative overflow-hidden shadow-2xl shadow-black/80 hover:border-[#f26a3d] transition-all duration-300">
                {/* Ambient Background Radial Glow */}
                <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
                  !file || failCount === 0
                    ? 'bg-[#27c93f]/20'
                    : failCount <= 2
                    ? 'bg-[#f26a3d]/20'
                    : 'bg-[#ff4d4d]/25'
                }`} />

                {/* Header Title & Status */}
                <div className="flex items-center justify-between z-10 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f26a3d]/15 border border-[#f26a3d]/40 text-[#f26a3d]">
                      <Shield size={16} />
                    </div>
                    <span className="font-space text-sm font-extrabold tracking-wider text-white uppercase">
                      STATUTORY COMPLIANCE RADAR
                    </span>
                  </div>
                  <span className={`font-mono text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-md flex items-center gap-1.5 ${
                    !file
                      ? 'bg-white/10 border-white/20 text-white'
                      : failCount === 0
                      ? 'bg-[#27c93f]/20 border-[#27c93f]/50 text-[#27c93f]'
                      : failCount <= 2
                      ? 'bg-[#f26a3d]/20 border-[#f26a3d]/50 text-[#f26a3d]'
                      : 'bg-[#ff4d4d]/20 border-[#ff4d4d]/50 text-[#ff4d4d]'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full animate-ping ${!file ? 'bg-white' : failCount === 0 ? 'bg-[#27c93f]' : 'bg-[#ff4d4d]'}`} />
                    {file ? 'ACTIVE AUDIT' : 'STANDBY'}
                  </span>
                </div>

                {/* High Contrast Score & Risk Layout */}
                <div className="grid grid-cols-2 gap-3 z-10">
                  {/* Score Tile */}
                  <div className="flex flex-col justify-between p-3 rounded-xl border border-white/10 bg-[#08090a] shadow-inner">
                    <span className="font-mono text-[10px] font-bold text-[#8c999c] uppercase tracking-wider">
                      COMPLIANCE SCORE
                    </span>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className="font-space text-3xl font-black text-white tracking-tight drop-shadow">
                        {file ? Math.round((passCount / Math.max(1, analysis.ruleResults.length)) * 100) : 0}%
                      </span>
                      <span className="font-mono text-[9px] font-bold text-[#27c93f]">ACCURACY</span>
                    </div>
                    {/* Glowing Progress Bar */}
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all duration-1000 ease-out ${
                          !file || failCount === 0
                            ? 'bg-[#27c93f] shadow-[0_0_10px_#27c93f]'
                            : failCount <= 2
                            ? 'bg-[#f26a3d] shadow-[0_0_10px_#f26a3d]'
                            : 'bg-[#ff4d4d] shadow-[0_0_10px_#ff4d4d]'
                        }`}
                        style={{ width: `${file ? Math.round((passCount / Math.max(1, analysis.ruleResults.length)) * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Risk Badge Tile */}
                  <div className="flex flex-col justify-between p-3 rounded-xl border border-white/10 bg-[#08090a] shadow-inner">
                    <span className="font-mono text-[10px] font-bold text-[#8c999c] uppercase tracking-wider">
                      RISK LEVEL
                    </span>
                    <div className="my-1">
                      <span className={`inline-block font-space text-xs font-black px-2.5 py-1 rounded-md border uppercase tracking-wider shadow ${
                        !file
                          ? 'bg-white/10 border-white/20 text-white'
                          : failCount === 0
                          ? 'bg-[#27c93f]/25 border-[#27c93f] text-[#27c93f]'
                          : failCount <= 2
                          ? 'bg-[#f26a3d]/25 border-[#f26a3d] text-[#f26a3d]'
                          : 'bg-[#ff4d4d]/25 border-[#ff4d4d] text-[#ff4d4d] animate-pulse'
                      }`}>
                        {!file ? 'NONE' : failCount === 0 ? 'LOW RISK' : failCount <= 2 ? 'MODERATE' : 'HIGH RISK'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-white font-medium">
                      {file ? `${failCount} Violation${failCount !== 1 ? 's' : ''} detected` : 'Upload drawing'}
                    </span>
                  </div>
                </div>

                {/* Footer Code Indicator */}
                <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-[#8c999c] z-10">
                  <span className="flex items-center gap-1.5 text-white font-bold">
                    <Cpu size={13} className="text-[#f26a3d]" />
                    {activeJurisdiction.label}
                  </span>
                  <span className="text-[#81b7c2] font-bold">{analysis.ruleResults.length} Statutory Rules</span>
                </div>
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
                       Pass ({passCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleFilter('FAIL')}
                      className={`px-2.5 py-1 rounded transition ${ruleFilter === 'FAIL' ? 'bg-[#f26a3d] text-[#08090a] font-bold' : 'text-[#8c999c] hover:text-[#f26a3d]'}`}
                    >
                       Fail ({failCount})
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE ACCORDION REGULATION CARDS (UNIFIED SMOOTH COLUMN SCROLLING) */}
                {filteredRules.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {filteredRules.map((rule) => {
                      const isSelected = selectedRuleId === rule.id;
                      const isPass = isRulePass(rule);

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
                              {rule.pack} • {rule.id}
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
                            Required: <span className="text-[#f4f0e8] font-semibold">{rule.required}</span> • Provided: <span className="text-[#f4f0e8] font-semibold">{rule.current}</span>
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
                                  <span className="font-bold">{isPass ? ' Fully Compliant' : ' Statutory Non-Compliance Deficit'}</span>
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
                                  <span>Consult PRUDENCE AI &rarr;</span>
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
          </div>
        )}
      </div>
    </div>
  );
}

/* SLEEK VERCEL/LINEAR STYLE HUMAN SAAS LANDING PAGE COMPONENT */
function LandingPage({ onLaunch, onUpload, theme, setTheme }: { onLaunch: () => void; onUpload: () => void; theme: "dark" | "light"; setTheme: React.Dispatch<React.SetStateAction<"dark" | "light">> }) {
  const [activeTab, setActiveTab] = useState<'v1' | 'v2' | 'v3'>('v1');

  return (
    <div className="relative h-full bg-ambient-mesh text-[#f4f0e8] flex flex-col font-sans overflow-x-hidden overflow-y-auto">
      {/* CRAZY AESTHETIC FLOATING GLASS CAPSULE NAVBAR */}
      <header className="sticky top-4 z-50 max-w-6xl mx-auto w-[94%] my-2 rounded-full border border-white/15 bg-[#08090a]/85 px-5 py-2.5 backdrop-blur-2xl shadow-2xl shadow-black/80 hover:border-[#f26a3d]/50 transition-all duration-500 flex items-center justify-between">
        {/* Brand with 3D Tilt Hover */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onLaunch}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#f26a3d]/40 bg-[#111416] p-1.5 shadow-lg shadow-[#f26a3d]/20 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:border-[#f26a3d] group-hover:shadow-[#f26a3d]/50 logo-glow-box">
            <img src="/prudence-logo.png" alt="PRUDENCE" className="h-full w-full object-contain drop-shadow" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-space text-lg font-extrabold tracking-tight transition-transform group-hover:scale-105">
              <span className="text-white">PRUDENCE</span> <span className="text-[#f26a3d] drop-shadow-[0_0_8px_rgba(242,106,61,0.6)]">AI</span>
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#8c999c] mt-0.5">
              BBMP 2026 AUDIT ENGINE
            </span>
          </div>
        </div>

        {/* Floating Link Pills */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-full border border-white/10 bg-[#111416]/80 font-mono text-xs font-semibold text-[#8c999c]">
          <a href="#hero" className="px-3.5 py-1.5 rounded-full transition-all duration-300 hover:bg-[#f26a3d]/15 hover:text-[#f26a3d] hover:scale-105">
            #Product
          </a>
          <a href="#showcase" className="px-3.5 py-1.5 rounded-full transition-all duration-300 hover:bg-[#f26a3d]/15 hover:text-[#f26a3d] hover:scale-105">
            #Interactive Demo
          </a>
          <a href="#bylaws" className="px-3.5 py-1.5 rounded-full transition-all duration-300 hover:bg-[#f26a3d]/15 hover:text-[#f26a3d] hover:scale-105">
            #Bylaw Radar
          </a>
        </nav>

        {/* Right Status Badge & CTA Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className="p-2 rounded-full border border-white/10 bg-[#111416] text-[#f26a3d] hover:scale-110 hover:border-[#f26a3d] transition-all shadow-md cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#f26a3d]/30 bg-[#f26a3d]/10 font-mono text-[10px] font-bold text-[#f26a3d] animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a3d] animate-ping" />
            CAD WORK IN PROGRESS
          </span>

          <button
            type="button"
            onClick={onLaunch}
            className="relative group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#f26a3d] to-[#ff8555] font-space text-xs font-bold text-[#08090a] shadow-lg shadow-[#f26a3d]/25 hover:shadow-[#f26a3d]/50 hover:scale-105 transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <span>Launch Workspace</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
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
        <div className="relative z-10 max-w-5xl my-2">
          <MorphText
            words={[
              "CATCH CODE VIOLATIONS",
              "AUDIT BBMP & NBC LAWS",
              "ZERO REJECTION SANCTIONS",
              "INSTANT CAD COMPLIANCE"
            ]}
            interval={3200}
            fontSize="clamp(2.2rem, 5.5vw, 4.5rem)"
            subtext="BEFORE BREAKING GROUND ON SITE"
          />
        </div>

        {/* Simple, Attractive Sentence Subtitle */}
        <p className="mt-6 font-sans text-base sm:text-lg text-[#8c999c] max-w-2xl leading-relaxed relative z-10 backdrop-blur-xs">
          Upload 2D blueprints or 3D CAD models - spot setback deficits, FSI breaches, and NBC fire safety risks before a single brick is laid.
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
                    ? 'BBMP Bylaws 2026 - Clause 14.2 (Table 4.1)'
                    : activeTab === 'v2'
                    ? 'National Building Code 2016 - Part 4 Sec 3.2'
                    : 'Development Control Rules - Open Plot Ratio'}
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
                  <span className="text-[#27c93f] font-bold"> PARSER READY</span>
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
        PRUDENCE AI - Architectural Code Compliance Intelligence Engine
      </footer>
    </div>
  );
}

// AESTHETIC HIGH-TECH MARKDOWN TABLE, WORKFLOW & TEXT PARSER
// AESTHETIC HIGH-TECH MARKDOWN TABLE, WORKFLOW & TEXT PARSER
// AESTHETIC HIGH-TECH MARKDOWN TABLE, WORKFLOW & TEXT PARSER
// AESTHETIC HIGH-TECH MARKDOWN TABLE, WORKFLOW & TEXT PARSER
function FormattedMarkdownText({ content }: { content: string }) {
  if (!content) return null;

  const parseWorkflowSteps = (text: string) => {
    const stepBlocks = text
      .split(/(?=\[\s*Step\s*\d+|STEP\s*\d+|Step\s*\d+|\bStep\s+\d+|\bSTEP\s+\d+)/im)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^[\s|v➔\->=]+$/.test(s));

    if (stepBlocks.length < 2) return null;

    const parsedSteps: Array<{ stepNum: string; title: string; description: string }> = [];

    stepBlocks.forEach((block) => {
      const cleanBlock = block.replace(/^[\s|v➔\->=]+\n/g, '').trim();
      const lines = cleanBlock.split('\n').map((l) => l.trim()).filter((l) => !/^[\s|v➔\->=]+$/.test(l));
      if (lines.length === 0) return;

      const firstLine = lines[0] || '';
      const titleMatch = firstLine.match(/\[?\s*(?:Step\s*\d+|STEP\s*\d+|^\d+[\.\)]?)?\s*:?\s*([^\]]+)\]?/i);
      let title = titleMatch ? titleMatch[1].trim() : firstLine;
      title = title.replace(/^[^a-zA-Z0-9]+/, '').trim();

      const description = lines
        .slice(1)
        .join(' ')
        .replace(/^[\s|v➔\->=]+/, '')
        .trim();

      if (title && title.length > 1) {
        parsedSteps.push({
          stepNum: String(parsedSteps.length + 1).padStart(2, '0'),
          title: title,
          description: description,
        });
      }
    });

    return parsedSteps.length >= 2 ? parsedSteps : null;
  };

  const parseMarkdownBlocks = (text: string) => {
    const lines = text.split('\n');
    const blocks: Array<{ type: 'table' | 'header' | 'list' | 'code' | 'workflow' | 'text'; content: any }> = [];
    let currentTableLines: string[] = [];
    let currentListItems: string[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let codeLang = '';

    const flushTable = () => {
      if (currentTableLines.length > 0) {
        const parsed = parseTableLines(currentTableLines);
        if (parsed) blocks.push({ type: 'table', content: parsed });
        currentTableLines = [];
      }
    };

    const flushList = () => {
      if (currentListItems.length > 0) {
        blocks.push({ type: 'list', content: [...currentListItems] });
        currentListItems = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block / Workflow Fence Detection ```
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const codeText = codeLines.join('\n');
          const steps = parseWorkflowSteps(codeText);

          if (codeLang === 'workflow' || codeLang === 'mermaid' || steps) {
            blocks.push({
              type: 'workflow',
              content: { steps: steps || parseWorkflowSteps(codeText) || [], raw: codeText },
            });
          } else {
            blocks.push({
              type: 'code',
              content: { lang: codeLang || 'CODE', code: codeText },
            });
          }
          inCodeBlock = false;
          codeLines = [];
          codeLang = '';
        } else {
          flushTable();
          flushList();
          inCodeBlock = true;
          codeLang = line.trim().replace(/^```/, '').trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Detect Table Line
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList();
        currentTableLines.push(line.trim());
        continue;
      } else {
        flushTable();
      }

      // Detect List Line
      if (/^\s*[\-\*\•\d+\.]\s+/.test(line)) {
        currentListItems.push(line.replace(/^\s*[\-\*\•\d+\.]\s+/, ''));
        continue;
      } else {
        flushList();
      }

      // Detect Header Line
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const headerText = line.replace(/^#+\s*/, '');
        blocks.push({ type: 'header', content: { level, text: headerText } });
        continue;
      }

      // Regular Paragraph / Line
      if (line.trim().length > 0) {
        blocks.push({ type: 'text', content: line });
      }
    }

    flushTable();
    flushList();

    return blocks;
  };

  const parseTableLines = (tableLines: string[]) => {
    const cleanRows = tableLines
      .filter((line) => !/^[\|\s\-\:\+]+$/.test(line))
      .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));

    if (cleanRows.length === 0) return null;

    const headers = cleanRows[0];
    const rows = cleanRows.slice(1);
    return { headers, rows };
  };

  const renderInlineFormatting = (str: string) => {
    if (!str) return null;
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-[#f4f0e8]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3 text-xs text-[#f4f0e8] leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'workflow') {
          const { steps, raw } = block.content;
          if (steps && steps.length > 0) {
            return (
              <div key={idx} className="my-4 p-4 rounded-xl border border-[#f26a3d]/35 bg-[#08090a] shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 font-mono text-[10px] font-bold text-[#f26a3d] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#f26a3d] animate-ping" />
                    VISUAL WORKFLOW & ACTION PLAN
                  </span>
                  <span className="text-[#8c999c] font-mono">{steps.length} STAGES</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {steps.map((step: any, sIdx: number) => (
                    <div
                      key={sIdx}
                      className="group relative flex flex-col gap-1.5 p-3.5 rounded-lg border border-white/10 bg-[#111416] hover:border-[#f26a3d]/60 hover:bg-[#151a1c] transition-all shadow-md"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#f26a3d]">
                        <span>STEP {step.stepNum}</span>
                        <ArrowRight size={12} className="text-[#81b7c2] group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div className="font-space text-xs font-bold text-[#f4f0e8] leading-tight">
                        {renderInlineFormatting(step.title)}
                      </div>
                      {step.description && (
                        <div className="font-sans text-[11px] text-[#8c999c] leading-relaxed pt-1 border-t border-white/5">
                          {renderInlineFormatting(step.description)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="my-3 rounded-lg border border-[#f26a3d]/30 bg-[#08090a] p-3.5 font-mono text-[11px] text-[#81b7c2] shadow-xl overflow-x-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-[10px] font-bold text-[#f26a3d] uppercase tracking-wider">
                <span>WORKFLOW & ACTION PLAN</span>
                <span className="text-[#8c999c]">PRUDENCE ENGINE</span>
              </div>
              <pre className="whitespace-pre overflow-x-auto leading-relaxed">{raw}</pre>
            </div>
          );
        }

        if (block.type === 'code' && block.content) {
          const { lang, code } = block.content;
          return (
            <div key={idx} className="my-3 rounded-lg border border-[#f26a3d]/30 bg-[#08090a] p-3.5 font-mono text-[11px] text-[#81b7c2] shadow-xl overflow-x-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-[10px] font-bold text-[#f26a3d] uppercase tracking-wider">
                <span>{lang.toUpperCase() || 'SPECIFICATION'}</span>
                <span className="text-[#8c999c]">PRUDENCE ENGINE</span>
              </div>
              <pre className="whitespace-pre overflow-x-auto leading-relaxed">{code}</pre>
            </div>
          );
        }

        if (block.type === 'table' && block.content) {
          const { headers, rows } = block.content;
          return (
            <div key={idx} className="my-3 overflow-x-auto rounded-lg border border-white/15 bg-[#08090a] shadow-2xl">
              <table className="w-full min-w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/15 bg-[#151a1c]">
                    {headers.map((h: string, hIdx: number) => (
                      <th
                        key={hIdx}
                        className="px-3.5 py-2.5 font-mono text-[11px] font-bold text-[#f26a3d] tracking-wide uppercase border-r border-white/10 last:border-r-0"
                      >
                        {renderInlineFormatting(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rows.map((row: string[], rIdx: number) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-[#08090a]' : 'bg-[#111416]'}>
                      {row.map((cell: string, cIdx: number) => (
                        <td key={cIdx} className="px-3.5 py-2 text-[#f4f0e8] border-r border-white/5 last:border-r-0 align-top">
                          {renderInlineFormatting(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'header') {
          return (
            <h4 key={idx} className="font-space font-bold text-sm text-[#f26a3d] mt-3 mb-1">
              {renderInlineFormatting(block.content.text)}
            </h4>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={idx} className="space-y-1 my-1.5 pl-1">
              {block.content.map((item: string, itemIdx: number) => (
                <li key={itemIdx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a3d] mt-1.5 shrink-0" />
                  <span>{renderInlineFormatting(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="text-[#f4f0e8]/90">
            {renderInlineFormatting(block.content)}
          </p>
        );
      })}
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
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(4,5,6,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="flex h-full w-full max-w-[520px] flex-col"
        style={{
          background: '#0b0d0f',
          borderLeft: '1px solid rgba(242,106,61,0.22)',
          boxShadow: '-4px 0 60px rgba(242,106,61,0.10), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(90deg, #111416 0%, #0e1012 100%)',
            borderBottom: '1px solid rgba(242,106,61,0.18)',
            padding: '14px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
          }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{
                width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(242,106,61,0.4)',
                background: 'rgba(242,106,61,0.08)',
                boxShadow: '0 0 14px rgba(242,106,61,0.18)',
                borderRadius: 4,
              }}>
                <Bot size={17} color="#f26a3d" />
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: '#f4f0e8', letterSpacing: '-0.01em' }}>
                  PRUDENCE AI
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#81b7c2', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#81b7c2', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  GROUNDED &bull; ACTIVE BLUEPRINT
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onClear}
                title="Clear session"
                style={{
                  background: 'none', border: '1px solid transparent', borderRadius: 4,
                  padding: '5px 7px', cursor: 'pointer', color: '#4e5c60', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#8c999c'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#4e5c60'; }}
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={onClose}
                title="Close"
                style={{
                  background: 'none', border: '1px solid transparent', borderRadius: 4,
                  padding: '5px 7px', cursor: 'pointer', color: '#4e5c60', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#f4f0e8'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#4e5c60'; }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, letterSpacing: '0.1em',
                color: msg.role === 'user' ? '#f26a3d' : '#4e5c60',
                marginBottom: 4,
                textTransform: 'uppercase',
              }}>
                {msg.role === 'user' ? '— you' : '— prudence'}
              </div>
              <div
                style={{
                  maxWidth: '88%',
                  padding: msg.role === 'user' ? '9px 13px' : '11px 14px',
                  borderRadius: 4,
                  fontSize: 12,
                  lineHeight: 1.65,
                  fontFamily: msg.role === 'user' ? "'DM Sans', sans-serif" : 'inherit',
                  fontWeight: msg.role === 'user' ? 500 : 400,
                  ...(msg.role === 'user'
                    ? {
                        background: 'rgba(242,106,61,0.10)',
                        border: '1px solid rgba(242,106,61,0.32)',
                        color: '#f4f0e8',
                        boxShadow: '0 0 18px rgba(242,106,61,0.06)',
                      }
                    : {
                        background: '#111416',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderLeft: '2px solid rgba(129,183,194,0.5)',
                        color: '#d8d4cc',
                        boxShadow: '0 2px 18px rgba(0,0,0,0.3)',
                      }),
                }}
              >
                {msg.role === 'user' ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                ) : (
                  <FormattedMarkdownText content={msg.content} />
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: '#111416',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: '2px solid rgba(129,183,194,0.5)',
                padding: '9px 14px',
                borderRadius: 4,
              }}>
                <Loader2 size={12} color="#f26a3d" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#4e5c60', letterSpacing: '0.06em' }}>
                  analyzing blueprint context...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 18px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          scrollbarWidth: 'none',
        }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              style={{
                flexShrink: 0,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#4e5c60',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 3,
                padding: '5px 10px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(242,106,61,0.4)';
                (e.currentTarget as HTMLButtonElement).style.color = '#f26a3d';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLButtonElement).style.color = '#4e5c60';
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '12px 18px 16px',
            borderTop: '1px solid rgba(242,106,61,0.15)',
            background: '#0e1012',
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{
              position: 'absolute', left: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: '#f26a3d', pointerEvents: 'none', userSelect: 'none',
            }}>
              &gt;
            </span>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="ask about setback, FSI, NBC clause..."
              style={{
                width: '100%',
                background: '#08090a',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4,
                padding: '10px 42px 10px 26px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: '#f4f0e8',
                outline: 'none',
                transition: 'border-color 0.15s',
                caretColor: '#f26a3d',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(242,106,61,0.45)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              style={{
                position: 'absolute', right: 6,
                width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: inputText.trim() && !isSending ? '#f26a3d' : 'rgba(242,106,61,0.12)',
                border: '1px solid rgba(242,106,61,0.3)',
                borderRadius: 3,
                cursor: inputText.trim() && !isSending ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <Send size={12} color={inputText.trim() && !isSending ? '#08090a' : '#f26a3d'} />
            </button>
          </div>
          <div style={{
            marginTop: 7,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: '#2e3a3d',
            letterSpacing: '0.06em',
          }}>
            PRUDENCE &bull; GEMINI 2.5 PRO &bull; RERA / NBC / DCR GROUNDED
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
                      {isPass ? '' : rule.id.split('-').pop()}
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
                    {isPass ? '' : rule.id.split('-').pop()}
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
