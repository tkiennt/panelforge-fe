import React, { useEffect, useState } from 'react';
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

    axiosClient
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (isCancelled) return;
        const blobUrl = URL.createObjectURL(res.data);
        blobCache.set(src, blobUrl);
        setResolvedUrl(blobUrl);
        setLoading(false);
      })
      .catch(() => {
        if (isCancelled) return;
        setHasError(true);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [src]);

  if (!src || hasError) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        className={`flex flex-col items-center justify-center bg-zinc-800 text-zinc-500 ${className}`}
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
        className={`flex items-center justify-center bg-zinc-900 text-zinc-400 ${className}`}
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
