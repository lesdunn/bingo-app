import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const [historyLookup, setHistoryLookup] = useState('');
  const [historyLookupFocused, setHistoryLookupFocused] = useState(false);

  // only allow whole numbers in the Check box
  const handleHistoryLookupChange = (e) => {
    const cleaned = (e.target.value || '').replace(/\D+/g, ''); // strip any non-digits
    setHistoryLookup(cleaned);
  };

  const handleHistoryLookupPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || '';
    const cleaned = pasted.replace(/\D+/g, '');
    setHistoryLookup(cleaned);
  };

  // true when the lookup box currently matches an entry in history
  const lookupFound = useMemo(() => {
    const q = historyLookup.trim();
    if (!q) return false;
    // try numeric match first
    const n = Number(q);
    if (!Number.isNaN(n) && q !== '') {
      return history.some(h => Number(h) === n);
    }
    const norm = q.toLowerCase();
    return history.some(h => String(h).toLowerCase() === norm);
  }, [history, historyLookup]);

  const fetchNumber = useCallback(async () => {
    // clear the Check... input as part of the generate action
    setHistoryLookup('');
    setHistoryLookupFocused(false);
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
    // clear the Check... input
    setHistoryLookup('');
    setHistoryLookupFocused(false);

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
      // only handle space here
      if (!(e.code === 'Space' || e.key === ' ')) return;

      const active = document.activeElement;
      const tag = active && active.tagName;
      const activeExists = Boolean(active);
      const isContentEditable = activeExists ? Boolean(active.isContentEditable) : false;
      const isInputTag = tag === 'INPUT' || tag === 'TEXTAREA';
      const hasRoleTextbox = activeExists && typeof active.getAttribute === 'function'
        ? active.getAttribute('role') === 'textbox'
        : false;
      const isEditable = isContentEditable || isInputTag || hasRoleTextbox;

      // if an editable element is focused, blur it so it stops receiving input
      if (isEditable && active && typeof active.blur === 'function') {
        active.blur();
      }

      e.preventDefault(); // prevent page scroll
      if (!loading && fetchNumberRef.current) fetchNumberRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading]);

  return (
    <div style={{ maxWidth: 900, margin: '50px auto' }}>
      {/* placeholder style for the Check... input */}
      <style>{`
        .history-check::placeholder { color: #000 !important; font-style: italic !important; opacity: 1 !important; }
        .history-check::-webkit-input-placeholder { color: #000 !important; font-style: italic !important; opacity: 1 !important; }
        .history-check::-moz-placeholder { color: #000 !important; font-style: italic !important; opacity: 1 !important; }
        .history-check:-ms-input-placeholder { color: #000 !important; font-style: italic !important; opacity: 1 !important; }
      `}</style>

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

        <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
          {history.length === 0 ? (
            <div style={{ color: '#ffffff', fontStyle: 'italic', fontSize: 20 }}>No history yet</div>
          ) : (
            <div style={{ minWidth: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.15)',
                        textAlign: 'left',
                        padding: 8,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}
                    >
                      <span>History</span>
                      <div style={{ marginLeft: 12, position: 'relative', display: 'inline-block' }}>
                        <input
                          className="history-check"
                          value={historyLookup}
                          onChange={handleHistoryLookupChange}
                          onPaste={handleHistoryLookupPaste}
                          onFocus={() => setHistoryLookupFocused(true)}
                          onBlur={() => setHistoryLookupFocused(false)}
                          placeholder="Check..."
                          inputMode="numeric"
                          pattern="\d*"
                          aria-label="Check history number"
                          style={{
                            padding: '6px 36px 6px 8px',
                            borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.12)',
                            backgroundColor: historyLookup === '' ? 'transparent' : (lookupFound ? '#c8f7d1' : '#ffb3b3'),
                            outline: 'none',
                            /* show a dark-green focus ring instead of the browser red outline */
                            boxShadow: historyLookupFocused ? '0 0 0 3px rgba(11, 91, 102, 0.25)' : 'none',
                            color: '#000',
                            minWidth: 120,
                            display: 'inline-block'
                          }}
                        />
                        {historyLookup !== '' && (
                          <span
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              right: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: 16,
                              color: lookupFound ? '#0b6623' : '#ff3b30',
                              pointerEvents: 'none'
                            }}
                          >
                            {lookupFound ? '✔' : '✖'}
                          </span>
                        )}
                      </div>
                 </th>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
