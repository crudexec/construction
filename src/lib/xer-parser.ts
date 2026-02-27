/**
 * XER File Parser for Primavera P6 Schedule Files
 *
 * XER files are tab-delimited text files with:
 * - %T = Table name
 * - %F = Field names (column headers)
 * - %R = Record data (rows)
 */

// Types for parsed XER data
export interface XERProject {
  proj_id: string;
  proj_short_name: string;
  plan_start_date?: Date;
  plan_end_date?: Date;
  data_date?: Date;
}

export interface XERWBS {
  wbs_id: string;
  proj_id: string;
  parent_wbs_id?: string;
  wbs_short_name: string;
  wbs_name: string;
  seq_num: number;
}

export interface XERTask {
  task_id: string;
  proj_id: string;
  wbs_id?: string;
  task_code: string;
  task_name: string;
  status_code: string;
  phys_complete_pct: number;
  target_start_date?: Date;
  target_end_date?: Date;
  act_start_date?: Date;
  act_end_date?: Date;
  early_start_date?: Date;
  early_end_date?: Date;
  late_start_date?: Date;
  late_end_date?: Date;
  target_drtn_hr_cnt?: number;
  remain_drtn_hr_cnt?: number;
  total_float_hr_cnt?: number;
  free_float_hr_cnt?: number;
  task_type?: string;
  driving_path_flag?: boolean;
  cstr_type?: string;
  cstr_date?: Date;
}

export interface XERTaskPred {
  task_pred_id: string;
  task_id: string;
  pred_task_id: string;
  proj_id: string;
  pred_type: 'PR_FS' | 'PR_SS' | 'PR_FF' | 'PR_SF';
  lag_hr_cnt: number;
}

export interface XERParseResult {
  projects: XERProject[];
  wbs: XERWBS[];
  tasks: XERTask[];
  taskPreds: XERTaskPred[];
  errors: string[];
}

interface TableData {
  fields: string[];
  rows: Record<string, string>[];
}

/**
 * Parse a date string from XER format (YYYY-MM-DD HH:mm or similar)
 */
function parseXERDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined;

  // Handle various date formats from XER
  const cleanStr = dateStr.trim();

  // Try parsing ISO-like format: "2023-08-11 00:00"
  const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})\s*(\d{2})?:?(\d{2})?/);
  if (match) {
    const [, year, month, day, hour = '0', minute = '0'] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
  }

  // Try standard Date parsing as fallback
  const parsed = new Date(cleanStr);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Parse a number from XER format
 */
function parseXERNumber(numStr: string | undefined): number | undefined {
  if (!numStr || numStr.trim() === '') return undefined;
  const parsed = parseFloat(numStr.trim());
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse XER file content into structured data
 */
export function parseXER(content: string): XERParseResult {
  const errors: string[] = [];
  const tables: Map<string, TableData> = new Map();

  // Normalize line endings (handle Windows \r\n, Mac \r, and Unix \n)
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split content into lines and process
  const lines = normalizedContent.split('\n');

  let currentTable: string | null = null;
  let currentFields: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Split by tab
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    const marker = parts[0].trim();

    if (marker === '%T') {
      // New table definition
      currentTable = parts[1].trim();
      currentFields = [];
      if (!tables.has(currentTable)) {
        tables.set(currentTable, { fields: [], rows: [] });
      }
    } else if (marker === '%F' && currentTable) {
      // Field definitions for current table
      currentFields = parts.slice(1).map(f => f.trim());
      const tableData = tables.get(currentTable)!;
      tableData.fields = currentFields;
    } else if (marker === '%R' && currentTable && currentFields.length > 0) {
      // Data row for current table
      const values = parts.slice(1);
      const row: Record<string, string> = {};

      for (let j = 0; j < currentFields.length && j < values.length; j++) {
        row[currentFields[j]] = values[j]?.trim() || '';
      }

      const tableData = tables.get(currentTable)!;
      tableData.rows.push(row);
    }
  }

  // Extract relevant tables
  const projectTable = tables.get('PROJECT');
  const wbsTable = tables.get('PROJWBS');
  const taskTable = tables.get('TASK');
  const taskPredTable = tables.get('TASKPRED');

  // Parse projects
  const projects: XERProject[] = [];
  if (projectTable) {
    for (const row of projectTable.rows) {
      projects.push({
        proj_id: row.proj_id || '',
        proj_short_name: row.proj_short_name || '',
        plan_start_date: parseXERDate(row.plan_start_date),
        plan_end_date: parseXERDate(row.plan_end_date),
        data_date: parseXERDate(row.last_recalc_date),
      });
    }
  } else {
    errors.push('PROJECT table not found in XER file');
  }

  // Parse WBS
  const wbs: XERWBS[] = [];
  if (wbsTable) {
    for (const row of wbsTable.rows) {
      wbs.push({
        wbs_id: row.wbs_id || '',
        proj_id: row.proj_id || '',
        parent_wbs_id: row.parent_wbs_id || undefined,
        wbs_short_name: row.wbs_short_name || '',
        wbs_name: row.wbs_name || '',
        seq_num: parseXERNumber(row.seq_num) || 0,
      });
    }
  } else {
    errors.push('PROJWBS table not found in XER file');
  }

  // Parse tasks
  const tasks: XERTask[] = [];
  if (taskTable) {
    for (const row of taskTable.rows) {
      const task: XERTask = {
        task_id: row.task_id || '',
        proj_id: row.proj_id || '',
        wbs_id: row.wbs_id || undefined,
        task_code: row.task_code || '',
        task_name: row.task_name || '',
        status_code: row.status_code || 'TK_NotStart',
        phys_complete_pct: parseXERNumber(row.phys_complete_pct) || 0,
        target_start_date: parseXERDate(row.target_start_date),
        target_end_date: parseXERDate(row.target_end_date),
        act_start_date: parseXERDate(row.act_start_date),
        act_end_date: parseXERDate(row.act_end_date),
        early_start_date: parseXERDate(row.early_start_date),
        early_end_date: parseXERDate(row.early_end_date),
        late_start_date: parseXERDate(row.late_start_date),
        late_end_date: parseXERDate(row.late_end_date),
        target_drtn_hr_cnt: parseXERNumber(row.target_drtn_hr_cnt),
        remain_drtn_hr_cnt: parseXERNumber(row.remain_drtn_hr_cnt),
        total_float_hr_cnt: parseXERNumber(row.total_float_hr_cnt),
        free_float_hr_cnt: parseXERNumber(row.free_float_hr_cnt),
        task_type: row.task_type || undefined,
        driving_path_flag: row.driving_path_flag === 'Y',
        cstr_type: row.cstr_type || undefined,
        cstr_date: parseXERDate(row.cstr_date),
      };
      tasks.push(task);
    }
  } else {
    errors.push('TASK table not found in XER file');
  }

  // Parse task predecessors
  const taskPreds: XERTaskPred[] = [];
  if (taskPredTable) {
    for (const row of taskPredTable.rows) {
      const predType = row.pred_type as XERTaskPred['pred_type'];
      if (!['PR_FS', 'PR_SS', 'PR_FF', 'PR_SF'].includes(predType)) {
        continue; // Skip invalid relationship types
      }

      taskPreds.push({
        task_pred_id: row.task_pred_id || '',
        task_id: row.task_id || '',
        pred_task_id: row.pred_task_id || '',
        proj_id: row.proj_id || '',
        pred_type: predType,
        lag_hr_cnt: parseXERNumber(row.lag_hr_cnt) || 0,
      });
    }
  } else {
    errors.push('TASKPRED table not found in XER file');
  }

  return {
    projects,
    wbs,
    tasks,
    taskPreds,
    errors,
  };
}

/**
 * Map XER status code to ScheduleActivityStatus
 */
export function mapXERStatus(statusCode: string): 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' {
  switch (statusCode) {
    case 'TK_Complete':
      return 'COMPLETED';
    case 'TK_Active':
      return 'IN_PROGRESS';
    case 'TK_NotStart':
    default:
      return 'NOT_STARTED';
  }
}

/**
 * Map XER relationship type to ScheduleRelationshipType
 */
export function mapXERRelationType(predType: string): 'FS' | 'SS' | 'FF' | 'SF' {
  switch (predType) {
    case 'PR_SS':
      return 'SS';
    case 'PR_FF':
      return 'FF';
    case 'PR_SF':
      return 'SF';
    case 'PR_FS':
    default:
      return 'FS';
  }
}

/**
 * Determine if an activity is critical based on float
 * Activities with total float <= 0 are typically considered critical
 */
export function isCriticalActivity(totalFloat: number | undefined): boolean {
  if (totalFloat === undefined) return false;
  return totalFloat <= 0;
}

/**
 * Convert XER duration in hours to days (assuming 8-hour workday)
 */
export function hoursToWorkdays(hours: number | undefined, hoursPerDay: number = 8): number | undefined {
  if (hours === undefined) return undefined;
  return hours / hoursPerDay;
}
