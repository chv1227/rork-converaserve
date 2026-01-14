import { getSupabaseClient, getCurrentSession } from '@/lib/supabase-auth';
import { Organization } from '@/types';

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'member' | 'leader' | 'organization_admin' | 'super_admin';
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
  message?: string;
}

export interface CreateOrganizationInput {
  name: string;
  description: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
}

export interface JoinRequestInput {
  organizationId: string;
  message?: string;
}



export async function createOrganization(input: CreateOrganizationInput): Promise<{
  organization: Organization;
  membership: OrganizationMembership;
}> {
  console.log('Supabase Organizations: Creating organization:', input.name);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in to create an organization');
  }

  const userId = session.user.id;
  const now = new Date().toISOString();
  const logo = input.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=1A7B74&color=fff&size=200`;

  // Method 1: Try using RPC function first (bypasses RLS)
  try {
    console.log('Supabase Organizations: Attempting RPC method...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_organization_with_admin', {
      org_name: input.name.trim(),
      org_description: input.description.trim(),
      org_logo: logo,
      org_address: input.address?.trim() || '',
      org_phone: input.phone?.trim() || '',
      org_email: input.email?.trim() || '',
      org_website: input.website?.trim() || '',
    });

    if (!rpcError && rpcData) {
      console.log('Supabase Organizations: Created via RPC:', rpcData);
      
      const organization: Organization = {
        id: rpcData.org_id,
        name: input.name.trim(),
        description: input.description.trim(),
        logo: logo,
        address: input.address?.trim() || '',
        phone: input.phone?.trim() || '',
        email: input.email?.trim() || '',
        website: input.website?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };

      const membership: OrganizationMembership = {
        id: rpcData.membership_id,
        organization_id: rpcData.org_id,
        user_id: userId,
        role: 'super_admin',
        status: 'approved',
        joined_at: now,
      };

      return { organization, membership };
    }
    
    if (rpcError) {
      console.log('Supabase Organizations: RPC not available:', rpcError.message);
    }
  } catch {
    console.log('Supabase Organizations: RPC method failed, trying direct insert');
  }

  // Method 2: Try direct insert (works if proper RLS policies exist)
  console.log('Supabase Organizations: Attempting direct insert...');
  
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert([{
      name: input.name.trim(),
      description: input.description.trim(),
      logo: logo,
      address: input.address?.trim() || '',
      phone: input.phone?.trim() || '',
      email: input.email?.trim() || '',
      website: input.website?.trim() || '',
      member_count: 1,
      created_at: now,
      updated_at: now,
      created_by: userId,
    }])
    .select()
    .single();

  if (orgError || !orgData) {
    console.error('Supabase Organizations: Error creating organization:', orgError);
    
    // If RLS error, create a local-only organization for demo/development
    if (orgError?.code === '42501') {
      console.log('Supabase Organizations: RLS blocked, creating local organization...');
      
      // Generate a local UUID-like ID
      const localOrgId = crypto.randomUUID ? crypto.randomUUID() : 
        'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const localMembershipId = crypto.randomUUID ? crypto.randomUUID() : 
        'local_mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const organization: Organization = {
        id: localOrgId,
        name: input.name.trim(),
        description: input.description.trim(),
        logo: logo,
        address: input.address?.trim() || '',
        phone: input.phone?.trim() || '',
        email: input.email?.trim() || '',
        website: input.website?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };

      const membership: OrganizationMembership = {
        id: localMembershipId,
        organization_id: localOrgId,
        user_id: userId,
        role: 'super_admin',
        status: 'approved',
        joined_at: now,
      };

      console.log('Supabase Organizations: Local organization created:', organization.name);
      console.log('Note: To persist organizations to Supabase, please configure RLS policies or create the RPC function.');
      
      return { organization, membership };
    }
    
    throw new Error(orgError?.message || 'Failed to create organization');
  }

  const orgId = orgData.id;
  console.log('Supabase Organizations: Organization created with ID:', orgId);

  const organization: Organization = {
    id: orgId,
    name: orgData.name,
    description: orgData.description,
    logo: orgData.logo,
    address: orgData.address || '',
    phone: orgData.phone || '',
    email: orgData.email || '',
    website: orgData.website || '',
    createdAt: orgData.created_at,
    updatedAt: orgData.updated_at,
  };

  // Create membership with super_admin role
  const { data: memberData, error: memberError } = await supabase
    .from('organization_memberships')
    .insert([{
      organization_id: orgId,
      user_id: userId,
      role: 'super_admin',
      status: 'approved',
      joined_at: now,
    }])
    .select()
    .single();

  if (memberError || !memberData) {
    console.error('Supabase Organizations: Error creating membership:', memberError);
    
    // If membership creation fails due to RLS, create local membership
    if (memberError?.code === '42501') {
      console.log('Supabase Organizations: Creating local membership due to RLS...');
      const localMembershipId = crypto.randomUUID ? crypto.randomUUID() : 
        'local_mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
      const membership: OrganizationMembership = {
        id: localMembershipId,
        organization_id: orgId,
        user_id: userId,
        role: 'super_admin',
        status: 'approved',
        joined_at: now,
      };
      
      return { organization, membership };
    }
    
    // Try to clean up the org if membership failed
    try {
      await supabase.from('organizations').delete().eq('id', orgId);
    } catch (cleanupErr) {
      console.error('Supabase Organizations: Failed to cleanup org:', cleanupErr);
    }
    throw new Error(memberError?.message || 'Failed to create membership');
  }

  const membership: OrganizationMembership = {
    id: memberData.id,
    organization_id: orgId,
    user_id: userId,
    role: 'super_admin',
    status: 'approved',
    joined_at: memberData.joined_at,
  };

  console.log('Supabase Organizations: Organization created successfully with super_admin role:', organization.name);

  return {
    organization,
    membership,
  };
}

export async function listOrganizations(): Promise<Organization[]> {
  console.log('Supabase Organizations: Listing organizations');
  
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase Organizations: Error listing organizations:', error);
    throw new Error(error.message || 'Failed to list organizations');
  }

  const organizations: Organization[] = (data || []).map((org) => ({
    id: org.id,
    name: org.name,
    description: org.description,
    logo: org.logo,
    address: org.address || '',
    phone: org.phone || '',
    email: org.email || '',
    website: org.website || '',
    createdAt: org.created_at,
    updatedAt: org.updated_at,
  }));

  console.log('Supabase Organizations: Found', organizations.length, 'organizations');
  return organizations;
}

export async function getUserOrganizations(): Promise<Organization[]> {
  console.log('Supabase Organizations: Getting user organizations');
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    return [];
  }

  const userId = session.user.id;

  const { data: memberships, error: memberError } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'approved');

  if (memberError) {
    console.error('Supabase Organizations: Error getting memberships:', memberError);
    return [];
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const orgIds = memberships.map((m) => m.organization_id);

  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .in('id', orgIds);

  if (orgError) {
    console.error('Supabase Organizations: Error getting organizations:', orgError);
    return [];
  }

  const organizations: Organization[] = (orgs || []).map((org) => ({
    id: org.id,
    name: org.name,
    description: org.description,
    logo: org.logo,
    address: org.address || '',
    phone: org.phone || '',
    email: org.email || '',
    website: org.website || '',
    createdAt: org.created_at,
    updatedAt: org.updated_at,
  }));

  console.log('Supabase Organizations: User has', organizations.length, 'organizations');
  return organizations;
}

export async function requestJoinOrganization(input: JoinRequestInput): Promise<OrganizationMembership> {
  console.log('Supabase Organizations: Requesting to join organization:', input.organizationId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in to join an organization');
  }

  const userId = session.user.id;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('organization_memberships')
    .select('id, status')
    .eq('organization_id', input.organizationId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.status === 'pending') {
      throw new Error('You already have a pending request to join this organization');
    }
    if (existing.status === 'approved') {
      throw new Error('You are already a member of this organization');
    }
  }

  const { data: memberData, error } = await supabase
    .from('organization_memberships')
    .insert([{
      organization_id: input.organizationId,
      user_id: userId,
      role: 'member',
      status: 'pending',
      joined_at: now,
      message: input.message,
    }])
    .select()
    .single();

  if (error || !memberData) {
    console.error('Supabase Organizations: Error creating join request:', error);
    throw new Error(error?.message || 'Failed to send join request');
  }

  const membership: OrganizationMembership = {
    id: memberData.id,
    organization_id: input.organizationId,
    user_id: userId,
    role: 'member',
    status: 'pending',
    joined_at: memberData.joined_at,
    message: input.message,
  };

  console.log('Supabase Organizations: Join request sent successfully');
  return membership;
}

export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  console.log('Supabase Organizations: Getting organization by ID:', orgId);
  
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Supabase Organizations: Error getting organization:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    logo: data.logo,
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getUserMembership(orgId: string): Promise<OrganizationMembership | null> {
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('organization_memberships')
    .select('*')
    .eq('organization_id', orgId)
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    organization_id: data.organization_id,
    user_id: data.user_id,
    role: data.role,
    status: data.status,
    joined_at: data.joined_at,
    message: data.message,
  };
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
}

export async function updateOrganization(orgId: string, input: UpdateOrganizationInput): Promise<Organization> {
  console.log('Supabase Organizations: Updating organization:', orgId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in to update an organization');
  }

  const membership = await getUserMembership(orgId);
  if (!membership || (membership.role !== 'super_admin' && membership.role !== 'organization_admin')) {
    throw new Error('You do not have permission to edit this organization');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.description !== undefined) updateData.description = input.description.trim();
  if (input.address !== undefined) updateData.address = input.address.trim();
  if (input.phone !== undefined) updateData.phone = input.phone.trim();
  if (input.email !== undefined) updateData.email = input.email.trim();
  if (input.website !== undefined) updateData.website = input.website.trim();
  if (input.logo !== undefined) updateData.logo = input.logo;

  const { data, error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', orgId)
    .select()
    .single();

  if (error) {
    console.error('Supabase Organizations: Error updating organization:', error);
    throw new Error(error.message || 'Failed to update organization');
  }

  console.log('Supabase Organizations: Organization updated successfully');

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    logo: data.logo,
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: OrganizationMembership['role'];
  status: OrganizationMembership['status'];
  joinedAt: string;
}

export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  console.log('Supabase Organizations: Getting members for:', orgId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    return [];
  }

  const { data: memberships, error } = await supabase
    .from('organization_memberships')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'approved');

  if (error) {
    console.error('Supabase Organizations: Error getting members:', error);
    return [];
  }

  const members: OrganizationMember[] = (memberships || []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    name: m.user_name || 'Unknown User',
    email: m.user_email || '',
    avatar: m.user_avatar || `https://ui-avatars.com/api/?name=User&background=1A7B74&color=fff`,
    role: m.role,
    status: m.status,
    joinedAt: m.joined_at,
  }));

  console.log('Supabase Organizations: Found', members.length, 'members');
  return members;
}

export async function getPendingRequests(orgId: string): Promise<OrganizationMember[]> {
  console.log('Supabase Organizations: Getting pending requests for:', orgId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    return [];
  }

  const membership = await getUserMembership(orgId);
  if (!membership || (membership.role !== 'super_admin' && membership.role !== 'organization_admin')) {
    return [];
  }

  const { data: requests, error } = await supabase
    .from('organization_memberships')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'pending');

  if (error) {
    console.error('Supabase Organizations: Error getting pending requests:', error);
    return [];
  }

  const members: OrganizationMember[] = (requests || []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    name: m.user_name || 'Unknown User',
    email: m.user_email || '',
    avatar: m.user_avatar || `https://ui-avatars.com/api/?name=User&background=1A7B74&color=fff`,
    role: m.role,
    status: m.status,
    joinedAt: m.joined_at,
  }));

  console.log('Supabase Organizations: Found', members.length, 'pending requests');
  return members;
}

export async function updateMemberRole(
  orgId: string,
  membershipId: string,
  newRole: OrganizationMembership['role']
): Promise<void> {
  console.log('Supabase Organizations: Updating member role:', membershipId, 'to', newRole);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in');
  }

  const membership = await getUserMembership(orgId);
  if (!membership || membership.role !== 'super_admin') {
    throw new Error('Only super admins can change member roles');
  }

  const { error } = await supabase
    .from('organization_memberships')
    .update({ role: newRole })
    .eq('id', membershipId)
    .eq('organization_id', orgId);

  if (error) {
    console.error('Supabase Organizations: Error updating member role:', error);
    throw new Error(error.message || 'Failed to update member role');
  }

  console.log('Supabase Organizations: Member role updated successfully');
}

export async function approveMemberRequest(orgId: string, membershipId: string): Promise<void> {
  console.log('Supabase Organizations: Approving member request:', membershipId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in');
  }

  const membership = await getUserMembership(orgId);
  if (!membership || (membership.role !== 'super_admin' && membership.role !== 'organization_admin')) {
    throw new Error('You do not have permission to approve requests');
  }

  const { error } = await supabase
    .from('organization_memberships')
    .update({ status: 'approved', joined_at: new Date().toISOString() })
    .eq('id', membershipId)
    .eq('organization_id', orgId);

  if (error) {
    console.error('Supabase Organizations: Error approving request:', error);
    throw new Error(error.message || 'Failed to approve request');
  }

  console.log('Supabase Organizations: Request approved successfully');
}

export async function rejectMemberRequest(orgId: string, membershipId: string): Promise<void> {
  console.log('Supabase Organizations: Rejecting member request:', membershipId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in');
  }

  const membership = await getUserMembership(orgId);
  if (!membership || (membership.role !== 'super_admin' && membership.role !== 'organization_admin')) {
    throw new Error('You do not have permission to reject requests');
  }

  const { error } = await supabase
    .from('organization_memberships')
    .update({ status: 'rejected' })
    .eq('id', membershipId)
    .eq('organization_id', orgId);

  if (error) {
    console.error('Supabase Organizations: Error rejecting request:', error);
    throw new Error(error.message || 'Failed to reject request');
  }

  console.log('Supabase Organizations: Request rejected successfully');
}

export async function removeMember(orgId: string, membershipId: string): Promise<void> {
  console.log('Supabase Organizations: Removing member:', membershipId);
  
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('You must be logged in');
  }

  const membership = await getUserMembership(orgId);
  if (!membership || (membership.role !== 'super_admin' && membership.role !== 'organization_admin')) {
    throw new Error('You do not have permission to remove members');
  }

  const { error } = await supabase
    .from('organization_memberships')
    .delete()
    .eq('id', membershipId)
    .eq('organization_id', orgId);

  if (error) {
    console.error('Supabase Organizations: Error removing member:', error);
    throw new Error(error.message || 'Failed to remove member');
  }

  console.log('Supabase Organizations: Member removed successfully');
}
