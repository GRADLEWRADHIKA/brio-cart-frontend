import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bike, Heart, Home, LayoutDashboard, LayoutGrid, Menu, Search, ShoppingBag, Store, User, X } from 'lucide-react';
import { homePathFor, type Role } from '@shared/core';
import { NotificationBell } from '@/components/notifications/Notifications';
import { useCart, selectCount } from '@/store/cart';
import { useUi } from '@/store/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { Logo, WhatsAppIcon } from '@/components/ui/Brand';
import { buildWhatsAppUrl } from '@shared/core';
import { cn, openExternal, timeToCutoff } from '@/utils';
import { SearchBox } from './SearchBox';
import { useWishlist } from '@/store/wishlist';
import { LocationPicker } from './LocationPicker';

function CartButton({ className }: { className?: string }) {
  const count = useCart(selectCount);
  const setCartOpen = useUi((s) => s.setCartOpen);
  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      className={cn('relative inline-flex h-12 items-center gap-2 rounded-full bg-forest-800 pl-4 pr-5 font-bold text-ivory-50 transition hover:bg-forest-700', className)}
      aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <ShoppingBag className="size-5" />
      <span className="hidden sm:inline">Cart</span>
      <span key={count} className={cn('grid min-w-6 animate-pop place-items-center rounded-full px-1.5 text-xs font-extrabold tabular-nums', count ? 'bg-lime-300 text-forest-900' : 'bg-white/15')} data-testid="cart-count">
        {count}
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
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const { menuOpen, setMenuOpen, setSearchOpen } = useUi();
  // Phones open the menu from the bottom tab bar; wider screens get the category row below.
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setMenuOpen(false), [loc.pathname, setMenuOpen]);

  return (
    <>
      <AnnouncementBar />
      <header className={cn('sticky top-[env(safe-area-inset-top)] z-50 border-b transition-all duration-300', scrolled ? 'border-line bg-ivory-50/85 shadow-soft backdrop-blur-xl' : 'border-transparent bg-ivory-50')}>
        <div className="container-page flex h-[4.5rem] items-center gap-3 lg:gap-6">
          <Link to="/" aria-label="Brio Cart home" className="shrink-0">
            <Logo />
          </Link>
          <LocationPicker className="hidden xl:block" />
          <SearchBox className="hidden flex-1 md:block" />
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-ivory-200 md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="size-5" />
            </button>
            <SavedLink />
            <NotificationBell />
            {(() => {
              const link = accountLink(user?.role);
              return (
                <Link to={link.to} className="hidden h-12 items-center gap-2 rounded-full px-4 font-bold text-forest-800 transition hover:bg-ivory-200 sm:inline-flex">
                  <link.icon className="size-5" />
                  <span className="max-w-28 truncate">{user ? (user.role === 'CUSTOMER' ? user.name.split(' ')[0] : link.label) : 'Sign in'}</span>
                </Link>
              );
            })()}
            <CartButton />
          </div>
        </div>
        <nav aria-label="Categories" className="hidden border-t border-line/60 md:block">
          <ul className="no-scrollbar container-page flex h-12 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm font-bold text-charcoal-700">
            <li>
              <NavLink to="/shop" end className={({ isActive }) => cn('rounded-full px-3.5 py-2 transition hover:bg-mint-100 hover:text-forest-800', isActive && !loc.search && 'bg-mint-100 text-forest-800')}>
                All groceries
              </NavLink>
            </li>
            {categories?.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/shop?category=${c.slug}`}
                  className={cn('rounded-full px-3.5 py-2 transition hover:bg-mint-100 hover:text-forest-800', loc.search.includes(`category=${c.slug}`) && 'bg-mint-100 text-forest-800')}
                >
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/shop?collection=essentials" className="rounded-full px-3.5 py-2 transition hover:bg-mint-100 hover:text-forest-800">
                Daily Essentials
              </Link>
            </li>
            <li className="ml-auto">
              <Link to="/track" className="rounded-full px-3.5 py-2 text-charcoal-500 transition hover:text-forest-800">
                Track order
              </Link>
            </li>
          </ul>
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
  const { whatsapp, phoneDisplay } = useContact();
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
            { to: '/shop', label: 'All groceries' },
            ...(categories ?? []).map((c) => ({ to: `/shop?category=${c.slug}`, label: c.name })),
            { to: '/shop?collection=essentials', label: 'Daily Essentials' },
            { to: '/shops', label: 'Local shops' },
            { to: '/saved', label: 'Saved items' },
            { to: '/track', label: 'Track an order' },
            user ? { to: accountLink(user.role).to, label: accountLink(user.role).label } : { to: '/login', label: 'Sign in / Register' },
            ...(user?.role === 'CUSTOMER' ? [{ to: '/notifications', label: 'Notifications' }] : []),
            { to: '/help', label: 'Help & contact' },
          ].map((i) => (
            <li key={i.to + i.label}>
              <Link to={i.to} onClick={onClose} className="block rounded-2xl px-4 py-3 font-display text-xl font-medium transition hover:bg-white/10">
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="relative z-10 border-t border-white/10 p-5">
          <button type="button" onClick={() => openExternal(buildWhatsAppUrl(whatsapp, 'Hello Brio Cart!'))} className="flex w-full items-center gap-3 rounded-2xl bg-white/10 p-3 text-left">
            <WhatsAppIcon className="size-7 text-[#4ade80]" />
            <span>
              <span className="block text-xs text-ivory-50/60">Call or WhatsApp</span>
              <span className="font-bold">{phoneDisplay}</span>
            </span>
          </button>
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
