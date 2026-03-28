import { useState, useEffect, useCallback, useRef } from 'react';
import samiFlag from '../assets/sami.jpg';
import { sanitize, makeRateLimiter, extractSpotifyId, extractYouTubeId } from './utils.js';
import { saveToken, loadToken, clearToken, tokenNeedsRefresh } from './tokens.js';
import {
  initiateSpotifyAuth, exchangeSpotifyCode, refreshSpotifyToken,
  initiateGoogleAuth, exchangeGoogleCode, refreshGoogleToken,
} from './oauth.js';
import {
  spMeta, spTracks, spSearch, spCreate,
  ytMeta, ytItems, ytSearch, ytCreate, ytAdd,
} from './api.js';
import { TRANSLATIONS } from './translations.js';

// localStorage keys — generic names (IlluPia branding is UI-only)
const CACHE_SP = 'pb_sp';
const CACHE_GG = 'pb_gg';
const LANG_KEY = 'pb_lang';
// Allowlist for result links — prevents open redirects (OWASP A01)
const SAFE_HOSTS = ['open.spotify.com', 'www.youtube.com', 'music.youtube.com'];

const rl = makeRateLimiter();

// ── Inline SVG icons (no extra dependency) ───────────────────────────────────
const SpotifyIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect width="20" height="20" rx="5" fill="#1DB954" />
    <path d="M10 3C6.13 3 3 6.13 3 10s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm3.21 10.1a.43.43 0 0 1-.6.14c-1.64-1-3.7-1.22-6.13-.67a.43.43 0 1 1-.19-.84c2.66-.59 4.94-.34 6.78.77a.43.43 0 0 1 .14.6zm.86-1.92a.54.54 0 0 1-.74.18C11.48 10.2 8.72 9.87 6.4 10.56a.54.54 0 0 1-.3-1.03c2.6-.79 5.83-.41 8.04.95a.54.54 0 0 1 .18.74zm.07-2c-2.24-1.33-5.94-1.45-8.08-.76a.65.65 0 1 1-.37-1.24c2.52-.77 6.71-.62 9.36.87a.65.65 0 0 1-.91 1.13z" fill="white" />
  </svg>
);

const YouTubeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect width="20" height="20" rx="5" fill="#FF0000" />
    <path d="M16.72 6.76a1.98 1.98 0 0 0-1.4-1.4C14.06 5 10 5 10 5s-4.06 0-5.32.36a1.98 1.98 0 0 0-1.4 1.4C3 8.02 3 10 3 10s0 1.98.28 3.24a1.98 1.98 0 0 0 1.4 1.4C5.94 15 10 15 10 15s4.06 0 5.32-.36a1.98 1.98 0 0 0 1.4-1.4C17 11.98 17 10 17 10s0-1.98-.28-3.24z" fill="white" />
    <path d="M8.5 12.2V7.8L12.5 10l-4 2.2z" fill="#FF0000" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M1 7h12M8 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
    <path d="M1 1h3V0H0v11h11V8h-1v2H1V1zm6-1v1h2.29L4.65 4.64l.7.71L10 1.71V4h1V0H7z" fill="currentColor" />
  </svg>
);

// ── Language popup — shown once on first visit ────────────────────────────────
function LangPopup({ onSelect }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={() => onSelect('en')}
          style={langBtnStyle}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
          aria-label="English"
        >
          <span style={{ fontSize: '3rem', lineHeight: 1 }}>🇬🇧</span>
        </button>
        <button
          onClick={() => onSelect('se')}
          style={{ ...langBtnStyle, padding: '28px 24px' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
          aria-label="Sámegiel"
        >
          <img
            src={samiFlag}
            alt="Sámi flag"
            style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, display: 'block' }}
          />
        </button>
      </div>
    </div>
  );
}

const langBtnStyle = {
  background: '#161616', border: '1px solid #222', borderRadius: 16,
  padding: '32px 28px', cursor: 'pointer', lineHeight: 1,
  transition: 'border-color .15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ── Auth pill ─────────────────────────────────────────────────────────────────
function AuthPill({ icon, label, user, connected, onConnect, onDisconnect, disconnectLabel }) {
  return (
    <button
      className={`bp${connected ? ' on' : ''}`}
      onClick={connected ? undefined : onConnect}
      style={{ cursor: connected ? 'default' : 'pointer' }}
    >
      {icon}
      <div className="bp-info">
        <div className="bp-lbl">{label}</div>
        <div className="bp-usr">{connected ? user : '—'}</div>
      </div>
      {connected
        ? (
          <button
            className="bp-x"
            onClick={e => { e.stopPropagation(); onDisconnect(); }}
            title={disconnectLabel}
            aria-label={disconnectLabel}
          >✕</button>
        )
        : <div className="bp-dot" />}
    </button>
  );
}

// ── Conversion section ────────────────────────────────────────────────────────
function ConvertSection({
  id, fromIcon, toIcon, subtitle,
  url, setUrl, urlValid, urlPlaceholder,
  connected, converting,
  onConvert, onPaste,
  progress, result,
  onReset, t, children,
}) {
  return (
    <div className="section">
      {/* Header */}
      <div className="sec-head">
        <div>
          <div className="sec-name">{id === 'illu' ? 'Illu' : 'Pia'}</div>
          <div className="sec-sub">{subtitle}</div>
        </div>
        <div className="flow">
          {fromIcon}
          <span className="flow-arr"><ArrowIcon /></span>
          {toIcon}
        </div>
      </div>

      {/* Auth pills — order differs between Illu and Pia */}
      {children}

      {/* URL input */}
      <div className="inp-wrap">
        <input
          className={`inp${url.length > 4 && !urlValid ? ' err' : ''}`}
          type="url"
          placeholder={urlPlaceholder}
          maxLength={512}
          value={url}
          onChange={e => setUrl(e.target.value)}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
        />
        <button className="paste-btn" onClick={onPaste}>{t('paste')}</button>
      </div>

      {/* Convert button */}
      <button
        className="cvt-btn"
        onClick={onConvert}
        disabled={!urlValid || !connected || converting}
      >
        {converting ? t('loading') : t('convert')}
      </button>

      {/* Progress */}
      {(converting || progress.tracks.length > 0) && (
        <div className="prog">
          <div className="prog-bg">
            <div className="prog-fill" style={{ width: `${progress.pct}%` }} />
          </div>
          <div className="prog-lbl">{progress.lbl}</div>
          {progress.tracks.length > 0 && (
            <div className="tracks">
              {progress.tracks.map((tr, i) => (
                <div key={i} className="trow">
                  <div className="trow-info">
                    <div className="trow-name">{tr.name}</div>
                    {tr.artist && <div className="trow-artist">{tr.artist}</div>}
                  </div>
                  <div className="trow-st">{tr.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="res">
          <div className="stats">
            <div className="stat">
              <div className="stat-n">{result.matched}</div>
              <div className="stat-l">{t('matched')}</div>
            </div>
            <div className="stat">
              <div className="stat-n">{result.missed}</div>
              <div className="stat-l">{t('missed')}</div>
            </div>
          </div>
          <a className="open-link" href={result.url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon />
            {t('open')}
          </a>
          <button className="again-btn" onClick={onReset}>{t('again')}</button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Bridge() {
  const SP_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const GG_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Language — null triggers the first-visit popup
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY));
  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;

  const selectLang = (l) => {
    localStorage.setItem(LANG_KEY, l);
    setLang(l);
  };

  // Auth state
  const [spToken, setSpToken] = useState(null);
  const [ggToken, setGgToken] = useState(null);
  const [spUser, setSpUser] = useState(null);
  const [ggUser, setGgUser] = useState(null);

  // Section state
  const [illuUrl, setIlluUrl] = useState('');
  const [piaUrl, setPiaUrl] = useState('');
  const [illuConv, setIlluConv] = useState(false);
  const [piaConv, setPiaConv] = useState(false);
  const [illuProg, setIlluProg] = useState({ pct: 0, lbl: '', tracks: [] });
  const [piaProg, setPiaProg] = useState({ pct: 0, lbl: '', tracks: [] });
  const [illuResult, setIlluResult] = useState(null);
  const [piaResult, setPiaResult] = useState(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMsg(sanitize(String(msg)));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3200);
  }, []);

  // Validate env vars
  useEffect(() => {
    if (!SP_ID || SP_ID === 'your_spotify_client_id_here') showToast('Missing Spotify client ID');
    if (!GG_ID || GG_ID === 'your_google_client_id_here') showToast('Missing Google client ID');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore tokens + handle OAuth callback + silent refresh
  useEffect(() => {
    // 1. Restore persisted sessions
    const sp = loadToken(CACHE_SP);
    if (sp) { setSpToken(sp.accessToken); setSpUser(sp.user); }
    const gg = loadToken(CACHE_GG);
    if (gg) { setGgToken(gg.accessToken); setGgUser(gg.user); }

    // 2. Handle OAuth redirect (code in query string)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    // Clean URL immediately — remove auth codes from browser history (OWASP A07)
    if (code || error) history.replaceState({}, '', '/bridge');

    if (error) { showToast('Auth cancelled'); return; }

    if (code && sessionStorage.getItem('pb_sp_v')) {
      exchangeSpotifyCode(code, state, SP_ID)
        .then((result) => {
          saveToken(CACHE_SP, result);
          setSpToken(result.accessToken);
          setSpUser(result.user);
        })
        .catch(() => showToast(t('autherror')));
      return;
    }

    if (code && sessionStorage.getItem('pb_gg_v')) {
      exchangeGoogleCode(code, state, GG_ID)
        .then((result) => {
          saveToken(CACHE_GG, result);
          setGgToken(result.accessToken);
          setGgUser(result.user);
        })
        .catch(() => showToast(t('autherror')));
      return;
    }

    // 3. Silent background refresh if token is within 5 min of expiry
    const spCached = loadToken(CACHE_SP);
    if (spCached?.refreshToken && tokenNeedsRefresh(CACHE_SP)) {
      refreshSpotifyToken(spCached.refreshToken, SP_ID)
        .then((updated) => {
          const merged = { ...spCached, ...updated };
          saveToken(CACHE_SP, merged);
          setSpToken(merged.accessToken);
        })
        .catch(() => {}); // Silent fail — existing token still valid until actual expiry
    }

    const ggCached = loadToken(CACHE_GG);
    if (ggCached?.refreshToken && tokenNeedsRefresh(CACHE_GG)) {
      refreshGoogleToken(ggCached.refreshToken, GG_ID)
        .then((updated) => {
          const merged = { ...ggCached, ...updated };
          saveToken(CACHE_GG, merged);
          setGgToken(merged.accessToken);
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const connectSpotify = () => {
    if (!rl('spa', 5, 60_000)) { showToast(t('ratelimit')); return; }
    if (!SP_ID) { showToast(t('noenv')); return; }
    initiateSpotifyAuth(SP_ID);
  };
  const disconnectSpotify = () => {
    clearToken(CACHE_SP); setSpToken(null); setSpUser(null);
  };
  const connectGoogle = () => {
    if (!rl('gga', 5, 60_000)) { showToast(t('ratelimit')); return; }
    if (!GG_ID) { showToast(t('noenv')); return; }
    initiateGoogleAuth(GG_ID);
  };
  const disconnectGoogle = () => {
    clearToken(CACHE_GG); setGgToken(null); setGgUser(null);
  };

  // ── URL validation ────────────────────────────────────────────────────────
  const illuValid = /youtube\.com\/(playlist\?list=|watch\?.*list=)[A-Za-z0-9_-]+/i.test(illuUrl.trim())
    || /^[A-Za-z0-9_]{10,}$/.test(illuUrl.trim());

  const piaValid = /open\.spotify\.com\/playlist\/[A-Za-z0-9]{22}/i.test(piaUrl.trim())
    || /^[A-Za-z0-9]{22}$/.test(piaUrl.trim());

  // ── Paste helper ──────────────────────────────────────────────────────────
  const pasteUrl = async (setter) => {
    try {
      const text = await navigator.clipboard.readText();
      setter(sanitize(text));
    } catch {
      showToast('Paste manually');
    }
  };

  // ── Safe URL for result links (OWASP A01: prevents open redirects) ────────
  const safeUrl = (url) => {
    try {
      const u = new URL(url);
      return SAFE_HOSTS.includes(u.hostname) ? url : '#';
    } catch { return '#'; }
  };

  // ── Illu: YouTube → Spotify ───────────────────────────────────────────────
  const doIllu = async () => {
    if (!rl('cv_illu', 3, 300_000)) { showToast(t('ratelimit')); return; }
    if (!spToken || !ggToken) { showToast(t('needboth')); return; }

    const plId = extractYouTubeId(illuUrl.trim());
    if (!plId) { showToast(t('urlerror')); return; }

    setIlluConv(true);
    setIlluResult(null);
    setIlluProg({ pct: 0, lbl: t('loading'), tracks: [] });

    try {
      const meta = await ytMeta(plId, ggToken);
      const name = sanitize(meta?.title ?? 'Converted');
      setIlluProg(p => ({ ...p, pct: 5 }));

      const items = await ytItems(plId, ggToken);
      setIlluProg(p => ({ ...p, pct: 10, lbl: `${items.length}` }));

      let matched = 0, missed = 0;
      const uris = [];
      const trackRows = [];

      for (let i = 0; i < items.length; i++) {
        // Strip common YouTube title noise before searching Spotify
        const clean = sanitize(items[i].title)
          .replace(/\(Official.*?\)/gi, '')
          .replace(/\[.*?]/g, '')
          .replace(/\|\s*.+$/, '')
          .trim();

        trackRows.push({ name: items[i].title, artist: '', status: '⏳' });
        setIlluProg(p => ({
          ...p, pct: 10 + (i / items.length) * 78,
          lbl: t('searching'), tracks: [...trackRows],
        }));

        const tr = await spSearch(clean, spToken);
        if (tr) {
          uris.push(tr.uri);
          trackRows[i] = { ...trackRows[i], status: '✅' };
          matched++;
        } else {
          trackRows[i] = { ...trackRows[i], status: '❌' };
          missed++;
        }
        setIlluProg(p => ({ ...p, tracks: [...trackRows] }));
        await new Promise(r => setTimeout(r, 250));
      }

      setIlluProg(p => ({ ...p, pct: 90, lbl: t('creating') }));
      const pl = await spCreate(name, `From YouTube: ${name}`, uris, spToken);
      setIlluProg(p => ({ ...p, pct: 100, lbl: t('done') }));
      setIlluResult({ matched, missed, url: safeUrl(`https://open.spotify.com/playlist/${pl.id}`) });
    } catch (e) {
      showToast(sanitize(e.message));
    } finally {
      setIlluConv(false);
    }
  };

  // ── Pia: Spotify → YouTube ────────────────────────────────────────────────
  const doPia = async () => {
    if (!rl('cv_pia', 3, 300_000)) { showToast(t('ratelimit')); return; }
    if (!spToken || !ggToken) { showToast(t('needboth')); return; }

    const plId = extractSpotifyId(piaUrl.trim());
    if (!plId) { showToast(t('urlerror')); return; }

    setPiaConv(true);
    setPiaResult(null);
    setPiaProg({ pct: 0, lbl: t('loading'), tracks: [] });

    try {
      const meta = await spMeta(plId, spToken);
      const name = sanitize(meta?.name ?? 'Converted');
      setPiaProg(p => ({ ...p, pct: 5 }));

      const tracks = await spTracks(plId, spToken);
      setPiaProg(p => ({ ...p, pct: 10, lbl: `${tracks.length}` }));

      setPiaProg(p => ({ ...p, pct: 12, lbl: t('creating') }));
      const ytPl = await ytCreate(name, `From Spotify: ${name}`, ggToken);

      let matched = 0, missed = 0;
      const trackRows = [];

      for (let i = 0; i < tracks.length; i++) {
        const tr = tracks[i];
        const artist = sanitize(tr.artists?.[0]?.name ?? '');
        const title = sanitize(tr.name ?? '');

        trackRows.push({ name: title, artist, status: '⏳' });
        setPiaProg(p => ({
          ...p, pct: 12 + (i / tracks.length) * 76,
          lbl: t('searching'), tracks: [...trackRows],
        }));

        const vid = await ytSearch(`${artist} ${title}`, ggToken);
        if (vid) {
          const ok = await ytAdd(ytPl.id, vid, ggToken);
          trackRows[i] = { ...trackRows[i], status: ok ? '✅' : '⚠️' };
          if (ok) matched++; else missed++;
        } else {
          trackRows[i] = { ...trackRows[i], status: '❌' };
          missed++;
        }
        setPiaProg(p => ({ ...p, tracks: [...trackRows] }));
        await new Promise(r => setTimeout(r, 300));
      }

      setPiaProg(p => ({ ...p, pct: 100, lbl: t('done') }));
      setPiaResult({ matched, missed, url: safeUrl(`https://www.youtube.com/playlist?list=${ytPl.id}`) });
    } catch (e) {
      showToast(sanitize(e.message));
    } finally {
      setPiaConv(false);
    }
  };

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetIllu = () => { setIlluUrl(''); setIlluResult(null); setIlluProg({ pct: 0, lbl: '', tracks: [] }); };
  const resetPia = () => { setPiaUrl(''); setPiaResult(null); setPiaProg({ pct: 0, lbl: '', tracks: [] }); };

  // ── Auth pill shared props ────────────────────────────────────────────────
  const spPillProps = {
    icon: <SpotifyIcon />, label: 'Spotify', user: spUser,
    connected: !!spToken, onConnect: connectSpotify, onDisconnect: disconnectSpotify,
    disconnectLabel: t('disconnect'),
  };
  const ggPillProps = {
    icon: <YouTubeIcon />, label: 'YouTube', user: ggUser,
    connected: !!ggToken, onConnect: connectGoogle, onDisconnect: disconnectGoogle,
    disconnectLabel: t('disconnect'),
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400&display=swap" rel="stylesheet" />
      <style>{CSS}</style>

      {/* Language popup — first visit only */}
      {!lang && <LangPopup onSelect={selectLang} />}

      {/* Toast */}
      <div
        className="toast"
        style={{ opacity: toastMsg ? 1 : 0, transform: `translateX(-50%) translateY(${toastMsg ? 0 : 60}px)` }}
      >
        {toastMsg}
      </div>

      <div className="bridge-app">
        {/* Topbar */}
        <div className="topbar">
          <span className="wordmark">IlluPia</span>
          <button
            className="lang-btn"
            onClick={() => setLang(null)}
            aria-label="Change language"
          >
            {lang === 'se'
              ? <img src={samiFlag} alt="SE" style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
              : '🇬🇧'}
          </button>
        </div>

        <div className="sections">
          {/* ── Illu: YouTube → Spotify ── */}
          <ConvertSection
            id="illu"
            fromIcon={<YouTubeIcon size={26} />}
            toIcon={<SpotifyIcon size={26} />}
            subtitle={t('illuSub')}
            url={illuUrl} setUrl={setIlluUrl}
            urlValid={illuValid}
            urlPlaceholder="youtube.com/playlist?list=…"
            connected={!!spToken && !!ggToken}
            converting={illuConv}
            onConvert={doIllu}
            onPaste={() => pasteUrl(setIlluUrl)}
            progress={illuProg}
            result={illuResult}
            onReset={resetIllu}
            t={t}
          >
            <div className="auth-row">
              <AuthPill {...ggPillProps} />
              <AuthPill {...spPillProps} />
            </div>
          </ConvertSection>

          {/* ── Pia: Spotify → YouTube ── */}
          <ConvertSection
            id="pia"
            fromIcon={<SpotifyIcon size={26} />}
            toIcon={<YouTubeIcon size={26} />}
            subtitle={t('piaSub')}
            url={piaUrl} setUrl={setPiaUrl}
            urlValid={piaValid}
            urlPlaceholder="open.spotify.com/playlist/…"
            connected={!!spToken && !!ggToken}
            converting={piaConv}
            onConvert={doPia}
            onPaste={() => pasteUrl(setPiaUrl)}
            progress={piaProg}
            result={piaResult}
            onReset={resetPia}
            t={t}
          >
            <div className="auth-row">
              <AuthPill {...spPillProps} />
              <AuthPill {...ggPillProps} />
            </div>
          </ConvertSection>
        </div>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Scoped with bridge-app wrapper; won't leak into Flip-FM pages.
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent }
  body { background: #0d0d0d }
  .bridge-app { font-family: 'Outfit', sans-serif; background: #0d0d0d; color: #f0f0f0; min-height: 100dvh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased }
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #1a1a1a; position: sticky; top: 0; z-index: 100; background: #0d0d0d }
  .wordmark { font-size: .65rem; font-weight: 300; letter-spacing: .22em; text-transform: uppercase; color: #444 }
  .lang-btn { background: none; border: 1px solid #1a1a1a; border-radius: 100px; padding: 6px 10px; cursor: pointer; font-size: 1rem; line-height: 1; transition: border-color .2s; display: flex; align-items: center }
  .lang-btn:hover { border-color: #444 }
  .sections { flex: 1; display: flex; flex-direction: column; gap: 1px; background: #1a1a1a }
  .section { background: #0d0d0d; padding: 28px 20px; display: flex; flex-direction: column; gap: 20px }
  .sec-head { display: flex; align-items: center; justify-content: space-between }
  .sec-name { font-size: 1.5rem; font-weight: 200; letter-spacing: -.02em }
  .sec-sub { font-size: .65rem; font-weight: 300; letter-spacing: .05em; color: #444; margin-top: 3px }
  .flow { display: flex; align-items: center; gap: 7px; color: #333 }
  .auth-row { display: flex; gap: 8px }
  .bp { flex: 1; background: #111; border: 1px solid #1a1a1a; border-radius: 100px; padding: 10px 14px; display: flex; align-items: center; gap: 9px; font-family: 'Outfit', sans-serif; transition: border-color .2s }
  .bp:not(.on) { cursor: pointer }
  .bp:not(.on):hover { border-color: #2a2a2a }
  .bp.on { border-color: #2a2a2a }
  .bp-info { flex: 1; min-width: 0 }
  .bp-lbl { font-size: .58rem; font-weight: 300; letter-spacing: .1em; text-transform: uppercase; color: #444 }
  .bp-usr { font-size: .73rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f0f0f0 }
  .bp-dot { width: 5px; height: 5px; border-radius: 50%; background: #222; flex-shrink: 0 }
  .bp-x { background: none; border: none; color: #333; font-size: .7rem; cursor: pointer; padding: 0 2px; flex-shrink: 0; font-family: 'Outfit', sans-serif; transition: color .2s }
  .bp-x:hover { color: #f44 }
  .inp-wrap { position: relative }
  .inp { width: 100%; background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 13px 52px 13px 15px; font-family: 'Outfit', sans-serif; font-size: .83rem; font-weight: 300; color: #f0f0f0; outline: none; transition: border-color .2s; -webkit-appearance: none }
  .inp::placeholder { color: #333 }
  .inp:focus { border-color: #2a2a2a }
  .inp.err { border-color: #f44 }
  .paste-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: .6rem; font-weight: 300; letter-spacing: .09em; text-transform: uppercase; color: #333; padding: 6px; transition: color .2s }
  .paste-btn:hover { color: #f0f0f0 }
  .cvt-btn { width: 100%; border: 1px solid #222; border-radius: 12px; padding: 15px; font-family: 'Outfit', sans-serif; font-size: .75rem; font-weight: 400; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; background: #111; color: #f0f0f0; transition: opacity .2s, border-color .2s }
  .cvt-btn:hover:not(:disabled) { border-color: #444 }
  .cvt-btn:disabled { opacity: .25; cursor: not-allowed }
  .prog { display: flex; flex-direction: column; gap: 10px }
  .prog-bg { background: #1a1a1a; border-radius: 100px; height: 2px; overflow: hidden }
  .prog-fill { height: 100%; border-radius: 100px; background: #444; transition: width .35s ease }
  .prog-lbl { font-size: .65rem; font-weight: 300; color: #444; letter-spacing: .04em }
  .tracks { display: flex; flex-direction: column; gap: 1px; max-height: 190px; overflow-y: auto; border-radius: 10px; border: 1px solid #1a1a1a }
  .trow { background: #111; padding: 8px 12px; display: flex; align-items: center; gap: 9px; font-size: .76rem }
  .trow-info { flex: 1; min-width: 0 }
  .trow-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
  .trow-artist { color: #444; font-size: .65rem; font-weight: 300 }
  .trow-st { font-size: .82rem; flex-shrink: 0 }
  .res { display: flex; flex-direction: column; gap: 12px }
  .stats { display: flex; gap: 7px }
  .stat { flex: 1; background: #111; border: 1px solid #1a1a1a; border-radius: 10px; padding: 13px; text-align: center }
  .stat-n { font-size: 1.35rem; font-weight: 200 }
  .stat-l { font-size: .58rem; font-weight: 300; letter-spacing: .1em; text-transform: uppercase; color: #444; margin-top: 2px }
  .open-link { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 14px; border-radius: 12px; border: 1px solid #1a1a1a; background: #111; color: #f0f0f0; font-family: 'Outfit', sans-serif; font-size: .7rem; font-weight: 300; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; transition: border-color .2s }
  .open-link:hover { border-color: #444 }
  .again-btn { background: none; border: none; color: #333; font-family: 'Outfit', sans-serif; font-size: .65rem; font-weight: 300; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; padding: 8px; text-align: center; transition: color .2s; width: 100% }
  .again-btn:hover { color: #f0f0f0 }
  .toast { position: fixed; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); background: #161616; border: 1px solid #222; border-radius: 100px; padding: 10px 20px; font-size: .73rem; font-weight: 300; font-family: 'Outfit', sans-serif; white-space: nowrap; z-index: 300; pointer-events: none; max-width: calc(100vw - 40px); overflow: hidden; text-overflow: ellipsis; transition: opacity .25s, transform .25s }
`;
