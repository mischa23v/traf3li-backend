# Frontend API Guide - RBAC & User Management

This guide explains how the frontend should interact with the backend for user management, permissions, and team operations.

## Table of Contents
1. [User Types](#user-types)
2. [Authentication](#authentication)
3. [Team Management](#team-management)
4. [Permissions System](#permissions-system)
5. [Settings Pages](#settings-pages)

---

## User Types

### Solo Lawyer
- Works independently without a firm
- Has full permissions to their own data
- Cannot add team members
- Data filtered by `lawyerId`

```json
{
  "isSoloLawyer": true,
  "firmId": null,
  "firmRole": null,
  "lawyerWorkMode": "solo"
}
```

### Firm Member
- Belongs to a law firm
- Permissions determined by role + overrides
- Can be owner, admin, partner, lawyer, paralegal, secretary, accountant, or departed
- Data filtered by `firmId`

```json
{
  "isSoloLawyer": false,
  "firmId": "...",
  "firmRole": "lawyer",
  "lawyerWorkMode": "firm_member"
}
```

### Firm Owner
- Created the firm or was transferred ownership
- Has full permissions to everything
- Can manage all team members

```json
{
  "isSoloLawyer": false,
  "firmId": "...",
  "firmRole": "owner",
  "lawyerWorkMode": "firm_owner"
}
```

---

## Authentication

### Registration Flow

**Endpoint:** `POST /api/auth/register`

#### Register as Solo Lawyer
```json
{
  "email": "lawyer@example.com",
  "password": "...",
  "firstName": "Ahmed",
  "lastName": "Mohammed",
  "isSeller": true,
  "lawyerWorkMode": "solo"
}
```

#### Register and Create Firm
```json
{
  "email": "owner@example.com",
  "password": "...",
  "firstName": "Ahmed",
  "lastName": "Mohammed",
  "isSeller": true,
  "lawyerWorkMode": "create_firm",
  "firmData": {
    "name": "Mohammed & Partners",
    "licenseNumber": "12345",
    "email": "firm@example.com",
    "phone": "+966...",
    "region": "Riyadh",
    "city": "Riyadh"
  }
}
```

#### Register via Invitation (Join Firm)
```json
{
  "email": "newlawyer@example.com",
  "password": "...",
  "firstName": "Ali",
  "lastName": "Hassan",
  "isSeller": true,
  "lawyerWorkMode": "join_firm",
  "invitationCode": "ABC123XYZ"
}
```

---

## Team Management

### Get Team Members
**Endpoint:** `GET /api/team`
**Requires:** Firm membership (blocks solo lawyers)

Query parameters:
- `role` - Filter by role
- `status` - Filter by status (active, departed, suspended, pending_approval)
- `department` - Filter by department
- `search` - Search by name/email
- `page`, `limit` - Pagination

### Invite Team Member
**Endpoint:** `POST /api/team/invite`
**Requires:** `canManageTeam` permission or owner/admin role

```json
{
  "email": "newmember@example.com",
  "firstName": "Mohammed",
  "lastName": "Ali",
  "role": "lawyer",
  "phone": "+966...",
  "department": "Litigation",
  "employmentType": "full_time",
  "message": "Welcome to our firm!"
}
```

### Available Roles
| Role | Arabic | Description |
|------|--------|-------------|
| `owner` | مالك | Full access (only 1 per firm) |
| `admin` | مدير | Full access except ownership |
| `partner` | شريك | Senior lawyer with finance view |
| `lawyer` | محامي | Standard lawyer access |
| `paralegal` | مساعد قانوني | Support role, view-only |
| `secretary` | سكرتير | Administrative role |
| `accountant` | محاسب | Finance-focused role |

### Update Permissions
**Endpoint:** `PATCH /api/team/:id/permissions`
**Requires:** owner or admin role

```json
{
  "modules": [
    { "name": "clients", "access": "edit" },
    { "name": "cases", "access": "full" },
    { "name": "invoices", "access": "view" }
  ]
}
```

### Process Departure
**Endpoint:** `POST /api/team/:id/depart`
**Requires:** owner or admin role

Departed users get read-only access to their assigned cases only.

---

## Permissions System

### Permission Levels
| Level | Value | Description |
|-------|-------|-------------|
| `none` | 0 | No access |
| `view` | 1 | Read only |
| `edit` | 2 | Create and update |
| `full` | 3 | Full access including delete |

### Module Permissions
- `clients` - Client management
- `cases` - Case management
- `leads` - Lead/prospect management
- `invoices` - Invoice management
- `payments` - Payment tracking
- `expenses` - Expense management
- `documents` - Document management
- `tasks` - Task management
- `events` - Calendar events
- `timeTracking` - Time tracking
- `reports` - Reports & analytics
- `settings` - System settings
- `team` - Team management
- `hr` - HR management

### Special Permissions
- `canApproveInvoices` - Can approve invoices
- `canManageRetainers` - Can manage retainer agreements
- `canExportData` - Can export firm data
- `canDeleteRecords` - Can permanently delete records
- `canViewFinance` - Can view financial data
- `canManageTeam` - Can invite/manage team members
- `canAccessHR` - Can access HR module

---

## Settings Pages

### User Settings
**Endpoint:** `GET /api/users/profile`

### Firm Settings
**Endpoint:** `GET /api/firms/my`
**Requires:** Firm membership

Editable by owner/admin only.

### Team Settings
**Endpoints:**
- `GET /api/team` - List all members
- `POST /api/team/invite` - Invite new member
- `PATCH /api/team/:id` - Update member profile
- `PATCH /api/team/:id/permissions` - Update permissions
- `PATCH /api/team/:id/status` - Suspend/activate
- `POST /api/team/:id/depart` - Process departure
- `POST /api/team/:id/reinstate` - Reinstate departed member

---

## Solo Lawyer Restrictions

Solo lawyers (`isSoloLawyer: true`) CANNOT:
1. Access team endpoints (returns 403)
2. Invite team members
3. Manage permissions

To add team members, solo lawyers must first create a firm:

**Endpoint:** `POST /api/firms`
```json
{
  "name": "Law Office of Ahmed",
  "licenseNumber": "12345",
  "email": "firm@example.com"
}
```

After creation, user becomes firm owner with full permissions.

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `FIRM_REQUIRED` | 403 | Action requires firm membership |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `OWNER_ONLY` | 403 | Only firm owner can perform |
| `ADMIN_ONLY` | 403 | Only owner/admin can perform |
| `DEPARTED_BLOCKED` | 403 | Departed users cannot perform |
| `INVITATION_INVALID` | 400 | Invitation code invalid/expired |

---

## API Endpoints Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Firms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/firms/my | Get user's firm |
| POST | /api/firms | Create new firm |
| PATCH | /api/firms/:id | Update firm |

### Team
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/team | List team members |
| POST | /api/team/invite | Invite new member |
| PATCH | /api/team/:id | Update member |
| PATCH | /api/team/:id/permissions | Update permissions |
| POST | /api/team/:id/depart | Process departure |
| POST | /api/team/:id/reinstate | Reinstate member |
