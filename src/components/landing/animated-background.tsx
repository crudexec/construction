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

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth
        this.y = Math.random() * canvasHeight
        this.size = Math.random() * 5 + 2
        this.speedX = (Math.random() - 0.5) * 1.5
        this.speedY = (Math.random() - 0.5) * 1.5
        this.opacity = Math.random() * 0.6 + 0.3
        this.type = ['dot', 'line', 'square', 'triangle'][Math.floor(Math.random() * 4)] as any
        this.rotation = Math.random() * Math.PI * 2
        this.rotationSpeed = (Math.random() - 0.5) * 0.02
      }

      update(canvasWidth: number, canvasHeight: number) {
        this.x += this.speedX
        this.y += this.speedY
        this.rotation += this.rotationSpeed

        // Wrap around screen
        if (this.x > canvasWidth + 50) this.x = -50
        if (this.x < -50) this.x = canvasWidth + 50
        if (this.y > canvasHeight + 50) this.y = -50
        if (this.y < -50) this.y = canvasHeight + 50
      }

      draw(context: CanvasRenderingContext2D) {
        context.save()
        context.translate(this.x, this.y)
        context.rotate(this.rotation)
        context.fillStyle = `rgba(59, 130, 246, ${this.opacity})`
        context.strokeStyle = `rgba(59, 130, 246, ${this.opacity})`
        context.lineWidth = 2

        switch (this.type) {
          case 'dot':
            context.beginPath()
            context.arc(0, 0, this.size, 0, Math.PI * 2)
            context.fill()
            break
          case 'line':
            context.beginPath()
            context.moveTo(-this.size * 3, 0)
            context.lineTo(this.size * 3, 0)
            context.stroke()
            break
          case 'square':
            context.strokeRect(-this.size, -this.size, this.size * 2, this.size * 2)
            break
          case 'triangle':
            context.beginPath()
            context.moveTo(0, -this.size)
            context.lineTo(this.size, this.size)
            context.lineTo(-this.size, this.size)
            context.closePath()
            context.stroke()
            break
        }
        context.restore()
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

      constructor(canvasWidth: number, canvasHeight: number) {
        const isHorizontal = Math.random() > 0.5
        if (isHorizontal) {
          this.startX = 0
          this.endX = canvasWidth
          this.startY = this.endY = Math.random() * canvasHeight
        } else {
          this.startY = 0
          this.endY = canvasHeight
          this.startX = this.endX = Math.random() * canvasWidth
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

      draw(context: CanvasRenderingContext2D) {
        if (this.opacity <= 0) return
        context.strokeStyle = `rgba(37, 99, 235, ${this.opacity})`
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(this.startX, this.startY)
        context.lineTo(this.endX, this.endY)
        context.stroke()
      }
    }

    const particles: Particle[] = []
    const gridLines: GridLine[] = []
    const particleCount = 50

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height))
    }

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Randomly add grid lines
      if (Math.random() < 0.05 && gridLines.length < 20) {
        gridLines.push(new GridLine(canvas.width, canvas.height))
      }

      // Update and draw grid lines
      gridLines.forEach((line, index) => {
        line.update()
        line.draw(ctx)
        if (line.opacity <= 0) {
          gridLines.splice(index, 1)
        }
      })

      // Update and draw particles
      particles.forEach(particle => {
        particle.update(canvas.width, canvas.height)
        particle.draw(ctx)
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