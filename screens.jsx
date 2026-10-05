import { useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import {
  slots, getCategory, getProvider, getService, priceFor, money, billFor, providers,
} from './data.js';
import { TEAMS, TECH_SHARE, syncLabel } from './shared.js';
import { PARTS, PAST_EARNINGS } from './samples.js';

/* ---------- helpers ---------- */

const slotLabel = (start) => (slots.find((x) => x.start === start) || {}).label || '';
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayLabel = (iso) => {
  if (iso === todayIso()) return 'Today';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');
const serviceNames = (j) => j.serviceIds.map((id) => getService(j.categoryId, id)?.name).filter(Boolean).join(', ');
export const earningFor = (j) => Math.round(billFor(j).serviceTotal * TECH_SHARE);
const isNew = (j) => j.status === 'assigned' && !j.techAccepted;
const isActive = (j) => ['assigned', 'onway', 'started'].includes(j.status) && j.techAccepted;
const isDone = (j) => ['completed', 'paid'].includes(j.status);
const PAY_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', cash: 'Cash' };

const STATUS = {
  new: { label: 'New request', cls: 'warm' },
  assigned: { label: 'Accepted', cls: 'blue' },
  onway: { label: 'On the way', cls: 'blue' },
  started: { label: 'In progress', cls: 'blue' },
  completed: { label: 'Awaiting payment', cls: 'warm' },
  paid: { label: 'Paid', cls: 'good' },
  cancelled: { label: 'Cancelled', cls: 'bad' },
};
const statusOf = (j) => (isNew(j) ? STATUS.new : STATUS[j.status] || STATUS.assigned);

function TopBar({ title, sub, onBack, right }) {
  return (
    <header className="topbar">
      {onBack && <button type="button" className="icon-btn" aria-label="Back" onClick={onBack}><Icon name="back" size={20} /></button>}
      <div className="topbar-text"><h1 className="topbar-title">{title}</h1>{sub && <p className="topbar-sub">{sub}</p>}</div>
      {right}
    </header>
  );
}

function SourceBadge({ job }) {
  if (job.source === 'customer') return <span className="src-badge"><Icon name="mobile" size={12} />Customer app</span>;
  if (job.source === 'provider') return <span className="src-badge"><Icon name="inbox" size={12} />Provider app</span>;
  return null;
}

function JobCard({ job, onOpen }) {
  const cat = getCategory(job.categoryId);
  const st = statusOf(job);
  return (
    <button type="button" className={'card job-card' + (isNew(job) ? ' is-on' : '')} onClick={onOpen}>
      <div className="row-between">
        <span className="job-time">{dayLabel(job.dateIso)} · {slotLabel(job.slotStart)}</span>
        <span className={'badge ' + st.cls}>{st.label}</span>
      </div>
      <div className="row">
        <span className="cat-icon sm"><Icon name={cat.icon} size={18} /></span>
        <div className="grow stack-xs">
          <strong className="card-title">{serviceNames(job)}</strong>
          <span className="muted">{job.customerName} · {job.address?.line}</span>
        </div>
        <Icon name="chevronRight" size={18} />
      </div>
      {job.source !== 'local' && <div className="badges"><SourceBadge job={job} /></div>}
    </button>
  );
}

/* ---------- Jobs (today) ---------- */

export function JobsScreen({ store, me, jobs, otherNew, nav, actions }) {
  const provider = getProvider(me.providerId);
  const newJobs = jobs.filter(isNew);
  const active = jobs.filter(isActive);
  const done = jobs.filter(isDone);
  const todayEarned = done.filter((j) => j.dateIso === todayIso()).reduce((a, j) => a + earningFor(j), 0);
  const open = (j) => nav.go(['started'].includes(j.status) ? 'work' : isDone(j) && j.source !== 'local' && j.status === 'completed' ? 'done' : 'job', { id: j.id });

  return (
    <div className="screen">
      <header className="page-head">
        <div className="row-between">
          <div className="stack-xs">
            <p className="muted-label">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="page-title">Hi {me.name.split(' ')[0]}</h1>
          </div>
          <span className="avatar round">{me.initials}</span>
        </div>
        <div className="online-bar">
          <span className={'online-dot' + (store.online ? ' on' : '')} />
          <div className="grow"><strong>{store.online ? 'You are online' : 'You are offline'}</strong><small>{provider.name}</small></div>
          <button type="button" className={'switch' + (store.online ? ' is-on' : '')} role="switch" aria-checked={store.online} aria-label="Online" onClick={actions.toggleOnline} />
        </div>
      </header>
      <div className="content">
        {otherNew.length > 0 && (
          <div className="banner">
            <Icon name="inbox" size={18} />
            <span className="grow">New job for {otherNew[0].tech.name} ({getProvider(otherNew[0].tech.providerId).name})</span>
            <button type="button" className="btn btn-outline" onClick={() => actions.switchTech(otherNew[0].tech.id)}>Switch</button>
          </div>
        )}

        <div className="stat-grid">
          <div className="stat"><small>Jobs today</small><strong>{jobs.filter((j) => j.dateIso === todayIso()).length}</strong><span className="sub">{done.length} done</span></div>
          <button type="button" className="stat dark" onClick={() => nav.tab('earnings')}><small>Earned today</small><strong>{money(todayEarned)}</strong><span className="sub">View earnings →</span></button>
        </div>

        {!store.online && <p className="note"><Icon name="power" size={18} />You won't get new jobs while offline. Jobs already assigned stay below.</p>}

        <section className="stack-sm">
          <h2 className="section-title sm">New requests ({newJobs.length})</h2>
          {newJobs.length === 0 && <p className="empty-note">No new requests right now.</p>}
          {newJobs.map((j) => <JobCard key={j.id} job={j} onOpen={() => open(j)} />)}
        </section>

        <section className="stack-sm">
          <h2 className="section-title sm">Up next ({active.length})</h2>
          {active.length === 0 && <p className="empty-note">Accept a request to see it here.</p>}
          {active.map((j) => <JobCard key={j.id} job={j} onOpen={() => open(j)} />)}
        </section>

        {done.length > 0 && (
          <section className="stack-sm">
            <h2 className="section-title sm">Completed ({done.length})</h2>
            {done.map((j) => <JobCard key={j.id} job={j} onOpen={() => open(j)} />)}
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------- Job details & accept ---------- */

export function JobScreen({ job, nav, actions, notify }) {
  const [confirmDecline, setConfirmDecline] = useState(false);
  const cat = getCategory(job.categoryId);
  const provider = getProvider(job.providerId);
  const bill = billFor(job);
  const st = statusOf(job);

  let footer = null;
  if (job.status === 'cancelled') footer = null;
  else if (isNew(job)) {
    footer = confirmDecline ? (
      <div className="confirm-box">
        <p>Decline this job? It goes back to {provider.name} to reassign.</p>
        <div className="row-gap">
          <button type="button" className="btn btn-outline" onClick={() => setConfirmDecline(false)}>Keep</button>
          <button type="button" className="btn btn-danger" onClick={() => actions.decline(job)}>Decline</button>
        </div>
      </div>
    ) : (
      <div className="row-gap">
        <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmDecline(true)}>Decline</button>
        <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={() => actions.accept(job)}><Icon name="check" size={18} />Accept job</button>
      </div>
    );
  } else if (job.status === 'assigned') {
    footer = <button type="button" className="btn btn-primary btn-lg" onClick={() => actions.startTrip(job)}><Icon name="navigation" size={18} />Start navigation</button>;
  } else if (job.status === 'onway') {
    footer = <button type="button" className="btn btn-primary btn-lg" onClick={() => nav.go('navigate', { id: job.id })}><Icon name="navigation" size={18} />Continue navigation</button>;
  } else if (job.status === 'started') {
    footer = <button type="button" className="btn btn-primary btn-lg" onClick={() => nav.go('work', { id: job.id })}>Continue job</button>;
  } else if (isDone(job)) {
    footer = <button type="button" className="btn btn-outline btn-lg" onClick={() => nav.go('done', { id: job.id })}>View job summary</button>;
  }

  return (
    <div className="screen">
      <TopBar title={'Job #' + job.id} sub={`${cat.name} · ${dayLabel(job.dateIso)}, ${slotLabel(job.slotStart)}`} onBack={nav.back} />
      <div className="content">
        <div className="row-between">
          <span className={'badge ' + st.cls}>{st.label}</span>
          <SourceBadge job={job} />
        </div>
        {job.status === 'cancelled' && <p className="note danger"><Icon name="info" size={18} />The customer cancelled this booking.</p>}

        <section className="card row">
          <span className="avatar round">{job.customerName.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
          <div className="grow stack-xs"><strong>{job.customerName}</strong><span className="muted">{job.address?.label} · {job.address?.line}</span></div>
          <button type="button" className="icon-btn solid" aria-label={'Call ' + job.customerName} onClick={() => notify('Calls are masked and open in the live app')}><Icon name="phone" size={20} /></button>
        </section>

        <section className="card stack-sm">
          <h2 className="section-title sm">Services</h2>
          {bill.lines.map((l) => <div key={l.name} className="bill-row"><span>{l.name}</span><span>{money(l.amount)}</span></div>)}
          {bill.discount > 0 && <div className="bill-row"><span>First booking offer</span><span className="good-text">−{money(bill.discount)}</span></div>}
          <hr />
          <div className="bill-row total"><span>Estimate</span><span>{money(bill.estimate)}</span></div>
          <p className="meta"><Icon name="wallet" size={14} />Your share: {money(earningFor(job))} (60% of service charges)</p>
        </section>

        <section className="card stack-sm">
          <h2 className="section-title sm">Customer note</h2>
          <p className="card-desc">{job.note ? `“${job.note}”` : 'No note added.'}</p>
        </section>

        {(job.history?.assigned || job.history?.accepted) && (
          <section className="card stack-xs">
            <h2 className="section-title sm">Activity</h2>
            {[['assigned', 'Assigned to you'], ['accepted', 'You accepted'], ['onway', 'On the way'], ['started', 'Job started (OTP)'], ['completed', 'Completed'], ['paid', 'Paid']].map(([k, label]) =>
              job.history?.[k] ? <div key={k} className="bill-row"><span>{label}</span><span>{timeOf(job.history[k])}</span></div> : null)}
          </section>
        )}
      </div>
      {footer && <footer className="bottombar stack-xs">{footer}</footer>}
    </div>
  );
}

/* ---------- Navigate ---------- */

export function NavigateScreen({ job, nav, notify }) {
  const maps = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(job.address?.line || '');
  return (
    <div className="screen">
      <TopBar title="Navigate to customer" sub={job.customerName + ' · ' + slotLabel(job.slotStart)} onBack={nav.back} />
      <div className="content">
        <div className="map" aria-label="Route to customer">
          <span className="map-route" />
          <span className="map-pin tech"><Icon name="wrench" size={18} /></span>
          <span className="map-pin home"><Icon name="home" size={18} /></span>
          <span className="map-chip"><span className="dot" />About 12 min · 3.4 km</span>
        </div>
        <section className="card stack-sm">
          <div className="row">
            <Icon name="pin" className="accent" />
            <div className="grow stack-xs"><strong>{job.address?.label}</strong><span className="muted">{job.address?.line}</span></div>
          </div>
          <div className="row-gap">
            <a className="btn btn-outline" style={{ flex: 1 }} href={maps} target="_blank" rel="noreferrer"><Icon name="navigation" size={18} />Open in Google Maps</a>
            <button type="button" className="btn btn-soft" onClick={() => notify('Calls are masked and open in the live app')}><Icon name="phone" size={18} />Call</button>
          </div>
        </section>
        <p className="note"><Icon name="lock" size={18} />When you reach, ask the customer for their 4-digit start OTP. The job can't start without it.</p>
      </div>
      <footer className="bottombar">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => nav.go('otp', { id: job.id })}>I've arrived · Enter OTP</button>
      </footer>
    </div>
  );
}

/* ---------- Enter OTP ---------- */

export function OtpScreen({ job, nav, actions }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(false);
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const setAt = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError('');
    if (d && i < 3) refs[i + 1].current?.focus();
  };
  const onKey = (i, e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus(); };
  const onPaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (p.length === 4) { e.preventDefault(); setDigits(p.split('')); refs[3].current?.focus(); }
  };
  const code = digits.join('');
  const verify = () => { if (!actions.verifyOtp(job, code)) { setError('Wrong OTP. Check with the customer and try again.'); setDigits(['', '', '', '']); refs[0].current?.focus(); } };

  return (
    <div className="screen">
      <TopBar title="Enter start OTP" sub={job.customerName + ' · Job #' + job.id} onBack={nav.back} />
      <div className="content">
        <div className="stack-sm">
          <h2 className="section-title">Ask {job.customerName.split(' ')[0]} for the OTP</h2>
          <p className="muted">{job.source === 'customer' ? 'It is on the tracking screen of their Servizato app.' : 'The customer received it when they booked.'}</p>
        </div>
        <div className={'otp-input' + (error ? ' bad' : '')} onPaste={onPaste}>
          {digits.map((d, i) => (
            <input key={i} ref={refs[i]} inputMode="numeric" autoComplete="one-time-code" maxLength={1} aria-label={'Digit ' + (i + 1)}
              value={d} onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} autoFocus={i === 0} />
          ))}
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="demo-box">
          <p><strong>Demo mode.</strong> {job.source === 'customer' ? 'Open the customer app to see the OTP, or reveal it here.' : 'There is no real customer for this sample job.'}</p>
          {reveal ? <p>Customer OTP: <strong>{job.otp}</strong></p> : <button type="button" className="btn btn-outline" onClick={() => setReveal(true)}>Show demo OTP</button>}
        </div>
      </div>
      <footer className="bottombar">
        <button type="button" className="btn btn-primary btn-lg" disabled={code.length !== 4} onClick={verify}>Verify and start job</button>
      </footer>
    </div>
  );
}

/* ---------- Work: parts & proof photos ---------- */

function resizeImage(file, max = 480) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const PHOTO_SLOTS = ['Before', 'After', 'Part / extra'];

export function WorkScreen({ job, nav, actions, notify }) {
  const [parts, setParts] = useState(job.parts || []);
  const [photos, setPhotos] = useState(job.photos || []);
  const [note, setNote] = useState(job.workNote || '');
  const [custom, setCustom] = useState({ name: '', price: '' });
  const catalog = PARTS[job.categoryId] || [];
  const bill = billFor({ ...job, parts });

  const save = (patch) => actions.saveWork(job, patch);
  const updateParts = (next) => { setParts(next); save({ parts: next }); };
  const addPart = (p) => updateParts([...parts, { name: p.name, price: Number(p.price) }]);
  const removePart = (i) => updateParts(parts.filter((_, x) => x !== i));
  const addCustom = () => {
    const price = Number(custom.price);
    if (!custom.name.trim() || !price) return;
    addPart({ name: custom.name.trim(), price });
    setCustom({ name: '', price: '' });
  };
  const onPhoto = async (label, file) => {
    if (!file) return;
    try {
      const src = await resizeImage(file);
      const next = [...photos.filter((p) => p.label !== label), { label, src }];
      setPhotos(next);
      save({ photos: next });
    } catch {
      notify('Could not read that photo');
    }
  };
  const hasAfter = photos.some((p) => p.label === 'After');

  return (
    <div className="screen">
      <TopBar title="Job in progress" sub={serviceNames(job) + ' · ' + job.customerName} onBack={nav.back} />
      <div className="content">
        <p className="note good"><Icon name="checkCircle" size={20} />Started at {timeOf(job.history?.started)} with customer OTP</p>

        <section className="stack-sm">
          <h2 className="section-title sm">Proof photos</h2>
          <div className="photo-grid">
            {PHOTO_SLOTS.map((label) => {
              const p = photos.find((x) => x.label === label);
              return (
                <label key={label} className={'photo-slot' + (p ? ' filled' : '')}>
                  {p ? <><img src={p.src} alt={label + ' photo'} /><span className="tag">{label}</span></> : <><Icon name="camera" />{label}</>}
                  <input type="file" accept="image/*" capture="environment" aria-label={'Add ' + label + ' photo'} onChange={(e) => onPhoto(label, e.target.files?.[0])} />
                </label>
              );
            })}
          </div>
          <p className="hint">An “After” photo is required to complete the job. The customer sees these on their invoice.</p>
        </section>

        <section className="card stack-sm">
          <h2 className="section-title sm">Parts used</h2>
          {parts.length === 0 && <p className="empty-note">No parts added. Add parts only after the customer approves them.</p>}
          {parts.map((p, i) => (
            <div key={i} className="part-row">
              <span className="grow">{p.name}</span><strong>{money(p.price)}</strong>
              <button type="button" className="icon-btn" aria-label={'Remove ' + p.name} onClick={() => removePart(i)}><Icon name="trash" size={18} /></button>
            </div>
          ))}
          {catalog.length > 0 && (
            <div className="tag-wrap">
              {catalog.map((p) => (
                <button key={p.name} type="button" className="chip" onClick={() => addPart(p)}><Icon name="plus" size={14} /> {p.name} · {money(p.price)}</button>
              ))}
            </div>
          )}
          <div className="row">
            <input className="input" placeholder="Other part" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <input className="input sm" inputMode="numeric" placeholder="₹" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value.replace(/\D/g, '') })} />
            <button type="button" className="icon-btn solid" aria-label="Add part" onClick={addCustom}><Icon name="plus" size={20} /></button>
          </div>
        </section>

        <label className="stack-sm">
          <span className="section-title sm">Work notes <span className="muted normal">(optional)</span></span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => save({ workNote: note })} placeholder="e.g. Cleaned filters, gas pressure normal" />
        </label>

        <section className="card stack-sm">
          <h2 className="section-title sm">Bill preview</h2>
          <div className="bill-row"><span>Services</span><span>{money(bill.serviceTotal)}</span></div>
          {bill.partsTotal > 0 && <div className="bill-row"><span>Parts</span><span>{money(bill.partsTotal)}</span></div>}
          {bill.discount > 0 && <div className="bill-row"><span>Offer</span><span className="good-text">−{money(bill.discount)}</span></div>}
          <div className="bill-row"><span>GST (18%)</span><span>{money(bill.gst)}</span></div>
          <hr />
          <div className="bill-row total"><span>Customer pays</span><span>{money(bill.total)}</span></div>
        </section>
      </div>
      <footer className="bottombar stack-xs">
        {!hasAfter && <p className="bar-hint">Add an “After” photo to finish</p>}
        <button type="button" className="btn btn-primary btn-lg" disabled={!hasAfter} onClick={() => actions.complete(job, { parts, photos, workNote: note })}>Mark job complete</button>
      </footer>
    </div>
  );
}

/* ---------- Completed ---------- */

export function DoneScreen({ job, nav, actions }) {
  const [method, setMethod] = useState('upi');
  const bill = billFor(job);
  const paid = job.status === 'paid';

  return (
    <div className="screen">
      <div className="close-row">
        <button type="button" className="icon-btn outline" aria-label="Close" onClick={() => nav.tab('jobs')}><Icon name="close" size={20} /></button>
      </div>
      <div className="content">
        <div className="success">
          <span className="success-icon"><Icon name="check" size={34} /></span>
          <h1>Job completed</h1>
          <p className="muted">{serviceNames(job)} · {job.customerName}</p>
        </div>

        <div className="stat-grid">
          <div className="stat"><small>Customer bill</small><strong>{money(bill.total)}</strong><span className="muted">incl. GST</span></div>
          <div className="stat dark"><small>You earn</small><strong>{money(earningFor(job))}</strong><span className="sub">60% of services</span></div>
        </div>

        {job.photos?.length > 0 && (
          <div className="proof-grid">
            {job.photos.map((p) => <div key={p.label} className="proof"><img src={p.src} alt={p.label} /></div>)}
          </div>
        )}

        {paid ? (
          <p className="note good"><Icon name="checkCircle" size={20} />Paid {money(bill.total)}{job.payMethod ? ' via ' + (PAY_LABEL[job.payMethod] || job.payMethod) : ''}</p>
        ) : job.source === 'customer' ? (
          <p className="note"><Icon name="clock" size={18} />Waiting for {job.customerName.split(' ')[0]} to pay in the Servizato app. This updates on its own.</p>
        ) : (
          <fieldset className="stack-sm methods">
            <legend className="section-title sm">Collect payment</legend>
            {[['upi', 'UPI (show QR)', 'mobile'], ['cash', 'Cash', 'cash']].map(([id, label, icon]) => (
              <label key={id} className={'method' + (method === id ? ' is-on' : '')}>
                <input type="radio" name="collect" value={id} checked={method === id} onChange={() => setMethod(id)} />
                <Icon name={icon} className="accent" /><span className="grow"><strong>{label}</strong></span><span className="radio" aria-hidden="true" />
              </label>
            ))}
            <button type="button" className="btn btn-primary" onClick={() => actions.collect(job, method)}>Mark {money(bill.total)} received</button>
          </fieldset>
        )}
      </div>
      <footer className="bottombar">
        <button type="button" className="btn btn-outline btn-lg" onClick={() => nav.tab('jobs')}>Back to today's jobs</button>
      </footer>
    </div>
  );
}

/* ---------- Earnings ---------- */

export function EarningsScreen({ jobs, me }) {
  const done = jobs.filter(isDone);
  const today = done.filter((j) => j.dateIso === todayIso());
  const todayAmt = today.reduce((a, j) => a + earningFor(j), 0);
  const days = [...PAST_EARNINGS, todayAmt];
  const week = days.reduce((a, b) => a + b, 0);
  const max = Math.max(...days, 1);
  const labels = days.map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days.length - 1 - i));
    return i === days.length - 1 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
  });
  const pending = today.filter((j) => j.status === 'completed').reduce((a, j) => a + earningFor(j), 0);

  return (
    <div className="screen">
      <header className="page-head"><h1 className="page-title">Earnings</h1></header>
      <div className="content">
        <section className="card stack-sm">
          <small className="muted-label">Last 7 days</small>
          <span className="big-amount">{money(week)}</span>
          <div className="bars" role="img" aria-label="Daily earnings for the last 7 days">
            {days.map((v, i) => (
              <div key={i} className={'bar' + (i === days.length - 1 ? ' today' : '')}>
                <span className="val">{v ? '₹' + v : ''}</span>
                <span className="fill" style={{ height: `${(v / max) * 100}%` }} />
                <small>{labels[i]}</small>
              </div>
            ))}
          </div>
        </section>

        <div className="stat-grid">
          <div className="stat"><small>Today</small><strong>{money(todayAmt)}</strong><span className="sub">{today.length} jobs</span></div>
          <div className="stat"><small>Awaiting customer payment</small><strong>{money(pending)}</strong><span className="muted">counts once paid</span></div>
        </div>

        <section className="stack-sm">
          <h2 className="section-title sm">Today's jobs</h2>
          {today.length === 0 && <p className="empty-note">Complete a job to see it here.</p>}
          <div className="list-group">
            {today.map((j) => (
              <div key={j.id} className="list-link">
                <span className="cat-icon sm"><Icon name={getCategory(j.categoryId).icon} size={18} /></span>
                <span className="grow">{serviceNames(j)}<small>{j.customerName} · {j.status === 'paid' ? 'Paid' : 'Awaiting payment'}</small></span>
                <strong>{money(earningFor(j))}</strong>
              </div>
            ))}
          </div>
        </section>

        <p className="note"><Icon name="wallet" size={18} />You earn 60% of service charges. Parts are billed at cost. {getProvider(me.providerId).name} pays out every Monday to your bank account.</p>
      </div>
    </div>
  );
}

/* ---------- Account ---------- */

export function AccountScreen({ me, actions, install }) {
  const provider = getProvider(me.providerId);
  return (
    <div className="screen">
      <header className="page-head"><h1 className="page-title">Account</h1></header>
      <div className="content">
        <section className="card row">
          <span className="avatar round lg">{me.initials}</span>
          <div className="stack-xs grow">
            <strong className="card-title">{me.name}</strong>
            <span className="muted">{provider.name}</span>
            <span className="meta"><Icon name="star" filled size={14} className="star-on" />{me.rating.toFixed(1)} · {me.jobs.toLocaleString('en-IN')} jobs</span>
          </div>
        </section>

        <label className="field">
          Signed in as (demo)
          <select className="input" value={me.id} onChange={(e) => actions.switchTech(e.target.value)}>
            {providers.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {(TEAMS[p.id] || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>

        {!install.installed && (
          <section className="card stack-sm">
            <h2 className="section-title sm">Install the app</h2>
            {install.canPrompt ? (
              <>
                <p className="muted">Add the technician app to your home screen. It opens full screen and works offline.</p>
                <button type="button" className="btn btn-primary" onClick={install.prompt}><Icon name="download" size={18} />Install app</button>
              </>
            ) : install.isIos ? (
              <p className="muted">In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p>
            ) : (
              <p className="muted">Open your browser menu (⋮) and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
            )}
          </section>
        )}

        <SyncStatus />
        <section className="demo-box">
          <p><strong>Connected demo.</strong> Jobs the provider app assigns to you appear under New requests, including real bookings from the customer app. Your progress (on the way, OTP, parts, photos, completed) shows up for the customer.</p>
          <button type="button" className="btn btn-outline" onClick={actions.reset}>Reset sample jobs</button>
        </section>
      </div>
    </div>
  );
}

/* ---------- Cloud sync status ---------- */
function SyncStatus() {
  const s = syncLabel();
  return <p className={'sync-status ' + s.tone} role="status"><span className="sync-dot" aria-hidden="true" />{s.text}</p>;
}
