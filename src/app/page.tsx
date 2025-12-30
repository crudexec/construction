import Link from 'next/link'
import { 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  FolderOpen, 
  FileText,
  BarChart3,
  Clock,
  Shield,
  Zap,
  Target,
  TrendingUp,
  Gavel,
  Activity
} from 'lucide-react'
import { AnimatedBackground } from '@/components/landing/animated-background'
import { ConstructionAnimation } from '@/components/landing/construction-animation'
import { FloatingElements } from '@/components/landing/floating-elements'
import { AnimatedSection } from '@/components/landing/animated-section'

export default function HomePage() {
  const features = [
    {
      icon: Users,
      title: 'Lead Management',
      description: 'Track leads through customizable pipeline stages with our intuitive kanban board'
    },
    {
      icon: FolderOpen,
      title: 'Project Tracking',
      description: 'Manage projects from bid to completion with comprehensive task management'
    },
    {
      icon: Gavel,
      title: 'Bid Management',
      description: 'Create, track, and manage bids with detailed cost breakdowns and timelines'
    },
    {
      icon: FileText,
      title: 'Document Control',
      description: 'Centralize all project documents with secure sharing and version control'
    },
    {
      icon: BarChart3,
      title: 'Financial Insights',
      description: 'Track budgets, expenses, and profitability with real-time reporting'
    },
    {
      icon: Activity,
      title: 'Activity Tracking',
      description: 'Monitor team productivity and project progress with detailed activity logs'
    }
  ]

  const benefits = [
    {
      icon: Clock,
      title: 'Save Time',
      stat: '40%',
      description: 'Reduction in administrative tasks'
    },
    {
      icon: TrendingUp,
      title: 'Increase Revenue',
      stat: '25%',
      description: 'More projects completed on time'
    },
    {
      icon: Target,
      title: 'Improve Accuracy',
      stat: '90%',
      description: 'Fewer estimation errors'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-gray-900" />
              <span className="text-xl font-bold text-gray-900">BuildFlow CRM</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 font-medium text-sm transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Animations */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white" />
        
        {/* Animated elements - contained to hero section */}
        <AnimatedBackground />
        <FloatingElements />
        <ConstructionAnimation />
        
        {/* Hero content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Trusted by 500+ construction companies
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              The CRM built for
              <span className="text-primary-600 block sm:inline"> construction pros</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Stop juggling spreadsheets and paperwork. Manage leads, projects, and teams 
              in one powerful platform designed specifically for contractors.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/register"
                className="bg-gray-900 text-white px-8 py-4 rounded-md hover:bg-gray-800 font-medium text-base transition-all transform hover:scale-105 flex items-center justify-center group"
              >
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-md hover:border-gray-400 hover:bg-gray-50 font-medium text-base transition-all"
              >
                View Live Demo
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">No credit card required • Setup in 5 minutes</p>
          </div>
        </div>
      </section>

      {/* Stats Section - Clean, no animations */}
      <section className="border-y border-gray-200 bg-gray-50 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{benefit.stat}</div>
                <div className="text-sm text-gray-600">{benefit.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid - Clean section */}
      <section className="py-20 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to run your business
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From lead capture to project completion, we've got you covered with tools built for how contractors actually work.
            </p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <AnimatedSection key={index} animation="fade-up" delay={index * 100}>
                <div className="group hover:shadow-lg transition-all duration-300 rounded-lg p-6 bg-white/95 backdrop-blur border border-gray-200 hover:-translate-y-1">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 rounded-lg p-3 group-hover:bg-primary-100 transition-colors group-hover:scale-110 duration-300">
                    <feature.icon className="h-6 w-6 text-gray-700 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Clean section */}
      <section className="py-20 bg-gray-50 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get up and running in minutes
            </h2>
            <p className="text-lg text-gray-600">
              Our intuitive platform gets you organized fast, no training required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Import Your Data</h3>
                <p className="text-gray-600 text-sm">
                  Easily import existing leads and projects from spreadsheets or other tools.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                <ArrowRight className="h-8 w-8 text-gray-300" />
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Customize Your Workflow</h3>
                <p className="text-gray-600 text-sm">
                  Set up your pipeline stages, project templates, and team permissions.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                <ArrowRight className="h-8 w-8 text-gray-300" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Start Growing</h3>
              <p className="text-gray-600 text-sm">
                Track leads, manage projects, and watch your business thrive with better organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gray-50 rounded-2xl p-12 border border-gray-200">
            <p className="text-xl text-gray-700 italic mb-6 leading-relaxed">
              "BuildFlow transformed how we manage our construction business. We've doubled our project capacity 
              without adding admin staff. The ROI was immediate."
            </p>
            <div className="flex items-center justify-center space-x-4">
              <div className="text-left">
                <div className="font-semibold text-gray-900">Michael Rodriguez</div>
                <div className="text-sm text-gray-600">Owner, Rodriguez Construction LLC</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Badge */}
      <section className="py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Bank-level Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-transparent to-primary-600/10 animate-pulse-slow"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-500/5 to-transparent"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to streamline your construction business?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Join hundreds of contractors who've simplified their operations with BuildFlow.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="bg-white text-gray-900 px-8 py-4 rounded-md hover:bg-gray-100 font-medium text-base transition-all flex items-center justify-center group"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white px-8 py-4 rounded-md hover:bg-white/10 font-medium text-base transition-all"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Building2 className="h-6 w-6 text-gray-900" />
              <span className="text-sm font-semibold text-gray-900">BuildFlow CRM</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <Link href="#" className="hover:text-gray-900 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-gray-900 transition-colors">Terms</Link>
              <Link href="#" className="hover:text-gray-900 transition-colors">Contact</Link>
            </div>
            <div className="text-sm text-gray-500 mt-4 md:mt-0">
              © 2024 BuildFlow CRM. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}