import { afterEach, describe, expect, it } from 'vitest';
import { pushErrorMessage } from '@/hooks/usePush';

const abort = (message: string) => Object.assign(new Error(message), { name: 'AbortError' });

describe('push error messages', () => {
  afterEach(() => {
    delete (navigator as Navigator & { brave?: unknown }).brave;
  });

  it('explains a push service error instead of showing the raw browser text', () => {
    const msg = pushErrorMessage(abort('Registration failed - push service error'));
    expect(msg).not.toContain('Registration failed');
    expect(msg).toMatch(/VPN, firewall or antivirus/);
  });

  it('tells Brave users which setting to turn on', () => {
    (navigator as Navigator & { brave?: unknown }).brave = {};
    expect(pushErrorMessage(abort('Registration failed - push service error'))).toContain('Use Google services for push messaging');
  });

  it('explains blocked permission and passes other errors through', () => {
    expect(pushErrorMessage(abort('Registration failed - permission denied'))).toMatch(/blocked for this site/);
    expect(pushErrorMessage(new Error('Network down'))).toBe('Network down');
  });
});
