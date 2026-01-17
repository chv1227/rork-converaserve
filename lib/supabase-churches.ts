import { trpcClient, getTRPCErrorMessage } from '@/lib/trpc';
import { Church, ChurchSettings, ChurchMembership, ChurchRole } from '@/types';

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

export async function createChurch(input: CreateChurchInput): Promise<{
  church: Church;
  membership: ChurchMembership;
  settings: ChurchSettings;
}> {
  console.log('Supabase Churches: Creating church via tRPC:', input.name);
  console.log('Supabase Churches: Input data:', JSON.stringify({
    name: input.name,
    city: input.city,
    state: input.state,
    country: input.country,
  }));
  
  try {
    const result = await trpcClient.churches.create.mutate({
      name: input.name,
      denomination: input.denomination,
      description: input.description,
      address: input.address,
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: input.country,
      email: input.email,
      phone: input.phone,
      website: input.website,
      logo: input.logo,
      bannerImage: input.bannerImage,
      socialLinks: input.socialLinks,
    });

    console.log('Supabase Churches: Church created successfully:', result.church.name);
    console.log('Supabase Churches: Church ID:', result.church.id);
    console.log('Supabase Churches: Settings ID:', result.settings.id);
    console.log('Supabase Churches: Membership ID:', result.membership.id);
    return result;
  } catch (error) {
    console.error('Supabase Churches: Error creating church:', error);
    const message = getTRPCErrorMessage(error);
    console.error('Supabase Churches: Parsed error:', message);
    throw new Error(message);
  }
}

export async function listChurches(): Promise<Church[]> {
  console.log('Supabase Churches: Listing all churches via tRPC');
  
  try {
    const churches = await trpcClient.churches.list.query();
    console.log('Supabase Churches: Found', churches.length, 'churches');
    return churches;
  } catch (error) {
    console.error('Supabase Churches: Error listing churches:', error);
    const message = getTRPCErrorMessage(error);
    console.error('Supabase Churches: Parsed error:', message);
    return [];
  }
}

export async function getChurchById(churchId: string): Promise<Church | null> {
  console.log('Supabase Churches: Getting church by ID via tRPC:', churchId);
  
  try {
    const church = await trpcClient.churches.getById.query({ id: churchId });
    console.log('Supabase Churches: Found church:', church?.name);
    return church;
  } catch (error) {
    console.error('Supabase Churches: Error getting church:', error);
    const message = getTRPCErrorMessage(error);
    console.error('Supabase Churches: Parsed error:', message);
    return null;
  }
}

export async function getUserChurches(): Promise<Church[]> {
  console.log('Supabase Churches: Getting user churches via tRPC');
  
  try {
    const churches = await trpcClient.churches.getUserChurches.query();
    console.log('Supabase Churches: User has', churches.length, 'churches');
    return churches as Church[];
  } catch (error) {
    console.error('Supabase Churches: Error getting user churches:', error);
    const message = getTRPCErrorMessage(error);
    console.error('Supabase Churches: Parsed error:', message);
    return [];
  }
}

export async function getChurchMembership(churchId: string): Promise<ChurchMembership | null> {
  console.log('Churches: Getting membership for church:', churchId);
  
  try {
    const result = await trpcClient.churches.getMembership.query({ churchId });
    if (!result) return null;
    
    return {
      id: result.id,
      churchId: result.churchId,
      userId: result.userId,
      role: result.role as ChurchRole,
      joinedAt: result.joinedAt,
      isActive: result.isActive,
    };
  } catch (error) {
    console.error('Churches: Error getting membership:', error);
    return null;
  }
}

export async function getChurchSettings(churchId: string): Promise<ChurchSettings | null> {
  console.log('Churches: Getting settings for church:', churchId);
  
  try {
    const settings = await trpcClient.churches.getSettings.query({ churchId });
    return settings;
  } catch (error) {
    console.error('Churches: Error getting settings:', error);
    return null;
  }
}

export async function updateChurchSettings(
  churchId: string, 
  updates: Partial<Omit<ChurchSettings, 'id' | 'churchId'>>
): Promise<ChurchSettings | null> {
  console.log('Churches: Updating settings for church:', churchId);
  
  try {
    const result = await trpcClient.churches.updateSettings.mutate({
      churchId,
      visibility: updates.visibility,
      modulesEnabled: updates.modulesEnabled,
      notificationPreferences: updates.notificationPreferences,
    });
    
    console.log('Churches: Settings updated for church:', churchId);
    return result;
  } catch (error) {
    console.error('Churches: Error updating settings:', error);
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    throw new Error(message);
  }
}

export async function updateChurch(
  churchId: string,
  updates: Partial<Omit<Church, 'id' | 'createdBy' | 'createdAt'>>
): Promise<Church | null> {
  console.log('Churches: Updating church:', churchId);
  
  try {
    const result = await trpcClient.churches.update.mutate({
      id: churchId,
      name: updates.name,
      denomination: updates.denomination,
      description: updates.description,
      address: updates.address,
      city: updates.city,
      state: updates.state,
      zip: updates.zip,
      country: updates.country,
      email: updates.email,
      phone: updates.phone,
      website: updates.website,
      logo: updates.logo,
      bannerImage: updates.bannerImage,
      socialLinks: updates.socialLinks,
    });
    
    console.log('Churches: Church updated:', churchId);
    return result;
  } catch (error) {
    console.error('Churches: Error updating church:', error);
    const message = error instanceof Error ? error.message : 'Failed to update church';
    throw new Error(message);
  }
}

export async function deleteChurch(churchId: string): Promise<boolean> {
  console.log('Churches: Deleting church:', churchId);
  
  try {
    await trpcClient.churches.delete.mutate({ id: churchId });
    console.log('Churches: Church deleted successfully');
    return true;
  } catch (error) {
    console.error('Churches: Error deleting church:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete church';
    throw new Error(message);
  }
}
