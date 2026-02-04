'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, Building2, Users, Settings } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  const steps = [
    {
      id: 1,
      title: 'Welcome to BuildFlo',
      description: 'Your company has been set up with default pipeline stages.',
      icon: Building2,
      content: (
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            We've created your company profile and set up a basic lead pipeline with 6 stages:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won'].map((stage, index) => (
              <div key={stage} className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full bg-blue-${500 + index * 100}`} />
                  <span className="text-sm font-medium">{stage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Customize Your Pipeline',
      description: 'You can modify stages, colors, and workflow to match your business.',
      icon: Settings,
      content: (
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Your pipeline is ready to use, but you can customize it anytime:
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-left">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Add or remove stages</span>
            </div>
            <div className="flex items-center space-x-3 text-left">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Change stage colors and names</span>
            </div>
            <div className="flex items-center space-x-3 text-left">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Set up automation rules</span>
            </div>
            <div className="flex items-center space-x-3 text-left">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Invite team members</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Start Managing Leads',
      description: 'You\'re all set! Let\'s start adding leads to your pipeline.',
      icon: Users,
      content: (
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Everything is ready for you to start managing your construction projects:
          </p>
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-blue-800 font-medium">
              Click "Add Card" on any stage to create your first lead!
            </p>
          </div>
        </div>
      )
    }
  ]

  const currentStepData = steps.find(step => step.id === currentStep)

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push('/dashboard')
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Progress Bar */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.id <= currentStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.id < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step.id < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStepData && (
            <>
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <currentStepData.icon className="h-12 w-12 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentStepData.title}
                </h1>
                <p className="text-gray-600">
                  {currentStepData.description}
                </p>
              </div>

              <div className="mb-8">
                {currentStepData.content}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleSkip}
                  className="text-gray-500 hover:text-gray-700 font-medium"
                >
                  Skip Setup
                </button>
                <button
                  onClick={handleNext}
                  className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center"
                >
                  {currentStep === steps.length ? 'Get Started' : 'Next'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}