import React from 'react';
import { PostTemplateId, PostTemplateProps } from './types';
import { FeedVendaTemplate } from './FeedVendaTemplate';
import { FeedAluguelTemplate } from './FeedAluguelTemplate';
import { StoryTemplate } from './StoryTemplate';
import { CarrosselCapaTemplate } from './CarrosselCapaTemplate';

export interface PostTemplateRendererProps extends PostTemplateProps {
  templateId: PostTemplateId;
}

export const PostTemplateRenderer: React.FC<PostTemplateRendererProps> = ({
  templateId,
  property,
  companySettings,
  photoUrl,
  width,
  height
}) => {
  const commonProps = {
    property,
    companySettings,
    photoUrl,
    width,
    height
  };

  switch (templateId) {
    case 'feed_venda':
      return <FeedVendaTemplate {...commonProps} />;
    case 'feed_aluguel':
      return <FeedAluguelTemplate {...commonProps} />;
    case 'story':
      return <StoryTemplate {...commonProps} />;
    case 'carrossel_capa':
      return <CarrosselCapaTemplate {...commonProps} />;
    default:
      return <FeedVendaTemplate {...commonProps} />;
  }
};

export default PostTemplateRenderer;
