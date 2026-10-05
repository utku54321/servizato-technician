// Sample jobs so the technician app works on its own. Jobs assigned from the
// provider app (including real bookings from the customer app) are added on top.
import { services, getProvider } from './data.js';
import { findTech } from './shared.js';

const CUSTOMERS = [
  { name: 'Rahul Mehta', address: { label: 'Home', line: 'C-114, Sector 50, Noida' } },
  { name: 'Sneha Kapoor', address: { label: 'Home', line: 'Tower 6, Flat 1203, Sector 75, Noida' } },
  { name: 'Arjun Nair', address: { label: 'Office', line: 'Plot 7, Sector 63, Noida' } },
];

const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const at = (hour) => { const d = new Date(); d.setHours(hour, 10, 0, 0); return d.toISOString(); };

export function sampleJobsFor(techId) {
  const tech = findTech(techId);
  if (!tech) return [];
  const provider = getProvider(tech.providerId);
  const cats = tech.skills.filter((c) => provider.categories.includes(c));
  const cat = (i) => cats[i % cats.length];
  const svc = (c, i) => services[c][i % services[c].length].id;

  return [
    {
      id: `T-${techId}-1`, source: 'local', providerId: provider.id, customerName: CUSTOMERS[0].name,
      address: CUSTOMERS[0].address, categoryId: cat(0), serviceIds: [svc(cat(0), 0)], dateIso: isoDay(0), slotStart: 9,
      note: 'Yearly service, unit is 3 years old.', otp: '4821', status: 'paid', techAccepted: true, payMethod: 'upi',
      history: { assigned: at(7), accepted: at(7), onway: at(8), started: at(9), completed: at(10), paid: at(10) },
      parts: [], photos: [],
    },
    {
      id: `T-${techId}-2`, source: 'local', providerId: provider.id, customerName: CUSTOMERS[1].name,
      address: CUSTOMERS[1].address, categoryId: cat(1), serviceIds: [svc(cat(1), 1)], dateIso: isoDay(0), slotStart: 13,
      note: 'Please call when you reach the gate.', otp: '7364', status: 'assigned', techAccepted: false,
      history: { assigned: at(8) }, parts: [], photos: [],
    },
    {
      id: `T-${techId}-3`, source: 'local', providerId: provider.id, customerName: CUSTOMERS[2].name,
      address: CUSTOMERS[2].address, categoryId: cat(0), serviceIds: [svc(cat(0), 2)], dateIso: isoDay(0), slotStart: 17,
      note: '', otp: '1590', status: 'assigned', techAccepted: false,
      history: { assigned: at(9) }, parts: [], photos: [],
    },
  ];
}

/** Earnings from earlier days (for the weekly chart). Today is calculated from real jobs. */
export const PAST_EARNINGS = [620, 940, 0, 1180, 760, 1020];

/** Parts a technician can add, by category (price charged to the customer). */
export const PARTS = {
  ac: [{ name: 'Capacitor', price: 350 }, { name: 'PCB repair', price: 1200 }, { name: 'Copper pipe (1 m)', price: 450 }, { name: 'Drain pipe', price: 150 }],
  appliances: [{ name: 'Inlet valve', price: 450 }, { name: 'Drain pump', price: 900 }, { name: 'Door gasket', price: 650 }, { name: 'RO filter set', price: 1100 }],
  plumbing: [{ name: 'Tap cartridge', price: 180 }, { name: 'Waste pipe', price: 220 }, { name: 'Angle valve', price: 260 }],
  electrical: [{ name: 'Modular switch', price: 120 }, { name: 'MCB 16A', price: 380 }, { name: 'Fan capacitor', price: 140 }],
  carpentry: [{ name: 'Hinge (pair)', price: 160 }, { name: 'Door lock', price: 650 }],
  cleaning: [{ name: 'Descaling chemical', price: 250 }],
  painting: [{ name: 'Wall putty (1 kg)', price: 120 }, { name: 'Primer (1 L)', price: 380 }],
  pest: [{ name: 'Extra gel tube', price: 220 }],
};
