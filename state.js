// state.js — shared persistence module (extracted from index.html v20).
// Loaded by both index.html and library.html via <script src="state.js"></script>.
// Exposes the global `State`. Do NOT rename the wire identifiers below.

// ── PERSISTENCE: GitHub Gist + localStorage ───────────────────────────────
// Stores all app state in a private GitHub Gist (cross-device) with
// localStorage as instant-load cache. PAT is stored per-device only.
// ─────────────────────────────────────────────────────────────────────────
const State = (() => {
  const FILE     = 'stride-runplan.json';
  const ICS_FILE = 'stride-calendar.ics';
  const DESC = 'Stride Run Plan — sync data (do not edit manually)';
  const LS = { pat:'stride_pat', gist:'stride_gist_id', data:'stride_data', owner:'stride_owner' };

  const DEFAULTS = {
    v: 1,
    prefs: { dark:false, unit:'mi', colorCoding:false },
    library: { authorOrder:null, hiddenIds:[], customPlans:[] },
    activeRaceId: null,
    races: {}
  };

  const RACE_DEFAULTS = {
    planId:'pfitz-18-55-70', raceName:'', raceDate:'', weekStartDay:1,
    baseSchedule:null, baseMeta:null, edits:{ weeks:[] }
  };

  function merge(def, src) {
    if (!src || typeof src !== 'object') return JSON.parse(JSON.stringify(def));
    const out = JSON.parse(JSON.stringify(def));
    Object.keys(src).forEach(k => {
      if (k in out && src[k] !== null && typeof src[k]==='object' && !Array.isArray(src[k]))
        out[k] = merge(out[k], src[k]);
      else if (src[k] !== undefined) out[k] = src[k];
    });
    return out;
  }

  let _pat=null, _gistId=null, _data=null, _ownerLogin=null, _icsGenerator=null;
  let _saveTimer=null, _status='offline';
  const _cbs=[];

  const emit = s => { _status=s; _cbs.forEach(cb=>cb(s)); };
  const lsGet = k => { try{return JSON.parse(localStorage.getItem(k));}catch{return null;} }
  const lsSave = () => { try{localStorage.setItem(LS.data,JSON.stringify(_data));}catch{} }

  async function gh(method, path, body) {
    const r = await fetch('https://api.github.com'+path, {
      method,
      headers:{
        Authorization:'Bearer '+_pat,
        Accept:'application/vnd.github+json',
        'Content-Type':'application/json',
        'X-GitHub-Api-Version':'2022-11-28'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) throw new Error('GitHub API '+r.status+' '+r.statusText);
    return r.json();
  }

  function captureOwner(gistObj) {
    const login = gistObj?.owner?.login;
    if (login && login !== _ownerLogin) {
      _ownerLogin = login;
      try { localStorage.setItem(LS.owner, login); } catch {}
    }
  }

  async function loadOrCreateGist() {
    if (_gistId) {
      try {
        const g = await gh('GET','/gists/'+_gistId);
        captureOwner(g);
        const c = g.files[FILE]?.content;
        return c ? JSON.parse(c) : null;
      } catch { _gistId=null; }
    }
    const list = await gh('GET','/gists?per_page=100');
    const found = list.find(g => g.files[FILE]);
    if (found) {
      _gistId = found.id;
      localStorage.setItem(LS.gist, _gistId);
      const g = await gh('GET','/gists/'+_gistId);
      captureOwner(g);
      const c = g.files[FILE]?.content;
      return c ? JSON.parse(c) : null;
    }
    const created = await gh('POST','/gists',{
      description:DESC, public:false,
      files:{ [FILE]:{ content:JSON.stringify(JSON.parse(JSON.stringify(DEFAULTS)),null,2) } }
    });
    _gistId = created.id;
    localStorage.setItem(LS.gist, _gistId);
    captureOwner(created);
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  async function pushGist() {
    if (!_pat||!_gistId) return;
    const files = { [FILE]:{ content:JSON.stringify(_data,null,2) } };
    // Also push ICS if a generator is registered
    if (_icsGenerator) {
      try {
        const ics = _icsGenerator();
        if (ics) files[ICS_FILE] = { content: ics };
      } catch(e) { console.warn('ICS generation failed:', e); }
    }
    await gh('PATCH','/gists/'+_gistId, { files });
  }

  function schedulePush() {
    lsSave();
    emit('pending');
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async ()=>{
      if (!_pat) { emit('offline'); return; }
      try { emit('syncing'); await pushGist(); emit('synced'); }
      catch(e){ console.warn('Gist push failed:',e); emit('error'); }
    }, 1800);
  }

  return {
    async init() {
      try { _pat    = localStorage.getItem(LS.pat); } catch { _pat = null; }
      try { _gistId = localStorage.getItem(LS.gist); } catch { _gistId = null; }
      try { _ownerLogin = localStorage.getItem(LS.owner); } catch {}
      _data = merge(DEFAULTS, lsGet(LS.data));
      lsSave();
      if (!_pat) { emit('offline'); return; }
      try {
        emit('syncing');
        const remote = await loadOrCreateGist();
        if (remote) { _data = merge(DEFAULTS, remote); lsSave(); }
        emit('synced');
      } catch(e) { console.warn('Gist init failed:',e); emit('error'); }
    },

    get(path) {
      return path.split('.').reduce((o,k)=>o?.[k], _data);
    },

    set(path, value) {
      const keys=path.split('.'), last=keys.pop();
      const node=keys.reduce((o,k)=>{ if(o[k]==null||typeof o[k]!=='object')o[k]={}; return o[k]; },_data);
      node[last]=value;
      schedulePush();
    },

    async connect(token) {
      _pat = token.trim();
      localStorage.setItem(LS.pat, _pat);
      try {
        emit('syncing');
        const remote = await loadOrCreateGist();
        if (remote) { _data = merge(DEFAULTS, remote); lsSave(); }
        emit('synced');
        return { ok:true };
      } catch(e) {
        _pat=null; localStorage.removeItem(LS.pat);
        emit('offline');
        return { ok:false, err:e.message };
      }
    },

    disconnect() {
      _pat=null; _gistId=null; _ownerLogin=null;
      localStorage.removeItem(LS.pat);
      localStorage.removeItem(LS.gist);
      localStorage.removeItem(LS.owner);
      emit('offline');
    },

    // Register a function that returns the current ICS string.
    // Called automatically on every Gist push so the calendar stays live.
    setIcsGenerator(fn) { _icsGenerator = fn; },

    // Returns the webcal:// subscription URL, or null if not yet connected.
    getCalendarUrl() {
      if (!_gistId || !_ownerLogin) return null;
      return `https://gist.githubusercontent.com/${_ownerLogin}/${_gistId}/raw/${ICS_FILE}`;
    },

    // Force a Gist push without changing any data — used to write ICS on first load
    touch() { if (_pat && _gistId) schedulePush(); },

    hasPAT()  { return !!_pat; },
    status()  { return _status; },
    onStatus(cb) { _cbs.push(cb); cb(_status); }
  };
})();
