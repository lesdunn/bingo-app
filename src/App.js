import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lottie from 'lottie-react';
import spinnerAnim from './animations/scribe_loading.json';
import verseFirstLogo from './images/VerseFirst_Transparent_3.png';

function App() {
  // set full-page background color
  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    const prevColor = document.body.style.color;
    const prevTitle = document.title;
    const prevFaviconEl = document.querySelector("link[rel~='icon']");
    const prevFaviconHref = prevFaviconEl ? prevFaviconEl.href : null;

    document.body.style.backgroundColor = 'rgb(17,77,16)';
    document.body.style.color = '#ffffff';
    document.title = 'VerseFirst Bingo';

    // build an SVG favicon with the emoji and set it as the favicon
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="48">🪶</text>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const faviconUrl = URL.createObjectURL(blob);

    let link = document.querySelector("link[rel~='icon']");
    let created = false;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      created = true;
      document.head.appendChild(link);
    }
    link.href = faviconUrl;

    return () => {
      document.body.style.backgroundColor = prevBg;
      document.body.style.color = prevColor;
      document.title = prevTitle;
      if (link) {
        if (prevFaviconHref) {
          link.href = prevFaviconHref;
        } else if (created && link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }
      URL.revokeObjectURL(faviconUrl);
    };
  }, []);

  const [number, setNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rhyme, setRhyme] = useState(null);
  const [history, setHistory] = useState([]); // added history state

  const fetchNumber = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5555/api/generateNumber');
      if (!response.ok) throw new Error('Failed to fetch number');

      // read as text then try to parse JSON so this works with both JSON and plain-text responses
      const raw = await response.text();
      let value;
      try {
        const parsed = JSON.parse(raw);
        value = typeof parsed === 'object' && parsed !== null && 'number' in parsed ? parsed.number : raw;
        setRhyme(typeof parsed === 'object' && parsed !== null && 'rhyme' in parsed ? parsed.rhyme : null);
      } catch {
        value = raw;
        setRhyme(null);
      }

      setNumber(value);
      setHistory(prev => [value, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetGame = async () => {
    // clear UI immediately
    setNumber(null);
    setRhyme(null);
    setHistory([]);
    setError(null);

    // still notify server; keep loading indicator while request in flight
    setLoading(true);
    try {
      const resp = await fetch('http://localhost:5555/api/resetGame', { method: 'POST' });
      if (!resp.ok) throw new Error('Failed to reset game on server');
      // server reset succeeded — UI already cleared
    } catch (err) {
      // show server error but keep UI cleared
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // allow spacebar to trigger Generate Number (but not when typing in inputs)
  const fetchNumberRef = useRef(null);
  useEffect(() => {
    fetchNumberRef.current = fetchNumber;
  }, [fetchNumber]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const active = document.activeElement;
      const tag = active && active.tagName;

      const activeExists = Boolean(active);
      const isContentEditable = activeExists ? Boolean(active.isContentEditable) : false;
      const isInputTag = tag === 'INPUT' || tag === 'TEXTAREA';
      const hasRoleTextbox = activeExists && typeof active.getAttribute === 'function'
        ? active.getAttribute('role') === 'textbox'
        : false;
      const isEditable = isContentEditable || isInputTag || hasRoleTextbox;
      if (isEditable) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!loading && fetchNumberRef.current) fetchNumberRef.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading]);

  return (
    <div style={{ maxWidth: 900, margin: '50px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <img src={verseFirstLogo} alt="VerseFirst" style={{ height: 200, display: 'inline-block' }} />
          <span>Bingo</span>
        </h1>
        <button onClick={fetchNumber} disabled={loading}>
          {loading ? 'Fetching...' : 'Generate Number'}
        </button>
        <button onClick={resetGame} disabled={loading} style={{ marginLeft: 8 }}>
          Reset Game
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      {/* two-column layout: number on the left, history on the right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center', minHeight: 420 }}>
        <div
          style={{
            /* stretch to fill the left column; keep this cell's content positioned absolutely
               so it doesn't change layout height when number or spinner changes */
            justifySelf: 'stretch',
            alignSelf: 'stretch',
            position: 'relative',
            display: 'block'
          }}
        >
          {/* absolutely-centered content box (fixed space, won't affect sibling column) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              maxWidth: 480,
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none' /* keeps buttons clickable elsewhere */
            }}
          >
            {loading ? (
              <div style={{ pointerEvents: 'auto' }}>
                <Lottie
                  animationData={spinnerAnim}
                  loop={true}
                  autoplay={true}
                  style={{ width: 320, height: 320, background: 'transparent' }}
                />
              </div>
            ) : number ? (
              <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
                {rhyme ? (
                  <div style={{ fontSize: 36, color: '#ffffff', opacity: 0.9, marginBottom: 8 }}>{rhyme}</div>
                ) : null}
                <div style={{ fontSize: 240, fontWeight: 700, lineHeight: 1 }}>{number}</div>
              </div>
            ) : (
              <div style={{ color: '#ffffff', fontStyle: 'italic', fontSize: 20, pointerEvents: 'auto' }}>No number generated yet</div>
            )}
          </div>
        </div>

        <div>
           {history.length === 0 ? (
             <div style={{ color: '#ffffff', fontStyle: 'italic', fontSize: 20 }}>No history yet</div>
           ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr>
                   <th style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', textAlign: 'left', padding: 8, color: '#ffffff' }}>History</th>
                 </tr>
               </thead>
               <tbody>
                 {history.map((n, idx) => (
                   <tr
                     key={idx}
                     style={{
                       background: idx % 2 === 0 ? 'rgb(17,77,16)' : '#166b2a',
                     }}
                   >
                     <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>{n}</td>
                   </tr>
                  ))}
               </tbody>
             </table>
           )}
        </div>
      </div>
    </div>
  );
}

export default App;
