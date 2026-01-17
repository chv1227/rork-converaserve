import AsyncStorage from '@react-native-async-storage/async-storage';
import { Church, ChurchSettings, ChurchMembership, ChurchRole } from '@/types';

const CHURCHES_STORAGE_KEY = '@churches_data';
const CHURCH_SETTINGS_STORAGE_KEY = '@church_settings_data';
const CHURCH_MEMBERSHIPS_STORAGE_KEY = '@church_memberships_data';

export interface CreateChurchInput {
  name: string;
  denomination?: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
  website?: string;
  logo?: string;
  bannerImage?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

export interface ChurchMembershipWithDetails extends ChurchMembership {
  church?: Church;
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}${randomPart2}`;
}

async function getStoredChurches(): Promise<Church[]> {
  try {
    const data = await AsyncStorage.getItem(CHURCHES_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      console.log('Churches Storage: Loaded', parsed.length, 'churches from storage');
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Churches Storage: Error loading churches:', error);
    return [];
  }
}

async function saveChurches(churches: Church[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CHURCHES_STORAGE_KEY, JSON.stringify(churches));
    console.log('Churches Storage: Saved', churches.length, 'churches to storage');
  } catch (error) {
    console.error('Churches Storage: Error saving churches:', error);
    throw new Error('Failed to save church data');
  }
}

async function getStoredSettings(): Promise<ChurchSettings[]> {
  try {
    const data = await AsyncStorage.getItem(CHURCH_SETTINGS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Churches Storage: Error loading settings:', error);
    return [];
  }
}

async function saveSettings(settings: ChurchSettings[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CHURCH_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Churches Storage: Error saving settings:', error);
    throw new Error('Failed to save settings data');
  }
}

async function getStoredMemberships(): Promise<ChurchMembership[]> {
  try {
    const data = await AsyncStorage.getItem(CHURCH_MEMBERSHIPS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Churches Storage: Error loading memberships:', error);
    return [];
  }
}

async function saveMemberships(memberships: ChurchMembership[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CHURCH_MEMBERSHIPS_STORAGE_KEY, JSON.stringify(memberships));
  } catch (error) {
    console.error('Churches Storage: Error saving memberships:', error);
    throw new Error('Failed to save membership data');
  }
}

export async function createChurch(
  input: CreateChurchInput,
  userId: string
): Promise<{
  church: Church;
  membership: ChurchMembership;
  settings: ChurchSettings;
}> {
  console.log('Churches Storage: Creating church:', input.name);
  console.log('Churches Storage: User ID:', userId);
  
  try {
    const existingChurches = await getStoredChurches();
    
    const duplicate = existingChurches.find(
      (c) => c.name.toLowerCase() === input.name.toLowerCase() &&
             c.city.toLowerCase() === input.city.toLowerCase() &&
             c.state.toLowerCase() === input.state.toLowerCase()
    );

    if (duplicate) {
      console.log('Churches Storage: Duplicate church found:', duplicate.id);
      throw new Error('A church with this name already exists in this location');
    }

    const churchId = generateId();
    const now = new Date().toISOString();
    console.log('Churches Storage: Generated church ID:', churchId);

    const newChurch: Church = {
      id: churchId,
      name: input.name.trim(),
      denomination: input.denomination?.trim(),
      description: input.description.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      zip: input.zip.trim(),
      country: input.country.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      website: input.website?.trim() || undefined,
      logo: input.logo?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=1A7B74&color=fff&size=200`,
      bannerImage: input.bannerImage?.trim() || undefined,
      socialLinks: input.socialLinks || undefined,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    const settingsId = generateId();
    const defaultSettings: ChurchSettings = {
      id: settingsId,
      churchId: churchId,
      visibility: "public",
      modulesEnabled: {
        events: true,
        announcements: true,
        donations: true,
        media: true,
        ministries: true,
        messaging: true,
      },
      notificationPreferences: {
        newMembers: true,
        events: true,
        announcements: true,
        donations: true,
      },
      updatedAt: now,
    };

    const membershipId = generateId();
    const membership: ChurchMembership = {
      id: membershipId,
      churchId: churchId,
      userId: userId,
      role: "super_admin" as ChurchRole,
      joinedAt: now,
      isActive: true,
    };

    await saveChurches([...existingChurches, newChurch]);
    console.log('Churches Storage: Church saved successfully');

    const existingSettings = await getStoredSettings();
    await saveSettings([...existingSettings, defaultSettings]);
    console.log('Churches Storage: Settings saved successfully');

    const existingMemberships = await getStoredMemberships();
    await saveMemberships([...existingMemberships, membership]);
    console.log('Churches Storage: Membership saved successfully');

    console.log('Churches Storage: Church creation completed:', churchId);

    return { 
      church: newChurch, 
      membership,
      settings: defaultSettings,
    };
  } catch (error) {
    console.error('Churches Storage: Error creating church:', error);
    throw error instanceof Error ? error : new Error('Failed to create church');
  }
}

export async function listChurches(): Promise<Church[]> {
  console.log('Churches Storage: Listing all churches');
  
  try {
    const churches = await getStoredChurches();
    const allSettings = await getStoredSettings();
    
    const publicChurches = churches.filter(church => {
      const settings = allSettings.find(s => s.churchId === church.id);
      return !settings || settings.visibility === "public";
    });
    
    console.log('Churches Storage: Found', publicChurches.length, 'public churches');
    return publicChurches;
  } catch (error) {
    console.error('Churches Storage: Error listing churches:', error);
    return [];
  }
}

export async function getChurchById(churchId: string): Promise<Church | null> {
  console.log('Churches Storage: Getting church by ID:', churchId);
  
  try {
    const churches = await getStoredChurches();
    const church = churches.find(c => c.id === churchId);
    console.log('Churches Storage: Found church:', church?.name || 'not found');
    return church || null;
  } catch (error) {
    console.error('Churches Storage: Error getting church:', error);
    return null;
  }
}

export async function getUserChurches(userId: string): Promise<Church[]> {
  console.log('Churches Storage: Getting churches for user:', userId);
  
  try {
    const memberships = await getStoredMemberships();
    const userMemberships = memberships.filter(m => m.userId === userId && m.isActive);
    
    const churches = await getStoredChurches();
    const userChurches = churches.filter(church => 
      userMemberships.some(m => m.churchId === church.id)
    );
    
    console.log('Churches Storage: User has', userChurches.length, 'churches');
    return userChurches;
  } catch (error) {
    console.error('Churches Storage: Error getting user churches:', error);
    return [];
  }
}

export async function getChurchMembership(churchId: string, userId: string): Promise<ChurchMembership | null> {
  console.log('Churches Storage: Getting membership for church:', churchId);
  
  try {
    const memberships = await getStoredMemberships();
    const membership = memberships.find(m => m.churchId === churchId && m.userId === userId && m.isActive);
    return membership || null;
  } catch (error) {
    console.error('Churches Storage: Error getting membership:', error);
    return null;
  }
}

export async function getChurchSettings(churchId: string): Promise<ChurchSettings | null> {
  console.log('Churches Storage: Getting settings for church:', churchId);
  
  try {
    const allSettings = await getStoredSettings();
    const settings = allSettings.find(s => s.churchId === churchId);
    return settings || null;
  } catch (error) {
    console.error('Churches Storage: Error getting settings:', error);
    return null;
  }
}

export async function updateChurchSettings(
  churchId: string, 
  updates: Partial<Omit<ChurchSettings, 'id' | 'churchId'>>
): Promise<ChurchSettings | null> {
  console.log('Churches Storage: Updating settings for church:', churchId);
  
  try {
    const allSettings = await getStoredSettings();
    const index = allSettings.findIndex(s => s.churchId === churchId);
    
    if (index === -1) {
      console.log('Churches Storage: Settings not found for church:', churchId);
      return null;
    }
    
    const updatedSettings: ChurchSettings = {
      ...allSettings[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    allSettings[index] = updatedSettings;
    await saveSettings(allSettings);
    
    console.log('Churches Storage: Settings updated for church:', churchId);
    return updatedSettings;
  } catch (error) {
    console.error('Churches Storage: Error updating settings:', error);
    throw error instanceof Error ? error : new Error('Failed to update settings');
  }
}

export async function updateChurch(
  churchId: string,
  updates: Partial<Omit<Church, 'id' | 'createdBy' | 'createdAt'>>
): Promise<Church | null> {
  console.log('Churches Storage: Updating church:', churchId);
  
  try {
    const churches = await getStoredChurches();
    const index = churches.findIndex(c => c.id === churchId);
    
    if (index === -1) {
      console.log('Churches Storage: Church not found:', churchId);
      return null;
    }
    
    const updatedChurch: Church = {
      ...churches[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    churches[index] = updatedChurch;
    await saveChurches(churches);
    
    console.log('Churches Storage: Church updated:', churchId);
    return updatedChurch;
  } catch (error) {
    console.error('Churches Storage: Error updating church:', error);
    throw error instanceof Error ? error : new Error('Failed to update church');
  }
}

export async function deleteChurch(churchId: string): Promise<boolean> {
  console.log('Churches Storage: Deleting church:', churchId);
  
  try {
    const churches = await getStoredChurches();
    const filteredChurches = churches.filter(c => c.id !== churchId);
    await saveChurches(filteredChurches);
    
    const settings = await getStoredSettings();
    const filteredSettings = settings.filter(s => s.churchId !== churchId);
    await saveSettings(filteredSettings);
    
    const memberships = await getStoredMemberships();
    const filteredMemberships = memberships.filter(m => m.churchId !== churchId);
    await saveMemberships(filteredMemberships);
    
    console.log('Churches Storage: Church deleted successfully');
    return true;
  } catch (error) {
    console.error('Churches Storage: Error deleting church:', error);
    throw error instanceof Error ? error : new Error('Failed to delete church');
  }
}
