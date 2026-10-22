import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, PackageX } from 'lucide-react';
import { hasPermission, type Role } from '@shared/core';
import type { CampaignAlert, DashboardAlerts as Alerts } from '@/api/admin';
import { formatDate } from '@/utils';

function campaignText(a: CampaignAlert) {
  if (a.kind === 'ENDING') {
    const left = a.hoursLeft < 1 ? 'less than an hour' : a.hoursLeft < 48 ? `${a.hoursLeft} hour${a.hoursLeft === 1 ? '' : 's'}` : `${Math.floor(a.hoursLeft / 24)} days`;
    return { title: `“${a.title}” ends in ${left}`, body: `It comes off the homepage on ${formatDate(a.endsAt)}. Extend it or plan the next one.` };
  }
  return {
    title: 'No campaign on the homepage',
    body: [
      a.lastTitle && a.lastEndedAt ? `“${a.lastTitle}” ended on ${formatDate(a.lastEndedAt, false)}.` : 'No campaign has run yet.',
      a.nextStartsAt ? `The next one starts on ${formatDate(a.nextStartsAt)}.` : 'Nothing is scheduled.',
    ].join(' '),
  };
}

/** Campaign and low-stock warnings at the top of the dashboard. Renders nothing when all is well. */
export function DashboardAlerts({ alerts, role }: { alerts: Alerts; role: Role | undefined }) {
  const canEditCampaigns = hasPermission(role, 'settings:manage');
  const canSeeStock = hasPermission(role, 'stock:view');
  const { campaigns, lowStock } = alerts;
  if (!campaigns.length && !lowStock.count) return null;
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2" role="region" aria-label="Store alerts">
      {campaigns.length > 0 && (
        <section className="rounded-3xl bg-turmeric-100 p-5">
          <h2 className="flex items-center gap-2 font-sans text-sm font-extrabold uppercase tracking-wider text-[#8a5a00]">
            <CalendarClock className="size-4" aria-hidden /> Campaigns
          </h2>
          <ul className="mt-3 space-y-3">
            {campaigns.map((a) => {
              const t = campaignText(a);
              return (
                <li key={a.kind === 'ENDING' ? a.campaignId : 'none'}>
                  <p className="font-bold text-forest-900">{t.title}</p>
                  <p className="text-sm text-charcoal-700">{t.body}</p>
                </li>
              );
            })}
          </ul>
          {canEditCampaigns && (
            <Link to="/admin/settings" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700 hover:underline">
              Manage campaigns <ArrowRight className="size-4" />
            </Link>
          )}
        </section>
      )}
      {lowStock.count > 0 && (
        <section className="rounded-3xl border border-tomato-500/30 bg-white p-5">
          <h2 className="flex items-center gap-2 font-sans text-sm font-extrabold uppercase tracking-wider text-tomato-500">
            <PackageX className="size-4" aria-hidden /> Low stock · {lowStock.count} pack size{lowStock.count === 1 ? '' : 's'}
          </h2>
          <p className="mt-1 text-xs text-charcoal-500">At or below {lowStock.threshold} units (change this in Settings).</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {lowStock.items.map((i) => (
              <li key={i.variantId} className="flex items-center justify-between gap-3 py-1.5">
                <span className="truncate">
                  {i.product.name} <span className="text-charcoal-500">· {i.label}</span>
                </span>
                <span className={i.stockQty === 0 ? 'font-extrabold text-tomato-500' : 'font-bold tabular-nums'}>{i.stockQty === 0 ? 'Sold out' : `${i.stockQty} left`}</span>
              </li>
            ))}
          </ul>
          {canSeeStock && (
            <Link to="/admin/stock" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700 hover:underline">
              {lowStock.count > lowStock.items.length ? `See all ${lowStock.count} and restock` : 'Restock'} <ArrowRight className="size-4" />
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
