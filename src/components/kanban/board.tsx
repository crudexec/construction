'use client'

import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MoreVertical, Edit2, Trash2, ArrowLeft, ArrowRight, Settings } from 'lucide-react'
import { CardItem } from './card-item'
import { AddCardModal } from './add-card-modal'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'

interface Stage {
  id: string
  name: string
  color: string
  order: number
  cards: Card[]
}

interface Card {
  id: string
  title: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  budget?: number
  priority: string
  stageId: string
}

async function fetchStages() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/stage', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch stages')
  return response.json()
}

async function moveCard(cardId: string, stageId: string, order: number) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/card/${cardId}/move`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({ stageId, order })
  })
  if (!response.ok) throw new Error('Failed to move card')
  return response.json()
}

async function updateStage(stageId: string, name: string, color?: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/stage/${stageId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({ name, color })
  })
  if (!response.ok) throw new Error('Failed to update stage')
  return response.json()
}

async function deleteStage(stageId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/stage/${stageId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete stage')
  return response.json()
}

export function KanbanBoard() {
  const [stages, setStages] = useState<Stage[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string>('')
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const { data, isLoading } = useQuery({
    queryKey: ['stages'],
    queryFn: fetchStages,
  })

  const moveMutation = useMutation({
    mutationFn: ({ cardId, stageId, order }: { cardId: string; stageId: string; order: number }) =>
      moveCard(cardId, stageId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] })
    },
  })

  const updateStageMutation = useMutation({
    mutationFn: ({ stageId, name, color }: { stageId: string; name: string; color?: string }) =>
      updateStage(stageId, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] })
    },
  })

  const deleteStageMutation = useMutation({
    mutationFn: (stageId: string) => deleteStage(stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] })
    },
  })

  useEffect(() => {
    if (data) {
      setStages(data)
    }
  }, [data])

  // Handle scroll indicators
  const checkScrollIndicators = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftScroll(scrollLeft > 0)
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    checkScrollIndicators()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollIndicators)
      window.addEventListener('resize', checkScrollIndicators)
      return () => {
        container.removeEventListener('scroll', checkScrollIndicators)
        window.removeEventListener('resize', checkScrollIndicators)
      }
    }
  }, [stages])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        setOpenDropdownId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openDropdownId])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const newStages = [...stages]
    const sourceStage = newStages.find(s => s.id === source.droppableId)
    const destStage = newStages.find(s => s.id === destination.droppableId)
    
    if (!sourceStage || !destStage) return

    const [movedCard] = sourceStage.cards.splice(source.index, 1)
    destStage.cards.splice(destination.index, 0, { ...movedCard, stageId: destStage.id })

    setStages(newStages)

    moveMutation.mutate({
      cardId: draggableId,
      stageId: destination.droppableId,
      order: destination.index,
    })
  }

  const handleAddCard = (stageId: string) => {
    setSelectedStageId(stageId)
    setIsAddModalOpen(true)
  }

  const handleStageMenuClick = (e: React.MouseEvent, stageId: string) => {
    e.stopPropagation()
    setOpenDropdownId(openDropdownId === stageId ? null : stageId)
  }

  const handleEditStage = (stageId: string, stageName: string) => {
    const newName = prompt('Enter new stage name:', stageName)
    if (newName && newName.trim() && newName !== stageName) {
      updateStageMutation.mutate(
        { stageId, name: newName.trim() },
        {
          onSuccess: () => {
            toast.success('Stage renamed successfully!')
          },
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to rename stage')
          }
        }
      )
    }
    setOpenDropdownId(null)
  }

  const handleDeleteStage = async (stageId: string, stageName: string, cardCount: number) => {
    if (cardCount > 0) {
      toast.error('Cannot delete stage with cards. Move cards first.')
      setOpenDropdownId(null)
      return
    }
    
    const confirmed = await showConfirm(
      `Are you sure you want to delete the "${stageName}" stage?`,
      'Delete Stage'
    )
    setOpenDropdownId(null)
    
    if (confirmed) {
      deleteStageMutation.mutate(stageId, {
        onSuccess: () => {
          toast.success('Stage deleted successfully!')
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Failed to delete stage')
        }
      })
    }
  }

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -320, behavior: 'smooth' })
  }

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 320, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        {/* Left scroll indicator */}
        {showLeftScroll && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent z-10 flex items-center justify-start pl-2">
            <button
              onClick={scrollLeft}
              className="bg-white shadow-md rounded-full p-1 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        )}
        
        {/* Right scroll indicator */}
        {showRightScroll && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent z-10 flex items-center justify-end pr-2">
            <button
              onClick={scrollRight}
              className="bg-white shadow-md rounded-full p-1 hover:bg-gray-50 transition-colors"
            >
              <ArrowRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="bg-gray-100 rounded-lg p-4 min-w-[320px] flex-shrink-0"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                    <span className="text-sm text-gray-500">({stage.cards?.length || 0})</span>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => handleStageMenuClick(e, stage.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openDropdownId === stage.id && (
                      <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[160px]">
                        <button
                          onClick={() => handleEditStage(stage.id, stage.name)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Rename Stage
                        </button>
                        <button
                          onClick={() => handleDeleteStage(stage.id, stage.name, stage.cards?.length || 0)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Stage
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] ${
                      snapshot.isDraggingOver ? 'bg-gray-200 rounded' : ''
                    }`}
                  >
                    {stage.cards?.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.5 : 1,
                            }}
                          >
                            <CardItem card={card} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['stages'] })} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <button
                onClick={() => handleAddCard(stage.id)}
                className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Card
              </button>
            </div>
          ))}
          </div>
        </DragDropContext>
      </div>

      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        stageId={selectedStageId}
      />
    </>
  )
}