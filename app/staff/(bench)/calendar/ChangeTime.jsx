'use client';
// "Change time" for a pickup or a delivery: pick a day (closed days greyed out), then a slot.
// Slots other stops already use show who has them but can still be picked. Optionally opens a text
// to the customer with the new time, ready to send from the phone.
import { useState } from 'react';
import { phoneHref, firstName, useStaff } from '../staff-shared';
import { SLOT_START, SLOT_END, DOW, addDays, startOfDay, sameDay, timeText, saveTime, textBody } from './cal-lib';
import s from '../../staff.module.css';

export default function ChangeTime({ event, events = [], closedDays = [], onDone, onCancel }) {
  const { userId, person } = useStaff();
  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const first = event.at && event.at >= today ? startOfDay(event.at) : days.find((d) => !closedDays.includes(d.getDay())) || today;
  const [day, setDay] = useState(first);
  const [slot, setSlot] = useState(event.at ? event.at.getHours() * 60 + event.at.getMinutes() : null);
  const [text, setText] = useState(Boolean(event.phone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const slots = [];
  for (let m = SLOT_START * 60; m < SLOT_END * 60; m += 30) slots.push(m);
  // other stops on the chosen day, by the 30-minute slot they fall in
  const taken = new Map();
  events.filter((e) => e.kind !== 'due' && e.id !== event.id && e.at && sameDay(e.at, day)).forEach((e) => {
    taken.set(Math.floor((e.at.getHours() * 60 + e.at.getMinutes()) / 30) * 30, e);
  });
  const at = slot == null ? null : new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(slot / 60), slot % 60);
  const label = (m) => timeText(new Date(2000, 0, 1, Math.floor(m / 60), m % 60)).replace(' PM', '').replace(' AM', ' AM');

  async function save() {
    setBusy(true); setError('');
    const err = await saveTime(event, at, userId);
    setBusy(false);
    if (err) return setError(err.message || 'Didn’t save. Try again.');
    const sms = text && phoneHref('sms', event.phone, textBody(event, at));
    if (sms) window.location.href = sms;
    onDone();
  }

  return (
    <div className="card" role="dialog" aria-label={`Change the time for order ${event.order.number}`} style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <strong>{event.at ? 'New time' : 'Set a time'} · {event.kind === 'pickup' ? 'Collect' : 'Deliver'} #{event.order.number}</strong>
        {event.at && <span className="muted small">now {event.at.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <span className="small" style={{ fontWeight: 700 }}>Day</span>
        <div className={s.dayChips}>
          {days.map((d) => (
            <button key={d.toISOString()} type="button" className={s.dayChip} aria-pressed={sameDay(d, day)} disabled={closedDays.includes(d.getDay())} onClick={() => setDay(d)}>
              <span>{DOW[d.getDay()]}</span><strong>{d.getDate()}</strong>
            </button>
          ))}
        </div>
        {event.evening && <span className="muted small">Customer prefers <strong>{event.evening}</strong>.</span>}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <span className="small" style={{ fontWeight: 700 }}>Time on {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <div className={s.slots}>
          {slots.map((m) => {
            const t = taken.get(m);
            return (
              <button key={m} type="button" className={`${s.slot} ${t ? s.slotTaken : ''}`} aria-pressed={slot === m} onClick={() => setSlot(m)}>
                {label(m)}{t ? <small>#{t.order.number}{t.order.assigned_to ? ` · ${firstName(person(t.order.assigned_to))}` : ''}</small> : null}
              </button>
            );
          })}
        </div>
      </div>
      {event.phone && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
          <input type="checkbox" checked={text} onChange={(e) => setText(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
          Text the customer the new time
        </label>
      )}
      {text && at && <div className="soft small">“{textBody(event, at)}”</div>}
      {error && <p className="error" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn primary small" disabled={!at || busy} onClick={save}>{busy ? 'Saving…' : 'Save time'}</button>
        <button type="button" className="btn ghost small" onClick={onCancel}>Cancel</button>
      </div>
      {text && <p className="muted small" style={{ margin: 0 }}>The text opens on your phone ready to send.</p>}
    </div>
  );
}
