"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import {
  agentMetadata,
  catalog,
  frontierTooltips,
  gatewayById,
  gatewayMetadata,
  laneTooltips,
  modelById,
  performanceTooltips,
  permissionTooltips,
  presetMetadata,
  routingTooltips,
  rulePacks,
  verificationTooltips,
} from "@/lib/catalog";
import { applyPreset, estimatedMonthlyCost, laneLabels } from "@/lib/config";
import { buildArtifacts, createZip } from "@/lib/generate";
import { validateConfig } from "@/lib/validate";
import type { AgentId, GatewayId, RoutingLaneId, WizardConfig } from "@/lib/types";
import { useWizard, wizardSteps } from "@/store/wizard";

const agentIds = Object.keys(agentMetadata) as AgentId[];
const gatewayIds = ["openrouter", "cloudflare", "vercel", "litellm", "portkey"] as GatewayId[];
const laneIds: RoutingLaneId[] = ["default", "background", "reasoning", "vision", "analysis"];

export function GeneratorStudio() {
  const {
    config,
    step,
    advanced,
    setAgents,
    setGateway,
    setPermissions,
    setPerformance,
    setRouting,
    setFrontier,
    setVerification,
    setPrimaryModel,
    toggleRulePack,
    setStep,
    setAdvanced,
    importConfig,
    reset,
  } = useWizard();
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
      <main className="relative min-h-screen overflow-hidden bg-canvas">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(80%_100%_at_50%_0%,rgba(70,109,58,0.16),transparent_70%)]" />
        <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 lg:px-10 lg:py-10">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-accent">
                <span className="size-2 rounded-full bg-accent" />
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">Agent configuration studio</p>
              </div>
              <h1 className="mt-5 text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-text sm:text-7xl">
                Build the config.
                <span className="block text-muted">Skip the ceremony.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                One guided policy becomes native files for every major coding agent.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-[430px]">
              <Metric label="Agents" value="8" />
              <Metric label="Gateways" value="5" />
              <Metric label="Models" value={String(catalog.models.length)} />
            </div>
          </header>

          <section className="grid gap-4 rounded-[28px] border border-line bg-surface p-5 shadow-[0_20px_60px_rgba(43,54,37,0.08)] lg:grid-cols-[minmax(0,1fr)_260px] lg:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">Live configuration</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <FlowNode label="Policy" value={config.preset} />
                <FlowNode label="Provider" value={config.routing.providerStrategy} />
                <FlowNode label="Reasoning" value={config.performance.reasoningEffort} />
                <FlowNode label="Artifacts" value={String(artifacts.length)} />
              </div>
            </div>
            <div className="rounded-[22px] border border-accent/20 bg-accent-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Est. monthly</p>
              <p className="mt-2 font-mono text-4xl font-semibold text-accent-strong">${monthlyCost.toFixed(2)}</p>
              <p className="mt-2 text-xs leading-relaxed text-text/55">10M in / 1M out tokens</p>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_330px]">
            <nav aria-label="Wizard steps" className="h-fit rounded-[24px] border border-line bg-surface p-3">
              <ol className="grid gap-1">
                {wizardSteps.map((name, index) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => setStep(index)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-mono text-xs transition ${
                        index === step ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-soft hover:text-text"
                      }`}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>{name}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>

            <section aria-live="polite" className="flex min-h-[620px] flex-col rounded-[28px] border border-line bg-surface p-5 lg:p-7">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-accent">{`step ${step + 1}/${wizardSteps.length}`}</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">{wizardSteps[step]}</h2>
                </div>
                <label className="flex items-center gap-2 font-mono text-xs text-muted">
                  <span>Advanced</span>
                  <Switch checked={advanced} onCheckedChange={setAdvanced} aria-label="Toggle advanced settings" />
                </label>
              </div>

              <div className="flex-1">
                {step === 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(presetMetadata).map(([id, preset]) => (
                      <Card key={id} as="button" type="button" onClick={() => updateConfig(applyPreset(id, config))} className={`p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/40 ${config.preset === id ? "border-accent/50 bg-accent-soft" : ""}`}>
                        <CardTitle className="text-xl">{preset.name}</CardTitle>
                        <CardDescription className="mt-2">{preset.goal}</CardDescription>
                        <div className="mt-5 font-mono text-[11px] text-faint">{preset.costPosture}</div>
                      </Card>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {agentIds.map((id) => {
                      const agent = agentMetadata[id];
                      const selected = config.agents.includes(id);
                      return (
                        <Card key={id} as="button" type="button" aria-pressed={selected} onClick={() => setAgents(selected ? config.agents.filter((agent) => agent !== id) : [...config.agents, id])} className={`p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/40 ${selected ? "border-accent/50 bg-accent-soft" : ""}`}>
                          <div className="flex items-center gap-3">
                            <Image src={agent.logo} alt="" width={36} height={36} className="rounded-lg border border-line bg-surface-soft p-1" />
                            <div>
                              <CardTitle className="text-lg">{agent.name}</CardTitle>
                              <CardDescription className="font-mono text-xs">{agent.version}</CardDescription>
                            </div>
                          </div>
                          <CardDescription className="mt-4">{agent.tooltip}</CardDescription>
                          {agent.pricingCallout && (
                            <div className="mt-4 rounded-[14px] border border-accent/25 bg-accent-soft px-3 py-2 font-mono text-[11px] text-accent-strong">
                              {agent.pricingCallout}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-4">
                    {gatewayIds.map((id) => {
                      const gateway = gatewayById.get(id)!;
                      const selected = config.gateway === id;
                      return (
                        <Card key={id} as="button" type="button" aria-pressed={selected} onClick={() => setGateway(id)} className={`flex flex-wrap items-center justify-between gap-4 p-5 text-left transition hover:border-accent/40 ${selected ? "border-accent/50 bg-accent-soft" : ""}`}>
                          <div className="flex items-center gap-3">
                            <Image src={gatewayMetadata[id].logo} alt="" width={30} height={30} />
                            <div>
                              <CardTitle className="text-lg">{gateway.name}</CardTitle>
                              <CardDescription className="mt-1">{gateway.best_for?.[0]}</CardDescription>
                            </div>
                          </div>
                          <span className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-faint">{gateway.protocol}</span>
                        </Card>
                      );
                    })}
                    <SettingsPanel title="OpenRouter provider routing" config={config} onRouting={setRouting} tooltips={routingTooltips} />
                  </div>
                )}

                {step === 3 && (
                  <div className="grid gap-4">
                    <SettingsPanel title="Frontier escalation" config={config} onFrontier={setFrontier} tooltips={frontierTooltips} />
                    {laneIds.map((lane) => {
                      const selected = modelById.get(config.lanes[lane].primary);
                      const choices = catalog.models.filter((model) => {
                        if (config.frontier.enabled || !model.frontier) return true;
                        return false;
                      });
                      return (
                        <div key={lane} className="rounded-[22px] border border-line bg-surface-soft p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{laneLabels[lane]}</h3>
                              <Help text={laneTooltips[lane]} />
                            </div>
                            <p className="font-mono text-[11px] text-faint">
                              {selected ? `${Math.round(selected.contextWindow / 1024)}K · tools ${selected.supportsTools ? "yes" : "no"} · vision ${selected.supportsVision ? "yes" : "no"}` : "custom model"}
                            </p>
                          </div>
                          <select value={config.lanes[lane].primary} onChange={(event) => setPrimaryModel(lane, event.target.value)} className="mt-4 w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-sm text-text focus:border-accent/50 focus:outline-none">
                            {choices.map((model) => <option key={model.id} value={model.id}>{model.displayName} · {model.id}</option>)}
                          </select>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {config.lanes[lane].fallbacks.map((fallback) => <span key={fallback} className="rounded-full border border-line bg-surface px-2 py-1 font-mono text-[11px] text-muted">{fallback}</span>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {step === 4 && (
                  <div className="grid gap-4">
                    <SettingsPanel title="Verification" config={config} onVerification={setVerification} tooltips={verificationTooltips} />
                    <SettingsPanel title="Permissions" config={config} onPermissions={setPermissions} tooltips={permissionTooltips} />
                  </div>
                )}

                {step === 5 && <SettingsPanel title="Performance" config={config} onPerformance={setPerformance} tooltips={performanceTooltips} />}

                {step === 6 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {rulePacks.map((pack) => (
                      <Card key={pack.id} as="button" type="button" aria-pressed={config.rulePacks.includes(pack.id)} onClick={() => toggleRulePack(pack.id)} className={`p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/40 ${config.rulePacks.includes(pack.id) ? "border-accent/50 bg-accent-soft" : ""}`}>
                        <CardTitle className="text-lg">{pack.name}</CardTitle>
                        <CardDescription className="mt-2">{pack.description}</CardDescription>
                      </Card>
                    ))}
                  </div>
                )}

                {step === 7 && (
                  <div className="grid gap-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Metric label="Preset" value={config.preset} />
                      <Metric label="Agents" value={String(config.agents.length)} />
                      <Metric label="Est. monthly" value={`$${monthlyCost.toFixed(2)}`} />
                    </div>
                    {issues.map((issue, index) => (
                      <div key={`${issue.affectedOption}-${index}`} className={`rounded-[20px] border p-4 ${issue.severity === "error" ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                        <p className="font-mono text-xs uppercase tracking-widest">{issue.severity}</p>
                        <p className="mt-2 text-sm">{issue.message}</p>
                        {issue.suggestedFix && <p className="mt-1 text-xs text-muted">{issue.suggestedFix}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {step === 8 && (
                  <div className="grid gap-4">
                    {blockingIssues.length > 0 ? (
                      <div className="rounded-[22px] border border-red-300 bg-red-50 p-5">
                        <p className="font-semibold">Fix blocking issues before downloading.</p>
                        <ul className="mt-3 grid gap-2 text-sm text-muted">{blockingIssues.map((issue) => <li key={issue.message}>{issue.message}</li>)}</ul>
                      </div>
                    ) : (
                      <Tabs defaultValue={artifacts[0]?.path}>
                        <TabsList className="flex-wrap">{artifacts.map((artifact) => <TabsTrigger key={artifact.path} value={artifact.path}>{artifact.path.split("/").pop()}</TabsTrigger>)}</TabsList>
                        {artifacts.map((artifact) => (
                          <TabsContent key={artifact.path} value={artifact.path} className="mt-4">
                            <div className="flex items-center justify-between gap-3 rounded-t-[18px] border border-line bg-surface-soft px-4 py-3">
                              <span className="truncate font-mono text-xs text-muted">{artifact.path}</span>
                              <Button size="sm" variant="primary" onClick={() => copyArtifact(artifact.path, artifact.contents)}>{copyState === artifact.path ? "Copied" : "Copy"}</Button>
                            </div>
                            <pre className="max-h-[480px] overflow-auto rounded-b-[18px] border border-t-0 border-line bg-[#fbfcf7] p-4 font-mono text-xs leading-relaxed text-[#273319]"><code>{artifact.contents}</code></pre>
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={reset}>Reset</Button>
                  {step < wizardSteps.length - 1 ? <Button variant="primary" onClick={() => setStep(Math.min(wizardSteps.length - 1, step + 1))}>Next</Button> : <Button variant="primary" onClick={downloadZip} disabled={blockingIssues.length > 0}>Download ZIP</Button>}
                </div>
              </div>
            </section>

            <aside className="h-fit rounded-[28px] border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">Summary</h2>
              <div className="mt-5 grid gap-3">
                <Metric label="Gateway" value={gatewayById.get(config.gateway)?.name ?? config.gateway} />
                <Metric label="Primary" value={config.lanes.default.primary} />
                <Metric label="Background" value={config.lanes.background.primary} />
                <Metric label="Reasoning" value={config.lanes.reasoning.primary} />
                <Metric label="Vision" value={config.lanes.vision.primary} />
                <Metric label="Files" value={String(artifacts.length)} />
              </div>
              <div className="mt-6 grid gap-2">
                <Button size="sm" variant="secondary" onClick={exportConfig}>Export config</Button>
                <Button size="sm" variant="secondary" onClick={() => importInputRef.current?.click()}>Import config</Button>
                <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  updateConfig(JSON.parse(await file.text()) as WizardConfig);
                }} />
              </div>
              <p className="mt-5 text-xs leading-relaxed text-faint">Client-only. No keys collected, stored, or generated.</p>
            </aside>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[18px] border border-line bg-surface-soft px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p><p className="mt-1 truncate font-mono text-sm font-medium text-text">{value}</p></div>;
}

function FlowNode({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[18px] border border-line bg-surface-soft px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p><p className="mt-1 truncate font-mono text-sm font-medium text-accent-strong">{value}</p></div>;
}

function Help({ text }: { text: string }) {
  return <Tooltip content={text}><button type="button" aria-label="More information" className="grid size-5 place-items-center rounded-full border border-line-strong font-mono text-[10px] text-faint">?</button></Tooltip>;
}

function SettingsPanel({
  title,
  config,
  tooltips,
  onRouting,
  onFrontier,
  onVerification,
  onPermissions,
  onPerformance,
}: {
  title: string;
  config: WizardConfig;
  tooltips: Record<string, string>;
  onRouting?: (value: WizardConfig["routing"]) => void;
  onFrontier?: (value: WizardConfig["frontier"]) => void;
  onVerification?: (value: WizardConfig["verification"]) => void;
  onPermissions?: (value: WizardConfig["permissions"]) => void;
  onPerformance?: (value: WizardConfig["performance"]) => void;
}) {
  const group = onRouting ? config.routing : onFrontier ? config.frontier : onVerification ? config.verification : onPermissions ? config.permissions : config.performance;
  const setGroup = (key: string, value: string | number | boolean) => {
    const next = { ...group, [key]: value } as never;
    if (onRouting) onRouting(next);
    else if (onFrontier) onFrontier(next);
    else if (onVerification) onVerification(next);
    else if (onPermissions) onPermissions(next);
    else if (onPerformance) onPerformance(next);
  };

  return (
    <div className="rounded-[22px] border border-line bg-surface-soft p-5">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Object.entries(group).map(([key, value]) => (
          <label key={key} className="flex items-center justify-between gap-4 rounded-[16px] border border-line bg-surface px-4 py-3">
            <span className="flex items-center gap-2 font-mono text-xs text-muted">{key}<Help text={tooltips[key] ?? ""} /></span>
            {typeof value === "boolean" ? <Switch checked={value} onCheckedChange={(checked) => setGroup(key, checked)} aria-label={key} /> : (
              <input value={String(value)} type={typeof value === "number" ? "number" : "text"} onChange={(event) => setGroup(key, typeof value === "number" ? Number(event.target.value) : event.target.value)} className="w-28 rounded-lg border border-line bg-surface px-2 py-1 text-right font-mono text-xs focus:border-accent/50 focus:outline-none" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
