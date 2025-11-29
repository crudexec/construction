'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Users, Crown, Shield, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatar?: string
}

interface ProjectTeamModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onTeamUpdate?: () => void
}

export function ProjectTeamModal({ projectId, isOpen, onClose, onTeamUpdate }: ProjectTeamModalProps) {
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [owner, setOwner] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const { showConfirm } = useModal()

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers()
      fetchAllUsers()
    }
  }, [isOpen, projectId])

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]
  }

  const fetchTeamMembers = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const response = await fetch(`/api/project/${projectId}/team`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.assignedUsers)
        setOwner(data.owner)
      } else {
        toast.error('Failed to fetch team members')
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Failed to fetch team members')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const token = getToken()
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAllUsers(data.users)
      } else {
        toast.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    }
  }

  const addUserToTeam = async () => {
    if (!selectedUserId) return

    setAdding(true)
    try {
      const token = getToken()
      const response = await fetch(`/api/project/${projectId}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        },
        body: JSON.stringify({ userId: selectedUserId })
      })

      if (response.ok) {
        toast.success('User added to team successfully')
        setSelectedUserId('')
        fetchTeamMembers()
        onTeamUpdate?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to add user to team')
      }
    } catch (error) {
      console.error('Error adding user to team:', error)
      toast.error('Failed to add user to team')
    } finally {
      setAdding(false)
    }
  }

  const removeUserFromTeam = async (userId: string) => {
    const confirmed = await showConfirm(
      'Are you sure you want to remove this user from the project team?',
      'Remove Team Member'
    )
    if (!confirmed) {
      return
    }

    try {
      const token = getToken()
      const response = await fetch(`/api/project/${projectId}/team`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        toast.success('User removed from team successfully')
        fetchTeamMembers()
        onTeamUpdate?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove user from team')
      }
    } catch (error) {
      console.error('Error removing user from team:', error)
      toast.error('Failed to remove user from team')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'STAFF':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'SUBCONTRACTOR':
        return <User className="h-4 w-4 text-green-600" />
      case 'CLIENT':
        return <User className="h-4 w-4 text-purple-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-yellow-100 text-yellow-800'
      case 'STAFF':
        return 'bg-blue-100 text-blue-800'
      case 'SUBCONTRACTOR':
        return 'bg-green-100 text-green-800'
      case 'CLIENT':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter out users that are already on the team or are the owner
  const availableUsers = allUsers.filter(user => 
    !teamMembers.some(member => member.id === user.id) &&
    user.id !== owner?.id
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Manage Project Team</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Add New Team Member */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Add Team Member</h4>
                  <div className="flex space-x-3">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                      disabled={adding}
                    >
                      <option value="">Select a user...</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email}) - {user.role}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addUserToTeam}
                      disabled={!selectedUserId || adding}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {adding ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      <span>Add</span>
                    </button>
                  </div>
                  {availableUsers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">All users in your company are already on the team or there are no other users.</p>
                  )}
                </div>

                {/* Project Owner */}
                {owner && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Project Owner</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-yellow-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {owner.firstName[0]}{owner.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {owner.firstName} {owner.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{owner.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(owner.role)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(owner.role)}`}>
                            {owner.role}
                          </span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            OWNER
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Team Members ({teamMembers.length})
                  </h4>
                  {teamMembers.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No team members assigned yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {member.firstName[0]}{member.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(member.role)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                              {member.role}
                            </span>
                            <button
                              onClick={() => removeUserFromTeam(member.id)}
                              className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                              title="Remove from team"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}