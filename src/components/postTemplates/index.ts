export * from './types';
export * from './BaseTemplateLayout';
export * from './FeedVendaTemplate';
export * from './FeedAluguelTemplate';
export * from './StoryTemplate';
export * from './CarrosselCapaTemplate';
export * from './PostTemplateRenderer';

import { PostTemplateConfig } from './types';

export const POST_TEMPLATES_CONFIG: PostTemplateConfig[] = [
  {
    id: 'feed_venda',
    name: 'Feed Venda (4:5)',
    description: 'Post vertical focado em venda de imóveis com valor total',
    width: 1080,
    height: 1350
  },
  {
    id: 'feed_aluguel',
    name: 'Feed Aluguel (4:5)',
    description: 'Post vertical focado em locação com valor mensal',
    width: 1080,
    height: 1350
  },
  {
    id: 'story',
    name: 'Instagram Story (9:16)',
    description: 'Formato vertical tela cheia para Stories e Reels',
    width: 1080,
    height: 1920
  },
  {
    id: 'carrossel_capa',
    name: 'Carrossel (Capa)',
    description: 'Capa chamativa para carrossel com indicação de arrastar',
    width: 1080,
    height: 1350
  }
];
