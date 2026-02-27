import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import {
  parseXER,
  mapXERStatus,
  mapXERRelationType,
  isCriticalActivity,
} from '@/lib/xer-parser'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xer')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an XER file.' },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()

    // Parse XER file
    const parseResult = parseXER(content)

    if (parseResult.errors.length > 0 && parseResult.tasks.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse XER file', details: parseResult.errors },
        { status: 400 }
      )
    }

    // Get the first project from XER (typically there's only one)
    const xerProject = parseResult.projects[0]

    // Step 1: Delete existing schedule data (outside transaction for speed)
    await prisma.scheduleRelationship.deleteMany({
      where: { projectId },
    })
    await prisma.scheduleActivity.deleteMany({
      where: { projectId },
    })
    await prisma.scheduleWBS.deleteMany({
      where: { projectId },
    })

    // Step 2: Create WBS entries (need to do one-by-one for hierarchy)
    const wbsMap = new Map<string, string>() // xerWbsId -> newWbsId

    // Sort WBS by parent hierarchy (parents first)
    const sortedWBS = [...parseResult.wbs].sort((a, b) => {
      // Root items (no parent) come first
      if (!a.parent_wbs_id && b.parent_wbs_id) return -1
      if (a.parent_wbs_id && !b.parent_wbs_id) return 1
      return a.seq_num - b.seq_num
    })

    // Create WBS entries in order
    for (const wbs of sortedWBS) {
      const parentId = wbs.parent_wbs_id ? wbsMap.get(wbs.parent_wbs_id) : null

      const createdWBS = await prisma.scheduleWBS.create({
        data: {
          projectId,
          xerWbsId: wbs.wbs_id,
          code: wbs.wbs_short_name,
          name: wbs.wbs_name,
          parentId: parentId || null,
          sortOrder: wbs.seq_num,
          isExpanded: true,
        },
      })

      wbsMap.set(wbs.wbs_id, createdWBS.id)
    }

    // Step 3: Bulk create activities using createMany
    const activityData = parseResult.tasks.map((task, i) => ({
      projectId,
      wbsId: task.wbs_id ? wbsMap.get(task.wbs_id) || null : null,
      xerTaskId: task.task_id,
      activityId: task.task_code,
      name: task.task_name,
      status: mapXERStatus(task.status_code),
      percentComplete: task.phys_complete_pct,
      plannedStart: task.target_start_date,
      plannedFinish: task.target_end_date,
      actualStart: task.act_start_date,
      actualFinish: task.act_end_date,
      earlyStart: task.early_start_date,
      earlyFinish: task.early_end_date,
      lateStart: task.late_start_date,
      lateFinish: task.late_end_date,
      plannedDuration: task.target_drtn_hr_cnt,
      remainingDuration: task.remain_drtn_hr_cnt,
      totalFloat: task.total_float_hr_cnt,
      freeFloat: task.free_float_hr_cnt,
      isCritical: isCriticalActivity(task.total_float_hr_cnt),
      drivingPathFlag: task.driving_path_flag || false,
      activityType: task.task_type,
      constraintType: task.cstr_type,
      constraintDate: task.cstr_date,
      sortOrder: i,
    }))

    await prisma.scheduleActivity.createMany({
      data: activityData,
    })

    // Step 4: Fetch created activities to build the map for relationships
    const createdActivities = await prisma.scheduleActivity.findMany({
      where: { projectId },
      select: { id: true, xerTaskId: true },
    })

    const activityMap = new Map<string, string>()
    for (const activity of createdActivities) {
      if (activity.xerTaskId) {
        activityMap.set(activity.xerTaskId, activity.id)
      }
    }

    // Step 5: Bulk create relationships
    const relationshipData = parseResult.taskPreds
      .map((pred) => {
        const predecessorId = activityMap.get(pred.pred_task_id)
        const successorId = activityMap.get(pred.task_id)

        if (predecessorId && successorId) {
          return {
            projectId,
            predecessorId,
            successorId,
            type: mapXERRelationType(pred.pred_type),
            lagHours: pred.lag_hr_cnt,
            xerPredId: pred.task_pred_id,
          }
        }
        return null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (relationshipData.length > 0) {
      await prisma.scheduleRelationship.createMany({
        data: relationshipData,
      })
    }

    // Step 6: Create import log entry
    const importLog = await prisma.scheduleImport.create({
      data: {
        projectId,
        fileName: file.name,
        fileSize: file.size,
        importedById: user.id,
        activitiesCount: parseResult.tasks.length,
        relationshipsCount: relationshipData.length,
        wbsCount: parseResult.wbs.length,
        xerProjectId: xerProject?.proj_id,
        xerProjectName: xerProject?.proj_short_name,
        dataDate: xerProject?.data_date,
      },
    })

    // Step 7: Create activity log
    await prisma.activity.create({
      data: {
        type: 'schedule_imported',
        description: `Imported schedule from XER file: ${file.name}`,
        metadata: JSON.stringify({
          activities: parseResult.tasks.length,
          relationships: relationshipData.length,
          wbs: parseResult.wbs.length,
        }),
        cardId: projectId,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Schedule imported successfully',
      importId: importLog.id,
      activitiesCount: parseResult.tasks.length,
      relationshipsCount: relationshipData.length,
      wbsCount: parseResult.wbs.length,
      xerProjectName: xerProject?.proj_short_name,
      warnings: parseResult.errors,
    })
  } catch (error) {
    console.error('Error importing schedule:', error)
    return NextResponse.json(
      { error: 'Failed to import schedule', details: String(error) },
      { status: 500 }
    )
  }
}
