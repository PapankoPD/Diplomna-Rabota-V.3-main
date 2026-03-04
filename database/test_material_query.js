const { query } = require('../src/config/database');

async function test() {
    try {
        const r = await query(`
            SELECT m.id, m.title, m.description, m.file_name, m.file_type,
                m.file_size, m.is_public, m.download_count, m.average_rating,
                m.rating_count, m.uploaded_by, u.username AS uploader_username,
                u.email AS uploader_email, m.created_at, m.updated_at,
                COALESCE(
                    (SELECT json_group_array(json_object('id', mc.id, 'name', mc.name))
                     FROM material_tags mt
                     JOIN material_categories mc ON mt.category_id = mc.id
                     WHERE mt.material_id = m.id),
                    '[]'
                ) AS categories
            FROM materials m
            LEFT JOIN users u ON m.uploaded_by = u.id
            WHERE m.id = $1
        `, [46]);
        console.log('SUCCESS:', JSON.stringify(r.rows[0]));
    } catch (e) {
        console.error('QUERY FAILED:', e.message);
    }
    process.exit(0);
}
test();
