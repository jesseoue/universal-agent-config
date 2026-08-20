import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const webRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(webRoot, "../..");
const readYaml = async (relative) => YAML.parse(await readFile(resolve(repoRoot, relative), "utf8"));

const [models, routing, policy, gateways, tools, starters] = await Promise.all([
  readYaml("core/models.yml"),
  readYaml("core/routing.yml"),
  readYaml("core/policy.yml"),
  readYaml("core/gateways.yml"),
  readYaml("core/tools.yml"),
  readYaml("core/starters.yml"),
]);

const catalog = {
  version: 1,
  updated: models.updated,
  models: Object.entries(models.models).map(([id, model]) => ({
    id,
    displayName: model.display_name,
    family: model.family,
    contextWindow: model.context_window,
    maxOutputTokens: model.max_output_tokens,
    supportsTools: model.supports_tools,
    supportsVision: model.supports_vision,
    reasoning: model.reasoning,
    frontier: Boolean(model.frontier),
    supportedParameters: model.supported_parameters ?? [],
    reasoningEfforts: model.reasoning_efforts ?? [],
    defaultReasoningEffort: model.reasoning_default_effort ?? null,
    catalogCreated: model.catalog_created ?? null,
    providers: model.providers,
    lane: model.lane ?? null,
    liveVerified: model.live_verified,
    pricing: model.pricing ?? null,
  })),
  routing: {
    defaultProfile: routing.default_profile,
    profiles: Object.entries(routing.profiles).map(([id, profile]) => ({
      id,
      description: profile.description,
      roles: Object.fromEntries(Object.entries(profile.roles).map(([role, lane]) => [
        role,
        { primary: lane.primary, fallbacks: lane.fallbacks ?? [] },
      ])),
    })),
  },
  policy,
  gateways: Object.entries(gateways.gateways).map(([id, gateway]) => ({
    id,
    ...gateway,
  })),
  defaultGateway: gateways.default,
  tools,
  starters,
};

await writeFile(resolve(webRoot, "../src/data/catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Catalog written: ${catalog.models.length} models, ${catalog.routing.profiles.length} routing profiles, ${catalog.gateways.length} gateways`);
