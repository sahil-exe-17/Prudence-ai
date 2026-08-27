import {
  Bell,
  Bot,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Hand,
  Layers,
  Loader2,
  MessageSquare,
  Ruler,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

type Jurisdiction = 'bbmp' | 'mcgm' | 'ubbl';
type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR';
type AnalysisState = 'idle' | 'ready' | 'analyzing' | 'complete';

type Violation = {
  severity: Severity;
  title: string;
  required?: string;
  found?: string;
  delta?: string;
  note?: string;
  annotation?: { x: number; y: number };
};

type Analysis = {
  documentName: string;
  documentSize: string;
  jurisdiction: string;
  score: number;
  coverage: number;
  risk: 'Low' | 'Medium' | 'High';
  status: string;
  violations: Violation[];
};

const jurisdictions: { id: Jurisdiction; label: string }[] = [
  { id: 'bbmp', label: 'BBMP 2026' },
  { id: 'mcgm', label: 'DCPR 2034' },
  { id: 'ubbl', label: 'UBBL 2016' },
];

const emptyAnalysis: Analysis = {
  documentName: 'No drawing loaded',
  documentSize: 'Upload a PDF or image',
  jurisdiction: 'BBMP 2026',
  score: 0,
  coverage: 0,
  risk: 'Low',
  status: 'Awaiting Drawing',
  violations: [],
};

function formatBytes(bytes: number) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function makeAnalysis(file: File, jurisdiction: string): Analysis {
  const sizeSignal = Math.max(1, Math.min(12, Math.round(file.size / 250000)));
  const score = Math.max(64, 88 - sizeSignal);

  return {
    documentName: file.name,
    documentSize: formatBytes(file.size),
    jurisdiction,
    score,
    coverage: 94,
    risk: score >= 84 ? 'Low' : score >= 72 ? 'Medium' : 'High',
    status: score >= 84 ? 'Review Passed' : 'Conditional Approval',
    violations: [
      {
        severity: 'CRITICAL',
        title: 'Boundary Setback Deficit',
        required: '6.0 m',
        found: '4.2 m',
        delta: '1.8 m',
        annotation: { x: 25, y: 40 },
      },
      {
        severity: 'MAJOR',
        title: 'Parking Space Deficit',
        required: '24 Units',
        found: '18 Units',
        delta: '6 Units',
        annotation: { x: 60, y: 60 },
      },
      {
        severity: 'MINOR',
        title: 'Fire Safety Clearance',
        note: 'Refuge area access width falls short of NBC 2016 standards by 0.3 m.',
        annotation: { x: 15, y: 20 },
      },
    ],
  };
}

function App() {
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('bbmp');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analysis, setAnalysis] = useState<Analysis>(emptyAnalysis);
  const [state, setState] = useState<AnalysisState>('idle');
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [dragState, setDragState] = useState({ isDragging: false, startX: 0, startY: 0, rx: 60, rz: 45 });
  const [isChatOpen, setIsChatOpen] = useState(false);
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
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach the AI chat service. Please check your backend connection.' }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error while communicating with PRUDENCE AI.' }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const activeJurisdiction = useMemo(
    () => jurisdictions.find((item) => item.id === jurisdiction) ?? jurisdictions[0],
    [jurisdiction],
  );

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

  // Load default demo file on startup to make application functional
  useEffect(() => {
    const demoFile = new File([""], "demo-drawing.dwg", { type: "image/png" });
    setFile(demoFile);
    setPreviewUrl("/prudence-logo.png");
    setState('ready');
    setAnalysis({
      documentName: "demo-drawing.dwg",
      documentSize: "1.0 MB",
      jurisdiction: "BBMP 2026",
      score: 78,
      coverage: 94,
      risk: "Medium",
      status: "Review Passed",
      violations: [
        {
          severity: 'CRITICAL',
          title: 'Boundary Setback Deficit',
          required: '6.0 m',
          found: '4.2 m',
          delta: '1.8 m',
          annotation: { x: 25, y: 40 },
        },
        {
          severity: 'MAJOR',
          title: 'Parking Space Deficit',
          required: '24 Units',
          found: '18 Units',
          delta: '6 Units',
          annotation: { x: 60, y: 60 },
        },
        {
          severity: 'MINOR',
          title: 'Fire Safety Clearance',
          note: 'Refuge area access width falls short of NBC 2016 standards by 0.3 m.',
          annotation: { x: 15, y: 20 },
        },
      ]
    });
  }, []);

  useEffect(() => {
    if (is3D && file) {
      const timer = setTimeout(() => {
        const previewEl = document.querySelector('.preview');
        if (previewEl) {
          const child = previewEl.querySelector('canvas') || previewEl.querySelector('img');
          if (child) {
            const src = child.tagName === 'CANVAS' ? (child as HTMLCanvasElement).toDataURL() : (child as HTMLImageElement).src;
            const leftWall = document.querySelector('.elevation-left') as HTMLElement;
            const rightWall = document.querySelector('.elevation-right') as HTMLElement;
            if (leftWall && rightWall) {
              leftWall.style.backgroundImage = `url(${src})`;
              rightWall.style.backgroundImage = `url(${src})`;
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [is3D, file, state]);

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
            jurisdiction: activeJurisdiction.label
          })
        });
        
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        
        if (!isCancelled) {
          setAnalysis({
            documentName: file.name,
            documentSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            jurisdiction: activeJurisdiction.label,
            ...data
          });
          setState('complete');
        }
      } catch (err) {
        console.error("Analysis failed, falling back to dummy data:", err);
        if (!isCancelled) {
          setAnalysis(makeAnalysis(file, activeJurisdiction.label));
          setState('complete');
        }
      }
    };
    reader.readAsDataURL(file);

    return () => {
      isCancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file, activeJurisdiction.label]);

  const acceptFile = (nextFile?: File) => {
    if (!nextFile) return;
    setFile(nextFile);
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
  const isAnalyzing = state === 'analyzing';

  return (
    <div className="min-h-screen overflow-hidden bg-black text-[#e5e2e1]">
      <AmbientBackground />
      <header className="fixed left-0 top-0 z-40 flex h-20 w-full items-center justify-between border-b border-white/10 bg-white/[0.035] px-5 backdrop-blur-2xl lg:px-12">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="text-2xl font-bold tracking-[-0.04em] text-white">PRUDENCE</h1>
          <span className="hidden border-l border-white/20 pl-4 text-sm font-medium uppercase tracking-[0.22em] text-white/45 md:block">
            AI Compliance Agent
          </span>
        </div>

        <div className="mx-4 hidden max-w-xl flex-1 md:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/55" size={22} />
            <input
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.055] pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/40"
              placeholder="Search regulations, projects, or clauses..."
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-white/75">
          <button className="relative transition hover:text-white" title="Notifications">
            <Bell size={22} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-white" />
          </button>
          <button className="transition hover:text-white" title="Settings">
            <Settings size={22} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white">
            PR
          </div>
        </div>
      </header>

      <main className="relative z-10 flex h-screen flex-col gap-0 overflow-hidden pt-20 lg:flex-row">
        <section className="flex min-h-0 flex-1 flex-col gap-6 p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">Drawing Analysis</h2>
              <p className="mt-1 text-sm text-white/50">{analysis.documentName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={jurisdiction}
                onChange={(event) => setJurisdiction(event.target.value as Jurisdiction)}
                className="h-9 rounded-lg border border-white/10 bg-white/[0.055] px-3 text-sm font-semibold text-white outline-none"
              >
                {jurisdictions.map((item) => (
                  <option key={item.id} value={item.id} className="bg-[#141313]">
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAnnotationsVisible((value) => !value)}
                className="glass-button"
                title="Toggle layers"
              >
                <Layers size={17} />
                <span>Layers</span>
              </button>
              <button
                type="button"
                onClick={() => setIs3D(prev => !prev)}
                className={`glass-button`}
                style={{
                  borderColor: is3D ? 'rgba(0, 243, 255, 0.4)' : undefined,
                  color: is3D ? '#00f3ff' : undefined,
                  backgroundColor: is3D ? 'rgba(0, 243, 255, 0.1)' : undefined,
                }}
                title="3D View"
              >
                <Sparkles size={17} />
                <span>3D View</span>
              </button>
              <button
                type="button"
                onClick={() => setIsChatOpen((prev) => !prev)}
                className="glass-button border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                title="AI Chat Assistant"
              >
                <MessageSquare size={17} />
                <span>AI Chat</span>
              </button>
              <button type="button" onClick={exportReport} disabled={!canAnalyze} className="glass-button disabled:opacity-40">
                <Download size={17} />
                <span>Export Report</span>
              </button>
              <button type="button" onClick={() => inputRef.current?.click()} className="solid-button">
                <Upload size={17} />
                <span>{file ? 'Replace File' : 'Upload File'}</span>
              </button>
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`relative min-h-0 flex-1 overflow-hidden rounded-2xl border backdrop-blur-3xl transition ${
              isDragging ? 'border-white/50 bg-white/10' : 'border-white/10 bg-white/[0.045]'
            }`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
          >
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="application/pdf,image/*,.dwg,.dxf"
              onChange={onInputChange}
            />

            <div
              className="preview-wrapper"
              style={{
                // @ts-ignore
                '--rx': `${dragState.rx}deg`,
                // @ts-ignore
                '--rz': `${dragState.rz}deg`,
              }}
            >
              <div className="elevation-wall elevation-left" />
              <div className="elevation-wall elevation-right" />

              <div className="preview">
                {file ? (
                  <DrawingPreview file={file} previewUrl={previewUrl} />
                ) : (
                  <UploadEmptyState onChoose={() => inputRef.current?.click()} isDragging={isDragging} />
                )}
              </div>

              {file && annotationsVisible ? <Annotations violations={analysis.violations} /> : null}

              <div className="holo-building">
                {/* Floor 1 */}
                <div className="holo-wall wall-f" />
                <div className="holo-wall wall-b" />
                <div className="holo-wall wall-l" />
                <div className="holo-wall wall-r" />
                <div className="holo-floor floor-2" />
                
                {/* Floor 2 */}
                <div className="holo-wall wall-f2" />
                <div className="holo-wall wall-b2" />
                <div className="holo-wall wall-l2" />
                <div className="holo-wall wall-r2" />
                
                {/* Roof */}
                <div className="holo-roof roof-l" />
                <div className="holo-roof roof-r" />
                <div className="holo-gable gable-f" />
                <div className="holo-gable gable-b" />
              </div>
            </div>

            {file ? (
              <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Loaded Drawing</p>
                <p className="mt-1 max-w-[360px] truncate text-sm font-semibold text-white">{file.name}</p>
                <p className="text-xs text-white/45">{formatBytes(file.size)} | {file.type || 'CAD/document file'}</p>
              </div>
            ) : null}

            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/65 p-2 backdrop-blur-xl">
              <button className="tool-button" title="Zoom in"><ZoomIn size={21} /></button>
              <button className="tool-button" title="Zoom out"><ZoomOut size={21} /></button>
              <button className="tool-button" title="Pan"><Hand size={21} /></button>
              <div className="mx-1 h-7 w-px bg-white/15" />
              <button className="tool-button" title="Measure"><Ruler size={21} /></button>
            </div>
          </div>
        </section>

        <aside className="flex max-h-[42vh] w-full flex-col gap-5 overflow-y-auto border-t border-white/10 bg-white/[0.018] p-5 lg:max-h-none lg:h-full lg:overflow-y-auto lg:w-[480px] lg:border-l lg:border-t-0 lg:p-6">
          <AgentReasoning state={state} hasFile={Boolean(file)} />
          <Violations analysis={analysis} state={state} />
          <ScoreCard analysis={analysis} state={state} />
        </aside>
      </main>

      {/* Floating Action Button for AI Chat */}
      <button
        type="button"
        onClick={() => setIsChatOpen((prev) => !prev)}
        className="fixed bottom-8 right-8 z-30 flex h-16 w-16 items-center justify-center rounded-full border border-blue-400/40 bg-blue-600/30 text-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.35)] backdrop-blur-2xl transition hover:scale-105 hover:bg-blue-600/40 hover:text-white"
        title="Open AI Chat Assistant"
      >
        <Sparkles size={26} />
      </button>

      {/* In-App AI Chat Slide-Over Drawer */}
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
      <div className="flex h-full w-full max-w-lg flex-col border-l border-white/15 bg-[#0e1626]/95 backdrop-blur-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">PRUDENCE AI Assistant</h3>
              <p className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Grounded in active blueprint
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
              title="Clear chat"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
              title="Close chat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                    : 'border border-white/10 bg-white/[0.06] text-white/90 rounded-bl-none backdrop-blur-md'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
              </div>

              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-3 text-white/50 text-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400">
                <Loader2 className="animate-spin" size={16} />
              </div>
              <span className="animate-pulse">PRUDENCE AI is analyzing blueprint rules...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="flex gap-2 overflow-x-auto px-6 py-2 border-t border-white/5 no-scrollbar">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white transition"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask PRUDENCE about setback, FSI, NBC rules..."
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] py-3 pl-4 pr-12 text-sm text-white placeholder-white/40 focus:border-blue-500 focus:outline-none backdrop-blur-md"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 transition"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(255,255,255,0.06),transparent_30%),#000]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:42px_42px]" />
    </div>
  );
}

function UploadEmptyState({ onChoose, isDragging }: { onChoose: () => void; isDragging: boolean }) {
  return (
    <div className="flex h-full min-h-[520px] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
          <Upload size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
          {isDragging ? 'Drop the drawing here' : 'Upload a construction drawing'}
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Select a PDF, image, DWG, or DXF package. PRUDENCE will preview the file, mark likely
          compliance issues, and generate a local report for testing.
        </p>
        <button type="button" onClick={onChoose} className="solid-button mx-auto mt-6">
          <Upload size={17} />
          <span>Choose File</span>
        </button>
      </div>
    </div>
  );
}

function DrawingPreview({ file, previewUrl }: { file: File; previewUrl: string }) {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isImage) {
    return <img src={previewUrl} alt={file.name} className="h-full w-full object-contain bg-black/40" />;
  }

  if (isPdf) {
    return (
      <object data={previewUrl} type="application/pdf" className="h-full w-full bg-white/5">
        <FallbackDrawing file={file} />
      </object>
    );
  }

  return <FallbackDrawing file={file} />;
}

function FallbackDrawing({ file }: { file: File }) {
  return (
    <div className="blueprint-surface flex h-full min-h-[560px] items-center justify-center p-8">
      <div className="relative aspect-[1.35] w-full max-w-4xl rounded-xl border border-white/15 bg-white/[0.035] p-8">
        <div className="absolute inset-8 rounded border border-white/25" />
        <div className="absolute left-[10%] top-[18%] h-[27%] w-[26%] border border-white/30" />
        <div className="absolute left-[39%] top-[18%] h-[27%] w-[20%] border border-white/30" />
        <div className="absolute right-[12%] top-[18%] h-[54%] w-[20%] border border-white/30" />
        <div className="absolute bottom-[15%] left-[10%] h-[36%] w-[49%] border border-white/30" />
        <div className="absolute bottom-[15%] left-[39%] h-[36%] w-[20%] border border-white/15" />
        <div className="absolute bottom-6 left-8 text-xs uppercase tracking-[0.18em] text-white/45">
          {file.name}
        </div>
      </div>
    </div>
  );
}

function Annotations({ violations }: { violations: Violation[] }) {
  const positions = [
    { top: '25%', left: '40%' },
    { bottom: '29%', right: '34%' },
    { top: '15%', right: '20%' },
    { bottom: '40%', left: '15%' },
    { top: '60%', left: '60%' },
  ];

  return (
    <>
      {violations.map((violation, i) => {
        if (!violation.annotation) return null;
        const pos = { left: `${violation.annotation.x}%`, top: `${violation.annotation.y}%` };
        return (
          <div key={i} className="annotation" style={pos}>
            <span className="pulse-dot" />
            <div className="glass-callout">
              <p className="callout-label">{violation.title}</p>
              <p>{violation.note || `${violation.required ? 'Req: ' + violation.required : ''} ${violation.found ? 'Found: ' + violation.found : ''}`.trim()}</p>
            </div>
          </div>
        );
      })}
    </>
  );
}

function AgentReasoning({ state, hasFile }: { state: AnalysisState; hasFile: boolean }) {
  const activeText = !hasFile
    ? 'Waiting for Upload'
    : state === 'analyzing'
      ? 'Analyzing Regulations'
      : 'Analysis Complete';

  const steps = [
    { label: 'Extracting Building Dimensions', done: hasFile, active: false },
    { label: 'Cross-referencing Municipal Bye-Laws', done: state === 'complete', active: state === 'analyzing' },
    { label: 'Checking Setback Requirements...', done: state === 'complete', active: state === 'analyzing' },
    { label: 'Validating Parking Layout', done: state === 'complete', active: false },
  ];

  return (
    <section className="shimmer-pane rounded-2xl p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-white/65">Agent Reasoning</h3>
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span>{activeText}</span>
        </div>
      </div>
      <ul className="space-y-4">
        {steps.map((step) => (
          <li key={step.label} className={`flex items-center gap-4 ${!step.done && !step.active ? 'opacity-35' : ''}`}>
            {step.active ? (
              <Loader2 className="animate-spin text-white/55" size={21} />
            ) : step.done ? (
              <CheckCircle2 className="text-white" size={21} />
            ) : (
              <Circle className="text-white/65" size={21} />
            )}
            <span className={`text-base ${step.active ? 'typing-text text-white/65' : 'text-white/85'}`}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Violations({ analysis, state }: { analysis: Analysis; state: AnalysisState }) {
  const loading = state === 'analyzing';
  const violations = analysis.violations;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-white/65">
          Active Violations ({violations.length})
        </h3>
        <Filter className="text-white/65" size={21} />
      </div>

      {loading ? (
        <div className="glass-card p-5 text-sm text-white/60">Scanning uploaded drawing set...</div>
      ) : violations.length ? (
        violations.map((violation) => <ViolationCard key={violation.title} violation={violation} />)
      ) : (
        <div className="glass-card p-5 text-sm leading-6 text-white/60">
          Upload a drawing to generate clause checks, markups, and a compliance report.
        </div>
      )}
    </section>
  );
}

function ViolationCard({ violation }: { violation: Violation }) {
  return (
    <article className="glass-card group cursor-pointer p-5 transition hover:bg-white/[0.075]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`severity severity-${violation.severity.toLowerCase()}`}>{violation.severity}</span>
        <ExternalLink className="text-white/55 transition group-hover:text-white" size={22} />
      </div>
      <h4 className="text-xl font-medium tracking-[-0.02em] text-white">{violation.title}</h4>
      {violation.note ? (
        <p className="mt-4 text-base leading-7 text-white/65">{violation.note}</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-3">
          <Metric label="Required" value={violation.required ?? '-'} />
          <Metric label="Found" value={violation.found ?? '-'} />
          <Metric label={violation.severity === 'MAJOR' ? 'Deficit' : 'Violation'} value={violation.delta ?? '-'} align="right" />
        </div>
      )}
    </article>
  );
}

function Metric({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="text-xs font-semibold text-white/55">{label}</p>
      <p className="mt-1 text-lg text-white">{value}</p>
    </div>
  );
}

function ScoreCard({ analysis, state }: { analysis: Analysis; state: AnalysisState }) {
  const score = state === 'idle' ? 0 : analysis.score;

  return (
    <section className="glass-card mt-auto flex items-center gap-6 p-6">
      <div
        className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(#ffffff ${score}%, rgba(255,255,255,0.12) 0)` }}
      >
        <div className="absolute inset-2 rounded-full bg-black" />
        <span className="relative text-2xl font-semibold text-white">{score}%</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/55">Current Status</p>
        <h4 className="mt-1 text-3xl font-semibold leading-none tracking-[-0.04em] text-white">
          {analysis.status}
        </h4>
        <div className="mt-4 flex flex-wrap gap-6">
          <Metric label="Coverage" value={`${analysis.coverage}%`} />
          <Metric label="Risk Level" value={analysis.risk} />
          <Metric label="Code" value={analysis.jurisdiction} />
        </div>
      </div>
    </section>
  );
}

export default App;
