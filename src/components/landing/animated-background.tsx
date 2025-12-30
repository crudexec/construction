'use client'

import { useEffect, useRef } from 'react'

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Construction-themed particles: dots, lines, and shapes
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      type: 'dot' | 'line' | 'square' | 'triangle'
      rotation: number
      rotationSpeed: number

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 5 + 2
        this.speedX = (Math.random() - 0.5) * 1.5
        this.speedY = (Math.random() - 0.5) * 1.5
        this.opacity = Math.random() * 0.6 + 0.3
        this.type = ['dot', 'line', 'square', 'triangle'][Math.floor(Math.random() * 4)] as any
        this.rotation = Math.random() * Math.PI * 2
        this.rotationSpeed = (Math.random() - 0.5) * 0.02
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.rotation += this.rotationSpeed

        // Wrap around screen
        if (this.x > canvas.width + 50) this.x = -50
        if (this.x < -50) this.x = canvas.width + 50
        if (this.y > canvas.height + 50) this.y = -50
        if (this.y < -50) this.y = canvas.height + 50
      }

      draw() {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rotation)
        ctx.fillStyle = `rgba(59, 130, 246, ${this.opacity})`
        ctx.strokeStyle = `rgba(59, 130, 246, ${this.opacity})`
        ctx.lineWidth = 2

        switch (this.type) {
          case 'dot':
            ctx.beginPath()
            ctx.arc(0, 0, this.size, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'line':
            ctx.beginPath()
            ctx.moveTo(-this.size * 3, 0)
            ctx.lineTo(this.size * 3, 0)
            ctx.stroke()
            break
          case 'square':
            ctx.strokeRect(-this.size, -this.size, this.size * 2, this.size * 2)
            break
          case 'triangle':
            ctx.beginPath()
            ctx.moveTo(0, -this.size)
            ctx.lineTo(this.size, this.size)
            ctx.lineTo(-this.size, this.size)
            ctx.closePath()
            ctx.stroke()
            break
        }
        ctx.restore()
      }
    }

    // Blueprint grid lines
    class GridLine {
      startX: number
      startY: number
      endX: number
      endY: number
      opacity: number
      appearing: boolean

      constructor() {
        const isHorizontal = Math.random() > 0.5
        if (isHorizontal) {
          this.startX = 0
          this.endX = canvas.width
          this.startY = this.endY = Math.random() * canvas.height
        } else {
          this.startY = 0
          this.endY = canvas.height
          this.startX = this.endX = Math.random() * canvas.width
        }
        this.opacity = 0
        this.appearing = true
      }

      update() {
        if (this.appearing) {
          this.opacity += 0.01
          if (this.opacity >= 0.3) {
            this.appearing = false
          }
        } else {
          this.opacity -= 0.005
        }
      }

      draw() {
        if (this.opacity <= 0) return
        ctx.strokeStyle = `rgba(37, 99, 235, ${this.opacity})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(this.startX, this.startY)
        ctx.lineTo(this.endX, this.endY)
        ctx.stroke()
      }
    }

    const particles: Particle[] = []
    const gridLines: GridLine[] = []
    const particleCount = 50

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Randomly add grid lines
      if (Math.random() < 0.05 && gridLines.length < 20) {
        gridLines.push(new GridLine())
      }

      // Update and draw grid lines
      gridLines.forEach((line, index) => {
        line.update()
        line.draw()
        if (line.opacity <= 0) {
          gridLines.splice(index, 1)
        }
      })

      // Update and draw particles
      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })

      // Draw connections between nearby particles
      particles.forEach((particle, i) => {
        particles.slice(i + 1).forEach(otherParticle => {
          const distance = Math.sqrt(
            Math.pow(particle.x - otherParticle.x, 2) +
            Math.pow(particle.y - otherParticle.y, 2)
          )
          if (distance < 200) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 * (1 - distance / 200)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.stroke()
          }
        })
      })

      requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-70"
      style={{ zIndex: 0 }}
    />
  )
}