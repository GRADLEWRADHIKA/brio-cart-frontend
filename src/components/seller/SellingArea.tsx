import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INDIAN_STATES, SERVICE_SCOPE_LABELS, SERVICE_SCOPES, type ServiceScope } from '@shared/core';
import { shopApi, type MyShop } from '@/api/shop';
import { Card } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils';

/**
 * Where the shop sells. Inside the city Brio Cart's riders deliver; anywhere else goes by courier, and
 * Brio Cart sets the shipping cost and date after the shop confirms each order.
 */
export function SellingArea({ shop }: { shop: MyShop }) {
  const qc = useQueryClient();
  const [scope, setScope] = useState<ServiceScope>(shop.serviceScope);
  const [states, setStates] = useState<string[]>(shop.serviceStates);
  useEffect(() => {
    setScope(shop.serviceScope);
    setStates(shop.serviceStates);
  }, [shop.serviceScope, shop.serviceStates]);
  const save = useMutation({ mutationFn: () => shopApi.setSelling({ serviceScope: scope, serviceStates: scope === 'STATES' ? states : [] }), onSuccess: (s) => qc.setQueryData(['seller', 'me'], s) });
  const dirty = scope !== shop.serviceScope || (scope === 'STATES' && [...states].sort().join() !== [...shop.serviceStates].sort().join());
  const toggle = (code: string) => setStates((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]));

  return (
    <Card title="Where I sell" className="mb-6">
      <p className="mb-3 text-sm text-charcoal-500">
        Brio Cart riders deliver in your city. Outside it, orders go by courier: after you confirm, Brio Cart sets the shipping cost and delivery date and tells the customer.
      </p>
      <div className="space-y-2" role="radiogroup" aria-label="Where I sell">
        {SERVICE_SCOPES.map((s) => (
          <label key={s} className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold', scope === s ? 'border-forest-700 bg-mint-50' : 'border-line')}>
            <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} /> {SERVICE_SCOPE_LABELS[s]}
          </label>
        ))}
      </div>
      {scope === 'STATES' && (
        <fieldset className="mt-4">
          <legend className="text-sm font-bold">States I ship to ({states.length})</legend>
          <div className="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-line p-3 sm:grid-cols-2">
            {INDIAN_STATES.map(([code, name]) => (
              <label key={code} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={states.includes(code)} onChange={() => toggle(code)} /> {name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {save.error && <p className="mt-3 text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
      {save.isSuccess && !dirty && <p className="mt-3 text-sm font-semibold text-forest-700" role="status">Saved.</p>}
      <Button className="mt-4" size="sm" loading={save.isPending} disabled={!dirty || (scope === 'STATES' && states.length === 0)} onClick={() => save.mutate()}>
        Save where I sell
      </Button>
    </Card>
  );
}
