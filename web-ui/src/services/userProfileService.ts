import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../amplify/data/resource'

const client = generateClient<Schema>({
  authMode: 'userPool'
})

export interface UserPreferences {
  adviceCategories: string[]
  communication: {
    notifications: boolean
    email_updates: boolean
    language: string
  }
}

export interface UserProfileData {
  id?: string
  userId: string
  name?: string
  email?: string
  postcode?: string
  region?: string
  localBureauId?: string
  notes?: string
  onboardingCompleted: boolean
  preferences?: UserPreferences
  createdAt?: string
  updatedAt?: string
}

export const userProfileService = {
  async createUserProfile(
    email: string,
    name: string,
    preferences: UserPreferences,
    userId?: string,
    postcode?: string,
    region?: string
  ): Promise<UserProfileData> {
    try {
      const { getCurrentUser } = await import('aws-amplify/auth')
      await getCurrentUser()
    } catch {
      throw new Error('User not authenticated. Please sign in again.')
    }

    const response = await client.models.UserProfile.create({
      userId: userId || 'current-user',
      name,
      email,
      postcode,
      region,
      onboardingCompleted: true,
      preferences: JSON.stringify(preferences)
    })

    if (response.errors && response.errors.length > 0) {
      throw new Error(`Failed to create user profile: ${response.errors[0].message}`)
    }

    const profile = response.data as any
    return {
      id: profile?.id,
      userId: profile?.userId || userId || 'current-user',
      name: profile?.name || name,
      email: profile?.email || email,
      postcode: profile?.postcode || postcode,
      region: profile?.region || region,
      onboardingCompleted: profile?.onboardingCompleted || true,
      preferences: profile?.preferences ? JSON.parse(profile.preferences) : preferences,
      createdAt: profile?.createdAt,
      updatedAt: profile?.updatedAt
    }
  },

  async getUserProfile(userId: string): Promise<UserProfileData | null> {
    const response = await client.models.UserProfile.list({
      filter: { userId: { eq: userId } }
    })

    if (response.errors && response.errors.length > 0) {
      throw new Error(`Failed to get user profile: ${response.errors[0].message}`)
    }

    const profiles = response.data || []
    if (profiles.length === 0) return null

    const profile = profiles[0]
    let parsedPreferences = undefined
    if (profile.preferences) {
      parsedPreferences = typeof profile.preferences === 'string' 
        ? JSON.parse(profile.preferences) 
        : profile.preferences
    }

    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.name || undefined,
      email: profile.email || undefined,
      postcode: profile.postcode || undefined,
      region: profile.region || undefined,
      localBureauId: profile.localBureauId || undefined,
      notes: profile.notes || undefined,
      onboardingCompleted: profile.onboardingCompleted || false,
      preferences: parsedPreferences,
      createdAt: profile.createdAt || undefined,
      updatedAt: profile.updatedAt || undefined
    }
  },

  async updateUserProfile(
    userId: string,
    updates: Partial<Omit<UserProfileData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserProfileData> {
    const existingProfile = await this.getUserProfile(userId)
    if (!existingProfile || !existingProfile.id) {
      throw new Error('Profile not found for update')
    }

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.email !== undefined) updateData.email = updates.email
    if (updates.postcode !== undefined) updateData.postcode = updates.postcode
    if (updates.region !== undefined) updateData.region = updates.region
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.onboardingCompleted !== undefined) updateData.onboardingCompleted = updates.onboardingCompleted
    if (updates.preferences !== undefined) updateData.preferences = JSON.stringify(updates.preferences)

    const response = await client.models.UserProfile.update({
      id: existingProfile.id,
      ...updateData
    })

    if (response.errors && response.errors.length > 0) {
      throw new Error(`Failed to update user profile: ${response.errors[0].message}`)
    }

    const profile = response.data as any
    return {
      id: profile?.id,
      userId: profile?.userId || userId,
      name: profile?.name || undefined,
      email: profile?.email || undefined,
      postcode: profile?.postcode || undefined,
      region: profile?.region || undefined,
      onboardingCompleted: profile?.onboardingCompleted || false,
      preferences: profile?.preferences ? JSON.parse(profile.preferences) : undefined,
      createdAt: profile?.createdAt,
      updatedAt: profile?.updatedAt
    }
  },

  async deleteUserProfile(userId: string): Promise<void> {
    const existingProfile = await this.getUserProfile(userId)
    if (!existingProfile || !existingProfile.id) return

    const response = await client.models.UserProfile.delete({ id: existingProfile.id })
    if (response.errors && response.errors.length > 0) {
      throw new Error(`Failed to delete user profile: ${response.errors[0].message}`)
    }
  }
}
