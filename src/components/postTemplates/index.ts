export * from './types';
export * from './BaseTemplateLayout';
export * from './FeedVendaTemplate';
export * from './FeedAluguelTemplate';
export * from './StoryTemplate';
export * from './PostTemplateRenderer';

import { PostTemplateConfig } from './types';

export const POST_TEMPLATES_CONFIG: PostTemplateConfig[] = [
  {
    id: 'feed_vertical',
    name: 'Feed Retrato (1080x1350)',
    description: 'Formato 4:5 vertical ideal para o Feed do Instagram',
    width: 1080,
    height: 1350
  },
  {
    id: 'feed_quadrado',
    name: 'Feed Quadrado (1080x1080)',
    description: 'Formato 1:1 quadrado tradicional para redes sociais',
    width: 1080,
    height: 1080
  },
  {
    id: 'story',
    name: 'Stories / Reels (1080x1920)',
    description: 'Formato 9:16 vertical em tela cheia para Stories e Reels',
    width: 1080,
    height: 1920
  }
];
