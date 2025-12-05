// Export existing SQLite data to JSON for PostgreSQL import
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./database/production.db' // SQLite path
    }
  }
})

async function exportData() {
  try {
    console.log('📦 Exporting SQLite data...')
    
    const companies = await prisma.company.findMany()
    const users = await prisma.user.findMany()
    const stages = await prisma.stage.findMany()
    const cards = await prisma.card.findMany()
    const tasks = await prisma.task.findMany()
    const dailyLogs = await prisma.dailyLog.findMany()
    
    const exportData = {
      companies,
      users,
      stages,
      cards,
      tasks,
      dailyLogs,
      exportedAt: new Date().toISOString()
    }
    
    fs.writeFileSync('./database/sqlite-export.json', JSON.stringify(exportData, null, 2))
    console.log('✅ Data exported to ./database/sqlite-export.json')
    
    console.log('📊 Export Summary:')
    console.log(`- Companies: ${companies.length}`)
    console.log(`- Users: ${users.length}`)
    console.log(`- Stages: ${stages.length}`)
    console.log(`- Cards: ${cards.length}`)
    console.log(`- Tasks: ${tasks.length}`)
    console.log(`- Daily Logs: ${dailyLogs.length}`)
    
  } catch (error) {
    console.error('❌ Export failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportData()