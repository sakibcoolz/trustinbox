'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useDetailParam(paramName: string = 'id') {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedId = searchParams.get(paramName);

  const setSelectedId = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, id);
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname, paramName]);

  const clearSelectedId = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, router, pathname, paramName]);

  return { selectedId, setSelectedId, clearSelectedId };
}
