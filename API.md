# API Documentation

Complete API reference for the Authentication & RBAC system.

**Base URL:** `http://localhost:3000`

## Table of Contents

- [Authentication Endpoints](#authentication-endpoints)
- [User Management](#user-management)
- [Role Management](#role-management)
- [Error Responses](#error-responses)

---

## Authentication Endpoints

### Register User

Create a new user account with default 'user' role.

**Endpoint:** `POST /api/auth/register`

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "createdAt": "2026-02-06T21:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `409 Conflict` - Email or username already exists
- `400 Bad Request` - Validation errors

---

### Login

Authenticate user and receive access/refresh tokens.

**Endpoint:** `POST /api/auth/login`

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account locked due to too many failed attempts

---

### Refresh Token

Exchange refresh token for new access and refresh tokens.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid, expired, or revoked refresh token

---

### Logout

Revoke the refresh token.

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get Current User

Retrieve authenticated user's profile with roles and permissions.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "is_verified": false,
      "created_at": "2026-02-06T21:30:00.000Z",
      "roles": [
        {
          "id": "role-uuid",
          "name": "user",
          "description": "Standard user with basic access"
        }
      ],
      "permissions": [
        {
          "id": "perm-uuid",
          "name": "users:read",
          "resource": "users",
          "action": "read",
          "description": "View user information"
        }
      ]
    }
  }
}
```

---

## User Management

### List All Users

Get paginated list of all users (admin only).

**Endpoint:** `GET /api/users?page=1&limit=10`

**Authentication:** Required (Admin role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "email": "user@example.com",
        "username": "johndoe",
        "is_verified": false,
        "created_at": "2026-02-06T21:30:00.000Z",
        "updated_at": "2026-02-06T21:30:00.000Z",
        "roles": [
          {"id": "role-uuid", "name": "user"}
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

### Get User by ID

Retrieve specific user (admin or own profile).

**Endpoint:** `GET /api/users/:id`

**Authentication:** Required (Admin or own user)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "is_verified": false,
      "created_at": "2026-02-06T21:30:00.000Z",
      "updated_at": "2026-02-06T21:30:00.000Z",
      "roles": [...],
      "permissions": [...]
    }
  }
}
```

---

### Update User Roles

Assign roles to a user (requires roles:manage permission).

**Endpoint:** `PUT /api/users/:id/roles`

**Authentication:** Required (roles:manage permission)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "roleIds": [
    "role-uuid-1",
    "role-uuid-2"
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User roles updated successfully",
  "data": {
    "roles": [
      {
        "id": "role-uuid-1",
        "name": "admin",
        "description": "Administrator with full system access"
      }
    ]
  }
}
```

---

### Delete User

Delete a user account (requires users:delete permission).

**Endpoint:** `DELETE /api/users/:id`

**Authentication:** Required (users:delete permission)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Cannot delete own account
- `404 Not Found` - User not found

---

## Role Management

### List All Roles

Get all available roles with statistics.

**Endpoint:** `GET /api/roles`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "role-uuid",
        "name": "admin",
        "description": "Administrator with full system access",
        "created_at": "2026-02-06T20:00:00.000Z",
        "user_count": "3",
        "permission_count": "13"
      }
    ]
  }
}
```

---

### Get Role by ID

Retrieve specific role with permissions.

**Endpoint:** `GET /api/roles/:id`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "role": {
      "id": "role-uuid",
      "name": "admin",
      "description": "Administrator with full system access",
      "created_at": "2026-02-06T20:00:00.000Z",
      "permissions": [
        {
          "id": "perm-uuid",
          "name": "users:read",
          "resource": "users",
          "action": "read",
          "description": "View user information"
        }
      ]
    }
  }
}
```

---

### Create Role

Create a new role (admin only).

**Endpoint:** `POST /api/roles`

**Authentication:** Required (Admin role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "moderator",
  "description": "Moderator with limited admin access"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "role": {
      "id": "new-role-uuid",
      "name": "moderator",
      "description": "Moderator with limited admin access",
      "created_at": "2026-02-06T21:45:00.000Z"
    }
  }
}
```

---

### Update Role Permissions

Assign permissions to a role (admin only).

**Endpoint:** `PUT /api/roles/:id/permissions`

**Authentication:** Required (Admin role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "permissionIds": [
    "permission-uuid-1",
    "permission-uuid-2"
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Role permissions updated successfully",
  "data": {
    "permissions": [...]
  }
}
```

---

### Delete Role

Delete a role (admin only, protected roles cannot be deleted).

**Endpoint:** `DELETE /api/roles/:id`

**Authentication:** Required (Admin role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Cannot delete protected role (admin, user, guest)

---

### Get All Permissions

Retrieve all available permissions.

**Endpoint:** `GET /api/roles/permissions/all`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "id": "perm-uuid",
        "name": "users:read",
        "resource": "users",
        "action": "read",
        "description": "View user information"
      }
    ]
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Common HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input or validation errors
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Rate Limiting

When rate limit is exceeded:

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later"
}
```

**Response Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Example Usage (cURL)

### Complete Authentication Flow

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"johndoe","password":"SecurePass123!"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Save the accessToken from response

# 3. Get current user profile
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Refresh token (after access token expires)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'

# 5. Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### Admin Operations

```bash
# List all users (admin only)
curl -X GET "http://localhost:3000/api/users?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# Update user roles (requires roles:manage permission)
curl -X PUT http://localhost:3000/api/users/USER_UUID/roles \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleIds":["ROLE_UUID_1","ROLE_UUID_2"]}'

# Create a new role (admin only)
curl -X POST http://localhost:3000/api/roles \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"moderator","description":"Moderator role"}'
```
