# USEDAMS - Unified Secure Employee & Document Access Management System

A full-stack enterprise system implementing all 5 access control models (MAC, DAC, RBAC, RuBAC, ABAC) with authentication, logging, and backup capabilities.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL client tools (for backups)

### Installation

1. **Clone/Navigate to project:**
   ```bash
   cd usedams
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start PostgreSQL database:**
   ```bash
   docker-compose up -d
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

6. **Seed the database:**
   ```bash
   npm run db:seed
   ```

7. **Start development server:**
   ```bash
   npm run dev
   ```

8. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 🔑 Default Credentials

**Admin Account:**
- Email: `admin@usedams.com`
- Password: `admin123`

⚠️ **Change the password after first login!**

## 📋 Features

### ✅ Access Control Models

1. **MAC (Mandatory Access Control)**
   - Security levels: PUBLIC, INTERNAL, CONFIDENTIAL
   - Clearance level checking

2. **DAC (Discretionary Access Control)**
   - Resource ownership
   - Permission granting/revoking
   - View/Edit/Share permissions

3. **RBAC (Role-Based Access Control)**
   - Role-permission mapping
   - 5 default roles: ADMIN, HR_MANAGER, FINANCE_MANAGER, DEPARTMENT_MANAGER, EMPLOYEE

4. **RuBAC (Rule-Based Access Control)**
   - Time-based rules (working hours)
   - Department-based rules
   - IP-based rules

5. **ABAC (Attribute-Based Access Control)**
   - User/Resource/Environment attributes
   - Policy-based evaluation

### ✅ Authentication & Security

- User registration with email verification
- Secure password hashing (bcrypt)
- Account lockout (5 failed attempts)
- JWT token-based authentication
- Session management

### ✅ Logging & Audit

- Comprehensive audit logging
- User activity tracking
- System event logging
- Log export (JSON, CSV)
- Log filtering and search

### ✅ Backup System

- Manual backup creation
- Automated cleanup (30-day retention)
- Backup metadata tracking
- Encrypted backups

## 📁 Project Structure

```
usedams/
├── app/
│   ├── api/              # API routes
│   ├── (auth)/           # Authentication pages
│   ├── (dashboard)/      # Dashboard pages
│   └── admin/            # Admin pages
├── components/
│   ├── ui/               # UI components
│   └── dashboard/        # Dashboard components
├── lib/
│   ├── access-control/   # Access control models
│   ├── auth.ts          # Authentication utilities
│   ├── logging.ts       # Logging utilities
│   ├── backup.ts        # Backup utilities
│   └── middleware.ts    # Auth middleware
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed script
└── types/
    └── index.ts         # TypeScript types
```

## 🗄️ Database

The system uses PostgreSQL with 9 tables:

1. Users - User accounts and attributes
2. Roles - Role definitions
3. RolePermissions - Role-permission mapping
4. Resources - Documents/files
5. DAC_Permissions - Discretionary permissions
6. Rules - Rule-based access rules
7. Sessions - User sessions
8. AuditLogs - Audit trail
9. BackupMetadata - Backup records

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:seed` - Seed database with initial data
- `npx prisma studio` - Open Prisma Studio (database GUI)

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Logs (Admin only)
- `GET /api/logs` - Get audit logs
- `GET /api/logs/export` - Export logs (CSV/JSON)

### Backups (Admin only)
- `GET /api/backups` - List backups
- `POST /api/backups` - Create backup
- `GET /api/backups/[id]` - Get backup details
- `DELETE /api/backups/[id]` - Delete backup

## 🛡️ Security Features

- Password strength validation
- Account lockout mechanism
- JWT token authentication
- HttpOnly cookies
- SQL injection prevention (Prisma)
- XSS protection
- CSRF protection
- Rate limiting (recommended for production)

## 🧪 Testing

To test the system:

1. **Login with admin credentials**
2. **Navigate to Dashboard** - View system overview
3. **Check Employees** - View employee list
4. **Check Documents** - View document list
5. **Admin Panel:**
   - View audit logs
   - Create backups
   - Manage users

## 📝 Notes

- The system is fully functional for demonstration
- All 5 access control models are implemented
- Backend APIs are ready for frontend integration
- Database is seeded with initial data

## 🚧 Future Enhancements

- MFA (TOTP, Email OTP)
- Email notifications
- File upload for documents
- Real-time notifications
- Advanced search
- Report generation

## 📄 License

This project is for educational/demonstration purposes.

---

**Status:** ✅ Fully Functional  
**Version:** 1.0.0  
**Last Updated:** December 2024
