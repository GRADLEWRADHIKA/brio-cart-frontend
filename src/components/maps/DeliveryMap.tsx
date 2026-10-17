import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '@/types';
import { cn } from '@/utils';

const pin = (inner: string, cls: string) =>
  L.divIcon({ className: '', html: `<div class="brio-pin ${cls}">${inner}</div>`, iconSize: [44, 44], iconAnchor: [22, 22] });

const STORE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>';
const HOME_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>';
const BIKE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M15 6h3l2.5 8"/><path d="M5.5 17.5L9 9h5l1.5 5H9"/></svg>';

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

  useEffect(() => {
    if (!el.current || map.current) return;
    const markerLayers = layers.current;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    m.setView([26.885, 80.95], 13);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      markerLayers.clear();
    };
  }, []);

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

  // Fit to everything
  useEffect(() => {
    const m = map.current;
    if (!m || markers.length === 0) return;
    const pts = [...markers.map((x) => [x.position.lat, x.position.lng] as [number, number]), ...(route ?? []).map((p) => [p.lat, p.lng] as [number, number])];
    const fit = () => {
      m.invalidateSize();
      m.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 16 });
    };
    fit();
    // Re-fit once layout settles (the container may still be sizing on first paint).
    const t = setTimeout(fit, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map.current]);

  return <div ref={el} className={cn('brio-map z-0 overflow-hidden', className)} role="img" aria-label="Delivery map" />;
}
