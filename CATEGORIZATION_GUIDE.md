# Categorization System Documentation

Complete guide to the advanced categorization system for learning materials.

## Overview

The categorization system provides a normalized, multi-dimensional taxonomy for organizing learning materials by:
- **Subjects**: High-level disciplines (Mathematics, Science, etc.)
- **Topics**: Specific topics within subjects with hierarchical structure
- **Grades**: Educational levels from Kindergarten through Graduate studies

Materials can be assigned to multiple subjects, topics, and grades, enabling powerful filtering and organization.

---

## Data Model

### Entity Relationships

```
Materials
    ├── Many-to-Many → Subjects (with primary designation)
    ├── Many-to-Many → Topics (with relevance score)
    └── Many-to-Many → Grades (with primary designation)

Topics
    └── Belongs-to → Subject
    └── Optional Parent → Topic (hierarchical)
```

### Subjects

**Attributes:**
- `id`: UUID
- `name`: Subject name (e.g., "Mathematics")
- `code`: Unique code (e.g., "MATH")
- `description`: Detailed description
- `icon`: Icon identifier for UI
- `display_order`: Ordering for display

**Seeded Subjects:**
1. Mathematics (MATH)
2. Science (SCI)
3. Language Arts (LANG)
4. Social Studies (SOC)
5. Arts (ART)
6. Technology (TECH)
7. Physical Education (PE)

### Topics

**Attributes:**
- `id`: UUID
- `subject_id`: Parent subject (required)
- `name`: Topic name
- `code`: Unique code (e.g., "MATH-ALG")
- `parent_topic_id`: Parent topic for hierarchical structure
- `difficulty_level`: 1-5 scale (1=Beginner, 5=Master)
- `display_order`: Ordering within subject

**Example Hierarchy:**
```
Mathematics (MATH)
├── Algebra (MATH-ALG) [Level 2]
│   ├── Linear Equations (MATH-ALG-LIN) [Level 2]
│   ├── Quadratic Equations (MATH-ALG-QUAD) [Level 3]
│   └── Polynomials (MATH-ALG-POLY) [Level 3]
├── Geometry (MATH-GEO) [Level 2]
├── Statistics (MATH-STAT) [Level 3]
└── Calculus (MATH-CALC) [Level 4]

Science (SCI)
├── Biology (SCI-BIO) [Level 2]
│   ├── Cell Biology (SCI-BIO-CELL) [Level 2]
│   ├── Genetics (SCI-BIO-GEN) [Level 3]
│   └── Ecology (SCI-BIO-ECO) [Level 2]
├── Chemistry (SCI-CHEM) [Level 3]
├── Physics (SCI-PHYS) [Level 3]
└── Earth Science (SCI-EARTH) [Level 2]
```

### Grades

**Attributes:**
- `id`: UUID
- `name`: Grade name
- `code`: Grade code
- `level_order`: Absolute ordering (0-18+)
- `category`: K12, UNDERGRADUATE, GRADUATE, PROFESSIONAL
- `age_range`: Typical age range

**Grade Structure:**
```
K12 (level_order 0-12):
├── K (Kindergarten) - 5-6 years
├── 1-12 (Grades 1-12)

UNDERGRADUATE (level_order 13-16):
├── UG1-UG4 (Years 1-4)

GRADUATE (level_order 17):
├── GRAD (Masters/PhD)

PROFESSIONAL (level_order 18):
└── PROF (Continuing education)
```

---

## API Reference

### Taxonomy Endpoints

#### GET /api/taxonomy/subjects
Get all active subjects.

**Query Parameters:**
- `stats` (boolean): Include material/topic counts

**Example:**
```bash
curl -X GET "http://localhost:3000/api/taxonomy/subjects?stats=true" \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "id": "uuid",
        "name": "Mathematics",
        "code": "MATH",
        "description": "Mathematical concepts...",
        "topic_count": 8,
        "material_count": 42
      }
    ]
  }
}
```

#### GET /api/taxonomy/topics
Get topics, optionally filtered by subject.

**Query Parameters:**
- `subject` (string): Filter by subject code (e.g., "MATH")
- `stats` (boolean): Include statistics
- `parentOnly` (boolean): Only return parent topics (no sub-topics)

**Example:**
```bash
# Get all math topics with subtopic hierarchy
curl -X GET "http://localhost:3000/api/taxonomy/topics?subject=MATH" \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "id": "uuid",
        "topic_name": "Algebra",
        "topic_code": "MATH-ALG",
        "difficulty_level": 2,
        "subject_name": "Mathematics",
        "subject_code": "MATH",
        "subtopics": [
          {
            "id": "uuid",
            "name": "Linear Equations",
            "code": "MATH-ALG-LIN",
            "difficulty_level": 2
          }
        ]
      }
    ]
  }
}
```

#### GET /api/taxonomy/grades
Get all grade levels.

**Query Parameters:**
- `category` (string): Filter by category (K12, UNDERGRADUATE, GRADUATE, PROFESSIONAL)

**Example:**
```bash
# Get K12 grades only
curl -X GET "http://localhost:3000/api/taxonomy/grades?category=K12" \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "grades": [
      {
        "id": "uuid",
        "name": "Grade 8",
        "code": "8",
        "level_order": 8,
        "category": "K12",
        "age_range": "13-14 years"
      }
    ]
  }
}
```

#### GET /api/taxonomy/hierarchy
Get complete taxonomy structure.

**Response includes:**
- All subjects with their topics
- All grade categories with grades

```bash
curl -X GET "http://localhost:3000/api/taxonomy/hierarchy" \
  -H "Authorization: Bearer TOKEN"
```

---

## Material Categorization

### Upload Material with Categorization

**Endpoint:** `POST /api/materials`

**Form Data:**
```javascript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('title', 'Introduction to Algebra');
formData.append('description', 'Basic algebraic concepts');

// Taxonomy
formData.append('subjectIds', JSON.stringify(['math-uuid']));
formData.append('topicIds', JSON.stringify(['algebra-uuid', 'linear-eq-uuid']));
formData.append('gradeIds', JSON.stringify(['grade-8-uuid', 'grade-9-uuid']));

// Primary designations
formData.append('primarySubjectId', 'math-uuid');
formData.append('primaryGradeId', 'grade-8-uuid');

formData.append('isPublic', 'false');
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/materials \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@algebra_basics.pdf" \
  -F "title=Introduction to Algebra" \
  -F "description=Fundamental algebra concepts" \
  -F 'subjectIds=["subject-uuid-1"]' \
  -F 'topicIds=["topic-uuid-1","topic-uuid-2"]' \
  -F 'gradeIds=["grade-uuid-1","grade-uuid-2"]' \
  -F "primarySubjectId=subject-uuid-1" \
  -F "primaryGradeId=grade-uuid-1" \
  -F "isPublic=false"
```

### Update Material Categorization

**Endpoint:** `PUT /api/materials/:id`

**Request Body:**
```json
{
  "title": "Updated Title",
  "subjectIds": ["uuid1", "uuid2"],
  "topicIds": ["uuid3"],
  "gradeIds": ["uuid4", "uuid5"],
  "primarySubjectId": "uuid1",
  "primaryGradeId": "uuid4"
}
```

**Note:** All taxonomy fields are optional. Providing any taxonomy array will replace all existing assignments of that type.

---

## Filtering Materials

### Filter by Subject

```bash
curl -X GET "http://localhost:3000/api/materials?subject=MATH" \
  -H "Authorization: Bearer TOKEN"
```

### Filter by Topic

```bash
curl -X GET "http://localhost:3000/api/materials?topic=MATH-ALG" \
  -H "Authorization: Bearer TOKEN"
```

### Filter by Grade

```bash
curl -X GET "http://localhost:3000/api/materials?grade=8" \
  -H "Authorization: Bearer TOKEN"
```

### Filter by Grade Range

```bash
# Materials for grades 6-8
curl -X GET "http://localhost:3000/api/materials?minGrade=6&maxGrade=8" \
  -H "Authorization: Bearer TOKEN"
```

### Combined Filters

```bash
# Math materials for grade 8, sorted by difficulty
curl -X GET "http://localhost:3000/api/materials?subject=MATH&grade=8&difficulty=2" \
  -H "Authorization: Bearer TOKEN"
```

---

## Database Views

### materials_full_categorization

Complete material information with all taxonomy as JSON arrays.

```sql
SELECT * FROM materials_full_categorization 
WHERE id = 'material-uuid';
```

**Returns:**
```json
{
  "id": "uuid",
  "title": "Algebra Basics",
  "subjects": [
    {"id": "uuid", "name": "Mathematics", "code": "MATH", "is_primary": true}
  ],
  "topics": [
    {"id": "uuid", "name": "Algebra", "code": "MATH-ALG", "difficulty_level": 2}
  ],
  "grades": [
    {"id": "uuid", "name": "Grade 8", "code": "8", "level_order": 8, "is_primary": true}
  ]
}
```

### topics_with_subject

Topics with subject information and parent topic.

```sql
SELECT * FROM topics_with_subject 
WHERE subject_code = 'MATH';
```

### subject_statistics / topic_statistics

Subject and topic statistics with material counts.

```sql
-- Most popular subjects
SELECT * FROM subject_statistics 
ORDER BY material_count DESC;

-- Topics with most materials
SELECT * FROM topic_statistics 
ORDER BY material_count DESC 
LIMIT 10;
```

---

## Use Cases

### 1. Course Material Organization

**Scenario:** Organize materials for a Grade 8 Mathematics course.

1. Filter materials by subject=MATH and grade=8
2. Group by topics (Algebra, Geometry, etc.)
3. Order by difficulty level within each topic

### 2. Grade Level Progression

**Scenario:** Find materials suitable for grades 6-8.

```sql
SELECT m.* FROM materials m
JOIN material_grades mg ON m.id = mg.material_id
JOIN grades g ON mg.grade_id = g.id
WHERE g.level_order BETWEEN 6 AND 8
GROUP BY m.id;
```

### 3. Topic Prerequisites

**Scenario:** Find prerequisite materials for Calculus.

1. Get Calculus topic (MATH-CALC)
2. Find prerequisite topics (Algebra, Geometry)
3. Filter materials by those topics with lower difficulty

### 4. Cross-Subject Materials

**Scenario:** Materials that span multiple subjects.

```sql
SELECT m.title, COUNT(DISTINCT ms.subject_id) as subject_count
FROM materials m
JOIN material_subjects ms ON m.id = ms.material_id
GROUP BY m.id
HAVING COUNT(DISTINCT ms.subject_id) > 1;
```

---

## Admin Operations

### Create New Subject

**Endpoint:** `POST /api/taxonomy/subjects` (Requires materials:admin)

```bash
curl -X POST http://localhost:3000/api/taxonomy/subjects \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Business Studies",
    "code": "BUS",
    "description": "Business, economics, and entrepreneurship",
    "icon": "briefcase",
    "displayOrder": 8
  }'
```

### Create New Topic

```bash
curl -X POST http://localhost:3000/api/taxonomy/topics \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectId": "math-uuid",
    "name": "Trigonometry",
    "code": "MATH-TRIG",
    "description": "Study of triangles and periodic functions",
    "difficultyLevel": 3,
    "displayOrder": 6
  }'
```

### Create Sub-Topic

```bash
curl -X POST http://localhost:3000/api/taxonomy/topics \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectId": "math-uuid",
    "name": "Sine and Cosine",
    "code": "MATH-TRIG-SINCOS",
    "parentTopicId": "trig-uuid",
    "difficultyLevel": 3
  }'
```

---

## Best Practices

### 1. Primary Designations
- Always designate a primary subject when assigning multiple subjects
- Designate a primary grade level for the target audience

### 2. Topic Hierarchy
- Use parent topics for broad categorization
- Create sub-topics for specific concepts
- Keep hierarchy depth to 2-3 levels maximum

### 3. Difficulty Levels
- 1: Introductory/Basic
- 2: Intermediate
- 3: Advanced
- 4: Expert
- 5: Master/Research Level

### 4. Grade Ranges
- Use grade ranges for materials that span multiple levels
- Mark the primary grade as the target audience
- Include adjacent grades for differentiation

### 5. Cross-Referencing
- Assign multiple relevant topics to materials
- Use topic hierarchy to organize related concepts
- Tag interdisciplinary materials with all relevant subjects

---

## Migration from Categories

The old category system (`material_categories` and `material_tags`) is still supported for backward compatibility. To migrate:

1. Map categories to subjects/topics
2. Update materials with new taxonomy
3. Gradually phase out category usage

**Example Migration:**
```sql
-- Migrate "Lecture Notes" category to subject-based organization
UPDATE materials SET ...
WHERE id IN (
    SELECT material_id FROM material_tags mt
    JOIN material_categories mc ON mt.category_id = mc.id
    WHERE mc.name = 'Lecture Notes'
);
```

---

## Performance Considerations

### Indexes
All junction tables are indexed on foreign keys for fast lookups.

### Queries
Use the pre-built views for complex queries:
- `materials_full_categorization` - Complete material data
- `topics_with_subject` - Topic hierarchy
- `subject_statistics` - Aggregated stats

### Caching
Consider caching:
- Subject/topic/grade lists (rarely change)
- Taxonomy hierarchy
- Popular material combinations

---

## Summary

The categorization system provides:
✅ Normalized, multi-dimensional taxonomy  
✅ Hierarchical topic structure  
✅ Flexible many-to-many relationships  
✅ Primary subject/grade designation  
✅ Difficulty level scoring  
✅ Grade-level progression tracking  
✅ Comprehensive filtering and search  
✅ Statistical views and reporting  

Perfect for organizing educational materials at scale!
