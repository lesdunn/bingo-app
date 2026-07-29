import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Lottie from 'lottie-react';
import spinnerAnim from './animations/bingo_text.json';
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
  const [call, setCall] = useState(null);
  const [history, setHistory] = useState([]); // added history state
  const [historyLookup, setHistoryLookup] = useState('');
  const [historyLookupFocused, setHistoryLookupFocused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [currentBgColor, setCurrentBgColor] = useState('rgb(17,77,16)');
  const [logoSrc, setLogoSrc] = useState(verseFirstLogo);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [editingProfileUuid, setEditingProfileUuid] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileBgColor, setNewProfileBgColor] = useState('');
  const [valuesFileNames, setValuesFileNames] = useState([]);
  const [selectedValuesFile, setSelectedValuesFile] = useState('');
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [animationFileNames, setAnimationFileNames] = useState([]);
  const [animations, setAnimations] = useState([]);
  const [selectedAnimation, setSelectedAnimation] = useState(null);
  const [selectedAnimationName, setSelectedAnimationName] = useState('');
  const [selectedAnimationData, setSelectedAnimationData] = useState(null);
  const [createNewError, setCreateNewError] = useState(null);
  const [createNewLoading, setCreateNewLoading] = useState(false);
  const [spinnerAnimData, setSpinnerAnimData] = useState(spinnerAnim);
  const [animationKey, setAnimationKey] = useState(0);
  const [logoHeight, setLogoHeight] = useState(300);

  const resetCreateModal = () => {
    setCreateNewOpen(false);
    setEditingProfileUuid(null);
    setNewProfileName('');
    setNewProfileBgColor('');
    setSelectedValuesFile('');
    setSelectedImage(null);
    setSelectedAnimation(null);
    setSelectedAnimationName('');
    setSelectedAnimationData(null);
    setCreateNewError(null);
    setCreateNewLoading(false);
  };

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

  const applyProfileToUI = async (profile) => {
    if (!profile) return;
    try {
      document.body.style.backgroundColor = profile.backgroundColour || profile.backgroundColor || currentBgColor;
      document.title = `${profile.name || 'Profile'} Bingo`;
      setCurrentBgColor(profile.backgroundColour || profile.backgroundColor || currentBgColor);
      if (profile.base64Image) {
        const prefix = profile.base64Image.startsWith('data:') ? '' : 'data:image/png;base64,';
        setLogoSrc(prefix + profile.base64Image);
      }
      if (profile.animationFile) {
        try {
          const animResponse = await fetch(`http://localhost:5555/animationValue?fileName=${profile.animationFile}`);
          if (animResponse.ok) {
            const animData = await animResponse.json();
            setSpinnerAnimData(animData);
            setAnimationKey(prev => prev + 1);
          } else {
            setSpinnerAnimData(spinnerAnim);
            setAnimationKey(prev => prev + 1);
          }
        } catch (e) {
          console.error('Failed to load animation for applyProfileToUI:', e);
          setSpinnerAnimData(spinnerAnim);
          setAnimationKey(prev => prev + 1);
        }
      } else {
        setSpinnerAnimData(spinnerAnim);
        setAnimationKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('applyProfileToUI error:', err);
    }
  };

  // fetch value file names, images, and animations when create-new dialog opens
  useEffect(() => {
    if (!createNewOpen) return;
    const fetchData = async () => {
      try {
        const resp = await fetch('http://localhost:5555/valueFileNames');
        if (!resp.ok) throw new Error('Failed to fetch value file names');
        const data = await resp.json();
        setValuesFileNames(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching value file names:', err);
        setValuesFileNames([]);
      }
      try {
        const resp = await fetch('http://localhost:5555/images');
        if (!resp.ok) throw new Error('Failed to fetch images');
        const data = await resp.json();
        setImages(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching images:', err);
        setImages([]);
      }
      try {
        const resp = await fetch('http://localhost:5555/animationFileNames');
        if (!resp.ok) throw new Error('Failed to fetch animation file names');
        const data = await resp.json();
        setAnimationFileNames(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching animation file names:', err);
        setAnimationFileNames([]);
      }
      try {
        const resp = await fetch('http://localhost:5555/animations');
        if (!resp.ok) throw new Error('Failed to fetch animations');
        const data = await resp.json();
        setAnimations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching animations:', err);
        setAnimations([]);
      }
    };
    fetchData();
  }, [createNewOpen]);

  useEffect(() => {
    if (!createNewOpen || !selectedAnimationName) return;
    const matchingAnimation = animations.find(a => a.name === selectedAnimationName) || null;
    setSelectedAnimation(matchingAnimation);
    setSelectedAnimationData(matchingAnimation ? decodeAnimationValue(matchingAnimation) : null);
  }, [createNewOpen, selectedAnimationName, animations]);

  const decodeAnimationValue = (animation) => {
    if (!animation || !animation.value) return null;
    try {
      // Some backends return URL-safe base64; convert if needed
      const safeBase64 = animation.value.replace(/-/g, '+').replace(/_/g, '/');
      const padded = safeBase64.padEnd(Math.ceil(safeBase64.length / 4) * 4, '=');
      const decoded = atob(padded);
      return JSON.parse(decoded);
    } catch (err) {
      console.error('Failed to parse animation value:', err, animation);
      return null;
    }
  };

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
      if (response.status === 204) {
        throw new Error('All numbers have been called – the game is complete');
      }
      if (!response.ok) throw new Error('Failed to fetch number');

      // read as text then try to parse JSON so this works with both JSON and plain-text responses
      const raw = await response.text();
      let value;
      try {
        const parsed = JSON.parse(raw);
        value = typeof parsed === 'object' && parsed !== null && 'number' in parsed ? parsed.number : raw;
        setCall(typeof parsed === 'object' && parsed !== null && 'call' in parsed ? parsed.call : null);
      } catch {
        value = raw;
        setCall(null);
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
    setCall(null);
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
      {/* logo size controls */}
      <button
        aria-label="Decrease logo size"
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
        onClick={() => setLogoHeight(prev => prev * 0.97)}
      >
        ➖
      </button>
      <button
        aria-label="Increase logo size"
        style={{
          position: 'fixed',
          top: 10,
          right: 50,
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          padding: 4,
          zIndex: 1000
        }}
        onClick={() => setLogoHeight(prev => prev * 1.03)}
      >
        ➕
      </button>
      {/* settings cog in top-right corner (will open customization popup in future) */}
      <button
        aria-label="Settings"
        style={{
          position: 'fixed',
          top: 10,
          right: 90,
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
          <img src={logoSrc} alt="VerseFirst" style={{ height: logoHeight, display: 'inline-block' }} />
        </h1>
        <button onClick={fetchNumber} disabled={loading}>
          {loading ? 'Fetching...' : 'Generate Number'}
        </button>
        <button
          onClick={() => setResetConfirmOpen(true)}
          disabled={loading}
          style={{ marginLeft: 8 }}
        >
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
              /* position the call/number at the top area of the left column
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
                  key={animationKey}
                  animationData={spinnerAnimData}
                  loop={true}
                  autoplay={true}
                  style={{ width: 320, height: 320, background: 'transparent' }}
                />
              </div>
            ) : number ? (
              <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
                {call ? (
                  <div style={{ fontSize: 36, color: '#ffffff', opacity: 0.9, marginBottom: 8, textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>{call}</div>
                ) : null}
                <div style={{ fontSize: 240, fontWeight: 700, lineHeight: 1, textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}>{number}</div>
              </div>
            ) : (
              <div style={{ color: '#ffffff', fontStyle: 'italic', fontSize: 20, pointerEvents: 'auto', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>No number generated yet</div>
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
            <div style={{ color: '#ffffff', fontStyle: 'italic', fontSize: 20, textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>No history yet</div>
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
                        textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
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
                        <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>{n}</td>
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
              maxHeight: '80vh',
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
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f5f5f5'
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setEditingProfileUuid(null);
                    setNewProfileName('');
                    setNewProfileBgColor('');
                    setSelectedValuesFile('');
                    setSelectedImage(null);
                    setSelectedAnimation(null);
                    setSelectedAnimationName('');
                    setSelectedAnimationData(null);
                    setCreateNewError(null);
                    setCreateNewOpen(true);
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
                  Create New
                </button>
                <button
                  disabled={!selectedProfile || loading}
                  onClick={() => {
                    if (!selectedProfile) return;
                    setEditingProfileUuid(selectedProfile.uuid || null);
                    setNewProfileName(selectedProfile.name || '');
                    setNewProfileBgColor(selectedProfile.backgroundColour || '');
                    setSelectedValuesFile(selectedProfile.valuesFile || selectedProfile.valueFile || selectedProfile.ValuesFile || '');
                    const matchingImage = images.find(i => i.base64Image === selectedProfile.base64Image || i.name === selectedProfile.imageName);
                    setSelectedImage(matchingImage || (selectedProfile.base64Image ? { name: '', base64Image: selectedProfile.base64Image } : null));
                    setSelectedAnimationName(selectedProfile.animationFile || '');
                    const matchingAnimation = animations.find(a => a.name === (selectedProfile.animationFile || '')) || null;
                    setSelectedAnimation(matchingAnimation);
                    setSelectedAnimationData(matchingAnimation ? decodeAnimationValue(matchingAnimation) : null);
                    setCreateNewError(null);
                    setCreateNewOpen(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    color: '#000',
                    cursor: selectedProfile && !loading ? 'pointer' : 'not-allowed',
                    fontSize: 14,
                    opacity: selectedProfile && !loading ? 1 : 0.6
                  }}
                >
                  Edit
                </button>
                <button
                  disabled={!selectedProfile || loading}
                  onClick={async () => {
                    if (!selectedProfile) return;

                    setLoading(true);
                    setError(null);

                    try {
                      // POST the selected profile to setProfile endpoint
                      const response = await fetch('http://localhost:5555/setProfile', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(selectedProfile),
                      });

                      if (!response.ok) {
                        const text = await response.text();
                        let errorMsg = `Failed to set profile (${response.status})`;
                        try {
                          const result = JSON.parse(text);
                          if (result.error) errorMsg = result.error;
                        } catch {}
                        throw new Error(errorMsg);
                      }

                      // Apply profile to UI and remember it as current
                      try {
                        await applyProfileToUI(selectedProfile);
                        setCurrentProfile(selectedProfile);
                      } catch (uiErr) {
                        console.error('Failed to apply profile to UI:', uiErr);
                      }
                      setSettingsOpen(false);

                      // Now call resetGame to clear the board
                      try {
                        const resetResponse = await fetch('http://localhost:5555/api/resetGame', { method: 'POST' });
                        if (!resetResponse.ok) throw new Error('Failed to reset game on server');
                        // Clear UI
                        setNumber(null);
                        setCall(null);
                        setHistory([]);
                        setHistoryLookup('');
                        setHistoryLookupFocused(false);
                      } catch (resetErr) {
                        setError(resetErr.message);
                      }
                    } catch (err) {
                      setError(err.message || 'Failed to apply profile');
                      console.error('Error applying profile:', err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: selectedProfile && !loading ? '#1976d2' : '#ccc',
                    color: '#fff',
                    cursor: selectedProfile && !loading ? 'pointer' : 'not-allowed',
                    fontSize: 14,
                    opacity: selectedProfile && !loading ? 1 : 0.6
                  }}
                >
                  {loading ? 'Applying...' : 'Apply'}
                </button>
              </div>
              <button
                disabled={!selectedProfile || loading}
                onClick={async () => {
                  if (!selectedProfile) return;

                  setLoading(true);
                  setError(null);

                  try {
                    const response = await fetch('http://localhost:5555/profile', {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(selectedProfile),
                    });

                    if (!response.ok) {
                      const text = await response.text();
                      let errorMsg = `Failed to delete profile (${response.status})`;
                      try {
                        const result = JSON.parse(text);
                        if (result.error) errorMsg = result.error;
                      } catch {}
                      throw new Error(errorMsg);
                    }

                    // Refresh profiles list
                    try {
                      const profilesResponse = await fetch('http://localhost:5555/profiles');
                      if (profilesResponse.ok) {
                        const data = await profilesResponse.json();
                        setProfiles(data);
                        setSelectedProfile(null);
                      }
                    } catch (refreshErr) {
                      console.error('Failed to refresh profiles after deletion', refreshErr);
                    }
                  } catch (err) {
                    setError(err.message || 'Failed to delete profile');
                    console.error('Error deleting profile:', err);
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: selectedProfile && !loading ? '#d32f2f' : '#ccc',
                  color: '#fff',
                  cursor: selectedProfile && !loading ? 'pointer' : 'not-allowed',
                  fontSize: 14,
                  opacity: selectedProfile && !loading ? 1 : 0.6
                }}
              >
                {loading ? 'Deleting...' : 'Delete'}
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
          onClick={resetCreateModal}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              width: '90%',
              maxWidth: 400,
              minHeight: 250,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              color: '#000',
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
              <h2 style={{ margin: 0, fontSize: 18, color: '#000' }}>{editingProfileUuid ? 'Edit Profile' : 'Create New Profile'}</h2>
            </div>

            {/* Form */}
            <div
              style={{
                flex: 1,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                overflowY: 'auto'
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
                <label style={{ display: 'block', marginBottom: 4, color: '#000', fontSize: 14 }}>Values File</label>
                <select
                  value={selectedValuesFile}
                  onChange={(e) => setSelectedValuesFile(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    outline: 'none',
                    fontSize: 14,
                    color: '#000'
                  }}
                >
                  <option value="">(none)</option>
                  {valuesFileNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div style={{ marginTop: 4, fontSize: 12, color: '#555' }}>
                  Selected: {selectedValuesFile || '(none)'}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#000', fontSize: 14 }}>Profile Image</label>
                <select
                  value={selectedImage ? selectedImage.name : ''}
                  onChange={(e) => {
                    const imageName = e.target.value;
                    const img = images.find(i => i.name === imageName) || null;
                    setSelectedImage(img);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    outline: 'none',
                    fontSize: 14,
                    color: '#000'
                  }}
                >
                  <option value="">(none)</option>
                  {images.map(img => (
                    <option key={img.name} value={img.name}>{img.name}</option>
                  ))}
                </select>
                {selectedImage && (
                  <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <img
                      src={selectedImage.base64Image.startsWith('data:') ? selectedImage.base64Image : `data:image/png;base64,${selectedImage.base64Image}`}
                      alt={selectedImage.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: 120,
                        borderRadius: 6,
                        border: '1px solid #ddd'
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#000', fontSize: 14 }}>Loading Animation</label>
                <select
                  value={selectedAnimationName}
                  onChange={(e) => {
                    const animName = e.target.value;
                    const anim = animations.find(a => a.name === animName) || null;
                    setSelectedAnimationName(animName);
                    setSelectedAnimation(anim);
                    setSelectedAnimationData(anim ? decodeAnimationValue(anim) : null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    outline: 'none',
                    fontSize: 14,
                    color: '#000'
                  }}
                >
                  <option value="">(none)</option>
                  {animationFileNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

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
                      uuid: editingProfileUuid || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `uuid-${Date.now()}-${Math.random().toString(16).slice(2)}`),
                      name: newProfileName.trim(),
                      backgroundColour: newProfileBgColor.trim(),
                      valuesFile: selectedValuesFile,
                      // include old key in case the backend still expects it
                      valueFile: selectedValuesFile,
                      // some servers are case-sensitive; make sure we cover common variants
                      ValuesFile: selectedValuesFile,
                      animationFile: selectedAnimationName || (selectedAnimation ? selectedAnimation.name : ''),
                      base64Image: selectedImage ? selectedImage.base64Image : '',
                    };
                    const endpoint = editingProfileUuid ? 'http://localhost:5555/updateProfile' : 'http://localhost:5555/profile';
                    console.log('Saving profile with payload:', payload, 'endpoint:', endpoint, 'selectedAnimationName:', selectedAnimationName, 'selectedAnimation:', selectedAnimation);
                    const response = await fetch(endpoint, {
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

                    // Refresh profiles list (ignore errors here) and update selected/current profile
                    try {
                      const profilesResponse = await fetch('http://localhost:5555/profiles');
                      if (profilesResponse.ok) {
                        const data = await profilesResponse.json();
                        setProfiles(data);
                        if (editingProfileUuid) {
                          const updated = data.find(p => p.uuid === editingProfileUuid) || null;
                          if (updated) {
                            setSelectedProfile(updated);
                            // if the edited profile is currently applied, update UI immediately
                            if (currentProfile && currentProfile.uuid === editingProfileUuid) {
                              try {
                                await applyProfileToUI(updated);
                                setCurrentProfile(updated);
                              } catch (uiErr) {
                                console.error('Failed to reapply updated profile to UI:', uiErr);
                              }
                            }
                          }
                        }
                      }
                    } catch (refreshErr) {
                      console.error('Failed to refresh profiles after creation', refreshErr);
                    }

                    // If we edited the currently-applied profile, re-run the Apply flow so it behaves identically
                    if (editingProfileUuid && currentProfile && editingProfileUuid === currentProfile.uuid) {
                      try {
                        setLoading(true);
                        setError(null);
                        const applyResp = await fetch('http://localhost:5555/setProfile', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        });
                        if (!applyResp.ok) {
                          const txt = await applyResp.text();
                          let msg = `Failed to apply profile (${applyResp.status})`;
                          try { const r = JSON.parse(txt); if (r && r.error) msg = r.error; } catch {}
                          throw new Error(msg);
                        }

                        // Update UI with new profile data
                        try {
                          await applyProfileToUI(payload);
                          setCurrentProfile(payload);
                        } catch (uiErr) {
                          console.error('Failed to apply updated profile to UI after setProfile:', uiErr);
                        }

                        // Now call resetGame to clear the board (same as Apply)
                        try {
                          const resetResponse = await fetch('http://localhost:5555/api/resetGame', { method: 'POST' });
                          if (!resetResponse.ok) throw new Error('Failed to reset game on server');
                          setNumber(null);
                          setCall(null);
                          setHistory([]);
                          setHistoryLookup('');
                          setHistoryLookupFocused(false);
                        } catch (resetErr) {
                          setError(resetErr.message);
                        }
                      } catch (reapplyErr) {
                        console.error('Failed to reapply updated profile via setProfile:', reapplyErr);
                        setError(reapplyErr.message || 'Failed to reapply profile');
                      } finally {
                        setLoading(false);
                      }
                    }

                    // Close dialog and reset form
                    resetCreateModal();
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
                onClick={resetCreateModal}
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
      {/* Reset confirmation modal */}
      {resetConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4000
          }}
          onClick={() => setResetConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              padding: 20,
              borderRadius: 8,
              width: '90%',
              maxWidth: 420,
              boxShadow: '0 6px 24px rgba(0,0,0,0.25)'
            
              , color: '#000'
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 12 }}>Reset Game?</h3>
            <p style={{ marginTop: 0, marginBottom: 16 }}>This will clear the board. Are you sure?</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setResetConfirmOpen(false)}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setResetConfirmOpen(false);
                  try {
                    await resetGame();
                  } catch (e) {
                    console.error('Reset game failed:', e);
                  }
                }}
                style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#d32f2f', color: '#fff', cursor: 'pointer' }}
              >
                Reset Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
