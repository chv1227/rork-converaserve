import { getSupabaseClient } from './supabase-auth';
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

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}${randomPart2}`;
}

function mapDbChurchToChurch(dbChurch: Record<string, unknown>): Church {
  return {
    id: dbChurch.id as string,
    name: dbChurch.name as string,
    denomination: dbChurch.denomination as string | undefined,
    description: dbChurch.description as string,
    address: dbChurch.address as string,
    city: dbChurch.city as string,
    state: dbChurch.state as string,
    zip: dbChurch.zip as string,
    country: dbChurch.country as string,
    email: dbChurch.email as string,
    phone: dbChurch.phone as string,
    website: dbChurch.website as string | undefined,
    logo: dbChurch.logo as string | undefined,
    bannerImage: dbChurch.banner_image as string | undefined,
    socialLinks: dbChurch.social_links as { facebook?: string; instagram?: string; twitter?: string; youtube?: string } | undefined,
    createdBy: dbChurch.created_by as string,
    createdAt: dbChurch.created_at as string,
    updatedAt: dbChurch.updated_at as string,
  };
}

function mapDbSettingsToSettings(dbSettings: Record<string, unknown>): ChurchSettings {
  return {
    id: dbSettings.id as string,
    churchId: dbSettings.church_id as string,
    visibility: dbSettings.visibility as "public" | "private",
    modulesEnabled: dbSettings.modules_enabled as {
      events: boolean;
      announcements: boolean;
      donations: boolean;
      media: boolean;
      ministries: boolean;
      messaging: boolean;
    },
    notificationPreferences: dbSettings.notification_preferences as {
      newMembers: boolean;
      events: boolean;
      announcements: boolean;
      donations: boolean;
    },
    updatedAt: dbSettings.updated_at as string,
  };
}

function mapDbMembershipToMembership(dbMembership: Record<string, unknown>): ChurchMembership {
  return {
    id: dbMembership.id as string,
    churchId: dbMembership.church_id as string,
    userId: dbMembership.user_id as string,
    role: dbMembership.role as ChurchRole,
    joinedAt: dbMembership.joined_at as string,
    isActive: dbMembership.is_active as boolean,
  };
}

export async function createChurch(
  input: CreateChurchInput,
  userId: string
): Promise<{
  church: Church;
  membership: ChurchMembership;
  settings: ChurchSettings;
}> {
  console.log('Supabase Churches: Creating church:', input.name);
  console.log('Supabase Churches: User ID:', userId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: existingChurches, error: fetchError } = await supabase
      .from('churches')
      .select('id, name, city, state')
      .ilike('name', input.name.trim())
      .ilike('city', input.city.trim())
      .ilike('state', input.state.trim());
    
    if (fetchError) {
      console.error('Supabase Churches: Error checking duplicates:', fetchError);
      throw new Error(fetchError.message || 'Failed to check for existing churches');
    }
    
    if (existingChurches && existingChurches.length > 0) {
      console.log('Supabase Churches: Duplicate church found');
      throw new Error('A church with this name already exists in this location');
    }

    const churchId = generateId();
    const now = new Date().toISOString();
    console.log('Supabase Churches: Generated church ID:', churchId);

    const churchData = {
      id: churchId,
      name: input.name.trim(),
      denomination: input.denomination?.trim() || null,
      description: input.description.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      zip: input.zip.trim(),
      country: input.country.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      website: input.website?.trim() || null,
      logo: input.logo?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=1A7B74&color=fff&size=200`,
      banner_image: input.bannerImage?.trim() || null,
      social_links: input.socialLinks || null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    };

    console.log('Supabase Churches: Inserting church record...');
    const { data: createdChurch, error: churchError } = await supabase
      .from('churches')
      .insert(churchData)
      .select()
      .single();

    if (churchError) {
      console.error('Supabase Churches: Error creating church:', churchError);
      throw new Error(churchError.message || 'Failed to create church');
    }

    console.log('Supabase Churches: Church created:', createdChurch.id);

    const settingsId = generateId();
    const settingsData = {
      id: settingsId,
      church_id: churchId,
      visibility: 'public',
      modules_enabled: {
        events: true,
        announcements: true,
        donations: true,
        media: true,
        ministries: true,
        messaging: true,
      },
      notification_preferences: {
        newMembers: true,
        events: true,
        announcements: true,
        donations: true,
      },
      updated_at: now,
    };

    console.log('Supabase Churches: Creating settings record...');
    const { data: createdSettings, error: settingsError } = await supabase
      .from('church_settings')
      .insert(settingsData)
      .select()
      .single();

    if (settingsError) {
      console.error('Supabase Churches: Error creating settings:', settingsError);
      await supabase.from('churches').delete().eq('id', churchId);
      throw new Error(settingsError.message || 'Failed to create church settings');
    }

    console.log('Supabase Churches: Settings created:', createdSettings.id);

    const membershipId = generateId();
    const membershipData = {
      id: membershipId,
      church_id: churchId,
      user_id: userId,
      role: 'super_admin',
      joined_at: now,
      is_active: true,
    };

    console.log('Supabase Churches: Creating membership record...');
    const { data: createdMembership, error: membershipError } = await supabase
      .from('church_memberships')
      .insert(membershipData)
      .select()
      .single();

    if (membershipError) {
      console.error('Supabase Churches: Error creating membership:', membershipError);
      await supabase.from('church_settings').delete().eq('id', settingsId);
      await supabase.from('churches').delete().eq('id', churchId);
      throw new Error(membershipError.message || 'Failed to create church membership');
    }

    console.log('Supabase Churches: Membership created:', createdMembership.id);
    console.log('Supabase Churches: Church creation completed successfully');

    return {
      church: mapDbChurchToChurch(createdChurch),
      membership: mapDbMembershipToMembership(createdMembership),
      settings: mapDbSettingsToSettings(createdSettings),
    };
  } catch (error) {
    console.error('Supabase Churches: Error creating church:', error);
    throw error instanceof Error ? error : new Error('Failed to create church');
  }
}

export async function listChurches(): Promise<Church[]> {
  console.log('Supabase Churches: Listing all churches');
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: churches, error } = await supabase
      .from('churches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const errorMessage = error.message || error.code || JSON.stringify(error);
      console.error('Supabase Churches: Error listing churches:', errorMessage);
      
      // If the table doesn't exist, return empty array
      if (error.code === '42P01' || errorMessage.includes('does not exist')) {
        console.log('Supabase Churches: churches table does not exist yet');
        return [];
      }
      return [];
    }

    const { data: settings, error: settingsError } = await supabase
      .from('church_settings')
      .select('church_id, visibility');

    if (settingsError) {
      const errorMessage = settingsError.message || settingsError.code || JSON.stringify(settingsError);
      console.log('Supabase Churches: Error getting settings (non-fatal):', errorMessage);
    }

    const publicChurches = (churches || []).filter(church => {
      const churchSettings = settings?.find(s => s.church_id === church.id);
      return !churchSettings || churchSettings.visibility === 'public';
    });

    console.log('Supabase Churches: Found', publicChurches.length, 'public churches');
    return publicChurches.map(mapDbChurchToChurch);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Supabase Churches: Error listing churches:', errorMessage);
    return [];
  }
}

export async function getChurchById(churchId: string): Promise<Church | null> {
  console.log('Supabase Churches: Getting church by ID:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: church, error } = await supabase
      .from('churches')
      .select('*')
      .eq('id', churchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Supabase Churches: Church not found:', churchId);
        return null;
      }
      const errorMessage = error.message || error.code || JSON.stringify(error);
      console.error('Supabase Churches: Error getting church:', errorMessage);
      
      // If the table doesn't exist, return null
      if (error.code === '42P01' || errorMessage.includes('does not exist')) {
        console.log('Supabase Churches: churches table does not exist yet');
        return null;
      }
      return null;
    }

    console.log('Supabase Churches: Found church:', church.name);
    return mapDbChurchToChurch(church);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Supabase Churches: Error getting church:', errorMessage);
    return null;
  }
}

export async function getUserChurches(userId: string): Promise<Church[]> {
  console.log('Supabase Churches: Getting churches for user:', userId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: memberships, error: membershipError } = await supabase
      .from('church_memberships')
      .select('church_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (membershipError) {
      const errorMessage = membershipError.message || membershipError.code || JSON.stringify(membershipError);
      console.error('Supabase Churches: Error getting memberships:', errorMessage);
      
      // If the table doesn't exist, return empty array instead of failing
      if (membershipError.code === '42P01' || errorMessage.includes('does not exist')) {
        console.log('Supabase Churches: church_memberships table does not exist yet');
        return [];
      }
      return [];
    }

    if (!memberships || memberships.length === 0) {
      console.log('Supabase Churches: No memberships found for user');
      return [];
    }

    const churchIds = memberships.map(m => m.church_id);

    const { data: churches, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .in('id', churchIds);

    if (churchError) {
      console.error('Supabase Churches: Error getting churches:', churchError);
      return [];
    }

    console.log('Supabase Churches: User has', churches?.length || 0, 'churches');
    return (churches || []).map(mapDbChurchToChurch);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Supabase Churches: Error getting user churches:', errorMessage);
    return [];
  }
}

export async function getChurchMembership(churchId: string, userId: string): Promise<ChurchMembership | null> {
  console.log('Supabase Churches: Getting membership for church:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: membership, error } = await supabase
      .from('church_memberships')
      .select('*')
      .eq('church_id', churchId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      const errorMessage = error.message || error.code || JSON.stringify(error);
      console.error('Supabase Churches: Error getting membership:', errorMessage);
      
      // If the table doesn't exist, return null
      if (error.code === '42P01' || errorMessage.includes('does not exist')) {
        console.log('Supabase Churches: church_memberships table does not exist yet');
        return null;
      }
      return null;
    }

    return mapDbMembershipToMembership(membership);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Supabase Churches: Error getting membership:', errorMessage);
    return null;
  }
}

export async function getChurchSettings(churchId: string): Promise<ChurchSettings | null> {
  console.log('Supabase Churches: Getting settings for church:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: settings, error } = await supabase
      .from('church_settings')
      .select('*')
      .eq('church_id', churchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      const errorMessage = error.message || error.code || JSON.stringify(error);
      console.error('Supabase Churches: Error getting settings:', errorMessage);
      
      // If the table doesn't exist, return null
      if (error.code === '42P01' || errorMessage.includes('does not exist')) {
        console.log('Supabase Churches: church_settings table does not exist yet');
        return null;
      }
      return null;
    }

    return mapDbSettingsToSettings(settings);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Supabase Churches: Error getting settings:', errorMessage);
    return null;
  }
}

export async function updateChurchSettings(
  churchId: string, 
  updates: Partial<Omit<ChurchSettings, 'id' | 'churchId'>>
): Promise<ChurchSettings | null> {
  console.log('Supabase Churches: Updating settings for church:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.visibility !== undefined) {
      updateData.visibility = updates.visibility;
    }
    if (updates.modulesEnabled !== undefined) {
      updateData.modules_enabled = updates.modulesEnabled;
    }
    if (updates.notificationPreferences !== undefined) {
      updateData.notification_preferences = updates.notificationPreferences;
    }

    const { data: updatedSettings, error } = await supabase
      .from('church_settings')
      .update(updateData)
      .eq('church_id', churchId)
      .select()
      .single();

    if (error) {
      console.error('Supabase Churches: Error updating settings:', error);
      throw new Error(error.message || 'Failed to update settings');
    }

    console.log('Supabase Churches: Settings updated for church:', churchId);
    return mapDbSettingsToSettings(updatedSettings);
  } catch (error) {
    console.error('Supabase Churches: Error updating settings:', error);
    throw error instanceof Error ? error : new Error('Failed to update settings');
  }
}

export async function updateChurch(
  churchId: string,
  updates: Partial<Omit<Church, 'id' | 'createdBy' | 'createdAt'>>
): Promise<Church | null> {
  console.log('Supabase Churches: Updating church:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.denomination !== undefined) updateData.denomination = updates.denomination;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.zip !== undefined) updateData.zip = updates.zip;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.logo !== undefined) updateData.logo = updates.logo;
    if (updates.bannerImage !== undefined) updateData.banner_image = updates.bannerImage;
    if (updates.socialLinks !== undefined) updateData.social_links = updates.socialLinks;

    const { data: updatedChurch, error } = await supabase
      .from('churches')
      .update(updateData)
      .eq('id', churchId)
      .select()
      .single();

    if (error) {
      console.error('Supabase Churches: Error updating church:', error);
      throw new Error(error.message || 'Failed to update church');
    }

    console.log('Supabase Churches: Church updated:', churchId);
    return mapDbChurchToChurch(updatedChurch);
  } catch (error) {
    console.error('Supabase Churches: Error updating church:', error);
    throw error instanceof Error ? error : new Error('Failed to update church');
  }
}

export async function deleteChurch(churchId: string): Promise<boolean> {
  console.log('Supabase Churches: Deleting church:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { error: membershipError } = await supabase
      .from('church_memberships')
      .delete()
      .eq('church_id', churchId);

    if (membershipError) {
      console.error('Supabase Churches: Error deleting memberships:', membershipError);
    }

    const { error: settingsError } = await supabase
      .from('church_settings')
      .delete()
      .eq('church_id', churchId);

    if (settingsError) {
      console.error('Supabase Churches: Error deleting settings:', settingsError);
    }

    const { error: churchError } = await supabase
      .from('churches')
      .delete()
      .eq('id', churchId);

    if (churchError) {
      console.error('Supabase Churches: Error deleting church:', churchError);
      throw new Error(churchError.message || 'Failed to delete church');
    }

    console.log('Supabase Churches: Church deleted successfully');
    return true;
  } catch (error) {
    console.error('Supabase Churches: Error deleting church:', error);
    throw error instanceof Error ? error : new Error('Failed to delete church');
  }
}

export async function joinChurch(churchId: string, userId: string): Promise<ChurchMembership> {
  console.log('Supabase Churches: User joining church:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: existing } = await supabase
      .from('church_memberships')
      .select('*')
      .eq('church_id', churchId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      if (existing.is_active) {
        throw new Error('You are already a member of this church');
      }
      const { data: reactivated, error } = await supabase
        .from('church_memberships')
        .update({ is_active: true, joined_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to rejoin church');
      }

      return mapDbMembershipToMembership(reactivated);
    }

    const membershipId = generateId();
    const membershipData = {
      id: membershipId,
      church_id: churchId,
      user_id: userId,
      role: 'member',
      joined_at: new Date().toISOString(),
      is_active: true,
    };

    const { data: membership, error } = await supabase
      .from('church_memberships')
      .insert(membershipData)
      .select()
      .single();

    if (error) {
      console.error('Supabase Churches: Error joining church:', error);
      throw new Error(error.message || 'Failed to join church');
    }

    console.log('Supabase Churches: User joined church:', churchId);
    return mapDbMembershipToMembership(membership);
  } catch (error) {
    console.error('Supabase Churches: Error joining church:', error);
    throw error instanceof Error ? error : new Error('Failed to join church');
  }
}

export async function leaveChurch(churchId: string, userId: string): Promise<boolean> {
  console.log('Supabase Churches: User leaving church:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: membership, error: fetchError } = await supabase
      .from('church_memberships')
      .select('*')
      .eq('church_id', churchId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (fetchError || !membership) {
      throw new Error('You are not a member of this church');
    }

    if (membership.role === 'super_admin') {
      const { data: superAdmins } = await supabase
        .from('church_memberships')
        .select('id')
        .eq('church_id', churchId)
        .eq('role', 'super_admin')
        .eq('is_active', true);

      if (superAdmins && superAdmins.length <= 1) {
        throw new Error('You are the only super admin. Please promote another member before leaving.');
      }
    }

    const { error: updateError } = await supabase
      .from('church_memberships')
      .update({ is_active: false })
      .eq('id', membership.id);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to leave church');
    }

    console.log('Supabase Churches: User left church:', churchId);
    return true;
  } catch (error) {
    console.error('Supabase Churches: Error leaving church:', error);
    throw error instanceof Error ? error : new Error('Failed to leave church');
  }
}

export async function getChurchMembers(churchId: string): Promise<ChurchMembership[]> {
  console.log('Supabase Churches: Getting members for church:', churchId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: memberships, error } = await supabase
      .from('church_memberships')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true);

    if (error) {
      const errorMessage = error.message || error.code || JSON.stringify(error);
      console.error('Supabase Churches: Error getting members:', errorMessage);
      
      // If the table doesn't exist, return empty array
      if (error.code === '42P01' || errorMessage.includes('does not exist')) {
        console.log('Supabase Churches: church_memberships table does not exist yet');
        return [];
      }
      return [];
    }

    return (memberships || []).map(mapDbMembershipToMembership);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Supabase Churches: Error getting members:', errorMessage);
    return [];
  }
}

export async function updateMemberRole(
  membershipId: string,
  role: ChurchRole
): Promise<ChurchMembership | null> {
  console.log('Supabase Churches: Updating member role:', membershipId);
  
  const supabase = getSupabaseClient();
  
  try {
    const { data: updatedMembership, error } = await supabase
      .from('church_memberships')
      .update({ role })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) {
      console.error('Supabase Churches: Error updating role:', error);
      throw new Error(error.message || 'Failed to update member role');
    }

    console.log('Supabase Churches: Member role updated');
    return mapDbMembershipToMembership(updatedMembership);
  } catch (error) {
    console.error('Supabase Churches: Error updating role:', error);
    throw error instanceof Error ? error : new Error('Failed to update member role');
  }
}
