"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { agentMetadata, catalog, gatewayById, gatewayMetadata, laneTooltips, modelById, performanceTooltips, permissionTooltips, presetMetadata, rulePacks } from "@/lib/catalog";
import { applyPreset, estimatedMonthlyCost, laneLabels } from "@/lib/config";
import { buildArtifacts, createZip } from "@/lib/generate";
import { validateConfig } from "@/lib/validate";
import type { AgentId, GatewayId, RoutingLaneId, WizardConfig } from "@/lib/types";
import { useWizard, wizardSteps } from "@/store/wizard";

const agentIds = Object.keys(agentMetadata) as AgentId[];
const gatewayIds = ["openrouter", "cloudflare", "vercel", "litellm", "portkey"] as GatewayId[];
const laneIds: RoutingLaneId[] = ["default", "background", "reasoning", "vision", "analysis"];

export function GeneratorStudio() {
  const { config, step, advanced, setAgents, setGateway, setPermissions, setPerformance, setPrimaryModel, toggleRulePack, setStep, setAdvanced, importConfig, reset } = useWizard();
  const [copyState, setCopyState] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const issues = useMemo(() => validateConfig(config), [config]);
  const blockingIssues = issues.filter((issue) => issue.severity === "error");
  const artifacts = useMemo(() => buildArtifacts(config), [config]);
  const monthlyCost = useMemo(() => estimatedMonthlyCost(config), [config]);

  const updateConfig = (next: WizardConfig) => importConfig(next);

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "uac.config.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadZip = async () => {
    const blob = await createZip(config);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "universal-agent-config.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyArtifact = async (path: string, contents: string) => {
    await navigator.clipboard.writeText(contents);
    setCopyState(path);
    setTimeout(() => setCopyState(null), 1800);
  };

  return (
  <TooltipProvider delayDuration={150}>
    <main className="min-h-screen studio-grid">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
        <header className="studio-panel flex flex-col gap-4 rounded-3xl p-5 lg:flex-row lg:items-center lg:justify-between lg:p-7">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-lime-200/70">Configuration studio</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
              Build the perfect config for every coding agent.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/58 sm:text-base">
              Seven agents. Five gateways. One guided page. Generate native config, validate model capabilities, and download a ready-to-copy ZIP.
            </p>
          </div>
          <div className="grid gap-2 font-mono text-xs text-white/55">
            <span>Catalog {catalog.updated}</span>
            <span>{catalog.models.length} verified models</span>
            <span className="text-lime-200">Client-only · no keys collected</span>
          </div>
        </header>


        <section className="studio-panel grid gap-4 rounded-3xl p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-7">
          <div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-lime-200/70">Live generation pipeline</p>
              <Tooltip content="Every option below flows through this deterministic client-side pipeline. Nothing is sent to a server, and no keys are requested.">
                <span aria-hidden="true" className="grid size-5 cursor-help place-items-center rounded-full border border-white/15 font-mono text-[10px] text-white/50">?</span>
              </Tooltip>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {[
                { label: "Policy", value: config.preset, detail: "Preset + permissions" },
                { label: "Gateway", value: gatewayById.get(config.gateway)?.name, detail: "Transport and model naming" },
                { label: "Lanes", value: `${Object.keys(config.lanes).length}`, detail: "Primary and fallback models" },
                { label: "Validation", value: `${issues.length} issue${issues.length === 1 ? "" : "s"}`, detail: "Capability and safety checks" },
                { label: "Artifacts", value: `${artifacts.length}`, detail: "Native files in ZIP" },
              ].map((node, index) => (
                <div key={node.label} className="relative rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">{String(index + 1).padStart(2, "0")} · {node.label}</p>
                  <p className="mt-2 truncate text-sm font-medium text-white">{node.value}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/45">{node.detail}</p>
                  {index < 4 && <span aria-hidden="true" className="absolute -right-2 top-1/2 hidden h-px w-4 bg-lime-300/30 sm:block" />}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.06] p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-lime-200/70">Estimated monthly</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-lime-100">${monthlyCost.toFixed(2)}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">Modeled at 10M input / 1M output tokens using current catalog prices. Excludes cache savings.</p>
          </div>
        </section>

        <div className="grid min-h-[calc(100vh-190px)] gap-6 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
          <nav aria-label="Wizard steps" className="studio-panel h-fit rounded-3xl p-3">
            <ol className="grid gap-1">
              {wizardSteps.map((name, index) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => setStep(index)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-mono text-xs transition ${
                      index === step ? "bg-lime-300/12 text-lime-100" : "text-white/55 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{name}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <section aria-live="polite" className="studio-panel flex min-h-[540px] flex-col rounded-3xl p-5 lg:p-7">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-lime-200/70">{`step ${step + 1}/${wizardSteps.length}`}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{wizardSteps[step]}</h2>
              </div>
              <label className="flex items-center gap-2 font-mono text-xs text-white/55">
                <span>Advanced</span>
                <Switch checked={advanced} onCheckedChange={setAdvanced} aria-label="Toggle advanced settings" />
              </label>
            </div>

            <div className="flex-1">
              {step === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(presetMetadata).map(([id, preset]) => (
                    <Card
                      key={id}
                      as="button"
                      type="button"
                      onClick={() => updateConfig(applyPreset(id, config))}
                      className={`p-5 text-left hover:border-lime-300/40 ${config.preset === id ? "border-lime-300/50 bg-lime-300/10" : ""}`}
                    >
                      <CardTitle>{preset.name}</CardTitle>
                      <CardDescription className="mt-2">{preset.goal}</CardDescription>
                      <div className="mt-4 grid gap-1 font-mono text-[11px] text-white/45">
                        <span>cost · {preset.costPosture}</span>
                        <span>safety · {preset.safetyPosture}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1">
                        {preset.recommendedAgents.map((agentId) => (
                          <span key={agentId} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/45">{agentMetadata[agentId].name}</span>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {agentIds.map((id) => {
                    const agent = agentMetadata[id];
                    const selected = config.agents.includes(id);
                    return (
                      <Card
                        key={id}
                        as="button"
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setAgents(selected ? config.agents.filter((agent) => agent !== id) : [...config.agents, id])}
                        className={`p-5 hover:border-lime-300/40 ${selected ? "border-lime-300/50 bg-lime-300/10" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <Image src={agent.logo} alt="" width={38} height={38} className="rounded-lg bg-white/5 p-1" />
                          <div>
                            <CardTitle>{agent.name}</CardTitle>
                            <CardDescription className="mt-1 font-mono text-xs">{agent.version}</CardDescription>
                          </div>
                        </div>
                        <CardDescription className="mt-4">{agent.notes.join(" ")}</CardDescription>
                        <div className="mt-4 grid gap-2">
                          {agent.outputs.map((output) => (
                            <div key={output.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/25 px-2 py-1.5">
                              <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{output.label}</span>
                              <span className="truncate font-mono text-[10px] text-lime-100/75">{output.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 font-mono text-[11px] text-white/45">{agent.files.join(" · ")}</div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-3">
                  {gatewayIds.map((id) => {
                    const gateway = gatewayById.get(id)!;
                    const selected = config.gateway === id;
                    return (
                      <Card
                        key={id}
                        as="button"
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setGateway(id)}
                        className={`p-5 text-left hover:border-lime-300/40 ${selected ? "border-lime-300/50 bg-lime-300/10" : ""}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Image src={gatewayMetadata[id].logo} alt="" width={28} height={28} className="text-white/70" />
                            <CardTitle>{gateway.name}</CardTitle>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/50">{gateway.category}</span>
                        </div>
                        <CardDescription className="mt-3">{gateway.best_for?.join(" · ")}</CardDescription>
                        <div className="mt-4 grid gap-1 font-mono text-[11px] text-white/45">
                          <span>protocol · {gateway.protocol}</span>
                          <span>model · {gateway.model_format}</span>
                          <span>auth · {gateway.api_key_env}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  {laneIds.map((lane) => {
                    const selected = modelById.get(config.lanes[lane].primary);
                    return (
                      <div key={lane} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{laneLabels[lane]}</h3>
                              <Tooltip content={laneTooltips[lane]}>
                                <span aria-hidden="true" className="grid size-5 cursor-help place-items-center rounded-full border border-white/15 font-mono text-[10px] text-white/50">?</span>
                              </Tooltip>
                            </div>
                            <p className="font-mono text-xs text-white/45">{config.lanes[lane].primary}</p>
                          </div>
                          <div className="font-mono text-[11px] text-white/45">
                            {selected ? `${(selected.contextWindow / 1024).toFixed(0)}K ctx · tools ${selected.supportsTools ? "yes" : "no"} · vision ${selected.supportsVision ? "yes" : "no"}` : "unverified custom model"}
                          </div>
                        </div>
                        <label className="mt-4 block">
                          <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">Primary model</span>
                          <Tooltip content="Primary models receive the lane's normal traffic. Fallback models are used in order when the primary fails.">
                            <span aria-hidden="true" className="ml-1 grid size-4 cursor-help place-items-center rounded-full border border-white/15 font-mono text-[9px] text-white/45">?</span>
                          </Tooltip>
                          <select
                            value={config.lanes[lane].primary}
                            onChange={(event) => setPrimaryModel(lane, event.target.value)}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-lime-300/50 focus:outline-none"
                          >
                            {catalog.models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.displayName} · {model.id}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {config.lanes[lane].fallbacks.map((fallback) => (
                            <span key={fallback} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/55">
                              fallback · {fallback}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-3">
                  {(Object.entries(config.permissions) as Array<[keyof WizardConfig["permissions"], boolean]>).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{key}</span>
                        <Tooltip content={permissionTooltips[key]}>
                          <span aria-hidden="true" className="grid size-5 cursor-help place-items-center rounded-full border border-white/15 font-mono text-[10px] text-white/50">?</span>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => setPermissions({ ...config.permissions, [key]: checked })}
                        aria-label={key}
                      />
                    </label>
                  ))}
                </div>
              )}

              {step === 5 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.entries(config.performance) as Array<[keyof WizardConfig["performance"], number | boolean | string]>).map(([key, value]) => (
                    <label key={key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase tracking-widest text-white/40">{key}</span>
                        <Tooltip content={performanceTooltips[key]}>
                          <span aria-hidden="true" className="grid size-5 cursor-help place-items-center rounded-full border border-white/15 font-mono text-[10px] text-white/50">?</span>
                        </Tooltip>
                      </div>
                      <input
                        value={String(value)}
                        type={typeof value === "number" ? "number" : "text"}
                        onChange={(event) =>
                          setPerformance({
                            ...config.performance,
                            [key]: typeof value === "number" ? Number(event.target.value) : event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm focus:border-lime-300/50 focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              )}

              {step === 6 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {rulePacks.map((pack) => (
                    <Card
                      key={pack.id}
                      as="button"
                      type="button"
                      aria-pressed={config.rulePacks.includes(pack.id)}
                      onClick={() => toggleRulePack(pack.id)}
                      className={`p-4 hover:border-lime-300/40 ${config.rulePacks.includes(pack.id) ? "border-lime-300/50 bg-lime-300/10" : ""}`}
                    >
                      <CardTitle>{pack.name}</CardTitle>
                      <CardDescription className="mt-2">{pack.description}</CardDescription>
                      <div className="mt-4 font-mono text-[10px] text-white/35">alwaysApply · {String(pack.alwaysApply)}</div>
                    </Card>
                  ))}
                </div>
              )}

              {step === 7 && (
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryTile label="Preset" value={config.preset} />
                    <SummaryTile label="Agents" value={String(config.agents.length)} />
                    <SummaryTile label="Estimated monthly" value={`$${monthlyCost.toFixed(2)}`} />
                  </div>
                  {issues.map((issue, index) => (
                    <div key={`${issue.affectedOption}-${index}`} className={`rounded-2xl border p-4 ${issue.severity === "error" ? "border-red-400/30 bg-red-400/10" : "border-amber-300/25 bg-amber-300/10"}`}>
                      <p className="font-mono text-xs uppercase tracking-widest">{issue.severity}</p>
                      <p className="mt-2 text-sm">{issue.message}</p>
                      {issue.suggestedFix && <p className="mt-1 text-xs text-white/55">{issue.suggestedFix}</p>}
                    </div>
                  ))}
                </div>
              )}

              {step === 8 && (
                <div className="grid gap-4">
                  {blockingIssues.length > 0 ? (
                    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
                      <p className="font-semibold">Fix blocking issues before downloading.</p>
                      <ul className="mt-3 grid gap-2 text-sm text-white/70">
                        {blockingIssues.map((issue) => <li key={issue.message}>{issue.message}</li>)}
                      </ul>
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-200/70">Artifact graph</p>
                          <Tooltip content="Each artifact is derived from your current policy, gateway, lanes, permissions, performance, and selected rule packs.">
                            <span aria-hidden="true" className="grid size-5 cursor-help place-items-center rounded-full border border-white/15 font-mono text-[10px] text-white/50">?</span>
                          </Tooltip>
                        </div>
                        {artifacts.map((artifact) => (
                          <div key={artifact.path} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <p className="truncate font-mono text-xs text-white">{artifact.path}</p>
                            <p className="mt-2 text-[11px] leading-relaxed text-white/45">{artifact.description}</p>
                            <div className="mt-3 flex flex-wrap gap-1">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-lime-100/70">{artifact.language}</span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/45">{artifact.adapter}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    <Tabs defaultValue={artifacts[0]?.path}>
                      <TabsList>
                        {artifacts.map((artifact) => <TabsTrigger key={artifact.path} value={artifact.path}>{artifact.path.split("/").pop()}</TabsTrigger>)}
                      </TabsList>
                      {artifacts.map((artifact) => (
                        <TabsContent key={artifact.path} value={artifact.path} className="mt-4">
                          <div className="flex items-center justify-between gap-3 rounded-t-2xl border border-white/10 bg-white/5 px-4 py-3">
                            <span className="font-mono text-xs text-white/55">{artifact.path}</span>
                            <Button size="sm" variant="primary" onClick={() => copyArtifact(artifact.path, artifact.contents)}>
                              {copyState === artifact.path ? "Copied" : "Copy"}
                            </Button>
                          </div>
                          <pre className="studio-code max-h-[430px] overflow-auto rounded-b-2xl border border-t-0 border-white/10 bg-black/50 p-4 font-mono text-xs leading-relaxed text-lime-100">
                            <code>{artifact.contents}</code>
                          </pre>
                        </TabsContent>
                      ))}
                    </Tabs>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent pt-4">
              <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={reset}>Reset</Button>
                {step < wizardSteps.length - 1 ? (
                  <Button variant="primary" onClick={() => setStep(Math.min(wizardSteps.length - 1, step + 1))}>Next</Button>
                ) : (
                  <Button variant="primary" onClick={downloadZip} disabled={blockingIssues.length > 0}>Download ZIP</Button>
                )}
              </div>
            </div>
          </section>

          <aside className="studio-panel h-fit rounded-3xl p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.24em] text-lime-200/70">Live config</h2>
            <div className="mt-5 grid gap-4">
              <SummaryTile label="Gateway" value={gatewayById.get(config.gateway)?.name ?? config.gateway} />
              <SummaryTile label="Primary" value={config.lanes.default.primary} />
              <SummaryTile label="Background" value={config.lanes.background.primary} />
              <SummaryTile label="Reasoning" value={config.lanes.reasoning.primary} />
              <SummaryTile label="Vision" value={config.lanes.vision.primary} />
              <SummaryTile label="Files" value={String(artifacts.length)} />
              <SummaryTile label="Estimated monthly" value={`$${monthlyCost.toFixed(2)}`} />
            </div>
            <div className="mt-6 grid gap-2">
              <Button size="sm" variant="secondary" onClick={exportConfig}>Export uac.config.json</Button>
              <Button size="sm" variant="secondary" onClick={() => importInputRef.current?.click()}>Import config</Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const imported = JSON.parse(await file.text()) as WizardConfig;
                  updateConfig(imported);
                }}
              />
            </div>
            <p className="mt-5 text-xs leading-relaxed text-white/45">
              Your configuration stays in this browser. No API keys are requested, stored, or included in generated files.
            </p>
          </aside>
        </div>
      </div>
    </main>
  </TooltipProvider>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-2 truncate font-mono text-sm text-white">{value}</p>
    </div>
  );
}
