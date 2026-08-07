import React from 'react';
import { Property } from '../types';

export const DEFAULT_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';

export function getPropertyImages(property?: Partial<Property> | null): string[] {
  if (!property) return [DEFAULT_PROPERTY_IMAGE];
  
  const result: string[] = [];

  // 1. Check property.images array
  if (Array.isArray(property.images) && property.images.length > 0) {
    property.images.forEach(img => {
      if (typeof img === 'string' && img.trim()) {
        result.push(img.trim());
      }
    });
  }

  // 2. Check property.photos array (from legacy data or object structures)
  if (Array.isArray(property.photos) && property.photos.length > 0) {
    property.photos.forEach(p => {
      const url = typeof p === 'string' ? p : p?.url;
      if (url && typeof url === 'string' && url.trim() && !result.includes(url.trim())) {
        result.push(url.trim());
      }
    });
  }

  // 3. Check property.main_image
  if (property.main_image && typeof property.main_image === 'string' && property.main_image.trim()) {
    if (!result.includes(property.main_image.trim())) {
      result.unshift(property.main_image.trim());
    }
  }

  return result.length > 0 ? result : [DEFAULT_PROPERTY_IMAGE];
}

export function getPropertyMainImage(property?: Partial<Property> | null): string {
  if (!property) return DEFAULT_PROPERTY_IMAGE;
  if (property.main_image && typeof property.main_image === 'string' && property.main_image.trim()) {
    return property.main_image.trim();
  }
  const images = getPropertyImages(property);
  return images[0] || DEFAULT_PROPERTY_IMAGE;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl: string = DEFAULT_PROPERTY_IMAGE) {
  const target = e.currentTarget;
  if (target.src !== fallbackUrl) {
    target.onerror = null; // Prevent infinite event loop
    target.src = fallbackUrl;
  }
}
