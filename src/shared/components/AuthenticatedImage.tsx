import React, { useEffect, useRef, useState } from 'react';
import axiosClient from '@/api/axiosClient';
import { ImageOff, Loader2 } from 'lucide-react';

interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  fallback?: React.ReactNode;
  showLoader?: boolean;
}

// In-memory cache for blob URLs to avoid re-fetching the same hash repeatedly in the same session
const blobCache = new Map<string, string>();
const blobRequestCache = new Map<string, Promise<string>>();

const loadBlobUrl = (src: string): Promise<string> => {
  const cached = blobCache.get(src);
  if (cached) return Promise.resolve(cached);

  const pending = blobRequestCache.get(src);
  if (pending) return pending;

  const request = axiosClient
    .get(src, { responseType: 'blob' })
    .then((res) => {
      const blobUrl = URL.createObjectURL(res.data);
      blobCache.set(src, blobUrl);
      return blobUrl;
    })
    .finally(() => {
      blobRequestCache.delete(src);
    });
  blobRequestCache.set(src, request);
  return request;
};

const isDirectUrl = (url: string): boolean => {
  return (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    (url.startsWith('/') && !url.startsWith('/api/') && !url.startsWith('/api'))
  );
};

/**
 * Component hiển thị ảnh cần xác thực (Bearer / cookie HttpOnly) như /api/series/.../bible/assets/{sha256}.
 * Tự động gọi API lấy blob và gán URL.createObjectURL, đồng thời tương thích với URL ngoại bộ, static assets và data-uri.
 */
export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  alt,
  fallback,
  showLoader = false,
  className = '',
  ...props
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(() => {
    if (!src) return null;
    if (isDirectUrl(src)) {
      return src;
    }
    return blobCache.get(src) || null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!src) return false;
    if (isDirectUrl(src)) {
      return false;
    }
    return !blobCache.has(src);
  });
  const [hasError, setHasError] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!src) {
      setResolvedUrl(null);
      setLoading(false);
      setHasError(false);
      return;
    }

    // Direct image URL (data:, blob:, static frontend assets, or external http/https)
    if (isDirectUrl(src)) {
      setResolvedUrl(src);
      setLoading(false);
      setHasError(false);
      return;
    }

    // Cached blob URL
    if (blobCache.has(src)) {
      setResolvedUrl(blobCache.get(src)!);
      setLoading(false);
      setHasError(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setHasError(false);

    const load = () =>
      loadBlobUrl(src)
        .then((blobUrl) => {
          if (isCancelled) return;
          setResolvedUrl(blobUrl);
          setLoading(false);
        })
        .catch(() => {
          if (isCancelled) return;
          setHasError(true);
          setLoading(false);
        });

    // Chỉ tải khi ảnh sắp vào màn hình; môi trường không có IntersectionObserver (test) thì tải ngay.
    const node = placeholderRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      void load();
      return () => {
        isCancelled = true;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);

    return () => {
      isCancelled = true;
      observer.disconnect();
    };
  }, [src]);

  if (!src || hasError) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        className={`flex flex-col items-center justify-center bg-stone-800 text-stone-500 ${className}`}
        data-testid='authenticated-image-fallback'
        title={alt}
      >
        <ImageOff className='w-5 h-5 opacity-40' />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        ref={placeholderRef}
        className={`flex items-center justify-center bg-stone-900 text-stone-400 ${className}`}
        data-testid='authenticated-image-loading'
      >
        {showLoader ? <Loader2 className='w-4 h-4 animate-spin text-[#F97316]' /> : null}
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl || ''}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};
