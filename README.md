# Production-Ready Role-Based Authentication System

A comprehensive, secure authentication and authorization system built with Node.js, JWT, and PostgreSQL, implementing industry-standard security practices for production environments.

## 🚀 Features

- **JWT Authentication**: Secure token-based authentication with access and refresh tokens
- **Role-Based Access Control (RBAC)**: Flexible permission system with roles and granular permissions
- **Material Management**: Secure file upload, storage, and access control for learning materials
- **Token Rotation**: Automatic refresh token rotation for enhanced security
- **Account Lockout**: Protection against brute-force attacks with configurable lockout
- **Rate Limiting**: Prevent abuse with endpoint-specific rate limits
- **Password Security**: Bcrypt hashing with strength validation
- **File Upload**: Multer-based file upload with type and size validation
- **Input Validation**: Comprehensive validation and sanitization
- **Security Headers**: Helmet.js for secure HTTP headers
- **CORS Protection**: Configurable cross-origin resource sharing
- **Database Transactions**: Atomic operations for data integrity
- **Graceful Shutdown**: Proper cleanup of database connections and resources

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 14.0 or higher
- **npm** or **yarn** package manager

## 🛠 Installation

### 1. Clone or Extract Project

```bash
cd "c:\Users\ikole\Desktop\дипломна работа v.2"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

Create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE auth_rbac_db;

# Exit psql
\q
```

Initialize the schema:

```bash
# Initialize authentication schema
psql -U postgres -d auth_rbac_db -f database/init.sql

# Initialize materials schema
psql -U postgres -d auth_rbac_db -f database/materials_schema.sql

# Initialize categorization schema (subjects, topics, grades)
psql -U postgres -d auth_rbac_db -f database/categorization_schema.sql
```

### 4. Configure Environment Variables

Copy the example environment file:

```bash
copy .env.example .env
```

Edit `.env` and update the following critical values:

```env
# Database credentials
DB_PASSWORD=your_actual_postgres_password

# JWT Secrets (MUST change for production!)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<generate_64_char_hex_string>
JWT_REFRESH_SECRET=<generate_64_char_hex_string>

# Admin user (for initial setup)
ADMIN_EMAIL=your_admin@email.com
ADMIN_PASSWORD=YourSecurePassword123!
```

> **⚠️ SECURITY WARNING**: Never commit the `.env` file to version control. Use different secrets for development and production.

### 5. Generate Secure JWT Secrets

Run this command to generate secure secrets:

```bash
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex')); console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output into your `.env` file.

## 🚀 Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Documentation

See full API documentation:
- [API.md](API.md) - Authentication and RBAC endpoints
- [MATERIALS_API.md](MATERIALS_API.md) - Material management endpoints
- [CATEGORIZATION_GUIDE.md](CATEGORIZATION_GUIDE.md) - Advanced categorization system

### Quick Start Examples

#### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"username\":\"johndoe\",\"password\":\"SecurePass123!\"}"
```

#### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"SecurePass123!\"}"
```

Response includes `accessToken` and `refreshToken`. Use the access token for authenticated requests.

#### 3. Get Current User Profile

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4. Refresh Access Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
```

## 🏗 Project Structure

```
дипломна работа v.2/
├── database/
│   ├── init.sql              # Authentication schema
│   └── materials_schema.sql  # Materials schema
├── src/
│   ├── config/
│   │   ├── database.js       # PostgreSQL connection pool
│   │   ├── jwt.js            # JWT utilities
│   │   └── storage.js        # File storage configuration
│   ├── middleware/
│   │   ├── auth.js           # Authentication middleware
│   │   ├── rbac.js           # Role/permission middleware
│   │   ├── materialPermissions.js  # Material-specific permissions
│   │   ├── upload.js         # File upload middleware
│   │   ├── security.js       # Rate limiting, CORS, Helmet
│   │   └── validation.js     # Input validation rules
│   ├── routes/
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── users.js          # User management endpoints
│   │   ├── roles.js          # Role management endpoints
│   │   └── materials.js      # Material management endpoints
│   ├── utils/
│   │   ├── password.js       # Password hashing utilities
│   │   └── fileUtils.js      # File operation utilities
│   ├── app.js                # Express app configuration
│   └── server.js             # Server entry point
├── uploads/                  # Uploaded files (excluded from git)
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
├── README.md
├── API.md                    # Authentication API docs
├── MATERIALS_API.md          # Materials API docs
└── SECURITY.md               # Security considerations
```

## 🔐 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security
- **Access Tokens**: Short-lived (15 minutes by default)
- **Refresh Tokens**: Longer-lived (7 days by default)
- **Token Rotation**: Refresh tokens are rotated on use
- **Token Storage**: Refresh tokens stored as SHA-256 hashes

### Account Protection
- **Lockout Policy**: Account locked after 5 failed login attempts
- **Lockout Duration**: 15 minutes (configurable)
- **Rate Limiting**: 
  - Global: 100 requests per 15 minutes
  - Auth endpoints: 5 attempts per 15 minutes

### HTTP Security Headers (via Helmet)
- Content Security Policy
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- XSS Filter

See [SECURITY.md](SECURITY.md) for detailed security documentation.

## 📁 Material Management

The system includes a complete material management module with advanced categorization:

### Core Features
- **File Upload**: Support for documents, images, videos, and archives
- **Access Control**: Public/private materials with granular permissions
- **Multi-Dimensional Categorization**: Organize by subjects, topics, and grades
- **Search & Filter**: Full-text search with category, subject, topic, and grade filters
- **Download Tracking**: Automatic counting of material downloads
- **Permission Management**: Grant view, edit, or delete permissions to users/roles

### Categorization System

**Subjects** (7 pre-seeded):
- Mathematics, Science, Language Arts, Social Studies, Arts, Technology, Physical Education

**Topics** (25+ with hierarchy):
- Subjects contain topics (e.g., Mathematics → Algebra)
- Topics can have sub-topics (e.g., Algebra → Linear Equations)
- Difficulty levels 1-5 for each topic

**Grades** (K-12 through Graduate):
- Kindergarten through Grade 12
- Undergraduate (Years 1-4)
- Graduate and Professional levels
- Ordered progression for range queries

**Features:**
- Materials can have multiple subjects, topics, and grades
- Primary subject/grade designation
- Topic relevance scoring
- Hierarchical topic structure
- Grade-level progression tracking

### Supported File Types
- Documents: PDF, DOC, DOCX, PPT, PPTX, TXT
- Images: JPG, PNG, GIF, SVG, WEBP  
- Videos: MP4, WEBM, MOV
- Spreadsheets: XLS, XLSX
- Archives: ZIP

### File Limits
- Maximum file size: 50MB (configurable)
- Files organized by year/month for scalability
- Automatic file type validation

See [MATERIALS_API.md](MATERIALS_API.md) for complete materials API documentation.  
See [CATEGORIZATION_GUIDE.md](CATEGORIZATION_GUIDE.md) for taxonomy details and examples.

## 🎯 Default Roles & Permissions

The system comes with three default roles:

### Admin Role
- Full system access
- All permissions granted
- Can manage users, roles, and permissions

### User Role
- Standard user access
- Can view users, roles, and permissions
- Can authenticate and refresh tokens
- Can create and manage own materials

### Guest Role
- Read-only access
- Can view roles and permissions
- Limited authentication capabilities

### Material Permissions

The system automatically seeds material-specific permissions:
- `materials:create` - Upload new materials
- `materials:read` - View materials
- `materials:update` - Edit material metadata
- `materials:delete` - Delete materials
-`materials:admin` - Full access to all materials

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

## 📊 Database Management

### View User Permissions

```sql
SELECT * FROM user_permissions_view WHERE email = 'user@example.com';
```

### View Role Summary

```sql
SELECT * FROM role_summary_view;
```

### Clean Up Expired Tokens

```sql
SELECT cleanup_expired_tokens();
```

### View Materials with Categories

```sql
SELECT * FROM materials_with_categories WHERE uploader_username = 'johndoe';
```

### Check Material Access

```sql
SELECT can_user_view_material('material-uuid', 'user-uuid');
```

## 🔧 Configuration

All configuration is managed through environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | auth_rbac_db |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | 15m |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | 7d |
| `BCRYPT_ROUNDS` | Bcrypt hash rounds | 12 |
| `MAX_LOGIN_ATTEMPTS` | Failed login limit | 5 |
| `LOCKOUT_DURATION_MINUTES` | Lockout duration | 15 |
| `UPLOAD_DIR` | File upload directory | uploads |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 52428800 |

## 🚀 Deployment

### Production Checklist

- [ ] Generate unique JWT secrets (64+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS/TLS for all connections
- [ ] Configure PostgreSQL with SSL
- [ ] Set strong database passwords
- [ ] Configure CORS with specific allowed origins
- [ ] Enable PostgreSQL connection pooling limits
- [ ] Set up log rotation
- [ ] Configure firewall rules
- [ ] Regular database backups
- [ ] Monitor failed login attempts
- [ ] Set up health check monitoring

### Environment-Specific Settings

**Development:**
```env
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Production:**
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Verify PostgreSQL is running
pg_isready

# Check connection with psql
psql -U postgres -d auth_rbac_db
```

### Port Already in Use

Change the `PORT` in `.env` or stop the conflicting process.

### JWT Token Errors

Ensure your secrets are properly set in `.env` and are at least 64 characters long.

## 📝 License

MIT

## 🤝 Contributing

This is a production-ready template. Feel free to customize based on your needs.

## 📞 Support

For issues, questions, or suggestions, please refer to the documentation or create an issue in your project repository.
