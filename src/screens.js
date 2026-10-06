import { useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Icon } from './icons.js';
import {
  slots, getCategory, getProvider, getService, money, billFor, providers, fmtDate, fmtTime, fmtNum,
} from './data.js';
import { TEAMS, TECH_SHARE } from './shared.js';
import { PARTS, PAST_EARNINGS } from './samples.js';
import {
  C, T, Row, RowBetween, Wrap, Stack, Grow, Hr, Screen, Content, TopBar, PageHead, CloseRow, BottomBar, Card, Note, Banner,
  DemoBox, ConfirmBox, Btn, IconBtn, Chip, Switch, Option, Badge, SrcBadge, Avatar, CatIcon, Meta, BillRow, StatGrid, Stat,
  Bars, ListGroup, ListLink, MapMock, Success, ProofGrid, Input, TextArea, Select, SyncStatus,
} from './ui.js';

/* ---------- helpers ---------- */

const slotLabel = (start) => (slots.find((x) => x.start === start) || {}).label || '';
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayLabel = (iso) => (iso === todayIso() ? 'Today' : fmtDate(new Date(iso + 'T00:00:00'), { weekday: 'short', day: true, month: 'short' }));
const timeOf = (iso) => (iso ? fmtTime(new Date(iso)) : '');
const serviceNames = (j) => j.serviceIds.map((id) => getService(j.categoryId, id)?.name).filter(Boolean).join(', ');
export const earningFor = (j) => Math.round(billFor(j).serviceTotal * TECH_SHARE);
const isNew = (j) => j.status === 'assigned' && !j.techAccepted;
const isActive = (j) => ['assigned', 'onway', 'started'].includes(j.status) && j.techAccepted;
const isDone = (j) => ['completed', 'paid'].includes(j.status);
const PAY_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', cash: 'Cash' };
const callDemo = (notify) => () => notify('Calls are masked and open in the live app');

const STATUS = {
  new: { label: 'New request', tone: 'warm' },
  assigned: { label: 'Accepted', tone: 'blue' },
  onway: { label: 'On the way', tone: 'blue' },
  started: { label: 'In progress', tone: 'blue' },
  completed: { label: 'Awaiting payment', tone: 'warm' },
  paid: { label: 'Paid', tone: 'good' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
};
const statusOf = (j) => (isNew(j) ? STATUS.new : STATUS[j.status] || STATUS.assigned);

function JobCard({ job, onOpen }) {
  const cat = getCategory(job.categoryId);
  const st = statusOf(job);
  return (
    <Card on={isNew(job)} onPress={onOpen} gap={12}>
      <RowBetween>
        <T v="jobTime">{dayLabel(job.dateIso)} · {slotLabel(job.slotStart)}</T>
        <Badge tone={st.tone}>{st.label}</Badge>
      </RowBetween>
      <Row>
        <CatIcon name={cat.icon} sm />
        <Grow>
          <T v="cardTitle">{serviceNames(job)}</T>
          <T v="muted">{job.customerName} · {job.address?.line}</T>
        </Grow>
        <Icon name="chevronRight" size={18} />
      </Row>
      {job.source !== 'local' && <SrcBadge source={job.source} />}
    </Card>
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
    <Screen>
      <PageHead>
        <RowBetween>
          <Stack gap={3}>
            <T v="label">{fmtDate(new Date(), { weekday: 'long', day: true, month: 'long' })}</T>
            <T v="pageTitle">Hi {me.name.split(' ')[0]}</T>
          </Stack>
          <Avatar text={me.initials} />
        </RowBetween>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.ink }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: store.online ? '#3DDC84' : '#8A94A6' }} />
          <Grow gap={1}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{store.online ? 'You are online' : 'You are offline'}</Text>
            <Text style={{ color: C.faint, fontSize: 12 }}>{provider.name}</Text>
          </Grow>
          <Switch on={store.online} onPress={actions.toggleOnline} label="Online" />
        </View>
      </PageHead>
      <Content>
        {otherNew.length > 0 && (
          <Banner text={`New job for ${otherNew[0].tech.name} (${getProvider(otherNew[0].tech.providerId).name})`}
            action="Switch" onAction={() => actions.switchTech(otherNew[0].tech.id)} />
        )}

        <StatGrid>
          <Stat label="Jobs today" value={jobs.filter((j) => j.dateIso === todayIso()).length} sub={done.length + ' done'} />
          <Stat dark label="Earned today" value={money(todayEarned)} sub="View earnings →" onPress={() => nav.tab('earnings')} />
        </StatGrid>

        {!store.online && <Note icon="power">You won't get new jobs while offline. Jobs already assigned stay below.</Note>}

        <Stack>
          <T v="sectionSm">New requests ({newJobs.length})</T>
          {newJobs.length === 0 && <T v="empty">No new requests right now.</T>}
          {newJobs.map((j) => <JobCard key={j.id} job={j} onOpen={() => open(j)} />)}
        </Stack>

        <Stack>
          <T v="sectionSm">Up next ({active.length})</T>
          {active.length === 0 && <T v="empty">Accept a request to see it here.</T>}
          {active.map((j) => <JobCard key={j.id} job={j} onOpen={() => open(j)} />)}
        </Stack>

        {done.length > 0 && (
          <Stack>
            <T v="sectionSm">Completed ({done.length})</T>
            {done.map((j) => <JobCard key={j.id} job={j} onOpen={() => open(j)} />)}
          </Stack>
        )}
      </Content>
    </Screen>
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
      <ConfirmBox text={`Decline this job? It goes back to ${provider.name} to reassign.`} confirmLabel="Decline"
        onKeep={() => setConfirmDecline(false)} onConfirm={() => actions.decline(job)} />
    ) : (
      <Row gap={8}>
        <Btn variant="outline" style={{ flex: 1 }} onPress={() => setConfirmDecline(true)}>Decline</Btn>
        <Btn icon="check" style={{ flex: 2 }} onPress={() => actions.accept(job)}>Accept job</Btn>
      </Row>
    );
  } else if (job.status === 'assigned') {
    footer = <Btn lg icon="navigation" onPress={() => actions.startTrip(job)}>Start navigation</Btn>;
  } else if (job.status === 'onway') {
    footer = <Btn lg icon="navigation" onPress={() => nav.go('navigate', { id: job.id })}>Continue navigation</Btn>;
  } else if (job.status === 'started') {
    footer = <Btn lg onPress={() => nav.go('work', { id: job.id })}>Continue job</Btn>;
  } else if (isDone(job)) {
    footer = <Btn lg variant="outline" onPress={() => nav.go('done', { id: job.id })}>View job summary</Btn>;
  }

  return (
    <Screen>
      <TopBar title={'Job #' + job.id} sub={`${cat.name} · ${dayLabel(job.dateIso)}, ${slotLabel(job.slotStart)}`} onBack={nav.back} />
      <Content>
        <RowBetween>
          <Badge tone={st.tone}>{st.label}</Badge>
          <SrcBadge source={job.source} />
        </RowBetween>
        {job.status === 'cancelled' && <Note tone="danger">The customer cancelled this booking.</Note>}

        <Card>
          <Row>
            <Avatar text={job.customerName.split(' ').map((w) => w[0]).join('').slice(0, 2)} />
            <Grow><T v="strong">{job.customerName}</T><T v="muted">{job.address?.label} · {job.address?.line}</T></Grow>
            <IconBtn name="phone" variant="solid" label={'Call ' + job.customerName} onPress={callDemo(notify)} />
          </Row>
        </Card>

        <Card gap={10}>
          <T v="sectionSm">Services</T>
          {bill.lines.map((l) => <BillRow key={l.name} label={l.name} value={money(l.amount)} />)}
          {bill.discount > 0 && <BillRow label="First booking offer" value={'−' + money(bill.discount)} good />}
          <Hr />
          <BillRow total label="Estimate" value={money(bill.estimate)} />
          <Meta icon="wallet">Your share: {money(earningFor(job))} (60% of service charges)</Meta>
        </Card>

        <Card gap={10}>
          <T v="sectionSm">Customer note</T>
          <T v="cardDesc">{job.note ? `“${job.note}”` : 'No note added.'}</T>
        </Card>

        {(job.history?.assigned || job.history?.accepted) && (
          <Card gap={6}>
            <T v="sectionSm">Activity</T>
            {[['assigned', 'Assigned to you'], ['accepted', 'You accepted'], ['onway', 'On the way'], ['started', 'Job started (OTP)'], ['completed', 'Completed'], ['paid', 'Paid']].map(([k, label]) =>
              job.history?.[k] ? <BillRow key={k} label={label} value={timeOf(job.history[k])} /> : null)}
          </Card>
        )}
      </Content>
      {footer && <BottomBar>{footer}</BottomBar>}
    </Screen>
  );
}

/* ---------- Navigate ---------- */

export function NavigateScreen({ job, nav, notify }) {
  const maps = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(job.address?.line || '');
  return (
    <Screen>
      <TopBar title="Navigate to customer" sub={job.customerName + ' · ' + slotLabel(job.slotStart)} onBack={nav.back} />
      <Content>
        <MapMock chip="About 12 min · 3.4 km" />
        <Card gap={10}>
          <Row>
            <Icon name="pin" color={C.blue} />
            <Grow><T v="strong">{job.address?.label}</T><T v="muted">{job.address?.line}</T></Grow>
          </Row>
          <Row gap={8}>
            <Btn variant="outline" icon="navigation" style={{ flex: 1 }} onPress={() => Linking.openURL(maps).catch(() => notify('Could not open maps'))}>Open in Google Maps</Btn>
            <Btn variant="soft" icon="phone" onPress={callDemo(notify)}>Call</Btn>
          </Row>
        </Card>
        <Note icon="lock">When you reach, ask the customer for their 4-digit start OTP. The job can't start without it.</Note>
      </Content>
      <BottomBar>
        <Btn lg onPress={() => nav.go('otp', { id: job.id })}>I've arrived · Enter OTP</Btn>
      </BottomBar>
    </Screen>
  );
}

/* ---------- Enter OTP ---------- */

export function OtpScreen({ job, nav, actions }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(false);
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const setAt = (i, v) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length === 4) { setDigits(clean.split('')); setError(''); refs[3].current?.focus(); return; } // pasted / autofilled
    const d = clean.slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError('');
    if (d && i < 3) refs[i + 1].current?.focus();
  };
  const onKey = (i, e) => { if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus(); };
  const code = digits.join('');
  const verify = () => {
    if (!actions.verifyOtp(job, code)) { setError('Wrong OTP. Check with the customer and try again.'); setDigits(['', '', '', '']); refs[0].current?.focus(); }
  };

  return (
    <Screen>
      <TopBar title="Enter start OTP" sub={job.customerName + ' · Job #' + job.id} onBack={nav.back} />
      <Content>
        <Stack>
          <T v="section">Ask {job.customerName.split(' ')[0]} for the OTP</T>
          <T v="muted">{job.source === 'customer' ? 'It is on the tracking screen of their Servizato app.' : 'The customer received it when they booked.'}</T>
        </Stack>
        <Row gap={10}>
          {digits.map((d, i) => (
            <TextInput key={i} ref={refs[i]} value={d} keyboardType="number-pad" textContentType={i === 0 ? 'oneTimeCode' : 'none'}
              autoComplete={i === 0 ? 'sms-otp' : 'off'} maxLength={i === 0 ? 4 : 1} autoFocus={i === 0} accessibilityLabel={'Digit ' + (i + 1)}
              onChangeText={(v) => setAt(i, v)} onKeyPress={(e) => onKey(i, e)} selectTextOnFocus
              style={{
                flex: 1, minWidth: 0, height: 64, borderRadius: 14, borderWidth: 1.5, textAlign: 'center', fontSize: 28, fontWeight: '800', color: C.ink,
                borderColor: error ? C.red : C.line2, backgroundColor: error ? '#FFF6F3' : '#fff',
              }} />
          ))}
        </Row>
        {error ? <T v="error" accessibilityRole="alert">{error}</T> : null}
        <DemoBox>
          <T v="body" style={{ fontSize: 13, color: C.ink2, lineHeight: 19 }}>
            <Text style={{ fontWeight: '700' }}>Demo mode. </Text>
            {job.source === 'customer' ? 'Open the customer app to see the OTP, or reveal it here.' : 'There is no real customer for this sample job.'}
          </T>
          {reveal
            ? <T v="body" style={{ fontSize: 13 }}>Customer OTP: <Text style={{ fontWeight: '800' }}>{job.otp}</Text></T>
            : <Btn variant="outline" onPress={() => setReveal(true)}>Show demo OTP</Btn>}
        </DemoBox>
      </Content>
      <BottomBar>
        <Btn lg disabled={code.length !== 4} onPress={verify}>Verify and start job</Btn>
      </BottomBar>
    </Screen>
  );
}

/* ---------- Work: parts & proof photos ---------- */

/** Take (or pick) a photo, shrink it to 480 px and return it as a data URL (small enough to sync). */
async function capturePhoto(fromCamera) {
  const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('permission');
  const opts = { mediaTypes: ['images'], quality: 0.8 };
  const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const ctx = ImageManipulator.manipulate(asset.uri);
  if ((asset.width || 0) >= (asset.height || 0)) ctx.resize({ width: Math.min(480, asset.width || 480) });
  else ctx.resize({ height: Math.min(480, asset.height || 480) });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return 'data:image/jpeg;base64,' + out.base64;
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
  const takePhoto = async (label, fromCamera) => {
    try {
      const src = await capturePhoto(fromCamera);
      if (!src) return;
      const next = [...photos.filter((p) => p.label !== label), { label, src }];
      setPhotos(next);
      save({ photos: next });
    } catch (e) {
      notify(e?.message === 'permission' ? 'Allow camera / photo access in Settings to add photos' : 'Could not read that photo');
    }
  };
  const onPhoto = (label) => Alert.alert(label + ' photo', undefined, [
    { text: 'Take photo', onPress: () => takePhoto(label, true) },
    { text: 'Choose from gallery', onPress: () => takePhoto(label, false) },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const hasAfter = photos.some((p) => p.label === 'After');

  return (
    <Screen>
      <TopBar title="Job in progress" sub={serviceNames(job) + ' · ' + job.customerName} onBack={nav.back} />
      <Content>
        <Note tone="good" icon="checkCircle">Started at {timeOf(job.history?.started)} with customer OTP</Note>

        <Stack>
          <T v="sectionSm">Proof photos</T>
          <Row gap={8}>
            {PHOTO_SLOTS.map((label) => {
              const p = photos.find((x) => x.label === label);
              return (
                <Pressable key={label} onPress={() => onPhoto(label)} accessibilityRole="button" accessibilityLabel={'Add ' + label + ' photo'}
                  style={{
                    flex: 1, height: 100, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 6,
                    borderWidth: 1.5, borderStyle: p ? 'solid' : 'dashed', borderColor: p ? C.line : C.line2, backgroundColor: '#fff',
                  }}>
                  {p ? (
                    <>
                      <Image source={{ uri: p.src }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                      <View style={{ position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(14,26,43,0.75)' }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{label}</Text>
                      </View>
                    </>
                  ) : (
                    <><Icon name="camera" color={C.muted} /><Text style={{ fontSize: 12, fontWeight: '700', color: C.muted }}>{label}</Text></>
                  )}
                </Pressable>
              );
            })}
          </Row>
          <T v="hint">An “After” photo is required to complete the job. The customer sees these on their invoice.</T>
        </Stack>

        <Card gap={10}>
          <T v="sectionSm">Parts used</T>
          {parts.length === 0 && <T v="empty">No parts added. Add parts only after the customer approves them.</T>}
          {parts.map((p, i) => (
            <Row key={i} gap={10}>
              <T v="body" style={{ flex: 1 }}>{p.name}</T><T v="strong">{money(p.price)}</T>
              <IconBtn name="trash" size={18} label={'Remove ' + p.name} onPress={() => removePart(i)} />
            </Row>
          ))}
          {catalog.length > 0 && (
            <Wrap>
              {catalog.map((p) => <Chip key={p.name} icon="plus" onPress={() => addPart(p)}>{p.name} · {money(p.price)}</Chip>)}
            </Wrap>
          )}
          <Row gap={8}>
            <Input style={{ flex: 1 }} placeholder="Other part" value={custom.name} onChangeText={(v) => setCustom({ ...custom, name: v })} />
            <Input sm keyboardType="number-pad" placeholder="₹" value={custom.price} onChangeText={(v) => setCustom({ ...custom, price: v.replace(/\D/g, '') })} />
            <IconBtn name="plus" variant="solid" label="Add part" onPress={addCustom} />
          </Row>
        </Card>

        <Stack>
          <T v="sectionSm">Work notes <T v="muted" style={{ fontWeight: '500' }}>(optional)</T></T>
          <TextArea value={note} onChangeText={setNote} onBlur={() => save({ workNote: note })} placeholder="e.g. Cleaned filters, gas pressure normal" />
        </Stack>

        <Card gap={10}>
          <T v="sectionSm">Bill preview</T>
          <BillRow label="Services" value={money(bill.serviceTotal)} />
          {bill.partsTotal > 0 && <BillRow label="Parts" value={money(bill.partsTotal)} />}
          {bill.discount > 0 && <BillRow label="Offer" value={'−' + money(bill.discount)} good />}
          <BillRow label="GST (18%)" value={money(bill.gst)} />
          <Hr />
          <BillRow total label="Customer pays" value={money(bill.total)} />
        </Card>
      </Content>
      <BottomBar>
        {!hasAfter && <T v="muted" style={{ textAlign: 'center', color: C.ink2 }}>Add an “After” photo to finish</T>}
        <Btn lg disabled={!hasAfter} onPress={() => actions.complete(job, { parts, photos, workNote: note })}>Mark job complete</Btn>
      </BottomBar>
    </Screen>
  );
}

/* ---------- Completed ---------- */

export function DoneScreen({ job, nav, actions }) {
  const [method, setMethod] = useState('upi');
  const bill = billFor(job);
  const paid = job.status === 'paid';

  return (
    <Screen>
      <CloseRow onClose={() => nav.tab('jobs')} />
      <Content>
        <Success title="Job completed" sub={serviceNames(job) + ' · ' + job.customerName} />

        <StatGrid>
          <Stat label="Customer bill" value={money(bill.total)} sub="incl. GST" subMuted />
          <Stat dark label="You earn" value={money(earningFor(job))} sub="60% of services" />
        </StatGrid>

        {job.photos?.length > 0 && <ProofGrid photos={job.photos} />}

        {paid ? (
          <Note tone="good" icon="checkCircle">Paid {money(bill.total)}{job.payMethod ? ' via ' + (PAY_LABEL[job.payMethod] || job.payMethod) : ''}</Note>
        ) : job.source === 'customer' ? (
          <Note icon="clock">Waiting for {job.customerName.split(' ')[0]} to pay in the Servizato app. This updates on its own.</Note>
        ) : (
          <Stack>
            <T v="sectionSm">Collect payment</T>
            {[['upi', 'UPI (show QR)', 'mobile'], ['cash', 'Cash', 'cash']].map(([id, label, icon]) => (
              <Option key={id} on={method === id} onPress={() => setMethod(id)} left={<Icon name={icon} color={C.blue} />} title={label} />
            ))}
            <Btn onPress={() => actions.collect(job, method)}>Mark {money(bill.total)} received</Btn>
          </Stack>
        )}
      </Content>
      <BottomBar>
        <Btn lg variant="outline" onPress={() => nav.tab('jobs')}>Back to today's jobs</Btn>
      </BottomBar>
    </Screen>
  );
}

/* ---------- Earnings ---------- */

export function EarningsScreen({ jobs, me }) {
  const done = jobs.filter(isDone);
  const today = done.filter((j) => j.dateIso === todayIso());
  const todayAmt = today.reduce((a, j) => a + earningFor(j), 0);
  const days = [...PAST_EARNINGS, todayAmt];
  const week = days.reduce((a, b) => a + b, 0);
  const labels = days.map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days.length - 1 - i));
    return i === days.length - 1 ? 'Today' : fmtDate(d, { weekday: 'short' });
  });
  const pending = today.filter((j) => j.status === 'completed').reduce((a, j) => a + earningFor(j), 0);

  return (
    <Screen>
      <PageHead><T v="pageTitle">Earnings</T></PageHead>
      <Content>
        <Card gap={10}>
          <T v="label">Last 7 days</T>
          <T v="big">{money(week)}</T>
          <Bars values={days} labels={labels} fmt={(v) => '₹' + fmtNum(v)} label="Daily earnings for the last 7 days" />
        </Card>

        <StatGrid>
          <Stat label="Today" value={money(todayAmt)} sub={today.length + ' jobs'} />
          <Stat label="Awaiting customer payment" value={money(pending)} sub="counts once paid" subMuted />
        </StatGrid>

        <Stack>
          <T v="sectionSm">Today's jobs</T>
          {today.length === 0 && <T v="empty">Complete a job to see it here.</T>}
          {today.length > 0 && (
            <ListGroup>
              {today.map((j) => (
                <ListLink key={j.id} left={<CatIcon name={getCategory(j.categoryId).icon} sm />} title={serviceNames(j)}
                  sub={j.customerName + ' · ' + (j.status === 'paid' ? 'Paid' : 'Awaiting payment')} right={<T v="strong">{money(earningFor(j))}</T>} />
              ))}
            </ListGroup>
          )}
        </Stack>

        <Note icon="wallet">You earn 60% of service charges. Parts are billed at cost. {getProvider(me.providerId).name} pays out every Monday to your bank account.</Note>
      </Content>
    </Screen>
  );
}

/* ---------- Account ---------- */

export function AccountScreen({ me, actions }) {
  const provider = getProvider(me.providerId);
  return (
    <Screen>
      <PageHead><T v="pageTitle">Account</T></PageHead>
      <Content>
        <Card>
          <Row>
            <Avatar text={me.initials} lg />
            <Grow>
              <T v="cardTitle">{me.name}</T>
              <T v="muted">{provider.name}</T>
              <Row gap={6}><Icon name="star" filled size={14} color={C.star} /><T v="meta">{me.rating.toFixed(1)} · {fmtNum(me.jobs)} jobs</T></Row>
            </Grow>
          </Row>
        </Card>

        <Select label="Signed in as (demo)" value={me.id} onChange={actions.switchTech}
          groups={providers.map((p) => ({ label: p.name, options: (TEAMS[p.id] || []).map((t) => ({ value: t.id, label: t.name })) }))} />

        <SyncStatus />
        <DemoBox>
          <T v="body" style={{ fontSize: 13, color: C.ink2, lineHeight: 19 }}>
            <Text style={{ fontWeight: '700' }}>Connected demo. </Text>
            Jobs the provider app assigns to you appear under New requests, including real bookings from the customer app. Your progress (on the way, OTP, parts, photos, completed) shows up for the customer.
          </T>
          <Btn variant="outline" onPress={actions.reset}>Reset sample jobs</Btn>
        </DemoBox>
      </Content>
    </Screen>
  );
}
