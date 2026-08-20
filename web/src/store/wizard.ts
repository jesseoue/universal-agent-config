"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultConfig } from "@/lib/config";
import type { WizardConfig } from "@/lib/types";

function presetLanes(preset: string, config: WizardConfig): WizardConfig["lanes"] {
  const laneDefaults = defaultConfig.lanes;
  if (preset === "low-cost") {
    return {
      ...laneDefaults,
      default: { primary: "deepseek/deepseek-v4-flash-0731", fallbacks: ["google/gemini-3.7-flash"] },
    };
  }
  if (preset === "frontier") {
    return {
      ...laneDefaults,
      default: { primary: "anthropic/claude-sonnet-5", fallbacks: ["openai/gpt-5.6-sol-pro", "moonshotai/kimi-k3"] },
      reasoning: { primary: "anthropic/claude-opus-5", fallbacks: ["deepseek/deepseek-v4-pro-0813"] },
    };
  }
  return config.lanes;
}

interface WizardState {
  config: WizardConfig;
  step: number;
  advanced: boolean;
  setPreset: (preset: string) => void;
  setAgents: (agents: WizardConfig["agents"]) => void;
  setGateway: (gateway: WizardConfig["gateway"]) => void;
  setPermissions: (permissions: WizardConfig["permissions"]) => void;
  setPerformance: (performance: WizardConfig["performance"]) => void;
  setRouting: (routing: WizardConfig["routing"]) => void;
  setFrontier: (frontier: WizardConfig["frontier"]) => void;
  setVerification: (verification: WizardConfig["verification"]) => void;
  setPrimaryModel: (lane: keyof WizardConfig["lanes"], modelId: string) => void;
  toggleRulePack: (pack: string) => void;
  setStep: (step: number) => void;
  setAdvanced: (advanced: boolean) => void;
  importConfig: (config: WizardConfig) => void;
  reset: () => void;
}

export const wizardSteps = [
  "Preset",
  "Agents",
  "Gateway",
  "Models",
  "Permissions",
  "Performance",
  "Rules",
  "Review",
  "Generate",
] as const;

export const useWizard = create<WizardState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      step: 0,
      advanced: false,
      setPreset: (preset) =>
        set((state) => ({
          config: {
            ...state.config,
            preset,
            lanes: presetLanes(preset, state.config),
            ...(preset === "content-analysis"
              ? {
                  permissions: {
                    ...state.config.permissions,
                    edit: false,
                    shell: false,
                    browser: false,
                    webSearch: false,
                  },
                }
              : {}),
          },
        })),
      setAgents: (agents) => set((state) => ({ config: { ...state.config, agents } })),
      setGateway: (gateway) => set((state) => ({ config: { ...state.config, gateway } })),
      setPermissions: (permissions) => set((state) => ({ config: { ...state.config, permissions } })),
      setPerformance: (performance) => set((state) => ({ config: { ...state.config, performance } })),
      setRouting: (routing) => set((state) => ({ config: { ...state.config, routing } })),
      setFrontier: (frontier) => set((state) => ({ config: { ...state.config, frontier } })),
      setVerification: (verification) => set((state) => ({ config: { ...state.config, verification } })),
      setPrimaryModel: (lane, modelId) =>
        set((state) => ({
          config: {
            ...state.config,
            lanes: { ...state.config.lanes, [lane]: { ...state.config.lanes[lane], primary: modelId } },
          },
        })),
      toggleRulePack: (pack) =>
        set((state) => ({
          config: {
            ...state.config,
            rulePacks: state.config.rulePacks.includes(pack as never)
              ? state.config.rulePacks.filter((item) => item !== pack)
              : [...state.config.rulePacks, pack as never],
          },
        })),
      setStep: (step) => set({ step }),
      setAdvanced: (advanced) => set({ advanced }),
      importConfig: (config) => set({ config, step: 7 }),
      reset: () => set({ config: defaultConfig, step: 0, advanced: false }),
    }),
    {
      name: "universal-agent-config-wizard",
      partialize: (state) => ({ config: state.config, step: state.step, advanced: state.advanced }),
      onRehydrateStorage: () => (state) => {
        if (state && state.step >= wizardSteps.length - 1) state.setStep(0);
      },
    },
  ),
);
