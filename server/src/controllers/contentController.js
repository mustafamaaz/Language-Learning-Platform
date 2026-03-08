import * as contentService from "../services/contentService.js";
import {
  isPlainObject,
  validateJsonAgainstSchema,
} from "../validators/jsonSchemaValidator.js";

function normalize(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function formatAjvErrors(errors) {
  return errors.map((e) => ({
    message: e.message,
    instancePath: e.instancePath,
    schemaPath: e.schemaPath,
  }));
}

// ── Languages ──────────────────────────────────────────────

export async function listLanguages(_req, res) {
  const items = await contentService.listLanguages();
  res.json({ items });
}

export async function getAvailableTargets(req, res) {
  const code = normalize(req.params.code);
  if (!code) return res.status(400).json({ message: "Language code is required." });
  const items = await contentService.getAvailableTargets(code);
  res.json({ items });
}

export async function getAvailableSources(req, res) {
  const code = normalize(req.params.code);
  if (!code) return res.status(400).json({ message: "Language code is required." });
  const items = await contentService.getAvailableSources(code);
  res.json({ items });
}

// ── Curricula ──────────────────────────────────────────────

export async function listCurricula(_req, res) {
  const items = await contentService.listCurricula();
  res.json({ items });
}

export async function getCurriculum(req, res) {
  const sourceCode = normalize(req.params.sourceCode);
  const targetCode = normalize(req.params.targetCode);
  if (!sourceCode || !targetCode) {
    return res.status(400).json({ message: "sourceCode and targetCode are required." });
  }

  const record = await contentService.getCurriculum(sourceCode, targetCode);
  if (!record) {
    return res.status(404).json({ message: "Curriculum not found." });
  }
  return res.json(record);
}

export async function createCurriculum(req, res) {
  const sourceCode = normalize(req.params.sourceCode);
  const targetCode = normalize(req.params.targetCode);
  const schema = req.body?.schema;
  const data = req.body?.data;

  if (!sourceCode || !targetCode) {
    return res.status(400).json({ message: "sourceCode and targetCode are required." });
  }
  if (!schema || !isPlainObject(schema)) {
    return res.status(400).json({ message: "Schema must be a JSON object." });
  }
  if (!data || !isPlainObject(data)) {
    return res.status(400).json({ message: "Data must be a JSON object." });
  }

  const validation = validateJsonAgainstSchema(schema, data);
  if (!validation.valid) {
    return res.status(400).json({
      message: "Data does not match the provided schema.",
      errors: formatAjvErrors(validation.errors),
    });
  }

  const srcLang = data?.curriculum?.sourceLanguage;
  const tgtLang = data?.curriculum?.targetLanguage;
  if (srcLang?.code) {
    await contentService.upsertLanguage(srcLang.code, srcLang.name ?? srcLang.code, srcLang.nativeName ?? srcLang.code);
  }
  if (tgtLang?.code) {
    await contentService.upsertLanguage(tgtLang.code, tgtLang.name ?? tgtLang.code, tgtLang.nativeName ?? tgtLang.code);
  }

  const record = await contentService.createCurriculum(sourceCode, targetCode, schema, data);
  return res.status(201).json(record);
}

export async function updateCurriculumSchema(req, res) {
  const sourceCode = normalize(req.params.sourceCode);
  const targetCode = normalize(req.params.targetCode);
  const schema = req.body?.schema;

  if (!sourceCode || !targetCode) {
    return res.status(400).json({ message: "sourceCode and targetCode are required." });
  }
  if (!schema || !isPlainObject(schema)) {
    return res.status(400).json({ message: "Schema must be a JSON object." });
  }

  const existing = await contentService.getCurriculum(sourceCode, targetCode);
  if (!existing) {
    return res.status(404).json({ message: "Curriculum not found." });
  }

  const validation = validateJsonAgainstSchema(schema, existing.data);
  if (!validation.valid) {
    return res.status(400).json({
      message: "Existing data does not match the new schema.",
      errors: formatAjvErrors(validation.errors),
    });
  }

  const record = await contentService.updateCurriculumSchema(sourceCode, targetCode, schema);
  return res.json(record);
}

export async function updateCurriculumData(req, res) {
  const sourceCode = normalize(req.params.sourceCode);
  const targetCode = normalize(req.params.targetCode);
  const data = req.body?.data;

  if (!sourceCode || !targetCode) {
    return res.status(400).json({ message: "sourceCode and targetCode are required." });
  }
  if (!data || !isPlainObject(data)) {
    return res.status(400).json({ message: "Data must be a JSON object." });
  }

  const existing = await contentService.getCurriculum(sourceCode, targetCode);
  if (!existing) {
    return res.status(404).json({ message: "Curriculum not found." });
  }

  const validation = validateJsonAgainstSchema(existing.schema, data);
  if (!validation.valid) {
    return res.status(400).json({
      message: "Data does not match the stored schema.",
      errors: formatAjvErrors(validation.errors),
    });
  }

  const record = await contentService.updateCurriculumData(sourceCode, targetCode, data);
  return res.json(record);
}

export async function updateCurriculum(req, res) {
  const sourceCode = normalize(req.params.sourceCode);
  const targetCode = normalize(req.params.targetCode);
  const schema = req.body?.schema;
  const data = req.body?.data;

  if (!sourceCode || !targetCode) {
    return res.status(400).json({ message: "sourceCode and targetCode are required." });
  }
  if (!schema && !data) {
    return res.status(400).json({ message: "Provide schema or data to update." });
  }

  const existing = await contentService.getCurriculum(sourceCode, targetCode);
  if (!existing) {
    return res.status(404).json({ message: "Curriculum not found." });
  }

  const nextSchema = schema ?? existing.schema;
  const nextData = data ?? existing.data;

  if (!isPlainObject(nextSchema)) {
    return res.status(400).json({ message: "Schema must be a JSON object." });
  }
  if (!isPlainObject(nextData)) {
    return res.status(400).json({ message: "Data must be a JSON object." });
  }

  const validation = validateJsonAgainstSchema(nextSchema, nextData);
  if (!validation.valid) {
    return res.status(400).json({
      message: "Data does not match the schema.",
      errors: formatAjvErrors(validation.errors),
    });
  }

  const record = await contentService.updateCurriculum(sourceCode, targetCode, nextSchema, nextData);
  return res.json(record);
}

export async function getCurriculumSection(req, res) {
  const sourceCode = normalize(req.params.sourceCode);
  const targetCode = normalize(req.params.targetCode);
  const proficiencyId = normalize(req.params.proficiencyId);
  const sectionOrder = normalize(req.params.sectionOrder);

  if (!sourceCode || !targetCode || !proficiencyId || !sectionOrder) {
    return res.status(400).json({
      message: "sourceCode, targetCode, proficiencyId, and sectionOrder are required.",
    });
  }

  const result = await contentService.getCurriculumSection(
    sourceCode,
    targetCode,
    proficiencyId,
    sectionOrder
  );

  if (!result) {
    return res.status(404).json({ message: "Section not found." });
  }

  return res.json(result);
}

export async function deleteCurriculum(req, res) {
  const sourceCode = normalize(req.params.sourceCode);
  const targetCode = normalize(req.params.targetCode);
  if (!sourceCode || !targetCode) {
    return res.status(400).json({ message: "sourceCode and targetCode are required." });
  }

  const record = await contentService.deleteCurriculum(sourceCode, targetCode);
  if (!record) {
    return res.status(404).json({ message: "Curriculum not found." });
  }
  return res.json({
    message: "Curriculum deleted.",
    source_code: record.source_code,
    target_code: record.target_code,
  });
}
