export const statuses = ['TODO', 'IN_PROGRESS', 'DONE'] as const
export type FeedbackStatus = typeof statuses[number]
export const statusLabels: Record<FeedbackStatus, string> = { TODO: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done' }
export interface FeedbackCard {
  id: string
  title: string
  status: FeedbackStatus
  version: number
  pagePath: string | null
  createdById: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
  company: { name: string }
  messageCount: number
  preview: string
}
export interface FeedbackMessage {
  id: string
  authorId: string | null
  authorName: string
  fromTeam: boolean
  body: string
  kind: string
  createdAt: string
}
export interface FeedbackList { items: FeedbackCard[]; total: number; nextCursor: string | null }
export interface FeedbackThread { request: FeedbackCard; messages: FeedbackMessage[]; nextCursor: string | null; canManage: boolean }
