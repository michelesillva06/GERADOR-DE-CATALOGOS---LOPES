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
    case 'feed_vertical':
    case 'feed_quadrado':
      return <FeedVendaTemplate {...commonProps} />;
    default:
      return <FeedVendaTemplate {...commonProps} />;
  }
};

export default PostTemplateRenderer;
