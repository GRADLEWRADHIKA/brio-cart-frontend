import { Carrot } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';

export default function NotFoundPage() {
  return (
    <EmptyState className="min-h-[60vh] justify-center" icon={<Carrot className="size-10" strokeWidth={1.5} />} title="This page has gone out of season" action={<ButtonLink to="/">Back to the store</ButtonLink>}>
      The page you’re looking for doesn’t exist or has moved.
    </EmptyState>
  );
}
