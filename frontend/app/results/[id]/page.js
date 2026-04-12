'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../dashboard/layout';
import api from '../../../lib/api';
import Editor from '@monaco-editor/react';

export default function ResultDetailPage({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/grade/result/${unwrappedParams.id}`)
      .then(res => setResult(res.data))
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [unwrappedParams.id, router]);

  if (loading) return <DashboardLayout><div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}/></div></DashboardLayout>;
  if (!result) return <DashboardLayout>Not found</DashboardLayout>;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Link href={`/roles/${result.jobRole._id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>← Back to Role</Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{result.candidateName}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{result.candidateEmail} • Applied for <span style={{ color: 'white', fontWeight: 600 }}>{result.jobRole.title}</span></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', flexDir: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>TECH SCORE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: (result.scores?.techPercentage ?? 0) >= 65 ? '#10b981' : '#f59e0b' }}>{result.scores?.techPercentage ?? '-'}%</div>
            </div>
            {result.scores?.logicDepth !== undefined && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a78bfa' }}>LOGIC DEPTH</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#a78bfa' }}>{result.scores.logicDepth}/100</div>
              </div>
            )}
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{result.scores?.total ?? '-'} / {result.scores?.maxTotal ?? '-'} total points</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: 32 }}>
        {/* Left Column: Summary & Proctoring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Verdict Box */}
          <div className="gradient-border" style={{ padding: 24, textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>AI Recommendation</h3>
            {result.status === 'submitted' ? (
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>⏳ PENDING GRADING</div>
            ) : result.scores?.recommendation ? (
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: result.scores.recommendation==='strong_hire'?'#10b981':result.scores.recommendation==='hire'?'#34d399':result.scores.recommendation==='maybe'?'#f59e0b':'#ef4444' }}>
                {result.scores.recommendation.replace('_', ' ').toUpperCase()}
                {(result.scores.validity?.isAllBlank || (result.scores?.techPercentage ?? 0) === 0) && ' — INVALID SESSION'}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Not graded</div>
            )}
            
            {result.scores?.plagiarismFlag && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 12, marginTop: 16 }}>
                <div style={{ color: '#ef4444', fontWeight: 800, marginBottom: 4 }}>🚩 High Plagiarism Risk</div>
                <div style={{ fontSize: '0.85rem', color: '#fca5a5' }}>Overall {result.scores.plagiarismScore}% match with other candidates.</div>
                {result.scores.plagiarismFlags?.map((f, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', marginTop: 4, color: '#f87171' }}>• Q{f.questionIndex + 1}: {f.similarityPercent}% match w/ {f.matchedCandidate}</div>
                ))}
              </div>
            )}

            {result.scores?.validity && result.scores.validity.unansweredCount > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: 12, marginTop: 12 }}>
                <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.85rem', marginBottom: 4 }}>⚠️ Answer Validation</div>
                <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
                  {result.scores.validity.unansweredCount} of {result.scores.validity.totalQuestions} questions unanswered.
                  {!result.scores.validity.hasAnyS3Answer && ' No logic verification responses.'}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Session Info</h3>
            
            {result.identityPhoto && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Identity Snapshot</div>
                <img src={result.identityPhoto} alt="Candidate Identity" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', objectFit: 'cover', background: '#000' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Status: </span><span style={{ fontWeight: 600 }}>{result.status}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Started: </span><span style={{ fontWeight: 600 }}>{new Date(result.startedAt).toLocaleString()}</span></div>
              {result.submittedAt && <div><span style={{ color: 'var(--text-muted)' }}>Submitted: </span><span style={{ fontWeight: 600 }}>{new Date(result.submittedAt).toLocaleString()}</span></div>}
              <div><span style={{ color: 'var(--text-muted)' }}>Duration: </span><span style={{ fontWeight: 600 }}>{result.submittedAt ? Math.round((new Date(result.submittedAt)-new Date(result.startedAt))/60000) : '-'} mins</span></div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Proctoring Log</h3>
              <span className={`badge ${result.warningCount > 0 ? 'badge-red' : 'badge-green'}`}>
                {result.warningCount} Alerts
              </span>
            </div>
            
            {result.status === 'terminated' && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, marginBottom: 16 }}>
                {result.terminationReason}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 400, overflowY: 'auto' }}>
              {result.proctoringEvents.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No proctoring events logged.</div>
              ) : (
                result.proctoringEvents.slice().reverse().map((e, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #7c3aed', padding: '0 0 0 12px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: e.type==='camera_snapshot' ? '#06b6d4' : '#ef4444' }}>{e.type.replace(/_/g, ' ').toUpperCase()}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: e.snapshot ? 8 : 0 }}>{e.details}</div>
                    {e.snapshot && <img src={e.snapshot} alt="Snapshot" style={{ width: '100%', borderRadius: 8, border: '1px solid #333' }} />}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Eval and Answers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {result.scores?.aiEvaluation && (
             <div className="glass-card" style={{ padding: 32, background: 'linear-gradient(135deg,rgba(17,17,24,0.9),rgba(124,58,237,0.05))' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, color: '#a78bfa' }}>🤖 Overall AI Interview Evaluation</h3>
              <p style={{ color: 'var(--text)', lineHeight: 1.8, fontSize: '0.95rem' }}>
                {result.scores.aiEvaluation}
              </p>
             </div>
          )}

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 12 }}>Question Breakdown</h2>
          
          {/* Main Question Breakdown */}
          {result.sessionQuestions?.map((q, i) => {
            const evl = result.scores?.evaluations?.find(e => e.index === i) || {};
            const ans = result.answers?.find(a => a.questionIndex === i) || {};
            
            return (
              <div key={i} className="glass-card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontWeight: 800 }}>Q{i+1}</span>
                      <span className="badge badge-purple">{q.type.toUpperCase()}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Time spent: {ans.timeSpent ? Math.round(ans.timeSpent/60) : 0}m {(ans.timeSpent||0)%60}s</span>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 500 }}>{q.question}</div>
                  </div>
                  <div style={{ textAlign: 'right', background: 'var(--bg)', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: evl.score === q.points ? '#10b981' : evl.score > 0 ? '#f59e0b' : '#ef4444' }}>{evl.score ?? '-'}/{q.points}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Points</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', padding: 16, marginTop: 16 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Candidate's Answer</div>
                  
                  {q.type === 'mcq' && (
                    <div>
                      {ans.selectedOption !== undefined ? (
                        <div style={{ color: ans.selectedOption === q.correctOption ? '#34d399' : '#f87171', fontWeight: 500 }}>
                          {ans.selectedOption === q.correctOption ? '✓' : '✗'} {q.options[ans.selectedOption]}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>No answer provided</span>}
                    </div>
                  )}

                  {q.type === 'coding' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {ans.code ? (
                        <div style={{ height: 300, border: '1px solid #404040', borderRadius: 4, overflow: 'hidden' }}>
                          <Editor
                            language={ans.language || 'javascript'}
                            theme="vs-dark"
                            value={ans.code}
                            options={{ readOnly: true, minimap: { enabled: false } }}
                          />
                        </div>
                      ) : <div style={{ color: 'var(--text-muted)' }}>No code submitted</div>}
                      
                      {evl.testResults && (
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 }}>Test Cases ({evl.testResults.filter(t=>t.passed).length}/{evl.testResults.length})</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {evl.testResults.map((t, ti) => (
                              <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                                <span style={{ color: t.passed ? '#34d399' : '#f87171' }}>{t.passed ? '✓ PASSED' : '✗ FAILED'}</span>
                                <span className="mono" style={{ color: 'var(--text-muted)' }}>{t.error ? t.error : `Input: ${t.input} → Expected: ${t.expected} | Actual: ${t.actual}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {q.type === 'theory' && (
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem' }}>
                      {ans.theoryAnswer || <span style={{ color: 'var(--text-muted)' }}>No answer provided</span>}
                    </div>
                  )}
                </div>

                {evl.feedback && (
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(124,58,237,0.08)', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)', fontSize: '0.9rem', display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>🤖</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#a78bfa', marginBottom: 4 }}>AI Feedback</div>
                      <div>{evl.feedback}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* === SECTION 3: LOGIC VERIFICATION === */}
          {result.logicVerificationQuestions?.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 32, marginBottom: 16 }}>Section 3: Logic Verification</h2>
              {result.logicVerificationQuestions.map((prob, pi) => (
                <div key={pi} className="glass-card" style={{ padding: 32, marginBottom: 24, borderLeft: '4px solid #06b6d4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                     <span style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>PROB #{prob.problemNumber}</span>
                     <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{prob.problemTitle}</h3>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {prob.questions.map((sq, si) => (
                      <div key={si} style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                          <span style={{ fontSize: '1.2rem' }}>❓</span>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>AI Question ({sq.type})</div>
                            <div style={{ fontSize: '1rem', fontWeight: 500, color: 'white', lineHeight: 1.5 }}>{sq.question}</div>
                          </div>
                        </div>
                        
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', gap: 12 }}>
                          <span style={{ fontSize: '1.2rem' }}>💬</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Candidate's Explanation</div>
                            <div style={{ fontSize: '0.95rem', lineHeight: 1.7, color: sq.answer ? 'var(--text)' : 'var(--text-muted)', fontStyle: sq.answer ? 'normal' : 'italic' }}>
                              {sq.answer || 'No response provided'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
