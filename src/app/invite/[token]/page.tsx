'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { Building2, Users, CheckCircle, XCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Invite {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  expiresAt: string
  company: {
    name: string
    appName: string
  }
  invitedBy: {
    firstName: string
    lastName: string
  }
}

const passwordSchema = Yup.object().shape({
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password')
})

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState<Invite | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const token = params.token as string

  useEffect(() => {
    async function fetchInvite() {
      try {
        const response = await fetch(`/api/invite/${token}`)
        const data = await response.json()

        if (response.ok) {
          setInvite(data.invite)
        } else {
          setError(data.error || 'Invalid invitation')
        }
      } catch (error) {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchInvite()
    }
  }, [token])

  const handleAcceptInvite = async (values: { password: string; confirmPassword: string }) => {
    setAccepting(true)
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: values.password })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Account created successfully! Please sign in.')
        router.push('/login')
      } else {
        toast.error(data.error || 'Failed to accept invitation')
      }
    } catch (error) {
      toast.error('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Loader className="h-8 w-8 text-primary-600 animate-spin" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Loading invitation...
          </h2>
        </div>
      </div>
    )
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Invalid Invitation
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  const expiresAt = new Date(invite.expiresAt)
  const isExpired = expiresAt < new Date()

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Invitation Expired
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            This invitation expired on {expiresAt.toLocaleDateString()}.
            Please contact your administrator for a new invitation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Building2 className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join {invite.company.appName}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You've been invited by {invite.invitedBy.firstName} {invite.invitedBy.lastName}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Invitation Details
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p><strong>Name:</strong> {invite.firstName} {invite.lastName}</p>
                    <p><strong>Email:</strong> {invite.email}</p>
                    <p><strong>Role:</strong> {invite.role}</p>
                    <p><strong>Company:</strong> {invite.company.name}</p>
                    <p><strong>Expires:</strong> {expiresAt.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Formik
            initialValues={{
              password: '',
              confirmPassword: ''
            }}
            validationSchema={passwordSchema}
            onSubmit={handleAcceptInvite}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Create Password
                  </label>
                  <div className="mt-1">
                    <Field
                      id="password"
                      name="password"
                      type="password"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Enter your password"
                    />
                    <ErrorMessage name="password" component="p" className="mt-1 text-sm text-red-600" />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1">
                    <Field
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Confirm your password"
                    />
                    <ErrorMessage name="confirmPassword" component="p" className="mt-1 text-sm text-red-600" />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || accepting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {accepting ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Accept Invitation
                      </>
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>

          <div className="mt-6">
            <div className="text-center">
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}