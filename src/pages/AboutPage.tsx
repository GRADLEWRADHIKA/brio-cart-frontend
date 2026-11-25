import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, MapPin, Phone, ShieldCheck, Sprout, Truck } from 'lucide-react';
import { useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { BrioMark } from '@/components/ui/Brand';
import { ProductImage } from '@/components/ui/misc';

/** Built-in wording until the store writes its own in Store settings → About page. */
const DEFAULT_STORY = [
  'Brio Cart began in Lucknow with a simple idea: the fruit and vegetables on your table should be as fresh as the ones in the market at sunrise, at a fair price, without the morning rush.',
  'Every morning we pick up produce from growers and mandis we know, sort and pack it by hand, and bring it to your door. Today we also send groceries and handmade goods to customers across India.',
];
const DEFAULT_CHEMICAL_FREE = [
  'We choose produce that is grown and ripened naturally, and we don’t polish, wax or artificially ripen what we sell.',
  'If anything you receive doesn’t meet that promise, tell us and we’ll make it right.',
];

const paragraphs = (text: string | null | undefined, fallback: string[]) =>
  text?.trim() ? text.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean) : fallback;

export default function AboutPage() {
  const { data } = useStoreInfo();
  const { phoneDisplay } = useContact();
  const about = data?.settings.about;
  const eta = data?.settings.eta;
  const areas = data?.areas ?? [];

  useEffect(() => {
    document.title = 'About us — Brio Cart';
  }, []);

  return (
    <div className="pb-16">
      <section className="border-b border-line bg-gradient-to-br from-[#f1faf3] to-[#e2f4e7]">
        <div className="container-page grid items-center gap-8 py-10 md:grid-cols-[1fr_20rem] md:py-14">
          <div>
            <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal-500">
              <Link to="/" className="hover:text-forest-800">
                Home
              </Link>{' '}
              › About us
            </nav>
            <h1 className="mt-3 font-sans text-4xl font-bold tracking-tight text-charcoal-900 sm:text-5xl">About Brio Cart</h1>
            <p className="mt-3 max-w-2xl text-lg text-charcoal-700">Fresh produce for Lucknow every morning, and groceries and handmade goods for the rest of India.</p>
          </div>
          <div className="relative mx-auto hidden size-56 place-items-center md:grid" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-white/70" />
            <BrioMark className="relative h-28 w-auto" />
          </div>
        </div>
      </section>

      <div className="container-page mt-10 space-y-10">
        <StoryBlock
          id="brand-story"
          icon={<Sprout className="size-5" />}
          title="Our Brand Story"
          paragraphs={paragraphs(about?.story, DEFAULT_STORY)}
          image={about?.storyImage ?? '/uploads/products/tomato.webp'}
        />
        <StoryBlock
          id="chemical-free"
          icon={<Leaf className="size-5" />}
          title="Chemical Free"
          paragraphs={paragraphs(about?.chemicalFree, DEFAULT_CHEMICAL_FREE)}
          image={about?.chemicalImage ?? '/uploads/products/spinach.webp'}
          flip
        />

        <section aria-labelledby="how-we-deliver" className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h2 id="how-we-deliver" className="font-sans text-2xl font-bold tracking-tight text-charcoal-900">
            How we deliver
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Fact icon={<MapPin className="size-5" />} title="Lucknow localities">
              Everything, including Fresh, delivered {eta?.local.toLowerCase() ?? 'next morning'}
              {areas.length ? ` to ${areas.map((a) => a.name).join(', ')}` : ''}.
            </Fact>
            <Fact icon={<Truck className="size-5" />} title="Rest of Lucknow">
              Grocery and Handmade by courier, {eta?.city ?? '1–3 days'}.
            </Fact>
            <Fact icon={<ShieldCheck className="size-5" />} title="Across India">
              Grocery and Handmade by courier, {eta?.india.toLowerCase() ?? 'within 7 days'}. Fresh is coming soon to more cities.
            </Fact>
          </div>
        </section>

        <section className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-forest-900 p-6 text-ivory-50 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-sans text-xl font-bold">Questions? We’re happy to help.</h2>
            <p className="mt-1 flex items-center gap-2 text-ivory-50/80">
              <Phone className="size-4 text-lime-300" /> Call or WhatsApp <span className="select-all font-bold text-ivory-50">{phoneDisplay}</span>
            </p>
          </div>
          <Link to="/shop" className="inline-flex h-12 items-center gap-2 rounded-full bg-lime-300 px-6 font-bold text-forest-900 hover:bg-lime-200">
            Start shopping <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

function StoryBlock({ id, icon, title, paragraphs, image, flip }: { id: string; icon: React.ReactNode; title: string; paragraphs: string[]; image: string; flip?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-40 items-center gap-6 md:grid-cols-2 md:gap-10">
      <div className={flip ? 'md:order-2' : undefined}>
        <p className="eyebrow text-leaf-600">
          {icon} Brio Cart
        </p>
        <h2 id={`${id}-h`} className="mt-2 font-sans text-3xl font-bold tracking-tight text-charcoal-900">
          {title}
        </h2>
        <div className="mt-4 space-y-3 text-charcoal-700">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-mint-50">
        <div className="absolute inset-0 p-8">
          <ProductImage src={image} alt="" className="size-full rounded-2xl object-contain" />
        </div>
      </div>
    </section>
  );
}

function Fact({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-mint-50 p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-white text-forest-700">{icon}</span>
      <p className="mt-3 font-bold text-charcoal-900">{title}</p>
      <p className="mt-1 text-sm text-charcoal-700">{children}</p>
    </div>
  );
}
