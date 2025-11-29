import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixTasksArchive() {
  try {
    // Update all tasks where isArchived is null to false using raw SQL
    const result = await prisma.$executeRaw`
      UPDATE Task 
      SET isArchived = false 
      WHERE isArchived IS NULL
    `
    
    console.log(`Updated ${result} tasks with isArchived = false`)
    
    // Also verify the total count of tasks
    const totalTasks = await prisma.task.count()
    const archivedTasks = await prisma.task.count({ where: { isArchived: true } })
    const activeTasks = await prisma.task.count({ where: { isArchived: false } })
    
    console.log(`Total tasks: ${totalTasks}`)
    console.log(`Active tasks: ${activeTasks}`)
    console.log(`Archived tasks: ${archivedTasks}`)
    
  } catch (error) {
    console.error('Error fixing tasks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTasksArchive()