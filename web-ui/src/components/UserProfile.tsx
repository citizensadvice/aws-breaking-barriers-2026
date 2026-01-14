import { useState, useEffect } from 'react'
import { userProfileService, UserProfileData } from '../services/userProfileService'

interface UserProfileProps {
  user: { username: string; email?: string; userId: string; name?: string }
  isOpen: boolean
  onClose: () => void
}

const UserProfile = ({ user, isOpen, onClose }: UserProfileProps) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({ name: '', postcode: '', region: '' })

  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen, user.userId])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const data = await userProfileService.getUserProfile(user.userId)
      setProfile(data)
      if (data) {
        setFormData({ name: data.name || '', postcode: data.postcode || '', region: data.region || '' })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await userProfileService.updateUserProfile(user.userId, {
        name: formData.name,
        postcode: formData.postcode,
        region: formData.region
      })
      await loadProfile()
      setEditMode(false)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#004b87]">Your Profile</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">{profile?.name || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{profile?.email || user.email || 'Not set'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., SW1A 1AA"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">{profile?.postcode || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                {editMode ? (
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select region</option>
                    <option value="England - London">England - London</option>
                    <option value="England - South East">England - South East</option>
                    <option value="England - South West">England - South West</option>
                    <option value="Scotland">Scotland</option>
                    <option value="Wales">Wales</option>
                    <option value="Northern Ireland">Northern Ireland</option>
                  </select>
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">{profile?.region || 'Not set'}</p>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                {editMode ? (
                  <>
                    <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-gray-300 rounded-lg">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-[#004b87] text-white rounded-lg disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(true)} className="w-full py-2 bg-[#004b87] text-white rounded-lg">Edit Profile</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile
