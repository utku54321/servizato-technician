import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { readCustomer, readJobs, patchJob, subscribe, mergeJob, jobFromBooking, findTech } from './shared.js';
import { sampleJobsFor } from './samples.js';
import {
  JobsScreen, JobScreen, NavigateScreen, OtpScreen, WorkScreen, DoneScreen, EarningsScreen, AccountScreen,
} from './screens.jsx';

const STORAGE_KEY = 'servizato-technician-v1';
const initialStore = { techId: 'aman', online: true, local: {} };

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? { ...initialStore, ...JSON.parse(raw) } : initialStore;
    return findTech(saved.techId) ? saved : initialStore;
  } catch {
    return initialStore;
  }
}

const TABS = ['jobs', 'earnings', 'account'];
const now = () => new Date().toISOString();
const byTime = (a, b) => (a.dateIso + String(a.slotStart).padStart(2, '0')).localeCompare(b.dateIso + String(b.slotStart).padStart(2, '0'));

export default function App() {
  const [store, setStore] = useState(loadStore);
  const [stack, setStack] = useState([{ name: 'jobs' }]);
  const [toast, setToast] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* storage unavailable */ }
  }, [store]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  // Re-read shared data when the customer or provider app changes something.
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  // Back button support (same pattern as the customer app).
  const depth = useRef(1);
  useEffect(() => { depth.current = stack.length; }, [stack]);
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const nav = useMemo(() => ({
    go: (name, params = {}) => {
      setStack((s) => [...s, { name, ...params }]);
      window.history.pushState({ servizato: true }, '');
      window.scrollTo(0, 0);
    },
    back: () => { if (depth.current > 1) window.history.back(); },
    tab: (name) => setStack([{ name }]),
    replace: (entries) => setStack(entries),
  }), []);

  // Install prompt (Android / desktop Chrome).
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const install = {
    installed, canPrompt: !!installPrompt, isIos: /iphone|ipad|ipod/i.test(window.navigator.userAgent),
    prompt: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice.catch(() => null); setInstallPrompt(null); },
  };

  const me = findTech(store.techId);

  // All jobs for the signed-in technician: own sample jobs + jobs assigned in the provider app.
  const { jobs, otherNew } = useMemo(() => {
    const local = sampleJobsFor(store.techId).map((j) => mergeJob(j, store.local[j.id]));
    const shared = readJobs();
    const customer = readCustomer();
    const fromCustomer = Object.fromEntries((customer?.bookings || []).map((b) => [b.id, jobFromBooking(b, customer)]));
    const remote = [];
    const others = [];
    Object.entries(shared).forEach(([id, u]) => {
      const base = fromCustomer[id] || (u.job ? { ...u.job, source: 'provider' } : null);
      if (!base) return;
      const job = mergeJob(base, u);
      if (u.techId === store.techId) remote.push(job);
      else if (u.techId && !u.techAccepted && job.status === 'assigned') others.push({ job, tech: findTech(u.techId) });
    });
    return { jobs: [...remote, ...local].filter((j) => !j.declined).sort(byTime), otherNew: others.filter((o) => o.tech) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tick]);

  const updateJob = (job, patch) => {
    if (job.source === 'local') {
      setStore((s) => {
        const prev = s.local[job.id] || {};
        return { ...s, local: { ...s.local, [job.id]: { ...prev, ...patch, history: { ...(prev.history || {}), ...(patch.history || {}) } } } };
      });
    } else {
      patchJob(job.id, patch);
      setTick((t) => t + 1);
    }
  };

  const actions = {
    accept: (job) => { updateJob(job, { techAccepted: true, history: { accepted: now() } }); setToast('Job accepted'); },
    decline: (job) => {
      if (job.source === 'local') updateJob(job, { status: 'declined' });
      else updateJob(job, { status: 'confirmed', techId: null, tech: null, techAccepted: false, returned: true }); // back to the provider to reassign
      setToast('Job declined. The provider will reassign it.');
      nav.tab('jobs');
    },
    startTrip: (job) => { updateJob(job, { status: 'onway', history: { onway: now() } }); nav.go('navigate', { id: job.id }); },
    verifyOtp: (job, code) => {
      if (code !== job.otp) return false;
      updateJob(job, { status: 'started', history: { started: now() } });
      setToast('OTP verified. Job started');
      nav.replace([{ name: 'jobs' }, { name: 'work', id: job.id }]);
      return true;
    },
    saveWork: (job, work) => updateJob(job, work),
    complete: (job, work) => {
      updateJob(job, { ...work, status: 'completed', history: { completed: now() } });
      nav.replace([{ name: 'jobs' }, { name: 'done', id: job.id }]);
    },
    collect: (job, method) => {
      updateJob(job, { status: 'paid', payMethod: method, history: { paid: now() } });
      setToast('Payment recorded');
    },
    toggleOnline: () => setStore((s) => ({ ...s, online: !s.online })),
    switchTech: (techId) => { setStore((s) => ({ ...s, techId })); setToast('Signed in as ' + findTech(techId).name); nav.tab('jobs'); },
    reset: () => { setStore((s) => ({ ...initialStore, techId: s.techId })); setToast('Demo jobs reset'); nav.tab('jobs'); },
  };

  const current = stack[stack.length - 1];
  const job = current.id ? jobs.find((j) => j.id === current.id) : null;
  const props = { store, me, jobs, job, otherNew, nav, actions, install, notify: setToast };

  let screen;
  const needsJob = ['job', 'navigate', 'otp', 'work', 'done'];
  if (needsJob.includes(current.name) && !job) screen = <JobsScreen {...props} />;
  else {
    switch (current.name) {
      case 'job': screen = <JobScreen {...props} />; break;
      case 'navigate': screen = <NavigateScreen {...props} />; break;
      case 'otp': screen = <OtpScreen {...props} />; break;
      case 'work': screen = <WorkScreen {...props} />; break;
      case 'done': screen = <DoneScreen {...props} />; break;
      case 'earnings': screen = <EarningsScreen {...props} />; break;
      case 'account': screen = <AccountScreen {...props} />; break;
      default: screen = <JobsScreen {...props} />;
    }
  }

  return (
    <div className="app">
      <main className="app-main" key={stack.length + current.name}>{screen}</main>
      {TABS.includes(current.name) && (
        <nav className="tabbar" aria-label="Main">
          {[
            { id: 'jobs', label: 'Jobs', icon: 'list' },
            { id: 'earnings', label: 'Earnings', icon: 'wallet' },
            { id: 'account', label: 'Account', icon: 'user' },
          ].map((t) => (
            <button key={t.id} type="button" className={'tab' + (current.name === t.id ? ' is-active' : '')}
              aria-current={current.name === t.id ? 'page' : undefined} onClick={() => nav.tab(t.id)}>
              <Icon name={t.icon} />{t.label}
            </button>
          ))}
        </nav>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
