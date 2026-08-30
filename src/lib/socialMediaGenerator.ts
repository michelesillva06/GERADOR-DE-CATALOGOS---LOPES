import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { Property, CompanySettings } from '../types';
import { extractPropertyImages } from './pdfGenerator';
import { SocialMediaCard } from '../components/SocialMediaCard';

/**
 * Renders the SocialMediaCard component off-screen at the target pixel size and captures it to
 * a PNG canvas via html2canvas — real HTML/CSS layout (flexbox, rounded corners, shadows)
 * rendered by the browser's own engine, instead of shapes hand-drawn with canvas path math.
 */
async function renderCardToCanvas(
  prop: Property,
  companySettings: CompanySettings,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const images = extractPropertyImages(prop);
  const photoUrl = images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';

  // Mount off-screen (not display:none — html2canvas needs the element actually laid out).
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    await new Promise<void>(resolve => {
      root.render(
        React.createElement(SocialMediaCard, {
          property: prop,
          companySettings,
          photoUrl,
          width,
          height
        })
      );
      // Let React commit and the browser paint before capturing.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    // Wait for every <img> in the card (property photo + icon data-URIs) to finish loading —
    // React mounting an <img> doesn't mean its image data has actually decoded yet, and
    // capturing before that happened is what caused icons to silently go missing from the
    // downloaded PNG.
    const allImgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      allImgs.map(img =>
        (img as HTMLImageElement).complete
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
              setTimeout(() => resolve(), 5000); // safety timeout
            })
      )
    );

    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      width,
      height,
      scale: 1,
      useCORS: true,
      backgroundColor: '#FFFFFF'
    });

    return canvas;
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const url = canvas.toDataURL('image/png', 0.95);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

/** Feed post — 1080x1350 (4:5), the safest aspect ratio for Instagram feed. */
export async function generateFeedPost(prop: Property, companySettings: CompanySettings): Promise<HTMLCanvasElement> {
  return renderCardToCanvas(prop, companySettings, 1080, 1350);
}

/** Story — 1080x1920 (9:16). */
export async function generateStoryPost(prop: Property, companySettings: CompanySettings): Promise<HTMLCanvasElement> {
  return renderCardToCanvas(prop, companySettings, 1080, 1920);
}

/** Generates and downloads both the feed and the story image for a property. */
export async function generateAndDownloadSocialMedia(prop: Property, companySettings: CompanySettings) {
  const feed = await generateFeedPost(prop, companySettings);
  downloadCanvas(feed, `${prop.code}_feed_instagram.png`);

  const story = await generateStoryPost(prop, companySettings);
  // Slight delay so the browser doesn't drop the second automatic download.
  await new Promise(resolve => setTimeout(resolve, 400));
  downloadCanvas(story, `${prop.code}_story_instagram.png`);
}
