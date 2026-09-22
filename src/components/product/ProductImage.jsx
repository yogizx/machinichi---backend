import { useState } from 'react';
import { cloudinaryUrl, cloudinaryBlurPlaceholder, cloudinarySrcSet } from '../../services/cloudinaryService';

export default function ProductImage({ src, alt, width = 400, className = '', priority = false, aspectRatio = '1/1' }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const isCloudinary = src?.includes('res.cloudinary.com') || !src?.startsWith('http');
  const imageUrl = isCloudinary ? cloudinaryUrl(src, { w: width, q: 80, f: 'auto' }) : src;
  const blurUrl = isCloudinary ? cloudinaryBlurPlaceholder(src) : null;

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ aspectRatio }}>
        <span className="text-sm text-gray-400">Image not available</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
      {!loaded && blurUrl && (
        <img src={blurUrl} alt="" className="absolute inset-0 h-full w-full object-cover blur-sm transition-opacity duration-500" aria-hidden="true" />
      )}
      {!loaded && !blurUrl && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
      <img
        src={imageUrl}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        sizes={`(max-width: 640px) 50vw, (max-width: 1024px) 33vw, ${width}px`}
        srcSet={isCloudinary ? cloudinarySrcSet(src, [200, 400, 600, 800]) : undefined}
        className={`h-full w-full object-cover transition-all duration-500 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      />
    </div>
  );
}
