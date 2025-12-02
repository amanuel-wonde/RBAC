// Seed script for USEDAMS
// Populates initial roles, permissions, and admin user

import { PrismaClient, SecurityLevel, EmploymentStatus, JobLevel, RuleAction } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Create Roles
  console.log('Creating roles...')
  const adminRole = await prisma.role.upsert({
    where: { roleName: 'ADMIN' },
    update: {},
    create: {
      roleName: 'ADMIN',
      description: 'Full system access, can manage all users, roles, and resources'
    }
  })

  const hrManagerRole = await prisma.role.upsert({
    where: { roleName: 'HR_MANAGER' },
    update: {},
    create: {
      roleName: 'HR_MANAGER',
      description: 'HR operations, employee management, leave approvals'
    }
  })

  const financeManagerRole = await prisma.role.upsert({
    where: { roleName: 'FINANCE_MANAGER' },
    update: {},
    create: {
      roleName: 'FINANCE_MANAGER',
      description: 'Financial data access, payroll management'
    }
  })

  const deptManagerRole = await prisma.role.upsert({
    where: { roleName: 'DEPARTMENT_MANAGER' },
    update: {},
    create: {
      roleName: 'DEPARTMENT_MANAGER',
      description: 'Department-specific resource management'
    }
  })

  const employeeRole = await prisma.role.upsert({
    where: { roleName: 'EMPLOYEE' },
    update: {},
    create: {
      roleName: 'EMPLOYEE',
      description: 'Basic access, own profile management'
    }
  })

  console.log('✅ Roles created')

  // 2. Create Role Permissions
  console.log('Creating role permissions...')
  
  // Admin permissions - all permissions
  const adminPermissions = [
    'view_all',
    'edit_all',
    'delete_all',
    'manage_users',
    'manage_roles',
    'manage_rules',
    'view_confidential',
    'view_internal',
    'view_public',
    'approve_leave',
    'manage_backups',
    'view_logs',
    'export_logs'
  ]

  for (const permission of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionName: {
          roleId: adminRole.id,
          permissionName: permission
        }
      },
      update: { allowed: true },
      create: {
        roleId: adminRole.id,
        permissionName: permission,
        allowed: true
      }
    })
  }

  // HR Manager permissions
  const hrPermissions = [
    'view_internal',
    'view_public',
    'manage_employees',
    'approve_leave',
    'view_hr_documents',
    'edit_hr_documents'
  ]

  for (const permission of hrPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionName: {
          roleId: hrManagerRole.id,
          permissionName: permission
        }
      },
      update: { allowed: true },
      create: {
        roleId: hrManagerRole.id,
        permissionName: permission,
        allowed: true
      }
    })
  }

  // Finance Manager permissions
  const financePermissions = [
    'view_internal',
    'view_public',
    'view_confidential',
    'view_finance_documents',
    'edit_finance_documents',
    'approve_payroll'
  ]

  for (const permission of financePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionName: {
          roleId: financeManagerRole.id,
          permissionName: permission
        }
      },
      update: { allowed: true },
      create: {
        roleId: financeManagerRole.id,
        permissionName: permission,
        allowed: true
      }
    })
  }

  // Department Manager permissions
  const deptPermissions = [
    'view_public',
    'view_internal',
    'view_department_resources',
    'edit_department_resources',
    'approve_department_leave'
  ]

  for (const permission of deptPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionName: {
          roleId: deptManagerRole.id,
          permissionName: permission
        }
      },
      update: { allowed: true },
      create: {
        roleId: deptManagerRole.id,
        permissionName: permission,
        allowed: true
      }
    })
  }

  // Employee permissions
  const employeePermissions = [
    'view_public',
    'view_own_profile',
    'edit_own_profile',
    'create_leave_request'
  ]

  for (const permission of employeePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionName: {
          roleId: employeeRole.id,
          permissionName: permission
        }
      },
      update: { allowed: true },
      create: {
        roleId: employeeRole.id,
        permissionName: permission,
        allowed: true
      }
    })
  }

  console.log('✅ Role permissions created')

  // 3. Create Admin User
  console.log('Creating admin user...')
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@usedams.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@usedams.com',
      passwordHash: hashedPassword,
      roleId: adminRole.id,
      department: 'IT',
      employmentStatus: EmploymentStatus.ACTIVE,
      clearanceLevel: SecurityLevel.CONFIDENTIAL,
      location: 'Head Office',
      jobLevel: JobLevel.EXECUTIVE,
      emailVerified: true
    }
  })

  console.log('✅ Admin user created')
  console.log('   Email: admin@usedams.com')
  console.log('   Password: admin123')
  console.log('   ⚠️  Please change the password after first login!')

  // 4. Create Sample Rules
  console.log('Creating sample rules...')
  
  // Working hours rule
  await prisma.rule.upsert({
    where: { ruleName: 'WORKING_HOURS_ACCESS' },
    update: {},
    create: {
      ruleName: 'WORKING_HOURS_ACCESS',
      description: 'Deny access outside working hours (8 AM - 6 PM)',
      conditionJson: {
        time: 'workHours',
        action: 'deny'
      },
      action: RuleAction.DENY,
      isActive: true
    }
  })

  // Leave approval rule
  await prisma.rule.upsert({
    where: { ruleName: 'LEAVE_APPROVAL_10_DAYS' },
    update: {},
    create: {
      ruleName: 'LEAVE_APPROVAL_10_DAYS',
      description: 'Leave requests >10 days require HR Manager approval',
      conditionJson: {
        resourceType: 'leave_request',
        days: { $gt: 10 },
        requiredRole: 'HR_MANAGER'
      },
      action: RuleAction.ALLOW,
      isActive: true
    }
  })

  // Department access rule
  await prisma.rule.upsert({
    where: { ruleName: 'DEPARTMENT_RESOURCE_ACCESS' },
    update: {},
    create: {
      ruleName: 'DEPARTMENT_RESOURCE_ACCESS',
      description: 'Users can only access resources from their department',
      conditionJson: {
        userDepartment: 'match',
        resourceDepartment: 'match'
      },
      action: RuleAction.ALLOW,
      isActive: true
    }
  })

  console.log('✅ Sample rules created')

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

