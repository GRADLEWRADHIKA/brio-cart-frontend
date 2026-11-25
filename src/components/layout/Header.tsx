import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Apple, Bell, Bike, ChevronDown, CircleHelp, ClipboardList, Hand, Headphones, Heart, Home, Info, LayoutDashboard, LayoutGrid, LogOut, MapPin, Menu, Package, Phone, RefreshCw, Search, ShoppingBag, ShoppingCart, SlidersHorizontal, Store, Tag, User, Wheat, X } from 'lucide-react';
import { homePathFor, SECTION_LABELS, SECTION_SLUGS, SECTIONS, type Role, type Section } from '@shared/core';
import { NotificationBell } from '@/components/notifications/Notifications';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useCart, selectCount } from '@/store/cart';
import { useUi } from '@/store/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { Logo } from '@/components/ui/Brand';
import { cn, timeToCutoff } from '@/utils';
import { SearchBox } from './SearchBox';
import { useWishlist } from '@/store/wishlist';
import { mainCategories, subCategories } from '@/utils/categories';
import { LocationPicker } from './LocationPicker';

function CartButton({ className }: { className?: string }) {
  const count = useCart(selectCount);
  const setCartOpen = useUi((s) => s.setCartOpen);
  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      className={cn('relative inline-flex h-11 items-center gap-2 rounded-full bg-forest-800 px-4 text-sm font-bold text-white transition hover:bg-forest-700', className)}
      aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <ShoppingCart className="size-[1.1rem]" />
      <span>
        <span className="hidden sm:inline">Cart </span>
        <span key={count} className="inline-block animate-pop tabular-nums" data-testid="cart-count">
          <span className="hidden sm:inline">(</span>
          {count}
          <span className="hidden sm:inline">)</span>
        </span>
      </span>
    </button>
  );
}

/** Account link per role: customers see their account, staff and riders their own area. */
function accountLink(role: Role | undefined) {
  if (!role) return { to: '/login', label: 'Sign in', icon: User };
  if (role === 'CUSTOMER') return { to: '/account', label: 'My account', icon: User };
  if (role === 'SHOP_OWNER') return { to: homePathFor(role), label: 'My shop', icon: Store };
  return { to: homePathFor(role), label: role === 'RIDER' ? 'Rider dashboard' : 'Store dashboard', icon: role === 'RIDER' ? Bike : LayoutDashboard };
}

/** "Hi, Name ▾" with the customer's shortcuts; staff get a link to their dashboard; guests get Sign in. */
function AccountMenu() {
  const { user, logout } = useAuth();
  const unread = useUnreadCount();
  const setPrefsOpen = useUi((s) => s.setPrefsOpen);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname, loc.search]);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const link = accountLink(user?.role);
  if (!user || user.role !== 'CUSTOMER') {
    return (
      <Link to={link.to} className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-charcoal-900 transition hover:bg-ivory-100 sm:inline-flex">
        <link.icon className="size-[1.15rem]" />
        <span className="max-w-32 truncate">{link.label}</span>
      </Link>
    );
  }
  const items = [
    { to: '/account/profile', label: 'My Account', icon: User, dot: false },
    { to: '/notifications', label: 'Notifications', icon: Bell, dot: (unread.data ?? 0) > 0 },
    { to: '/account', label: 'My Orders', icon: ClipboardList, dot: false },
    { to: '/account/credit', label: 'Credit & Returns', icon: RefreshCw, dot: false },
    { to: '/account/addresses', label: 'Saved Addresses', icon: MapPin, dot: false },
  ];
  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-charcoal-900 transition hover:bg-ivory-100"
      >
        <User className="size-[1.15rem]" />
        <span className="max-w-28 truncate">Hi, {user.name.split(' ')[0]}</span>
        <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-line bg-white p-2 shadow-lift">
          {items.map((i) => (
            <Link
              key={i.label}
              role="menuitem"
              to={i.to}
              className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-charcoal-900 hover:bg-mint-50', loc.pathname === i.to && 'bg-mint-50 font-bold')}
            >
              <i.icon className="size-4 text-charcoal-700" />
              <span className="flex-1">{i.label}</span>
              {i.dot && <span className="size-2 rounded-full bg-tomato-500" aria-label="unread" />}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setPrefsOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-charcoal-900 hover:bg-mint-50"
          >
            <SlidersHorizontal className="size-4 text-charcoal-700" /> My Preferences
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-charcoal-900 hover:bg-mint-50"
          >
            <LogOut className="size-4 text-charcoal-700" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

const SECTION_ICONS: Record<Section, typeof Apple> = { FRESH: Apple, GROCERY: Wheat, HANDMADE: Hand };
const SECTION_NOTES: Record<Section, string> = {
  FRESH: 'Next-morning delivery in Lucknow',
  GROCERY: 'Delivered across India',
  HANDMADE: 'From local makers, across India',
};

/** One of the three top sections, with a drop-down of its sub-categories. */
function SectionMenu({ section }: { section: Section }) {
  const { data: categories } = useCategories();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname, loc.search]);
  const slug = SECTION_SLUGS[section];
  const root = categories?.find((c) => c.slug === slug && !c.parentId);
  const kids = root ? subCategories(categories, root.id) : [];
  const Icon = SECTION_ICONS[section];
  const active = loc.pathname === '/shop' && new URLSearchParams(loc.search).get('category') === slug;
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link
        to={`/shop?category=${slug}`}
        onFocus={() => setOpen(true)}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition',
          section === 'FRESH' || active ? 'bg-forest-800 text-white hover:bg-forest-700' : 'text-charcoal-900 hover:bg-mint-50',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon className="size-4" /> {root?.name ?? SECTION_LABELS[section]}
        <ChevronDown className="size-3.5 opacity-70" />
      </Link>
      {open && (
        <div className="absolute left-0 top-full z-50 pt-2" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}>
          <div className="w-72 rounded-2xl border border-line bg-white p-2 shadow-lift">
            <p className="px-3 pb-1 pt-2 text-xs font-semibold text-charcoal-500">{SECTION_NOTES[section]}</p>
            <ul role="menu" className="grid gap-0.5">
              {kids.map((c) => (
                <li key={c.id}>
                  <Link role="menuitem" to={`/shop?category=${c.slug}`} className="block rounded-xl px-3 py-2 text-sm font-medium text-charcoal-900 hover:bg-mint-50">
                    {c.name}
                  </Link>
                </li>
              ))}
              {!kids.length && <li className="px-3 py-2 text-sm text-charcoal-500">Coming soon</li>}
              <li className="mt-1 border-t border-line pt-1">
                <Link role="menuitem" to={`/shop?category=${slug}`} className="block rounded-xl px-3 py-2 text-sm font-bold text-forest-800 hover:bg-mint-50">
                  All {root?.name ?? SECTION_LABELS[section]} →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementBar() {
  const { data } = useStoreInfo();
  const [cut, setCut] = useState(timeToCutoff());
  useEffect(() => {
    const t = setInterval(() => setCut(timeToCutoff()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="bg-forest-900 text-ivory-50">
      <div className="container-page flex h-9 items-center justify-center gap-3 text-[0.78rem] font-semibold sm:justify-between">
        <p className="truncate">
          <span className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-lime-300 align-middle" />
          {data?.settings.announcement ?? 'Fresh groceries. Fair prices. Delivered with care.'}
        </p>
        <p className="hidden shrink-0 text-ivory-50/75 sm:block">
          Order in the next{' '}
          <strong className="text-lime-300">
            {cut.hours}h {cut.minutes}m
          </strong>{' '}
          for tomorrow-morning delivery
        </p>
      </div>
    </div>
  );
}

export function Header() {
  const { menuOpen, setMenuOpen, setSearchOpen } = useUi();
  // Phones open the menu from the bottom tab bar; wider screens get the navigation row below.
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setMenuOpen(false), [loc.pathname, setMenuOpen]);
  const navLink = 'inline-flex items-center gap-1.5 rounded-full px-3 py-2 transition hover:bg-mint-50 hover:text-forest-800';
  const isOn = (q: string) => loc.pathname === '/shop' && loc.search.includes(q);

  return (
    <>
      <AnnouncementBar />
      <header className={cn('sticky top-[env(safe-area-inset-top)] z-50 border-b border-line bg-white/95 transition-shadow duration-300', scrolled && 'shadow-soft backdrop-blur-xl')}>
        <div className="container-page grid h-[4.25rem] grid-cols-[auto_1fr] items-center gap-3 md:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link to="/" aria-label="Brio Cart home" className="shrink-0 md:hidden">
              <Logo />
            </Link>
            <LocationPicker variant="pill" className="hidden lg:block" />
            <SearchBox className="hidden w-full max-w-[20rem] md:block" />
          </div>
          <Link to="/" aria-label="Brio Cart home" className="hidden shrink-0 md:block">
            <Logo />
          </Link>
          <div className="flex items-center justify-end gap-1">
            <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-ivory-100 md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="size-5" />
            </button>
            <SavedLink />
            <NotificationBell />
            <AccountMenu />
            <CartButton className="ml-1" />
            <Link to="/track" className="ml-2 hidden items-center gap-1.5 text-xs font-medium text-charcoal-700 hover:text-forest-800 xl:inline-flex">
              <Package className="size-3.5" /> Track Order
            </Link>
          </div>
        </div>
        <nav aria-label="Main" className="hidden border-t border-line/70 md:block">
          <div className="container-page flex h-12 items-center gap-1 whitespace-nowrap text-sm font-medium text-charcoal-700">
            {SECTIONS.map((s) => (
              <SectionMenu key={s} section={s} />
            ))}
            <Link to="/shop?collection=bestsellers" className={cn(navLink, 'ml-2', isOn('bestsellers') && 'text-forest-800')}>
              <Tag className="size-4" /> Bestsellers
            </Link>
            <Link to="/about" className={cn(navLink, loc.pathname === '/about' && 'text-forest-800')}>
              <Info className="size-4" /> About Us
            </Link>
            <span className="flex-1" />
            <Link to="/help#faq" className={navLink}>
              <CircleHelp className="size-4" /> FAQs
            </Link>
            <Link to="/help" className={navLink}>
              <Headphones className="size-4" /> Help &amp; Support
            </Link>
          </div>
        </nav>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchSheet />
    </>
  );
}

function SearchSheet() {
  const { searchOpen, setSearchOpen } = useUi();
  if (!searchOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-ivory-50 md:hidden" role="dialog" aria-modal="true" aria-label="Search">
      <div className="safe-top flex items-center gap-2 p-4">
        <SearchBox autoFocus variant="sheet" className="flex-1" onDone={() => setSearchOpen(false)} />
        <button type="button" onClick={() => setSearchOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-ivory-200" aria-label="Close search">
          <X className="size-5" />
        </button>
      </div>
      <div className="px-5 text-sm text-charcoal-500">Search in English, Hinglish or हिंदी — try “aloo”, “doodh”, “पालक”.</div>
    </div>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const { phoneDisplay } = useContact();
  return (
    <div className={cn('fixed inset-0 z-[75] md:hidden', !open && 'pointer-events-none')} aria-hidden={!open} inert={!open}>
      <div className={cn('absolute inset-0 bg-forest-950/40 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <nav
        aria-label="Main menu"
        className={cn(
          'safe-bottom absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[2rem] bg-forest-900 text-ivory-50 transition-transform duration-500 ease-out-expo grain',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="relative z-10 flex items-center justify-between p-5">
          <Logo tone="ivory" />
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/10" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <div className="relative z-10 px-3">
          <LocationPicker tone="dark" />
        </div>
        <ul className="relative z-10 mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {[
            { to: '/', label: 'Home' },
            ...mainCategories(categories).map((c) => ({ to: `/shop?category=${c.slug}`, label: c.name })),
            { to: '/shop', label: 'Everything' },
            { to: '/about', label: 'About Brio Cart' },
            { to: '/shops', label: 'Local shops' },
            { to: '/saved', label: 'Saved items' },
            { to: '/track', label: 'Track an order' },
            user ? { to: accountLink(user.role).to, label: accountLink(user.role).label } : { to: '/login', label: 'Sign in / Register' },
            ...(user?.role === 'CUSTOMER' ? [{ to: '/notifications', label: 'Notifications' }] : []),
            { to: '#preferences', label: 'My preferences' },
            { to: '/help', label: 'Help & contact' },
          ].map((i) => (
            <li key={i.to + i.label}>
              <Link
                to={i.to}
                onClick={(e) => {
                  onClose();
                  if (i.to === '#preferences') {
                    e.preventDefault();
                    useUi.getState().setPrefsOpen(true);
                  }
                }}
                className="block rounded-2xl px-4 py-3 font-display text-xl font-medium transition hover:bg-white/10"
              >
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="relative z-10 border-t border-white/10 p-5">
          <p className="flex w-full items-center gap-3 rounded-2xl bg-white/10 p-3 text-left">
            <Phone className="size-6 text-lime-300" />
            <span>
              <span className="block text-xs text-ivory-50/60">Questions or support? Call or WhatsApp</span>
              <span className="select-all font-bold">{phoneDisplay}</span>
            </span>
          </p>
        </div>
      </nav>
    </div>
  );
}

/** App-style bottom navigation for phones (and the Android app). */
export function MobileTabBar() {
  const count = useCart(selectCount);
  const { user } = useAuth();
  const setCartOpen = useUi((s) => s.setCartOpen);
  const { menuOpen, setMenuOpen } = useUi();
  const item ='flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.68rem] font-bold transition';
  const tab = ({ isActive }: { isActive: boolean }) => cn(item, isActive ? 'text-forest-800' : 'text-charcoal-400');
  return (
    <nav aria-label="Quick navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory-50/95 backdrop-blur-xl md:hidden">
      <div className="flex">
        <NavLink to="/" end className={tab}>
          <Home className="size-[1.35rem]" /> Home
        </NavLink>
        <NavLink to="/shop" className={tab}>
          <LayoutGrid className="size-[1.35rem]" /> Shop
        </NavLink>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className={cn(item, menuOpen ? 'text-forest-800' : 'text-charcoal-400')} aria-expanded={menuOpen} aria-label="Open menu">
          <Menu className="size-[1.35rem]" /> Menu
        </button>
        <button type="button" onClick={() => setCartOpen(true)} className={cn(item, 'relative text-charcoal-400')}>
          <span className="relative">
            <ShoppingBag className="size-[1.35rem]" />
            {count > 0 && (
              <span key={count} className="absolute -right-2.5 -top-1.5 grid min-w-[1.1rem] animate-pop place-items-center rounded-full bg-tomato-500 px-1 text-[0.62rem] font-extrabold text-white">
                {count}
              </span>
            )}
          </span>
          Cart
        </button>
        <NavLink to={accountLink(user?.role).to} className={tab}>
          <User className="size-[1.35rem]" /> {user ? (user.role === 'CUSTOMER' ? 'Account' : 'Dashboard') : 'Sign in'}
        </NavLink>
      </div>
    </nav>
  );
}

/** Heart in the header: saved items, with how many. */
function SavedLink() {
  const count = useWishlist((s) => s.items.length);
  return (
    <Link to="/saved" className="relative grid size-11 place-items-center rounded-full hover:bg-ivory-200" aria-label={`Saved items${count ? ` (${count})` : ''}`}>
      <Heart className="size-5" />
      {count > 0 && <span className="absolute right-1 top-1 grid min-w-[1.05rem] place-items-center rounded-full bg-tomato-500 px-1 text-[0.6rem] font-extrabold text-white">{count}</span>}
    </Link>
  );
}
