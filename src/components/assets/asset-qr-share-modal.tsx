'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer, Copy, Link2Off } from 'lucide-react'
import toast from 'react-hot-toast'

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

interface Props {
  assetId: string
  assetName: string
  isShareable: boolean
  shareToken: string | null
  onClose: () => void
}

export function AssetQrShareModal({ assetId, assetName, isShareable, shareToken, onClose }: Props) {
  const queryClient = useQueryClient()
  const [localShareable, setLocalShareable] = useState(isShareable)
  const [localToken, setLocalToken] = useState(shareToken)

  const shareUrl = localToken ? `${window.location.origin}/shared/asset/${localToken}` : null

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/assets/${assetId}/share`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to generate share link')
      return result
    },
    onSuccess: (data) => {
      setLocalToken(data.shareToken)
      setLocalShareable(true)
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      toast.success('QR code generated')
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/assets/${assetId}/share`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to disable sharing')
      return result
    },
    onSuccess: () => {
      setLocalShareable(false)
      setLocalToken(null)
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      toast.success('Sharing disabled')
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const handleCopy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied')
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
        <div className="px-6 py-4 border-b flex justify-between items-center print:hidden">
          <h3 className="text-lg font-medium text-gray-900">Issue Log QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-center" id="asset-qr-print-area">
          <p className="font-medium text-gray-900">{assetName}</p>
          <p className="text-xs text-gray-500 print:hidden">
            Scanning this code opens a public page (no login required) to view this asset's issue log and report a new issue.
          </p>

          {localShareable && shareUrl ? (
            <>
              <div className="flex justify-center py-2">
                <QRCodeSVG value={shareUrl} size={200} />
              </div>
              <p className="text-xs text-gray-400 break-all print:hidden">{shareUrl}</p>
            </>
          ) : (
            <div className="py-8 text-gray-400 text-sm print:hidden">No active QR code for this asset yet</div>
          )}

          <div className="flex flex-col gap-2 print:hidden">
            {!localShareable ? (
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate QR Code'}
              </button>
            ) : (
              <>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                  <button onClick={handleCopy} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2">
                    <Copy className="h-4 w-4" /> Copy Link
                  </button>
                </div>
                <button
                  onClick={() => revokeMutation.mutate()}
                  disabled={revokeMutation.isPending}
                  className="w-full text-red-600 px-4 py-2 rounded-md hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Link2Off className="h-4 w-4" /> {revokeMutation.isPending ? 'Disabling...' : 'Disable Sharing'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
