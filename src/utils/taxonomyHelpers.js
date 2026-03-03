// Helper function to parse and handle taxonomy IDs from upload
function parseTaxonomyIds(req) {
    const result = {
        categoryIds: [],
        subjectIds: [],
        topicIds: [],
        gradeIds: [],
        classIds: [],
        primarySubjectId: null,
        primaryGradeId: null
    };

    // Parse categoryIds
    if (req.body.categoryIds) {
        result.categoryIds = typeof req.body.categoryIds === 'string'
            ? JSON.parse(req.body.categoryIds)
            : req.body.categoryIds;
    }

    // Parse subjectIds
    if (req.body.subjectIds) {
        result.subjectIds = typeof req.body.subjectIds === 'string'
            ? JSON.parse(req.body.subjectIds)
            : req.body.subjectIds;
    }

    // Parse topicIds
    if (req.body.topicIds) {
        result.topicIds = typeof req.body.topicIds === 'string'
            ? JSON.parse(req.body.topicIds)
            : req.body.topicIds;
    }

    // Parse gradeIds
    if (req.body.gradeIds) {
        result.gradeIds = typeof req.body.gradeIds === 'string'
            ? JSON.parse(req.body.gradeIds)
            : req.body.gradeIds;
    }

    // Parse classIds (grade class IDs)
    if (req.body.classIds) {
        result.classIds = typeof req.body.classIds === 'string'
            ? JSON.parse(req.body.classIds)
            : req.body.classIds;
    }

    // Primary IDs
    result.primarySubjectId = req.body.primarySubjectId || null;
    result.primaryGradeId = req.body.primaryGradeId || null;

    return result;
}

// Helper to assign taxonomy to material
async function assignTaxonomy(client, materialId, taxonomy) {
    const { categoryIds, subjectIds, topicIds, gradeIds, classIds, primarySubjectId, primaryGradeId } = taxonomy;

    // Assign subjects
    if (subjectIds && Array.isArray(subjectIds) && subjectIds.length > 0) {
        for (const subjectId of subjectIds) {
            const isPrimary = subjectId === primarySubjectId;
            await client.query(
                'INSERT INTO material_subjects (material_id, subject_id, is_primary) VALUES ($1, $2, $3)',
                [materialId, subjectId, isPrimary]
            );
        }
    }

    // Assign topics
    if (topicIds && Array.isArray(topicIds) && topicIds.length > 0) {
        for (const topicId of topicIds) {
            await client.query(
                'INSERT INTO material_topics (material_id, topic_id) VALUES ($1, $2)',
                [materialId, topicId]
            );
        }
    }

    // Assign grades
    if (gradeIds && Array.isArray(gradeIds) && gradeIds.length > 0) {
        for (const gradeId of gradeIds) {
            const isPrimary = gradeId === primaryGradeId;
            await client.query(
                'INSERT INTO material_grades (material_id, grade_id, is_primary) VALUES ($1, $2, $3)',
                [materialId, gradeId, isPrimary]
            );
        }
    }

    // Assign grade classes
    if (classIds && Array.isArray(classIds) && classIds.length > 0) {
        for (const classId of classIds) {
            await client.query(
                'INSERT OR IGNORE INTO material_grade_classes (material_id, class_id) VALUES ($1, $2)',
                [materialId, classId]
            );
        }
    }

    // Assign categories (legacy support)
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        for (const categoryId of categoryIds) {
            await client.query(
                'INSERT INTO material_tags (material_id, category_id) VALUES ($1, $2)',
                [materialId, categoryId]
            );
        }
    }
}

module.exports = {
    parseTaxonomyIds,
    assignTaxonomy
};

