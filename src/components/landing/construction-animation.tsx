'use client'

export function ConstructionAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated Blueprint Grid */}
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-600" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating Construction Elements */}
      <div className="absolute inset-0">
        {/* Crane arm that slowly moves */}
        <div className="absolute top-20 right-10 opacity-20">
          <svg width="200" height="300" viewBox="0 0 200 300" className="animate-pulse">
            <line x1="50" y1="0" x2="50" y2="250" stroke="currentColor" strokeWidth="4" className="text-gray-700" />
            <line x1="50" y1="50" x2="180" y2="20" stroke="currentColor" strokeWidth="3" className="text-gray-700 animate-[sway_8s_ease-in-out_infinite]" />
            <line x1="180" y1="20" x2="180" y2="60" stroke="currentColor" strokeWidth="2" className="text-gray-700 animate-[sway_8s_ease-in-out_infinite]" />
          </svg>
        </div>

        {/* Building blocks that stack */}
        <div className="absolute bottom-20 left-10 opacity-30">
          <div className="space-y-1 animate-[float_10s_ease-in-out_infinite]">
            <div className="w-20 h-8 bg-primary-600"></div>
            <div className="w-20 h-8 bg-primary-500"></div>
            <div className="w-20 h-8 bg-primary-400"></div>
          </div>
        </div>

        {/* Floating blueprint squares */}
        <div className="absolute top-1/4 left-1/4 w-16 h-16 border-3 border-blue-500/40 rotate-45 animate-[float_15s_ease-in-out_infinite]"></div>
        <div className="absolute top-1/2 right-1/3 w-20 h-20 border-3 border-blue-500/30 rotate-12 animate-[float_20s_ease-in-out_infinite_reverse]"></div>
        <div className="absolute bottom-1/3 left-1/2 w-14 h-14 border-3 border-blue-500/35 -rotate-12 animate-[float_18s_ease-in-out_infinite]"></div>

        {/* Ruler marks */}
        <div className="absolute top-1/3 right-20 opacity-30">
          <div className="flex space-x-1">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`bg-primary-600 ${i % 5 === 0 ? 'h-8 w-1' : 'h-5 w-0.5'}`}></div>
            ))}
          </div>
        </div>

        {/* Hard hat icon floating */}
        <div className="absolute top-2/3 right-1/4 animate-[float_25s_ease-in-out_infinite]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-yellow-500/40">
            <path d="M12 2L4 7V12C4 16.5 6.5 20.74 12 22C17.5 20.74 20 16.5 20 12V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>

        {/* Tool icons scattered */}
        <div className="absolute bottom-1/4 right-1/2 animate-[spin_30s_linear_infinite]">
          <svg width="35" height="35" viewBox="0 0 24 24" fill="none" className="text-gray-600/30">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      {/* Animated measuring tape */}
      <div className="absolute bottom-10 left-1/3 opacity-40">
        <div className="w-32 h-1 bg-yellow-500 animate-[expand_5s_ease-in-out_infinite]"></div>
        <div className="flex justify-between text-xs text-yellow-500 mt-1 font-bold">
          <span>0</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes expand {
          0%, 100% { width: 8rem; }
          50% { width: 12rem; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}