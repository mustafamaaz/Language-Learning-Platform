import { useEffect, useMemo, useState } from "react";
import {
  createCurriculum,
  deleteCurriculum,
  getCurriculum,
  getSampleResources,
  getSampleSchema,
  listCurricula,
  updateCurriculum,
  updateCurriculumData,
  updateCurriculumSchema,
} from "@/lib/api";
import type { LanguagePair } from "@/types/curriculum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TopNav } from "@/components/TopNav";

type Status = {
  type: "success" | "error";
  message: string;
};

type ActivePair = { sourceCode: string; targetCode: string } | null;

const EMPTY_JSON = "{\n}\n";

function pairLabel(p: LanguagePair) {
  return `${p.source_name} → ${p.target_name}`;
}

function pairId(p: { source_code: string; target_code: string }) {
  return `${p.source_code}:${p.target_code}`;
}

export function PlaygroundPage() {
  const [pairs, setPairs] = useState<LanguagePair[]>([]);
  const [activePair, setActivePair] = useState<ActivePair>(null);
  const [sourceInput, setSourceInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [schemaText, setSchemaText] = useState(EMPTY_JSON);
  const [dataText, setDataText] = useState(EMPTY_JSON);
  const [status, setStatus] = useState<Status | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const statusTone = useMemo(() => {
    if (!status) return "text-slate-600";
    return status.type === "error" ? "text-rose-600" : "text-emerald-600";
  }, [status]);

  const loadPairs = async () => {
    const items = await listCurricula();
    setPairs(items);
  };

  useEffect(() => {
    loadPairs().catch((error) => {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    });
  }, []);

  const resetEditor = () => {
    setActivePair(null);
    setSourceInput("");
    setTargetInput("");
    setSchemaText(EMPTY_JSON);
    setDataText(EMPTY_JSON);
  };

  const showStatus = (type: Status["type"], message: string) => {
    setStatus({ type, message });
  };

  const loadPairData = async (sourceCode: string, targetCode: string) => {
    setIsBusy(true);
    try {
      const record = await getCurriculum(sourceCode, targetCode);
      setActivePair({ sourceCode: record.source_code, targetCode: record.target_code });
      setSourceInput(record.source_code);
      setTargetInput(record.target_code);
      setSchemaText(JSON.stringify(record.schema, null, 2));
      setDataText(JSON.stringify(record.data, null, 2));
      showStatus("success", `Loaded ${record.source_code} → ${record.target_code}`);
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  };

  const parseJson = (label: string, value: string) => {
    try {
      return { ok: true as const, value: JSON.parse(value) };
    } catch {
      showStatus("error", `${label} JSON is invalid.`);
      return { ok: false as const };
    }
  };

  const handleCreate = async () => {
    const src = sourceInput.trim();
    const tgt = targetInput.trim();
    if (!src || !tgt) {
      showStatus("error", "Source and target language codes are required.");
      return;
    }

    const schemaResult = parseJson("Schema", schemaText);
    if (!schemaResult.ok) return;

    const dataResult = parseJson("Data", dataText);
    if (!dataResult.ok) return;

    setIsBusy(true);
    try {
      const record = await createCurriculum(src, tgt, {
        schema: schemaResult.value,
        data: dataResult.value,
      });
      setActivePair({ sourceCode: record.source_code, targetCode: record.target_code });
      await loadPairs();
      showStatus("success", `Created ${record.source_code} → ${record.target_code}`);
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  };

  const getActiveOrInputPair = (): { src: string; tgt: string } | null => {
    const src = activePair?.sourceCode || sourceInput.trim();
    const tgt = activePair?.targetCode || targetInput.trim();
    if (!src || !tgt) {
      showStatus("error", "Select a curriculum pair first.");
      return null;
    }
    return { src, tgt };
  };

  const handleSaveSchema = async () => {
    const p = getActiveOrInputPair();
    if (!p) return;

    const schemaResult = parseJson("Schema", schemaText);
    if (!schemaResult.ok) return;

    setIsBusy(true);
    try {
      const record = await updateCurriculumSchema(p.src, p.tgt, schemaResult.value);
      setActivePair({ sourceCode: record.source_code, targetCode: record.target_code });
      await loadPairs();
      showStatus("success", `Updated schema for ${p.src} → ${p.tgt}`);
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveData = async () => {
    const p = getActiveOrInputPair();
    if (!p) return;

    const dataResult = parseJson("Data", dataText);
    if (!dataResult.ok) return;

    setIsBusy(true);
    try {
      const record = await updateCurriculumData(p.src, p.tgt, dataResult.value);
      setActivePair({ sourceCode: record.source_code, targetCode: record.target_code });
      await loadPairs();
      showStatus("success", `Updated data for ${p.src} → ${p.tgt}`);
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveAll = async () => {
    const p = getActiveOrInputPair();
    if (!p) return;

    const schemaResult = parseJson("Schema", schemaText);
    if (!schemaResult.ok) return;

    const dataResult = parseJson("Data", dataText);
    if (!dataResult.ok) return;

    setIsBusy(true);
    try {
      const record = await updateCurriculum(p.src, p.tgt, {
        schema: schemaResult.value,
        data: dataResult.value,
      });
      setActivePair({ sourceCode: record.source_code, targetCode: record.target_code });
      await loadPairs();
      showStatus("success", `Updated ${p.src} → ${p.tgt}`);
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    const p = getActiveOrInputPair();
    if (!p) return;

    setIsBusy(true);
    try {
      await deleteCurriculum(p.src, p.tgt);
      await loadPairs();
      resetEditor();
      showStatus("success", `Deleted ${p.src} → ${p.tgt}`);
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLoadSchemaSample = async () => {
    setIsBusy(true);
    try {
      const schema = await getSampleSchema();
      setSchemaText(JSON.stringify(schema, null, 2));
      showStatus("success", "Loaded schema.json sample.");
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLoadDataSample = async (file: "default" | "en-en" = "default") => {
    setIsBusy(true);
    try {
      const data = await getSampleResources(file);
      setDataText(JSON.stringify(data, null, 2));
      const src = data?.curriculum?.sourceLanguage?.code;
      const tgt = data?.curriculum?.targetLanguage?.code;
      if (typeof src === "string") setSourceInput(src);
      if (typeof tgt === "string") setTargetInput(tgt);
      showStatus(
        "success",
        file === "en-en" ? "Loaded resources-en-en.json (en→en)." : "Loaded resources.json sample."
      );
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_55%),radial-gradient(circle_at_20%_80%,#e0f2fe,transparent_45%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
        <TopNav />

        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Admin Console
          </p>
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Curriculum Database Playground
          </h2>
          <p className="max-w-2xl text-base text-slate-600">
            Manage language-pair curricula stored in Postgres. Each curriculum
            maps a source language (what you speak) to a target language (what
            you learn). The API validates every payload against its JSON schema
            before saving.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Curricula</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  loadPairs().catch((error) =>
                    showStatus(
                      "error",
                      error instanceof Error ? error.message : "Unknown error"
                    )
                  )
                }
              >
                Refresh
              </Button>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {pairs.length === 0 ? (
                <p className="text-sm text-slate-500">No curricula yet.</p>
              ) : (
                pairs.map((item) => {
                  const id = pairId(item);
                  const isActive =
                    activePair != null &&
                    `${activePair.sourceCode}:${activePair.targetCode}` === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        loadPairData(item.source_code, item.target_code)
                      }
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition hover:border-slate-300 hover:bg-slate-50 ${
                        isActive
                          ? "border-slate-400 bg-slate-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {pairLabel(item)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.source_code} → {item.target_code} &middot;
                          Updated{" "}
                          {new Date(item.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        View
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={resetEditor}
                disabled={isBusy}
              >
                New Draft
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isBusy}
              >
                Delete
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Source Language Code
                  </label>
                  <Input
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder="e.g. en, ur"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Target Language Code
                  </label>
                  <Input
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="e.g. de, en"
                  />
                </div>
                <Button onClick={handleCreate} disabled={isBusy}>
                  Create Curriculum
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      JSON Schema
                    </label>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleLoadSchemaSample}
                      disabled={isBusy}
                    >
                      Load schema.json
                    </Button>
                  </div>
                  <Textarea
                    value={schemaText}
                    onChange={(e) => setSchemaText(e.target.value)}
                    className="min-h-[320px] font-mono text-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleSaveSchema}
                      disabled={isBusy}
                    >
                      Update Schema
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      JSON Data
                    </label>
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleLoadDataSample("default")}
                        disabled={isBusy}
                      >
                        Load en→de
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleLoadDataSample("en-en")}
                        disabled={isBusy}
                      >
                        Load en→en
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={dataText}
                    onChange={(e) => setDataText(e.target.value)}
                    className="min-h-[320px] font-mono text-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleSaveData}
                      disabled={isBusy}
                    >
                      Update Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className={`text-sm ${statusTone}`}>
                  {status?.message || "Ready."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveAll} disabled={isBusy}>
                    Save Schema + Data
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
