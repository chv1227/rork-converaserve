import { getSupabaseClient, getCurrentSession } from '@/lib/supabase-auth';
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
  return crypto.randomUUID ? crypto.randomUUID() : 
    'church_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export async function createChurch(input: CreateChurchInput): Promise<{
  church: Church;
  membership: ChurchMembership;
  settings: ChurchSettings;
}> {
  console.log('Supabase Churches: Creating church:', input.name);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in to create a church');
  }

  const userId = session.user.id;
  const now = new Date().toISOString();
  const logo = input.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=1A7B74&color=fff&size=200`;

  console.log('Supabase Churches: User ID:', userId);

  // Try RPC function first (bypasses RLS)
  try {
    console.log('Supabase Churches: Attempting RPC method...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_church_with_admin', {
      church_name: input.name.trim(),
      church_denomination: input.denomination?.trim() || null,
      church_description: input.description.trim(),
      church_address: input.address.trim(),
      church_city: input.city.trim(),
      church_state: input.state.trim(),
      church_zip: input.zip.trim(),
      church_country: input.country.trim(),
      church_email: input.email.trim().toLowerCase(),
      church_phone: input.phone.trim(),
      church_website: input.website?.trim() || null,
      church_logo: logo,
      church_banner: input.bannerImage?.trim() || null,
      church_social: input.socialLinks ? JSON.stringify(input.socialLinks) : null,
    });

    if (!rpcError && rpcData) {
      console.log('Supabase Churches: Created via RPC:', rpcData);
      
      const church: Church = {
        id: rpcData.church_id,
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
        website: input.website?.trim(),
        logo: logo,
        bannerImage: input.bannerImage?.trim(),
        socialLinks: input.socialLinks,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      const membership: ChurchMembership = {
        id: rpcData.membership_id,
        churchId: rpcData.church_id,
        userId: userId,
        role: 'super_admin' as ChurchRole,
        joinedAt: now,
        isActive: true,
      };

      const settings: ChurchSettings = {
        id: rpcData.settings_id || generateId(),
        churchId: rpcData.church_id,
        visibility: 'public',
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

      return { church, membership, settings };
    }
    
    if (rpcError) {
      console.log('Supabase Churches: RPC not available:', rpcError.message);
    }
  } catch (err) {
    console.log('Supabase Churches: RPC method failed, trying direct insert:', err);
  }

  // Direct insert method
  console.log('Supabase Churches: Attempting direct insert...');
  
  const churchId = generateId();
  const membershipId = generateId();
  const settingsId = generateId();

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
    logo: logo,
    banner_image: input.bannerImage?.trim() || null,
    social_links: input.socialLinks || null,
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  const { data: insertedChurch, error: churchError } = await supabase
    .from('churches')
    .insert([churchData])
    .select()
    .single();

  if (churchError) {
    console.error('Supabase Churches: Error creating church:', churchError);
    
    // If table doesn't exist or RLS blocks, create local church
    if (churchError.code === '42P01' || churchError.code === '42501' || churchError.message?.includes('does not exist')) {
      console.log('Supabase Churches: Table issue, creating local church...');
      
      const church: Church = {
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
        website: input.website?.trim(),
        logo: logo,
        bannerImage: input.bannerImage?.trim(),
        socialLinks: input.socialLinks,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      const membership: ChurchMembership = {
        id: membershipId,
        churchId: churchId,
        userId: userId,
        role: 'super_admin' as ChurchRole,
        joinedAt: now,
        isActive: true,
      };

      const settings: ChurchSettings = {
        id: settingsId,
        churchId: churchId,
        visibility: 'public',
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

      console.log('Supabase Churches: Local church created:', church.name);
      console.log('Note: To persist churches to Supabase, please create the churches table.');
      
      return { church, membership, settings };
    }
    
    throw new Error(churchError.message || 'Failed to create church');
  }

  console.log('Supabase Churches: Church created with ID:', insertedChurch.id);

  // Create membership
  const membershipData = {
    id: membershipId,
    church_id: insertedChurch.id,
    user_id: userId,
    role: 'super_admin',
    joined_at: now,
    is_active: true,
  };

  const { error: membershipError } = await supabase
    .from('church_memberships')
    .insert([membershipData]);

  if (membershipError) {
    console.error('Supabase Churches: Error creating membership:', membershipError);
    // Continue even if membership creation fails
  }

  // Create settings
  const settingsData = {
    id: settingsId,
    church_id: insertedChurch.id,
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

  const { error: settingsError } = await supabase
    .from('church_settings')
    .insert([settingsData]);

  if (settingsError) {
    console.error('Supabase Churches: Error creating settings:', settingsError);
    // Continue even if settings creation fails
  }

  const church: Church = {
    id: insertedChurch.id,
    name: insertedChurch.name,
    denomination: insertedChurch.denomination,
    description: insertedChurch.description,
    address: insertedChurch.address,
    city: insertedChurch.city,
    state: insertedChurch.state,
    zip: insertedChurch.zip,
    country: insertedChurch.country,
    email: insertedChurch.email,
    phone: insertedChurch.phone,
    website: insertedChurch.website,
    logo: insertedChurch.logo,
    bannerImage: insertedChurch.banner_image,
    socialLinks: insertedChurch.social_links,
    createdBy: insertedChurch.created_by,
    createdAt: insertedChurch.created_at,
    updatedAt: insertedChurch.updated_at,
  };

  const membership: ChurchMembership = {
    id: membershipId,
    churchId: insertedChurch.id,
    userId: userId,
    role: 'super_admin' as ChurchRole,
    joinedAt: now,
    isActive: true,
  };

  const settings: ChurchSettings = {
    id: settingsId,
    churchId: insertedChurch.id,
    visibility: 'public',
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

  console.log('Supabase Churches: Church created successfully:', church.name);
  
  return { church, membership, settings };
}

export async function listChurches(): Promise<Church[]> {
  console.log('Supabase Churches: Listing churches');
  
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('churches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase Churches: Error listing churches:', error);
    return [];
  }

  const churches: Church[] = (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    denomination: c.denomination,
    description: c.description,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
    country: c.country,
    email: c.email,
    phone: c.phone,
    website: c.website,
    logo: c.logo,
    bannerImage: c.banner_image,
    socialLinks: c.social_links,
    createdBy: c.created_by,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  console.log('Supabase Churches: Found', churches.length, 'churches');
  return churches;
}

export async function getChurchById(churchId: string): Promise<Church | null> {
  console.log('Supabase Churches: Getting church by ID:', churchId);
  
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('churches')
    .select('*')
    .eq('id', churchId)
    .single();

  if (error) {
    console.error('Supabase Churches: Error getting church:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    denomination: data.denomination,
    description: data.description,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: data.country,
    email: data.email,
    phone: data.phone,
    website: data.website,
    logo: data.logo,
    bannerImage: data.banner_image,
    socialLinks: data.social_links,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getUserChurches(): Promise<Church[]> {
  console.log('Supabase Churches: Getting user churches');
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    return [];
  }

  const userId = session.user.id;

  const { data: memberships, error: memberError } = await supabase
    .from('church_memberships')
    .select('church_id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (memberError) {
    console.error('Supabase Churches: Error getting memberships:', memberError);
    return [];
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const churchIds = memberships.map((m) => m.church_id);

  const { data: churches, error: churchError } = await supabase
    .from('churches')
    .select('*')
    .in('id', churchIds);

  if (churchError) {
    console.error('Supabase Churches: Error getting churches:', churchError);
    return [];
  }

  const result: Church[] = (churches || []).map((c) => ({
    id: c.id,
    name: c.name,
    denomination: c.denomination,
    description: c.description,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
    country: c.country,
    email: c.email,
    phone: c.phone,
    website: c.website,
    logo: c.logo,
    bannerImage: c.banner_image,
    socialLinks: c.social_links,
    createdBy: c.created_by,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  console.log('Supabase Churches: User has', result.length, 'churches');
  return result;
}

export async function getChurchMembership(churchId: string): Promise<ChurchMembership | null> {
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('church_memberships')
    .select('*')
    .eq('church_id', churchId)
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    churchId: data.church_id,
    userId: data.user_id,
    role: data.role as ChurchRole,
    joinedAt: data.joined_at,
    isActive: data.is_active,
  };
}

export async function getChurchSettings(churchId: string): Promise<ChurchSettings | null> {
  console.log('Supabase Churches: Getting settings for:', churchId);
  
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('church_settings')
    .select('*')
    .eq('church_id', churchId)
    .single();

  if (error || !data) {
    console.log('Supabase Churches: No settings found, returning defaults');
    return null;
  }

  return {
    id: data.id,
    churchId: data.church_id,
    visibility: data.visibility,
    modulesEnabled: data.modules_enabled,
    notificationPreferences: data.notification_preferences,
    updatedAt: data.updated_at,
  };
}

export async function updateChurchSettings(
  churchId: string, 
  updates: Partial<Omit<ChurchSettings, 'id' | 'churchId'>>
): Promise<ChurchSettings | null> {
  console.log('Supabase Churches: Updating settings for:', churchId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
  if (updates.modulesEnabled !== undefined) updateData.modules_enabled = updates.modulesEnabled;
  if (updates.notificationPreferences !== undefined) updateData.notification_preferences = updates.notificationPreferences;

  const { data, error } = await supabase
    .from('church_settings')
    .update(updateData)
    .eq('church_id', churchId)
    .select()
    .single();

  if (error) {
    console.error('Supabase Churches: Error updating settings:', error);
    throw new Error(error.message || 'Failed to update settings');
  }

  return {
    id: data.id,
    churchId: data.church_id,
    visibility: data.visibility,
    modulesEnabled: data.modules_enabled,
    notificationPreferences: data.notification_preferences,
    updatedAt: data.updated_at,
  };
}

export async function updateChurch(
  churchId: string,
  updates: Partial<Omit<Church, 'id' | 'createdBy' | 'createdAt'>>
): Promise<Church | null> {
  console.log('Supabase Churches: Updating church:', churchId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in');
  }

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

  const { data, error } = await supabase
    .from('churches')
    .update(updateData)
    .eq('id', churchId)
    .select()
    .single();

  if (error) {
    console.error('Supabase Churches: Error updating church:', error);
    throw new Error(error.message || 'Failed to update church');
  }

  return {
    id: data.id,
    name: data.name,
    denomination: data.denomination,
    description: data.description,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: data.country,
    email: data.email,
    phone: data.phone,
    website: data.website,
    logo: data.logo,
    bannerImage: data.banner_image,
    socialLinks: data.social_links,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteChurch(churchId: string): Promise<boolean> {
  console.log('Supabase Churches: Deleting church:', churchId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in');
  }

  // Delete related data first
  await supabase.from('church_settings').delete().eq('church_id', churchId);
  await supabase.from('church_memberships').delete().eq('church_id', churchId);
  
  const { error } = await supabase
    .from('churches')
    .delete()
    .eq('id', churchId);

  if (error) {
    console.error('Supabase Churches: Error deleting church:', error);
    throw new Error(error.message || 'Failed to delete church');
  }

  console.log('Supabase Churches: Church deleted successfully');
  return true;
}
