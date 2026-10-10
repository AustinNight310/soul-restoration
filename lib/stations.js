'use client';
// Stations and QR codes. A poster at each station has a QR that opens /staff/station?id=<station>&qr=1;
// every pair's ticket has one that opens /staff/pair?id=<pair>&qr=1. Phones remember which station
// they were last scanned at, so the next pair scanned is started there.
// A move counts as "scanned" only when both the station and the pair came from their QR codes.
import { useSyncExternalStore } from 'react';

const KEY = 'sr.station';
const FRESH_MS = 12 * 60 * 60 * 1000; // a station scan lasts a working day
const EVENT = 'sr-station';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.id || Date.now() - v.at > FRESH_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

// { id, at, scanned } or null. The raw string keeps the snapshot stable for React.
export function useHere() {
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener('storage', cb);
      window.addEventListener(EVENT, cb);
      return () => { window.removeEventListener('storage', cb); window.removeEventListener(EVENT, cb); };
    },
    read,
    () => null,
  );
  return raw ? JSON.parse(raw) : null;
}

export function setHere(id, scanned) {
  try {
    if (id) localStorage.setItem(KEY, JSON.stringify({ id, at: Date.now(), scanned: !!scanned }));
    else localStorage.removeItem(KEY);
  } catch {
    // private mode: the station just isn't remembered
  }
  window.dispatchEvent(new Event(EVENT));
}

export const stationUrl = (origin, id) => `${origin}/staff/station?id=${encodeURIComponent(id)}&qr=1`;
export const pairUrl = (origin, id) => `${origin}/staff/pair?id=${id}&qr=1`;

// What a scanned QR (or a typed code) points at.
// Returns { station }, { pair }, { order, position } or null.
export function parseCode(text) {
  const t = (text || '').trim();
  try {
    const u = new URL(t);
    if (u.pathname.endsWith('/staff/station') && u.searchParams.get('id')) return { station: u.searchParams.get('id') };
    if (u.pathname.endsWith('/staff/pair') && u.searchParams.get('id')) return { pair: u.searchParams.get('id') };
    return null;
  } catch {
    // not a link: a typed ticket code like "1042-2", "1042 2" or "#1042"
  }
  const m = t.match(/^#?\s*(\d{3,7})(?:\s*[-\s/·.]\s*(\d{1,2}))?$/);
  if (m) return { order: Number(m[1]), position: m[2] ? Number(m[2]) : null };
  return null;
}

// The station a pair should go to after `station` (skips inactive ones).
export function nextStation(stations, id) {
  const list = stations.filter((s) => s.active);
  const i = list.findIndex((s) => s.id === id);
  return i >= 0 ? list[i + 1] || null : list[0] || null;
}

// The checklist at a station for one pair: the station's own lines, then each booked service.
export function checklistFor(station, serviceNames) {
  const own = (station?.checklist || []).map((c) => ({ label: c.label, required: !!c.required }));
  if (!station?.services_check) return own;
  const services = [...new Set(serviceNames)].map((label) => ({ label, required: true, service: true }));
  return [...services, ...own];
}

// Stations a pair would jump over going from where it is to `to` (mirrors pair_action in the database).
export function skippedOnTheWay(stations, pair, to) {
  if (!to || pair.next_station_id === to.id) return [];
  const cur = stations.find((s) => s.id === pair.station_id);
  return stations.filter((s) => s.active && s.sort < to.sort && s.sort > (cur ? cur.sort : -1));
}

export const STATE_LABEL = { working: 'Working', done: 'Done', held: 'On hold', sent_back: 'Sent back' };

// "4m", "2h 10m", "3d"
export function since(at, now = Date.now()) {
  const m = Math.max(0, Math.round((now - new Date(at).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${m % 60 ? ` ${m % 60}m` : ''}`;
  return `${Math.floor(h / 24)}d`;
}
