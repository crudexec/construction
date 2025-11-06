'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MoreVertical } from 'lucide-react'
import { CardItem } from './card-item'
import { AddCardModal } from './add-card-modal'
import toast from 'react-hot-toast'

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

export function KanbanBoard() {
  const [stages, setStages] = useState<Stage[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string>('')
  const queryClient = useQueryClient()

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

  useEffect(() => {
    if (data) {
      setStages(data)
    }
  }, [data])

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
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
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </button>
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
                            <CardItem card={card} />
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

      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        stageId={selectedStageId}
      />
    </>
  )
}