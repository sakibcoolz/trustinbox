'use client';

import { Suspense } from 'react';
import { CustomersContent } from './CustomersContent';
import { Skeleton } from '@/components/Skeleton';

export default function CustomersPage() {
  return (
    <Suspense fallback={<CustomersSkeleton />}>
      <CustomersContent />
    </Suspense>
  );
}

function CustomersSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
