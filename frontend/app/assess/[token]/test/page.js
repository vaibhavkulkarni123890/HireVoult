'use client';
import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import api from '../../../../lib/api';

function formatInput(input) {
  try {
    if (typeof input === 'object') return JSON.stringify(input, null, 2);
    // If string but looks like JSON, format it
    if (typeof input === 'string' && (input.startsWith('[') || input.startsWith('{'))) {
      return JSON.stringify(JSON.parse(input), null, 2);
    }
    return String(input);
  } catch (e) { return String(input); }
}

export default function TestPage({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  
  // Session & Questions
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]); // Raw session questions
  const [sectionQuestions, setSectionQuestions] = useState([]); // Questions for current section
  const [currentQIndex, setCurrentQIndex] = useState(0); // Index within current section
  
  // Section Management
  const [currentSection, setCurrentSection] = useState(1);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isGeneratingS3, setIsGeneratingS3] = useState(false);
  
  // Timer state (Per-question)
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalEstimatedTime, setTotalEstimatedTime] = useState(0);
  const [answerStart, setAnswerStart] = useState(null);
  
  // Answers state
  const [answers, setAnswers] = useState({}); // { questionGlobalIndex: { ... } }
  
  // Proctoring state
  const videoRef = useRef(null);
  const [proctorError, setProctorError] = useState(null);
  const [isTerminated, setIsTerminated] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  
  // Fullscreen Enforcer
  const [showFsWarningOverlay, setShowFsWarningOverlay] = useState(false);
  const [fsWarningTimer, setFsWarningTimer] = useState(10);
  const fsTimerRef = useRef(null);
  
  useEffect(() => {
    let timer;
    if (showFsWarningOverlay && !isTerminated) {
      setFsWarningTimer(10);
      timer = setInterval(() => {
        setFsWarningTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto exit
            setIsTerminated(true);
            setProctorError('Assessment terminated: Fullscreen environment not restored within 10 seconds.');
            logProctorEvent('auto_terminated_fs_timeout', 'Assessment terminated: Fullscreen environment not restored within 10 seconds.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showFsWarningOverlay, isTerminated]);
  
  useEffect(() => {
    const s = sessionStorage.getItem('vh_session');
    if (!s) return router.push(`/assess/${unwrappedParams.token}`);
    
    // GUARD: If already initialized, don't reset back to Section 1
    if (session) return;

    const parsed = JSON.parse(s);
    setSession(parsed);
    setQuestions(parsed.questions);

    // Initial Section setup logic
    const mcqs = parsed.questions.filter(q => q.type === 'mcq');
    const coding = parsed.questions.filter(q => q.type === 'coding');

    if (mcqs.length > 0) {
      setSectionQuestions(mcqs);
      setCurrentSection(1);
      setTimeLeft(mcqs[0].timeLimit || 60);
      setAnswerStart(new Date());
    } else if (coding.length > 0) {
      setSectionQuestions(coding);
      setCurrentSection(2);
      setShowInstructions(true); // Show Section 2 instructions since 1 was skipped
      setTimeLeft(coding[0].timeLimit || 300);
      setAnswerStart(new Date());
    } else {
      // No MCQs, No Coding -> Skip to S3 generation
      startSection3();
    }
    
    // Total time calculation: Sum of ALL per-question timers across all sections
    const totalKnown = parsed.questions.reduce((sum, q) => sum + (q.timeLimit || 180), 0);
    setTotalEstimatedTime(totalKnown);
    
    // Auto-terminate listeners & Strict Proctoring
    const enforceProctoring = (e, type, msg) => {
      e.preventDefault();
      logProctorEvent(type, msg);
    };

    // ── CRITICAL: Block Escape key at capture phase (before browser acts on it) ─────
    const blockEscapeKey = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Block other fullscreen-exiting shortcuts
      if (e.key === 'F11') { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.altKey && e.key === 'F4') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.key === 'w') { e.preventDefault(); return false; }
      // Block copy/paste/screenshot shortcuts
      if (e.key === 'PrintScreen' || e.key === 'Meta') { enforceProctoring(e, 'copy_attempt', 'Screenshot/meta key blocked'); }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) { enforceProctoring(e, 'copy_attempt', 'Keyboard shortcuts are prohibited'); }
    };
    // `true` = capture phase — fires BEFORE browser default
    document.addEventListener('keydown', blockEscapeKey, true);

    // ── Fullscreen change: display permanent warning overlay if exited ────────────
    const handleFsChange = () => {
      if (document.fullscreenElement) {
        setShowFsWarningOverlay(false);
        return;
      }
      if (isTerminated || isGeneratingS3) return; // Removed showInstructions bypass to force lock during modal
      setShowFsWarningOverlay(true);
      logProctorEvent('fullscreen_exit', 'Fullscreen exit attempt detected. System blocking progression.');
    };

    const handleVisChange = () => {
      if (document.hidden && !isTerminated) logProctorEvent('tab_switch', 'User switched tabs or minimized window.');
    };
    const handleBlur = () => {
      if (!isTerminated) logProctorEvent('tab_switch', 'Window lost focus.');
    };

    document.addEventListener('visibilitychange', handleVisChange);
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', (e) => enforceProctoring(e,'copy_attempt','Copy-paste is disabled'));
    document.addEventListener('cut', (e) => enforceProctoring(e,'copy_attempt','Cut is disabled'));
    document.addEventListener('paste', (e) => enforceProctoring(e,'copy_attempt','Paste is disabled'));
    document.addEventListener('contextmenu', (e) => enforceProctoring(e,'right_click','Right clicking is disabled'));

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(() => setProctorError('Camera disconnected - terminating test'));

    const interval = setInterval(() => {
      takeSnapshot();
      // Belt-and-suspenders: if still not fullscreen after 10 seconds, force it
      if (!document.fullscreenElement && !isTerminated && !showInstructions) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }, 10000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisChange);
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', blockEscapeKey, true);
      clearInterval(interval);
    };
  }, [unwrappedParams.token]); 

  const handleTimeOut = async () => {
    if (isTerminated) return;
    toast.error('Time is up!', { icon: '⏰', duration: 2000 });
    handleNext();
  };

  // Main countdown per-question timer
  useEffect(() => {
    if (timeLeft <= 0 || isTerminated || showInstructions || isGeneratingS3) {
      if (timeLeft === 0 && session && !isTerminated && !showInstructions && !isGeneratingS3) handleTimeOut();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isTerminated, showInstructions, isGeneratingS3]);


  const logProctorEvent = async (type, details, snapshot = null) => {
    if (!session?.id) return;
    try {
      const { data } = await api.post(`/assessment/${session.id}/proctoring`, { type, details, snapshot });
      if (data.status === 'terminated') {
        setIsTerminated(true);
        setProctorError(data.terminationReason);
        try { document.exitFullscreen(); } catch(e){}
      } else {
        // Don't show toast for silent system events (snapshots, etc)
        if (!['fullscreen_exit', 'camera_snapshot'].includes(type)) {
            toast.error(`Proctoring Alert: ${details}`, { icon: '⚠️', duration: 4000 });
        }
      }
    } catch (err) {}
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    
    // Basic "Face Presence" check: Check if the frame is too dark or washed out (blocked camera)
    const frame = ctx.getImageData(0, 0, 320, 240).data;
    let brightness = 0;
    for (let i = 0; i < frame.length; i += 4) {
        brightness += (frame[i] + frame[i+1] + frame[i+2]) / 3;
    }
    brightness = brightness / (320 * 240);
    
    if (brightness < 15 || brightness > 240) { // Extremely dark or bright
        logProctorEvent('face_missing', 'Camera appears blocked or disconnected');
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
    logProctorEvent('camera_snapshot', 'Periodic background snapshot', dataUrl);
  };

  const checkScreenShare = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Heuristic: If there are dummy capturing devices or similar
      // Real blocking requires extension or custom browser, this is a basic check
    } catch(e){}
  };

  const currentQ = sectionQuestions[currentQIndex];

  const saveCurrentAnswer = async () => {
    if (!currentQ) return;
    const ans = answers[currentQ.index] || {};
    const timeSpent = Math.floor((new Date() - answerStart) / 1000);
    
    // For Section 3, we need to pass slightly different data
    const payload = {
      section: currentSection,
      questionIndex: currentQ.index,
      questionType: currentQ.type,
      selectedOption: ans.mcqOption,
      code: ans.code,
      language: ans.lang || (currentQ.type === 'coding' ? (currentQ.starterCode && Object.keys(currentQ.starterCode)[0]) : undefined),
      theoryAnswer: ans.theory,
      startedAt: answerStart,
      timeSpent
    };

    if (currentSection === 3) {
        payload.s3QuestionIndex = currentQ.s3QuestionIndex;
        payload.s3SubQuestionIndex = currentQ.s3SubQuestionIndex;
    }

    try {
      await api.post(`/assessment/${session.id}/answer`, payload);
    } catch (err) {
      console.error('Failed to save answer', err);
    }
  };

  const runCode = async () => {
  if (currentQ?.type !== 'coding' || isTerminated) return;
  const starterCodeObj = currentQ?.starterCode || {};
  const availableLangs = Object.keys(starterCodeObj);
  const defaultLang = availableLangs[0] || 'javascript';
  const ans = answers[currentQ.index] || {};
  const language = ans.lang || defaultLang;
  
  // Fix: Read from language-specific key first, then fall back to ans.code, then starter code
  const code = ans[language] ?? ans.code ?? starterCodeObj[language] ?? starterCodeObj[defaultLang] ?? '';
  
  if (!code) { toast.error('No code to run'); return; }

  try {
    toast.loading('Running code...', { id: 'run' });
    const { data } = await api.post(`/assessment/${session.id}/run`, {
      questionIndex: currentQ.index,
      code: code,
      language
    });
    setAnswers(prev => ({
      ...prev,
      [currentQ.index]: { ...prev[currentQ.index], testResults: data.results }
    }));
    toast.success('Execution finished', { id: 'run' });
  } catch (err) {
    toast.error('Run failed', { id: 'run' });
  }
};

  const handlePrev = () => {
    if (currentQIndex > 0) {
      const prevIdx = currentQIndex - 1;
      setCurrentQIndex(prevIdx);
      setTimeLeft(sectionQuestions[prevIdx].timeLimit || 180);
      setAnswerStart(new Date());
    }
  };

  const handleNext = async () => {
    if (isTerminated || isGeneratingS3) return;
    await saveCurrentAnswer();
    
    if (currentQIndex < sectionQuestions.length - 1) {
      // Move to next question in same section
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setTimeLeft(sectionQuestions[nextIdx].timeLimit || 180);
      setAnswerStart(new Date());
    } else {
      // End of section
      if (currentSection === 1) {
        // S1 -> S2 (Coding)
        const s2Questions = questions.filter(q => q.type === 'coding');
        if (s2Questions.length > 0) {
            setSectionQuestions(s2Questions);
            setCurrentSection(2);
            setCurrentQIndex(0);
            setShowInstructions(true);
            setTimeLeft(s2Questions[0].timeLimit || 300);
            setAnswerStart(new Date());
        } else {
            // Skip S2 if no coding questions? Or go to S3? 
            // Better to go to S3 generation
            startSection3();
        }
      } else if (currentSection === 2) {
        // S2 -> S3 (Logic Verification)
        startSection3();
      } else {
        // End of S3
        handleSubmit();
      }
    }
  };

    const startSection3 = async () => {
    setIsGeneratingS3(true);
    try {
        const { data } = await api.post(`/assessment/${session.id}/generate-s3`);

        // Flatten the grouped questions - STRICTLY take only 1 question per coding problem (max 3 total for 3 coding problems)
        const codingCount = questions.filter(q => q.type === 'coding').length;
        const maxQuestionsPerProblem = 1;
        const maxTotalQuestions = codingCount; // 1 per coding problem

        const s3flat = [];
        data.questions.forEach((prob, pi) => {
            if (pi >= maxTotalQuestions) return; // Skip extra problems
            // Take only the first question from each problem (ignore follow_up and trap excess)
            const firstQuestion = prob.questions[0];
            if (firstQuestion) {
                s3flat.push({
                    ...firstQuestion,
                    type: 'theory',
                    index: `s3_${pi}_0`,
                    problemTitle: prob.problemTitle,
                    timeLimit: prob.timeLimit,
                    s3QuestionIndex: pi,
                    s3SubQuestionIndex: 0
                });
            }
        });

        if (s3flat.length === 0) {
            // No code was submitted, skip S3
            handleSubmit();
            return;
        }

        setSectionQuestions(s3flat);
        setCurrentSection(3);
        setCurrentQIndex(0);
        setShowInstructions(true);
        setTimeLeft(s3flat[0].timeLimit || 120);
        setAnswerStart(new Date());
    } catch (err) {
        toast.error('Failed to generate follow-up questions. Skipping to final submission.');
        handleSubmit();
    } finally {
        setIsGeneratingS3(false);
    }
  };

  const [gradingInProgress, setGradingInProgress] = useState(false);

  const handleSubmit = async () => {
    if (isTerminated) return;
    setGradingInProgress(true);
    try {
      await api.post(`/assessment/${session.id}/submit`);
      try { document.exitFullscreen(); } catch {}
      router.push(`/assess/${unwrappedParams.token}/done`);
    } catch {
      toast.error('Submit failed. Please try again.');
      setGradingInProgress(false);
    }
  };

  if (!session || !currentQ && !isGeneratingS3) return <div className="spinner" style={{ margin: '100px auto' }} />;

  const currentAns = answers[currentQ?.index] || {};
  const starterCodeObj = currentQ?.starterCode || {};
  const availableLangs = Object.keys(starterCodeObj);
  const defaultLang = availableLangs[0] || 'javascript';
  const currentLang = currentAns.lang || defaultLang;
const currentCode = currentAns[currentLang] ?? currentAns.code ?? (availableLangs.length > 0 ? starterCodeObj[currentLang] : '');
  const getSectionLabel = () => {
    const hasS1 = questions.filter(q => q.type === 'mcq').length > 0;
    const hasS2 = questions.filter(q => q.type === 'coding').length > 0;
    // Section 3 (Logic Verification) is always present if coding exists - it's generated after S2
    // Total sections is fixed based on what question types exist (not current position)
    const total = (hasS1 ? 1 : 0) + (hasS2 ? 1 : 0) + (hasS2 ? 1 : 0); // S1 + S2 + S3 always if coding exists

    let displayIdx = 1;
    if (currentSection === 2) displayIdx = hasS1 ? 2 : 1;
    if (currentSection === 3) displayIdx = (hasS1 ? 1 : 0) + (hasS2 ? 1 : 0) + 1;

    return { displayIdx, total };
  };

  const { displayIdx, total } = getSectionLabel();

  const getTimerColor = () => {
    const percentage = (timeLeft / (currentQ?.timeLimit || 60)) * 100;
    if (percentage > 50) return '#10b981'; // Green
    if (percentage > 25) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', position: 'relative' }}>
      {/* Hidden webcam for proctoring */}
      <video ref={videoRef} autoPlay playsInline muted style={{ opacity: 0, position: 'absolute', width: 1, height: 1, zIndex: -100 }} />
      
      {/* Instructions Overlay */}
      {showInstructions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(15px)' }}>
          <div className="gradient-border" style={{ background: '#111118', padding: 40, borderRadius: 20, maxWidth: 600, textAlign: 'left', border: '1px solid var(--border)' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 24, color: '#fff' }}>
                {currentSection === 1 && `Section ${displayIdx}: Multiple Choice Questions`}
                {currentSection === 2 && `Section ${displayIdx}: Coding Problems`}
                {currentSection === 3 && `Section ${displayIdx}: Logic Verification`}
            </h1>
            <div style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 32, fontSize: '1.05rem' }}>
                {currentSection === 1 && (
                    <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
                        <li>Each question has a individual time limit shown on screen</li>
                        <li>Once time runs out the question auto-submits and moves forward</li>
                        <li>You cannot return to previous questions</li>
                        <li>Each question carries equal weightage</li>
                        <li>Read carefully before selecting your answer</li>
                    </ul>
                )}
                {currentSection === 2 && (
                    <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
                        <li>Each problem has an individual time limit shown on screen</li>
                        <li>Use the Run Code button to test your solution before submitting</li>
                        <li>When time runs out your current code is automatically saved</li>
                        <li>You cannot return to previous problems</li>
                        <li>Write clean, efficient code — your approach matters as much as correctness</li>
                        <li>Supported languages: JavaScript and Python</li>
                    </ul>
                )}
                {currentSection === 3 && (
                    <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
                        <li>This section tests whether you genuinely understand the code you wrote</li>
                        <li>You will be asked questions specifically about YOUR solutions from Section 2</li>
                        <li>Each question carries equal weightage to your coding score</li>
                        <li>Questions are based on your specific approach, data structures, and logic choices</li>
                        <li>Answer in your own words — explain your thinking clearly</li>
                        <li>Each question has an individual time limit</li>
                        <li>You cannot return to previous questions</li>
                    </ul>
                )}
            </div>
            <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                onClick={() => {
                    setShowInstructions(false);
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => {});
                    }
                }}
            >
                {currentSection === 3 ? "I Understand, Begin Logic Verification" : "Begin Section"}
            </button>
          </div>
        </div>
      )}

      {/* Generating S3 Loading Screen */}
      {isGeneratingS3 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 24 }}>
            <div className="spinner" style={{ width: 60, height: 60, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#7c3aed' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Analyzing your solutions... Please wait</h2>
        </div>
      )}

      {/* Main UI */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', filter: showInstructions ? 'blur(10px)' : 'none', transition: 'filter 0.3s ease' }}>
        {/* Header */}
        <header style={{ height: 70, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', flexDir: 'column' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Section {displayIdx} / {total}</div>
                    <div style={{ fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>
                        Question {currentQIndex + 1} of {sectionQuestions.length}
                    </div>
                </div>
                <div style={{ height: 30, width: 1, background: 'var(--border)' }} />
                <div style={{ display: 'flex', flexDir: 'column' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL PROGRESS</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                        Est. Total Time: {Math.floor(totalEstimatedTime / 60)}m
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: getTimerColor(), marginBottom: 2 }}>QUESTION TIMER</div>
                    <div style={{ color: getTimerColor(), background: `${getTimerColor()}1A`, border: `1px solid ${getTimerColor()}33`, padding: '6px 20px', borderRadius: 8, fontWeight: 800, fontSize: '1.5rem', fontFamily: 'JetBrains Mono, monospace', minWidth: 100, textAlign: 'center' }}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        className="btn-secondary"
                        onClick={handlePrev}
                        disabled={currentQIndex === 0}
                        style={{ padding: '12px 24px', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10, background: currentQIndex === 0 ? '#1a1a1a' : '#2d2d2d', color: currentQIndex === 0 ? '#555' : '#fff', border: '1px solid #444', cursor: currentQIndex === 0 ? 'not-allowed' : 'pointer' }}
                    >
                        ← Back
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleNext}
                        style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 700, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}
                    >
                        {currentQIndex === sectionQuestions.length - 1 && currentSection === 3 ? 'Finish Assessment' : 'Save & Next →'}
                    </button>
                </div>
            </div>
        </header>

        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left Pane: Question */}
                <div style={{ width: currentQ?.type === 'coding' ? '40%' : '100%', minWidth: currentQ?.type === 'coding' ? 380 : 'auto', borderRight: currentQ?.type === 'coding' ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>

                  {/* === CODING QUESTION: LeetCode-style left panel === */}
                  {currentQ?.type === 'coding' && (
                    <div style={{ padding: '24px 28px' }}>
                      {currentSection === 3 && (
                        <div style={{ background: 'rgba(124,58,237,0.1)', padding: '8px 16px', borderRadius: 8, color: '#a78bfa', fontWeight: 600, fontSize: '0.85rem', marginBottom: 16 }}>
                          Problem Reference: {currentQ?.problemTitle}
                        </div>
                      )}

                      {/* Title + Difficulty */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', margin: 0 }}>{currentQ.title || `Problem ${currentQIndex + 1}`}</h2>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                          background: currentQ.difficulty === 'easy' ? 'rgba(16,185,129,0.15)' : currentQ.difficulty === 'hard' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: currentQ.difficulty === 'easy' ? '#10b981' : currentQ.difficulty === 'hard' ? '#ef4444' : '#f59e0b'
                        }}>{currentQ.difficulty}</span>
                        {currentQ.hiddenTestCaseCount > 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🔒 {currentQ.hiddenTestCaseCount} hidden test{currentQ.hiddenTestCaseCount > 1 ? 's' : ''}</span>
                        )}
                      </div>

                      {/* Problem Description */}
                      <p style={{ fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-muted)', marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                        {typeof currentQ.question === 'string' ? currentQ.question : JSON.stringify(currentQ.question, null, 2)}
                      </p>

                      {/* Examples */}
                      {currentQ.examples?.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          {currentQ.examples.map((ex, i) => (
                            <div key={i} style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Example {i + 1}</div>
                              <div style={{ background: '#0d0d12', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem' }}>
                                <div><span style={{ color: '#a78bfa' }}>Input:</span> <span style={{ color: '#e5e7eb' }}>{formatInput(ex.input)}</span></div>
                                <div><span style={{ color: '#10b981' }}>Output:</span> <span style={{ color: '#e5e7eb' }}>{formatInput(ex.output)}</span></div>
                                {ex.explanation && <div style={{ color: '#6b7280', marginTop: 4 }}>Explanation: {ex.explanation}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Constraints */}
                      {currentQ.constraints?.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Constraints</div>
                          <ul style={{ listStyle: 'disc', paddingLeft: 20, margin: 0 }}>
                            {currentQ.constraints.map((c, i) => (
                              <li key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: '#9ca3af', marginBottom: 4 }}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Grading Rubric */}
                      {currentQ.rubric && (
                        <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: '1rem' }}>🎯</span>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grading Rubric</div>
                          </div>
                          <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#e5e7eb', fontStyle: 'italic' }}>
                            {currentQ.rubric}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* === MCQ / THEORY: Standard layout === */}
                  {currentQ?.type !== 'coding' && (
                    <div style={{ padding: '32px 40px' }}>
                      {currentSection === 3 && (
                        <div style={{ background: 'rgba(124,58,237,0.1)', padding: '8px 16px', borderRadius: 8, color: '#a78bfa', fontWeight: 600, fontSize: '0.85rem', marginBottom: 20 }}>
                          Problem Reference: {currentQ?.problemTitle}
                        </div>
                      )}
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 32, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {typeof currentQ?.question === 'string' ? currentQ.question : JSON.stringify(currentQ?.question, null, 2)}
                      </h2>

                      {currentQ?.type === 'theory' && (
                        <textarea
                          className="input-field"
                          style={{ flex: 1, minHeight: 300, fontSize: '1.1rem', lineHeight: 1.7, background: 'var(--bg-card)', resize: 'none', border: '1px solid var(--border)', outline: 'none' }}
                          placeholder="Type your explanation clearly..."
                          value={currentAns.theory || ''}
                          onChange={e => setAnswers(prev => ({
                            ...prev,
                            [currentQ.index]: {
                              ...(prev[currentQ.index] || {}),
                              theory: e.target.value
                            }
                          }))}
                        />
                      )}

                      {currentQ?.type === 'mcq' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {currentQ.options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => setAnswers({...answers, [currentQ.index]: { ...currentAns, mcqOption: i }})}
                              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 12, border: currentAns.mcqOption === i ? '2px solid #7c3aed' : '1px solid var(--border)', background: currentAns.mcqOption === i ? 'rgba(124,58,237,0.05)' : 'var(--bg-card)', color: currentAns.mcqOption === i ? '#fff' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontSize: '1.05rem' }}
                            >
                              <div style={{ width: 24, height: 24, borderRadius: '50%', border: currentAns.mcqOption === i ? '6px solid #7c3aed' : '2px solid var(--border)', background: 'transparent', flexShrink: 0 }} />
                              <span>{typeof opt === 'string' ? opt : JSON.stringify(opt)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

            {/* Right Pane: Code Editor or Empty */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d0d0d' }}>
                {currentQ?.type === 'coding' ? (
                    <>
                        <div style={{ height: 50, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #333' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <select
                                    className="select-mini"
                                    value={currentLang}
                                    onChange={e => {
  const newLang = e.target.value;
  const currentCode = currentAns[currentLang] ?? currentQ.starterCode?.[currentLang] ?? '';
  
  setAnswers(prev => {
    const existing = prev[currentQ.index] || {};
    return {
      ...prev,
      [currentQ.index]: {
        ...existing,
        [currentLang]: currentCode, // Save current language code before switching
        lang: newLang,
        code: existing[newLang] ?? currentQ.starterCode?.[newLang] ?? ''
      }
    };
  });
}}
                                >
                                {(currentQ.starterCode && Object.keys(currentQ.starterCode).length > 0
                                    ? Object.keys(currentQ.starterCode)
                                    : ['javascript', 'python']
                                ).map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <button className="btn-secondary" onClick={runCode} style={{ padding: '6px 20px', fontSize: '0.85rem', fontWeight: 800, background: '#2d2d2d', color: '#fff', border: '1px solid #444' }}>
                                ▶ RUN CODE
                            </button>
                            <button className="btn-secondary" onClick={async () => { await saveCurrentAnswer(); toast.success('Code saved'); }} style={{ padding: '6px 20px', fontSize: '0.85rem', fontWeight: 800, background: '#1a3a1a', color: '#4ade80', border: '1px solid #2d4a2d' }}>
                                💾 SAVE
                            </button>
                        </div>
                        <div style={{ flex: 1 }}>
                            <Editor
                                height="100%"
                                language={currentLang}
                                theme="vs-dark"
                                value={currentCode}
                                onChange={val => setAnswers(prev => ({ ...prev, [currentQ.index]: { ...(prev[currentQ.index] || {}), [currentLang]: val, code: val } }))}
                                options={{ fontSize: 15, fontFamily: 'JetBrains Mono', minimap: { enabled: false } }}
                            />
                        </div>
                        {/* Test Results Panel */}
                        <div style={{ height: 220, background: '#111', borderTop: '2px solid #333', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '10px 20px', background: '#1a1a1a', fontSize: '0.75rem', fontWeight: 800, color: '#888', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>VISIBLE TEST CASES ({currentQ?.visibleTestCaseCount ?? 2})</span>
                              <span style={{ fontWeight: 400, color: '#555', fontSize: '0.7rem' }}>🔒 {currentQ?.hiddenTestCaseCount ?? 2} hidden case{(currentQ?.hiddenTestCaseCount ?? 2) !== 1 ? 's' : ''} — evaluated on final submit</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                                {!currentAns.testResults ? (
                                    <div style={{ color: '#555', fontSize: '0.9rem', textAlign: 'center', marginTop: 30 }}>Click <strong style={{ color: '#fff' }}>▶ RUN CODE</strong> to see results for visible test cases.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {currentAns.testResults.map((tr, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#1a1a1a', padding: '10px 14px', borderRadius: 8, borderLeft: `4px solid ${tr.passed ? '#10b981' : '#ef4444'}` }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <div style={{ color: tr.passed ? '#10b981' : '#ef4444', fontWeight: 800, fontSize: '0.8rem' }}>{tr.passed ? '✓ PASSED' : '✗ FAILED'} — Case {i + 1}</div>
                                                    <div style={{ color: '#666', fontSize: '0.75rem', fontFamily: 'monospace' }}>Input: {formatInput(tr.input)}</div>
                                                    {!tr.passed && tr.expected && <div style={{ color: '#f59e0b', fontSize: '0.75rem', fontFamily: 'monospace' }}>Expected: {formatInput(tr.expected)}</div>}
                                                    {!tr.passed && tr.actual && <div style={{ color: '#ef4444', fontSize: '0.75rem', fontFamily: 'monospace' }}>Got: {formatInput(tr.actual)}</div>}
                                                    {tr.error && <div style={{ color: '#ef4444', fontSize: '0.75rem', fontFamily: 'monospace' }}>Error: {tr.error}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '5rem', marginBottom: 20 }}>{currentSection === 1 ? '📝' : '⚡'}</div>
                        </div>
                    </div>
                )}
            </div>
        </main>
      </div>

      {/* Grading In Progress Screen */}
      {gradingInProgress && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 24 }}>
          <div className="hero-glow" style={{ top: '50%', transform: 'translate(-50%, -50%)', opacity: 0.6 }} />
          <div style={{ fontSize: '5rem', zIndex: 10 }}>🧠</div>
          <div style={{ textAlign: 'center', zIndex: 10, maxWidth: 500 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 16 }}>Evaluating your <span className="gradient-text">submission</span></h1>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Running test cases and scoring your answers. This takes a few seconds — please don&apos;t close this tab.</p>
          </div>
          <div style={{ width: '100%', maxWidth: 400, background: 'var(--border)', borderRadius: 999, height: 6, overflow: 'hidden', zIndex: 10 }}>
            <div className="progress-bar-fill" style={{ background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', height: '100%', borderRadius: 999, width: '70%', animation: 'progress-fill 2s ease-in-out infinite alternate' }} />
          </div>
        </div>
      )}

      {/* Termination Screen Overlay */}
      {isTerminated && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#111', padding: 50, borderRadius: 24, textAlign: 'center', maxWidth: 600, border: '1px solid #331' }}>
            <div style={{ fontSize: '4rem', marginBottom: 24 }}>🚫</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', marginBottom: 16 }}>Test Terminated</h1>
            <p style={{ fontSize: '1.1rem', color: '#888', marginBottom: 32 }}>{proctorError}</p>
            <button className="btn-secondary" onClick={() => router.push('/')}>Return Home</button>
          </div>
        </div>
      )}

      {/* Fullscreen Blocker Overlay */}
      {showFsWarningOverlay && !isTerminated && !gradingInProgress && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#111', padding: 40, borderRadius: 24, textAlign: 'center', maxWidth: 500, border: '2px solid #ef4444', boxShadow: '0 0 50px rgba(239, 68, 68, 0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>⚠️</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginBottom: 12 }}>Action Required</h2>
            <p style={{ color: '#ccc', marginBottom: 24, lineHeight: 1.6, fontSize: '1.05rem' }}>
              You have exited the secure assessment environment. <strong>If you exit this page, you will NOT be able to continue again.</strong>
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: '16px', marginBottom: 32 }}>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>AUTO-TERMINATION IN:</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ef4444', fontFamily: 'monospace' }}>{fsWarningTimer}s</div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '16px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.5)' }}
                onClick={() => {
                  const confirmExit = window.confirm("Are you SURE you want to exit? Your session will be permanently terminated.");
                  if (confirmExit) {
                    setIsTerminated(true);
                    setProctorError('Assessment terminated by candidate after exiting fullscreen.');
                    // Tell the backend to force close the session
                    logProctorEvent('candidate_abandoned', 'Assessment terminated by candidate after exiting fullscreen.');
                  }
                }}
              >
                Exit Assessment
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 2, padding: '16px' }}
                onClick={() => {
                  document.documentElement.requestFullscreen().catch(() => {
                      toast.error('Could not restore fullscreen. Please click the page first or check browser permissions.');
                  });
                }}
              >
                Resume Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
