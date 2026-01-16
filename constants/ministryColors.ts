export interface MinistryColorConfig {
  id: string;
  name: string;
  color: string;
}

export const MINISTRY_COLORS: Record<string, string> = {
  youth: '#3B82F6',
  worship: '#8B5CF6',
  outreach: '#10B981',
  prayer: '#F59E0B',
  children: '#EC4899',
  women: '#F472B6',
  men: '#6366F1',
  missions: '#14B8A6',
  hospitality: '#F97316',
  media: '#06B6D4',
  deacon: '#EF4444',
  education: '#84CC16',
  senior: '#A855F7',
  music: '#8B5CF6',
  singles: '#0EA5E9',
  couples: '#E11D48',
  recovery: '#22C55E',
  discipleship: '#7C3AED',
};

export const DEFAULT_MINISTRY_COLOR = '#9CA3AF';

export function getMinistryColor(ministryName: string, ministryId?: string): string {
  const nameLower = ministryName.toLowerCase();
  
  for (const [key, color] of Object.entries(MINISTRY_COLORS)) {
    if (nameLower.includes(key)) {
      return color;
    }
  }
  
  if (ministryId) {
    const idLower = ministryId.toLowerCase();
    for (const [key, color] of Object.entries(MINISTRY_COLORS)) {
      if (idLower.includes(key)) {
        return color;
      }
    }
  }
  
  return DEFAULT_MINISTRY_COLOR;
}

export const MINISTRY_LEGEND: MinistryColorConfig[] = [
  { id: 'youth', name: 'Youth', color: MINISTRY_COLORS.youth },
  { id: 'worship', name: 'Worship', color: MINISTRY_COLORS.worship },
  { id: 'outreach', name: 'Outreach', color: MINISTRY_COLORS.outreach },
  { id: 'prayer', name: 'Prayer', color: MINISTRY_COLORS.prayer },
  { id: 'children', name: 'Children', color: MINISTRY_COLORS.children },
  { id: 'women', name: 'Women', color: MINISTRY_COLORS.women },
  { id: 'men', name: 'Men', color: MINISTRY_COLORS.men },
  { id: 'missions', name: 'Missions', color: MINISTRY_COLORS.missions },
  { id: 'hospitality', name: 'Hospitality', color: MINISTRY_COLORS.hospitality },
  { id: 'media', name: 'Media', color: MINISTRY_COLORS.media },
  { id: 'deacon', name: 'Deacon', color: MINISTRY_COLORS.deacon },
  { id: 'education', name: 'Education', color: MINISTRY_COLORS.education },
];
