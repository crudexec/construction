'use client'

export function FloatingElements() {
  return (
    <>
      {/* Floating geometric shapes - construction themed */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
        {/* Large blueprint square - top left */}
        <div className="absolute top-10 left-5 w-40 h-40 opacity-20">
          <div className="w-full h-full border-4 border-primary-500 rotate-12 animate-float-slow bg-primary-500/5"></div>
        </div>

        {/* Medium triangle - top right */}
        <div className="absolute top-20 right-10 w-32 h-32 opacity-25">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-slow">
            <polygon points="50,10 90,90 10,90" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="3" className="text-primary-600"/>
          </svg>
        </div>

        {/* Construction grid pattern - middle left */}
        <div className="absolute top-1/3 left-0 w-48 h-48 opacity-15 -translate-y-1/2">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full -rotate-45 animate-pulse-slow">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="border-2 border-primary-400 bg-primary-400/10"></div>
            ))}
          </div>
        </div>

        {/* Hexagon - bottom right */}
        <div className="absolute bottom-10 right-5 w-36 h-36 opacity-30">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-float">
            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="3" className="text-primary-500"/>
          </svg>
        </div>

        {/* Circle with cross - construction target - bottom left */}
        <div className="absolute bottom-20 left-10 w-28 h-28 opacity-25">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-bounce-slow">
            <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="3" className="text-yellow-500"/>
            <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="2" className="text-yellow-500"/>
            <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="2" className="text-yellow-500"/>
          </svg>
        </div>

        {/* Small dots scattered around */}
        <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-primary-400/50 rounded-full animate-pulse shadow-lg shadow-primary-400/30"></div>
        <div className="absolute top-2/3 left-1/3 w-5 h-5 bg-yellow-400/40 rounded-full animate-pulse-slow shadow-lg shadow-yellow-400/30"></div>
        <div className="absolute bottom-1/2 right-1/2 w-3 h-3 bg-primary-500/50 rounded-full animate-bounce-slow shadow-lg shadow-primary-500/30"></div>
        <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-blue-400/40 rounded-full animate-float shadow-lg shadow-blue-400/30"></div>
        
        {/* Construction beam lines */}
        <div className="absolute top-1/4 left-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary-500/40 to-transparent -rotate-45 animate-pulse-slow"></div>
        <div className="absolute bottom-1/3 right-1/3 w-36 h-1 bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent rotate-12 animate-pulse"></div>
        <div className="absolute top-3/4 left-1/3 w-40 h-1 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent rotate-45 animate-float-slow"></div>
      </div>
    </>
  )
}