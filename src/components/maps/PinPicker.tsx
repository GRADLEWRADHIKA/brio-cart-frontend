import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '@/types';
import { cn } from '@/utils';
import { TILE_ATTRIBUTION, TILE_URL } from './tiles';

const STORE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>';
const icon = L.divIcon({ className: '', html: `<div class="brio-pin is-store">${STORE_SVG}</div>`, iconSize: [44, 44], iconAnchor: [22, 22] });

/** Map where one pin is placed by tapping or dragged into place. Centres on `fallback` when unset. */
export default function PinPicker({ value, fallback, onChange, className }: { value: LatLng | null; fallback: LatLng; onChange: (p: LatLng) => void; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const change = useRef(onChange);
  change.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: false });
    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
    }).addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    m.setView([fallback.lat, fallback.lng], 15);
    m.on('click', (e: L.LeafletMouseEvent) => change.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      m.setView([fallback.lat, fallback.lng], m.getZoom());
      return;
    }
    if (!marker.current) {
      marker.current = L.marker([value.lat, value.lng], { icon, draggable: true, keyboard: false }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        change.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      marker.current.setLatLng([value.lat, value.lng]);
    }
    if (!m.getBounds().pad(-0.2).contains([value.lat, value.lng])) m.panTo([value.lat, value.lng]);
  }, [value, fallback.lat, fallback.lng]);

  return <div ref={el} className={cn('brio-map z-0 overflow-hidden', className)} role="application" aria-label="Map: tap to place your shop's pickup pin" />;
}
