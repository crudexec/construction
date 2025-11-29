'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { AlertTriangle, CheckCircle, Info, X, AlertCircle } from 'lucide-react'

interface ModalOptions {
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  showCancel?: boolean
  autoClose?: number // milliseconds
}

interface ModalContextType {
  showModal: (options: ModalOptions) => Promise<boolean>
  showAlert: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  showConfirm: (message: string, title?: string) => Promise<boolean>
  showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>
}

const ModalContext = createContext<ModalContextType | null>(null)

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

interface ModalProviderProps {
  children: ReactNode
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [modal, setModal] = useState<{
    isOpen: boolean
    options: ModalOptions
    resolve?: (value: boolean | string | null) => void
    isPrompt?: boolean
    promptValue?: string
  }>({
    isOpen: false,
    options: { message: '' }
  })

  const showModal = (options: ModalOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        options: {
          type: 'info',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: false,
          ...options
        },
        resolve
      })

      if (options.autoClose) {
        setTimeout(() => {
          closeModal(false)
        }, options.autoClose)
      }
    })
  }

  const showAlert = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    showModal({
      message,
      type,
      confirmText: 'OK',
      showCancel: false
    })
  }

  const showConfirm = (message: string, title?: string): Promise<boolean> => {
    return showModal({
      title,
      message,
      type: 'confirm',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      showCancel: true
    })
  }

  const showPrompt = (message: string, defaultValue: string = '', title?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        options: {
          title,
          message,
          type: 'info',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: true
        },
        resolve: resolve as any,
        isPrompt: true,
        promptValue: defaultValue
      })
    })
  }

  const closeModal = async (confirmed: boolean, promptValue?: string) => {
    const { resolve, onConfirm, onCancel, isPrompt } = modal

    if (confirmed && onConfirm) {
      await onConfirm()
    }
    
    if (!confirmed && onCancel) {
      onCancel()
    }

    setModal(prev => ({ ...prev, isOpen: false }))

    if (resolve) {
      if (isPrompt) {
        resolve(confirmed ? (promptValue || '') : null)
      } else {
        resolve(confirmed)
      }
    }
  }

  const getIcon = () => {
    switch (modal.options.type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      case 'confirm':
        return <AlertTriangle className="h-6 w-6 text-blue-600" />
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getColors = () => {
    switch (modal.options.type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          button: 'bg-green-600 hover:bg-green-700'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          button: 'bg-red-600 hover:bg-red-700'
        }
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const colors = getColors()

  return (
    <ModalContext.Provider value={{ showModal, showAlert, showConfirm, showPrompt }}>
      {children}
      
      {modal.isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => closeModal(false)}
            />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start">
                  <div className={`flex-shrink-0 ${colors.bg} ${colors.border} border rounded-full p-2`}>
                    {getIcon()}
                  </div>
                  <div className="ml-4 flex-1">
                    {modal.options.title && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {modal.options.title}
                      </h3>
                    )}
                    <p className="text-sm text-gray-700 mb-4">
                      {modal.options.message}
                    </p>
                    
                    {modal.isPrompt && (
                      <input
                        type="text"
                        value={modal.promptValue}
                        onChange={(e) => setModal(prev => ({ ...prev, promptValue: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 mb-4"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            closeModal(true, modal.promptValue)
                          } else if (e.key === 'Escape') {
                            closeModal(false)
                          }
                        }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => closeModal(false)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 ml-4"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  {modal.options.showCancel && (
                    <button
                      onClick={() => closeModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {modal.options.cancelText}
                    </button>
                  )}
                  <button
                    onClick={() => closeModal(true, modal.promptValue)}
                    className={`px-4 py-2 text-sm font-medium text-white ${colors.button} border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    autoFocus={!modal.isPrompt}
                  >
                    {modal.options.confirmText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}