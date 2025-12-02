// TypeScript types for USEDAMS

import { 
  SecurityLevel, 
  EmploymentStatus, 
  JobLevel, 
  LogStatus, 
  BackupStatus, 
  RuleAction 
} from '@prisma/client'

// Re-export Prisma enums
export type { SecurityLevel, EmploymentStatus, JobLevel, LogStatus, BackupStatus, RuleAction }

// User types
export interface UserWithRole {
  id: string
  name: string
  email: string
  role: {
    id: string
    roleName: string
  }
  department: string | null
  employmentStatus: EmploymentStatus
  clearanceLevel: SecurityLevel
  location: string | null
  jobLevel: JobLevel | null
}

// Session types
export interface SessionData {
  user: {
    id: string
    email: string
    name: string
    role: string
    clearanceLevel: SecurityLevel
  }
}

// Access Control types
export interface AccessDecision {
  allowed: boolean
  reason?: string
  model?: 'MAC' | 'DAC' | 'RBAC' | 'RuBAC' | 'ABAC' | 'UNIFIED'
}

// Rule condition types
export interface RuleCondition {
  time?: 'workHours' | 'afterHours'
  department?: string
  ipAddress?: string
  jobLevel?: JobLevel
  [key: string]: any
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

