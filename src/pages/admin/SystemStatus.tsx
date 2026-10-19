import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { Card, PageHeader, Stat, td, th } from '@/components/admin/kit';
import { formatDate } from '@/utils';

function duration(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}
const size = (b: number | null) => (b === null ? 'Unknown' : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

/** Super admin: uptime, database size and background job runs. */
export default function SystemStatus() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'system'], queryFn: adminApi.system, refetchInterval: 30_000 });
  return (
    <>
      <PageHeader title="System status" subtitle={data ? `${data.environment} · Node ${data.node}` : undefined} />
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Uptime" value={duration(data.uptimeSeconds)} hint={`Since ${formatDate(data.startedAt)}`} tone="lime" />
            <Stat label="Database" value={size(data.database.bytes)} hint={data.database.provider} />
            <Stat label="Orders" value={data.database.orders} />
            <Stat label="Users" value={data.database.users} />
          </div>
          <Card title="Background jobs" className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead><tr><th className={th}>Job</th><th className={th}>Every</th><th className={th}>Last run</th><th className={th}>Result</th><th className={th}>Runs</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.jobs.map((j) => (
                  <tr key={j.name}>
                    <td className={`${td} font-mono text-xs`}>{j.name}</td>
                    <td className={td}>{Math.round(j.everyMs / 60000)} min</td>
                    <td className={td}>{j.lastRunAt ? formatDate(j.lastRunAt) : 'Not yet'}</td>
                    <td className={td}>{j.lastStatus === 'ERROR' ? <span className="font-semibold text-tomato-500">Error: {j.lastError}</span> : j.lastStatus ? `OK (${j.lastResult} changed)` : '—'}</td>
                    <td className={td}>{j.runCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </>
  );
}
