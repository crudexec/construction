'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5
  },
  label: {
    fontSize: 10,
    color: '#6b7280',
    width: 120,
    fontWeight: 'bold'
  },
  value: {
    fontSize: 10,
    color: '#374151',
    flex: 1
  },
  table: {
    width: '100%',
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 5,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb'
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: 1,
    borderBottomColor: '#f3f4f6'
  },
  tableCell: {
    fontSize: 9,
    color: '#374151'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10
  },
  statBox: {
    width: '48%',
    padding: 10,
    marginRight: '2%',
    marginBottom: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 3
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center'
  },
  taskItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#f3f4f6'
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  taskTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 10
  },
  badge: {
    padding: '2 6',
    borderRadius: 2,
    fontSize: 8
  },
  statusBadge: {
    backgroundColor: '#f3f4f6'
  },
  priorityBadge: {
    backgroundColor: '#fef3c7'
  },
  taskDescription: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 3
  },
  dailyLogItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4
  },
  dailyLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  dailyLogDate: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  dailyLogWeather: {
    fontSize: 9,
    color: '#6b7280'
  },
  dailyLogContent: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 3
  }
})

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return '#10b981'
    case 'IN_PROGRESS': return '#3b82f6'
    case 'OVERDUE': return '#ef4444'
    default: return '#6b7280'
  }
}

// Helper function to get priority color
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT': return '#ef4444'
    case 'HIGH': return '#f97316'
    case 'MEDIUM': return '#3b82f6'
    default: return '#6b7280'
  }
}

interface ProgressReportPDFProps {
  reportData: any
}

// PDF Document Component
const ProgressReportDocument: React.FC<{ data: any }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Construction Progress Report</Text>
        <Text style={styles.subtitle}>{data.project.title}</Text>
        <Text style={styles.subtitle}>
          Report Period: {data.reportPeriod.startDate} - {data.reportPeriod.endDate}
        </Text>
      </View>

      {/* Project Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Project Name:</Text>
          <Text style={styles.value}>{data.project.title}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{data.project.status}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>
            {[
              data.project.address.street,
              data.project.address.city,
              data.project.address.state,
              data.project.address.zipCode
            ].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Project Manager:</Text>
          <Text style={styles.value}>
            {data.project.owner ? `${data.project.owner.firstName} ${data.project.owner.lastName}` : 'Not assigned'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Client Contact:</Text>
          <Text style={styles.value}>
            {data.project.contact.name || 'N/A'} {data.project.contact.phone ? `(${data.project.contact.phone})` : ''}
          </Text>
        </View>
        {data.project.budget && (
          <View style={styles.row}>
            <Text style={styles.label}>Budget:</Text>
            <Text style={styles.value}>${data.project.budget.toLocaleString()}</Text>
          </View>
        )}
      </View>

      {/* Progress Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Completion Rate</Text>
            <Text style={styles.statValue}>{data.statistics.completionRate}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Tasks</Text>
            <Text style={styles.statValue}>{data.statistics.totalTasks}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Completed Tasks</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              {data.statistics.completedTasks}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>In Progress</Text>
            <Text style={[styles.statValue, { color: '#3b82f6' }]}>
              {data.statistics.inProgressTasks}
            </Text>
          </View>
        </View>
      </View>

      {/* Tasks by Category */}
      {data.tasksByCategory && data.tasksByCategory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work by Category</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Category</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Completed</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>In Progress</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Pending</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Total</Text>
            </View>
            {data.tasksByCategory.map((category: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{category.name}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{category.completed}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{category.inProgress}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{category.todo}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{category.tasks.length}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Generated on {format(new Date(data.generatedAt), 'MMMM dd, yyyy h:mm a')} by {data.generatedBy}
        </Text>
        <Text style={styles.footerText}>
          {data.project.company.name} | {data.project.company.email} | {data.project.company.phone}
        </Text>
      </View>
    </Page>

    {/* Second Page - Detailed Tasks */}
    {data.tasks && data.tasks.length > 0 && (
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Details</Text>
          {data.tasks.slice(0, 15).map((task: any, index: number) => (
            <View key={index} style={styles.taskItem}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={styles.taskMeta}>
                  <Text style={[styles.badge, { backgroundColor: getStatusColor(task.status), color: '#fff' }]}>
                    {task.status}
                  </Text>
                  <Text style={[styles.badge, { backgroundColor: getPriorityColor(task.priority), color: '#fff' }]}>
                    {task.priority}
                  </Text>
                </View>
              </View>
              {task.description && (
                <Text style={styles.taskDescription}>{task.description}</Text>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>Category:</Text>
                <Text style={styles.value}>{task.category}</Text>
              </View>
              {task.assignee && (
                <View style={styles.row}>
                  <Text style={styles.label}>Assigned to:</Text>
                  <Text style={styles.value}>{task.assignee}</Text>
                </View>
              )}
              {task.completedAt && (
                <View style={styles.row}>
                  <Text style={styles.label}>Completed:</Text>
                  <Text style={styles.value}>
                    {format(new Date(task.completedAt), 'MMM dd, yyyy')}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </Page>
    )}

    {/* Third Page - Daily Logs */}
    {data.dailyLogs && data.dailyLogs.length > 0 && (
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Logs</Text>
          {data.dailyLogs.slice(0, 5).map((log: any, index: number) => (
            <View key={index} style={styles.dailyLogItem}>
              <View style={styles.dailyLogHeader}>
                <Text style={styles.dailyLogDate}>
                  {format(new Date(log.date), 'MMMM dd, yyyy')}
                </Text>
                <Text style={styles.dailyLogWeather}>
                  {log.weather} | {log.temperature}°F | {log.workersOnSite} workers
                </Text>
              </View>
              {log.workPerformed && (
                <>
                  <Text style={[styles.label, { marginTop: 5 }]}>Work Performed:</Text>
                  <Text style={styles.dailyLogContent}>{log.workPerformed}</Text>
                </>
              )}
              {log.materials && (
                <>
                  <Text style={[styles.label, { marginTop: 5 }]}>Materials Used:</Text>
                  <Text style={styles.dailyLogContent}>{log.materials}</Text>
                </>
              )}
              {log.issues && (
                <>
                  <Text style={[styles.label, { marginTop: 5 }]}>Issues:</Text>
                  <Text style={styles.dailyLogContent}>{log.issues}</Text>
                </>
              )}
              <Text style={[styles.footerText, { marginTop: 5 }]}>
                Logged by {log.author}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    )}
  </Document>
)

export function ProgressReportPDF({ reportData }: ProgressReportPDFProps) {
  const fileName = `${reportData.project.title.replace(/\s+/g, '_')}_Progress_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`

  return (
    <PDFDownloadLink
      document={<ProgressReportDocument data={reportData} />}
      fileName={fileName}
      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {({ blob, url, loading, error }) =>
        loading ? 'Generating PDF...' : 'Download PDF Report'
      }
    </PDFDownloadLink>
  )
}