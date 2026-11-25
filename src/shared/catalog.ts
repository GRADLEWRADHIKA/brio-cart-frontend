// Catalogue sections, where each product can be delivered, and shopper preferences.
// Shared by the API, the website and the admin dashboard so all three apply the same rules.

// ---------- Sections ----------

/** The three top sections. Every main category belongs to one; anything else counts as Grocery. */
export const SECTIONS = ['FRESH', 'GROCERY', 'HANDMADE'] as const;
export type Section = (typeof SECTIONS)[number];
export const SECTION_SLUGS: Record<Section, string> = { FRESH: 'fresh', GROCERY: 'grocery', HANDMADE: 'handmade' };
export const SECTION_LABELS: Record<Section, string> = { FRESH: 'Fresh', GROCERY: 'Grocery', HANDMADE: 'Handmade' };

/** Section of a main category's slug. */
export function sectionOfRootSlug(slug: string | null | undefined): Section {
  if (slug === 'fresh') return 'FRESH';
  if (slug === 'handmade') return 'HANDMADE';
  return 'GROCERY';
}

// ---------- Where a product can be delivered ----------

/**
 * AUTO follows the section: Fresh only in Brio Cart's delivery areas (Lucknow); Grocery and Handmade
 * also go by courier to the rest of India. NONE: delivery areas only. STATES: also these states. INDIA: everywhere.
 */
export const SHIP_SCOPES = ['AUTO', 'NONE', 'STATES', 'INDIA'] as const;
export type ShipScope = (typeof SHIP_SCOPES)[number];
export const SHIP_SCOPE_LABELS: Record<ShipScope, string> = {
  AUTO: 'Default for its section (Fresh: delivery areas only · Grocery/Handmade: all India)',
  NONE: 'Brio Cart delivery areas only',
  STATES: 'Delivery areas + chosen states (courier)',
  INDIA: 'Delivery areas + all of India (courier)',
};

/** Effective courier reach after AUTO is resolved: null = no courier, 'INDIA', or a list of state codes. */
export function courierReach(p: { section: Section; shipScope: string; shipStates: string[] }): 'INDIA' | string[] | null {
  const scope = p.shipScope === 'AUTO' ? (p.section === 'FRESH' ? 'NONE' : 'INDIA') : p.shipScope;
  if (scope === 'INDIA') return 'INDIA';
  if (scope === 'STATES') return p.shipStates.length ? p.shipStates : null;
  return null;
}

/** What the storefront needs to tell whether a product reaches the shopper. */
export interface ProductDelivery {
  /** Brio Cart delivery areas it is sold in: 'ALL' or a list of area ids. */
  areas: 'ALL' | string[];
  /** Courier reach outside the delivery areas. */
  courier: 'INDIA' | string[] | null;
}

/** Where the shopper wants delivery: one of Brio Cart's areas, or anywhere else in India by courier. */
export type ShopperLocation =
  | { kind: 'AREA'; areaId: string }
  | { kind: 'COURIER'; state: string; inCity?: boolean };

export type Availability = { ok: true } | { ok: false; reason: 'NOT_IN_AREA' | 'LOCAL_ONLY' | 'NOT_TO_STATE' };

export function availabilityAt(d: ProductDelivery, loc: ShopperLocation | null | undefined): Availability {
  if (!loc) return { ok: true };
  if (loc.kind === 'AREA') return d.areas === 'ALL' || d.areas.includes(loc.areaId) ? { ok: true } : { ok: false, reason: 'NOT_IN_AREA' };
  if (!d.courier) return { ok: false, reason: 'LOCAL_ONLY' };
  return d.courier === 'INDIA' || d.courier.includes(loc.state) ? { ok: true } : { ok: false, reason: 'NOT_TO_STATE' };
}

/** Short customer-facing reason. */
export function unavailableMessage(reason: Exclude<Availability, { ok: true }>['reason'], section: Section, place?: string) {
  if (reason === 'LOCAL_ONLY') return section === 'FRESH' ? 'Fresh is delivered only in Lucknow. Coming soon to your city.' : 'Delivered only in Lucknow for now.';
  if (reason === 'NOT_IN_AREA') return `Not delivered to ${place ?? 'your area'} yet.`;
  return `Not shipped to ${place ?? 'your state'} yet.`;
}

// ---------- PIN codes ----------

export const LOCAL_CITY = 'Lucknow';

/**
 * State from a 6-digit PIN code's prefix. India Post's lookup is used first; this is the offline fallback
 * (postal circles, with the main exceptions). Good enough to pick the state, not the district.
 */
const PIN3: Record<string, string> = {
  '160': 'CH', '194': 'LA', '246': 'UK', '248': 'UK', '249': 'UK', '263': 'UK', '403': 'GA', '605': 'PY', '737': 'SK', '744': 'AN',
  '790': 'AR', '791': 'AR', '792': 'AR', '793': 'ML', '794': 'ML', '795': 'MN', '796': 'MZ', '797': 'NL', '798': 'NL', '799': 'TR',
  '814': 'JH', '815': 'JH', '816': 'JH', '396': 'GJ', '682': 'KL',
};
const PIN2: Record<string, string> = {
  '11': 'DL', '12': 'HR', '13': 'HR', '14': 'PB', '15': 'PB', '16': 'PB', '17': 'HP', '18': 'JK', '19': 'JK',
  '20': 'UP', '21': 'UP', '22': 'UP', '23': 'UP', '24': 'UP', '25': 'UP', '26': 'UP', '27': 'UP', '28': 'UP',
  '30': 'RJ', '31': 'RJ', '32': 'RJ', '33': 'RJ', '34': 'RJ', '36': 'GJ', '37': 'GJ', '38': 'GJ', '39': 'GJ',
  '40': 'MH', '41': 'MH', '42': 'MH', '43': 'MH', '44': 'MH', '45': 'MP', '46': 'MP', '47': 'MP', '48': 'MP', '49': 'CG',
  '50': 'TS', '51': 'AP', '52': 'AP', '53': 'AP', '56': 'KA', '57': 'KA', '58': 'KA', '59': 'KA',
  '60': 'TN', '61': 'TN', '62': 'TN', '63': 'TN', '64': 'TN', '67': 'KL', '68': 'KL', '69': 'KL',
  '70': 'WB', '71': 'WB', '72': 'WB', '73': 'WB', '74': 'WB', '75': 'OD', '76': 'OD', '77': 'OD', '78': 'AS',
  '80': 'BR', '81': 'BR', '82': 'JH', '83': 'JH', '84': 'BR', '85': 'BR',
};

export function stateFromPincode(pin: string): string | null {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  return PIN3[pin.slice(0, 3)] ?? PIN2[pin.slice(0, 2)] ?? null;
}

/** Lucknow PIN codes (226xxx) when India Post's district isn't known. */
export const isLocalCityPincode = (pin: string) => /^226\d{3}$/.test(pin);

// ---------- Shopper preferences (first-visit questions) ----------

export const AGE_GROUPS = ['KIDS', 'ADULTS', 'SENIORS'] as const;
export const AGE_GROUP_LABELS: Record<(typeof AGE_GROUPS)[number], string> = { KIDS: 'Kids', ADULTS: 'Adults', SENIORS: 'Senior citizens' };

export const TASTES = ['SWEET', 'SPICY', 'SOUR', 'MILD', 'COMMON'] as const;
export const TASTE_LABELS: Record<(typeof TASTES)[number], string> = { SWEET: 'Sweet', SPICY: 'Spicy', SOUR: 'Sour', MILD: 'Mild', COMMON: 'Common taste' };

/** Shopper's needs. NONE = no special need. */
export const HEALTH_NEEDS = ['DIABETIC', 'LOW_SUGAR', 'LOW_SALT', 'NONE'] as const;
export const HEALTH_NEED_LABELS: Record<(typeof HEALTH_NEEDS)[number], string> = {
  DIABETIC: 'Diabetic-friendly',
  LOW_SUGAR: 'Low sugar',
  LOW_SALT: 'Low salt',
  NONE: 'None',
};

/** Product health tags staff set. The first three match the needs; the HIGH_ ones keep a product out of matching recommendations. */
export const HEALTH_TAGS = ['DIABETIC_FRIENDLY', 'LOW_SUGAR', 'LOW_SALT', 'HIGH_SUGAR', 'HIGH_SALT'] as const;
export const HEALTH_TAG_LABELS: Record<(typeof HEALTH_TAGS)[number], string> = {
  DIABETIC_FRIENDLY: 'Diabetic-friendly',
  LOW_SUGAR: 'Low sugar',
  LOW_SALT: 'Low salt',
  HIGH_SUGAR: 'High sugar (not recommended to diabetic / low-sugar shoppers)',
  HIGH_SALT: 'High salt (not recommended to low-salt shoppers)',
};

export interface ShopperPreferences {
  ageGroup?: (typeof AGE_GROUPS)[number] | null;
  tastes?: Array<(typeof TASTES)[number]>;
  health?: Array<(typeof HEALTH_NEEDS)[number]>;
  /** Sections the shopper cares about, most first. Orders the home page. */
  interests?: Section[];
}

type Tagged = { section: Section; tags: { ageGroups: string[]; tastes: string[]; health: string[] } };

/** Products a shopper's health needs rule out of recommendations. */
export function unsuitableFor(p: Tagged, prefs: ShopperPreferences) {
  const needs = prefs.health ?? [];
  if ((needs.includes('DIABETIC') || needs.includes('LOW_SUGAR')) && p.tags.health.includes('HIGH_SUGAR')) return true;
  if (needs.includes('LOW_SALT') && p.tags.health.includes('HIGH_SALT')) return true;
  return false;
}

/** How well a product matches the answers: higher first. 0 = no match (still shown, just later). */
export function preferenceScore(p: Tagged, prefs: ShopperPreferences) {
  let s = 0;
  if (prefs.ageGroup && p.tags.ageGroups.includes(prefs.ageGroup)) s += 3;
  for (const t of prefs.tastes ?? []) if (t !== 'COMMON' && p.tags.tastes.includes(t)) s += 2;
  const need = { DIABETIC: 'DIABETIC_FRIENDLY', LOW_SUGAR: 'LOW_SUGAR', LOW_SALT: 'LOW_SALT' } as Record<string, string>;
  for (const h of prefs.health ?? []) if (need[h] && p.tags.health.includes(need[h]!)) s += 4;
  const rank = (prefs.interests ?? []).indexOf(p.section);
  if (rank >= 0) s += 3 - Math.min(rank, 2);
  return s;
}

/** Comma-separated DB lists → arrays. */
export const splitList = (v: string | null | undefined) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);
