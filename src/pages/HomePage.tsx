import { useEffect } from 'react';
import { Hero } from '@/components/home/Hero';
import { CampaignBanner } from '@/components/home/CampaignBanner';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { HomeTop } from '@/components/home/HomeTop';
import { HowItWorks, ProduceTicker, ProductRail, ServiceAreas, WhatsAppCta, WhyBrio } from '@/components/home/Sections';
import { useStoreInfo } from '@/hooks/useStoreInfo';

export default function HomePage() {
  const { data } = useStoreInfo();
  useEffect(() => {
    document.title = 'Brio Cart — Fresh Groceries Delivered in Lucknow';
  }, []);

  return (
    <>
      <HomeTop />
      <BannerCarousel className="container-page mb-10 sm:mb-14" />
      <Hero />
      <ProduceTicker />
      {data?.campaign && <CampaignBanner campaign={data.campaign} />}
      <ProductRail eyebrow="Customer favourites" title="Bestsellers" filters={{ collection: 'bestsellers' }} href="/shop?collection=bestsellers" />
      <ProductRail eyebrow="Just in" title="Fresh Picks" filters={{ collection: 'fresh-picks' }} href="/shop?collection=fresh-picks" tone="mint" />
      <ProductRail eyebrow="Kitchen staples" title="Everyday Essentials" filters={{ collection: 'essentials' }} href="/shop?collection=essentials" />
      <ProductRail
        eyebrow="Trending in your area"
        title="Popular Products"
        filters={{ sort: 'popular' }}
        fallback={{ collection: 'popular' }}
        href="/shop?sort=popular"
      />
      <WhyBrio />
      <HowItWorks />
      <ServiceAreas />
      <WhatsAppCta />
    </>
  );
}
