import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Lottie from 'lottie-react';
import spinnerAnim from './animations/scribe_loading.json';
import verseFirstLogo from './images/VerseFirst_bingo_logo.png';

// initially display the default logo; may be replaced by profile image


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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [currentBgColor, setCurrentBgColor] = useState('rgb(17,77,16)');
  const [logoSrc, setLogoSrc] = useState(verseFirstLogo);
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileBgColor, setNewProfileBgColor] = useState('');
  const [createNewError, setCreateNewError] = useState(null);
  const [createNewLoading, setCreateNewLoading] = useState(false);

  // fetch profiles when dialog opens
  useEffect(() => {
    if (!settingsOpen) return;
    
    const fetchProfiles = async () => {
      setProfilesLoading(true);
      try {
        const response = await fetch('http://localhost:5555/profiles');
        if (!response.ok) throw new Error('Failed to fetch profiles');
        const data = await response.json();
        setProfiles(data);
      } catch (err) {
        console.error('Error fetching profiles:', err.message);
      } finally {
        setProfilesLoading(false);
      }
    };

    fetchProfiles();
  }, [settingsOpen]);

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

      // disable spacebar functionality if any dialog is open
      if (settingsOpen || createNewOpen) return;

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
  }, [loading, settingsOpen, createNewOpen]);

  return (
    <div style={{ maxWidth: 900, margin: '0px auto', position: 'relative' }}>
      {/* settings cog in top-right corner (will open customization popup in future) */}
      <button
        aria-label="Settings"
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          padding: 4,
          zIndex: 1000
        }}
        onClick={() => setSettingsOpen(true)}
      >
        ⚙️
      </button>
      {/* placeholder style for the Check... input */}
      <style>{`
        .history-check::placeholder { color: #000 !important; font-style: italic !important; opacity: 1 !important; }
        .history-check::-webkit-input-placeholder { color: #000 !important; font-style: italic !important; opacity: 1 !important; }
        .history-check::-moz-placeholder { color: #000 !important; font-style: italic !important; opacity: 1 !important; }
        .history-check:-ms-input-placeholder { color: #000 !important; font-style: italic !important; opacity: 1 !important; }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', marginBottom: -10, margin: 0, padding: 0}}>
          <img src={logoSrc} alt="VerseFirst" style={{ height: 300, display: 'inline-block' }} />
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
              /* position the rhyme/number at the top area of the left column
                 so it lines up vertically with the "History" header on the right */
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 480,
              height: 400,
              display: 'flex',
              alignItems: 'flex-start',
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

        <div
          style={{
            /* fixed box height so the column doesn't move as rows are added.
               content starts at the top and grows downward */
            height: 400,
            overflowY: 'auto',
            paddingRight: 8,
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start'
          }}
        >
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
                  {history.map((n, idx) => {
                    const alternateColor = idx % 2 === 0 ? currentBgColor : 'rgba(0, 0, 0, 0.1)';
                    return (
                      <tr
                        key={idx}
                        style={{
                          background: alternateColor,
                        }}
                      >
                        <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>{n}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              width: '90%',
              maxWidth: 400,
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: 16,
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, color: '#000' }}>Profiles</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff3b30',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 16
              }}
            >
              {profilesLoading ? (
                <div style={{ color: '#666', textAlign: 'center' }}>Loading profiles...</div>
              ) : profiles.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center' }}>No profiles found</div>
              ) : (
                profiles.map((profile) => (
                  <div
                    key={profile.name}
                    onClick={() => setSelectedProfile(profile)}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 6,
                      border: selectedProfile?.name === profile.name ? '2px solid #1976d2' : '1px solid #ddd',
                      backgroundColor: selectedProfile?.name === profile.name ? '#e3f2fd' : '#fff',
                      cursor: 'pointer',
                      color: '#000',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {profile.name}
                  </div>
                ))
              )}
            </div>

            {/* Footer with buttons */}
            <div
              style={{
                padding: 16,
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-start',
                backgroundColor: '#f5f5f5'
              }}
            >
              <button
                onClick={() => setCreateNewOpen(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Create New
              </button>
              <button
                disabled={!selectedProfile}
                onClick={() => {
                  if (selectedProfile) {
                    document.body.style.backgroundColor = selectedProfile.backgroundColour;
                    document.title = `${selectedProfile.name} Bingo`;
                    setCurrentBgColor(selectedProfile.backgroundColour);
                    if (selectedProfile.base64Image) {
                      // assume PNG unless specified; prefix if missing
                      const prefix = selectedProfile.base64Image.startsWith('data:')
                        ? ''
                        : 'data:image/png;base64,';
                      setLogoSrc(prefix + selectedProfile.base64Image);
                    }
                    setSettingsOpen(false);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: selectedProfile ? '#1976d2' : '#ccc',
                  color: '#fff',
                  cursor: selectedProfile ? 'pointer' : 'not-allowed',
                  fontSize: 14,
                  opacity: selectedProfile ? 1 : 0.6
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Profile Modal */}
      {createNewOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
          }}
          onClick={() => setCreateNewOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              width: '90%',
              maxWidth: 400,
              minHeight: 250,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: 16,
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#f5f5f5'
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, color: '#000' }}>Create New Profile</h2>
            </div>

            {/* Form */}
            <div
              style={{
                flex: 1,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#000', fontSize: 14 }}>Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    outline: 'none',
                    fontSize: 14,
                    color: '#000'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#000', fontSize: 14 }}>Background Colour</label>
                <input
                  type="color"
                  value={newProfileBgColor || '#ffffff'}
                  onChange={(e) => setNewProfileBgColor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    height: 40
                  }}
                />
              </div>
              {createNewError && (
                <div style={{ color: '#ff3b30', fontSize: 14 }}>
                  {createNewError}
                </div>
              )}
            </div>

            {/* Footer with buttons */}
            <div
              style={{
                padding: 16,
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-start',
                backgroundColor: '#f5f5f5'
              }}
            >
              <button
                disabled={!newProfileName.trim() || !newProfileBgColor.trim() || createNewLoading}
                onClick={async () => {
                  if (!newProfileName.trim() || !newProfileBgColor.trim()) return;

                  setCreateNewLoading(true);
                  setCreateNewError(null);

                  try {
                    const payload = {
                      name: newProfileName.trim(),
                      backgroundColour: newProfileBgColor.trim(),
                    };
                    const response = await fetch('http://localhost:5555/profile', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(payload),
                    });

                    const text = await response.text();
                    let result;
                    try {
                      result = JSON.parse(text);
                    } catch {
                      result = text;
                    }
                    if (!response.ok) {
                      const message = (result && result.error) ? result.error : (typeof result === 'string' ? result : 'Failed to create profile');
                      throw new Error(message);
                    }

                    // Refresh profiles list (ignore errors here)
                    try {
                      const profilesResponse = await fetch('http://localhost:5555/profiles');
                      if (profilesResponse.ok) {
                        const data = await profilesResponse.json();
                        setProfiles(data);
                      }
                    } catch (refreshErr) {
                      console.error('Failed to refresh profiles after creation', refreshErr);
                    }

                    // Close dialog and reset form
                    setCreateNewOpen(false);
                    setNewProfileName('');
                    setNewProfileBgColor('');
                    setCreateNewError(null);
                  } catch (err) {
                    setCreateNewError(err.message || 'Unknown error');
                    console.error('Error creating profile', err);
                  } finally {
                    setCreateNewLoading(false);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: (!newProfileName.trim() || !newProfileBgColor.trim() || createNewLoading) ? '#ccc' : '#1976d2',
                  color: '#fff',
                  cursor: (!newProfileName.trim() || !newProfileBgColor.trim() || createNewLoading) ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  opacity: (!newProfileName.trim() || !newProfileBgColor.trim() || createNewLoading) ? 0.6 : 1
                }}
              >
                {createNewLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setCreateNewOpen(false);
                  setNewProfileName('');
                  setNewProfileBgColor('');
                  setCreateNewError(null);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
