'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Tag, MapPin, Clock, TrendingDown, ExternalLink, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/price';
import { timeAgo } from '@/lib/format';
import { SourceBadge } from './source-badge';
import type { Currency } from '@/lib/types';

export interface ListingCardData {
  id: string;
  source_id: string;
  source_listing_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  price_raw: string | null;
  city: string | null;
  category: string | null;
  condition: string | null;
  images: string[];
  posted_at: string | null;
  url: string;
  is_new: boolean;
  is_range: boolean;
  previous_price?: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  phones: 'هواتف',
  cars: 'سيارات',
  'real-estate': 'عقارات',
  electronics: 'إلكترونيات',
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const currency = (listing.currency as Currency) ?? 'LYD';
  const hasImage = listing.images.length > 0 && listing.images[0];

  return (
    <Link href={`/listing/${listing.id}`} className="group block animate-fade-in">
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {hasImage ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <ImageIcon className="w-10 h-10 opacity-30" />
            </div>
          )}
          {listing.is_new && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success text-success-foreground animate-pulse-glow">
              جديد
            </span>
          )}
          {listing.is_range && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/90 text-warning-foreground">
              نطاق سعر
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {listing.title}
            </h3>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-primary">
              {formatPrice(listing.price, currency)}
            </span>
            {listing.previous_price != null && listing.price != null && listing.previous_price > listing.price && (
              <span className="flex items-center gap-0.5 text-xs text-success font-medium">
                <TrendingDown className="w-3 h-3" />
                {formatPrice(listing.previous_price, currency)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {listing.city && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {listing.city}
              </span>
            )}
            {listing.category && (
              <span className="flex items-center gap-0.5">
                <Tag className="w-3 h-3" />
                {CATEGORY_LABELS[listing.category] ?? listing.category}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {timeAgo(listing.posted_at)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <SourceBadge source={listing.source_id} />
            <span
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => {
                e.preventDefault();
                window.open(listing.url, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="w-3 h-3" />
              افتح الأصلي
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
