import pool from "../db/pool.js";

// ── Languages ──────────────────────────────────────────────

export async function listLanguages() {
  const { rows } = await pool.query(
    "SELECT code, name, native_name FROM languages ORDER BY code"
  );
  return rows;
}

export async function upsertLanguage(code, name, nativeName) {
  const { rows } = await pool.query(
    `INSERT INTO languages (code, name, native_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (code) DO UPDATE SET name = $2, native_name = $3
     RETURNING code, name, native_name`,
    [code, name, nativeName]
  );
  return rows[0];
}

export async function getAvailableTargets(sourceCode) {
  const { rows } = await pool.query(
    `SELECT l.code, l.name, l.native_name
     FROM curricula c JOIN languages l ON l.code = c.target_code
     WHERE c.source_code = $1
     ORDER BY l.code`,
    [sourceCode]
  );
  return rows;
}

export async function getAvailableSources(targetCode) {
  const { rows } = await pool.query(
    `SELECT l.code, l.name, l.native_name
     FROM curricula c JOIN languages l ON l.code = c.source_code
     WHERE c.target_code = $1
     ORDER BY l.code`,
    [targetCode]
  );
  return rows;
}

// ── Curricula ──────────────────────────────────────────────

export async function listCurricula() {
  const { rows } = await pool.query(
    `SELECT
       c.source_code, c.target_code,
       sl.name AS source_name, sl.native_name AS source_native_name,
       tl.name AS target_name, tl.native_name AS target_native_name,
       c.created_at, c.updated_at
     FROM curricula c
     JOIN languages sl ON sl.code = c.source_code
     JOIN languages tl ON tl.code = c.target_code
     ORDER BY c.source_code, c.target_code`
  );
  return rows;
}

export async function getCurriculum(sourceCode, targetCode) {
  const { rows } = await pool.query(
    `SELECT source_code, target_code, "schema", data, created_at, updated_at
     FROM curricula
     WHERE source_code = $1 AND target_code = $2`,
    [sourceCode, targetCode]
  );
  return rows[0];
}

export async function createCurriculum(sourceCode, targetCode, schema, data) {
  const { rows } = await pool.query(
    `INSERT INTO curricula (source_code, target_code, "schema", data)
     VALUES ($1, $2, $3, $4)
     RETURNING source_code, target_code, "schema", data, created_at, updated_at`,
    [sourceCode, targetCode, schema, data]
  );
  return rows[0];
}

export async function updateCurriculumSchema(sourceCode, targetCode, schema) {
  const { rows } = await pool.query(
    `UPDATE curricula SET "schema" = $3
     WHERE source_code = $1 AND target_code = $2
     RETURNING source_code, target_code, "schema", data, created_at, updated_at`,
    [sourceCode, targetCode, schema]
  );
  return rows[0];
}

export async function updateCurriculumData(sourceCode, targetCode, data) {
  const { rows } = await pool.query(
    `UPDATE curricula SET data = $3
     WHERE source_code = $1 AND target_code = $2
     RETURNING source_code, target_code, "schema", data, created_at, updated_at`,
    [sourceCode, targetCode, data]
  );
  return rows[0];
}

export async function updateCurriculum(sourceCode, targetCode, schema, data) {
  const { rows } = await pool.query(
    `UPDATE curricula SET "schema" = $3, data = $4
     WHERE source_code = $1 AND target_code = $2
     RETURNING source_code, target_code, "schema", data, created_at, updated_at`,
    [sourceCode, targetCode, schema, data]
  );
  return rows[0];
}

export async function getCurriculumSection(sourceCode, targetCode, proficiencyId, sectionOrder) {
  const { rows } = await pool.query(
    `SELECT source_code, target_code, data, created_at, updated_at
     FROM curricula
     WHERE source_code = $1 AND target_code = $2`,
    [sourceCode, targetCode]
  );
  if (!rows[0]) return null;

  const curriculum = rows[0].data?.curriculum;
  if (!curriculum) return null;

  const proficiency = curriculum.proficiencyLevels?.find(
    (p) => p.id === proficiencyId
  );
  if (!proficiency) return null;

  const section = proficiency.sections?.find(
    (s) => s.order === Number(sectionOrder)
  );
  if (!section) return null;

  return {
    source_code: rows[0].source_code,
    target_code: rows[0].target_code,
    proficiency: {
      id: proficiency.id,
      name: proficiency.name,
      cefrLevel: proficiency.cefrLevel,
      order: proficiency.order,
    },
    section,
    updated_at: rows[0].updated_at,
  };
}

export async function deleteCurriculum(sourceCode, targetCode) {
  const { rows } = await pool.query(
    `DELETE FROM curricula
     WHERE source_code = $1 AND target_code = $2
     RETURNING source_code, target_code`,
    [sourceCode, targetCode]
  );
  return rows[0];
}
