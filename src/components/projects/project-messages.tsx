'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, User, Clock } from 'lucide-react'

interface Message {
  id: string
  content: string
  isFromClient: boolean
  isInternal: boolean
  isRead: boolean
  readAt?: string
  clientName?: string
  clientEmail?: string
  senderId?: string
  createdAt: string
  sender?: {
    firstName: string
    lastName: string
    role: string
  }
}

interface ProjectMessagesProps {
  projectId: string
}

async function fetchMessages(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/project/${projectId}/messages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  
  if (!response.ok) throw new Error('Failed to fetch messages')
  return response.json()
}

async function sendMessage({ projectId, content, isInternal }: { projectId: string, content: string, isInternal: boolean }) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/project/${projectId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content, isInternal })
  })
  
  if (!response.ok) throw new Error('Failed to send message')
  return response.json()
}

export function ProjectMessages({ projectId }: ProjectMessagesProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const queryClient = useQueryClient()

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['project-messages', projectId],
    queryFn: () => fetchMessages(projectId),
    enabled: !!projectId,
    refetchInterval: 30000, // Refetch every 30 seconds for near real-time updates
  })

  // Invalidate unread count when messages are fetched (user is viewing messages)
  useEffect(() => {
    if (messagesData) {
      queryClient.invalidateQueries({ queryKey: ['unread-messages', projectId] })
    }
  }, [messagesData, queryClient, projectId])

  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['project-messages', projectId] })
      queryClient.invalidateQueries({ queryKey: ['unread-messages', projectId] })
    },
    onError: (error) => {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    }
  })

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    sendMessageMutation.mutate({
      projectId,
      content: newMessage,
      isInternal
    })
  }

  const messages = messagesData?.messages || []
  const clientMessages = messages.filter((m: Message) => !m.isInternal)
  const allMessages = messages

  return (
    <div className="space-y-6">
      {/* Toggle for Internal/Client Messages */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsInternal(false)}
              className={`px-3 py-1 text-sm rounded-md ${
                !isInternal 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Client Messages
            </button>
            <button
              onClick={() => setIsInternal(true)}
              className={`px-3 py-1 text-sm rounded-md ${
                isInternal 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Messages
            </button>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {isInternal ? 'All Messages' : 'Client Messages'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {isInternal ? 'Internal team messages and client communications' : 'Messages visible to the client'}
          </p>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : (isInternal ? allMessages : clientMessages).length > 0 ? (
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {(isInternal ? allMessages : clientMessages).map((message: Message) => (
                <div key={message.id} className={`flex ${message.senderId ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.senderId 
                      ? message.isInternal 
                        ? 'bg-yellow-100 text-yellow-900 border-l-4 border-yellow-400' 
                        : 'bg-gray-100 text-gray-900'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          {message.senderId 
                            ? `${message.sender?.firstName} ${message.sender?.lastName}`
                            : (message.clientName || 'Client')
                          }
                        </span>
                        {message.isInternal && (
                          <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
                            Internal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Message Content */}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Read Status for Client Messages */}
                    {message.isFromClient && (
                      <div className="mt-2 text-xs text-gray-500">
                        {message.isRead ? (
                          <span>✓ Read {message.readAt ? new Date(message.readAt).toLocaleString() : ''}</span>
                        ) : (
                          <span>• Unread</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 mb-6">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {isInternal ? 'No messages yet.' : 'No client messages yet.'}
              </p>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-3">
              {/* Internal Message Toggle */}
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Internal message (not visible to client)</span>
                </label>
              </div>

              {/* Message Input */}
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isInternal ? "Internal team message..." : "Message to client..."}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="h-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}