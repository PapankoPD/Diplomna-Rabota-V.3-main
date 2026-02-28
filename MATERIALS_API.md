# Material Management API Documentation

Complete API reference for the Material Management system.

## Overview

The Material Management API provides secure file upload, storage, and access control for learning materials. It integrates seamlessly with the authentication and RBAC system.

## Table of Contents

- [Upload Material](#upload-material)
- [List Materials](#list-materials)
- [Get Material Details](#get-material-details)
- [Update Material](#update-material)
- [Delete Material](#delete-material)
- [Download Material](#download-material)
- [Manage Permissions](#manage-permissions)
- [Category Management](#category-management)

---

## Upload Material

Upload a new learning material with metadata.

**Endpoint:** `POST /api/materials`

**Authentication:** Required (materials:create permission)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (required): The file to upload
- `title` (required): Material title (3-255 characters)
- `description` (optional): Material description (max 2000 characters)
- `categoryIds` (optional): JSON array of category UUIDs
- `isPublic` (optional): Boolean, make material public (default: false)

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/materials \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "title=Introduction to Node.js" \
  -F "description=Comprehensive guide to Node.js fundamentals" \
  -F "categoryIds=[\"category-uuid-1\",\"category-uuid-2\"]" \
  -F "isPublic=false"
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Material uploaded successfully",
  "data": {
    "material": {
      "id": "material-uuid",
      "title": "Introduction to Node.js",
      "description": "Comprehensive guide to Node.js fundamentals",
      "file_name": "document.pdf",
      "file_type": "application/pdf",
      "file_size": 1048576,
      "file_size_formatted": "1 MB",
      "is_public": false,
      "created_at": "2026-02-06T23:40:00.000Z"
    }
  }
}
```

**Supported File Types:**
- Documents: PDF, DOC, DOCX, PPT, PPTX, TXT
- Images: JPG, PNG, GIF, SVG, WEBP
- Videos: MP4, WEBM, MOV
- Spreadsheets: XLS, XLSX
- Archives: ZIP

**File Size Limit:** 50MB (configurable)

---

## List Materials

Get paginated list of materials with filtering and search.

**Endpoint:** `GET /api/materials`

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search in title and description
- `category` (optional): Filter by category name
- `fileType` (optional): Filter by MIME type
- `sortBy` (optional): Sort field (default: created_at)
- `sortOrder` (optional): asc or desc (default: desc)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/materials?page=1&limit=10&search=nodejs&category=Textbooks" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "materials": [
      {
        "id": "material-uuid",
        "title": "Introduction to Node.js",
        "description": "Comprehensive guide",
        "file_name": "document.pdf",
        "file_type": "application/pdf",
        "file_size": 1048576,
        "file_size_formatted": "1 MB",
        "is_public": false,
        "download_count": 42,
        "uploaded_by": "user-uuid",
        "uploader_username": "johndoe",
        "created_at": "2026-02-06T23:40:00.000Z",
        "categories": [
          {"id": "cat-uuid-1", "name": "Textbooks"},
          {"id": "cat-uuid-2", "name": "Code"}
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

**Access Control:**
- Public materials: Visible to all authenticated users
- Private materials: Visible to owner, users with explicit permissions, and admins

---

## Get Material Details

Retrieve detailed information about a specific material.

**Endpoint:** `GET /api/materials/:id`

**Authentication:** Required (view permission)

**Example:**
```bash
curl -X GET http://localhost:3000/api/materials/MATERIAL_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "material": {
      "id": "material-uuid",
      "title": "Introduction to Node.js",
      "description": "Comprehensive guide to Node.js fundamentals",
      "file_name": "document.pdf",
      "file_type": "application/pdf",
      "file_size": 1048576,
      "file_size_formatted": "1 MB",
      "is_public": false,
      "download_count": 42,
      "uploaded_by": "user-uuid",
      "uploader_username": "johndoe",
      "uploader_email": "john@example.com",
      "created_at": "2026-02-06T23:40:00.000Z",
      "updated_at": "2026-02-06T23:40:00.000Z",
      "categories": [
        {"id": "cat-uuid", "name": "Textbooks"}
      ]
    }
  }
}
```

---

## Update Material

Update material metadata (title, description, categories, visibility).

**Endpoint:** `PUT /api/materials/:id`

**Authentication:** Required (edit permission or ownership)

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "categoryIds": ["cat-uuid-1", "cat-uuid-2"],
  "isPublic": true
}
```

**Note:** All fields are optional. Only provided fields will be updated.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Material updated successfully",
  "data": {
    "material": {
      "id": "material-uuid",
      "title": "Updated Title",
      ...
    }
  }
}
```

---

## Delete Material

Delete a material and its associated file.

**Endpoint:** `DELETE /api/materials/:id`

**Authentication:** Required (delete permission or ownership)

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/materials/MATERIAL_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Material deleted successfully"
}
```

**Note:** This permanently deletes both the database record and the physical file.

---

## Download Material

Download the material file.

**Endpoint:** `GET /api/materials/:id/download`

**Authentication:** Required (view permission)

**Example:**
```bash
curl -X GET http://localhost:3000/api/materials/MATERIAL_UUID/download \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o downloaded_file.pdf
```

**Response:** Binary file with appropriate Content-Type and Content-Disposition headers

**Features:**
- Increments download counter automatically
- Sets correct MIME type
- Proper filename for browser downloads

---

## Manage Permissions

Grant access permissions to specific users or roles for a material.

**Endpoint:** `POST /api/materials/:id/permissions`

**Authentication:** Required (edit permission or ownership)

**Request Body:**
```json
{
  "userId": "user-uuid",
  "permissionType": "view"
}
```

**OR**

```json
{
  "roleId": "role-uuid",
  "permissionType": "edit"
}
```

**Permission Types:**
- `view`: Can view and download the material
- `edit`: Can view, download, and edit metadata
- `delete`: Can view, download, edit, and delete

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Permission granted successfully",
  "data": {
    "permission": {
      "id": "permission-uuid",
      "material_id": "material-uuid",
      "user_id": "user-uuid",
      "role_id": null,
      "permission_type": "view",
      "granted_at": "2026-02-06T23:45:00.000Z"
    }
  }
}
```

---

## Category Management

### List All Categories

**Endpoint:** `GET /api/materials/categories/all`

**Authentication:** Required

**Example:**
```bash
curl -X GET http://localhost:3000/api/materials/categories/all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat-uuid-1",
        "name": "Lecture Notes",
        "description": "Course lecture notes and presentations"
      },
      {
        "id": "cat-uuid-2",
        "name": "Textbooks",
        "description": "Textbooks and reference materials"
      }
    ]
  }
}
```

**Default Categories:**
- Lecture Notes
- Textbooks
- Assignments
- Exams
- Videos
- Code
- Research Papers
- Other

### Create Category

**Endpoint:** `POST /api/materials/categories`

**Authentication:** Required (materials:admin permission)

**Request Body:**
```json
{
  "name": "Lab Materials",
  "description": "Materials for laboratory sessions"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {
      "id": "new-cat-uuid",
      "name": "Lab Materials",
      "description": "Materials for laboratory sessions",
      "created_at": "2026-02-06T23:50:00.000Z"
    }
  }
}
```

---

## Permission Model

### Access Hierarchy

1. **Admin**: Full access to all materials (view, edit, delete)
2. **Owner**: Full access to own materials
3. **Specific Permission**: Granted via material_permissions table
4. **Public Materials**: View access for all authenticated users
5. **Private Materials**: No access without explicit permission

### Permission Levels

| Permission | View | Download | Edit  | Delete |
|------------|------|----------|-------|--------|
| view       | ✓    | ✓        | ✗     | ✗      |
| edit       | ✓    | ✓        | ✓     | ✗      |
| delete     | ✓    | ✓        | ✓     | ✓      |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "File size exceeds limit (50MB maximum)"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to view this material"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Material not found"
}
```

---

## Complete Upload Flow Example

```bash
# 1. Login to get access token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Save the accessToken from response

# 2. Get available categories
curl -X GET http://localhost:3000/api/materials/categories/all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 3. Upload a material
curl -X POST http://localhost:3000/api/materials \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@lecture01.pdf" \
  -F "title=Lecture 1: Introduction" \
  -F "description=First lecture covering basics" \
  -F "categoryIds=[\"TEXTBOOKS_CATEGORY_UUID\"]" \
  -F "isPublic=false"

# Save the material ID from response

# 4. Grant view permission to another user
curl -X POST http://localhost:3000/api/materials/MATERIAL_UUID/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"OTHER_USER_UUID","permissionType":"view"}'

# 5. Download the material
curl -X GET http://localhost:3000/api/materials/MATERIAL_UUID/download \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o lecture01.pdf
```
