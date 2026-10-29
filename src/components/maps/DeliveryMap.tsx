import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '@/types';
import { cn } from '@/utils';
import { TILE_ATTRIBUTION, TILE_URL } from './tiles';

const pin = (inner: string, cls: string) =>
  L.divIcon({ className: '', html: `<div class="brio-pin ${cls}">${inner}</div>`, iconSize: [44, 44], iconAnchor: [22, 22] });

const STORE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>';
const HOME_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>';
const BIKE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M15 6h3l2.5 8"/><path d="M5.5 17.5L9 9h5l1.5 5H9"/></svg>';

const TOWN: [number, number] = [26.885, 80.95];

export interface MapMarker {
  id: string;
  position: LatLng;
  kind: 'store' | 'home' | 'rider';
  label?: string;
}

/**
 * Delivery map. Rider markers glide between updates (rather than jumping) so a 5-second
 * polling interval still reads as smooth live movement.
 */
function points(markers: MapMarker[], route?: LatLng[] | null) {
  return [...markers.map((x) => [x.position.lat, x.position.lng] as [number, number]), ...(route ?? []).map((p) => [p.lat, p.lng] as [number, number])];
}

export default function DeliveryMap({
  markers,
  route,
  className,
  fitKey,
}: {
  markers: MapMarker[];
  route?: LatLng[] | null;
  className?: string;
  /** Change to re-fit the viewport (e.g. when the set of markers changes). */
  fitKey?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef(new Map<string, L.Marker>());
  const routeLayer = useRef<L.Polyline | null>(null);
  const travelled = useRef<L.Polyline | null>(null);
  const anim = useRef(new Map<string, number>());

  const [tilesReady, setTilesReady] = useState(false);
  /** Once someone pans or zooms, stop re-fitting under their hands. */
  const userMoved = useRef(false);
  const bounds = useRef<L.LatLngBounds | null>(null);
  /** True while we move the map ourselves, so it isn't mistaken for the user. */
  const fitting = useRef(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    const markerLayers = layers.current;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
    // Open on the markers straight away: a default view that jumps a moment later cancels every
    // tile it asked for, which is what left the map grey on slow connections.
    const pts = points(markers, route);
    if (pts.length) {
      bounds.current = L.latLngBounds(pts);
      m.fitBounds(bounds.current, { padding: [48, 48], maxZoom: 16, animate: false });
    }
    else m.setView(TOWN, 13);
    const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, keepBuffer: 4, attribution: TILE_ATTRIBUTION }).addTo(m);
    tiles.once('load', () => setTilesReady(true));
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    m.on('dragstart', () => (userMoved.current = true));
    el.current.addEventListener('wheel', () => (userMoved.current = true), { passive: true });
    // Zoom buttons and pinch count as the user's choice; our own fitBounds doesn't.
    m.on('zoomstart', () => !fitting.current && (userMoved.current = true));
    map.current = m;
    let last = { w: el.current.clientWidth, h: el.current.clientHeight };
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry!.contentRect;
      if (w === last.w && h === last.h) return;
      const wasHidden = last.w === 0 || last.h === 0;
      last = { w, h };
      m.invalidateSize({ pan: false });
      // Sized for the first time (or after being hidden): fit again so the view isn't off to one side.
      if (wasHidden && bounds.current && !userMoved.current) fitTo(m, bounds.current);
    });
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      markerLayers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fitTo(m: L.Map, b: L.LatLngBounds) {
    fitting.current = true;
    m.fitBounds(b, { padding: [48, 48], maxZoom: 16, animate: false });
    fitting.current = false;
  }

  // Route
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    routeLayer.current?.remove();
    routeLayer.current = route?.length ? L.polyline(route.map((p) => [p.lat, p.lng] as [number, number]), { color: '#17492f', weight: 5, opacity: 0.35, dashArray: '2 10', lineCap: 'round' }).addTo(m) : null;
  }, [route]);

  // Markers (create / move with easing)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const mk of markers) {
      seen.add(mk.id);
      const target = L.latLng(mk.position.lat, mk.position.lng);
      let layer = layers.current.get(mk.id);
      if (!layer) {
        const icon = mk.kind === 'store' ? pin(STORE_SVG, 'is-store') : mk.kind === 'home' ? pin(HOME_SVG, 'is-home') : pin(`<span class="brio-pulse"></span>${BIKE_SVG}`, 'is-rider');
        layer = L.marker(target, { icon, zIndexOffset: mk.kind === 'rider' ? 1000 : 0, keyboard: false });
        if (mk.label) layer.bindTooltip(mk.label, { direction: 'top', offset: [0, -20] });
        layer.addTo(m);
        layers.current.set(mk.id, layer);
        continue;
      }
      if (mk.label) layer.setTooltipContent(mk.label);
      const from = layer.getLatLng();
      if (from.equals(target)) continue;
      cancelAnimationFrame(anim.current.get(mk.id) ?? 0);
      const start = performance.now();
      const dur = 1800;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        layer!.setLatLng([from.lat + (target.lat - from.lat) * e, from.lng + (target.lng - from.lng) * e]);
        if (t < 1) anim.current.set(mk.id, requestAnimationFrame(step));
      };
      anim.current.set(mk.id, requestAnimationFrame(step));
    }
    for (const [id, layer] of layers.current) {
      if (!seen.has(id)) {
        layer.remove();
        layers.current.delete(id);
      }
    }
    // Highlight the travelled part of the route behind a single rider.
    const rider = markers.find((x) => x.kind === 'rider');
    travelled.current?.remove();
    if (rider && route?.length) {
      const store = route[0]!;
      travelled.current = L.polyline([[store.lat, store.lng], [rider.position.lat, rider.position.lng]], { color: '#3d9a62', weight: 5, opacity: 0.85, lineCap: 'round' }).addTo(m);
    }
  }, [markers, route]);

  // Fit to everything when the set of places changes (not on every rider move).
  useEffect(() => {
    const m = map.current;
    const pts = points(markers, route);
    if (!m || pts.length === 0) return;
    const next = L.latLngBounds(pts);
    // The map opened on these already.
    if (bounds.current?.equals(next)) return;
    bounds.current = next;
    if (!userMoved.current) fitTo(m, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return (
    <div className={cn('relative z-0 overflow-hidden', className)}>
      <div ref={el} className="brio-map size-full" role="img" aria-label="Delivery map" />
      {!tilesReady && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center" aria-hidden>
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-charcoal-500 shadow">Loading map…</span>
        </div>
      )}
    </div>
  );
}
