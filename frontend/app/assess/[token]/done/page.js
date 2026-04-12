'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';

function StarRating({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              fontSize: '1.8rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: n <= value ? '#f59e0b' : '#374151',
              transition: 'transform 0.15s',
              padding: 0
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          >
            ★
          </button>
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', alignSelf: 'center', marginLeft: 8 }}>
          {value > 0 ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value] : 'Not rated'}
        </span>
      </div>
    </div>
  );
}

export default function AssessmentDonePage() {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [ratings, setRatings] = useState({
    overall: 0, questionQuality: 0, platform: 0
  });
  const [comment, setComment] = useState('');

  useEffect(() => {
    // Pull session ID before clearing
    const s = sessionStorage.getItem('vh_session');
    if (s) {
      try { setSessionId(JSON.parse(s).id); } catch {}
    }
  }, []);

  const handleSkip = () => {
    sessionStorage.removeItem('vh_session');
    setShowFeedback(false);
  };

  const handleSubmitFeedback = async () => {
    if (ratings.overall === 0) return alert('Please rate your overall experience');
    setSubmitting(true);
    try {
      await api.post('/feedback/candidate', {
        sessionId,
        overallRating: ratings.overall,
        questionQualityRating: ratings.questionQuality || undefined,
        platformRating: ratings.platform || undefined,
        comment: comment.trim() || undefined
      });
    } catch {}
    sessionStorage.removeItem('vh_session');
    setSubmitting(false);
    setSubmitted(true);
    setShowFeedback(false);
  };

  if (showFeedback && !submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
        <div className="hero-glow" style={{ top: '50%', transform: 'translate(-50%, -50%)', opacity: 0.4 }} />
        <div className="glass-card" style={{ padding: 48, maxWidth: 560, width: '100%', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>Assessment <span className="gradient-text">Submitted!</span></h1>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Thank you! Your answers have been recorded and sent to the hiring team. Before you go, we'd love your feedback.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28, marginBottom: 28 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, color: 'white' }}>Rate Your Experience</h2>

            <StarRating label="Overall Experience *" value={ratings.overall} onChange={v => setRatings(r => ({ ...r, overall: v }))} />
            <StarRating label="Question Quality" value={ratings.questionQuality} onChange={v => setRatings(r => ({ ...r, questionQuality: v }))} />
            <StarRating label="Platform Experience" value={ratings.platform} onChange={v => setRatings(r => ({ ...r, platform: v }))} />

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Tell us about your experience <span style={{ fontWeight: 400 }}>(optional, max 300 chars)</span>
              </label>
              <textarea
                className="input-field"
                rows={3}
                maxLength={300}
                placeholder="Questions were relevant to the role..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                style={{ resize: 'none', fontSize: '0.9rem' }}
              />
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{comment.length}/300</div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={handleSubmitFeedback}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : '📤 Submit Feedback'}
            </button>
            <button
              className="btn-secondary"
              style={{ width: '100%', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.875rem' }}
              onClick={handleSkip}
            >
              Skip for now →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="hero-glow" style={{ top: '50%', transform: 'translate(-50%, -50%)', opacity: 0.5 }} />
      <div className="glass-card" style={{ padding: 64, maxWidth: 640, textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <div style={{ fontSize: '5rem', marginBottom: 24 }}>✅</div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em' }}>
          You&apos;re all <span className="gradient-text">done!</span>
        </h1>
        {submitted && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 24px', marginBottom: 24, color: '#10b981', fontSize: '0.9rem' }}>
            ✓ Feedback received — thank you!
          </div>
        )}
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: 40, lineHeight: 1.6 }}>
          Your submission has been recorded and sent to the hiring team for review. Results will be shared by the company directly.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <a href="/" className="btn-secondary">Return Home</a>
        </div>
      </div>
    </div>
  );
}
