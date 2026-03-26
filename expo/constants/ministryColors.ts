export interface MinistryColorConfig {
  id: string;
  name: string;
  color: string;
}

export const MINISTRY_COLORS: Record<string, string> = {
  youth: '#4A8BAF',
  worship: '#6B8F71',
  outreach: '#5A8F8F',
  prayer: '#C8943E',
  children: '#C76F54',
  women: '#B07A9E',
  men: '#1B3A5C',
  missions: '#5A8F8F',
  hospitality: '#D4956A',
  media: '#4A7FAF',
  deacon: '#8B5E5E',
  education: '#6B8F71',
  senior: '#7A6B8F',
  music: '#6B7F8F',
  singles: '#4A8BAF',
  couples: '#A67A6B',
  recovery: '#5A8F6B',
  discipleship: '#5C6B8F',
};

export const DEFAULT_MINISTRY_COLOR = '#8C919A';

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
