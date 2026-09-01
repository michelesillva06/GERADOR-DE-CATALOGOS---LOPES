import { Property, CompanySettings } from '../../types';

export type PostTemplateId = 'feed_vertical' | 'feed_quadrado';

export interface PostTemplateConfig {
  id: PostTemplateId;
  name: string;
  description: string;
  width: number;
  height: number;
}

export interface PostTemplateProps {
  property: Property;
  companySettings: CompanySettings;
  photoUrl: string;
  width: number;
  height: number;
}
