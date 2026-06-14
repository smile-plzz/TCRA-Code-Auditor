import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Settings, 
  Terminal, 
  Sliders, 
  FileCode2, 
  CheckCircle, 
  AlertTriangle, 
  Printer, 
  ArrowRight, 
  ChevronRight, 
  Info, 
  Lock, 
  RefreshCw, 
  ExternalLink,
  Code2,
  FileCheck2,
  Cpu,
  BadgeAlert,
  Search,
  Sparkles
} from "lucide-react";

// Score colors matching dimension ranks
const SCORE_COLORS = ["#f43f5e", "#fb923c", "#38bdf8", "#34d399"];
const SCORE_BORDER_COLORS = ["border-rose-500/30", "border-orange-500/30", "border-sky-500/30", "border-emerald-500/30"];
const SCORE_BG_COLORS = ["bg-rose-500/10", "bg-orange-500/10", "bg-sky-500/10", "bg-emerald-500/10"];
const SCORE_LABELS = ["Poor", "Basic", "Good", "Excellent"];

const CLASSIFICATION_DATA = {
  "Automated Execution": {
    color: "#f43f5e",
    bg: "bg-rose-950/40 border-rose-500/30 text-rose-300",
    desc: "Code exhibits minimum traceability and requires full human rewriting to be reliable or steerable."
  },
  "Assisted Automation": {
    color: "#fb923c",
    bg: "bg-orange-950/40 border-orange-500/30 text-orange-300",
    desc: "AI assists with coarse structure, but localized anomalies and high steering overhead persist."
  },
  "Delegated Reasoning": {
    color: "#3b82f6",
    bg: "bg-blue-950/40 border-blue-500/30 text-blue-300",
    desc: "Deep algorithmic logic is correctly modeled with robust execution paradigms, requiring minor human audit."
  },
  "Collaborative Intelligence": {
    color: "#10b981",
    bg: "bg-emerald-950/40 border-emerald-500/30 text-emerald-300",
    desc: "Pragmatic, pristine structure pairing full traceability with runnable unit test traces and perfect control bounds."
  }
};

const STEP_LABELS = ["Integrate LLM", "Prompt Seed", "Generated Code", "Audit Report"];

const AI_PROVIDERS = [
  { 
    id: "google", 
    label: "Google Gemini", 
    models: [
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (Balanced)", desc: "Optimized for fast code structure analysis and general syntax proofing." },
      { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Deep Audit)", desc: "Advanced algorithmic reasoning, perfect for finding subtle concurrency or performance bugs." },
      { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite (Fast)", desc: "Ultra-low-latency model with lightweight analytical capabilities." }
    ]
  },
  { 
    id: "openai", 
    label: "OpenAI GPT", 
    models: [
      { id: "gpt-4o", label: "GPT-4o (Standard)", desc: "Versatile model suitable for broad framework inspection." },
      { id: "gpt-4o-mini", label: "GPT-4o-mini (Light)", desc: "Faster, cost-effective audits on straightforward code templates." }
    ]
  },
  { 
    id: "anthropic", 
    label: "Anthropic Claude", 
    models: [
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", desc: "Top-tier syntactic trace, excellent mapping of prompt constraints." },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", desc: "Quick and punchy audits on single-file code representations." }
    ]
  }
];

// Preloaded sample prompts and code to quickly demo the auditor
const EXAMPLES = [
  {
    title: "Vibecoded Timer App (React)",
    prompt: "Create a simple timer app in React. Include play, pause, reset, and custom input for minutes.",
    code: `import React, { useState, useEffect } from "react";

export default function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [active, setActive] = useState(false);
  const [inputVal, setInputVal] = useState("");

  useEffect(() => {
    let interval = null;
    if (active) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1); // wait, this ticks upwards, doesn't count down!
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [active]);

  const handleStart = () => setActive(true);
  const handlePause = () => setActive(false);
  const handleReset = () => {
    setSeconds(0);
    setActive(false);
  };

  const handleSetTime = () => {
    setSeconds(parseInt(inputVal) * 60 || 0);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Timer: {seconds}s</h1>
      <button onClick={handleStart}>Start</button>
      <button onClick={handlePause}>Pause</button>
      <button onClick={handleReset}>Reset</button>
      <input value={inputVal} onChange={e => setInputVal(e.target.value)} />
      <button onClick={handleSetTime}>Set</button>
    </div>
  );
}`
  },
  {
    title: "Secure Auth Handler (Express)",
    prompt: "Write an Express backend handler that decodes a JWT token, updates user status in memory, and handles validation errors securely.",
    code: `const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

let users = {}; // memory user DB

router.post('/update-status', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('No header');
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, 'super_secret_unconfigurable_key_123'); // Hardcoded key!
    const username = payload.username;
    
    users[username] = {
      status: req.body.status,
      lastUpdated: new Date()
    };
    
    res.json({ success: true, user: users[username] });
  } catch(e) {
    // Silent failure
    res.status(500).send('Error');
  }
});

module.exports = router;`
  }
];

export default function App() {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState("google");
  const [model, setModel] = useState("gemini-3.5-flash");
  
  // Custom Key toggle and State
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  
  // Audit variables
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [result, setResult] = useState<any>(null);
  
  // Process UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync model on provider shift
  const handleProviderChange = (provId: string) => {
    setProvider(provId);
    const firstModel = AI_PROVIDERS.find(p => p.id === provId)?.models[0]?.id || "";
    setModel(firstModel);
    
    // Default mode setup: Anthropic & OpenAI do not have Workspace server keys, so force custom key toggle if selected
    if (provId !== "google") {
      setUseCustomKey(true);
    } else {
      setUseCustomKey(false);
    }
  };

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setAiPrompt(ex.prompt);
    setGeneratedCode(ex.code);
    setStep(2); // Jump directly to code review step
  };

  const handleRunAudit = async () => {
    if (!generatedCode.trim()) {
      setError("Please input some code to audit.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: generatedCode,
          prompt: aiPrompt,
          provider,
          model,
          apiKey: useCustomKey ? apiKey.trim() : ""
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      setResult(data);
      setStep(3); // Transit to final report stage
    } catch (err: any) {
      setError(err.message || "Auditing process met an unexpected network or parsing error.");
    } finally {
      setLoading(false);
    }
  };

  // Step safety triggers
  const canProceedStep0 = !useCustomKey || apiKey.trim().length > 6;
  const canProceedStep1 = true; // prompt seed context is highly useful but optional
  const canProceedStep2 = generatedCode.trim().length > 10;

  // Render mathematical svg radar
  const RadarChart = ({ scores }: { scores: any }) => {
    const cx = 110, cy = 110, r = 70;
    const dims = [
      { label: "Transparency", val: scores.transparency?.score ?? 0, angle: -Math.PI / 2 },
      { label: "Controllability", val: scores.controllability?.score  ?? 0, angle: 0 },
      { label: "Reliability", val: scores.reliability?.score ?? 0, angle: Math.PI / 2 },
      { label: "Auditability", val: scores.auditability?.score ?? 0, angle: Math.PI }
    ];

    const toXY = (angle: number, val: number) => ({
      x: cx + (r * (val / 3)) * Math.cos(angle),
      y: cy + (r * (val / 3)) * Math.sin(angle),
    });

    const polygonPoints = dims.map(d => toXY(d.angle, d.val));
    const polyStr = polygonPoints.map(p => `${p.x},${p.y}`).join(" ");

    return (
      <svg width={220} height={220} className="mx-auto block" id="tcra-radar-chart">
        {/* Radial grid circles (Scale 1 to 3) */}
        {[1, 2, 3].map(level => {
          const gridPoints = dims.map(d => toXY(d.angle, level));
          const gridStr = gridPoints.map(p => `${p.x},${p.y}`).join(" ");
          return (
            <polygon key={level}
              points={gridStr}
              fill="none" 
              className="stroke-slate-800/80" 
              strokeWidth={1}
              strokeDasharray={level < 3 ? "2 2" : "none"}
            />
          );
        })}
        {/* Helper diagonal/orthogonal axes lines */}
        {dims.map((d, i) => {
          const axisTarget = toXY(d.angle, 3);
          return (
            <line key={i} x1={cx} y1={cy} x2={axisTarget.x} y2={axisTarget.y} className="stroke-slate-800" strokeWidth={1} />
          );
        })}
        {/* Plotted Area */}
        {polyStr && (
          <polygon points={polyStr} fill="rgba(14, 165, 233, 0.15)" className="stroke-sky-400" strokeWidth={2.5} />
        )}
        {/* Node point handles */}
        {polygonPoints.map((p, i) => {
          const score = dims[i].val;
          return (
            <circle key={i} cx={p.x} cy={p.y} r={4.5} fill={SCORE_COLORS[score] || "#e2e8f0"} className="stroke-slate-950" strokeWidth={2} />
          );
        })}
        {/* Text Labels */}
        {dims.map((d, i) => {
          const labelDist = r + 18;
          const labelX = cx + labelDist * Math.cos(d.angle);
          const labelY = cy + labelDist * Math.sin(d.angle) + 4;
          let anchor = "middle";
          if (Math.abs(Math.cos(d.angle)) > 0.1) {
            anchor = Math.cos(d.angle) > 0 ? "start" : "end";
          }
          return (
            <text key={i} x={labelX} y={labelY} textAnchor={anchor} className="fill-slate-400 font-mono text-[10px] uppercase tracking-wider font-bold">
              {d.label[0]}
            </text>
          );
        })}
      </svg>
    );
  };

  const ScoreBar = ({ score, label }: { score: number; label: string }) => (
    <div className="mb-4" id={`score-bar-${label.toLowerCase()}`}>
      <div className="flex justify-between mb-1.5 items-center">
        <span className="text-xs font-mono tracking-wider font-medium text-slate-400 uppercase">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color: SCORE_COLORS[score] }}>
          {score}/3 — {SCORE_LABELS[score]}
        </span>
      </div>
      <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(score / 3) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${SCORE_COLORS[score]}bb, ${SCORE_COLORS[score]})` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-sky-500/20 antialiased font-sans flex flex-col">
      
      {/* Absolute top dashboard ribbon branding */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-[1px] flex items-center justify-center">
            <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">TCRA Code Auditor</h1>
              <span className="text-[10px] font-mono font-bold tracking-widest leading-none bg-sky-950 border border-sky-800/60 text-sky-400 px-2 py-0.5 rounded-full uppercase">
                PRO v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-wide mt-0.5">
              Transparency • Controllability • Reliability • Auditability
            </p>
          </div>
        </div>

        {/* Demo examples helper / provider overview */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Quick Demos:
          </span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => loadExample(ex)}
              className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
            >
              <Code2 className="w-3 h-3 text-sky-500" /> {ex.title.split(" ")[0]}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-10 flex flex-col justify-between">
        
        {/* Step Stepper Visual Indicator */}
        <div className="w-full mb-10 overflow-x-auto no-scrollbar">
          <div className="flex items-center min-w-[620px] justify-between border-b border-slate-900 pb-4">
            {STEP_LABELS.map((label, idx) => {
              const isPast = idx < step;
              const isActive = idx === step;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isPast || (idx === 3 && result)) {
                      setStep(idx);
                    }
                  }}
                  disabled={idx > step && !(idx === 3 && result)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 text-sm font-mono tracking-wide transition border-none bg-transparent ${
                    isActive 
                      ? "text-sky-400 font-bold" 
                      : isPast 
                        ? "text-emerald-400 cursor-pointer hover:opacity-80" 
                        : "text-slate-600 cursor-not-allowed"
                  }`}
                  id={`stepper-btn-${idx}`}
                >
                  <span className={`w-6 h-6 rounded-full text-xs font-bold font-mono border flex items-center justify-center transition-all ${
                    isActive 
                      ? "bg-sky-500/10 border-sky-500 text-sky-400" 
                      : isPast 
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                        : "border-slate-800 text-slate-600 bg-slate-950/20"
                  }`}>
                    {isPast ? "✓" : idx + 1}
                  </span>
                  <span>{label}</span>
                  {idx < STEP_LABELS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-700 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Step Viewport with AnimatePresence */}
        <div className="flex-1 min-h-[460px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 0: AI Provider & Key Management */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
                id="step-view-api-setup"
              >
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white mb-2 flex items-center gap-2">
                    <Cpu className="w-6 h-6 text-sky-400" /> Orchestrate Auditor Node
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                    Select your preferred LLM provider, audit logic engine model, and define credentials. Safe backend execution prevents any exposure of your cryptographic credentials.
                  </p>
                </div>

                {/* Provider Grid */}
                <div className="space-y-4">
                  <span className="block text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                    1. LLM Evaluation Engine
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {AI_PROVIDERS.map(p => {
                      const isSelected = provider === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleProviderChange(p.id)}
                          className={`p-5 rounded-xl text-left border transition-all hover:border-slate-700 ${
                            isSelected 
                              ? "bg-slate-950 border-sky-500/60 shadow-lg shadow-sky-500/5 ring-1 ring-sky-500/30" 
                              : "bg-slate-950/40 border-slate-900"
                          }`}
                          id={`provider-select-${p.id}`}
                        >
                          <span className="block font-semibold text-sm text-white mb-1">
                            {p.label}
                          </span>
                          <span className="text-xs text-slate-400 font-mono font-medium block">
                            {p.id === "google" ? "Standard GenAI SDK" : p.id === "openai" ? "v1 Completions PROXY" : "Anthropic Native Port"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Model Selector Card */}
                <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                      2. Auditor Reasoning Model
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AI_PROVIDERS.find(p => p.id === provider)?.models.map(m => (
                      <label
                        key={m.id}
                        className={`p-4 rounded-lg border cursor-pointer transition flex items-start gap-3 ${
                          model === m.id 
                            ? "bg-slate-900/50 border-sky-400/40 text-white" 
                            : "bg-slate-950 border-slate-900 hover:border-slate-800 text-slate-300"
                        }`}
                        id={`model-option-${m.id}`}
                      >
                        <input
                          type="radio"
                          name="model_selector"
                          value={m.id}
                          checked={model === m.id}
                          onChange={() => setModel(m.id)}
                          className="mt-1 accent-sky-400"
                        />
                        <div>
                          <div className="text-xs font-mono font-bold text-white mb-1 font-semibold">{m.id}</div>
                          <div className="text-xs text-slate-400 font-normal leading-relaxed">{m.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Key Config */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                      3. Cryptographic Key Credentials
                    </span>
                    {provider === "google" && (
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setUseCustomKey(false)}
                          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition ${
                            !useCustomKey 
                              ? "bg-sky-500/10 border-sky-500/40 text-sky-400" 
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          Workspace Preset Key
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseCustomKey(true)}
                          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition ${
                            useCustomKey 
                              ? "bg-sky-500/10 border-sky-500/40 text-sky-400" 
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          My Custom Key
                        </button>
                      </div>
                    )}
                  </div>

                  {!useCustomKey && provider === "google" ? (
                    <div className="p-5 bg-sky-950/20 border border-sky-900/30 rounded-xl flex items-start gap-3.5">
                      <Lock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-sky-300 mb-1">Implicit Workspace Credentials Active</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          The system represents code analysis natively using standard server prefilled credentials. Setup credentials via the **Settings &gt; Secrets** panel anytime.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type={showKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={
                            provider === "google" 
                              ? "Enter Gemini Key (AIza...)" 
                              : provider === "openai" 
                                ? "Enter OpenAI Secret API Key (sk-...)" 
                                : "Enter Anthropic API Key (sk-ant-...)"
                          }
                          className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-3.5 text-sm text-slate-200 font-mono tracking-wide focus:border-sky-500/60 focus:bg-slate-950 hover:border-slate-800 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 hover:text-white text-xs font-mono text-slate-500 py-1 px-1.5 select-none"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-500 font-mono tracking-tight leading-relaxed">
                          Your key is processed temporarily inside secure transient memory and never recorded on third party database tables.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setStep(1)}
                    disabled={!canProceedStep0}
                    className="w-full md:w-auto bg-sky-500 hover:bg-sky-400 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 px-6 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
                    id="step0-next-btn"
                  >
                    Configure Generation Prompt <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 1: Prompt Context Specifier */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
                id="step-view-prompt-setting"
              >
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white mb-2 flex items-center gap-2">
                    <Terminal className="w-6 h-6 text-sky-400" /> Embed Generation Context
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                    Provide the original prompt or directives used to instruct the generator model. The auditor maps strict goal compliance, identifying where the AI drifted from architectural requests.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
                    Original Prompt Input (Highly Recommended)
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder='e.g. "Generate an Express route handler to query safe files by path. Avoid absolute path escapes, enforce authorization tokens."'
                    rows={6}
                    className="w-full bg-slate-950/50 border border-slate-900 rounded-xl p-4 text-sm text-slate-300 leading-relaxed focus:bg-slate-950 focus:border-sky-500/60 outline-none transition resize-vertical font-sans placeholder-slate-600"
                  />
                </div>

                <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-lg text-xs leading-relaxed text-slate-500 font-mono flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    Providing explicit prompt constraints helps trace local controllability bounds. If left completely empty, the audit engine assumes standard execution goals during semantic reviews.
                  </span>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep(0)}
                    className="border border-slate-800 hover:border-slate-700 font-mono text-xs uppercase tracking-wider text-slate-400 hover:text-white px-5 py-3.5 rounded-xl transition"
                    id="step1-back-btn"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="bg-sky-500 hover:bg-sky-400 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-mono text-xs uppercase tracking-wider font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 transition"
                    id="step1-next-btn"
                  >
                    Load AI Code <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Raw Code Input */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
                id="step-view-code-input"
              >
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white mb-2 flex items-center gap-2">
                    <FileCode2 className="w-6 h-6 text-sky-400" /> Load Vibecoded Code Payload
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                    Paste the raw generated source code you intend to map. The compiler will feed this payload to the selected model proxy along with your seed prompt rules.
                  </p>
                </div>

                {aiPrompt && (
                  <div className="bg-slate-950/60 border border-slate-900/60 p-3 px-4 rounded-lg flex gap-3.5 items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-mono leading-none bg-slate-900 text-slate-400 border border-slate-800/80 px-2 py-0.5 rounded uppercase mt-0.5 select-none">
                        PROMPT
                      </span>
                      <p className="text-xs text-slate-400 line-clamp-1 italic">
                        "{aiPrompt}"
                      </p>
                    </div>
                    <button 
                      onClick={() => setStep(1)} 
                      className="text-[10px] text-sky-400 hover:underline font-mono border-none bg-transparent"
                    >
                      Edit
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
                    Source Code Area (minimum 10 chars)
                  </label>
                  <textarea
                    value={generatedCode}
                    onChange={(e) => setGeneratedCode(e.target.value)}
                    placeholder={`Paste code here...\n\ne.g.\nfunction queryDb(id) {\n  return db.query("SELECT * FROM users WHERE id = " + id);\n}`}
                    rows={14}
                    className="w-full bg-slate-950/80 border border-slate-900 rounded-xl p-4 text-xs text-slate-300 leading-relaxed font-mono focus:bg-slate-950 focus:border-sky-500/60 outline-none transition resize-vertical"
                  />
                  {generatedCode && (
                    <div className="text-[10px] font-mono text-slate-600 tracking-wider flex justify-between px-1 select-none">
                      <span>LINES: {generatedCode.split("\n").length}</span>
                      <span>CHARACTERS: {generatedCode.length}</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-mono leading-relaxed flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {loading ? (
                  <div className="p-6 bg-slate-950 border border-slate-900 rounded-xl space-y-4 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-semibold tracking-wide text-white">Synthesizing Audit Metrics</h4>
                      <p className="text-xs text-slate-400 max-w-sm leading-normal font-mono">
                        Connecting to server proxy using model: {model}...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setStep(1)}
                      className="border border-slate-800 hover:border-slate-700 font-mono text-xs uppercase tracking-wider text-slate-400 hover:text-white px-5 py-3.5 rounded-xl transition"
                      id="step2-back-btn"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleRunAudit}
                      disabled={!canProceedStep2}
                      className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-950 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-mono text-xs uppercase tracking-wider font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition"
                      id="step2-audit-btn"
                    >
                      Initialize TCRA Evaluation <ShieldCheck className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: Complete Audit Report Dashboard */}
            {step === 3 && result && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 print:space-y-8"
                id="audit-report-dashboard"
              >
                
                {/* Print layout branding/header (only active when exporting) */}
                <div className="hidden print:block border-b-2 border-slate-950 pb-4 mb-6">
                  <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-950">
                    TCRA Framework Code Audit Response
                  </h1>
                  <span className="text-xs font-mono font-medium text-slate-500">
                    Audit Date: {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}
                  </span>
                </div>

                {/* Report Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5 mb-2 print:hidden">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">System Diagnostics Complete</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Evaluated on {provider === "google" ? "Google Gemini" : provider === "openai" ? "OpenAI" : "Anthropic"} ({model})
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        setResult(null);
                        setStep(2);
                      }}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-mono text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition"
                      id="report-re-audit-btn"
                    >
                      ← Recheck
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:border-sky-500/50 font-mono text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition"
                      id="report-print-btn"
                    >
                      <Printer className="w-3.5 h-3.5" /> Export PDF Code audit
                    </button>
                  </div>
                </div>

                {/* Layout Grid: Spider / Summary Panel & Progress Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                  
                  {/* Radar Left Section */}
                  <div className="md:col-span-5 bg-slate-950/40 border border-slate-900 p-6 rounded-xl flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block mb-1">
                        Composite Metric
                      </span>
                      <h3 className="text-sm font-semibold text-slate-300">TCRA Radar Intersection Map</h3>
                    </div>
                    
                    <div className="py-4">
                      <RadarChart scores={result} />
                    </div>

                    <div className="border-t border-slate-900/60 pt-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block">
                          COMPOSITE TCRA VALUE
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-4xl font-extrabold font-mono text-sky-400 leading-none">
                            {result.composite ?? 0}
                          </span>
                          <span className="text-xs font-mono text-slate-600 font-medium">/ 12</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block">
                          RATING
                        </span>
                        <span 
                          className="text-xs font-mono font-bold mt-1 inline-block px-2 py-0.5 rounded uppercase"
                          style={{ 
                            color: SCORE_COLORS[Math.min(Math.floor((result.composite ?? 0) / 3), 3)],
                            backgroundColor: `${SCORE_COLORS[Math.min(Math.floor((result.composite ?? 0) / 3), 3)]}15`
                          }}
                        >
                          {result.composite >= 10 ? "EPIC" : result.composite >= 7 ? "STABLE" : result.composite >= 4 ? "COARSE" : "ERRATIC"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Dimension bar Indicators Right Section */}
                  <div className="md:col-span-7 bg-slate-950/40 border border-slate-900 p-6 rounded-xl flex flex-col justify-between space-y-5">
                    
                    {/* Automation Tier Indicator */}
                    <div className={`p-4 rounded-lg border flex gap-3.5 items-start ${CLASSIFICATION_DATA[result.classification as keyof typeof CLASSIFICATION_DATA]?.bg || "bg-slate-900 border-slate-800"}`}>
                      <BadgeAlert className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-mono font-extrabold uppercase tracking-widest text-slate-500 mb-1 leading-none select-none">
                          Classification Boundary
                        </div>
                        <h4 className="text-sm font-bold tracking-wide">
                          {result.classification ?? "Automated Execution"}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1">
                          {result.classificationSummary || CLASSIFICATION_DATA[result.classification as keyof typeof CLASSIFICATION_DATA]?.desc}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking bars */}
                    <div className="space-y-1">
                      <ScoreBar score={result.transparency?.score ?? 0} label="Transparency" />
                      <ScoreBar score={result.controllability?.score ?? 0} label="Controllability" />
                      <ScoreBar score={result.reliability?.score ?? 0} label="Reliability" />
                      <ScoreBar score={result.auditability?.score ?? 0} label="Auditability" />
                    </div>
                  </div>
                </div>

                {/* Deep qualitative evaluation of individual dimensions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { key: "transparency", label: "Transparency", lens: "Semantic Explanation Tracer", desc: "Measures documentation completeness, trace explanations and rationale mappings." },
                    { key: "controllability", label: "Controllability", lens: "Human Driver Capability", desc: "Assesses how easily the structures conform to targeted variable parameters." },
                    { key: "reliability", label: "Reliability", lens: "Execution Robustness Check", desc: "Detects structural drift, error tolerances and boundary conditions safety." },
                    { key: "auditability", label: "Auditability", lens: "Governance & Diagnostic Logging", desc: "Verifies debug setups, testing hooks, logs and deterministic output metrics." }
                  ].map(({ key, label, lens, desc }) => {
                    const score = result[key]?.score ?? 0;
                    return (
                      <div 
                        key={key} 
                        className={`bg-slate-950/40 border border-slate-900 p-5 rounded-xl flex flex-col justify-between space-y-4`}
                        id={`diagnostic-card-${key}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono tracking-widest font-extrabold uppercase text-slate-500 block leading-none">
                              {label}
                            </span>
                            <span className="text-[10px] font-mono text-sky-400/80 tracking-wide mt-1 inline-block">
                              Lens: {lens}
                            </span>
                          </div>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-lg border ${SCORE_BORDER_COLORS[score]} ${SCORE_BG_COLORS[score]}`} style={{ color: SCORE_COLORS[score] }}>
                            {score}
                          </div>
                        </div>

                        <p className="text-xs text-slate-350 leading-relaxed">
                          {result[key]?.explanation || "No diagnostics configured."}
                        </p>

                        <div className="text-[10px] text-slate-500 font-mono leading-relaxed border-t border-slate-900/60 pt-3 select-none">
                          {desc}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Silent failure points & Risk Assessment */}
                {result.risks && result.risks.length > 0 && (
                  <div className="bg-rose-950/10 border border-rose-900/40 p-6 rounded-xl space-y-4 shadow-sm shadow-rose-950/10">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400 leading-none">
                        Silent failure points &amp; Risk Assessment
                      </span>
                    </div>
                    <div className="space-y-3.5">
                      {result.risks.map((risk: string, i: number) => (
                        <div key={i} className="flex gap-4 items-start pb-3 last:pb-0 last:border-0 border-b border-rose-900/10">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold font-mono bg-rose-500/15 border border-rose-500/20 text-rose-300 mt-0.5 select-none shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-xs text-slate-300 leading-relaxed font-sans">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vibecoded Code Pattern evidence identifier signature */}
                <div className="bg-indigo-950/10 border border-indigo-900/40 p-6 rounded-xl space-y-4 shadow-sm shadow-indigo-950/10">
                  <div className="flex items-center gap-2.5 mb-1 justify-between flex-wrap">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 leading-none">
                        Vibecoded pattern signature detection
                      </span>
                    </div>
                    <span 
                      className={`text-[10px] font-mono leading-none tracking-wider font-bold border px-2 py-1 rounded inline-block uppercase mt-0.5 select-none ${
                        result.isVibecoded 
                          ? "bg-amber-950/30 border-amber-500/30 text-amber-300" 
                          : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {result.isVibecoded ? "✓ AI-generated signature detected" : "✗ Human hand traces detected"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {result.vibecodeEvidence || 
                        "The trace displays standard machine generation parameters. Heavy encapsulation logic with missing error validation chains suggest fine-tuned model assistance."}
                    </p>
                  </div>
                </div>

                {/* Prompt context recap inside report */}
                {aiPrompt && (
                  <div className="bg-slate-950/40 border border-slate-900 p-5 rounded-xl space-y-3">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block mb-1">
                      Seed Directives Trace (Prompt Source)
                    </span>
                    <p className="text-xs text-slate-400 leading-normal font-sans italic">
                      "{aiPrompt}"
                    </p>
                  </div>
                )}

                {/* Footer system diagnostics credits for printing */}
                <div className="pt-8 border-t border-slate-900/80 flex flex-col md:flex-row md:items-center justify-between text-[10px] font-mono text-slate-500 gap-3">
                  <p>TCRA Audit Framework • IIT Jahangirnagar University Core Reference (2025)</p>
                  <p>Model engine: {model}</p>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* Footer Branding block */}
      <footer className="border-t border-slate-950 bg-[#02050c] text-center py-6 px-4 text-[11px] text-slate-500 font-mono tracking-wide print:hidden">
        <div>
          Based on "Transparency, Controllability, Reliability, and Auditability in Generative LLMs Codebases"
        </div>
        <div className="mt-1 text-slate-600">
          Dedicated evaluation proxy server running fully sandboxed locally
        </div>
      </footer>

    </div>
  );
}
