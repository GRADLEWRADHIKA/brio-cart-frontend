import { useEffect } from 'react';
import { SECTION_SLUGS, type Section } from '@shared/core';
import { CampaignBanner } from '@/components/home/CampaignBanner';
import { ProductRail } from '@/components/home/Sections';
import { DeliveryAreas, HowItWorksSteps, PromiseTiles, SupportStrip } from '@/components/home/Redesign';
import { FrontBanner, HomeVideo, RecommendedRail, SectionBlocks, useSectionOrder } from '@/components/home/FrontPage';
import { useStoreInfo } from '@/hooks/useStoreInfo';

const SECTION_RAILS: Record<Section, { eyebrow: string; title: string }> = {
  FRESH: { eyebrow: 'Picked this morning', title: 'Fresh Fruits & Vegetables' },
  GROCERY: { eyebrow: 'Delivered across India', title: 'Grocery' },
  HANDMADE: { eyebrow: 'From local makers', title: 'Handmade' },
};

/** Front page: banner → Fresh / Grocery / Handmade → video → product rows (in the shopper's order of interest). */
export default function HomePage() {
  const { data } = useStoreInfo();
  const order = useSectionOrder();
  useEffect(() => {
    document.title = 'Brio Cart — Fresh in Lucknow, Groceries & Handmade across India';
  }, []);

  return (
    <>
      <FrontBanner />
      <SectionBlocks />
      <HomeVideo />
      <RecommendedRail />
      {data?.campaign && <CampaignBanner campaign={data.campaign} />}
      <ProductRail eyebrow="Customer favourites" title="Bestsellers" filters={{ collection: 'bestsellers' }} href="/shop?collection=bestsellers" />
      {order.map((s) => (
        <ProductRail key={s} eyebrow={SECTION_RAILS[s].eyebrow} title={SECTION_RAILS[s].title} filters={{ category: SECTION_SLUGS[s] }} href={`/shop?category=${SECTION_SLUGS[s]}`} />
      ))}
      <ProductRail
        eyebrow="Trending in your area"
        title="Popular Products"
        filters={{ sort: 'popular' }}
        fallback={{ collection: 'popular' }}
        href="/shop?sort=popular"
      />
      <PromiseTiles />
      <HowItWorksSteps />
      <DeliveryAreas />
      <SupportStrip />
    </>
  );
}
