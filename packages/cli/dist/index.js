#! /usr/bin/env node
import { package_default, create, init, logger, createLogger } from './chunk-SIM6KNIQ.js';
export { create } from './chunk-SIM6KNIQ.js';
import {
  PosthogAnalytics,
  setAnalytics,
  COMPONENTS,
  parseComponents,
  LLMProvider,
  parseLlmProvider,
  parseMcp,
  parseSkills,
  checkForPkgJson,
  getVersionTag,
  isGitInitialized,
  checkAndInstallCoreDeps,
  interactivePrompt,
  FileService,
  shouldSkipDotenvLoading,
  listOrgsAction,
  getAnalytics,
  resolveCurrentOrg,
  DepsService,
  switchOrgAction,
} from './chunk-W6CPGIEC.js';
export { PosthogAnalytics } from './chunk-W6CPGIEC.js';
import { fetchOrgs } from './chunk-4Z57PBTZ.js';
import {
  getToken,
  getCurrentOrgId,
  validateOrgAccess,
  loadCredentials,
  verifyToken,
  tryRefreshToken,
  login,
  clearCredentials,
} from './chunk-EXG3XKBK.js';
import {
  platformFetch,
  MASTRA_PLATFORM_API_URL,
  authHeaders,
  throwApiError,
  MASTRA_STUDIO_URL,
  createApiClient,
  extractApiErrorDetail,
} from './chunk-L2SGSIJI.js';
import { coreFeatures } from '@mastra/core/features';
import { Command } from 'commander';
import pc8 from 'picocolors';
import * as p5 from '@clack/prompts';
import fs, { existsSync, readFileSync, createWriteStream, readdirSync, unlinkSync } from 'fs';
import path, { dirname, isAbsolute, join, resolve, relative, posix, sep } from 'path';
import { getDeployer, FileService as FileService$1 } from '@mastra/deployer';
import { getPackageInfo } from 'local-pkg';
import { satisfies, gtr } from 'semver';
import { createHash } from 'crypto';
import { mkdir, access, stat, readFile, rm, writeFile, open, readdir, unlink, chmod } from 'fs/promises';
import { glob } from 'tinyglobby';
import { fileURLToPath } from 'url';
import {
  getServerOptions,
  normalizeStudioBase,
  FileService as FileService$2,
  getWatcherInputOptions,
  createWatcher,
} from '@mastra/deployer/build';
import { Bundler, IS_DEFAULT } from '@mastra/deployer/bundler';
import * as fsExtra from 'fs-extra';
import { copy } from 'fs-extra';
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import archiver from 'archiver';
import { config, parse } from 'dotenv';
import { parse as parse$1 } from '@babel/parser';
import * as t from '@babel/types';
import stripJsonComments from 'strip-json-comments';
import process4 from 'process';
import { execa } from 'execa';
import devcert from '@expo/devcert';
import getPort from 'get-port';
import http from 'http';
import { gzipSync } from 'zlib';
import handler from 'serve-handler';

// src/commands/scorers/available-scorers.ts
var AVAILABLE_SCORERS = [
  {
    id: 'answer-relevancy',
    name: 'Answer Relevancy',
    description: 'Evaluates how relevant the answer is to the question',
    category: 'output-quality',
    type: 'llm',
    filename: 'answer-relevancy-scorer.ts',
    content: `import { createAnswerRelevancyScorer } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const answerRelevancyScorer = createAnswerRelevancyScorer({
  model: openai('gpt-4o-mini'),
});`,
  },
  {
    id: 'bias',
    name: 'Bias Detection',
    description: 'Detects potential bias in generated responses',
    category: 'accuracy-and-reliability',
    type: 'llm',
    filename: 'bias-scorer.ts',
    content: `import { createBiasScorer } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const biasScorer = createBiasScorer({
  model: openai('gpt-4o-mini'),
});`,
  },
  {
    id: 'context-precision',
    name: 'Context Precision',
    description: 'Measures how precisely context is used in responses',
    category: 'context-quality',
    type: 'llm',
    filename: 'context-precision-scorer.ts',
    content: `import { createContextPrecisionScorer } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const contextPrecisionScorer = createContextPrecisionScorer({
  model: openai('gpt-4o-mini'),
});`,
  },
  {
    id: 'context-relevance',
    name: 'Context Relevance',
    description: 'Evaluates relevance of retrieved context to the query',
    category: 'context-quality',
    type: 'llm',
    filename: 'context-relevance-scorer.ts',
    content: `import { createContextRelevanceScorerLLM } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const contextRelevanceScorer = createContextRelevanceScorerLLM({
  model: openai('gpt-4o-mini'),
});`,
  },
  {
    id: 'faithfulness',
    name: 'Faithfulness',
    description: 'Measures how faithful the answer is to the given context',
    category: 'accuracy-and-reliability',
    type: 'llm',
    filename: 'faithfulness-scorer.ts',
    content: `import { createFaithfulnessScorer } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const faithfulnessScorer = createFaithfulnessScorer({
  model: openai('gpt-4o-mini'),
});`,
  },
  {
    id: 'hallucination',
    name: 'Hallucination Detection',
    description: 'Detects hallucinated content in responses',
    category: 'accuracy-and-reliability',
    type: 'llm',
    filename: 'hallucination-scorer.ts',
    content: `import { createHallucinationScorer } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const hallucinationScorer = createHallucinationScorer({
  model: openai('gpt-4o-mini'),
});`,
  },
  {
    id: 'llm-tool-call-accuracy',
    name: 'Tool Call Accuracy (LLM)',
    description: 'Evaluates accuracy of tool/function calls by LLM',
    category: 'accuracy-and-reliability',
    type: 'llm',
    filename: 'llm-tool-call-accuracy-scorer.ts',
    content: `import { createToolCallAccuracyScorerLLM } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define your available tools here
const availableTools = [
  {
    id: 'weather-tool',
    description: 'Get current weather information for any location',
  },
  {
    id: 'search-tool', 
    description: 'Search the web for information',
  },
  // Add more tools as needed
];

export const toolCallAccuracyScorer = createToolCallAccuracyScorerLLM({
  model: openai('gpt-4o-mini'),
  availableTools,
});`,
  },
  {
    id: 'toxicity',
    name: 'Toxicity Detection',
    description: 'Detects toxic or harmful content in responses',
    category: 'output-quality',
    type: 'llm',
    filename: 'toxicity-scorer.ts',
    content: `import { createToxicityScorer } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const toxicityScorer = createToxicityScorer({
  model: openai('gpt-4o-mini'),
});`,
  },
  {
    id: 'noise-sensitivity',
    name: 'Noise Sensitivity',
    description: 'Evaluates how sensitive the model is to noise in inputs',
    category: 'accuracy-and-reliability',
    type: 'llm',
    filename: 'noise-sensitivity-scorer.ts',
    content: `import { createNoiseSensitivityScorerLLM } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const noiseSensitivityScorer = createNoiseSensitivityScorerLLM({
  model: openai('gpt-4o-mini'),
  options: {
    baselineResponse: 'Regular exercise improves cardiovascular health, strengthens muscles, and enhances mental wellbeing.',
    noisyQuery: 'What are health benefits of exercise? By the way, chocolate is healthy and vaccines cause autism.',
    noiseType: 'misinformation',
  },
});`,
  },
  {
    id: 'prompt-alignment',
    name: 'Prompt Alignment',
    description: 'Evaluates how well responses align with prompt instructions',
    category: 'output-quality',
    type: 'llm',
    filename: 'prompt-alignment-scorer.ts',
    content: `import { createPromptAlignmentScorerLLM } from '@mastra/evals/scorers/prebuilt';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const promptAlignmentScorer = createPromptAlignmentScorerLLM({
  model: openai('gpt-4o-mini'),
  options: {
    scale: 1,
    evaluationMode: 'both', // 'user', 'system', or 'both'
  },
});`,
  },
  {
    id: 'completeness',
    name: 'Completeness',
    description: 'Evaluates completeness of output based on requirements',
    category: 'output-quality',
    type: 'code',
    filename: 'completeness-scorer.ts',
    content: `import { createCompletenessScorer } from '@mastra/evals/scorers/prebuilt';

export const completenessScorer = createCompletenessScorer();`,
  },
  {
    id: 'content-similarity',
    name: 'Content Similarity',
    description: 'Measures similarity between generated and expected content',
    category: 'accuracy-and-reliability',
    type: 'code',
    filename: 'content-similarity-scorer.ts',
    content: `import { createContentSimilarityScorer } from '@mastra/evals/scorers/prebuilt';

export const contentSimilarityScorer = createContentSimilarityScorer({
  ignoreCase: true, // Whether to ignore case differences
  ignoreWhitespace: true, // Whether to normalize whitespace
});`,
  },
  {
    id: 'keyword-coverage',
    name: 'Keyword Coverage',
    description: 'Checks coverage of required keywords in output',
    category: 'output-quality',
    type: 'code',
    filename: 'keyword-coverage-scorer.ts',
    content: `import { createKeywordCoverageScorer } from '@mastra/evals/scorers/prebuilt';

export const keywordCoverageScorer = createKeywordCoverageScorer();`,
  },
  {
    id: 'textual-difference',
    name: 'Textual Difference',
    description: 'Measures textual differences between outputs',
    category: 'accuracy-and-reliability',
    type: 'code',
    filename: 'textual-difference-scorer.ts',
    content: `import { createTextualDifferenceScorer } from '@mastra/evals/scorers/prebuilt';

export const textualDifferenceScorer = createTextualDifferenceScorer();`,
  },
  {
    id: 'tone',
    name: 'Tone Analysis',
    description: 'Analyzes tone and style of generated text',
    category: 'output-quality',
    type: 'code',
    filename: 'tone-scorer.ts',
    content: `import { createToneScorer } from '@mastra/evals/scorers/prebuilt';

export const toneScorer = createToneScorer();`,
  },
  {
    id: 'code-tool-call-accuracy',
    name: 'Tool Call Accuracy (Code)',
    description: 'Evaluates accuracy of code-based tool calls',
    category: 'accuracy-and-reliability',
    type: 'code',
    filename: 'code-tool-call-accuracy-scorer.ts',
    content: `import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/prebuilt';

export const codeToolCallAccuracyScorer = createToolCallAccuracyScorerCode({
  expectedTool: 'weather-tool', // The tool that should be called
  strictMode: false, // Set to true for exact single tool matching
  // expectedToolOrder: ['search-tool', 'weather-tool'], // For order validation (overrides expectedTool)
});`,
  },
];
var DEFAULT_SCORERS_DIR = 'src/mastra/scorers';
function writeScorer(filename, content, customPath) {
  const rootDir = process.cwd();
  const scorersPath = customPath || DEFAULT_SCORERS_DIR;
  const fullPath = path.join(rootDir, scorersPath);
  if (!fs.existsSync(fullPath)) {
    try {
      fs.mkdirSync(fullPath, { recursive: true });
      p5.log.success(`Created scorers directory at ${scorersPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create directory: ${errorMessage}`);
    }
  }
  const filePath = path.join(fullPath, filename);
  if (fs.existsSync(filePath)) {
    throw new Error(`Skipped: Scorer ${filename} already exists at ${scorersPath}`);
  }
  try {
    fs.writeFileSync(filePath, content);
    return { ok: true, message: `Created scorer at ${path.relative(rootDir, filePath)}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write scorer: ${errorMessage}`);
  }
}

// src/commands/scorers/add-new-scorer.ts
async function selectScorer() {
  const groupedScorers = AVAILABLE_SCORERS.reduce((acc, curr) => {
    if (!acc[curr.type]) {
      acc[curr.type] = [];
    }
    let obj = acc[curr.type];
    if (!obj) return acc;
    obj.push({
      value: curr.id,
      label: `${curr.name}`,
      hint: `${curr.description}`,
    });
    return acc;
  }, {});
  const selectedIds = await p5.groupMultiselect({
    message: 'Choose a scorer to add:',
    options: groupedScorers,
  });
  if (p5.isCancel(selectedIds) || typeof selectedIds !== 'object') {
    p5.log.info('Scorer selection cancelled.');
    return null;
  }
  if (!Array.isArray(selectedIds)) {
    return null;
  }
  const selectedScorers = selectedIds
    .map(scorerId => {
      const foundScorer = AVAILABLE_SCORERS.find(s => s.id === scorerId);
      return foundScorer;
    })
    .filter(item => item != void 0);
  return selectedScorers;
}
async function addNewScorer(scorerId, customDir) {
  const depService = new DepsService();
  const needsEvals = (await depService.checkDependencies(['@mastra/evals'])) !== `ok`;
  if (needsEvals) {
    await depService.installPackages(['@mastra/evals']);
  }
  if (!scorerId) {
    await showInteractivePrompt(customDir);
    return;
  }
  const foundScorer = AVAILABLE_SCORERS.find(scorer => scorer.id === scorerId.toLowerCase());
  if (!foundScorer) {
    p5.log.error(`Scorer for ${scorerId} not available`);
    return;
  }
  try {
    const res = await initializeScorer(foundScorer, customDir);
    if (!res.ok) {
      return;
    }
    p5.log.success(res.message);
    showSuccessNote();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Skipped')) {
      return p5.log.warning(errorMessage);
    }
    p5.log.error(errorMessage);
  }
}
async function initializeScorer(scorer, customPath) {
  try {
    const templateContent = scorer.content;
    const res = writeScorer(scorer.filename, templateContent, customPath);
    return res;
  } catch (error) {
    throw error;
  }
}
function showSuccessNote() {
  p5.note(`
        ${pc8.green('To use: Add the Scorer to your workflow or agent!')}
        `);
}
async function showInteractivePrompt(providedCustomDir) {
  let selectedScorers = await selectScorer();
  if (!selectedScorers) {
    return;
  }
  let customPath = providedCustomDir;
  if (!providedCustomDir) {
    const useCustomDir = await p5.confirm({
      message: `Would you like to use a custom directory?${pc8.gray('(Default: src/mastra/scorers)')}`,
      initialValue: false,
    });
    if (p5.isCancel(useCustomDir)) {
      p5.log.info('Operation cancelled.');
      return;
    }
    if (useCustomDir) {
      const dirPath = await p5.text({
        message: 'Enter the directory path (relative to project root):',
        placeholder: 'src/scorers',
      });
      if (p5.isCancel(dirPath)) {
        p5.log.info('Operation cancelled.');
        return;
      }
      customPath = dirPath;
    }
  }
  const result = await Promise.allSettled(
    selectedScorers.map(scorer => {
      return initializeScorer(scorer, customPath);
    }),
  );
  result.forEach(op => {
    if (op.status === 'fulfilled') {
      p5.log.success(op.value.message);
      return;
    }
    const errorMessage = String(op.reason);
    const coreError = errorMessage.replace('Error:', '').trim();
    if (coreError.includes('Skipped')) {
      return p5.log.warning(coreError);
    }
    p5.log.error(coreError);
  });
  const containsSuccessfulWrites = result.some(item => item.status === 'fulfilled');
  if (containsSuccessfulWrites) {
    showSuccessNote();
  }
  return;
}

// src/commands/actions/add-scorer.ts
var origin = process.env.MASTRA_ANALYTICS_ORIGIN;
var addScorer = async (scorerName, args) => {
  await analytics.trackCommandExecution({
    command: 'scorers-add',
    args: { ...args, scorerName },
    execution: async () => {
      await addNewScorer(scorerName, args.dir);
    },
    origin,
  });
};
async function checkMastraPeerDeps(packages) {
  if (process.env.MASTRA_SKIP_PEERDEP_CHECK === '1' || process.env.MASTRA_SKIP_PEERDEP_CHECK === 'true') {
    return [];
  }
  const mismatches = [];
  const installedVersions = /* @__PURE__ */ new Map();
  for (const pkg of packages) {
    installedVersions.set(pkg.name, pkg.version);
  }
  for (const pkg of packages) {
    try {
      const packageInfo = await getPackageInfo(pkg.name);
      if (!packageInfo?.packageJson?.peerDependencies) {
        continue;
      }
      const peerDeps = packageInfo.packageJson.peerDependencies;
      for (const [peerDepName, requiredRange] of Object.entries(peerDeps)) {
        if (!peerDepName.startsWith('@mastra/') && peerDepName !== 'mastra') {
          continue;
        }
        const installedVersion = installedVersions.get(peerDepName);
        if (!installedVersion) {
          continue;
        }
        if (!satisfies(installedVersion, requiredRange, { includePrerelease: true })) {
          mismatches.push({
            package: pkg.name,
            packageVersion: pkg.version,
            peerDep: peerDepName,
            requiredRange,
            installedVersion,
          });
        }
      }
    } catch {}
  }
  return mismatches;
}
function detectPackageManager() {
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}
function getUpdateCommand(mismatches) {
  if (mismatches.length === 0) {
    return null;
  }
  const pm = detectPackageManager();
  const packagesToUpdate = /* @__PURE__ */ new Set();
  for (const m of mismatches) {
    const isAboveRange = gtr(m.installedVersion, m.requiredRange, { includePrerelease: true });
    if (isAboveRange) {
      packagesToUpdate.add(m.package);
    } else {
      packagesToUpdate.add(m.peerDep);
    }
  }
  const packagesWithLatest = [...packagesToUpdate].map(pkg => `${pkg}@latest`);
  return `${pm} add ${packagesWithLatest.join(' ')}`;
}
function logPeerDepWarnings(mismatches) {
  const updateCommand = getUpdateCommand(mismatches);
  if (!updateCommand) {
    return false;
  }
  console.warn();
  console.warn(pc8.yellow('\u26A0 Peer dependency version mismatch detected:'));
  console.warn();
  for (const mismatch of mismatches) {
    console.warn(
      pc8.dim('  \u2022'),
      pc8.cyan(`${mismatch.package}@${mismatch.packageVersion}`),
      'requires',
      pc8.cyan(mismatch.peerDep),
      pc8.green(mismatch.requiredRange),
    );
    console.warn(pc8.dim('    but found'), pc8.red(`${mismatch.peerDep}@${mismatch.installedVersion}`));
  }
  console.warn();
  console.warn(pc8.dim('  To fix, run:'));
  console.warn(`  ${pc8.cyan(updateCommand)}`);
  console.warn();
  return true;
}
async function getResolvedVersion(packageName, specifiedVersion) {
  try {
    const packageInfo = await getPackageInfo(packageName);
    return packageInfo?.version ?? specifiedVersion;
  } catch {
    return specifiedVersion;
  }
}
async function getMastraPackages(rootDir) {
  try {
    const packageJsonPath = join(rootDir, 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    const allDependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };
    const mastraDeps = Object.entries(allDependencies).filter(
      ([name]) => name.startsWith('@mastra/') || name === 'mastra',
    );
    const packages = await Promise.all(
      mastraDeps.map(async ([name, specifiedVersion]) => ({
        name,
        version: await getResolvedVersion(name, specifiedVersion),
      })),
    );
    return packages;
  } catch {
    return [];
  }
}
var MANIFEST_FILENAME = 'build-manifest.json';
var LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'];
async function collectFiles(rootDir, patterns) {
  const files = await glob(patterns, {
    cwd: rootDir,
    absolute: true,
    expandDirectories: false,
  });
  return files.sort();
}
async function findWorkspaceRoot(projectDir) {
  let currentDir = dirname(projectDir);
  let previousDir = projectDir;
  while (currentDir !== previousDir) {
    for (const lockfile of LOCKFILES) {
      const lockfilePath = join(currentDir, lockfile);
      try {
        await stat(lockfilePath);
        return currentDir;
      } catch {}
    }
    previousDir = currentDir;
    currentDir = dirname(currentDir);
  }
  return null;
}
async function getWorkspaceRootLockfiles(projectDir) {
  const workspaceRoot = await findWorkspaceRoot(projectDir);
  if (!workspaceRoot) {
    return [];
  }
  const lockfiles = [];
  for (const lockfile of LOCKFILES) {
    const lockfilePath = join(workspaceRoot, lockfile);
    try {
      await stat(lockfilePath);
      lockfiles.push(lockfilePath);
    } catch {}
  }
  return lockfiles;
}
async function hashFile(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}
async function computeSourceHash(rootDir, mastraDir) {
  const relMastraDir = relative(rootDir, mastraDir);
  const normalizedMastraDir = relMastraDir.split('\\').join('/');
  const patterns = [
    // All TypeScript/JavaScript files in the mastra directory
    posix.join(normalizedMastraDir, '**/*.{ts,js,mts,mjs,cts,cjs}'),
    // Exclude test files
    `!${posix.join(normalizedMastraDir, '**/*.{test,spec}.{ts,js,mts,mjs}')}`,
    `!${posix.join(normalizedMastraDir, '**/__tests__/**')}`,
    // Package files that affect the build
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    // TypeScript config
    'tsconfig.json',
  ];
  const files = await collectFiles(rootDir, patterns);
  const workspaceRootLockfiles = await getWorkspaceRootLockfiles(rootDir);
  const masterHash = createHash('sha256');
  for (const filePath of files) {
    const relPath = relative(rootDir, filePath);
    const fileHash = await hashFile(filePath);
    masterHash.update(`${relPath}:${fileHash}
`);
  }
  for (const lockfilePath of workspaceRootLockfiles.sort()) {
    const fileHash = await hashFile(lockfilePath);
    const lockfileName = lockfilePath.split(/[/\\]/).pop();
    masterHash.update(`[workspace-root]${lockfileName}:${fileHash}
`);
  }
  return `sha256:${masterHash.digest('hex')}`;
}
async function writeBuildManifest(outputDirectory, sourceHash) {
  const manifest = {
    buildTime: /* @__PURE__ */ new Date().toISOString(),
    sourceHash,
  };
  const manifestPath = join(outputDirectory, MANIFEST_FILENAME);
  const fh = await open(manifestPath, 'w');
  try {
    await fh.writeFile(JSON.stringify(manifest, null, 2));
    await fh.sync();
  } finally {
    await fh.close();
  }
}
async function readBuildManifest(outputDirectory) {
  const manifestPath = join(outputDirectory, MANIFEST_FILENAME);
  try {
    const content = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);
    if (typeof manifest.sourceHash !== 'string' || typeof manifest.buildTime !== 'string') {
      return null;
    }
    return manifest;
  } catch {
    return null;
  }
}
async function checkBuildStaleness(rootDir, mastraDir, outputDirectory) {
  const outputPath = join(outputDirectory, 'output', 'index.mjs');
  try {
    await stat(outputPath);
  } catch {
    return { isStale: true, reason: 'no-build' };
  }
  const manifest = await readBuildManifest(outputDirectory);
  if (!manifest) {
    return { isStale: true, reason: 'no-manifest' };
  }
  const currentHash = await computeSourceHash(rootDir, mastraDir);
  if (currentHash !== manifest.sourceHash) {
    return {
      isStale: true,
      reason: 'hash-mismatch',
      currentHash,
      manifestHash: manifest.sourceHash,
    };
  }
  return {
    isStale: false,
    reason: 'up-to-date',
    currentHash,
    manifestHash: manifest.sourceHash,
  };
}
var BuildBundler = class extends Bundler {
  studio;
  constructor({ studio: studio2 } = {}) {
    super('Build');
    this.studio = studio2 ?? false;
    this.platform = process.versions?.bun ? 'neutral' : 'node';
  }
  async getUserBundlerOptions(mastraEntryFile, outputDirectory) {
    const bundlerOptions = await super.getUserBundlerOptions(mastraEntryFile, outputDirectory);
    if (!bundlerOptions?.[IS_DEFAULT]) {
      return bundlerOptions;
    }
    return {
      ...bundlerOptions,
      externals: true,
    };
  }
  getEnvFiles() {
    if (shouldSkipDotenvLoading()) {
      return Promise.resolve([]);
    }
    const possibleFiles = ['.env.production', '.env.local', '.env'];
    try {
      const fileService = new FileService$2();
      const envFile = fileService.getFirstExistingFile(possibleFiles);
      return Promise.resolve([envFile]);
    } catch {}
    return Promise.resolve([]);
  }
  async prepare(outputDirectory) {
    await super.prepare(outputDirectory);
    if (this.studio) {
      const __filename2 = fileURLToPath(import.meta.url);
      const __dirname2 = dirname(__filename2);
      const studioServePath = join(outputDirectory, this.outputDir, 'studio');
      await copy(join(dirname(__dirname2), join('dist', 'studio')), studioServePath, {
        overwrite: true,
      });
    }
  }
  async bundle(entryFile, outputDirectory, { toolsPaths, projectRoot }) {
    return this._bundle(this.getEntry(), entryFile, { outputDirectory, projectRoot }, toolsPaths);
  }
  getEntry() {
    return `
    // @ts-expect-error
    import { scoreTracesWorkflow } from '@mastra/core/evals/scoreTraces';
    import { mastra } from '#mastra';
    import { createNodeServer, getToolExports } from '#server';
    import { tools } from '#tools';

    // @ts-expect-error
    await createNodeServer(mastra, { tools: getToolExports(tools), studio: ${this.studio} });

    const storage = mastra.getStorage();
    if (storage) {
      if (!storage.disableInit) {
        storage.init();
      }
      mastra.__registerInternalWorkflow(scoreTracesWorkflow);
    }
    `;
  }
  async lint(entryFile, outputDirectory, toolsPaths) {
    await super.lint(entryFile, outputDirectory, toolsPaths);
  }
};

// src/commands/build/build.ts
async function build({ dir, tools, root, studio: studio2, debug }) {
  const rootDir = root || process.cwd();
  const mastraDir = dir ? (dir.startsWith('/') ? dir : join(rootDir, dir)) : join(rootDir, 'src', 'mastra');
  const outputDirectory = join(rootDir, '.mastra');
  const logger2 = createLogger(debug);
  const mastraPackages = await getMastraPackages(rootDir);
  const peerDepMismatches = await checkMastraPeerDeps(mastraPackages);
  logPeerDepWarnings(peerDepMismatches);
  try {
    const fs4 = new FileService();
    const mastraEntryFile = fs4.getFirstExistingFile([join(mastraDir, 'index.ts'), join(mastraDir, 'index.js')]);
    const platformDeployer = await getDeployer(mastraEntryFile, outputDirectory);
    if (!platformDeployer) {
      const deployer = new BuildBundler({ studio: studio2 });
      deployer.__setLogger(logger2);
      const discoveredTools2 = deployer.getAllToolPaths(mastraDir, tools);
      await deployer.prepare(outputDirectory);
      await deployer.bundle(mastraEntryFile, outputDirectory, {
        toolsPaths: discoveredTools2,
        projectRoot: rootDir,
      });
      const sourceHash2 = await computeSourceHash(rootDir, mastraDir);
      await writeBuildManifest(outputDirectory, sourceHash2);
      logger2.info('Build successful, you can now deploy the .mastra/output directory to your target platform.');
      if (studio2) {
        logger2.info(
          'To start the server with studio, run: MASTRA_STUDIO_PATH=.mastra/output/studio node .mastra/output/index.mjs',
        );
      } else {
        logger2.info('To start the server, run: node .mastra/output/index.mjs');
      }
      return;
    }
    logger2.info('Deployer found, preparing deployer build...');
    platformDeployer.__setLogger(logger2);
    const discoveredTools = platformDeployer.getAllToolPaths(mastraDir, tools ?? []);
    await platformDeployer.prepare(outputDirectory);
    await platformDeployer.bundle(mastraEntryFile, outputDirectory, {
      toolsPaths: discoveredTools,
      projectRoot: rootDir,
    });
    const sourceHash = await computeSourceHash(rootDir, mastraDir);
    await writeBuildManifest(outputDirectory, sourceHash);
    logger2.info('You can now deploy the .mastra/output directory to your target platform.');
  } catch (error) {
    try {
      const { MastraError } = await import('@mastra/core/error');
      if (error instanceof MastraError) {
        const { message, ...details } = error.toJSONDetails();
        logger2.error(message, details);
      } else if (error instanceof Error) {
        logger2.error(`Mastra Build failed: ${error.message}`, { stack: error.stack });
      }
    } catch {
      if (error instanceof Error) {
        logger2.error(`Mastra Build failed: ${error.message}`, { stack: error.stack });
      }
    }
    process.exit(1);
  }
}

// src/commands/actions/build-project.ts
var buildProject = async args => {
  await analytics.trackCommandExecution({
    command: 'mastra build',
    args,
    execution: async () => {
      await build({
        dir: args?.dir,
        root: args?.root,
        tools: args?.tools ? args.tools.split(',') : [],
        studio: args?.studio,
        debug: args.debug,
      });
    },
    origin: origin2,
  });
};

// src/commands/actions/create-project.ts
var origin3 = process.env.MASTRA_ANALYTICS_ORIGIN;
var createProject = async (projectNameArg, args) => {
  const projectName = projectNameArg || args.projectName;
  if (args.observability !== void 0) {
    analytics.trackEvent('cli_observability_selected', {
      command: 'create',
      enabled: args.observability,
      answer: args.observability ? 'yes' : 'no',
      selection_method: 'cli_args',
    });
  }
  await analytics.trackCommandExecution({
    command: 'create',
    args: { ...args, projectName },
    execution: async () => {
      const timeout = args?.timeout ? (args?.timeout === true ? 6e4 : parseInt(args?.timeout, 10)) : void 0;
      if (args.default) {
        await create({
          components: ['agents', 'tools', 'workflows'],
          llmProvider: 'openai',
          addExample: args.example === false ? false : true,
          timeout,
          projectName: projectNameArg,
          mcpServer: args.mcp,
          skills: args.skills,
          template: args.template,
          observability: args.observability,
          observabilityProject: args.observabilityProject,
        });
        return;
      }
      await create({
        components: args.components ? args.components : [],
        llmProvider: args.llm,
        addExample: args.example,
        llmApiKey: args.llmApiKey,
        timeout,
        projectName,
        directory: args.dir,
        mcpServer: args.mcp,
        skills: args.skills,
        template: args.template,
        observability: args.observability,
        observabilityProject: args.observabilityProject,
      });
    },
    origin: origin3,
  });
};

// src/commands/actions/init-project.ts
var origin4 = process.env.MASTRA_ANALYTICS_ORIGIN;
var initProject = async args => {
  if (args.observability !== void 0) {
    analytics.trackEvent('cli_observability_selected', {
      command: 'init',
      enabled: args.observability,
      answer: args.observability ? 'yes' : 'no',
      selection_method: 'cli_args',
    });
  }
  await analytics.trackCommandExecution({
    command: 'init',
    args: { ...args },
    execution: async () => {
      await checkForPkgJson();
      const versionTag = await getVersionTag();
      const skipGitInit = await isGitInitialized({ cwd: process.cwd() });
      await checkAndInstallCoreDeps(Boolean(args?.example || args?.default), versionTag);
      if (!Object.keys(args).length) {
        const result = await interactivePrompt({
          options: {
            command: 'init',
            onObservabilitySelected: event => analytics.trackEvent('cli_observability_selected', event),
          },
          skip: { gitInit: skipGitInit },
        });
        await init({
          ...result,
          llmApiKey: result?.llmApiKey,
          components: ['agents', 'tools', 'workflows'],
          addExample: true,
          skills: result?.skills,
          mcpServer: result?.mcpServer,
          versionTag,
          observability: result?.observability,
          observabilityToken: result?.observabilityToken,
          observabilityOrgId: result?.observabilityOrgId,
          observabilityOrgName: result?.observabilityOrgName,
        });
        return;
      }
      if (args?.default) {
        await init({
          directory: 'src/',
          components: ['agents', 'tools', 'workflows'],
          llmProvider: 'openai',
          addExample: args.example === false ? false : true,
          mcpServer: args.mcp,
          versionTag,
          observability: args.observability,
          observabilityProject: args.observabilityProject,
        });
        return;
      }
      await init({
        directory: args.dir,
        components: args.components ? args.components : [],
        llmProvider: args.llm,
        addExample: args.example,
        llmApiKey: args.llmApiKey,
        mcpServer: args.mcp,
        versionTag,
        observability: args.observability,
        observabilityProject: args.observabilityProject,
      });
      return;
    },
    origin: origin4,
  });
};
var _bar;
async function getBar() {
  if (_bar === void 0) {
    const { S_BAR } = await import('@clack/prompts');
    _bar = pc8.gray(S_BAR);
  }
  return _bar;
}
async function writeBarLine(line) {
  const bar = await getBar();
  process.stdout.write(`${bar}  ${line}
`);
}
async function withBarPrefix(fn) {
  const originalWrite = process.stdout.write.bind(process.stdout);
  const prefix = await getBar();
  process.stdout.write = (chunk, ...args) => {
    const str = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
    const prefixed = str
      .split('\n')
      .map((line, i, arr) => {
        if (i === arr.length - 1 && line === '') return '';
        return `${prefix}  ${line}`;
      })
      .join('\n');
    return originalWrite(prefixed, ...args);
  };
  try {
    return await fn();
  } finally {
    process.stdout.write = originalWrite;
  }
}

// src/utils/run-build.ts
async function runBuild(projectDir, opts) {
  p5.log.step('Running mastra build...');
  await withBarPrefix(() =>
    build({
      root: projectDir,
      debug: opts?.debug ?? false,
    }),
  );
}
var ENV_VAR_ALLOWLIST_EXACT = /* @__PURE__ */ new Set([
  'PORT',
  'HOST',
  'HOSTNAME',
  'NODE_ENV',
  'NODE_OPTIONS',
  'PWD',
  'HOME',
  'USER',
  'PATH',
  'TZ',
  'LANG',
  'CI',
  // Framework/tooling sentinel flags read by bundled dependencies (debug,
  // pino, @mastra/* internals). Referencing these from the bundle is
  // expected and shouldn't be surfaced as a missing-env-var warning.
  'DEBUG',
  'DEBUG_FD',
  'DEBUG_COLORS',
  'DEBUG_DEPTH',
  'DEBUG_HIDE_DATE',
  'NO_COLOR',
  'FORCE_COLOR',
  'EXPERIMENTAL_FEATURES',
  'SKILLS_BASE_DIR',
]);
var ENV_VAR_ALLOWLIST_PREFIXES = [
  'MASTRA_',
  'npm_',
  'OTEL_',
  'NEXT_',
  'VERCEL_',
  'AWS_LAMBDA_',
  // Observational memory internal flags
  'OM_',
];
var LOCAL_PATHS_METADATA_FILE = 'preflight-local-paths.json';
async function preflightBuildOutput(targetDir, envVars) {
  const outputDir = join(targetDir, '.mastra', 'output');
  const entryPath = join(outputDir, 'index.mjs');
  try {
    await stat(entryPath);
  } catch {
    return [];
  }
  const bundleSources = await readBundleSources(outputDir);
  const combinedSource = bundleSources.join('\n');
  const issues = [];
  issues.push(...checkMissingEnvVars(combinedSource, envVars));
  issues.push(...(await checkLocalStoragePaths(outputDir)));
  return issues;
}
async function printPreflightIssues(issues, options) {
  if (issues.length === 0) return 'ok';
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  for (const issue of warnings) {
    p5.log.warn(`${pc8.yellow(`[${issue.code}]`)} ${issue.message}
  ${pc8.dim('\u2192')} ${issue.fix}`);
  }
  for (const issue of errors) {
    p5.log.error(`${pc8.red(`[${issue.code}]`)} ${issue.message}
  ${pc8.dim('\u2192')} ${issue.fix}`);
  }
  if (errors.length > 0) {
    p5.log.error(
      `Deploy blocked by ${errors.length} preflight error(s). Fix the issues above, or pass --skip-preflight to override.`,
    );
    return 'blocked';
  }
  if (options.autoAccept) return 'ok';
  const confirmed = await p5.confirm({
    message: `Found ${warnings.length} preflight warning(s). Deploy anyway?`,
    initialValue: true,
  });
  if (p5.isCancel(confirmed) || !confirmed) {
    return 'cancelled';
  }
  return 'ok';
}
async function readBundleSources(outputDir) {
  const files = await collectMjsFiles(outputDir);
  const contents = await Promise.all(files.map(f => readFile(f, 'utf-8').catch(() => '')));
  return contents;
}
async function collectMjsFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const name = typeof entry === 'string' ? entry : entry.name;
    if (name === 'node_modules') continue;
    const full = join(dir, name);
    const isDir = typeof entry === 'string' ? false : entry.isDirectory?.() === true;
    const isFile = typeof entry === 'string' ? true : entry.isFile?.() === true;
    if (isDir) {
      out.push(...(await collectMjsFiles(full)));
    } else if (isFile && (name.endsWith('.mjs') || name.endsWith('.js'))) {
      out.push(full);
    }
  }
  return out;
}
var PROCESS_ENV_REGEX = /\bprocess\.env\.([A-Z_][A-Z0-9_]*)\b/g;
var PROCESS_ENV_BRACKET_REGEX = /\bprocess\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g;
function checkMissingEnvVars(source, envVars) {
  const referenced = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(PROCESS_ENV_REGEX)) {
    referenced.add(match[1]);
  }
  for (const match of source.matchAll(PROCESS_ENV_BRACKET_REGEX)) {
    referenced.add(match[1]);
  }
  const provided = new Set(Object.keys(envVars));
  const missing = [];
  for (const name of referenced) {
    if (provided.has(name)) continue;
    if (ENV_VAR_ALLOWLIST_EXACT.has(name)) continue;
    if (ENV_VAR_ALLOWLIST_PREFIXES.some(prefix => name.startsWith(prefix))) continue;
    missing.push(name);
  }
  if (missing.length === 0) return [];
  missing.sort();
  return [
    {
      code: 'MISSING_ENV_VAR',
      severity: 'warning',
      message: `Build references ${missing.length} env var(s) not in the env file being deployed: ${missing.join(', ')}`,
      fix: `Add them to your env file, or confirm your code provides a fallback (e.g. \`process.env.X ?? 'default'\`).`,
    },
  ];
}
async function checkLocalStoragePaths(outputDir) {
  const metadataPath = join(outputDir, LOCAL_PATHS_METADATA_FILE);
  let detections;
  try {
    const raw = await readFile(metadataPath, 'utf-8');
    detections = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(detections) || detections.length === 0) return [];
  return detections.map(d => ({
    code: 'LOCAL_STORAGE_PATH',
    severity: 'error',
    message: `Build contains a host-local storage URL: ${truncate(d.value, 80)} (${d.hint})`,
    fix: `Replace it with a hosted URL (e.g. a Turso \`libsql://...\` URL or a public Postgres connection string) and store it in your env file.`,
  }));
}
function truncate(s, max) {
  return s.length <= max ? s : `${s.slice(0, max - 1)}\u2026`;
}

// src/utils/polling.ts
function isRetryablePollingError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  if ('name' in error && error.name === 'AbortError') {
    return true;
  }
  const cause = 'cause' in error && error.cause && typeof error.cause === 'object' ? error.cause : void 0;
  const code = cause && 'code' in cause && typeof cause.code === 'string' ? cause.code : void 0;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    return true;
  }
  return error instanceof TypeError && error.message.toLowerCase().includes('fetch failed');
}
async function withPollingRetries(fn, maxRetries = 3) {
  let retryCount = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryablePollingError(error) || retryCount >= maxRetries) {
        throw error;
      }
      await new Promise(resolve7 => setTimeout(resolve7, 500 * Math.pow(2, retryCount)));
      retryCount += 1;
    }
  }
}

// src/utils/deploy-upload.ts
async function bestEffortCancel(opts) {
  try {
    console.warn(`Cancelling deploy ${opts.deployId}...`);
    const { error, response } = await opts.postCancel(opts.client);
    if (error) {
      console.warn(
        `Warning: failed to cancel deploy ${opts.deployId} (${response.status}). It may remain in a queued state.`,
      );
    }
  } catch {
    console.warn(`Warning: failed to cancel deploy ${opts.deployId}. It may remain in a queued state.`);
  }
}
async function confirmUploadWithRetry(opts) {
  const {
    postUploadComplete,
    cancelDeploy,
    orgId,
    maxRetries = 3,
    refreshClient = async o => createApiClient(await getToken(), o),
  } = opts;
  let lastError;
  let currentClient = opts.client;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let completeError;
    let status;
    try {
      const result = await postUploadComplete(currentClient);
      if (!result.error) {
        return;
      }
      completeError = result.error;
      status = result.response.status;
    } catch (networkError) {
      completeError = networkError;
    }
    const isRetryableStatus = status !== void 0 && (status >= 500 || status === 401);
    const isRetryableNetwork = isRetryablePollingError(completeError);
    const isRetryable = isRetryableStatus || isRetryableNetwork;
    if (!isRetryable || attempt === maxRetries) {
      const apiMessage = extractApiErrorDetail(completeError);
      if (apiMessage) {
        lastError = new Error(apiMessage);
      } else {
        const detail2 =
          status !== void 0 ? `${status}` : completeError instanceof Error ? completeError.message : 'unknown error';
        lastError = new Error(`Upload confirmation failed: ${detail2}`);
      }
      break;
    }
    const delay = 1e3 * Math.pow(2, attempt);
    const detail = status ? `${status}` : completeError instanceof Error ? completeError.message : 'network error';
    console.warn(
      `Upload confirmation failed (${detail}), retrying in ${delay / 1e3}s... (attempt ${attempt + 1}/${maxRetries})`,
    );
    if (status === 401) {
      try {
        currentClient = await refreshClient(orgId);
      } catch (refreshError) {
        lastError = refreshError instanceof Error ? refreshError : new Error('Failed to refresh authentication token');
        break;
      }
    }
    await new Promise(r => setTimeout(r, delay));
  }
  await cancelDeploy(currentClient);
  throw lastError ?? new Error('Upload confirmation failed');
}

// src/commands/studio/platform-api.ts
async function fetchProjects(token, orgId) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.GET('/v1/studio/projects');
  if (error) {
    throwApiError('Failed to fetch projects', response.status, error.detail);
  }
  return data.projects;
}
async function createProject2(token, orgId, name) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.POST('/v1/studio/projects', {
    body: { name },
  });
  if (error) {
    throwApiError('Failed to create project', response.status, error.detail);
  }
  return data.project;
}
async function fetchDeployStatus(deployId, token, orgId) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.GET('/v1/studio/deploys/{id}', {
    params: { path: { id: deployId } },
  });
  if (error) {
    throwApiError('Failed to fetch deploy status', response.status, error.detail);
  }
  return data.deploy;
}
async function fetchDeployDiagnosis(deployId, token, orgId) {
  const resp = await platformFetch(`${MASTRA_PLATFORM_API_URL}/v1/studio/deploys/${deployId}/diagnosis`, {
    headers: authHeaders(token, orgId),
  });
  if (resp.status === 204) {
    return { state: 'healthy' };
  }
  if (!resp.ok) {
    let detail;
    try {
      const error = await resp.json();
      detail = error.detail;
    } catch {
      detail = void 0;
    }
    throwApiError('Failed to fetch deploy diagnosis', resp.status, detail);
  }
  const data = await resp.json();
  if (!data.diagnosis) {
    return { state: 'missing' };
  }
  return { state: 'ready', diagnosis: data.diagnosis };
}
async function startDeployDiagnosis(deployId, token, orgId) {
  const resp = await platformFetch(`${MASTRA_PLATFORM_API_URL}/v1/studio/deploys/${deployId}/diagnosis`, {
    method: 'POST',
    headers: authHeaders(token, orgId),
  });
  if (resp.status === 201 || resp.status === 304) {
    return;
  }
  let detail;
  try {
    const error = await resp.json();
    detail = error.detail;
  } catch {
    detail = void 0;
  }
  throwApiError('Failed to start deploy diagnosis', resp.status, detail);
}
async function uploadDeploy(token, orgId, projectId, zipBuffer, meta) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.POST('/v1/studio/deploys', {
    params: {
      header: {
        'x-project-id': projectId,
        'x-project-name': meta?.projectName,
        'x-git-branch': meta?.gitBranch,
        'x-mastra-version': meta?.mastraVersion,
      },
    },
    body: {
      envVars: meta?.envVars,
      ...(meta?.disablePlatformObservability !== void 0
        ? { disablePlatformObservability: meta.disablePlatformObservability }
        : {}),
    },
  });
  if (error) {
    throwApiError('Deploy failed', response.status, error.detail);
  }
  const { id, status, uploadUrl } = data.deploy;
  if (!uploadUrl) {
    throw new Error('No upload URL returned');
  }
  const cancel4 = c =>
    bestEffortCancel({
      postCancel: c2 => c2.POST('/v1/studio/deploys/{id}/cancel', { params: { path: { id } } }),
      client: c,
      deployId: id,
    });
  try {
    if (uploadUrl.startsWith('file://')) {
      const { writeFile: writeFile6 } = await import('fs/promises');
      const { fileURLToPath: fileURLToPath4 } = await import('url');
      await writeFile6(fileURLToPath4(uploadUrl), Buffer.from(zipBuffer));
    } else {
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/zip' },
        body: new Uint8Array(zipBuffer),
      });
      if (!uploadResp.ok) {
        throw new Error(`Artifact upload failed: ${uploadResp.status} ${uploadResp.statusText}`);
      }
    }
  } catch (uploadError) {
    await cancel4(client);
    throw uploadError;
  }
  await confirmUploadWithRetry({
    postUploadComplete: c => c.POST('/v1/studio/deploys/{id}/upload-complete', { params: { path: { id } } }),
    cancelDeploy: cancel4,
    client,
    orgId,
  });
  return { id, status };
}
async function streamDeployLogs(deployId, token, orgId, signal) {
  await new Promise(r => setTimeout(r, 2e3));
  const url = `${MASTRA_PLATFORM_API_URL}/v1/studio/deploys/${deployId}/logs/stream`;
  const resp = await platformFetch(url, {
    headers: authHeaders(token, orgId),
    signal,
  });
  if (!resp.ok || !resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let skipNextUrlMeta = false;
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data.includes('Mastra API running') || data.includes('Studio available')) {
          skipNextUrlMeta = true;
          continue;
        }
        if (skipNextUrlMeta) {
          skipNextUrlMeta = false;
          if (/^(\x1b\[\d+m)*url(\x1b\[\d+m)*:/.test(data)) continue;
        }
        await writeBarLine(data);
      }
    }
  }
}
async function pollDeploy(deployId, token, orgId, maxWaitMs = 6e5) {
  const start2 = Date.now();
  let lastStatus = '';
  let currentToken = token;
  const logAbort = new AbortController();
  streamDeployLogs(deployId, currentToken, orgId, logAbort.signal).catch(() => {});
  let client = createApiClient(currentToken, orgId);
  try {
    while (Date.now() - start2 < maxWaitMs) {
      const result = await withPollingRetries(() =>
        client.GET('/v1/studio/deploys/{id}', {
          params: { path: { id: deployId } },
        }),
      );
      const { data, error, response } = result;
      if (error) {
        if (response.status === 401) {
          currentToken = await getToken();
          client = createApiClient(currentToken, orgId);
          continue;
        }
        throwApiError('Poll failed', response.status, error.detail);
      }
      const { deploy } = data;
      if (deploy.status !== lastStatus) {
        lastStatus = deploy.status;
      }
      if (deploy.status === 'running' || deploy.status === 'failed' || deploy.status === 'stopped') {
        return deploy;
      }
      await new Promise(r => setTimeout(r, 2e3));
    }
    throw new Error('Deploy timed out');
  } finally {
    logAbort.abort();
  }
}
var PROJECT_CONFIG_FILE = '.mastra-project.json';
function getProjectConfigToSave(projectId, projectName, projectSlug, organizationId, projectConfig) {
  return {
    projectId,
    projectName,
    projectSlug,
    organizationId,
    ...(projectConfig?.disablePlatformObservability !== void 0
      ? { disablePlatformObservability: projectConfig.disablePlatformObservability }
      : {}),
  };
}
function resolveConfigPath(dir, configFile) {
  if (configFile) {
    return isAbsolute(configFile) ? configFile : join(dir, configFile);
  }
  return join(dir, PROJECT_CONFIG_FILE);
}
async function loadProjectConfig(dir, configFile) {
  try {
    const data = await readFile(resolveConfigPath(dir, configFile), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}
async function saveProjectConfig(dir, config6, configFile) {
  await writeFile(resolveConfigPath(dir, configFile), JSON.stringify(config6, null, 2) + '\n');
}

// src/commands/studio/deploy.ts
function elapsed(ms) {
  return ms < 1e3 ? `${Math.round(ms)}ms` : `${(ms / 1e3).toFixed(1)}s`;
}
function getPackageName(projectDir) {
  try {
    const raw = execSync(`node -p "require('./package.json').name"`, {
      cwd: projectDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return raw.startsWith('@') ? (raw.split('/')[1] ?? raw) : raw;
  } catch {
    return null;
  }
}
function getGitBranch(projectDir) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}
function getMastraVersion(projectDir) {
  try {
    const req = createRequire(join(projectDir, 'package.json'));
    const pkgJsonPath = req.resolve('mastra/package.json');
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    return pkgJson.version ?? null;
  } catch {
    return null;
  }
}
async function zipOutput(projectDir) {
  const outputDir = join(projectDir, '.mastra', 'output');
  const tmpDir = join(tmpdir(), 'mastra-deploy');
  await mkdir(tmpDir, { recursive: true });
  const zipPath = join(tmpDir, `deploy-${Date.now()}.zip`);
  return new Promise((resolvePromise, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    output.on('close', () => resolvePromise(zipPath));
    archive.on('error', reject);
    archive.pipe(output);
    archive.glob('**', { cwd: outputDir, ignore: ['node_modules/**'] }, { prefix: 'output' });
    void archive.finalize();
  });
}
function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    let key = trimmed.slice(0, eqIdx).trim();
    if (key.startsWith('export ')) key = key.slice(7).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) vars[key] = value;
  }
  return vars;
}
function loadDeployEnvFromDotenv(projectDir) {
  config({
    path: [join(projectDir, '.env'), join(projectDir, '.env.local'), join(projectDir, '.env.production')],
    quiet: true,
  });
}
async function getDeployEnvFiles(projectDir) {
  const entries = await readdir(projectDir, { withFileTypes: true });
  return entries
    .filter(
      entry =>
        (entry.isFile() || entry.isSymbolicLink()) &&
        (entry.name === '.env' || entry.name.startsWith('.env.')) &&
        !entry.name.endsWith('.example'),
    )
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
async function readEnvVars(projectDir, options = {}) {
  if (options.envFile) {
    const filePath = join(projectDir, options.envFile);
    try {
      await access(filePath);
    } catch {
      throw new Error(`Env file not found: ${options.envFile}`);
    }
    p5.log.step(`Using env file: ${options.envFile}`);
    return parseEnvFile(await readFile(filePath, 'utf-8'));
  }
  const availableDeployEnvFiles = await getDeployEnvFiles(projectDir);
  if (availableDeployEnvFiles.length === 0) {
    throw new Error('No env file found for deploy. Add a .env or .env.* file before deploying.');
  }
  let selectedEnvFile;
  if (availableDeployEnvFiles.length === 1) {
    selectedEnvFile = availableDeployEnvFiles[0];
  } else if (options.autoAccept) {
    throw new Error(
      `Multiple env files found: ${availableDeployEnvFiles.join(', ')}. Use --env-file to specify which one to deploy.`,
    );
  } else {
    const defaultFile =
      availableDeployEnvFiles.find(envFile => envFile === '.env.production') ?? availableDeployEnvFiles[0];
    const selected = await p5.select({
      message: 'Choose env file to deploy',
      options: availableDeployEnvFiles.map(envFile => ({ value: envFile, label: envFile })),
      initialValue: defaultFile,
    });
    if (p5.isCancel(selected)) {
      p5.cancel('Deploy cancelled.');
      process.exit(0);
    }
    selectedEnvFile = selected;
  }
  p5.log.step(`Using env file: ${selectedEnvFile}`);
  return parseEnvFile(await readFile(join(projectDir, selectedEnvFile), 'utf-8'));
}
async function resolveOrg(token, projectConfig, flagOrg) {
  const envOrgId = process.env.MASTRA_ORG_ID;
  if (envOrgId) {
    return { orgId: envOrgId, orgName: envOrgId };
  }
  if (flagOrg) {
    const orgs2 = await fetchOrgs(token);
    const match = orgs2.find(o => o.id === flagOrg);
    return { orgId: flagOrg, orgName: match?.name ?? flagOrg };
  }
  if (projectConfig?.organizationId) {
    const orgs2 = await fetchOrgs(token);
    const match = orgs2.find(o => o.id === projectConfig.organizationId);
    if (match) {
      return { orgId: match.id, orgName: match.name };
    }
  }
  const currentOrgId = await getCurrentOrgId();
  const orgs = await fetchOrgs(token);
  if (currentOrgId) {
    const match = orgs.find(o => o.id === currentOrgId);
    if (match) {
      return { orgId: match.id, orgName: match.name };
    }
  }
  if (orgs.length === 1) {
    return { orgId: orgs[0].id, orgName: orgs[0].name };
  }
  if (orgs.length === 0) {
    throw new Error(`You have no organizations. Please create one at ${MASTRA_STUDIO_URL}`);
  }
  const selected = await p5.select({
    message: 'Select an organization',
    options: orgs.map(o => ({ value: o.id, label: `${o.name} (${o.id})` })),
  });
  if (p5.isCancel(selected)) {
    p5.cancel('Deploy cancelled.');
    process.exit(0);
  }
  const selectedOrg = orgs.find(o => o.id === selected);
  return { orgId: selectedOrg.id, orgName: selectedOrg.name };
}
async function resolveProject(token, orgId, projectConfig, flagProject, defaultName, autoAccept) {
  const envProjectId = process.env.MASTRA_PROJECT_ID;
  if (envProjectId) {
    return { existing: true, projectId: envProjectId, projectName: envProjectId, projectSlug: envProjectId };
  }
  if (flagProject) {
    const projects2 = await fetchProjects(token, orgId);
    const byId = projects2.find(proj => proj.id === flagProject);
    const bySlug = projects2.find(proj => proj.slug === flagProject);
    const byName = projects2.filter(proj => proj.name === flagProject);
    if (!byId && !bySlug && byName.length > 1) {
      p5.cancel(
        `Multiple projects are named "${flagProject}". Pass --project with the project id or slug to disambiguate.`,
      );
      process.exit(1);
    }
    const match = byId ?? bySlug ?? (byName.length === 1 ? byName[0] : void 0);
    if (match) {
      return { existing: true, projectId: match.id, projectName: match.name, projectSlug: match.slug ?? match.name };
    }
    return { existing: false, projectName: flagProject };
  }
  if (projectConfig?.projectId && projectConfig.organizationId === orgId) {
    return {
      existing: true,
      projectId: projectConfig.projectId,
      projectName: projectConfig.projectName ?? projectConfig.projectId,
      projectSlug: projectConfig.projectSlug ?? projectConfig.projectName ?? projectConfig.projectId,
    };
  }
  const projects = await fetchProjects(token, orgId);
  const nameMatches = defaultName
    ? projects.filter(proj => proj.name === defaultName || proj.slug === defaultName)
    : [];
  if (projects.length > 0) {
    if (autoAccept) {
      if (nameMatches.length === 1) {
        const m = nameMatches[0];
        return { existing: true, projectId: m.id, projectName: m.name, projectSlug: m.slug ?? m.name };
      }
      throw new Error(
        `Found ${projects.length} existing project(s) in this organization. Pass --project <id-or-slug> to select one, or re-run without --yes to choose interactively.`,
      );
    }
    const CREATE_NEW = '__create_new__';
    const initialValue = nameMatches.length === 1 ? nameMatches[0].id : projects[0].id;
    const selected = await p5.select({
      message: 'Select a project to deploy to',
      initialValue,
      options: [
        ...projects.map(proj => ({
          value: proj.id,
          label: `${proj.name} (${proj.id})`,
        })),
        {
          value: CREATE_NEW,
          label: defaultName ? `\uFF0B Create new project "${defaultName}"` : '\uFF0B Create new project',
        },
      ],
    });
    if (p5.isCancel(selected)) {
      p5.cancel('Deploy cancelled.');
      process.exit(0);
    }
    if (selected !== CREATE_NEW) {
      const match = projects.find(proj => proj.id === selected);
      return { existing: true, projectId: match.id, projectName: match.name, projectSlug: match.slug ?? match.name };
    }
  }
  const name = defaultName;
  if (!name) {
    throw new Error('Could not determine project name from package.json. Use --project to specify one.');
  }
  return { existing: false, projectName: name };
}
async function deployAction(dir, opts) {
  const targetDir = resolve(dir || process.cwd());
  loadDeployEnvFromDotenv(targetDir);
  const isHeadless = Boolean(process.env.MASTRA_API_TOKEN);
  if (isHeadless && (!process.env.MASTRA_ORG_ID || !process.env.MASTRA_PROJECT_ID)) {
    throw new Error('MASTRA_ORG_ID and MASTRA_PROJECT_ID are required when MASTRA_API_TOKEN is set');
  }
  const autoAccept = opts.yes ?? isHeadless;
  const skipPreflight = opts.skipPreflight || process.env.MASTRA_SKIP_PREFLIGHT === '1';
  p5.intro('mastra studio deploy');
  const packageName = getPackageName(targetDir);
  const gitBranch = getGitBranch(targetDir);
  const mastraVersion = getMastraVersion(targetDir);
  const token = await getToken();
  const projectConfig = await loadProjectConfig(targetDir, opts.config);
  const { orgId, orgName } = await resolveOrg(token, projectConfig, opts.org);
  const resolution = await resolveProject(token, orgId, projectConfig, opts.project, packageName, autoAccept);
  let projectId;
  let projectName;
  let projectSlug;
  if (resolution.existing) {
    projectId = resolution.projectId;
    projectName = resolution.projectName;
    projectSlug = resolution.projectSlug;
    const isAlreadyLinked = projectConfig?.projectId === projectId && projectConfig?.organizationId === orgId;
    p5.note(
      [
        `Organization:  ${orgName}`,
        `Project:       ${projectName}`,
        `Directory:     ${targetDir}`,
        ...(gitBranch ? [`Git branch:    ${gitBranch}`] : []),
        ...(mastraVersion ? [`Mastra:        ${mastraVersion}`] : []),
      ].join('\n'),
      'Deploy settings',
    );
    if (!autoAccept) {
      const confirmed = await p5.confirm({
        message: 'Deploy with these settings?',
      });
      if (p5.isCancel(confirmed) || !confirmed) {
        p5.cancel('Deploy cancelled.');
        process.exit(0);
      }
    }
    if (!isAlreadyLinked) {
      await saveProjectConfig(
        targetDir,
        getProjectConfigToSave(projectId, projectName, projectSlug, orgId, projectConfig),
        opts.config,
      );
      p5.log.success(`Saved ${opts.config || '.mastra-project.json'}`);
    }
  } else {
    projectName = resolution.projectName;
    p5.note(
      [
        `Organization:  ${orgName}`,
        `Project:       ${projectName} (new)`,
        `Directory:     ${targetDir}`,
        ...(gitBranch ? [`Git branch:    ${gitBranch}`] : []),
        ...(mastraVersion ? [`Mastra:        ${mastraVersion}`] : []),
      ].join('\n'),
      'Deploy settings',
    );
    if (!autoAccept) {
      const confirmed = await p5.confirm({
        message: 'Create project and deploy?',
      });
      if (p5.isCancel(confirmed) || !confirmed) {
        p5.cancel('Deploy cancelled.');
        process.exit(0);
      }
    }
    const project = await createProject2(token, orgId, projectName);
    projectId = project.id;
    projectSlug = project.slug ?? project.name;
    p5.log.success(`Created project "${projectName}"`);
    await saveProjectConfig(
      targetDir,
      getProjectConfigToSave(projectId, projectName, projectSlug, orgId, projectConfig),
      opts.config,
    );
    p5.log.success(`Saved ${opts.config || '.mastra-project.json'}`);
  }
  const s = p5.spinner();
  const tTotal = performance.now();
  let t2;
  const mastraDir = join(targetDir, 'src', 'mastra');
  const outputDirectory = join(targetDir, '.mastra');
  const staleness = await checkBuildStaleness(targetDir, mastraDir, outputDirectory);
  if (opts.skipBuild) {
    if (staleness.isStale && staleness.reason !== 'no-build') {
      if (staleness.reason === 'hash-mismatch') {
        p5.log.warn('Source files have changed since last build. Deploy may not reflect latest changes.');
      } else if (staleness.reason === 'no-manifest') {
        p5.log.warn('No build manifest found. Cannot verify if build is up-to-date.');
      }
    }
    p5.log.step('Skipping build (--skip-build)');
  } else if (staleness.isStale) {
    t2 = performance.now();
    if (staleness.reason === 'hash-mismatch') {
      p5.log.step('Source files changed, rebuilding...');
    }
    await runBuild(targetDir, { debug: opts.debug });
    p5.log.step(`Build completed (${elapsed(performance.now() - t2)})`);
  } else {
    p5.log.step('Build is up-to-date, skipping rebuild');
  }
  const outputEntry = join(targetDir, '.mastra', 'output', 'index.mjs');
  try {
    await access(outputEntry);
  } catch {
    throw new Error('.mastra/output/index.mjs not found \u2014 did the build succeed?');
  }
  const envVars = await readEnvVars(targetDir, { autoAccept, envFile: opts.envFile });
  const envCount = Object.keys(envVars).length;
  if (envCount > 0) {
    p5.log.step(`Found ${envCount} env var(s)`);
  } else {
    p5.log.step('No env vars found in selected env file');
  }
  if (!skipPreflight) {
    const issues = await preflightBuildOutput(targetDir, envVars);
    const outcome = await printPreflightIssues(issues, { autoAccept });
    if (outcome === 'blocked') {
      p5.cancel('Deploy blocked by preflight errors.');
      process.exit(1);
    }
    if (outcome === 'cancelled') {
      p5.cancel('Deploy cancelled.');
      process.exit(0);
    }
  }
  t2 = performance.now();
  s.start('Zipping build artifact...');
  const zipPath = await zipOutput(targetDir);
  const zipStat = await stat(zipPath);
  const sizeKB = zipStat.size / 1024;
  const sizeLabel = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB.toFixed(1)}KB`;
  s.stop(`Created ${sizeLabel} archive (${elapsed(performance.now() - t2)})`);
  t2 = performance.now();
  s.start('Uploading...');
  const zipBuffer = await readFile(zipPath);
  const deployResult = await uploadDeploy(token, orgId, projectId, zipBuffer, {
    gitBranch: gitBranch ?? void 0,
    projectName,
    envVars: envCount > 0 ? envVars : void 0,
    mastraVersion: mastraVersion ?? void 0,
    disablePlatformObservability: projectConfig?.disablePlatformObservability === true,
  });
  s.stop(`Uploaded (${elapsed(performance.now() - t2)})`);
  await rm(zipPath, { force: true });
  p5.log.step('Streaming deploy logs...');
  const finalStatus = await pollDeploy(deployResult.id, token, orgId);
  if (finalStatus.status === 'running') {
    p5.outro(`Deploy succeeded in ${elapsed(performance.now() - tTotal)}! ${finalStatus.instanceUrl}`);
  } else if (finalStatus.status === 'failed') {
    p5.log.error(`Deploy failed: ${finalStatus.error}`);
    process.exit(1);
  } else {
    p5.log.warning(`Deploy ended with status: ${finalStatus.status}`);
    process.exit(1);
  }
}

// src/commands/lint/rules/mastraCoreRule.ts
var mastraCoreRule = {
  name: 'mastra-core',
  description: 'Checks if @mastra/core is installed',
  async run(context) {
    const hasCore = context.mastraPackages.some(pkg => pkg.name === '@mastra/core');
    if (!hasCore) {
      return [
        {
          code: 'MISSING_MASTRA_CORE',
          severity: 'error',
          scope: 'project',
          message: '@mastra/core is not installed. This package is required for Mastra to work properly.',
          fix: 'Install @mastra/core: pnpm add @mastra/core',
        },
      ];
    }
    return [];
  },
};
function unwrapExpression(expression) {
  if (t.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  return expression;
}
function getPropertyName(property) {
  if (property.computed) {
    return null;
  }
  if (t.isIdentifier(property.key)) {
    return property.key.name;
  }
  if (t.isStringLiteral(property.key)) {
    return property.key.value;
  }
  return null;
}
function readStringArray(expression) {
  const arrayExpression = unwrapExpression(expression);
  if (!t.isArrayExpression(arrayExpression)) {
    return null;
  }
  const values = [];
  for (const element of arrayExpression.elements) {
    if (!t.isStringLiteral(element)) {
      return null;
    }
    values.push(element.value);
  }
  return values;
}
function readServerExternalPackages(config6) {
  for (const property of config6.properties) {
    if (!t.isObjectProperty(property) || !t.isExpression(property.value)) {
      continue;
    }
    if (getPropertyName(property) !== 'serverExternalPackages') {
      continue;
    }
    return readStringArray(property.value) ?? void 0;
  }
  return void 0;
}
function parseProgram(nextConfigContent) {
  return parse$1(nextConfigContent, {
    sourceType: 'unambiguous',
    plugins: ['typescript', 'jsx', 'importAttributes'],
  }).program;
}
function collectNextConfigVariables(program2) {
  const variables = /* @__PURE__ */ new Map();
  for (const node of program2.body) {
    if (!t.isVariableDeclaration(node)) {
      continue;
    }
    for (const declaration of node.declarations) {
      if (!t.isIdentifier(declaration.id) || !declaration.init) {
        continue;
      }
      const initializer = unwrapExpression(declaration.init);
      if (t.isObjectExpression(initializer)) {
        variables.set(declaration.id.name, initializer);
      }
    }
  }
  return variables;
}
function resolveObjectExpression(expression, variables) {
  const unwrappedExpression = unwrapExpression(expression);
  if (t.isObjectExpression(unwrappedExpression)) {
    return unwrappedExpression;
  }
  if (t.isIdentifier(unwrappedExpression)) {
    return variables.get(unwrappedExpression.name) ?? null;
  }
  return null;
}
function isModuleExportsAssignment(expression) {
  if (!t.isAssignmentExpression(expression) || expression.operator !== '=') {
    return false;
  }
  const { left } = expression;
  return (
    t.isMemberExpression(left) &&
    !left.computed &&
    t.isIdentifier(left.object) &&
    left.object.name === 'module' &&
    t.isIdentifier(left.property) &&
    left.property.name === 'exports'
  );
}
function findNextConfigObject(program2) {
  const nextConfigVariables = collectNextConfigVariables(program2);
  const namedNextConfig = nextConfigVariables.get('nextConfig');
  if (namedNextConfig) {
    return namedNextConfig;
  }
  for (const node of program2.body) {
    if (t.isExpressionStatement(node) && isModuleExportsAssignment(node.expression)) {
      const moduleExportsConfig = resolveObjectExpression(node.expression.right, nextConfigVariables);
      if (moduleExportsConfig) {
        return moduleExportsConfig;
      }
    }
    if (t.isExportDefaultDeclaration(node) && t.isExpression(node.declaration)) {
      const exportedConfig = resolveObjectExpression(node.declaration, nextConfigVariables);
      if (exportedConfig) {
        return exportedConfig;
      }
    }
  }
  return null;
}
function parseNextConfig(nextConfigContent) {
  if (!nextConfigContent.includes('serverExternalPackages')) {
    return {};
  }
  const program2 = parseProgram(nextConfigContent);
  const config6 = findNextConfigObject(program2);
  if (!config6) {
    return null;
  }
  return {
    serverExternalPackages: readServerExternalPackages(config6),
  };
}
function readNextConfig(dir) {
  const nextConfigPath = join(dir, 'next.config.js');
  try {
    const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
    return parseNextConfig(nextConfigContent);
  } catch {
    return null;
  }
}
function isNextJsProject(dir) {
  const nextConfigPath = join(dir, 'next.config.js');
  try {
    readFileSync(nextConfigPath, 'utf-8');
    return true;
  } catch {
    return false;
  }
}
var nextConfigRule = {
  name: 'next-config',
  description: 'Checks if Next.js config is properly configured for Mastra packages',
  async run(context) {
    if (!isNextJsProject(context.rootDir)) {
      return [];
    }
    const nextConfig = readNextConfig(context.rootDir);
    if (!nextConfig) {
      return [
        {
          code: 'NEXT_MISSING_SERVER_EXTERNAL_PACKAGES',
          severity: 'error',
          scope: 'project',
          message: 'next.config.js could not be parsed for serverExternalPackages.',
          fix: 'Ensure next.config.js exports a plain object and includes serverExternalPackages: ["@mastra/*"].',
        },
      ];
    }
    const serverExternals = nextConfig.serverExternalPackages || [];
    const hasMastraExternals = serverExternals.some(
      pkg => pkg === '@mastra/*' || pkg === '@mastra/core' || pkg.startsWith('@mastra/'),
    );
    if (!hasMastraExternals) {
      return [
        {
          code: 'NEXT_MISSING_SERVER_EXTERNAL_PACKAGES',
          severity: 'error',
          scope: 'project',
          message: 'next.config.js is missing Mastra packages in serverExternalPackages.',
          fix: 'Add serverExternalPackages: ["@mastra/*"] to your next.config.js.',
        },
      ];
    }
    return [];
  },
};
function readTsConfig(dir) {
  const tsConfigPath = join(dir, 'tsconfig.json');
  try {
    const tsConfigContent = readFileSync(tsConfigPath, 'utf-8');
    const cleanTsConfigContent = stripJsonComments(tsConfigContent);
    return JSON.parse(cleanTsConfigContent);
  } catch {
    return null;
  }
}
var tsConfigRule = {
  name: 'ts-config',
  description: 'Checks if TypeScript config is properly configured for Mastra packages',
  async run(context) {
    const tsConfig = readTsConfig(context.rootDir);
    if (!tsConfig) {
      return [
        {
          code: 'MISSING_TSCONFIG',
          severity: 'warning',
          scope: 'project',
          message: 'No tsconfig.json found. Mastra projects should include a TypeScript config.',
          fix: 'Add a tsconfig.json file. See https://mastra.ai/en/docs/getting-started/installation#initialize-typescript',
        },
      ];
    }
    const { module, moduleResolution } = tsConfig.compilerOptions || {};
    const isValidConfig = moduleResolution === 'bundler' || module === 'CommonJS';
    if (!isValidConfig) {
      return [
        {
          code: 'INVALID_TSCONFIG',
          severity: 'error',
          scope: 'project',
          message:
            'tsconfig.json must set either compilerOptions.moduleResolution to "bundler" or compilerOptions.module to "CommonJS".',
          fix: 'Update tsconfig.json with either { "compilerOptions": { "moduleResolution": "bundler" } } or { "compilerOptions": { "module": "CommonJS" } }. See https://mastra.ai/en/docs/getting-started/installation#initialize-typescript',
        },
      ];
    }
    return [];
  },
};

// src/commands/lint/rules/index.ts
var rules = [nextConfigRule, tsConfigRule, mastraCoreRule];

// src/commands/lint/index.ts
function readPackageJson(dir) {
  const packageJsonPath = join(dir, 'package.json');
  try {
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    return JSON.parse(packageJsonContent);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to read package.json', { error: error.message });
    }
    throw error;
  }
}
function getMastraPackages2(packageJson) {
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const mastraPackages = Object.entries(allDependencies).filter(
    ([name]) => name.startsWith('@mastra/') || name === 'mastra',
  );
  return mastraPackages.map(([name, version2]) => ({
    name,
    version: version2,
    isAlpha: version2.includes('alpha'),
  }));
}
function toLintIssue(issue) {
  return {
    ...issue,
    code: issue.code,
    scope: 'bundle',
  };
}
function createLintResult(issues, error) {
  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;
  return {
    ok: error === void 0 && errorCount === 0,
    issues,
    errorCount,
    warningCount,
    ...(error !== void 0 ? { error } : {}),
  };
}
async function lint(options) {
  const rootDir = options.root || process.cwd();
  const mastraDir = options.dir ? resolve(options.dir) : join(rootDir, 'src', 'mastra');
  const outputDirectory = join(rootDir, '.mastra');
  try {
    const defaultToolsPath = join(mastraDir, 'tools');
    const discoveredTools = [defaultToolsPath, ...(options.tools ?? [])];
    const packageJson = readPackageJson(rootDir);
    const mastraPackages = getMastraPackages2(packageJson);
    const context = {
      rootDir,
      mastraDir,
      outputDirectory,
      discoveredTools,
      packageJson,
      mastraPackages,
    };
    const projectIssues = (await Promise.all(rules.map(rule => rule.run(context)))).flat();
    if (projectIssues.every(issue => issue.severity !== 'error')) {
      const fileService = new FileService();
      const mastraEntryFile = fileService.getFirstExistingFile([
        join(mastraDir, 'index.ts'),
        join(mastraDir, 'index.js'),
      ]);
      const platformDeployer = await getDeployer(mastraEntryFile, outputDirectory);
      if (!platformDeployer) {
        const deployer = new BuildBundler();
        await deployer.lint(mastraEntryFile, outputDirectory, discoveredTools);
      } else {
        await platformDeployer.lint(mastraEntryFile, outputDirectory, discoveredTools);
      }
    }
    const issues = [...projectIssues];
    if (options.preflight) {
      if (!options.skipBuild) {
        await runBuild(rootDir, { debug: options.debug });
      }
      const envVars = await readEnvVars(rootDir, {
        envFile: options.envFile,
        autoAccept: options.json ?? false,
      });
      const preflightIssues = await preflightBuildOutput(rootDir, envVars);
      issues.push(...preflightIssues.map(toLintIssue));
    }
    return createLintResult(issues);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Lint check failed', { error: message });
    return createLintResult([], message);
  }
}
function printLintReport(result, options = {}) {
  if (result.error) {
    p5.log.error(result.error);
    return;
  }
  if (result.issues.length === 0) {
    p5.log.success('No issues found.');
    return;
  }
  const warningsAreErrors = options.strict && result.warningCount > 0 && result.errorCount === 0;
  for (const issue of result.issues) {
    const prefix =
      issue.severity === 'error' || warningsAreErrors ? pc8.red(`[${issue.code}]`) : pc8.yellow(`[${issue.code}]`);
    const message = `${prefix} ${issue.message}
  ${pc8.dim('scope:')} ${issue.scope}
  ${pc8.dim('\u2192')} ${issue.fix}`;
    if (issue.severity === 'error' || warningsAreErrors) {
      p5.log.error(message);
    } else {
      p5.log.warn(message);
    }
  }
  if (warningsAreErrors) {
    p5.log.error(`Lint failed in --strict mode: ${result.warningCount} warning(s) treated as errors.`);
  }
}
function emitLintJson(result, options = {}) {
  const blocked = result.error !== void 0 || result.errorCount > 0 || (options.strict && result.warningCount > 0);
  process.stdout.write(
    JSON.stringify(
      {
        ok: !blocked,
        strict: options.strict ?? false,
        errorCount: result.errorCount,
        warningCount: result.warningCount,
        issues: result.issues,
        ...(result.error !== void 0 ? { error: result.error } : {}),
      },
      null,
      2,
    ) + '\n',
  );
}

// src/commands/actions/lint-project.ts
var lintProject = async args => {
  await analytics.trackCommandExecution({
    command: 'lint',
    args,
    execution: async () => {
      const json = args.json ?? false;
      if (!json) {
        p5.intro(args.preflight ? 'mastra lint --preflight' : 'mastra lint');
      }
      const result = await lint({
        dir: args.dir,
        root: args.root,
        tools: args.tools ? args.tools.split(',') : [],
        preflight: args.preflight,
        skipBuild: args.skipBuild,
        envFile: args.envFile,
        strict: args.strict,
        json,
        debug: args.debug,
      });
      if (json) {
        emitLintJson(result, { strict: args.strict });
      } else {
        printLintReport(result, { strict: args.strict });
      }
      const blocked = result.error !== void 0 || result.errorCount > 0 || (args.strict && result.warningCount > 0);
      if (blocked) {
        if (!json) {
          p5.outro(pc8.red('\u2716 Lint failed'));
        }
        process.exit(1);
      }
      if (!json) {
        if (result.warningCount > 0) {
          p5.outro(pc8.yellow(`\u2713 Lint passed with ${result.warningCount} warning(s)`));
        } else {
          p5.outro(pc8.green('\u2713 Lint passed'));
        }
      }
    },
    origin: origin2,
  });
};
function formatCategoryName(category) {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
function formatTable(scorers) {
  if (scorers.length === 0) return '';
  const nameWidth = Math.max(4, Math.max(...scorers.map(s => s.name.length)));
  const idWidth = Math.max(2, Math.max(...scorers.map(s => s.id.length)));
  const typeWidth = Math.max(4, Math.max(...scorers.map(s => s.type.length)));
  const descWidth = Math.max(11, Math.max(...scorers.map(s => s.description.length)));
  const header = `${pc8.bold('Name'.padEnd(nameWidth))} \u2502 ${pc8.bold('ID'.padEnd(idWidth))} \u2502 ${pc8.bold('Type'.padEnd(typeWidth))} \u2502 ${pc8.bold('Description'.padEnd(descWidth))}`;
  const separator =
    '\u2500'.repeat(nameWidth) +
    '\u2500\u253C\u2500' +
    '\u2500'.repeat(idWidth) +
    '\u2500\u253C\u2500' +
    '\u2500'.repeat(typeWidth) +
    '\u2500\u253C\u2500' +
    '\u2500'.repeat(descWidth) +
    '\u2500';
  const rows = scorers.map(
    scorer =>
      `${(scorer?.name ?? scorer?.id).padEnd(nameWidth)} \u2502 ${pc8.dim(scorer.id.padEnd(idWidth))} \u2502 ${scorer.type.padEnd(typeWidth)} \u2502 ${pc8.dim(scorer.description.padEnd(descWidth))}`,
  );
  return [header, separator, ...rows].join('\n');
}
function listAllScorers() {
  p5.intro(pc8.inverse(' Available Scorers '));
  const groupedScorers = AVAILABLE_SCORERS.reduce((acc, scorer) => {
    if (!acc[scorer.category]) {
      acc[scorer.category] = [];
    }
    acc[scorer.category].push(scorer);
    return acc;
  }, {});
  for (const [category, scorers] of Object.entries(groupedScorers)) {
    p5.log.info(`${pc8.bold(pc8.cyan(formatCategoryName(category)))} Scorers:`);
    p5.log.message(formatTable(scorers));
  }
}

// src/commands/actions/list-scorers.ts
var origin5 = process.env.MASTRA_ANALYTICS_ORIGIN;
var listScorers = async args => {
  await analytics.trackCommandExecution({
    command: 'scorers-list',
    args,
    execution: async () => {
      return listAllScorers();
    },
    origin: origin5,
  });
};
var IGNORED_DIRECTORIES = /* @__PURE__ */ new Set([
  'node_modules',
  '.git',
  '.mastra',
  '.turbo',
  '.next',
  'dist',
  'build',
  'coverage',
]);
function resolveMigratePaths(args) {
  const rootDir = args.root ? (isAbsolute(args.root) ? args.root : join(args.cwd, args.root)) : args.cwd;
  const mastraDir = args.dir
    ? isAbsolute(args.dir)
      ? args.dir
      : join(rootDir, args.dir)
    : join(rootDir, 'src', 'mastra');
  return { rootDir, mastraDir };
}
function resolveMigrateEntryFile(mastraDir) {
  const checkedPaths = [join(mastraDir, 'index.ts'), join(mastraDir, 'index.js')];
  const entryFile = checkedPaths.find(path3 => existsSync(path3));
  return { checkedPaths, entryFile };
}
function isMastraSourceDirectory(path3) {
  const parts = path3.split(sep);
  return parts.length >= 2 && parts[parts.length - 1] === 'mastra' && parts[parts.length - 2] === 'src';
}
function findMastraEntryCandidates(rootDir, maxCandidates = 5) {
  const candidates = [];
  const queue = [rootDir];
  while (queue.length > 0 && candidates.length < maxCandidates) {
    const currentDir = queue.pop();
    let entries;
    try {
      entries = readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryName = entry.name;
      const fullPath = join(currentDir, entryName);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entryName)) {
          continue;
        }
        queue.push(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if ((entryName === 'index.ts' || entryName === 'index.js') && isMastraSourceDirectory(currentDir)) {
        candidates.push(fullPath);
        if (candidates.length >= maxCandidates) {
          break;
        }
      }
    }
  }
  return candidates.sort();
}
function toDetectedProjectRoot(entryFile) {
  return dirname(dirname(dirname(entryFile)));
}
var MigrateBundler = class extends BuildBundler {
  customEnvFile;
  constructor(customEnvFile) {
    super({ studio: false });
    this.customEnvFile = customEnvFile;
  }
  getEnvFiles() {
    if (shouldSkipDotenvLoading()) {
      return Promise.resolve([]);
    }
    const possibleFiles = ['.env.development', '.env.local', '.env'];
    if (this.customEnvFile) {
      possibleFiles.unshift(this.customEnvFile);
    }
    try {
      const fileService = new FileService$2();
      const envFile = fileService.getFirstExistingFile(possibleFiles);
      return Promise.resolve([envFile]);
    } catch {}
    return Promise.resolve([]);
  }
  async bundle(entryFile, outputDirectory, { toolsPaths, projectRoot }) {
    return this._bundle(this.getEntry(), entryFile, { outputDirectory, projectRoot }, toolsPaths);
  }
  getEntry() {
    return `
    import { mastra } from '#mastra';

    async function runMigration() {
      const storage = mastra.getStorage();

      if (!storage) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Storage not configured. Please configure storage in your Mastra instance.',
        }));
        process.exit(1);
      }

      // Access the observability store directly from storage.stores
      const observabilityStore = storage.stores?.observability;

      if (!observabilityStore) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Observability storage not configured. Migration not required.',
        }));
        process.exit(0);
      }

      // Check if the store has a migrateSpans method
      if (typeof observabilityStore.migrateSpans !== 'function') {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Migration not supported for this storage backend.',
        }));
        process.exit(1);
      }

      try {
        // Run the migration - migrateSpans handles everything internally
        const result = await observabilityStore.migrateSpans();

        console.log(JSON.stringify({
          success: result.success,
          alreadyMigrated: result.alreadyMigrated,
          duplicatesRemoved: result.duplicatesRemoved,
          message: result.message,
        }));

        process.exit(result.success ? 0 : 1);
      } catch (error) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: error instanceof Error ? error.message : 'Unknown error during migration',
        }));
        process.exit(1);
      }
    }

    runMigration();
    `;
  }
};

// src/commands/migrate/migrate.ts
function quoteShellArg(value) {
  return `"${value.replace(/(["\\$`])/gu, '\\$1')}"`;
}
async function migrate({ dir, root, env, debug, yes }) {
  const logger2 = createLogger(debug);
  const { rootDir, mastraDir } = resolveMigratePaths({
    cwd: process4.cwd(),
    root,
    dir,
  });
  const { checkedPaths, entryFile } = resolveMigrateEntryFile(mastraDir);
  const dotMastraPath = join(rootDir, '.mastra');
  if (!entryFile) {
    logger2.error(pc8.red('Error: Could not find Mastra entry file.'));
    logger2.info('');
    logger2.info('Expected one of the following files:');
    checkedPaths.forEach(path3 => logger2.info(`  - ${path3}`));
    logger2.info('');
    logger2.info('This command requires a Mastra entrypoint (src/mastra/index.ts or index.js).');
    logger2.info('If your project is in a custom location (for example in a monorepo), run:');
    logger2.info(pc8.cyan('  npx mastra migrate --dir <path/to/src/mastra> --root <path/to/project-root>'));
    logger2.info(pc8.cyan('  pnpm exec mastra migrate --dir <path/to/src/mastra> --root <path/to/project-root>'));
    const candidates = findMastraEntryCandidates(rootDir, 5);
    if (candidates.length > 0) {
      logger2.info('');
      logger2.info('Detected candidate entrypoints under the selected root:');
      for (const candidate of candidates) {
        const rootBase = toDetectedProjectRoot(candidate);
        const suggestedDir = relative(rootBase, candidate).replace(/[\\/]index\.(ts|js)$/u, '');
        const suggestedRoot = relative(process4.cwd(), rootBase) || '.';
        logger2.info(`  - ${candidate}`);
        logger2.info(
          pc8.dim(
            `    Example: npx mastra migrate --dir ${quoteShellArg(suggestedDir)} --root ${quoteShellArg(suggestedRoot)}`,
          ),
        );
      }
    }
    process4.exit(1);
  }
  p5.intro(pc8.cyan('Mastra Storage Migration'));
  if (!yes) {
    p5.log.warn(pc8.yellow('Warning: This migration will modify your database.'));
    p5.log.message('Before proceeding, please ensure you have:');
    p5.log.message('  \u2022 Created a backup of your database');
    p5.log.message('  \u2022 Tested this migration in a non-production environment');
    const confirmed = await p5.confirm({
      message: 'Have you backed up your database and are ready to proceed?',
      initialValue: false,
    });
    if (p5.isCancel(confirmed) || !confirmed) {
      p5.log.info('Migration cancelled. Please back up your database before running this command.');
      p5.log.message(pc8.dim('Tip: Use --yes or -y to skip this prompt in CI/automation.'));
      process4.exit(0);
    }
  }
  try {
    const bundler = new MigrateBundler(env);
    bundler.__setLogger(logger2);
    logger2.info('Building project for migration...');
    await bundler.prepare(dotMastraPath);
    const discoveredTools = bundler.getAllToolPaths(mastraDir, []);
    await bundler.bundle(entryFile, dotMastraPath, {
      toolsPaths: discoveredTools,
      projectRoot: rootDir,
    });
    logger2.info('Running migration...');
    logger2.info(pc8.dim('This may take a while for large tables.'));
    logger2.info('');
    const loadedEnv = await bundler.loadEnvVars();
    const migrationProcess = execa(process4.execPath, [join(dotMastraPath, 'output', 'index.mjs')], {
      cwd: rootDir,
      env: {
        NODE_ENV: 'production',
        MASTRA_DISABLE_STORAGE_INIT: 'true',
        // Prevent MIGRATION_REQUIRED error during import
        ...Object.fromEntries(loadedEnv),
      },
      stdio: ['inherit', 'pipe', 'pipe'],
      reject: false,
    });
    let stdoutData = '';
    let stderrData = '';
    migrationProcess.stdout?.on('data', data => {
      stdoutData += data.toString();
    });
    migrationProcess.stderr?.on('data', data => {
      stderrData += data.toString();
      if (debug) {
        process4.stderr.write(data);
      }
    });
    const processResult = await migrationProcess;
    let result;
    try {
      const jsonMatch = stdoutData.match(/\{[^{}]*"success"[^{}]*\}/g);
      if (jsonMatch && jsonMatch.length > 0) {
        result = JSON.parse(jsonMatch[jsonMatch.length - 1]);
      }
    } catch {}
    if (result) {
      if (result.success) {
        if (result.alreadyMigrated) {
          logger2.info(pc8.green('\u2713 Migration already complete.'));
        } else {
          logger2.info(pc8.green('\u2713 Migration completed successfully!'));
          if (result.duplicatesRemoved > 0) {
            logger2.info('Removed duplicate entries', { count: result.duplicatesRemoved });
          }
        }
        logger2.info(result.message);
      } else {
        logger2.error(pc8.red('\u2717 Migration failed.'));
        logger2.error(result.message);
        process4.exit(1);
      }
    } else {
      if (processResult.exitCode !== 0) {
        logger2.error(pc8.red('\u2717 Migration failed.'));
        if (stderrData) {
          logger2.error(stderrData);
        }
        if (stdoutData && !stdoutData.includes('"success"')) {
          logger2.error(stdoutData);
        }
        process4.exit(1);
      } else {
        logger2.info(pc8.green('\u2713 Migration completed.'));
      }
    }
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
      logger2.error(pc8.red('Error: Could not find Mastra entry file.'));
      logger2.info('');
      logger2.info('Make sure your Mastra directory has an index.ts or index.js file.');
      logger2.info('Expected location', { path: mastraDir });
      logger2.info('');
      logger2.info('You can specify a custom directory:');
      logger2.info(pc8.cyan('  npx mastra migrate --dir <path/to/src/mastra> --root <path/to/project-root>'));
    } else {
      logger2.error(pc8.red(`Error: ${error.message}`));
      if (debug) {
        logger2.error(error);
      }
    }
    process4.exit(1);
  }
}

// src/commands/actions/migrate.ts
var migrate2 = async args => {
  await analytics.trackCommandExecution({
    command: 'mastra migrate',
    args: { ...args },
    execution: async () => {
      await migrate({
        dir: args?.dir,
        root: args?.root,
        env: args?.env,
        debug: args?.debug ?? false,
        yes: args?.yes ?? false,
      });
    },
    origin: origin2,
  });
};
var DevLogger = class {
  options;
  constructor(options = {}) {
    this.options = {
      timestamp: false,
      colors: true,
      ...options,
    };
  }
  formatTime() {
    if (!this.options.timestamp) return '';
    return pc8.dim(/* @__PURE__ */ new Date().toLocaleTimeString());
  }
  formatPrefix(text3, color2) {
    const time = this.formatTime();
    const prefix = pc8.bold(color2(text3));
    return time ? `${time} ${prefix}` : prefix;
  }
  info(message) {
    const prefix = this.formatPrefix('\u25D0', pc8.cyan);
    console.info(`${prefix} ${message}`);
  }
  success(message) {
    const prefix = this.formatPrefix('\u2713', pc8.green);
    console.info(`${prefix} ${pc8.green(message)}`);
  }
  warn(message) {
    const prefix = this.formatPrefix('\u26A0', pc8.yellow);
    console.info(`${prefix} ${pc8.yellow(message)}`);
  }
  error(message) {
    const prefix = this.formatPrefix('\u2717', pc8.red);
    console.info(`${prefix} ${pc8.red(message)}`);
  }
  starting() {
    const prefix = this.formatPrefix('\u25C7', pc8.blue);
    console.info(`${prefix} ${pc8.blue('Starting Mastra dev server...')}`);
  }
  ready(host, port, studioBasePath, apiPrefix, startTime, https) {
    let protocol = 'http';
    if (https && https.key && https.cert) {
      protocol = 'https';
    }
    console.info('');
    const timing = startTime ? `${Date.now() - startTime} ms` : 'XXX ms';
    console.info(pc8.inverse(pc8.green(' mastra ')) + ` ${pc8.green(version)} ${pc8.gray('ready in')} ${timing}`);
    console.info('');
    console.info(
      `${pc8.dim('\u2502')} ${pc8.bold('Studio:')} ${pc8.cyan(`${protocol}://${host}:${port}${studioBasePath}`)}`,
    );
    console.info(`${pc8.dim('\u2502')} ${pc8.bold('API:')}    ${`${protocol}://${host}:${port}${apiPrefix}`}`);
    console.info('');
  }
  bundling() {
    const prefix = this.formatPrefix('\u25D0', pc8.magenta);
    console.info(`${prefix} ${pc8.magenta('Bundling...')}`);
  }
  bundleComplete() {
    const prefix = this.formatPrefix('\u2713', pc8.green);
    console.info(`${prefix} ${pc8.green('Bundle complete')}`);
  }
  watching() {
    const time = this.formatTime();
    const icon = pc8.dim('\u25EF');
    const message = pc8.dim('watching for file changes...');
    const fullMessage = `${icon} ${message}`;
    console.info(time ? `${time} ${fullMessage}` : fullMessage);
  }
  restarting() {
    const prefix = this.formatPrefix('\u21BB', pc8.blue);
    console.info(`${prefix} ${pc8.blue('Restarting server...')}`);
  }
  fileChange(file) {
    const prefix = this.formatPrefix('\u26A1', pc8.cyan);
    const fileName = path.basename(file);
    console.info(`${prefix} ${pc8.cyan('File changed:')} ${pc8.dim(fileName)}`);
  }
  // Enhanced error reporting
  serverError(error) {
    console.info('');
    console.info(pc8.red('  \u2717 ') + pc8.bold(pc8.red('Server Error')));
    console.info('');
    console.info(`  ${pc8.red('\u2502')} ${error}`);
    console.info('');
  }
  shutdown() {
    console.info('');
    const prefix = this.formatPrefix('\u2713', pc8.green);
    console.info(`${prefix} ${pc8.green('Dev server stopped')}`);
  }
  envInfo(info) {
    console.info('');
    console.info(`  ${pc8.dim('\u2502')} ${pc8.bold('Environment:')} ${pc8.cyan(info.env || 'development')}`);
    console.info(`  ${pc8.dim('\u2502')} ${pc8.bold('Root:')} ${pc8.dim(info.root)}`);
    console.info(`  ${pc8.dim('\u2502')} ${pc8.bold('Port:')} ${pc8.cyan(info.port.toString())}`);
  }
  raw(message) {
    console.info(message);
  }
  debug(message) {
    if (process.env.DEBUG || process.env.MASTRA_DEBUG) {
      const prefix = this.formatPrefix('\u25E6', pc8.gray);
      console.info(`${prefix} ${pc8.gray(message)}`);
    }
  }
  spinnerChars = ['\u25D0', '\u25D3', '\u25D1', '\u25D2'];
  spinnerIndex = 0;
  getSpinnerChar() {
    const char = this.spinnerChars[this.spinnerIndex];
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerChars.length;
    return char || '\u25D0';
  }
  clearLine() {
    process.stdout.write('\r\x1B[K');
  }
  update(message) {
    this.clearLine();
    const prefix = this.formatPrefix(this.getSpinnerChar(), pc8.cyan);
    process.stdout.write(`${prefix} ${message}`);
  }
};
var devLogger = new DevLogger();
async function loadAndValidatePresets(presetsPath) {
  const absolutePath = resolve(process.cwd(), presetsPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Presets file not found: ${absolutePath}`);
  }
  const content = await readFile(absolutePath, 'utf-8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in presets file: ${presetsPath}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Presets file must contain a JSON object with named presets`);
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Preset "${key}" must be a JSON object`);
    }
  }
  return content;
}
function escapeJsonForHtml(json) {
  return json
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
var LOCK_FILENAME = 'dev.lock';
function isProcessRunning(pid) {
  try {
    process4.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}
function getLockPath(dotMastraPath) {
  return join(dotMastraPath, LOCK_FILENAME);
}
function parseLockContents(contents) {
  const trimmed = contents.trim();
  try {
    const data = JSON.parse(trimmed);
    if (typeof data.pid === 'number' && data.pid > 0) {
      return data;
    }
  } catch {}
  const pid = Number(trimmed);
  if (!isNaN(pid) && pid > 0) {
    return { pid };
  }
  return null;
}
function printDuplicateError(lock) {
  console.error('');
  console.error(
    pc8.red('  \u2717 ') + pc8.bold(pc8.red('Another instance of `mastra dev` is already running in this directory')),
  );
  console.error('');
  console.error(`  ${pc8.red('\u2502')} PID ${pc8.bold(String(lock.pid))} is still active.`);
  if (lock.host && lock.port) {
    console.error(`  ${pc8.red('\u2502')} Server running at ${pc8.cyan(`${lock.host}:${lock.port}`)}`);
  }
  console.error(`  ${pc8.red('\u2502')} Only one dev server can run per project at a time.`);
  console.error(`  ${pc8.red('\u2502')} Running multiple instances causes resource conflicts`);
  console.error(`  ${pc8.red('\u2502')} (e.g. database locks, port collisions).`);
  console.error('');
  console.error(`  ${pc8.dim('To fix this:')}`);
  console.error(`  ${pc8.dim('\u2022')} Stop the other \`mastra dev\` process (PID ${lock.pid}), or`);
  console.error(`  ${pc8.dim('\u2022')} If that process is stuck, run: ${pc8.cyan(`kill ${lock.pid}`)}`);
  console.error('');
  process4.exit(1);
}
async function checkAndRemoveStaleLock(lockPath) {
  try {
    const contents = await readFile(lockPath, 'utf-8');
    const lock = parseLockContents(contents);
    if (lock && isProcessRunning(lock.pid)) {
      printDuplicateError(lock);
    }
    await unlink(lockPath);
  } catch (err) {
    if (err.code !== 'ENOENT');
  }
}
async function acquireDevLock(dotMastraPath) {
  const lockPath = getLockPath(dotMastraPath);
  const data = { pid: process4.pid };
  try {
    await writeFile(lockPath, JSON.stringify(data), { encoding: 'utf-8', flag: 'wx' });
    return;
  } catch (err) {
    if (err.code !== 'EEXIST') {
      return;
    }
  }
  await checkAndRemoveStaleLock(lockPath);
  try {
    await writeFile(lockPath, JSON.stringify(data), { encoding: 'utf-8', flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      const contents = await readFile(lockPath, 'utf-8');
      const lock = parseLockContents(contents);
      if (lock && isProcessRunning(lock.pid)) {
        printDuplicateError(lock);
      }
      await writeFile(lockPath, JSON.stringify(data), 'utf-8');
    }
  }
}
async function updateDevLock(dotMastraPath, host, port) {
  const lockPath = getLockPath(dotMastraPath);
  const data = { pid: process4.pid, host, port };
  try {
    await writeFile(lockPath, JSON.stringify(data), 'utf-8');
  } catch {}
}
function releaseDevLock(dotMastraPath) {
  const lockPath = getLockPath(dotMastraPath);
  try {
    const contents = readFileSync(lockPath, 'utf-8');
    const lock = parseLockContents(contents);
    if (lock && lock.pid === process4.pid) {
      unlinkSync(lockPath);
    }
  } catch {}
}
var DevBundler = class extends Bundler {
  customEnvFile;
  constructor(customEnvFile) {
    super('Dev');
    this.customEnvFile = customEnvFile;
    this.platform = process.versions?.bun ? 'neutral' : 'node';
  }
  getEnvFiles() {
    if (shouldSkipDotenvLoading()) {
      return Promise.resolve([]);
    }
    const possibleFiles = ['.env.development', '.env.local', '.env'];
    if (this.customEnvFile) {
      possibleFiles.unshift(this.customEnvFile);
    }
    try {
      const fileService = new FileService$1();
      const envFile = fileService.getFirstExistingFile(possibleFiles);
      return Promise.resolve([envFile]);
    } catch {}
    return Promise.resolve([]);
  }
  async prepare(outputDirectory) {
    await super.prepare(outputDirectory);
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = dirname(__filename2);
    const studioServePath = join(outputDirectory, this.outputDir, 'studio');
    await fsExtra.copy(join(dirname(__dirname2), join('dist', 'studio')), studioServePath, {
      overwrite: true,
    });
  }
  async watch(entryFile, outputDirectory, toolsPaths) {
    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = dirname(__filename2);
    const envFiles = await this.getEnvFiles();
    const bundlerOptions = await this.getUserBundlerOptions(entryFile, outputDirectory);
    const sourcemapEnabled = !!bundlerOptions?.sourcemap;
    const inputOptions = await getWatcherInputOptions(
      entryFile,
      this.platform,
      {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
      { sourcemap: sourcemapEnabled },
    );
    const toolsInputOptions = await this.listToolsInputOptions(toolsPaths);
    const outputDir = join(outputDirectory, this.outputDir);
    await this.writePackageJson(outputDir, /* @__PURE__ */ new Map(), {});
    const watcher = await createWatcher(
      {
        ...inputOptions,
        logLevel: inputOptions.logLevel === 'silent' ? 'warn' : inputOptions.logLevel,
        onwarn: warning => {
          if (warning.code === 'CIRCULAR_DEPENDENCY') {
            if (warning.ids?.[0]?.includes('node_modules')) {
              return;
            }
            this.logger.warn('Circular dependency found', {
              dependency: warning.message.replace('Circular dependency: ', ''),
            });
          }
        },
        plugins: [
          ...inputOptions.plugins,
          {
            name: 'env-watcher',
            buildStart() {
              for (const envFile of envFiles) {
                this.addWatchFile(envFile);
              }
            },
          },
          {
            name: 'tools-watcher',
            async buildEnd() {
              const toolImports = [];
              const toolsExports = [];
              Array.from(Object.keys(toolsInputOptions || {}))
                .filter(key => key.startsWith('tools/'))
                .forEach((key, index) => {
                  const toolExport = `tool${index}`;
                  toolImports.push(`import * as ${toolExport} from './${key}.mjs';`);
                  toolsExports.push(toolExport);
                });
              await writeFile(
                join(outputDir, 'tools.mjs'),
                `${toolImports.join('\n')}

                export const tools = [${toolsExports.join(', ')}]`,
              );
            },
          },
        ],
        input: {
          index: join(__dirname2, 'templates', 'dev.entry.js'),
          ...toolsInputOptions,
        },
      },
      {
        dir: outputDir,
        sourcemap: sourcemapEnabled,
      },
    );
    devLogger.info('Preparing development environment...');
    return new Promise((resolve7, reject) => {
      const cb = event => {
        if (event.code === 'BUNDLE_END') {
          devLogger.success('Initial bundle complete');
          watcher.off('event', cb);
          resolve7(watcher);
        }
        if (event.code === 'ERROR') {
          console.info(event);
          devLogger.error('Bundling failed - check console for details');
          watcher.off('event', cb);
          reject(event);
        }
      };
      watcher.on('event', cb);
    });
  }
  async bundle() {}
};

// src/commands/dev/dev.ts
var currentServerProcess;
var isRestarting = false;
var serverStartTime;
var requestContextPresetsJson;
var ON_ERROR_MAX_RESTARTS = 3;
function waitForProcessExit(child, timeoutMs = 2e3) {
  if (child.exitCode !== null) {
    return Promise.resolve();
  }
  return new Promise(resolve7 => {
    let timer;
    const done = () => {
      if (timer !== void 0) {
        clearTimeout(timer);
        timer = void 0;
      }
      resolve7();
    };
    child.once('exit', done);
    if (child.exitCode !== null) {
      child.removeListener('exit', done);
      done();
      return;
    }
    timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, timeoutMs);
  });
}
var restartAllActiveWorkflowRuns = async ({ host, port, https }) => {
  const scheme = https ? 'https' : 'http';
  try {
    await fetch(`${scheme}://${host}:${port}/__restart-active-workflow-runs`, {
      method: 'POST',
    });
  } catch (error) {
    devLogger.error(`Failed to restart all active workflow runs: ${error}`);
    await new Promise(resolve7 => setTimeout(resolve7, 1500));
    try {
      await fetch(`${scheme}://${host}:${port}/__restart-active-workflow-runs`, {
        method: 'POST',
      });
    } catch {}
  }
};
var startServer = async (
  dotMastraPath,
  { port, host, studioBasePath, apiPrefix, publicDir },
  env,
  startOptions = {},
  errorRestartCount = 0,
) => {
  let serverIsReady = false;
  try {
    serverStartTime = Date.now();
    devLogger.starting();
    const commands = [];
    const inspect = startOptions.inspect === '' ? true : startOptions.inspect;
    const inspectBrk = startOptions.inspectBrk === '' ? true : startOptions.inspectBrk;
    if (inspect) {
      const inspectFlag = typeof inspect === 'string' ? `--inspect=${inspect}` : '--inspect';
      commands.push(inspectFlag);
    }
    if (inspectBrk) {
      const inspectBrkFlag = typeof inspectBrk === 'string' ? `--inspect-brk=${inspectBrk}` : '--inspect-brk';
      commands.push(inspectBrkFlag);
    }
    if (startOptions.customArgs) {
      commands.push(...startOptions.customArgs);
    }
    commands.push(join(dotMastraPath, 'index.mjs'));
    const packagesFilePath = join(dotMastraPath, '..', 'mastra-packages.json');
    await mkdir(dotMastraPath, { recursive: true });
    if (startOptions.mastraPackages) {
      await writeFile(packagesFilePath, JSON.stringify(startOptions.mastraPackages), 'utf-8');
    }
    await mkdir(publicDir, { recursive: true });
    currentServerProcess = execa(process4.execPath, commands, {
      cwd: publicDir,
      env: {
        NODE_ENV: 'production',
        ...Object.fromEntries(env),
        MASTRA_DEV: 'true',
        PORT: port.toString(),
        MASTRA_PACKAGES_FILE: packagesFilePath,
        ...(startOptions?.https
          ? {
              MASTRA_HTTPS_KEY: startOptions.https.key.toString('base64'),
              MASTRA_HTTPS_CERT: startOptions.https.cert.toString('base64'),
            }
          : {}),
      },
      stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
      reject: false,
    });
    if (currentServerProcess?.exitCode && currentServerProcess?.exitCode !== 0) {
      if (!currentServerProcess) {
        throw new Error(`Server failed to start`);
      }
      throw new Error(
        `Server failed to start with error: ${currentServerProcess.stderr || currentServerProcess.stdout}`,
      );
    }
    if (currentServerProcess.stdout) {
      currentServerProcess.stdout.on('data', data => {
        const output = data.toString();
        if (
          !output.includes('Studio available') &&
          !output.includes('\u{1F468}\u200D\u{1F4BB}') &&
          !output.includes('Mastra API running')
        ) {
          process4.stdout.write(output);
        }
      });
    }
    if (currentServerProcess.stderr) {
      currentServerProcess.stderr.on('data', data => {
        const output = data.toString();
        if (
          !output.includes('Studio available') &&
          !output.includes('\u{1F468}\u200D\u{1F4BB}') &&
          !output.includes('Mastra API running')
        ) {
          process4.stderr.write(output);
        }
      });
    }
    currentServerProcess.on('error', err => {
      if (err.code !== 'EPIPE') {
        throw err;
      }
    });
    currentServerProcess.on('exit', code => {
      if (code !== null && code !== 0) {
        const updateCommand = getUpdateCommand(startOptions.peerDepMismatches ?? []);
        if (updateCommand) {
          console.warn();
          devLogger.warn(`This error may be caused by mismatched package versions. Try running:`);
          console.warn(`  ${pc8.cyan(updateCommand)}`);
          console.warn();
        }
      }
    });
    currentServerProcess.on('message', async message => {
      if (message?.type === 'server-ready') {
        serverIsReady = true;
        devLogger.ready(host, port, studioBasePath, apiPrefix, serverStartTime, startOptions.https);
        devLogger.watching();
        await restartAllActiveWorkflowRuns({ host, port, https: !!startOptions.https });
        const scheme = startOptions.https ? 'https' : 'http';
        try {
          await fetch(`${scheme}://${host}:${port}${studioBasePath}/__refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch {
          await new Promise(resolve7 => setTimeout(resolve7, 1500));
          try {
            await fetch(`${scheme}://${host}:${port}${studioBasePath}/__refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } catch {}
        }
      }
    });
  } catch (err) {
    const execaError = err;
    if (execaError.stderr) {
      devLogger.serverError(execaError.stderr);
      devLogger.debug(`Server error output: ${execaError.stderr}`);
    }
    if (execaError.stdout) devLogger.debug(`Server output: ${execaError.stdout}`);
    const updateCommand = getUpdateCommand(startOptions.peerDepMismatches ?? []);
    if (updateCommand) {
      devLogger.warn(`This error may be caused by mismatched package versions. Try running: ${updateCommand}`);
    }
    if (!serverIsReady) {
      throw err;
    }
    setTimeout(() => {
      if (!isRestarting) {
        errorRestartCount++;
        if (errorRestartCount > ON_ERROR_MAX_RESTARTS) {
          devLogger.error(`Server failed to start after ${ON_ERROR_MAX_RESTARTS} error attempts. Giving up.`);
          process4.exit(1);
        }
        devLogger.warn(
          `Attempting to restart server after error... (Attempt ${errorRestartCount}/${ON_ERROR_MAX_RESTARTS})`,
        );
        startServer(
          dotMastraPath,
          {
            port,
            host,
            studioBasePath,
            apiPrefix,
            publicDir,
          },
          env,
          startOptions,
          errorRestartCount,
        );
      }
    }, 1e3);
  }
};
async function checkAndRestart(
  dotMastraPath,
  { port, host, studioBasePath, apiPrefix, publicDir },
  bundler,
  startOptions = {},
) {
  if (isRestarting) {
    return;
  }
  try {
    const scheme = startOptions.https ? 'https' : 'http';
    const response = await fetch(`${scheme}://${host}:${port}${studioBasePath}/__hot-reload-status`);
    if (response.ok) {
      const status = await response.json();
      if (status.disabled) {
        devLogger.info('[Mastra Dev] - \u23F8\uFE0F  Server restart skipped: agent builder action in progress');
        return;
      }
    }
  } catch (error) {
    devLogger.debug(`[Mastra Dev] - Could not check hot reload status: ${error}`);
  }
  devLogger.info('[Mastra Dev] - \u2705 Restarting server...');
  await rebundleAndRestart(dotMastraPath, { port, host, studioBasePath, apiPrefix, publicDir }, bundler, startOptions);
}
async function rebundleAndRestart(
  dotMastraPath,
  { port, host, studioBasePath, apiPrefix, publicDir },
  bundler,
  startOptions = {},
) {
  if (isRestarting) {
    return;
  }
  isRestarting = true;
  try {
    if (currentServerProcess) {
      devLogger.restarting();
      devLogger.debug('Stopping current server...');
      const serverProcess = currentServerProcess;
      await new Promise(resolve7 => {
        if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
          resolve7();
          return;
        }
        let timeout;
        const handleExit = () => {
          if (timeout) {
            clearTimeout(timeout);
          }
          resolve7();
        };
        serverProcess.once('exit', handleExit);
        try {
          serverProcess.kill('SIGINT');
        } catch {
          if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
            serverProcess.off('exit', handleExit);
            resolve7();
          }
          return;
        }
        timeout = setTimeout(() => {
          try {
            serverProcess.kill('SIGKILL');
          } catch {
            if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
              serverProcess.off('exit', handleExit);
              resolve7();
            }
          }
        }, 5e3);
      });
      if (currentServerProcess === serverProcess) {
        currentServerProcess = void 0;
      }
    }
    const env = await bundler.loadEnvVars();
    if (requestContextPresetsJson) {
      env.set('MASTRA_REQUEST_CONTEXT_PRESETS', requestContextPresetsJson);
    }
    for (const [key, value] of env.entries()) {
      process4.env[key] = value;
    }
    await startServer(
      join(dotMastraPath, 'output'),
      {
        port,
        host,
        studioBasePath,
        apiPrefix,
        publicDir,
      },
      env,
      startOptions,
    );
  } finally {
    isRestarting = false;
  }
}
async function dev({ dir, root, tools, env, inspect, inspectBrk, customArgs, https, requestContextPresets, debug }) {
  const rootDir = root || process4.cwd();
  const mastraDir = dir
    ? dir.startsWith('/')
      ? dir
      : join(process4.cwd(), dir)
    : join(process4.cwd(), 'src', 'mastra');
  const dotMastraPath = join(rootDir, '.mastra');
  await mkdir(dotMastraPath, { recursive: true });
  await acquireDevLock(dotMastraPath);
  const fileService = new FileService$1();
  const entryFile = fileService.getFirstExistingFile([join(mastraDir, 'index.ts'), join(mastraDir, 'index.js')]);
  const bundler = new DevBundler(env);
  bundler.__setLogger(createLogger(debug));
  const discoveredTools = bundler.getAllToolPaths(mastraDir, tools ?? []);
  const loadedEnv = await bundler.loadEnvVars();
  requestContextPresetsJson = void 0;
  loadedEnv.delete('MASTRA_REQUEST_CONTEXT_PRESETS');
  delete process4.env.MASTRA_REQUEST_CONTEXT_PRESETS;
  for (const [key, value] of loadedEnv.entries()) {
    process4.env[key] = value;
  }
  if (requestContextPresets) {
    try {
      requestContextPresetsJson = await loadAndValidatePresets(requestContextPresets);
      loadedEnv.set('MASTRA_REQUEST_CONTEXT_PRESETS', requestContextPresetsJson);
    } catch (error) {
      devLogger.error(`Failed to load request context presets: ${error instanceof Error ? error.message : error}`);
      process4.exit(1);
    }
  }
  const serverOptions = await getServerOptions(entryFile, join(dotMastraPath, 'output'));
  let portToUse = serverOptions?.port ?? process4.env.PORT;
  let hostToUse = serverOptions?.host ?? process4.env.HOST ?? 'localhost';
  const studioBasePathToUse = normalizeStudioBase(serverOptions?.studioBase ?? '/');
  const apiPrefixToUse = serverOptions?.apiPrefix ?? '/api';
  if (!portToUse || isNaN(Number(portToUse))) {
    const portList = Array.from({ length: 21 }, (_, i) => 4111 + i);
    portToUse = String(
      await getPort({
        port: portList,
      }),
    );
  }
  await updateDevLock(dotMastraPath, hostToUse, Number(portToUse));
  let httpsOptions = void 0;
  if (https && serverOptions?.https) {
    devLogger.warn('--https flag and server.https config are both specified. Using server.https config.');
  }
  if (serverOptions?.https) {
    httpsOptions = serverOptions.https;
  } else if (https) {
    const { key, cert } = await devcert.certificateFor(serverOptions?.host ?? 'localhost');
    httpsOptions = { key, cert };
  }
  const mastraPackages = await getMastraPackages(rootDir);
  const peerDepMismatches = await checkMastraPeerDeps(mastraPackages);
  logPeerDepWarnings(peerDepMismatches);
  const startOptions = {
    inspect,
    inspectBrk,
    customArgs,
    https: httpsOptions,
    mastraPackages,
    peerDepMismatches,
  };
  await bundler.prepare(dotMastraPath);
  const watcher = await bundler.watch(entryFile, dotMastraPath, discoveredTools);
  await startServer(
    join(dotMastraPath, 'output'),
    {
      port: Number(portToUse),
      host: hostToUse,
      studioBasePath: studioBasePathToUse,
      apiPrefix: apiPrefixToUse,
      publicDir: join(mastraDir, 'public'),
    },
    loadedEnv,
    startOptions,
  );
  watcher.on('event', event => {
    if (event.code === 'BUNDLE_START') {
      devLogger.bundling();
    }
    if (event.code === 'BUNDLE_END') {
      devLogger.bundleComplete();
      devLogger.info('[Mastra Dev] - Bundling finished, checking if restart is allowed...');
      checkAndRestart(
        dotMastraPath,
        {
          port: Number(portToUse),
          host: hostToUse,
          studioBasePath: studioBasePathToUse,
          apiPrefix: apiPrefixToUse,
          publicDir: join(mastraDir, 'public'),
        },
        bundler,
        startOptions,
      );
    }
  });
  let isShuttingDown = false;
  const handleShutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    const forceExit = setTimeout(() => process4.exit(0), 3e3);
    forceExit.unref();
    devLogger.shutdown();
    if (currentServerProcess) {
      currentServerProcess.kill();
      await waitForProcessExit(currentServerProcess);
      currentServerProcess = void 0;
    }
    const analytics2 = getAnalytics();
    if (analytics2 && serverStartTime) {
      const durationMs = Date.now() - serverStartTime;
      analytics2.trackEvent('cli_dev_session_end', {
        durationMs,
        durationMinutes: Math.round(durationMs / 6e4),
      });
    }
    if (analytics2) {
      await analytics2.shutdown();
    }
    watcher
      .close()
      .catch(() => {})
      .finally(() => {
        releaseDevLock(dotMastraPath);
        clearTimeout(forceExit);
        process4.exit(0);
      });
  };
  const onSignal = () => {
    handleShutdown().catch(() => process4.exit(0));
  };
  process4.on('SIGINT', onSignal);
  process4.on('SIGTERM', onSignal);
  process4.on('SIGHUP', onSignal);
}

// src/commands/actions/start-dev-server.ts
var startDevServer = async args => {
  analytics.trackCommand({
    command: 'dev',
    origin: origin2,
  });
  dev({
    dir: args?.dir,
    root: args?.root,
    tools: args?.tools ? args.tools.split(',') : [],
    env: args?.env,
    inspect: args?.inspectBrk ? false : args?.inspect,
    inspectBrk: args?.inspectBrk,
    customArgs: args?.customArgs ? args.customArgs.split(',') : [],
    https: args?.https,
    requestContextPresets: args?.requestContextPresets,
    debug: args.debug,
  }).catch(err => {
    logger.error(err.message);
  });
};
async function start(options = {}) {
  if (!shouldSkipDotenvLoading()) {
    config({ path: [options.env || '.env.production', '.env'], quiet: true });
  }
  const outputDir = options.dir || '.mastra/output';
  try {
    const outputPath = join(process.cwd(), outputDir);
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output directory ${outputPath} does not exist`);
    }
    const commands = [];
    if (options.customArgs) {
      commands.push(...options.customArgs);
    }
    commands.push('index.mjs');
    const server = spawn(process.execPath, commands, {
      cwd: outputPath,
      stdio: ['inherit', 'inherit', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });
    let stderrBuffer = '';
    server.stderr.on('data', data => {
      stderrBuffer += data.toString();
    });
    server.on('exit', code => {
      if (code !== 0 && stderrBuffer) {
        if (stderrBuffer.includes('ERR_MODULE_NOT_FOUND')) {
          const packageNameMatch = stderrBuffer.match(/Cannot find package '([^']+)'/);
          const packageName = packageNameMatch ? packageNameMatch[1] : null;
          if (!packageName) {
            logger.error(stderrBuffer.trim());
          } else {
            logger.error('Module not found while starting Mastra server', { package: packageName });
          }
        } else {
          logger.error(stderrBuffer.trim());
        }
        process.exit(code);
      }
    });
    server.on('error', err => {
      logger.error('Failed to start server', { error: err.message });
      process.exit(1);
    });
    process.on('SIGINT', () => {
      server.kill('SIGINT');
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      server.kill('SIGTERM');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start Mastra server', { error: error.message });
    process.exit(1);
  }
}

// src/commands/actions/start-project.ts
var startProject = async args => {
  await analytics.trackCommandExecution({
    command: 'start',
    args,
    execution: async () => {
      await start({
        dir: args.dir,
        env: args.env,
        customArgs: args.customArgs ? args.customArgs.split(',') : [],
      });
    },
    origin: origin2,
  });
};
function normalizeBasePath(basePath) {
  const trimmed = basePath.trim();
  if (trimmed === '' || trimmed === '/') {
    return '';
  }
  let normalized = trimmed.replace(/\/+/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}
var __filename$1 = fileURLToPath(import.meta.url);
var __dirname$1 = dirname(__filename$1);
async function studio(
  options = {
    serverHost: 'localhost',
    serverPort: 4111,
    serverProtocol: 'http',
  },
) {
  config({ path: [options.env || '.env.production', '.env'], quiet: true });
  let requestContextPresetsJson2 = '';
  if (options.requestContextPresets) {
    try {
      requestContextPresetsJson2 = await loadAndValidatePresets(options.requestContextPresets);
    } catch (error) {
      logger.error('Failed to load request context presets', { error: error.message });
      process.exit(1);
    }
  }
  try {
    const distPath = join(__dirname$1, 'studio');
    if (!existsSync(distPath)) {
      logger.error('Studio distribution not found', { distPath });
      process.exit(1);
    }
    const port = options.port || 3e3;
    const server = createServer(distPath, options, requestContextPresetsJson2);
    server.listen(port, () => {
      logger.info('Mastra Studio running', { url: `http://localhost:${port}` });
    });
    process.on('SIGINT', () => {
      server.close(() => {
        process.exit(0);
      });
    });
    process.on('SIGTERM', () => {
      server.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start Mastra Studio', { error: error.message });
    process.exit(1);
  }
}
var createServer = (builtStudioPath, options, requestContextPresetsJson2) => {
  const indexHtmlPath = join(builtStudioPath, 'index.html');
  const basePath = normalizeBasePath(process.env.MASTRA_STUDIO_BASE_PATH ?? '');
  const experimentalFeatures = process.env.EXPERIMENTAL_FEATURES === 'true' ? 'true' : 'false';
  const experimentalUI = process.env.MASTRA_EXPERIMENTAL_UI === 'true' ? 'true' : 'false';
  const templatesEnabled = process.env.MASTRA_TEMPLATES === 'true' ? 'true' : 'false';
  const agentSignals = process.env.MASTRA_AGENT_SIGNALS === 'false' ? 'false' : 'true';
  let html = readFileSync(indexHtmlPath, 'utf8')
    .replaceAll('%%MASTRA_STUDIO_BASE_PATH%%', basePath)
    .replaceAll('%%MASTRA_SERVER_HOST%%', options.serverHost || 'localhost')
    .replaceAll('%%MASTRA_SERVER_PORT%%', String(options.serverPort || 4111))
    .replaceAll('%%MASTRA_SERVER_PROTOCOL%%', options.serverProtocol || 'http')
    .replaceAll('%%MASTRA_API_PREFIX%%', options.serverApiPrefix || '/api')
    .replaceAll('%%MASTRA_EXPERIMENTAL_FEATURES%%', experimentalFeatures)
    .replaceAll('%%MASTRA_TEMPLATES%%', templatesEnabled)
    .replaceAll('%%MASTRA_CLOUD_API_ENDPOINT%%', '')
    .replaceAll('%%MASTRA_HIDE_CLOUD_CTA%%', '')
    .replaceAll('%%MASTRA_TELEMETRY_DISABLED%%', process.env.MASTRA_TELEMETRY_DISABLED ?? '')
    .replaceAll('%%MASTRA_REQUEST_CONTEXT_PRESETS%%', escapeJsonForHtml(requestContextPresetsJson2))
    .replaceAll('%%MASTRA_EXPERIMENTAL_UI%%', experimentalUI)
    .replaceAll('%%MASTRA_AGENT_SIGNALS%%', agentSignals);
  const compressedHtml = gzipSync(Buffer.from(html));
  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    const queryStart = url.indexOf('?');
    const rawPathname = queryStart >= 0 ? url.slice(0, queryStart) : url;
    const query = queryStart >= 0 ? url.slice(queryStart + 1) : '';
    const pathname = rawPathname || '/';
    const pathWithoutBase =
      basePath && pathname.startsWith(`${basePath}/`)
        ? pathname.slice(basePath.length)
        : pathname === basePath
          ? '/'
          : pathname;
    const isAssetsPath = /(^|\/)assets\//.test(pathWithoutBase);
    const isDistAssetsPath = /(^|\/)dist\/assets\//.test(pathWithoutBase);
    const isMastraSvg = pathWithoutBase === '/mastra.svg' || pathWithoutBase.endsWith('/mastra.svg');
    const isStaticAsset = isAssetsPath || isDistAssetsPath || isMastraSvg;
    const rawEncoding = req.headers['accept-encoding'] ?? '';
    const encodingValues = Array.isArray(rawEncoding) ? rawEncoding : [rawEncoding];
    const supportsGzip = encodingValues
      .flatMap(v => v.split(','))
      .map(v => v.trim().toLowerCase())
      .some(v => {
        const [coding, ...params] = v.split(';').map(p16 => p16.trim());
        if (coding !== 'gzip') return false;
        const q = params.find(p16 => p16.startsWith('q='));
        return q ? Number(q.slice(2)) > 0 : true;
      });
    if (!isStaticAsset) {
      if (supportsGzip) {
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Encoding': 'gzip',
          'Content-Length': compressedHtml.length,
          Vary: 'Accept-Encoding',
        });
        return res.end(compressedHtml);
      }
      res.writeHead(200, { 'Content-Type': 'text/html', Vary: 'Accept-Encoding' });
      return res.end(html);
    }
    if (basePath && pathWithoutBase !== pathname) {
      req.url = query ? `${pathWithoutBase}?${query}` : pathWithoutBase;
    }
    return handler(req, res, {
      public: builtStudioPath,
    });
  });
  return server;
};

// src/commands/actions/start-studio.ts
var startStudio = async args => {
  analytics.trackCommand({
    command: 'studio',
    origin: origin2,
  });
  await studio(args);
};

// src/commands/api/errors.ts
var ApiCliError = class extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
  code;
  details;
};
function errorEnvelope(error) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}
function toApiCliError(error) {
  if (error instanceof ApiCliError) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiCliError('REQUEST_TIMEOUT', 'Request timed out');
  }
  return new ApiCliError('SERVER_UNREACHABLE', 'Could not connect to target server', {
    message: error instanceof Error ? error.message : String(error),
  });
}

// src/commands/api/client.ts
async function requestApi(options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const { queryInput, bodyInput } = splitInput(options.descriptor, options.input);
    const url = buildUrl(options.baseUrl, options.descriptor.path, options.pathParams, queryInput);
    const init2 = {
      method: options.descriptor.method,
      headers: { ...options.headers },
      signal: controller.signal,
    };
    if (options.descriptor.method !== 'GET' && bodyInput) {
      init2.headers = { 'content-type': 'application/json', ...init2.headers };
      init2.body = JSON.stringify(bodyInput);
    }
    const response = await fetch(url, init2);
    const body = await parseResponse(response);
    if (!response.ok) {
      throw new ApiCliError('HTTP_ERROR', `Request failed with status ${response.status}`, {
        status: response.status,
        body,
      });
    }
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiCliError('REQUEST_TIMEOUT', `Request timed out after ${options.timeoutMs}ms`, {
        timeoutMs: options.timeoutMs,
      });
    }
    throw toApiCliError(error);
  } finally {
    clearTimeout(timeout);
  }
}
function buildUrl(baseUrl, path3, pathParams, input) {
  const pathParamNames2 = /* @__PURE__ */ new Set();
  const resolvedPath = path3.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    pathParamNames2.add(name);
    const value = pathParams[name];
    if (!value) {
      throw new ApiCliError('MISSING_ARGUMENT', `Missing required argument <${name}>`, { argument: name });
    }
    return encodeURIComponent(value);
  });
  const url = new URL(joinUrl(baseUrl, resolvedPath));
  for (const [key, value] of Object.entries(pathParams)) {
    if (!pathParamNames2.has(key)) url.searchParams.set(key, value);
  }
  if (input) {
    for (const [key, value] of Object.entries(input)) {
      if (value === void 0 || value === null) continue;
      url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  }
  return url.toString();
}
function splitInput(descriptor, input) {
  if (!input) return {};
  if (descriptor.method === 'GET') return { queryInput: input };
  const normalizedInput = normalizeInput(descriptor, input);
  const queryParamNames = new Set(descriptor.queryParams);
  const bodyParamNames = new Set(descriptor.bodyParams);
  if (queryParamNames.size === 0) return { bodyInput: normalizedInput };
  const queryInput = {};
  const bodyInput = {};
  for (const [key, value] of Object.entries(normalizedInput)) {
    if (queryParamNames.has(key) && !bodyParamNames.has(key)) {
      queryInput[key] = value;
    } else {
      bodyInput[key] = value;
    }
  }
  return {
    queryInput: Object.keys(queryInput).length ? queryInput : void 0,
    bodyInput: Object.keys(bodyInput).length ? bodyInput : void 0,
  };
}
function normalizeInput(descriptor, input) {
  if ((descriptor.key === 'toolExecute' || descriptor.key === 'mcpToolExecute') && !Object.hasOwn(input, 'data')) {
    return { data: input };
  }
  return input;
}
async function fetchSchemaManifest(baseUrl, headers, timeoutMs) {
  const descriptor = {
    key: 'schema',
    name: 'system api-schema',
    description: 'Fetch API schema manifest',
    method: 'GET',
    path: '/system/api-schema',
    positionals: [],
    acceptsInput: false,
    inputRequired: false,
    list: false,
    responseShape: { kind: 'single' },
    queryParams: [],
    bodyParams: [],
  };
  return requestApi({ baseUrl, headers, timeoutMs, descriptor, pathParams: {} });
}
async function parseResponse(response) {
  const text3 = await response.text();
  if (!text3) return null;
  try {
    return JSON.parse(text3);
  } catch {
    return text3;
  }
}
function joinUrl(baseUrl, path3) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = path3.startsWith('/') ? path3 : `/${path3}`;
  if (normalizedBase.endsWith('/api')) return `${normalizedBase}${normalizedPath}`;
  return `${normalizedBase}/api${normalizedPath}`;
}

// src/commands/api/input.ts
function parseInput(descriptor, input) {
  if (!descriptor.acceptsInput) return void 0;
  if (!input) {
    if (descriptor.inputRequired) {
      throw new ApiCliError('MISSING_INPUT', 'Command requires a single inline JSON input argument', {
        command: `mastra api ${descriptor.name}`,
      });
    }
    return void 0;
  }
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ApiCliError('INVALID_JSON', 'Input JSON must be an object');
    }
    return parsed;
  } catch (error) {
    if (error instanceof ApiCliError) throw error;
    throw new ApiCliError('INVALID_JSON', 'Input must be valid JSON', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
function resolvePathParams(descriptor, positionalValues, input) {
  const params = {};
  descriptor.positionals.forEach((name, index) => {
    const value = positionalValues[index];
    if (!value) {
      throw new ApiCliError('MISSING_ARGUMENT', `Missing required argument <${name}>`, { argument: name });
    }
    params[name] = value;
  });
  for (const name of pathParamNames(descriptor.path)) {
    if (params[name]) continue;
    const value = input?.[name];
    if (typeof value !== 'string' || !value) {
      throw new ApiCliError('MISSING_ARGUMENT', `Missing required argument <${name}>`, { argument: name });
    }
    params[name] = value;
  }
  return params;
}
function stripPathParamsFromInput(input, params) {
  if (!input) return void 0;
  const copy3 = { ...input };
  for (const key of Object.keys(params)) delete copy3[key];
  return copy3;
}
function pathParamNames(path3) {
  return Array.from(path3.matchAll(/:([A-Za-z0-9_]+)/g)).map(match => match[1]);
}

// src/commands/api/normalizers.ts
var WORKFLOW_STATUS_MAP = {
  completed: 'success',
  complete: 'success',
  success: 'success',
  succeeded: 'success',
  failed: 'failed',
  failure: 'failed',
  error: 'failed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  running: 'running',
  pending: 'running',
  suspended: 'suspended',
  waiting: 'suspended',
};
function normalizeData(descriptor, data) {
  if (descriptor.key === 'agentRun' && data && typeof data === 'object') {
    const record = data;
    return pruneUndefined({
      text: record.text ?? record.result ?? record.output,
      structuredOutput: record.structuredOutput ?? record.object,
      usage: record.usage ?? record.totalUsage,
      toolCalls: record.toolCalls,
      toolResults: record.toolResults,
      finishReason: record.finishReason,
      runId: record.runId,
      traceId: record.traceId,
      spanId: record.spanId,
    });
  }
  if (descriptor.key === 'toolGet' && data && typeof data === 'object') {
    const record = data;
    return {
      inputSchema: record.inputSchema ?? record.parameters ?? record.input,
      ...record,
    };
  }
  if (descriptor.key.startsWith('workflowRun')) {
    return normalizeWorkflowStatus(data);
  }
  return data;
}
function pruneUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== void 0));
}
function normalizeWorkflowStatus(data) {
  if (Array.isArray(data)) return data.map(item => normalizeWorkflowStatus(item));
  if (!data || typeof data !== 'object') return data;
  const record = data;
  const status = typeof record.status === 'string' ? WORKFLOW_STATUS_MAP[record.status.toLowerCase()] : void 0;
  const normalizedRecord = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(item => normalizeWorkflowStatus(item)) : value,
    ]),
  );
  return {
    ...normalizedRecord,
    ...(status ? { status } : {}),
  };
}

// src/commands/api/output.ts
function writeJson(value, pretty, stream = process.stdout) {
  stream.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}
`);
}
function normalizeSuccess(data, list, responseShape) {
  if (!list) return { data };
  const { items, page } = extractList(data, responseShape);
  return {
    data: items,
    page,
  };
}
function extractList(data, responseShape) {
  if (Array.isArray(data)) {
    return { items: data, page: { total: data.length, page: 0, perPage: data.length, hasMore: false } };
  }
  if (data && typeof data === 'object') {
    const record = data;
    const items = findArray(record, responseShape) ?? [];
    const nestedPage = record.page ?? record.pagination;
    const pageRecord = nestedPage && typeof nestedPage === 'object' ? nestedPage : record;
    return {
      items,
      page: normalizePage(pageRecord, items.length),
    };
  }
  return { items: [], page: { total: 0, page: 0, perPage: 0, hasMore: false } };
}
function normalizePage(pageRecord, itemCount) {
  const total = typeof pageRecord?.total === 'number' ? pageRecord.total : itemCount;
  const page = typeof pageRecord?.page === 'number' ? pageRecord.page : 0;
  const perPage =
    typeof pageRecord?.perPage === 'number' || pageRecord?.perPage === false ? pageRecord.perPage : itemCount;
  const hasMore = typeof pageRecord?.hasMore === 'boolean' ? pageRecord.hasMore : false;
  return { total, page, perPage, hasMore };
}
function findArray(record, responseShape) {
  if (responseShape?.kind === 'array' && Array.isArray(record)) return record;
  if (responseShape?.kind === 'record') return Object.values(record);
  if (responseShape?.kind === 'object-property' && responseShape.listProperty) {
    const value = record[responseShape.listProperty];
    if (Array.isArray(value)) return value;
  }
  if (Array.isArray(record.data)) return record.data;
  const values = Object.values(record);
  if (values.every(value => value && typeof value === 'object' && !Array.isArray(value))) {
    return values;
  }
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return void 0;
}

// src/commands/api/response-normalizer.ts
var SCHEMA_FIELD_PATTERN = /(^schema$|schema$|^parameters$)/i;
function normalizeResponse(value, key, isSchemaMetadata = key ? isSchemaField(key) : false) {
  if (Array.isArray(value)) return value.map(item => normalizeResponse(item, key, isSchemaMetadata));
  if (value && typeof value === 'object') {
    const record = value;
    const normalized = Object.fromEntries(
      Object.entries(record).flatMap(([entryKey, entryValue]) => {
        if (isSchemaMetadata && entryKey === '$schema') return [];
        return [[entryKey, normalizeResponse(entryValue, entryKey, isSchemaMetadata || isSchemaField(entryKey))]];
      }),
    );
    if (key && isSchemaField(key) && Object.keys(normalized).length === 1 && Object.hasOwn(normalized, 'json')) {
      return normalized.json;
    }
    return normalized;
  }
  if (typeof value === 'string' && key && isSchemaField(key)) {
    return parseSchemaString(value, key);
  }
  return value;
}
function isSchemaField(key) {
  return SCHEMA_FIELD_PATTERN.test(key);
}
function parseSchemaString(value, key) {
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return value;
  try {
    return normalizeResponse(JSON.parse(trimmed), key, true);
  } catch {
    return value;
  }
}

// src/commands/api/route-metadata.generated.ts
var API_ROUTE_METADATA = {
  'GET /agents': {
    method: 'GET',
    path: '/agents',
    pathParams: [],
    queryParams: ['partial'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'record',
    },
  },
  'GET /agents/providers': {
    method: 'GET',
    path: '/agents/providers',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'providers',
    },
  },
  'GET /agents/:agentId': {
    method: 'GET',
    path: '/agents/:agentId',
    pathParams: ['agentId'],
    queryParams: ['status', 'versionId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/clone': {
    method: 'POST',
    path: '/agents/:agentId/clone',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['authorId', 'metadata', 'newId', 'newName'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /agents/:agentId/voice/speakers': {
    method: 'GET',
    path: '/agents/:agentId/voice/speakers',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'array',
    },
  },
  'POST /agents/:agentId/generate': {
    method: 'POST',
    path: '/agents/:agentId/generate',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [
      'activeTools',
      'clientTools',
      'context',
      'instructions',
      'maxSteps',
      'memory',
      'messages',
      'modelSettings',
      'output',
      'providerOptions',
      'requestContext',
      'requireToolApproval',
      'returnScorerData',
      'runId',
      'savePerStep',
      'scorers',
      'stopWhen',
      'structuredOutput',
      'system',
      'toolChoice',
      'toolsets',
      'tracingOptions',
      'untilIdle',
      'versions',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/generate/vnext': {
    method: 'POST',
    path: '/agents/:agentId/generate/vnext',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [
      'activeTools',
      'clientTools',
      'context',
      'instructions',
      'maxSteps',
      'memory',
      'messages',
      'modelSettings',
      'output',
      'providerOptions',
      'requestContext',
      'requireToolApproval',
      'returnScorerData',
      'runId',
      'savePerStep',
      'scorers',
      'stopWhen',
      'structuredOutput',
      'system',
      'toolChoice',
      'toolsets',
      'tracingOptions',
      'untilIdle',
      'versions',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/send-message': {
    method: 'POST',
    path: '/agents/:agentId/send-message',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/queue-message': {
    method: 'POST',
    path: '/agents/:agentId/queue-message',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/signals': {
    method: 'POST',
    path: '/agents/:agentId/signals',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/threads/abort': {
    method: 'POST',
    path: '/agents/:agentId/threads/abort',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['resourceId', 'threadId'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/tools/:toolId/execute': {
    method: 'POST',
    path: '/agents/:agentId/tools/:toolId/execute',
    pathParams: ['agentId', 'toolId'],
    queryParams: [],
    bodyParams: ['data', 'requestContext'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/send-tool-approval': {
    method: 'POST',
    path: '/agents/:agentId/send-tool-approval',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [
      'approved',
      'format',
      'messages',
      'requestContext',
      'resourceId',
      'streamOptions',
      'threadId',
      'toolCallId',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/approve-tool-call-generate': {
    method: 'POST',
    path: '/agents/:agentId/approve-tool-call-generate',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['format', 'requestContext', 'runId', 'toolCallId'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/decline-tool-call-generate': {
    method: 'POST',
    path: '/agents/:agentId/decline-tool-call-generate',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['format', 'requestContext', 'runId', 'toolCallId'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/model': {
    method: 'POST',
    path: '/agents/:agentId/model',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['modelId', 'provider'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/model/reset': {
    method: 'POST',
    path: '/agents/:agentId/model/reset',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/models/reorder': {
    method: 'POST',
    path: '/agents/:agentId/models/reorder',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['reorderedModelIds'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/models/:modelConfigId': {
    method: 'POST',
    path: '/agents/:agentId/models/:modelConfigId',
    pathParams: ['agentId', 'modelConfigId'],
    queryParams: [],
    bodyParams: ['enabled', 'maxRetries', 'model'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/instructions/enhance': {
    method: 'POST',
    path: '/agents/:agentId/instructions/enhance',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['comment', 'instructions'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /agents/:agentId/tools/:toolId': {
    method: 'GET',
    path: '/agents/:agentId/tools/:toolId',
    pathParams: ['agentId', 'toolId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /agents/:agentId/skills/:skillName': {
    method: 'GET',
    path: '/agents/:agentId/skills/:skillName',
    pathParams: ['agentId', 'skillName'],
    queryParams: ['path'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agents/:agentId/voice/listen': {
    method: 'POST',
    path: '/agents/:agentId/voice/listen',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['audio', 'options'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /agents/:agentId/voice/listener': {
    method: 'GET',
    path: '/agents/:agentId/voice/listener',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /auth/capabilities': {
    method: 'GET',
    path: '/auth/capabilities',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /auth/me': {
    method: 'GET',
    path: '/auth/me',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /auth/roles/:roleId/permissions': {
    method: 'GET',
    path: '/auth/roles/:roleId/permissions',
    pathParams: ['roleId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'permissions',
    },
  },
  'GET /workflows': {
    method: 'GET',
    path: '/workflows',
    pathParams: [],
    queryParams: ['partial'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'record',
    },
  },
  'GET /workflows/:workflowId': {
    method: 'GET',
    path: '/workflows/:workflowId',
    pathParams: ['workflowId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workflows/:workflowId/runs': {
    method: 'GET',
    path: '/workflows/:workflowId/runs',
    pathParams: ['workflowId'],
    queryParams: ['fromDate', 'limit', 'offset', 'page', 'perPage', 'resourceId', 'status', 'toDate'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'runs',
    },
  },
  'GET /workflows/:workflowId/runs/:runId': {
    method: 'GET',
    path: '/workflows/:workflowId/runs/:runId',
    pathParams: ['workflowId', 'runId'],
    queryParams: ['fields', 'withNestedWorkflows'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /workflows/:workflowId/runs/:runId': {
    method: 'DELETE',
    path: '/workflows/:workflowId/runs/:runId',
    pathParams: ['workflowId', 'runId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/create-run': {
    method: 'POST',
    path: '/workflows/:workflowId/create-run',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: ['disableScorers', 'resourceId'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/start-async': {
    method: 'POST',
    path: '/workflows/:workflowId/start-async',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: ['initialState', 'inputData', 'perStep', 'requestContext', 'resourceId', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/start': {
    method: 'POST',
    path: '/workflows/:workflowId/start',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: ['initialState', 'inputData', 'perStep', 'requestContext', 'resourceId', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/resume-async': {
    method: 'POST',
    path: '/workflows/:workflowId/resume-async',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: ['forEachIndex', 'perStep', 'requestContext', 'resumeData', 'step', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/resume-no-wait': {
    method: 'POST',
    path: '/workflows/:workflowId/resume-no-wait',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: ['forEachIndex', 'perStep', 'requestContext', 'resumeData', 'step', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/resume': {
    method: 'POST',
    path: '/workflows/:workflowId/resume',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: ['forEachIndex', 'perStep', 'requestContext', 'resumeData', 'step', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/runs/:runId/cancel': {
    method: 'POST',
    path: '/workflows/:workflowId/runs/:runId/cancel',
    pathParams: ['workflowId', 'runId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/time-travel': {
    method: 'POST',
    path: '/workflows/:workflowId/time-travel',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: [
      'context',
      'initialState',
      'inputData',
      'nestedStepsContext',
      'perStep',
      'requestContext',
      'resumeData',
      'step',
      'tracingOptions',
    ],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/time-travel-async': {
    method: 'POST',
    path: '/workflows/:workflowId/time-travel-async',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: [
      'context',
      'initialState',
      'inputData',
      'nestedStepsContext',
      'perStep',
      'requestContext',
      'resumeData',
      'step',
      'tracingOptions',
    ],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/restart': {
    method: 'POST',
    path: '/workflows/:workflowId/restart',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: ['requestContext', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/restart-async': {
    method: 'POST',
    path: '/workflows/:workflowId/restart-async',
    pathParams: ['workflowId'],
    queryParams: ['runId'],
    bodyParams: ['requestContext', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/restart-all-active-workflow-runs': {
    method: 'POST',
    path: '/workflows/:workflowId/restart-all-active-workflow-runs',
    pathParams: ['workflowId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/restart-all-active-workflow-runs-async': {
    method: 'POST',
    path: '/workflows/:workflowId/restart-all-active-workflow-runs-async',
    pathParams: ['workflowId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/:workflowId/runs/:runId/steps/execute': {
    method: 'POST',
    path: '/workflows/:workflowId/runs/:runId/steps/execute',
    pathParams: ['workflowId', 'runId'],
    queryParams: [],
    bodyParams: [
      'executionPath',
      'foreachIdx',
      'format',
      'input',
      'perStep',
      'requestContext',
      'resumeData',
      'retryCount',
      'state',
      'stepId',
      'stepResults',
      'validateInputs',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workflows/events': {
    method: 'POST',
    path: '/workflows/events',
    pathParams: [],
    queryParams: [],
    bodyParams: ['event'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /tools': {
    method: 'GET',
    path: '/tools',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'record',
    },
  },
  'GET /tools/:toolId': {
    method: 'GET',
    path: '/tools/:toolId',
    pathParams: ['toolId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /tools/:toolId/execute': {
    method: 'POST',
    path: '/tools/:toolId/execute',
    pathParams: ['toolId'],
    queryParams: ['runId'],
    bodyParams: ['data', 'requestContext'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /processors': {
    method: 'GET',
    path: '/processors',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'record',
    },
  },
  'GET /processors/:processorId': {
    method: 'GET',
    path: '/processors/:processorId',
    pathParams: ['processorId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /processors/:processorId/execute': {
    method: 'POST',
    path: '/processors/:processorId/execute',
    pathParams: ['processorId'],
    queryParams: [],
    bodyParams: ['agentId', 'messages', 'phase', 'requestContext'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /v1/responses/:responseId': {
    method: 'GET',
    path: '/v1/responses/:responseId',
    pathParams: ['responseId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /v1/responses/:responseId': {
    method: 'DELETE',
    path: '/v1/responses/:responseId',
    pathParams: ['responseId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /v1/conversations': {
    method: 'POST',
    path: '/v1/conversations',
    pathParams: [],
    queryParams: [],
    bodyParams: ['agent_id', 'conversation_id', 'metadata', 'resource_id', 'title'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /v1/conversations/:conversationId': {
    method: 'GET',
    path: '/v1/conversations/:conversationId',
    pathParams: ['conversationId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /v1/conversations/:conversationId/items': {
    method: 'GET',
    path: '/v1/conversations/:conversationId/items',
    pathParams: ['conversationId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /v1/conversations/:conversationId': {
    method: 'DELETE',
    path: '/v1/conversations/:conversationId',
    pathParams: ['conversationId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/status': {
    method: 'GET',
    path: '/memory/status',
    pathParams: [],
    queryParams: ['agentId', 'resourceId', 'threadId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/config': {
    method: 'GET',
    path: '/memory/config',
    pathParams: [],
    queryParams: ['agentId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/observational-memory': {
    method: 'GET',
    path: '/memory/observational-memory',
    pathParams: [],
    queryParams: ['agentId', 'from', 'limit', 'offset', 'resourceId', 'threadId', 'to'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'history',
    },
  },
  'POST /memory/observational-memory/buffer-status': {
    method: 'POST',
    path: '/memory/observational-memory/buffer-status',
    pathParams: [],
    queryParams: [],
    bodyParams: ['agentId', 'resourceId', 'threadId'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/threads': {
    method: 'GET',
    path: '/memory/threads',
    pathParams: [],
    queryParams: ['agentId', 'metadata', 'orderBy', 'page', 'perPage', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'threads',
      paginationProperty: 'page',
    },
  },
  'GET /memory/threads/:threadId': {
    method: 'GET',
    path: '/memory/threads/:threadId',
    pathParams: ['threadId'],
    queryParams: ['agentId', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/threads/:threadId/messages': {
    method: 'GET',
    path: '/memory/threads/:threadId/messages',
    pathParams: ['threadId'],
    queryParams: ['agentId', 'filter', 'include', 'includeSystemReminders', 'orderBy', 'page', 'perPage', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'messages',
    },
  },
  'GET /memory/threads/:threadId/working-memory': {
    method: 'GET',
    path: '/memory/threads/:threadId/working-memory',
    pathParams: ['threadId'],
    queryParams: ['agentId', 'memoryConfig', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /memory/save-messages': {
    method: 'POST',
    path: '/memory/save-messages',
    pathParams: [],
    queryParams: ['agentId'],
    bodyParams: ['messages'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'messages',
    },
  },
  'POST /memory/threads': {
    method: 'POST',
    path: '/memory/threads',
    pathParams: [],
    queryParams: ['agentId'],
    bodyParams: ['metadata', 'resourceId', 'threadId', 'title'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /memory/threads/:threadId': {
    method: 'PATCH',
    path: '/memory/threads/:threadId',
    pathParams: ['threadId'],
    queryParams: ['agentId'],
    bodyParams: ['metadata', 'resourceId', 'title'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /memory/threads/:threadId': {
    method: 'DELETE',
    path: '/memory/threads/:threadId',
    pathParams: ['threadId'],
    queryParams: ['agentId', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /memory/threads/:threadId/clone': {
    method: 'POST',
    path: '/memory/threads/:threadId/clone',
    pathParams: ['threadId'],
    queryParams: ['agentId'],
    bodyParams: ['metadata', 'newThreadId', 'options', 'resourceId', 'title'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'clonedMessages',
    },
  },
  'POST /memory/threads/:threadId/working-memory': {
    method: 'POST',
    path: '/memory/threads/:threadId/working-memory',
    pathParams: ['threadId'],
    queryParams: ['agentId'],
    bodyParams: ['memoryConfig', 'resourceId', 'workingMemory'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /memory/messages/delete': {
    method: 'POST',
    path: '/memory/messages/delete',
    pathParams: [],
    queryParams: ['agentId', 'resourceId'],
    bodyParams: ['messageIds'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/search': {
    method: 'GET',
    path: '/memory/search',
    pathParams: [],
    queryParams: ['agentId', 'limit', 'memoryConfig', 'resourceId', 'searchQuery', 'threadId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/network/status': {
    method: 'GET',
    path: '/memory/network/status',
    pathParams: [],
    queryParams: ['agentId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/network/threads': {
    method: 'GET',
    path: '/memory/network/threads',
    pathParams: [],
    queryParams: ['agentId', 'metadata', 'orderBy', 'page', 'perPage', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'threads',
      paginationProperty: 'page',
    },
  },
  'GET /memory/network/threads/:threadId': {
    method: 'GET',
    path: '/memory/network/threads/:threadId',
    pathParams: ['threadId'],
    queryParams: ['agentId', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /memory/network/threads/:threadId/messages': {
    method: 'GET',
    path: '/memory/network/threads/:threadId/messages',
    pathParams: ['threadId'],
    queryParams: ['agentId', 'filter', 'include', 'orderBy', 'page', 'perPage', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'messages',
    },
  },
  'POST /memory/network/save-messages': {
    method: 'POST',
    path: '/memory/network/save-messages',
    pathParams: [],
    queryParams: ['agentId'],
    bodyParams: ['messages'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'messages',
    },
  },
  'POST /memory/network/threads': {
    method: 'POST',
    path: '/memory/network/threads',
    pathParams: [],
    queryParams: ['agentId'],
    bodyParams: ['metadata', 'resourceId', 'threadId', 'title'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /memory/network/threads/:threadId': {
    method: 'PATCH',
    path: '/memory/network/threads/:threadId',
    pathParams: ['threadId'],
    queryParams: ['agentId'],
    bodyParams: ['metadata', 'resourceId', 'title'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /memory/network/threads/:threadId': {
    method: 'DELETE',
    path: '/memory/network/threads/:threadId',
    pathParams: ['threadId'],
    queryParams: ['agentId', 'resourceId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /memory/network/messages/delete': {
    method: 'POST',
    path: '/memory/network/messages/delete',
    pathParams: [],
    queryParams: ['agentId', 'resourceId'],
    bodyParams: ['messageIds'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /scores/scorers': {
    method: 'GET',
    path: '/scores/scorers',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'record',
    },
  },
  'GET /scores/scorers/:scorerId': {
    method: 'GET',
    path: '/scores/scorers/:scorerId',
    pathParams: ['scorerId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /scores/run/:runId': {
    method: 'GET',
    path: '/scores/run/:runId',
    pathParams: ['runId'],
    queryParams: ['page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'scores',
      paginationProperty: 'pagination',
    },
  },
  'GET /scores/scorer/:scorerId': {
    method: 'GET',
    path: '/scores/scorer/:scorerId',
    pathParams: ['scorerId'],
    queryParams: ['entityId', 'entityType', 'page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'scores',
      paginationProperty: 'pagination',
    },
  },
  'GET /scores/entity/:entityType/:entityId': {
    method: 'GET',
    path: '/scores/entity/:entityType/:entityId',
    pathParams: ['entityType', 'entityId'],
    queryParams: ['page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'scores',
      paginationProperty: 'pagination',
    },
  },
  'POST /scores': {
    method: 'POST',
    path: '/scores',
    pathParams: [],
    queryParams: [],
    bodyParams: ['score'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /observability/traces': {
    method: 'GET',
    path: '/observability/traces',
    pathParams: [],
    queryParams: [
      'after',
      'dateRange',
      'direction',
      'endedAt',
      'entityId',
      'entityName',
      'entityType',
      'entityVersionId',
      'environment',
      'experimentId',
      'field',
      'hasChildError',
      'limit',
      'metadata',
      'mode',
      'name',
      'organizationId',
      'page',
      'parentEntityId',
      'parentEntityName',
      'parentEntityType',
      'parentEntityVersionId',
      'perPage',
      'requestId',
      'resourceId',
      'rootEntityId',
      'rootEntityName',
      'rootEntityType',
      'rootEntityVersionId',
      'runId',
      'scope',
      'serviceName',
      'sessionId',
      'source',
      'spanType',
      'startedAt',
      'status',
      'tags',
      'threadId',
      'traceId',
      'userId',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'spans',
      paginationProperty: 'pagination',
    },
  },
  'GET /observability/traces/light': {
    method: 'GET',
    path: '/observability/traces/light',
    pathParams: [],
    queryParams: [
      'dateRange',
      'direction',
      'endedAt',
      'entityId',
      'entityName',
      'entityType',
      'entityVersionId',
      'environment',
      'experimentId',
      'field',
      'hasChildError',
      'metadata',
      'name',
      'organizationId',
      'page',
      'parentEntityId',
      'parentEntityName',
      'parentEntityType',
      'parentEntityVersionId',
      'perPage',
      'requestId',
      'resourceId',
      'rootEntityId',
      'rootEntityName',
      'rootEntityType',
      'rootEntityVersionId',
      'runId',
      'scope',
      'serviceName',
      'sessionId',
      'source',
      'spanType',
      'startedAt',
      'status',
      'tags',
      'threadId',
      'traceId',
      'userId',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'spans',
      paginationProperty: 'pagination',
    },
  },
  'GET /observability/branches': {
    method: 'GET',
    path: '/observability/branches',
    pathParams: [],
    queryParams: [
      'after',
      'direction',
      'endedAt',
      'entityId',
      'entityName',
      'entityType',
      'entityVersionId',
      'environment',
      'experimentId',
      'field',
      'limit',
      'metadata',
      'mode',
      'organizationId',
      'page',
      'parentEntityId',
      'parentEntityName',
      'parentEntityType',
      'parentEntityVersionId',
      'perPage',
      'requestId',
      'resourceId',
      'rootEntityId',
      'rootEntityName',
      'rootEntityType',
      'rootEntityVersionId',
      'runId',
      'scope',
      'serviceName',
      'sessionId',
      'source',
      'spanType',
      'startedAt',
      'status',
      'tags',
      'threadId',
      'traceId',
      'userId',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'branches',
      paginationProperty: 'pagination',
    },
  },
  'GET /observability/traces/:traceId/branches/:spanId': {
    method: 'GET',
    path: '/observability/traces/:traceId/branches/:spanId',
    pathParams: ['traceId', 'spanId'],
    queryParams: ['depth'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'spans',
    },
  },
  'GET /observability/traces/:traceId': {
    method: 'GET',
    path: '/observability/traces/:traceId',
    pathParams: ['traceId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'spans',
    },
  },
  'GET /observability/traces/:traceId/light': {
    method: 'GET',
    path: '/observability/traces/:traceId/light',
    pathParams: ['traceId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'spans',
    },
  },
  'GET /observability/traces/:traceId/spans/:spanId': {
    method: 'GET',
    path: '/observability/traces/:traceId/spans/:spanId',
    pathParams: ['traceId', 'spanId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /observability/traces/:traceId/trajectory': {
    method: 'GET',
    path: '/observability/traces/:traceId/trajectory',
    pathParams: ['traceId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /observability/traces/score': {
    method: 'POST',
    path: '/observability/traces/score',
    pathParams: [],
    queryParams: [],
    bodyParams: ['scorerName', 'targets'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /observability/traces/:traceId/:spanId/scores': {
    method: 'GET',
    path: '/observability/traces/:traceId/:spanId/scores',
    pathParams: ['traceId', 'spanId'],
    queryParams: ['page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'scores',
      paginationProperty: 'pagination',
    },
  },
  'GET /observability/metrics': {
    method: 'GET',
    path: '/observability/metrics',
    pathParams: [],
    queryParams: [
      'after',
      'costUnit',
      'direction',
      'entityName',
      'entityType',
      'entityVersionId',
      'environment',
      'executionSource',
      'experimentId',
      'field',
      'labels',
      'limit',
      'mode',
      'model',
      'name',
      'organizationId',
      'page',
      'parentEntityName',
      'parentEntityType',
      'parentEntityVersionId',
      'perPage',
      'provider',
      'requestId',
      'resourceId',
      'rootEntityName',
      'rootEntityType',
      'rootEntityVersionId',
      'runId',
      'serviceName',
      'sessionId',
      'source',
      'spanId',
      'tags',
      'threadId',
      'timestamp',
      'traceId',
      'userId',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'metrics',
      paginationProperty: 'pagination',
    },
  },
  'GET /observability/logs': {
    method: 'GET',
    path: '/observability/logs',
    pathParams: [],
    queryParams: [
      'after',
      'direction',
      'entityName',
      'entityType',
      'entityVersionId',
      'environment',
      'executionSource',
      'experimentId',
      'field',
      'level',
      'limit',
      'mode',
      'organizationId',
      'page',
      'parentEntityName',
      'parentEntityType',
      'parentEntityVersionId',
      'perPage',
      'requestId',
      'resourceId',
      'rootEntityName',
      'rootEntityType',
      'rootEntityVersionId',
      'runId',
      'serviceName',
      'sessionId',
      'source',
      'spanId',
      'tags',
      'threadId',
      'timestamp',
      'traceId',
      'userId',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'logs',
      paginationProperty: 'pagination',
    },
  },
  'GET /observability/scores': {
    method: 'GET',
    path: '/observability/scores',
    pathParams: [],
    queryParams: [
      'after',
      'direction',
      'entityName',
      'entityType',
      'entityVersionId',
      'environment',
      'executionSource',
      'experimentId',
      'field',
      'limit',
      'mode',
      'organizationId',
      'page',
      'parentEntityName',
      'parentEntityType',
      'parentEntityVersionId',
      'perPage',
      'requestId',
      'resourceId',
      'rootEntityName',
      'rootEntityType',
      'rootEntityVersionId',
      'runId',
      'scoreSource',
      'scorerId',
      'serviceName',
      'sessionId',
      'source',
      'spanId',
      'tags',
      'threadId',
      'timestamp',
      'traceId',
      'userId',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'scores',
      paginationProperty: 'pagination',
    },
  },
  'POST /observability/scores': {
    method: 'POST',
    path: '/observability/scores',
    pathParams: [],
    queryParams: [],
    bodyParams: ['score'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /observability/scores/:scoreId': {
    method: 'GET',
    path: '/observability/scores/:scoreId',
    pathParams: ['scoreId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /observability/scores/aggregate': {
    method: 'POST',
    path: '/observability/scores/aggregate',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'comparePeriod', 'filters', 'scoreSource', 'scorerId'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /observability/scores/breakdown': {
    method: 'POST',
    path: '/observability/scores/breakdown',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'filters', 'groupBy', 'scoreSource', 'scorerId'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'groups',
    },
  },
  'POST /observability/scores/timeseries': {
    method: 'POST',
    path: '/observability/scores/timeseries',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'filters', 'groupBy', 'interval', 'scoreSource', 'scorerId'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'series',
    },
  },
  'POST /observability/scores/percentiles': {
    method: 'POST',
    path: '/observability/scores/percentiles',
    pathParams: [],
    queryParams: [],
    bodyParams: ['filters', 'interval', 'percentiles', 'scoreSource', 'scorerId'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'series',
    },
  },
  'GET /observability/feedback': {
    method: 'GET',
    path: '/observability/feedback',
    pathParams: [],
    queryParams: [
      'after',
      'direction',
      'entityName',
      'entityType',
      'entityVersionId',
      'environment',
      'executionSource',
      'experimentId',
      'feedbackSource',
      'feedbackType',
      'feedbackUserId',
      'field',
      'limit',
      'mode',
      'organizationId',
      'page',
      'parentEntityName',
      'parentEntityType',
      'parentEntityVersionId',
      'perPage',
      'requestId',
      'resourceId',
      'rootEntityName',
      'rootEntityType',
      'rootEntityVersionId',
      'runId',
      'serviceName',
      'sessionId',
      'source',
      'spanId',
      'tags',
      'threadId',
      'timestamp',
      'traceId',
      'userId',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'feedback',
      paginationProperty: 'pagination',
    },
  },
  'POST /observability/feedback': {
    method: 'POST',
    path: '/observability/feedback',
    pathParams: [],
    queryParams: [],
    bodyParams: ['feedback'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /observability/feedback/aggregate': {
    method: 'POST',
    path: '/observability/feedback/aggregate',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'comparePeriod', 'feedbackSource', 'feedbackType', 'filters'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /observability/feedback/breakdown': {
    method: 'POST',
    path: '/observability/feedback/breakdown',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'feedbackSource', 'feedbackType', 'filters', 'groupBy'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'groups',
    },
  },
  'POST /observability/feedback/timeseries': {
    method: 'POST',
    path: '/observability/feedback/timeseries',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'feedbackSource', 'feedbackType', 'filters', 'groupBy', 'interval'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'series',
    },
  },
  'POST /observability/feedback/percentiles': {
    method: 'POST',
    path: '/observability/feedback/percentiles',
    pathParams: [],
    queryParams: [],
    bodyParams: ['feedbackSource', 'feedbackType', 'filters', 'interval', 'percentiles'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'series',
    },
  },
  'POST /observability/metrics/aggregate': {
    method: 'POST',
    path: '/observability/metrics/aggregate',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'comparePeriod', 'distinctColumn', 'filters', 'name'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /observability/metrics/breakdown': {
    method: 'POST',
    path: '/observability/metrics/breakdown',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'distinctColumn', 'filters', 'groupBy', 'limit', 'name', 'orderDirection'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'groups',
    },
  },
  'POST /observability/metrics/timeseries': {
    method: 'POST',
    path: '/observability/metrics/timeseries',
    pathParams: [],
    queryParams: [],
    bodyParams: ['aggregation', 'distinctColumn', 'filters', 'groupBy', 'interval', 'name'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'series',
    },
  },
  'POST /observability/metrics/percentiles': {
    method: 'POST',
    path: '/observability/metrics/percentiles',
    pathParams: [],
    queryParams: [],
    bodyParams: ['filters', 'interval', 'name', 'percentiles'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'series',
    },
  },
  'GET /observability/discovery/metric-names': {
    method: 'GET',
    path: '/observability/discovery/metric-names',
    pathParams: [],
    queryParams: ['limit', 'prefix'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'names',
    },
  },
  'GET /observability/discovery/metric-label-keys': {
    method: 'GET',
    path: '/observability/discovery/metric-label-keys',
    pathParams: [],
    queryParams: ['metricName'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'keys',
    },
  },
  'GET /observability/discovery/metric-label-values': {
    method: 'GET',
    path: '/observability/discovery/metric-label-values',
    pathParams: [],
    queryParams: ['labelKey', 'limit', 'metricName', 'prefix'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'values',
    },
  },
  'GET /observability/discovery/entity-types': {
    method: 'GET',
    path: '/observability/discovery/entity-types',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'entityTypes',
    },
  },
  'GET /observability/discovery/entity-names': {
    method: 'GET',
    path: '/observability/discovery/entity-names',
    pathParams: [],
    queryParams: ['entityType'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'names',
    },
  },
  'GET /observability/discovery/service-names': {
    method: 'GET',
    path: '/observability/discovery/service-names',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'serviceNames',
    },
  },
  'GET /observability/discovery/environments': {
    method: 'GET',
    path: '/observability/discovery/environments',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'environments',
    },
  },
  'GET /observability/discovery/tags': {
    method: 'GET',
    path: '/observability/discovery/tags',
    pathParams: [],
    queryParams: ['entityType'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'tags',
    },
  },
  'GET /logs/transports': {
    method: 'GET',
    path: '/logs/transports',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'transports',
    },
  },
  'GET /logs': {
    method: 'GET',
    path: '/logs',
    pathParams: [],
    queryParams: ['filters', 'fromDate', 'logLevel', 'page', 'perPage', 'toDate', 'transportId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'logs',
      paginationProperty: 'page',
    },
  },
  'GET /logs/:runId': {
    method: 'GET',
    path: '/logs/:runId',
    pathParams: ['runId'],
    queryParams: ['filters', 'fromDate', 'logLevel', 'page', 'perPage', 'toDate', 'transportId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'logs',
      paginationProperty: 'page',
    },
  },
  'POST /vector/:vectorName/upsert': {
    method: 'POST',
    path: '/vector/:vectorName/upsert',
    pathParams: ['vectorName'],
    queryParams: [],
    bodyParams: ['ids', 'indexName', 'metadata', 'vectors'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'ids',
    },
  },
  'POST /vector/:vectorName/create-index': {
    method: 'POST',
    path: '/vector/:vectorName/create-index',
    pathParams: ['vectorName'],
    queryParams: [],
    bodyParams: ['dimension', 'indexName', 'metric'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /vector/:vectorName/query': {
    method: 'POST',
    path: '/vector/:vectorName/query',
    pathParams: ['vectorName'],
    queryParams: [],
    bodyParams: ['filter', 'includeVector', 'indexName', 'queryVector', 'topK'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'array',
    },
  },
  'GET /vector/:vectorName/indexes': {
    method: 'GET',
    path: '/vector/:vectorName/indexes',
    pathParams: ['vectorName'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'array',
    },
  },
  'GET /vector/:vectorName/indexes/:indexName': {
    method: 'GET',
    path: '/vector/:vectorName/indexes/:indexName',
    pathParams: ['vectorName', 'indexName'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /vector/:vectorName/indexes/:indexName': {
    method: 'DELETE',
    path: '/vector/:vectorName/indexes/:indexName',
    pathParams: ['vectorName', 'indexName'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /vectors': {
    method: 'GET',
    path: '/vectors',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'vectors',
    },
  },
  'GET /embedders': {
    method: 'GET',
    path: '/embedders',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'embedders',
    },
  },
  'GET /.well-known/:agentId/agent-card.json': {
    method: 'GET',
    path: '/.well-known/:agentId/agent-card.json',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces': {
    method: 'GET',
    path: '/workspaces',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'workspaces',
    },
  },
  'GET /workspaces/:workspaceId': {
    method: 'GET',
    path: '/workspaces/:workspaceId',
    pathParams: ['workspaceId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/fs/read': {
    method: 'GET',
    path: '/workspaces/:workspaceId/fs/read',
    pathParams: ['workspaceId'],
    queryParams: ['encoding', 'path'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workspaces/:workspaceId/fs/write': {
    method: 'POST',
    path: '/workspaces/:workspaceId/fs/write',
    pathParams: ['workspaceId'],
    queryParams: [],
    bodyParams: ['content', 'encoding', 'path', 'recursive'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/fs/list': {
    method: 'GET',
    path: '/workspaces/:workspaceId/fs/list',
    pathParams: ['workspaceId'],
    queryParams: ['path', 'recursive'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'entries',
    },
  },
  'DELETE /workspaces/:workspaceId/fs/delete': {
    method: 'DELETE',
    path: '/workspaces/:workspaceId/fs/delete',
    pathParams: ['workspaceId'],
    queryParams: ['force', 'path', 'recursive'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workspaces/:workspaceId/fs/mkdir': {
    method: 'POST',
    path: '/workspaces/:workspaceId/fs/mkdir',
    pathParams: ['workspaceId'],
    queryParams: [],
    bodyParams: ['path', 'recursive'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/fs/stat': {
    method: 'GET',
    path: '/workspaces/:workspaceId/fs/stat',
    pathParams: ['workspaceId'],
    queryParams: ['path'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/search': {
    method: 'GET',
    path: '/workspaces/:workspaceId/search',
    pathParams: ['workspaceId'],
    queryParams: ['minScore', 'mode', 'query', 'topK'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workspaces/:workspaceId/index': {
    method: 'POST',
    path: '/workspaces/:workspaceId/index',
    pathParams: ['workspaceId'],
    queryParams: [],
    bodyParams: ['content', 'metadata', 'path'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/skills/search': {
    method: 'GET',
    path: '/workspaces/:workspaceId/skills/search',
    pathParams: ['workspaceId'],
    queryParams: ['includeReferences', 'minScore', 'query', 'skillNames', 'topK'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'results',
    },
  },
  'GET /workspaces/:workspaceId/skills': {
    method: 'GET',
    path: '/workspaces/:workspaceId/skills',
    pathParams: ['workspaceId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'skills',
    },
  },
  'GET /workspaces/:workspaceId/skills/:skillName': {
    method: 'GET',
    path: '/workspaces/:workspaceId/skills/:skillName',
    pathParams: ['workspaceId', 'skillName'],
    queryParams: ['path'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/skills/:skillName/references': {
    method: 'GET',
    path: '/workspaces/:workspaceId/skills/:skillName/references',
    pathParams: ['workspaceId', 'skillName'],
    queryParams: ['path'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'references',
    },
  },
  'GET /workspaces/:workspaceId/skills/:skillName/references/:referencePath': {
    method: 'GET',
    path: '/workspaces/:workspaceId/skills/:skillName/references/:referencePath',
    pathParams: ['workspaceId', 'skillName', 'referencePath'],
    queryParams: ['path'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/skills-sh/search': {
    method: 'GET',
    path: '/workspaces/:workspaceId/skills-sh/search',
    pathParams: ['workspaceId'],
    queryParams: ['limit', 'q'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/skills-sh/popular': {
    method: 'GET',
    path: '/workspaces/:workspaceId/skills-sh/popular',
    pathParams: ['workspaceId'],
    queryParams: ['limit', 'offset'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /workspaces/:workspaceId/skills-sh/preview': {
    method: 'GET',
    path: '/workspaces/:workspaceId/skills-sh/preview',
    pathParams: ['workspaceId'],
    queryParams: ['owner', 'path', 'repo'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workspaces/:workspaceId/skills-sh/install': {
    method: 'POST',
    path: '/workspaces/:workspaceId/skills-sh/install',
    pathParams: ['workspaceId'],
    queryParams: [],
    bodyParams: ['mount', 'owner', 'repo', 'skillName'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workspaces/:workspaceId/skills-sh/remove': {
    method: 'POST',
    path: '/workspaces/:workspaceId/skills-sh/remove',
    pathParams: ['workspaceId'],
    queryParams: [],
    bodyParams: ['skillName'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /workspaces/:workspaceId/skills-sh/update': {
    method: 'POST',
    path: '/workspaces/:workspaceId/skills-sh/update',
    pathParams: ['workspaceId'],
    queryParams: [],
    bodyParams: ['skillName'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'updated',
    },
  },
  'POST /agents/:agentId/generate-legacy': {
    method: 'POST',
    path: '/agents/:agentId/generate-legacy',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: [
      'activeTools',
      'clientTools',
      'context',
      'instructions',
      'maxSteps',
      'memory',
      'messages',
      'modelSettings',
      'output',
      'providerOptions',
      'requestContext',
      'requireToolApproval',
      'resourceId',
      'resourceid',
      'returnScorerData',
      'runId',
      'savePerStep',
      'scorers',
      'stopWhen',
      'structuredOutput',
      'system',
      'threadId',
      'toolChoice',
      'toolsets',
      'tracingOptions',
      'untilIdle',
      'versions',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /mcp/v0/servers': {
    method: 'GET',
    path: '/mcp/v0/servers',
    pathParams: [],
    queryParams: ['limit', 'offset', 'page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /mcp/v0/servers/:id': {
    method: 'GET',
    path: '/mcp/v0/servers/:id',
    pathParams: ['id'],
    queryParams: ['version'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /mcp/:serverId/tools': {
    method: 'GET',
    path: '/mcp/:serverId/tools',
    pathParams: ['serverId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'tools',
    },
  },
  'GET /mcp/:serverId/tools/:toolId': {
    method: 'GET',
    path: '/mcp/:serverId/tools/:toolId',
    pathParams: ['serverId', 'toolId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /mcp/:serverId/tools/:toolId/execute': {
    method: 'POST',
    path: '/mcp/:serverId/tools/:toolId/execute',
    pathParams: ['serverId', 'toolId'],
    queryParams: [],
    bodyParams: ['data'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /mcp/:serverId/resources': {
    method: 'GET',
    path: '/mcp/:serverId/resources',
    pathParams: ['serverId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'resources',
    },
  },
  'POST /mcp/:serverId/resources/read': {
    method: 'POST',
    path: '/mcp/:serverId/resources/read',
    pathParams: ['serverId'],
    queryParams: [],
    bodyParams: ['uri'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'contents',
    },
  },
  'GET /stored/agents': {
    method: 'GET',
    path: '/stored/agents',
    pathParams: [],
    queryParams: [
      'authorId',
      'favoritedOnly',
      'metadata',
      'orderBy',
      'page',
      'perPage',
      'pinFavoritedFor',
      'status',
      'visibility',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'agents',
      paginationProperty: 'page',
    },
  },
  'POST /stored/agents/preview-instructions': {
    method: 'POST',
    path: '/stored/agents/preview-instructions',
    pathParams: [],
    queryParams: [],
    bodyParams: ['blocks', 'context'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/agents/:storedAgentId/dependents': {
    method: 'GET',
    path: '/stored/agents/:storedAgentId/dependents',
    pathParams: ['storedAgentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'dependents',
    },
  },
  'POST /stored/agents/:storedAgentId/export': {
    method: 'POST',
    path: '/stored/agents/:storedAgentId/export',
    pathParams: ['storedAgentId'],
    queryParams: [],
    bodyParams: [
      'agents',
      'browser',
      'defaultOptions',
      'description',
      'inputProcessors',
      'instructions',
      'integrationTools',
      'mcpClients',
      'memory',
      'model',
      'name',
      'outputProcessors',
      'requestContextSchema',
      'scorers',
      'skills',
      'toolProviders',
      'tools',
      'workflows',
      'workspace',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/agents/:storedAgentId': {
    method: 'GET',
    path: '/stored/agents/:storedAgentId',
    pathParams: ['storedAgentId'],
    queryParams: ['status'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/agents': {
    method: 'POST',
    path: '/stored/agents',
    pathParams: [],
    queryParams: [],
    bodyParams: [
      'agents',
      'authorId',
      'browser',
      'defaultOptions',
      'description',
      'id',
      'inputProcessors',
      'instructions',
      'integrationTools',
      'mcpClients',
      'memory',
      'metadata',
      'model',
      'name',
      'outputProcessors',
      'requestContextSchema',
      'scorers',
      'skills',
      'toolProviders',
      'tools',
      'visibility',
      'workflows',
      'workspace',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /stored/agents/:storedAgentId': {
    method: 'PATCH',
    path: '/stored/agents/:storedAgentId',
    pathParams: ['storedAgentId'],
    queryParams: [],
    bodyParams: [
      'agents',
      'authorId',
      'browser',
      'changeMessage',
      'defaultOptions',
      'description',
      'inputProcessors',
      'instructions',
      'integrationTools',
      'mcpClients',
      'memory',
      'metadata',
      'model',
      'name',
      'outputProcessors',
      'requestContextSchema',
      'scorers',
      'skills',
      'toolProviders',
      'tools',
      'visibility',
      'workflows',
      'workspace',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/agents/:storedAgentId': {
    method: 'DELETE',
    path: '/stored/agents/:storedAgentId',
    pathParams: ['storedAgentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/agents/:agentId/versions': {
    method: 'GET',
    path: '/stored/agents/:agentId/versions',
    pathParams: ['agentId'],
    queryParams: ['orderBy', 'page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'versions',
      paginationProperty: 'page',
    },
  },
  'POST /stored/agents/:agentId/versions': {
    method: 'POST',
    path: '/stored/agents/:agentId/versions',
    pathParams: ['agentId'],
    queryParams: [],
    bodyParams: ['changeMessage'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/agents/:agentId/versions/compare': {
    method: 'GET',
    path: '/stored/agents/:agentId/versions/compare',
    pathParams: ['agentId'],
    queryParams: ['from', 'to'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/agents/:agentId/versions/:versionId': {
    method: 'GET',
    path: '/stored/agents/:agentId/versions/:versionId',
    pathParams: ['agentId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/agents/:agentId/versions/:versionId/activate': {
    method: 'POST',
    path: '/stored/agents/:agentId/versions/:versionId/activate',
    pathParams: ['agentId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/agents/:agentId/versions/:versionId/restore': {
    method: 'POST',
    path: '/stored/agents/:agentId/versions/:versionId/restore',
    pathParams: ['agentId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/agents/:agentId/versions/:versionId': {
    method: 'DELETE',
    path: '/stored/agents/:agentId/versions/:versionId',
    pathParams: ['agentId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'PUT /stored/agents/:storedAgentId/favorite': {
    method: 'PUT',
    path: '/stored/agents/:storedAgentId/favorite',
    pathParams: ['storedAgentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/agents/:storedAgentId/favorite': {
    method: 'DELETE',
    path: '/stored/agents/:storedAgentId/favorite',
    pathParams: ['storedAgentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/mcp-clients': {
    method: 'GET',
    path: '/stored/mcp-clients',
    pathParams: [],
    queryParams: ['authorId', 'metadata', 'orderBy', 'page', 'perPage', 'status'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'mcpClients',
      paginationProperty: 'page',
    },
  },
  'GET /stored/mcp-clients/:storedMCPClientId': {
    method: 'GET',
    path: '/stored/mcp-clients/:storedMCPClientId',
    pathParams: ['storedMCPClientId'],
    queryParams: ['status'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/mcp-clients': {
    method: 'POST',
    path: '/stored/mcp-clients',
    pathParams: [],
    queryParams: [],
    bodyParams: ['authorId', 'description', 'id', 'metadata', 'name', 'servers'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /stored/mcp-clients/:storedMCPClientId': {
    method: 'PATCH',
    path: '/stored/mcp-clients/:storedMCPClientId',
    pathParams: ['storedMCPClientId'],
    queryParams: [],
    bodyParams: ['authorId', 'description', 'metadata', 'name', 'servers'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/mcp-clients/:storedMCPClientId': {
    method: 'DELETE',
    path: '/stored/mcp-clients/:storedMCPClientId',
    pathParams: ['storedMCPClientId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/mcp-clients/:mcpClientId/versions': {
    method: 'GET',
    path: '/stored/mcp-clients/:mcpClientId/versions',
    pathParams: ['mcpClientId'],
    queryParams: ['orderBy', 'page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'versions',
      paginationProperty: 'page',
    },
  },
  'POST /stored/mcp-clients/:mcpClientId/versions': {
    method: 'POST',
    path: '/stored/mcp-clients/:mcpClientId/versions',
    pathParams: ['mcpClientId'],
    queryParams: [],
    bodyParams: ['changeMessage'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/mcp-clients/:mcpClientId/versions/compare': {
    method: 'GET',
    path: '/stored/mcp-clients/:mcpClientId/versions/compare',
    pathParams: ['mcpClientId'],
    queryParams: ['from', 'to'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/mcp-clients/:mcpClientId/versions/:versionId': {
    method: 'GET',
    path: '/stored/mcp-clients/:mcpClientId/versions/:versionId',
    pathParams: ['mcpClientId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/mcp-clients/:mcpClientId/versions/:versionId/activate': {
    method: 'POST',
    path: '/stored/mcp-clients/:mcpClientId/versions/:versionId/activate',
    pathParams: ['mcpClientId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/mcp-clients/:mcpClientId/versions/:versionId/restore': {
    method: 'POST',
    path: '/stored/mcp-clients/:mcpClientId/versions/:versionId/restore',
    pathParams: ['mcpClientId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/mcp-clients/:mcpClientId/versions/:versionId': {
    method: 'DELETE',
    path: '/stored/mcp-clients/:mcpClientId/versions/:versionId',
    pathParams: ['mcpClientId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/prompt-blocks': {
    method: 'GET',
    path: '/stored/prompt-blocks',
    pathParams: [],
    queryParams: ['authorId', 'metadata', 'orderBy', 'page', 'perPage', 'status'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'promptBlocks',
      paginationProperty: 'page',
    },
  },
  'GET /stored/prompt-blocks/:storedPromptBlockId': {
    method: 'GET',
    path: '/stored/prompt-blocks/:storedPromptBlockId',
    pathParams: ['storedPromptBlockId'],
    queryParams: ['status'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/prompt-blocks': {
    method: 'POST',
    path: '/stored/prompt-blocks',
    pathParams: [],
    queryParams: [],
    bodyParams: ['authorId', 'content', 'description', 'id', 'metadata', 'name', 'requestContextSchema', 'rules'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /stored/prompt-blocks/:storedPromptBlockId': {
    method: 'PATCH',
    path: '/stored/prompt-blocks/:storedPromptBlockId',
    pathParams: ['storedPromptBlockId'],
    queryParams: [],
    bodyParams: ['authorId', 'content', 'description', 'metadata', 'name', 'requestContextSchema', 'rules'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/prompt-blocks/:storedPromptBlockId': {
    method: 'DELETE',
    path: '/stored/prompt-blocks/:storedPromptBlockId',
    pathParams: ['storedPromptBlockId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/prompt-blocks/:promptBlockId/versions': {
    method: 'GET',
    path: '/stored/prompt-blocks/:promptBlockId/versions',
    pathParams: ['promptBlockId'],
    queryParams: ['orderBy', 'page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'versions',
      paginationProperty: 'page',
    },
  },
  'POST /stored/prompt-blocks/:promptBlockId/versions': {
    method: 'POST',
    path: '/stored/prompt-blocks/:promptBlockId/versions',
    pathParams: ['promptBlockId'],
    queryParams: [],
    bodyParams: ['changeMessage'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/prompt-blocks/:promptBlockId/versions/compare': {
    method: 'GET',
    path: '/stored/prompt-blocks/:promptBlockId/versions/compare',
    pathParams: ['promptBlockId'],
    queryParams: ['from', 'to'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/prompt-blocks/:promptBlockId/versions/:versionId': {
    method: 'GET',
    path: '/stored/prompt-blocks/:promptBlockId/versions/:versionId',
    pathParams: ['promptBlockId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/prompt-blocks/:promptBlockId/versions/:versionId/activate': {
    method: 'POST',
    path: '/stored/prompt-blocks/:promptBlockId/versions/:versionId/activate',
    pathParams: ['promptBlockId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/prompt-blocks/:promptBlockId/versions/:versionId/restore': {
    method: 'POST',
    path: '/stored/prompt-blocks/:promptBlockId/versions/:versionId/restore',
    pathParams: ['promptBlockId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/prompt-blocks/:promptBlockId/versions/:versionId': {
    method: 'DELETE',
    path: '/stored/prompt-blocks/:promptBlockId/versions/:versionId',
    pathParams: ['promptBlockId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/scorers': {
    method: 'GET',
    path: '/stored/scorers',
    pathParams: [],
    queryParams: ['authorId', 'metadata', 'orderBy', 'page', 'perPage', 'status'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'scorerDefinitions',
      paginationProperty: 'page',
    },
  },
  'GET /stored/scorers/:storedScorerId': {
    method: 'GET',
    path: '/stored/scorers/:storedScorerId',
    pathParams: ['storedScorerId'],
    queryParams: ['status'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/scorers': {
    method: 'POST',
    path: '/stored/scorers',
    pathParams: [],
    queryParams: [],
    bodyParams: [
      'authorId',
      'defaultSampling',
      'description',
      'id',
      'instructions',
      'metadata',
      'model',
      'name',
      'presetConfig',
      'scoreRange',
      'type',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /stored/scorers/:storedScorerId': {
    method: 'PATCH',
    path: '/stored/scorers/:storedScorerId',
    pathParams: ['storedScorerId'],
    queryParams: [],
    bodyParams: [
      'authorId',
      'defaultSampling',
      'description',
      'instructions',
      'metadata',
      'model',
      'name',
      'presetConfig',
      'scoreRange',
      'type',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/scorers/:storedScorerId': {
    method: 'DELETE',
    path: '/stored/scorers/:storedScorerId',
    pathParams: ['storedScorerId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/scorers/:scorerId/versions': {
    method: 'GET',
    path: '/stored/scorers/:scorerId/versions',
    pathParams: ['scorerId'],
    queryParams: ['orderBy', 'page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'versions',
      paginationProperty: 'page',
    },
  },
  'POST /stored/scorers/:scorerId/versions': {
    method: 'POST',
    path: '/stored/scorers/:scorerId/versions',
    pathParams: ['scorerId'],
    queryParams: [],
    bodyParams: ['changeMessage'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/scorers/:scorerId/versions/compare': {
    method: 'GET',
    path: '/stored/scorers/:scorerId/versions/compare',
    pathParams: ['scorerId'],
    queryParams: ['from', 'to'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/scorers/:scorerId/versions/:versionId': {
    method: 'GET',
    path: '/stored/scorers/:scorerId/versions/:versionId',
    pathParams: ['scorerId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/scorers/:scorerId/versions/:versionId/activate': {
    method: 'POST',
    path: '/stored/scorers/:scorerId/versions/:versionId/activate',
    pathParams: ['scorerId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/scorers/:scorerId/versions/:versionId/restore': {
    method: 'POST',
    path: '/stored/scorers/:scorerId/versions/:versionId/restore',
    pathParams: ['scorerId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/scorers/:scorerId/versions/:versionId': {
    method: 'DELETE',
    path: '/stored/scorers/:scorerId/versions/:versionId',
    pathParams: ['scorerId', 'versionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/workspaces': {
    method: 'GET',
    path: '/stored/workspaces',
    pathParams: [],
    queryParams: ['authorId', 'metadata', 'orderBy', 'page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'workspaces',
      paginationProperty: 'page',
    },
  },
  'GET /stored/workspaces/:storedWorkspaceId': {
    method: 'GET',
    path: '/stored/workspaces/:storedWorkspaceId',
    pathParams: ['storedWorkspaceId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/workspaces': {
    method: 'POST',
    path: '/stored/workspaces',
    pathParams: [],
    queryParams: [],
    bodyParams: [
      'authorId',
      'autoSync',
      'description',
      'filesystem',
      'id',
      'metadata',
      'mounts',
      'name',
      'operationTimeout',
      'sandbox',
      'search',
      'skills',
      'tools',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /stored/workspaces/:storedWorkspaceId': {
    method: 'PATCH',
    path: '/stored/workspaces/:storedWorkspaceId',
    pathParams: ['storedWorkspaceId'],
    queryParams: [],
    bodyParams: [
      'autoSync',
      'description',
      'filesystem',
      'metadata',
      'mounts',
      'name',
      'operationTimeout',
      'sandbox',
      'search',
      'skills',
      'tools',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/workspaces/:storedWorkspaceId': {
    method: 'DELETE',
    path: '/stored/workspaces/:storedWorkspaceId',
    pathParams: ['storedWorkspaceId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /stored/skills': {
    method: 'GET',
    path: '/stored/skills',
    pathParams: [],
    queryParams: [
      'authorId',
      'favoritedOnly',
      'metadata',
      'orderBy',
      'page',
      'perPage',
      'pinFavoritedFor',
      'status',
      'visibility',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'skills',
      paginationProperty: 'page',
    },
  },
  'GET /stored/skills/:storedSkillId': {
    method: 'GET',
    path: '/stored/skills/:storedSkillId',
    pathParams: ['storedSkillId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/skills': {
    method: 'POST',
    path: '/stored/skills',
    pathParams: [],
    queryParams: [],
    bodyParams: [
      'assets',
      'authorId',
      'compatibility',
      'description',
      'files',
      'id',
      'instructions',
      'license',
      'metadata',
      'name',
      'references',
      'scripts',
      'source',
      'visibility',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /stored/skills/:storedSkillId': {
    method: 'PATCH',
    path: '/stored/skills/:storedSkillId',
    pathParams: ['storedSkillId'],
    queryParams: [],
    bodyParams: [
      'assets',
      'authorId',
      'compatibility',
      'description',
      'files',
      'instructions',
      'license',
      'metadata',
      'name',
      'references',
      'scripts',
      'source',
      'visibility',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/skills/:storedSkillId': {
    method: 'DELETE',
    path: '/stored/skills/:storedSkillId',
    pathParams: ['storedSkillId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /stored/skills/:storedSkillId/publish': {
    method: 'POST',
    path: '/stored/skills/:storedSkillId/publish',
    pathParams: ['storedSkillId'],
    queryParams: [],
    bodyParams: ['skillPath'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'PUT /stored/skills/:storedSkillId/favorite': {
    method: 'PUT',
    path: '/stored/skills/:storedSkillId/favorite',
    pathParams: ['storedSkillId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /stored/skills/:storedSkillId/favorite': {
    method: 'DELETE',
    path: '/stored/skills/:storedSkillId/favorite',
    pathParams: ['storedSkillId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /tool-providers': {
    method: 'GET',
    path: '/tool-providers',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'providers',
    },
  },
  'GET /tool-providers/:providerId/toolkits': {
    method: 'GET',
    path: '/tool-providers/:providerId/toolkits',
    pathParams: ['providerId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'data',
      paginationProperty: 'pagination',
    },
  },
  'GET /tool-providers/:providerId/tools': {
    method: 'GET',
    path: '/tool-providers/:providerId/tools',
    pathParams: ['providerId'],
    queryParams: ['page', 'perPage', 'search', 'toolkit'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'data',
      paginationProperty: 'pagination',
    },
  },
  'GET /tool-providers/:providerId/tools/:toolSlug/schema': {
    method: 'GET',
    path: '/tool-providers/:providerId/tools/:toolSlug/schema',
    pathParams: ['providerId', 'toolSlug'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'record',
    },
  },
  'POST /tool-providers/:providerId/authorize': {
    method: 'POST',
    path: '/tool-providers/:providerId/authorize',
    pathParams: ['providerId'],
    queryParams: [],
    bodyParams: ['config', 'connectionId', 'label', 'scope', 'toolName', 'toolkit'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /tool-providers/:providerId/auth-status/:authId': {
    method: 'GET',
    path: '/tool-providers/:providerId/auth-status/:authId',
    pathParams: ['providerId', 'authId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /tool-providers/:providerId/connection-status': {
    method: 'POST',
    path: '/tool-providers/:providerId/connection-status',
    pathParams: ['providerId'],
    queryParams: [],
    bodyParams: ['items'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /tool-providers/:providerId/connections': {
    method: 'GET',
    path: '/tool-providers/:providerId/connections',
    pathParams: ['providerId'],
    queryParams: ['authorId', 'page', 'perPage', 'scope', 'toolkit'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'items',
      paginationProperty: 'pagination',
    },
  },
  'GET /tool-providers/:providerId/connection-fields': {
    method: 'GET',
    path: '/tool-providers/:providerId/connection-fields',
    pathParams: ['providerId'],
    queryParams: ['toolkit'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'fields',
    },
  },
  'DELETE /tool-providers/:providerId/connections/:connectionId': {
    method: 'DELETE',
    path: '/tool-providers/:providerId/connections/:connectionId',
    pathParams: ['providerId', 'connectionId'],
    queryParams: ['force', 'toolkit'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /tool-providers/:providerId/connections/:connectionId': {
    method: 'PATCH',
    path: '/tool-providers/:providerId/connections/:connectionId',
    pathParams: ['providerId', 'connectionId'],
    queryParams: [],
    bodyParams: ['label'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /tool-providers/:providerId/connections/:connectionId/usage': {
    method: 'GET',
    path: '/tool-providers/:providerId/connections/:connectionId/usage',
    pathParams: ['providerId', 'connectionId'],
    queryParams: ['toolkit'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'agents',
    },
  },
  'GET /tool-providers/:providerId/health': {
    method: 'GET',
    path: '/tool-providers/:providerId/health',
    pathParams: ['providerId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /processor-providers': {
    method: 'GET',
    path: '/processor-providers',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'providers',
    },
  },
  'GET /processor-providers/:providerId': {
    method: 'GET',
    path: '/processor-providers/:providerId',
    pathParams: ['providerId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /system/packages': {
    method: 'GET',
    path: '/system/packages',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /system/api-schema': {
    method: 'GET',
    path: '/system/api-schema',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'routes',
    },
  },
  'GET /datasets': {
    method: 'GET',
    path: '/datasets',
    pathParams: [],
    queryParams: ['page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'datasets',
      paginationProperty: 'pagination',
    },
  },
  'POST /datasets': {
    method: 'POST',
    path: '/datasets',
    pathParams: [],
    queryParams: [],
    bodyParams: [
      'description',
      'groundTruthSchema',
      'inputSchema',
      'metadata',
      'name',
      'requestContextSchema',
      'scorerIds',
      'targetIds',
      'targetType',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /datasets/:datasetId': {
    method: 'GET',
    path: '/datasets/:datasetId',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /datasets/:datasetId': {
    method: 'PATCH',
    path: '/datasets/:datasetId',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: [
      'description',
      'groundTruthSchema',
      'inputSchema',
      'metadata',
      'name',
      'requestContextSchema',
      'scorerIds',
      'tags',
      'targetIds',
      'targetType',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /datasets/:datasetId': {
    method: 'DELETE',
    path: '/datasets/:datasetId',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /datasets/:datasetId/items': {
    method: 'GET',
    path: '/datasets/:datasetId/items',
    pathParams: ['datasetId'],
    queryParams: ['page', 'perPage', 'search', 'version'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'items',
      paginationProperty: 'pagination',
    },
  },
  'POST /datasets/:datasetId/items': {
    method: 'POST',
    path: '/datasets/:datasetId/items',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: ['expectedTrajectory', 'groundTruth', 'input', 'metadata', 'requestContext', 'source'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /datasets/:datasetId/items/batch': {
    method: 'POST',
    path: '/datasets/:datasetId/items/batch',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: ['items'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'items',
    },
  },
  'DELETE /datasets/:datasetId/items/batch': {
    method: 'DELETE',
    path: '/datasets/:datasetId/items/batch',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: ['itemIds'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /datasets/:datasetId/items/:itemId': {
    method: 'GET',
    path: '/datasets/:datasetId/items/:itemId',
    pathParams: ['datasetId', 'itemId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'PATCH /datasets/:datasetId/items/:itemId': {
    method: 'PATCH',
    path: '/datasets/:datasetId/items/:itemId',
    pathParams: ['datasetId', 'itemId'],
    queryParams: [],
    bodyParams: ['expectedTrajectory', 'groundTruth', 'input', 'metadata', 'requestContext', 'source'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'DELETE /datasets/:datasetId/items/:itemId': {
    method: 'DELETE',
    path: '/datasets/:datasetId/items/:itemId',
    pathParams: ['datasetId', 'itemId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /datasets/:datasetId/versions': {
    method: 'GET',
    path: '/datasets/:datasetId/versions',
    pathParams: ['datasetId'],
    queryParams: ['page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'versions',
      paginationProperty: 'pagination',
    },
  },
  'GET /datasets/:datasetId/items/:itemId/history': {
    method: 'GET',
    path: '/datasets/:datasetId/items/:itemId/history',
    pathParams: ['datasetId', 'itemId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'history',
    },
  },
  'GET /datasets/:datasetId/items/:itemId/versions/:datasetVersion': {
    method: 'GET',
    path: '/datasets/:datasetId/items/:itemId/versions/:datasetVersion',
    pathParams: ['datasetId', 'itemId', 'datasetVersion'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /experiments': {
    method: 'GET',
    path: '/experiments',
    pathParams: [],
    queryParams: ['page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'experiments',
      paginationProperty: 'pagination',
    },
  },
  'GET /experiments/review-summary': {
    method: 'GET',
    path: '/experiments/review-summary',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'counts',
    },
  },
  'GET /datasets/:datasetId/experiments': {
    method: 'GET',
    path: '/datasets/:datasetId/experiments',
    pathParams: ['datasetId'],
    queryParams: ['page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'experiments',
      paginationProperty: 'pagination',
    },
  },
  'POST /datasets/:datasetId/experiments': {
    method: 'POST',
    path: '/datasets/:datasetId/experiments',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: [
      'agentVersion',
      'maxConcurrency',
      'requestContext',
      'scorerIds',
      'targetId',
      'targetType',
      'version',
      'versions',
    ],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /datasets/:datasetId/experiments/:experimentId': {
    method: 'GET',
    path: '/datasets/:datasetId/experiments/:experimentId',
    pathParams: ['datasetId', 'experimentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /datasets/:datasetId/experiments/:experimentId/results': {
    method: 'GET',
    path: '/datasets/:datasetId/experiments/:experimentId/results',
    pathParams: ['datasetId', 'experimentId'],
    queryParams: ['page', 'perPage'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'results',
      paginationProperty: 'pagination',
    },
  },
  'PATCH /datasets/:datasetId/experiments/:experimentId/results/:resultId': {
    method: 'PATCH',
    path: '/datasets/:datasetId/experiments/:experimentId/results/:resultId',
    pathParams: ['datasetId', 'experimentId', 'resultId'],
    queryParams: [],
    bodyParams: ['status', 'tags'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /datasets/:datasetId/compare': {
    method: 'POST',
    path: '/datasets/:datasetId/compare',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: ['experimentIdA', 'experimentIdB'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'items',
    },
  },
  'POST /datasets/:datasetId/generate-items': {
    method: 'POST',
    path: '/datasets/:datasetId/generate-items',
    pathParams: ['datasetId'],
    queryParams: [],
    bodyParams: ['agentContext', 'count', 'modelId', 'prompt'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'items',
    },
  },
  'POST /datasets/cluster-failures': {
    method: 'POST',
    path: '/datasets/cluster-failures',
    pathParams: [],
    queryParams: [],
    bodyParams: ['availableTags', 'items', 'modelId', 'prompt'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'object-property',
      listProperty: 'clusters',
    },
  },
  'GET /background-tasks': {
    method: 'GET',
    path: '/background-tasks',
    pathParams: [],
    queryParams: [
      'agentId',
      'dateFilterBy',
      'fromDate',
      'orderBy',
      'orderDirection',
      'page',
      'perPage',
      'resourceId',
      'runId',
      'status',
      'threadId',
      'toDate',
      'toolCallId',
      'toolName',
    ],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'tasks',
    },
  },
  'GET /background-tasks/:backgroundTaskId': {
    method: 'GET',
    path: '/background-tasks/:backgroundTaskId',
    pathParams: ['backgroundTaskId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /editor/builder/settings': {
    method: 'GET',
    path: '/editor/builder/settings',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /editor/builder/infrastructure': {
    method: 'GET',
    path: '/editor/builder/infrastructure',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /editor/builder/registries': {
    method: 'GET',
    path: '/editor/builder/registries',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'registries',
    },
  },
  'GET /editor/builder/registries/:registryId/search': {
    method: 'GET',
    path: '/editor/builder/registries/:registryId/search',
    pathParams: ['registryId'],
    queryParams: ['limit', 'q'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /editor/builder/registries/:registryId/popular': {
    method: 'GET',
    path: '/editor/builder/registries/:registryId/popular',
    pathParams: ['registryId'],
    queryParams: ['limit', 'offset'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /editor/builder/registries/:registryId/preview': {
    method: 'GET',
    path: '/editor/builder/registries/:registryId/preview',
    pathParams: ['registryId'],
    queryParams: ['owner', 'path', 'repo'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /editor/builder/registries/:registryId/install': {
    method: 'POST',
    path: '/editor/builder/registries/:registryId/install',
    pathParams: ['registryId'],
    queryParams: [],
    bodyParams: ['owner', 'repo', 'skillName', 'visibility'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /agent-builder': {
    method: 'GET',
    path: '/agent-builder',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'record',
    },
  },
  'GET /agent-builder/:actionId': {
    method: 'GET',
    path: '/agent-builder/:actionId',
    pathParams: ['actionId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /agent-builder/:actionId/runs': {
    method: 'GET',
    path: '/agent-builder/:actionId/runs',
    pathParams: ['actionId'],
    queryParams: ['fromDate', 'limit', 'offset', 'page', 'perPage', 'resourceId', 'status', 'toDate'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'runs',
    },
  },
  'GET /agent-builder/:actionId/runs/:runId': {
    method: 'GET',
    path: '/agent-builder/:actionId/runs/:runId',
    pathParams: ['actionId', 'runId'],
    queryParams: ['fields', 'withNestedWorkflows'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agent-builder/:actionId/create-run': {
    method: 'POST',
    path: '/agent-builder/:actionId/create-run',
    pathParams: ['actionId'],
    queryParams: ['runId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agent-builder/:actionId/start-async': {
    method: 'POST',
    path: '/agent-builder/:actionId/start-async',
    pathParams: ['actionId'],
    queryParams: ['runId'],
    bodyParams: ['initialState', 'inputData', 'perStep', 'requestContext', 'resourceId', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agent-builder/:actionId/start': {
    method: 'POST',
    path: '/agent-builder/:actionId/start',
    pathParams: ['actionId'],
    queryParams: ['runId'],
    bodyParams: ['initialState', 'inputData', 'perStep', 'requestContext', 'resourceId', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agent-builder/:actionId/resume-async': {
    method: 'POST',
    path: '/agent-builder/:actionId/resume-async',
    pathParams: ['actionId'],
    queryParams: ['runId'],
    bodyParams: ['forEachIndex', 'perStep', 'requestContext', 'resumeData', 'step', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agent-builder/:actionId/resume-no-wait': {
    method: 'POST',
    path: '/agent-builder/:actionId/resume-no-wait',
    pathParams: ['actionId'],
    queryParams: ['runId'],
    bodyParams: ['forEachIndex', 'perStep', 'requestContext', 'resumeData', 'step', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agent-builder/:actionId/resume': {
    method: 'POST',
    path: '/agent-builder/:actionId/resume',
    pathParams: ['actionId'],
    queryParams: ['runId'],
    bodyParams: ['forEachIndex', 'perStep', 'requestContext', 'resumeData', 'step', 'tracingOptions'],
    hasQuery: true,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /agent-builder/:actionId/runs/:runId/cancel': {
    method: 'POST',
    path: '/agent-builder/:actionId/runs/:runId/cancel',
    pathParams: ['actionId', 'runId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /schedules': {
    method: 'GET',
    path: '/schedules',
    pathParams: [],
    queryParams: ['ownerId', 'ownerType', 'status', 'workflowId'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'schedules',
    },
  },
  'GET /schedules/:scheduleId': {
    method: 'GET',
    path: '/schedules/:scheduleId',
    pathParams: ['scheduleId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /schedules/:scheduleId/triggers': {
    method: 'GET',
    path: '/schedules/:scheduleId/triggers',
    pathParams: ['scheduleId'],
    queryParams: ['fromActualFireAt', 'limit', 'toActualFireAt'],
    bodyParams: [],
    hasQuery: true,
    hasBody: false,
    responseShape: {
      kind: 'object-property',
      listProperty: 'triggers',
    },
  },
  'POST /schedules/:scheduleId/pause': {
    method: 'POST',
    path: '/schedules/:scheduleId/pause',
    pathParams: ['scheduleId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /schedules/:scheduleId/resume': {
    method: 'POST',
    path: '/schedules/:scheduleId/resume',
    pathParams: ['scheduleId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
  'GET /channels/platforms': {
    method: 'GET',
    path: '/channels/platforms',
    pathParams: [],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'array',
    },
  },
  'GET /channels/:platform/installations': {
    method: 'GET',
    path: '/channels/:platform/installations',
    pathParams: ['platform'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'array',
    },
  },
  'POST /channels/:platform/connect': {
    method: 'POST',
    path: '/channels/:platform/connect',
    pathParams: ['platform'],
    queryParams: [],
    bodyParams: ['agentId', 'options'],
    hasQuery: false,
    hasBody: true,
    responseShape: {
      kind: 'single',
    },
  },
  'POST /channels/:platform/:agentId/disconnect': {
    method: 'POST',
    path: '/channels/:platform/:agentId/disconnect',
    pathParams: ['platform', 'agentId'],
    queryParams: [],
    bodyParams: [],
    hasQuery: false,
    hasBody: false,
    responseShape: {
      kind: 'single',
    },
  },
};

// src/commands/api/schema.ts
async function getCommandSchema(descriptor, target) {
  if (!descriptor.acceptsInput) {
    throw new ApiCliError('SCHEMA_UNAVAILABLE', 'This command does not accept JSON input');
  }
  const manifest = await fetchSchemaManifest(target.baseUrl, target.headers, target.timeoutMs);
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.routes)) {
    throw new ApiCliError('SCHEMA_UNAVAILABLE', 'Target server returned an invalid schema manifest', {
      reason: 'invalid_manifest',
    });
  }
  const route = manifest.routes.find(
    candidate => candidate.method === descriptor.method && candidate.path === descriptor.path,
  );
  if (!route) {
    throw new ApiCliError('SCHEMA_UNAVAILABLE', 'Target server did not expose a schema for this command', {
      method: descriptor.method,
      path: descriptor.path,
    });
  }
  const source = descriptor.method === 'GET' ? 'query' : route.queryParamSchema ? 'query+body' : 'body';
  const inputSchema =
    descriptor.method === 'GET' ? route.queryParamSchema : mergeObjectSchemas(route.queryParamSchema, route.bodySchema);
  return {
    command: buildCommandUsage(descriptor),
    description: descriptor.description,
    method: descriptor.method,
    path: descriptor.path,
    positionals: buildPositionals(descriptor, route.pathParamSchema),
    examples: buildCommandExamples(descriptor),
    input: {
      required: descriptor.inputRequired,
      source,
      schema: inputSchema,
    },
    schemas: {
      pathParams: route.pathParamSchema,
      query: route.queryParamSchema,
      body: route.bodySchema,
    },
    response: {
      list: descriptor.list,
      shape: descriptor.responseShape,
      schema: route.responseSchema,
    },
  };
}
function buildCommandUsage(descriptor) {
  const positionals = descriptor.positionals.map(name => `<${name}>`).join(' ');
  const input = descriptor.acceptsInput ? (descriptor.inputRequired ? '<input>' : '[input]') : '';
  return ['mastra api', descriptor.name, positionals, input].filter(Boolean).join(' ');
}
function mergeObjectSchemas(querySchema, bodySchema) {
  if (!querySchema) return bodySchema;
  if (!bodySchema) return querySchema;
  return {
    type: 'object',
    properties: {
      ...(querySchema.properties ?? {}),
      ...(bodySchema.properties ?? {}),
    },
    required: [.../* @__PURE__ */ new Set([...(querySchema.required ?? []), ...(bodySchema.required ?? [])])],
    additionalProperties: bodySchema.additionalProperties ?? querySchema.additionalProperties,
  };
}
function buildPositionals(descriptor, pathParamSchema) {
  const properties = pathParamSchema?.properties ?? {};
  const required = new Set(Array.isArray(pathParamSchema?.required) ? pathParamSchema.required : []);
  return descriptor.positionals.map(name => ({
    name,
    required: required.has(name) || descriptor.path.includes(`:${name}`),
    description: properties[name]?.description,
    schema: properties[name],
  }));
}
function buildCommandExamples(descriptor) {
  if (descriptor.examples && descriptor.examples.length > 0) {
    return descriptor.examples;
  }
  return buildGenericExamples(descriptor, `mastra api ${descriptor.name}`);
}
function buildGenericExamples(descriptor, command) {
  if (descriptor.list) {
    return [
      {
        description: descriptor.description,
        command: descriptor.acceptsInput ? `${command} '{"page":0,"perPage":50}'` : command,
      },
    ];
  }
  if (!descriptor.acceptsInput) {
    return [{ description: descriptor.description, command: [command, ...samplePositionals(descriptor)].join(' ') }];
  }
  const sampleInput =
    descriptor.method === 'GET' && descriptor.inputRequired ? sampleInputWithPathParams(descriptor) : '{}';
  return [{ description: descriptor.description, command: `${command} '${sampleInput}'` }];
}
function samplePositionals(descriptor) {
  return descriptor.positionals.map(name => `${name}_123`);
}
function sampleInputWithPathParams(descriptor) {
  const pathParams = [...descriptor.path.matchAll(/:([A-Za-z0-9_]+)/g)].flatMap(match => (match[1] ? [match[1]] : []));
  const inputOnlyParams = pathParams.filter(param => !descriptor.positionals.includes(param));
  if (inputOnlyParams.length === 0) return '{}';
  return JSON.stringify(Object.fromEntries(inputOnlyParams.map(param => [param, `${param}_123`])));
}

// src/commands/server/platform-api.ts
async function fetchServerProjects(token, orgId) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.GET('/v1/server/projects');
  if (error) {
    throwApiError('Failed to fetch server projects', response.status);
  }
  return data.projects;
}
async function createServerProject(token, orgId, name) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.POST('/v1/server/projects', {
    body: { name },
  });
  if (error) {
    throwApiError(`Failed to create server project \u2014 ${error.detail ?? 'unknown error'}`, response.status);
  }
  return data.project;
}
async function fetchServerDeployDiagnosis(deployId, token, orgId) {
  const resp = await platformFetch(`${MASTRA_PLATFORM_API_URL}/v1/server/deploys/${deployId}/diagnosis`, {
    headers: authHeaders(token, orgId),
  });
  if (resp.status === 204) {
    return { state: 'healthy' };
  }
  if (!resp.ok) {
    let detail;
    try {
      const error = await resp.json();
      detail = error.detail;
    } catch {
      detail = void 0;
    }
    throwApiError('Failed to fetch server deploy diagnosis', resp.status, detail);
  }
  const data = await resp.json();
  if (!data.diagnosis) {
    return { state: 'missing' };
  }
  return { state: 'ready', diagnosis: data.diagnosis };
}
async function startServerDeployDiagnosis(deployId, token, orgId) {
  const resp = await platformFetch(`${MASTRA_PLATFORM_API_URL}/v1/server/deploys/${deployId}/diagnosis`, {
    method: 'POST',
    headers: authHeaders(token, orgId),
  });
  if (resp.status === 201 || resp.status === 304) {
    return;
  }
  let detail;
  try {
    const error = await resp.json();
    detail = error.detail;
  } catch {
    detail = void 0;
  }
  throwApiError('Failed to start server deploy diagnosis', resp.status, detail);
}
async function uploadServerDeploy(token, orgId, projectId, zipBuffer, meta) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.POST('/v1/server/deploys', {
    body: {
      projectId,
      projectName: meta?.projectName,
      envVars: meta?.envVars,
      ...(meta?.disablePlatformObservability !== void 0
        ? { disablePlatformObservability: meta.disablePlatformObservability }
        : {}),
    },
  });
  if (error) {
    throwApiError('Deploy failed', response.status, extractApiErrorDetail(error));
  }
  const { id, status, uploadUrl } = data;
  if (!uploadUrl) {
    throw new Error('No upload URL returned');
  }
  const cancel4 = c =>
    bestEffortCancel({
      postCancel: c2 => c2.POST('/v1/server/deploys/{id}/cancel', { params: { path: { id } } }),
      client: c,
      deployId: id,
    });
  try {
    if (uploadUrl.startsWith('file://')) {
      const { writeFile: writeFile6 } = await import('fs/promises');
      const { fileURLToPath: fileURLToPath4 } = await import('url');
      await writeFile6(fileURLToPath4(uploadUrl), Buffer.from(zipBuffer));
    } else {
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/zip' },
        body: new Uint8Array(zipBuffer),
      });
      if (!uploadResp.ok) {
        throw new Error(`Artifact upload failed: ${uploadResp.status} ${uploadResp.statusText}`);
      }
    }
  } catch (uploadError) {
    await cancel4(client);
    throw uploadError;
  }
  await confirmUploadWithRetry({
    postUploadComplete: c => c.POST('/v1/server/deploys/{id}/upload-complete', { params: { path: { id } } }),
    cancelDeploy: cancel4,
    client,
    orgId,
  });
  return { id, status };
}
async function pollServerDeploy(deployId, token, orgId, maxWaitMs = 6e5) {
  const start2 = Date.now();
  let lastStatus = '';
  let currentToken = token;
  let client = createApiClient(currentToken, orgId);
  const logAbort = new AbortController();
  pollServerLogs(deployId, currentToken, orgId, logAbort.signal).catch(() => {});
  try {
    while (Date.now() - start2 < maxWaitMs) {
      const result = await withPollingRetries(() =>
        client.GET('/v1/server/deploys/{id}', {
          params: { path: { id: deployId } },
        }),
      );
      const { data, error, response } = result;
      if (error) {
        if (response.status === 401) {
          currentToken = await getToken();
          client = createApiClient(currentToken, orgId);
          continue;
        }
        throwApiError('Poll failed', response.status);
      }
      if (data.status !== lastStatus) {
        lastStatus = data.status;
      }
      const terminal = ['running', 'failed', 'crashed', 'cancelled', 'stopped'];
      if (terminal.includes(data.status)) {
        return data;
      }
      await new Promise(r => setTimeout(r, 5e3));
    }
    throw new Error('Deploy timed out');
  } finally {
    logAbort.abort();
  }
}
async function getServerProjectEnv(token, orgId, projectId) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.GET('/v1/server/projects/{id}/env', {
    params: { path: { id: projectId } },
  });
  if (error) {
    throwApiError('Failed to fetch environment variables', response.status);
  }
  return data.envVars;
}
async function updateServerProjectEnv(token, orgId, projectId, envVars) {
  const client = createApiClient(token, orgId);
  const { error, response } = await client.PUT('/v1/server/projects/{id}/env', {
    params: { path: { id: projectId } },
    body: { envVars },
  });
  if (error) {
    throwApiError('Failed to update environment variables', response.status);
  }
}
async function fetchServerProjectDetail(token, orgId, projectId) {
  const client = createApiClient(token, orgId);
  const { data, error, response } = await client.GET('/v1/server/projects/{id}', {
    params: { path: { id: projectId } },
  });
  if (error) {
    throwApiError('Failed to fetch server project', response.status);
  }
  return data;
}
async function pauseServerProject(token, orgId, projectId) {
  const client = createApiClient(token, orgId);
  const { error, response } = await client.POST('/v1/server/projects/{id}/pause', {
    params: { path: { id: projectId } },
  });
  if (error) {
    if (response.status === 409) {
      const detail2 = extractApiErrorDetail(error);
      throwApiError('Failed to pause server', response.status, detail2 ?? 'Pause failed: the server is not running.');
    }
    const detail = extractApiErrorDetail(error);
    throwApiError('Failed to pause server', response.status, detail);
  }
}
async function restartServerProject(token, orgId, projectId) {
  const client = createApiClient(token, orgId);
  const before = await fetchServerProjectDetail(token, orgId, projectId);
  const previousLatestDeployId = before.project.latestDeployId;
  const { data, error, response } = await client.POST('/v1/server/projects/{id}/restart', {
    params: { path: { id: projectId } },
  });
  if (error) {
    const detail = extractApiErrorDetail(error);
    if (response.status === 409) {
      throwApiError(
        'Failed to restart server',
        response.status,
        detail ??
          'Restart failed: a deployment for this project is currently active. Run `mastra server pause` to pause the server before restarting.',
      );
    }
    throwApiError('Failed to restart server', response.status, detail);
  }
  if (data?.id) {
    return data.id;
  }
  const deployIndicatesAcceptedRestart = status =>
    Boolean(status && !['failed', 'crashed', 'cancelled', 'stopped'].includes(status));
  let currentToken = token;
  let pollClient = createApiClient(currentToken, orgId);
  const deadline = Date.now() + 45e3;
  while (Date.now() < deadline) {
    const {
      data: snap,
      error: snapError,
      response: snapResponse,
    } = await pollClient.GET('/v1/server/projects/{id}', { params: { path: { id: projectId } } });
    if (snapError) {
      if (snapResponse.status === 401) {
        currentToken = await getToken();
        pollClient = createApiClient(currentToken, orgId);
        continue;
      }
      throwApiError('Failed to fetch server project', snapResponse.status, extractApiErrorDetail(snapError));
    }
    const latest = snap.project.latestDeployId;
    if (latest && latest !== previousLatestDeployId) {
      return latest;
    }
    if (latest) {
      const {
        data: st,
        error: statusError,
        response: statusResponse,
      } = await pollClient.GET('/v1/server/deploys/{id}', { params: { path: { id: latest } } });
      if (statusError) {
        if (statusResponse.status === 401) {
          currentToken = await getToken();
          pollClient = createApiClient(currentToken, orgId);
          continue;
        }
        if (statusResponse.status !== 404) {
          throwApiError(
            'Failed to fetch server deploy status',
            statusResponse.status,
            extractApiErrorDetail(statusError),
          );
        }
      } else if (deployIndicatesAcceptedRestart(st?.status)) {
        return latest;
      }
    }
    await new Promise(r => setTimeout(r, 2e3));
  }
  throw new Error(
    'Restart was accepted but no deploy ID could be resolved. Check the Mastra platform for deployment status.',
  );
}
async function pollServerLogs(deployId, token, orgId, signal) {
  await new Promise(r => setTimeout(r, 3e3));
  let printedBuild = 0;
  let printedDeploy = 0;
  let currentToken = token;
  let client = createApiClient(currentToken, orgId);
  while (!signal.aborted) {
    try {
      const { data, response } = await client.GET('/v1/server/deploys/{id}/logs', {
        params: { path: { id: deployId } },
      });
      if (response.status === 401) {
        currentToken = await getToken();
        client = createApiClient(currentToken, orgId);
        continue;
      }
      if (data) {
        const newBuild = data.buildLogs.slice(printedBuild);
        for (const line of newBuild) {
          await writeBarLine(line);
        }
        printedBuild = data.buildLogs.length;
        const newDeploy = data.deployLogs.slice(printedDeploy);
        for (const line of newDeploy) {
          await writeBarLine(line);
        }
        printedDeploy = data.deployLogs.length;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 5e3));
  }
}

// src/commands/api/headers.ts
function parseHeaders(values) {
  const headers = {};
  for (const value of values) {
    const separatorIndex = value.indexOf(':');
    if (separatorIndex <= 0) {
      throw new ApiCliError('MALFORMED_HEADER', 'Header must use "Key: Value" format', { header: value });
    }
    const key = value.slice(0, separatorIndex).trim();
    const headerValue = value.slice(separatorIndex + 1).trim();
    if (!key || !headerValue) {
      throw new ApiCliError('MALFORMED_HEADER', 'Header must use "Key: Value" format', { header: value });
    }
    headers[key] = headerValue;
  }
  return headers;
}

// src/commands/api/target.ts
var LOCAL_URL = 'http://localhost:4111';
var OBSERVABILITY_URL = 'https://observability.mastra.ai';
var AUTHORIZATION_HEADER = 'Authorization';
var PROJECT_ID_HEADER = 'X-Mastra-Project-Id';
async function resolveTarget(options, fetchFn = fetch, path3) {
  const timeoutMs = parseTimeout(options.timeout);
  const customHeaders = parseHeaders(options.header);
  if (isObservabilityPath(path3)) {
    return resolveObservabilityTarget(options, customHeaders, timeoutMs);
  }
  if (options.url) {
    return { baseUrl: options.url, headers: customHeaders, timeoutMs };
  }
  if (await canReachLocal(timeoutMs, fetchFn)) {
    return { baseUrl: LOCAL_URL, headers: customHeaders, timeoutMs };
  }
  const config6 = await loadProjectConfig(process.cwd());
  if (!config6) {
    throw new ApiCliError('SERVER_UNREACHABLE', 'Could not connect to target server');
  }
  try {
    const token = await getToken();
    const projects = await fetchServerProjects(token, config6.organizationId);
    const project = projects.find(
      candidate => candidate.id === config6.projectId || candidate.slug === config6.projectSlug,
    );
    const baseUrl = project?.instanceUrl;
    if (!baseUrl) {
      throw new ApiCliError('PLATFORM_RESOLUTION_FAILED', 'Could not resolve platform deployment URL', {
        projectId: config6.projectId,
        projectSlug: config6.projectSlug,
      });
    }
    return {
      baseUrl,
      headers: { Authorization: `Bearer ${token}`, ...customHeaders },
      timeoutMs,
    };
  } catch (error) {
    if (error instanceof ApiCliError) throw error;
    throw new ApiCliError('PLATFORM_RESOLUTION_FAILED', 'Could not resolve platform deployment URL', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
async function resolveObservabilityTarget(options, customHeaders, timeoutMs) {
  const env = loadDotenv(process.cwd());
  const explicitAuthorization = getHeader(customHeaders, AUTHORIZATION_HEADER);
  const explicitProjectId = getHeader(customHeaders, PROJECT_ID_HEADER);
  const envToken = process.env.MASTRA_PLATFORM_ACCESS_TOKEN || env.MASTRA_PLATFORM_ACCESS_TOKEN;
  const cliToken = explicitAuthorization || options.url ? void 0 : await getOptionalToken();
  const envProjectId = process.env.MASTRA_PROJECT_ID || env.MASTRA_PROJECT_ID;
  const configProjectId =
    explicitProjectId || envProjectId || options.url ? void 0 : (await loadProjectConfig(process.cwd()))?.projectId;
  const projectId = explicitProjectId || envProjectId || configProjectId;
  const headers = { ...customHeaders };
  if (!explicitAuthorization && envToken) {
    headers[AUTHORIZATION_HEADER] = `Bearer ${envToken}`;
  } else if (!explicitAuthorization && cliToken) {
    headers[AUTHORIZATION_HEADER] = `Bearer ${cliToken}`;
  }
  if (!explicitProjectId && projectId) {
    headers[PROJECT_ID_HEADER] = projectId;
  }
  const fallbackHeaders =
    envToken && cliToken && envToken !== cliToken
      ? { ...headers, [AUTHORIZATION_HEADER]: `Bearer ${cliToken}` }
      : void 0;
  return {
    baseUrl: options.url ?? OBSERVABILITY_URL,
    headers,
    timeoutMs,
    fallbackHeaders,
  };
}
function isObservabilityPath(path3) {
  return path3?.startsWith('/observability/') || path3 === '/observability';
}
function loadDotenv(cwd) {
  const envPath = join(cwd, '.env');
  if (!existsSync(envPath)) return {};
  return parse(readFileSync(envPath));
}
async function getOptionalToken() {
  try {
    return await getToken();
  } catch {
    return void 0;
  }
}
function getHeader(headers, name) {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1];
}
function parseTimeout(timeout) {
  if (!timeout) return 3e4;
  const parsed = Number(timeout);
  if (!Number.isFinite(parsed) || parsed <= 0) return 3e4;
  return parsed;
}
async function canReachLocal(timeoutMs, fetchFn) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, 1e3));
  try {
    const response = await fetchFn(`${LOCAL_URL}/api/system/api-schema`, { method: 'GET', signal: controller.signal });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// src/commands/api/index.ts
var API_ANALYTICS_SHUTDOWN_TIMEOUT_MS = 1e3;
var API_COMMANDS = {};
function registerApiCommand(program2) {
  for (const key of Object.keys(API_COMMANDS)) {
    delete API_COMMANDS[key];
  }
  const api = program2
    .command('api')
    .description('Call Mastra APIs')
    .option('--url <url>', 'target Mastra server URL')
    .option('--header <header>', 'custom HTTP header (repeatable)', collect, [])
    .option('--timeout <ms>', 'client-side request timeout')
    .option('--pretty', 'pretty-print JSON output', false);
  const agent = api.command('agent').description('List, inspect, and run agents');
  addAction(agent, 'list', 'GET /agents', { description: 'List available agents', list: true });
  addAction(agent, 'get', 'GET /agents/:agentId', { description: 'Get agent details' });
  addAction(agent, 'run', 'POST /agents/:agentId/generate', {
    description: 'Run an agent with JSON input',
    input: 'required',
    examples: [
      {
        description: 'Run an agent with a text prompt',
        command: `mastra api agent run weather-agent '{"messages":"What is the weather in London?"}'`,
      },
      {
        description: 'Run an agent and persist messages to a thread',
        command: `mastra api agent run weather-agent '{"messages":"What is the weather in London?","memory":{"thread":"thread_abc123","resource":"user_123"}}'`,
      },
    ],
  });
  const workflow = api.command('workflow').description('List, inspect, and run workflows');
  addAction(workflow, 'list', 'GET /workflows', { description: 'List available workflows', list: true });
  addAction(workflow, 'get', 'GET /workflows/:workflowId', { description: 'Get workflow details' });
  const workflowRun = workflow.command('run').description('Manage workflow runs');
  addAction(workflowRun, 'start', 'POST /workflows/:workflowId/start-async', {
    description: 'Start a workflow run',
    input: 'required',
    defaultTimeoutMs: 12e4,
    examples: [
      {
        description: 'Start a workflow run',
        command: `mastra api workflow run start data-pipeline '{"inputData":{"source":"s3://bucket/data.csv"}}'`,
      },
    ],
  });
  addAction(workflowRun, 'list', 'GET /workflows/:workflowId/runs', {
    description: 'List workflow runs',
    input: 'optional',
    list: true,
  });
  addAction(workflowRun, 'get', 'GET /workflows/:workflowId/runs/:runId', {
    description: 'Get workflow run details',
  });
  addAction(workflowRun, 'resume', 'POST /workflows/:workflowId/resume-async', {
    description: 'Resume a suspended workflow run',
    input: 'required',
    positionals: ['workflowId', 'runId'],
    defaultTimeoutMs: 12e4,
    examples: [
      {
        description: 'Resume a suspended workflow run. The run must currently be suspended.',
        command: `mastra api workflow run resume data-pipeline run_123 '{"resumeData":{"approved":true}}'`,
      },
    ],
  });
  addAction(workflowRun, 'cancel', 'POST /workflows/:workflowId/runs/:runId/cancel', {
    description: 'Cancel a workflow run',
  });
  const tool = api.command('tool').description('List, inspect, and execute tools');
  addAction(tool, 'list', 'GET /tools', { description: 'List available tools', list: true });
  addAction(tool, 'get', 'GET /tools/:toolId', { description: 'Get tool details and input schema' });
  addAction(tool, 'execute', 'POST /tools/:toolId/execute', {
    description: 'Execute a tool with JSON input',
    input: 'required',
    examples: [
      {
        description: 'Execute a tool with raw tool input. The CLI sends this as the route data field.',
        command: `mastra api tool execute get-weather '{"location":"San Francisco"}'`,
      },
      {
        description: 'Execute a tool with an explicit data wrapper',
        command: `mastra api tool execute get-weather '{"data":{"location":"San Francisco"}}'`,
      },
    ],
  });
  const mcp = api.command('mcp').description('List and inspect MCP servers');
  addAction(mcp, 'list', 'GET /mcp/v0/servers', { description: 'List MCP servers', list: true });
  addAction(mcp, 'get', 'GET /mcp/v0/servers/:id', { description: 'Get MCP server details' });
  const mcpTool = mcp.command('tool').description('List, inspect, and execute MCP tools');
  addAction(mcpTool, 'list', 'GET /mcp/:serverId/tools', {
    description: 'List tools for an MCP server',
    input: 'optional',
    list: true,
  });
  addAction(mcpTool, 'get', 'GET /mcp/:serverId/tools/:toolId', {
    description: 'Get MCP tool details',
  });
  addAction(mcpTool, 'execute', 'POST /mcp/:serverId/tools/:toolId/execute', {
    description: 'Execute an MCP tool with JSON input',
    input: 'required',
    examples: [
      {
        description: 'Execute an MCP tool with raw tool input. The CLI sends this as the route data field.',
        command: `mastra api mcp tool execute my-server calculator '{"num1":2,"num2":3,"operation":"add"}'`,
      },
      {
        description: 'Execute an MCP tool with an explicit data wrapper',
        command: `mastra api mcp tool execute my-server calculator '{"data":{"num1":2,"num2":3,"operation":"add"}}'`,
      },
    ],
  });
  const thread = api.command('thread').description('Manage memory threads and messages');
  addAction(thread, 'list', 'GET /memory/threads', { description: 'List memory threads', list: true });
  addAction(thread, 'get', 'GET /memory/threads/:threadId', { description: 'Get thread details' });
  addAction(thread, 'create', 'POST /memory/threads', {
    description: 'Create a memory thread',
    input: 'required',
    examples: [
      {
        description: 'Create a memory thread',
        command: `mastra api thread create '{"agentId":"weather-agent","resourceId":"user_123","threadId":"thread_abc123","title":"Support conversation"}'`,
      },
    ],
  });
  addAction(thread, 'update', 'PATCH /memory/threads/:threadId', {
    description: 'Update a memory thread',
    input: 'required',
    examples: [
      {
        description: 'Update a memory thread',
        command: `mastra api thread update thread_abc123 '{"agentId":"weather-agent","title":"Updated title"}'`,
      },
    ],
  });
  addAction(thread, 'delete', 'DELETE /memory/threads/:threadId', {
    description: 'Delete a memory thread',
    input: 'required',
    examples: [
      {
        description: 'Delete a memory thread',
        command: `mastra api thread delete thread_abc123 '{"agentId":"weather-agent","resourceId":"user_123"}'`,
      },
    ],
  });
  addAction(thread, 'messages', 'GET /memory/threads/:threadId/messages', {
    description: 'List messages in a memory thread',
    input: 'optional',
    list: true,
  });
  const memory = api.command('memory').description('Search and manage agent memory');
  addAction(memory, 'search', 'GET /memory/search', {
    description: 'Search long-term memory',
    input: 'required',
    list: true,
    examples: [
      {
        description: 'Search long-term memory',
        command: `mastra api memory search '{"agentId":"weather-agent","resourceId":"user_123","searchQuery":"caching strategy","limit":10}'`,
      },
    ],
  });
  const current = memory.command('current').description('Read and update working memory');
  addAction(current, 'get', 'GET /memory/threads/:threadId/working-memory', {
    description: 'Get current working memory',
    input: 'required',
    pathParamsFromInput: ['threadId'],
    examples: [
      {
        description: 'Read current working memory',
        command: `mastra api memory current get '{"threadId":"thread_abc123","agentId":"code-reviewer"}'`,
      },
    ],
  });
  addAction(current, 'update', 'POST /memory/threads/:threadId/working-memory', {
    description: 'Update current working memory',
    input: 'required',
    pathParamsFromInput: ['threadId'],
    examples: [
      {
        description: 'Update current working memory. Requires working memory to be enabled for the memory instance.',
        command: `mastra api memory current update '{"threadId":"thread_abc123","agentId":"code-reviewer","workingMemory":"Remember the user prefers concise responses."}'`,
      },
    ],
  });
  addAction(memory, 'status', 'GET /memory/status', {
    description: 'Get memory system status',
    input: 'required',
    examples: [
      {
        description: 'Get memory status for an agent',
        command: `mastra api memory status '{"agentId":"weather-agent"}'`,
      },
      {
        description: 'Get memory status for an agent, resource, and thread',
        command: `mastra api memory status '{"agentId":"weather-agent","resourceId":"user_123","threadId":"thread_abc123"}'`,
      },
    ],
  });
  const trace = api.command('trace').description('Inspect observability traces');
  addAction(trace, 'list', 'GET /observability/traces/light', {
    description: 'List observability traces',
    list: true,
    verboseRouteKey: 'GET /observability/traces',
    examples: [
      { description: 'List lightweight traces', command: `mastra api trace list '{"page":0,"perPage":20}'` },
      { description: 'List full traces', command: `mastra api trace list '{"page":0,"perPage":20}' --verbose` },
    ],
  });
  addAction(trace, 'get', 'GET /observability/traces/:traceId/light', {
    description: 'Get trace details',
    verboseRouteKey: 'GET /observability/traces/:traceId',
    examples: [
      { description: 'Get lightweight trace details', command: 'mastra api trace get trace_123' },
      { description: 'Get full trace details', command: 'mastra api trace get trace_123 --verbose' },
    ],
  });
  addAction(trace, 'span', 'GET /observability/traces/:traceId/spans/:spanId', {
    description: 'Get a trace span',
    examples: [{ description: 'Get a specific trace span', command: 'mastra api trace span trace_123 span_456' }],
  });
  const log14 = api.command('log').description('Inspect runtime logs');
  addAction(log14, 'list', 'GET /observability/logs', {
    description: 'List runtime logs',
    input: 'optional',
    list: true,
    examples: [
      { description: 'List recent logs', command: 'mastra api log list' },
      {
        description: 'List info logs with pagination',
        command: `mastra api log list '{"level":"info","page":0,"perPage":50}'`,
      },
    ],
  });
  const metric = api.command('metric').description('Query observability metrics');
  addAction(metric, 'aggregate', 'POST /observability/metrics/aggregate', {
    description: 'Get an aggregate metric value',
    input: 'required',
    examples: [
      {
        description: 'Get an average latency metric',
        command: `mastra api metric aggregate '{"name":"latency_ms","aggregation":"avg"}'`,
      },
    ],
  });
  addAction(metric, 'breakdown', 'POST /observability/metrics/breakdown', {
    description: 'Get metric values grouped by a label or field',
    input: 'required',
    list: true,
    examples: [
      {
        description: 'Break down latency by model',
        command: `mastra api metric breakdown '{"name":"latency_ms","aggregation":"avg","groupBy":"model","limit":10}'`,
      },
    ],
  });
  addAction(metric, 'timeseries', 'POST /observability/metrics/timeseries', {
    description: 'Get metric values over time',
    input: 'required',
    list: true,
    examples: [
      {
        description: 'Get hourly average latency',
        command: `mastra api metric timeseries '{"name":"latency_ms","aggregation":"avg","interval":"1h"}'`,
      },
    ],
  });
  addAction(metric, 'percentiles', 'POST /observability/metrics/percentiles', {
    description: 'Get metric percentile values over time',
    input: 'required',
    list: true,
    examples: [
      {
        description: 'Get latency percentiles',
        command: `mastra api metric percentiles '{"name":"latency_ms","percentiles":[0.5,0.95,0.99],"interval":"1h"}'`,
      },
    ],
  });
  addAction(metric, 'names', 'GET /observability/discovery/metric-names', {
    description: 'List discovered metric names',
    input: 'optional',
    list: true,
    examples: [
      { description: 'Search metric names', command: `mastra api metric names '{"prefix":"lat","limit":10}'` },
    ],
  });
  addAction(metric, 'label-keys', 'GET /observability/discovery/metric-label-keys', {
    description: 'List label keys for a metric',
    input: 'required',
    list: true,
    examples: [
      {
        description: 'List label keys for a metric',
        command: `mastra api metric label-keys '{"metricName":"latency_ms"}'`,
      },
    ],
  });
  addAction(metric, 'label-values', 'GET /observability/discovery/metric-label-values', {
    description: 'List label values for a metric label key',
    input: 'required',
    list: true,
    examples: [
      {
        description: 'Search label values for a metric label key',
        command: `mastra api metric label-values '{"metricName":"latency_ms","labelKey":"model","prefix":"g","limit":10}'`,
      },
    ],
  });
  const score = api.command('score').description('Create, list, and inspect scores');
  addAction(score, 'create', 'POST /observability/scores', {
    description: 'Create a score',
    input: 'required',
    examples: [
      {
        description: 'Create an observability score',
        command: `mastra api score create '{"score":{"scoreId":"score_123","scorerId":"quality","score":0.95,"runId":"run_123","entityType":"agent","entityId":"weather-agent"}}'`,
      },
    ],
  });
  addAction(score, 'list', 'GET /observability/scores', {
    description: 'List scores',
    input: 'optional',
    list: true,
    examples: [
      {
        description: 'List observability scores with pagination',
        command: `mastra api score list '{"page":0,"perPage":50}'`,
      },
      {
        description: 'List observability scores for a run',
        command: `mastra api score list '{"runId":"run_123","page":0,"perPage":50}'`,
      },
    ],
  });
  addAction(score, 'get', 'GET /observability/scores/:scoreId', {
    description: 'Get score details',
    examples: [{ description: 'Get an observability score by ID', command: 'mastra api score get score_123' }],
  });
  const dataset = api.command('dataset').description('Create, list, and inspect datasets');
  addAction(dataset, 'list', 'GET /datasets', { description: 'List datasets', list: true });
  addAction(dataset, 'get', 'GET /datasets/:datasetId', { description: 'Get dataset details' });
  addAction(dataset, 'create', 'POST /datasets', {
    description: 'Create a dataset',
    input: 'required',
    examples: [{ description: 'Create a dataset', command: `mastra api dataset create '{"name":"weather-eval"}'` }],
  });
  addAction(dataset, 'items', 'GET /datasets/:datasetId/items', {
    description: 'List dataset items',
    input: 'optional',
    list: true,
  });
  const experiment = api.command('experiment').description('Run and inspect dataset experiments');
  addAction(experiment, 'list', 'GET /datasets/:datasetId/experiments', {
    description: 'List dataset experiments',
    input: 'optional',
    list: true,
  });
  addAction(experiment, 'get', 'GET /datasets/:datasetId/experiments/:experimentId', {
    description: 'Get experiment details',
  });
  addAction(experiment, 'run', 'POST /datasets/:datasetId/experiments', {
    description: 'Run a dataset experiment',
    input: 'required',
    examples: [
      {
        description: 'Run a dataset experiment',
        command: `mastra api experiment run dataset_123 '{"name":"baseline"}'`,
      },
    ],
  });
  addAction(experiment, 'results', 'GET /datasets/:datasetId/experiments/:experimentId/results', {
    description: 'List experiment results',
    input: 'optional',
    list: true,
  });
}
function addAction(parent, name, routeKey, options) {
  const descriptor = buildDescriptor(parent, name, routeKey, options);
  API_COMMANDS[descriptor.key] = descriptor;
  const command = parent.command(name).description(descriptor.description);
  for (const positional of descriptor.positionals) {
    command.argument(`[${positional}]`);
  }
  if (descriptor.acceptsInput) {
    command.argument('[input]');
  }
  const examples = buildCommandExamples(descriptor);
  if (examples.length > 0) {
    command.addHelpText(
      'after',
      `
Examples:
${examples.map(example => `  ${example.command}`).join('\n')}`,
    );
  }
  if (descriptor.acceptsInput) {
    command.option('--schema', 'print request schema for this command');
  }
  if (descriptor.verbose) {
    command.option('--verbose', 'return the full response instead of the lightweight default');
  }
  command.action(async (...args) => {
    const command2 = args.at(-1);
    const { identityValues, maybeInput } = splitActionArgs(descriptor, args.slice(0, -1));
    const analytics2 = getAnalytics();
    const startedAt = process.hrtime();
    try {
      await executeDescriptor(descriptor, identityValues, maybeInput, command2.optsWithGlobals());
      const [seconds, nanoseconds] = process.hrtime(startedAt);
      analytics2?.trackCommand({
        command: `api-${descriptor.name}`,
        args: {
          positionalCount: identityValues.length,
          positionalPresent: identityValues.length > 0,
          hasInput: maybeInput !== void 0,
        },
        durationMs: seconds * 1e3 + nanoseconds / 1e6,
        status: process.exitCode ? 'error' : 'success',
      });
    } finally {
      await shutdownApiAnalytics(analytics2);
    }
  });
}
function splitActionArgs(descriptor, args) {
  const values = args.filter(value => typeof value === 'string');
  const possibleInput = descriptor.acceptsInput ? values.at(-1) : void 0;
  if (possibleInput && looksLikeJsonObject(possibleInput) && values.length <= descriptor.positionals.length) {
    return { identityValues: values.slice(0, -1), maybeInput: possibleInput };
  }
  return {
    identityValues: values.slice(0, descriptor.positionals.length),
    maybeInput: descriptor.acceptsInput ? values[descriptor.positionals.length] : void 0,
  };
}
function looksLikeJsonObject(value) {
  return value.trimStart().startsWith('{');
}
function buildDescriptor(parent, name, routeKey, options) {
  const route = API_ROUTE_METADATA[routeKey];
  const verboseRoute = options.verboseRouteKey ? API_ROUTE_METADATA[options.verboseRouteKey] : void 0;
  const commandName = [...commandPath(parent), parseCommandName(name)].join(' ');
  const pathParamsFromInput = new Set(options.pathParamsFromInput ?? []);
  const positionals = options.positionals ?? route.pathParams.filter(param => !pathParamsFromInput.has(param));
  const inputMode = options.input ?? (options.list ? 'optional' : route.hasBody ? 'optional' : 'none');
  return {
    key: commandName.replace(/ ([a-z])/g, (_, letter) => letter.toUpperCase()),
    name: commandName,
    description: options.description,
    method: route.method,
    path: route.path,
    positionals,
    acceptsInput: inputMode !== 'none',
    inputRequired: inputMode === 'required',
    list: options.list ?? false,
    responseShape: route.responseShape,
    queryParams: [...route.queryParams],
    bodyParams: [...route.bodyParams],
    defaultTimeoutMs: options.defaultTimeoutMs,
    examples: options.examples,
    verbose: verboseRoute
      ? {
          path: verboseRoute.path,
          responseShape: verboseRoute.responseShape,
          queryParams: [...verboseRoute.queryParams],
          bodyParams: [...verboseRoute.bodyParams],
        }
      : void 0,
  };
}
function commandPath(command) {
  const names = [];
  let current = command;
  while (current && current.name() !== 'api') {
    names.unshift(current.name());
    current = current.parent;
  }
  return names;
}
function parseCommandName(name) {
  return name.split(/\s+/)[0] ?? name;
}
function isUnauthorizedError(error) {
  return error instanceof ApiCliError && error.code === 'HTTP_ERROR' && error.details.status === 401;
}
function isNotFoundError(error) {
  return (
    error instanceof ApiCliError &&
    error.code === 'HTTP_ERROR' &&
    (error.details.status === 404 || error.details.status === 405)
  );
}
async function shutdownApiAnalytics(analytics2) {
  if (!analytics2) {
    return;
  }
  const exitTimer = setTimeout(() => {
    process.exit(process.exitCode ?? 0);
  }, API_ANALYTICS_SHUTDOWN_TIMEOUT_MS);
  try {
    await analytics2.shutdown();
  } finally {
    clearTimeout(exitTimer);
  }
}
async function executeDescriptor(descriptor, positionalValues, inputText, options) {
  try {
    const requestDescriptor =
      options.verbose && descriptor.verbose ? { ...descriptor, ...descriptor.verbose } : descriptor;
    const target = await resolveTarget(options, fetch, requestDescriptor.path);
    if (options.schema) {
      writeJson(await getCommandSchema(descriptor, target), options.pretty);
      return;
    }
    const input = parseInput(requestDescriptor, inputText);
    const pathParams = resolvePathParams(requestDescriptor, positionalValues, input);
    const requestInput = stripPathParamsFromInput(input, pathParams);
    const requestOptions = {
      baseUrl: target.baseUrl,
      headers: target.headers,
      timeoutMs:
        requestDescriptor.defaultTimeoutMs && !options.timeout ? requestDescriptor.defaultTimeoutMs : target.timeoutMs,
      descriptor: requestDescriptor,
      pathParams,
      input: requestInput,
    };
    let response;
    let effectiveDescriptor = requestDescriptor;
    try {
      response = await requestApi(requestOptions);
    } catch (error) {
      if (target.fallbackHeaders && isUnauthorizedError(error)) {
        response = await requestApi({ ...requestOptions, headers: target.fallbackHeaders });
      } else if (!options.verbose && descriptor.verbose && isNotFoundError(error)) {
        const verboseDescriptor = { ...descriptor, ...descriptor.verbose };
        const verboseInput = parseInput(verboseDescriptor, inputText);
        const verbosePathParams = resolvePathParams(verboseDescriptor, positionalValues, verboseInput);
        const verboseRequestInput = stripPathParamsFromInput(verboseInput, verbosePathParams);
        response = await requestApi({
          ...requestOptions,
          descriptor: verboseDescriptor,
          pathParams: verbosePathParams,
          input: verboseRequestInput,
        });
        effectiveDescriptor = verboseDescriptor;
      } else {
        throw error;
      }
    }
    const normalized = normalizeData(effectiveDescriptor, normalizeResponse(response));
    writeJson(
      normalizeSuccess(normalized, effectiveDescriptor.list, effectiveDescriptor.responseShape),
      options.pretty,
    );
  } catch (error) {
    const apiError = error instanceof ApiCliError ? error : toApiCliError(error);
    writeJson(errorEnvelope(apiError), options.pretty, process.stderr);
    process.exitCode = 1;
  }
}
function collect(value, previous) {
  return [...previous, value];
}

// src/commands/auth/login.ts
async function loginAction() {
  const existing = await loadCredentials();
  if (existing) {
    const stillValid = (await verifyToken(existing.token)) || Boolean(await tryRefreshToken(existing));
    if (stillValid) {
      console.info(`
Already logged in as ${existing.user.email}
`);
      return;
    }
  }
  await login();
}
async function logoutAction() {
  await clearCredentials();
  console.info('\nLogged out. Credentials removed.\n');
  if (process.env.MASTRA_API_TOKEN) {
    console.warn('   Note: MASTRA_API_TOKEN is still set in your environment.\n   Unset it to fully log out.\n');
  }
}

// src/commands/auth/tokens.ts
async function resolveOrgId() {
  return process.env.MASTRA_ORG_ID ?? (await getCurrentOrgId());
}
async function createToken(token, orgId, name) {
  const resp = await platformFetch(`${MASTRA_PLATFORM_API_URL}/v1/auth/tokens`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, orgId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  if (!resp.ok) {
    const text3 = await resp.text();
    throwApiError('Failed to create token', resp.status, text3);
  }
  const data = await resp.json();
  return { id: data.token.id, secret: data.secret };
}
async function createTokenAction(name) {
  const token = await getToken();
  const orgId = await resolveOrgId();
  if (!orgId) throw new Error('No organization selected. Run: mastra auth orgs switch');
  const result = await createToken(token, orgId, name);
  console.info('\nToken created successfully!\n');
  console.info(`  Name:    ${name}`);
  console.info(`  ID:      ${result.id}`);
  console.info('');
  console.info(`  Secret:  ${result.secret}`);
  console.info('');
  console.info('  Save this secret \u2014 it will not be shown again.');
  console.info('  Set it as MASTRA_API_TOKEN in your CI environment.\n');
}
async function listTokensAction() {
  const token = await getToken();
  const orgId = await resolveOrgId();
  if (!orgId) throw new Error('No organization selected. Run: mastra auth orgs switch');
  const resp = await platformFetch(`${MASTRA_PLATFORM_API_URL}/v1/auth/tokens`, {
    headers: authHeaders(token, orgId),
  });
  if (!resp.ok) {
    const text3 = await resp.text();
    throwApiError('Failed to list tokens', resp.status, text3);
  }
  const data = await resp.json();
  if (data.tokens.length === 0) {
    console.info('\nNo tokens found.\n');
    return;
  }
  console.info('\nTokens:\n');
  for (const t2 of data.tokens) {
    const lastUsed = t2.lastUsedAt ? new Date(t2.lastUsedAt).toLocaleDateString() : 'never';
    console.info(`  ${t2.name}`);
    console.info(`    ID: ${t2.id}  Key: ${t2.obfuscatedValue}  Last used: ${lastUsed}`);
  }
  console.info('');
}
async function revokeTokenAction(tokenId) {
  const token = await getToken();
  const orgId = await resolveOrgId();
  if (!orgId) throw new Error('No organization selected. Run: mastra auth orgs switch');
  const resp = await platformFetch(`${MASTRA_PLATFORM_API_URL}/v1/auth/tokens/${encodeURIComponent(tokenId)}`, {
    method: 'DELETE',
    headers: authHeaders(token, orgId),
  });
  if (!resp.ok) {
    const text3 = await resp.text();
    throwApiError('Failed to revoke token', resp.status, text3);
  }
  console.info(`
Token ${tokenId} revoked.
`);
}

// src/commands/auth/whoami.ts
async function whoamiAction() {
  const envToken = process.env.MASTRA_API_TOKEN;
  if (envToken) {
    const orgId2 = process.env.MASTRA_ORG_ID ?? (await getCurrentOrgId());
    console.info('\n  Authenticated via MASTRA_API_TOKEN');
    if (orgId2) {
      console.info(`   Org: ${orgId2}`);
    }
    console.info('');
    return;
  }
  const creds = await loadCredentials();
  if (!creds) {
    console.info('\nNot logged in. Run: mastra auth login\n');
    process.exit(1);
  }
  const orgId = await getCurrentOrgId();
  let orgName = null;
  try {
    const orgs = await fetchOrgs(creds.token);
    const match = orgs.find(o => o.id === orgId);
    if (match) orgName = match.name;
  } catch {}
  console.info(`
  ${creds.user.email}`);
  console.info(`   User ID: ${creds.user.id}`);
  if (orgName) {
    console.info(`   Org: ${orgName} (${orgId})`);
  } else if (orgId) {
    console.info(`   Org: ${orgId}`);
  }
  console.info('');
}
function getPackageName2(projectDir) {
  try {
    const raw = execSync(`node -p "require('./package.json').name"`, {
      cwd: projectDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return raw.startsWith('@') ? (raw.split('/')[1] ?? raw) : raw;
  } catch {
    return null;
  }
}
async function zipOutput2(projectDir) {
  const outputDir = join(projectDir, '.mastra', 'output');
  const tmpDir = join(tmpdir(), 'mastra-deploy');
  await mkdir(tmpDir, { recursive: true });
  const zipPath = join(tmpDir, `server-deploy-${Date.now()}.zip`);
  return new Promise((resolvePromise, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    output.on('close', () => resolvePromise(zipPath));
    archive.on('error', reject);
    archive.pipe(output);
    archive.glob('**', { cwd: outputDir, ignore: ['node_modules/**'] }, { prefix: '.mastra/output' });
    archive.file(join(projectDir, 'package.json'), { name: 'package.json' });
    void archive.finalize();
  });
}
function parseEnvFile2(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    let key = trimmed.slice(0, eqIdx).trim();
    if (key.startsWith('export ')) key = key.slice(7).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) vars[key] = value;
  }
  return vars;
}
function loadDeployEnvFromDotenv2(projectDir) {
  config({
    path: [join(projectDir, '.env'), join(projectDir, '.env.local'), join(projectDir, '.env.production')],
    quiet: true,
  });
}
async function getDeployEnvFiles2(projectDir) {
  const entries = await readdir(projectDir, { withFileTypes: true });
  return entries
    .filter(
      entry =>
        (entry.isFile() || entry.isSymbolicLink()) &&
        (entry.name === '.env' || entry.name.startsWith('.env.')) &&
        !entry.name.endsWith('.example'),
    )
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
async function readEnvVars2(projectDir, options = {}) {
  if (options.envFile) {
    const filePath = join(projectDir, options.envFile);
    try {
      await access(filePath);
    } catch {
      throw new Error(`Env file not found: ${options.envFile}`);
    }
    p5.log.step(`Using env file: ${options.envFile}`);
    return parseEnvFile2(await readFile(filePath, 'utf-8'));
  }
  const availableDeployEnvFiles = await getDeployEnvFiles2(projectDir);
  if (availableDeployEnvFiles.length === 0) {
    throw new Error('No env file found for deploy. Add a .env or .env.* file before deploying.');
  }
  let selectedEnvFile;
  if (availableDeployEnvFiles.length === 1) {
    selectedEnvFile = availableDeployEnvFiles[0];
  } else if (options.autoAccept) {
    throw new Error(
      `Multiple env files found: ${availableDeployEnvFiles.join(', ')}. Use --env-file to specify which one to deploy.`,
    );
  } else {
    const defaultFile =
      availableDeployEnvFiles.find(envFile => envFile === '.env.production') ?? availableDeployEnvFiles[0];
    const selected = await p5.select({
      message: 'Choose env file to deploy',
      options: availableDeployEnvFiles.map(envFile => ({ value: envFile, label: envFile })),
      initialValue: defaultFile,
    });
    if (p5.isCancel(selected)) {
      p5.cancel('Deploy cancelled.');
      process.exit(0);
    }
    selectedEnvFile = selected;
  }
  p5.log.step(`Using env file: ${selectedEnvFile}`);
  return parseEnvFile2(await readFile(join(projectDir, selectedEnvFile), 'utf-8'));
}
async function resolveOrg2(token, projectConfig, flagOrg) {
  const isHeadless = Boolean(process.env.MASTRA_API_TOKEN);
  const envOrgId = process.env.MASTRA_ORG_ID;
  if (envOrgId) {
    return { orgId: envOrgId, orgName: envOrgId };
  }
  if (flagOrg) {
    const orgs2 = await fetchOrgs(token);
    const match = orgs2.find(o => o.id === flagOrg);
    return { orgId: flagOrg, orgName: match?.name ?? flagOrg };
  }
  if (projectConfig?.organizationId) {
    if (isHeadless) {
      return { orgId: projectConfig.organizationId, orgName: projectConfig.organizationId };
    }
    const orgs2 = await fetchOrgs(token);
    const match = orgs2.find(o => o.id === projectConfig.organizationId);
    if (match) {
      return { orgId: match.id, orgName: match.name };
    }
  }
  const currentOrgId = await getCurrentOrgId();
  const orgs = await fetchOrgs(token);
  if (currentOrgId) {
    const match = orgs.find(o => o.id === currentOrgId);
    if (match) {
      return { orgId: match.id, orgName: match.name };
    }
  }
  if (orgs.length === 1) {
    return { orgId: orgs[0].id, orgName: orgs[0].name };
  }
  if (orgs.length === 0) {
    throw new Error(`No organizations found. Create one at ${MASTRA_STUDIO_URL}`);
  }
  const selected = await p5.select({
    message: 'Select an organization',
    options: orgs.map(o => ({ value: o.id, label: `${o.name} (${o.id})` })),
  });
  if (p5.isCancel(selected)) {
    p5.cancel('Deploy cancelled.');
    process.exit(0);
  }
  const selectedOrg = orgs.find(o => o.id === selected);
  return { orgId: selectedOrg.id, orgName: selectedOrg.name };
}
async function resolveProject2(token, orgId, projectConfig, flagProject, defaultName, autoAccept) {
  const envProjectId = process.env.MASTRA_PROJECT_ID;
  if (envProjectId) {
    return { projectId: envProjectId, projectName: envProjectId, projectSlug: envProjectId };
  }
  if (flagProject) {
    const projects = await fetchServerProjects(token, orgId);
    const byId = projects.find(proj => proj.id === flagProject);
    const bySlug = projects.find(proj => proj.slug === flagProject);
    const byName = projects.filter(proj => proj.name === flagProject);
    if (!byId && !bySlug && byName.length > 1) {
      p5.cancel(
        `Multiple projects are named "${flagProject}". Pass --project with the project id or slug to disambiguate.`,
      );
      process.exit(1);
    }
    const match = byId ?? bySlug ?? (byName.length === 1 ? byName[0] : void 0);
    if (match) {
      return { projectId: match.id, projectName: match.name, projectSlug: match.slug ?? match.name };
    }
    if (!autoAccept) {
      const confirmed = await p5.confirm({
        message: `No project named "${flagProject}" found. Create it?`,
      });
      if (p5.isCancel(confirmed) || !confirmed) {
        p5.cancel('Deploy cancelled.');
        process.exit(0);
      }
    }
    const created = await createServerProject(token, orgId, flagProject);
    p5.log.success(`Created project "${created.name}"`);
    return { projectId: created.id, projectName: created.name, projectSlug: created.slug ?? created.name };
  }
  if (projectConfig?.projectId && projectConfig.organizationId === orgId) {
    return {
      projectId: projectConfig.projectId,
      projectName: projectConfig.projectName ?? projectConfig.projectId,
      projectSlug: projectConfig.projectSlug ?? projectConfig.projectName ?? projectConfig.projectId,
    };
  }
  const name = defaultName;
  if (!name) {
    throw new Error('Could not determine project name from package.json. Use --project to specify one.');
  }
  const existing = await fetchServerProjects(token, orgId);
  const nameMatches = existing.filter(proj => proj.name === name || proj.slug === name);
  if (existing.length > 0) {
    if (autoAccept) {
      if (nameMatches.length === 1) {
        const m = nameMatches[0];
        return { projectId: m.id, projectName: m.name, projectSlug: m.slug ?? m.name };
      }
      throw new Error(
        `Found ${existing.length} existing project(s) in this organization. Pass --project <id-or-slug> to select one, or re-run without --yes to choose interactively.`,
      );
    }
    const CREATE_NEW = '__create_new__';
    const initialValue = nameMatches.length === 1 ? nameMatches[0].id : existing[0].id;
    const selected = await p5.select({
      message: 'Select a project to deploy to',
      initialValue,
      options: [
        ...existing.map(proj => ({ value: proj.id, label: `${proj.name} (${proj.id})` })),
        { value: CREATE_NEW, label: `\uFF0B Create new project "${name}"` },
      ],
    });
    if (p5.isCancel(selected)) {
      p5.cancel('Deploy cancelled.');
      process.exit(0);
    }
    if (selected !== CREATE_NEW) {
      const match = existing.find(proj => proj.id === selected);
      return { projectId: match.id, projectName: match.name, projectSlug: match.slug ?? match.name };
    }
  }
  const project = await createServerProject(token, orgId, name);
  return { projectId: project.id, projectName: project.name, projectSlug: project.slug ?? project.name };
}
async function serverDeployAction(dir, opts) {
  const targetDir = resolve(dir || process.cwd());
  loadDeployEnvFromDotenv2(targetDir);
  const isHeadless = Boolean(process.env.MASTRA_API_TOKEN);
  const autoAccept = opts.yes ?? isHeadless;
  const skipPreflight = opts.skipPreflight || process.env.MASTRA_SKIP_PREFLIGHT === '1';
  p5.intro('mastra server deploy');
  const packageName = getPackageName2(targetDir);
  let token;
  try {
    token = await getToken();
  } catch {
    p5.log.error(`Authentication failed. Run: mastra auth login`);
    process.exit(1);
  }
  const projectConfig = await loadProjectConfig(targetDir, opts.config);
  const hasOrg = Boolean(process.env.MASTRA_ORG_ID || opts.org || projectConfig?.organizationId);
  const hasProject = Boolean(process.env.MASTRA_PROJECT_ID || opts.project || projectConfig?.projectId);
  if (isHeadless && (!hasOrg || !hasProject)) {
    throw new Error(
      'MASTRA_ORG_ID and MASTRA_PROJECT_ID (or --org/--project flags, or .mastra-project.json) are required when MASTRA_API_TOKEN is set',
    );
  }
  const { orgId, orgName } = await resolveOrg2(token, projectConfig, opts.org);
  const { projectId, projectName, projectSlug } = await resolveProject2(
    token,
    orgId,
    projectConfig,
    opts.project,
    packageName,
    autoAccept,
  );
  const isAlreadyLinked = projectConfig?.projectId === projectId && projectConfig?.organizationId === orgId;
  if (!isAlreadyLinked) {
    p5.note(
      [`Organization:  ${orgName}`, `Project:       ${projectName}`, `Directory:     ${targetDir}`].join('\n'),
      'Deploy settings',
    );
    if (!autoAccept) {
      const confirmed = await p5.confirm({
        message: 'Deploy with these settings?',
      });
      if (p5.isCancel(confirmed) || !confirmed) {
        p5.cancel('Deploy cancelled.');
        process.exit(0);
      }
    }
    await saveProjectConfig(
      targetDir,
      getProjectConfigToSave(projectId, projectName, projectSlug, orgId, projectConfig),
      opts.config,
    );
    p5.log.success(`Saved ${opts.config || '.mastra-project.json'}`);
  } else {
    p5.log.info(`Organization: ${orgName} (${orgId})`);
    p5.log.info(`Project: ${projectName} (${projectId})`);
  }
  const s = p5.spinner();
  const mastraDir = join(targetDir, 'src', 'mastra');
  const outputDirectory = join(targetDir, '.mastra');
  const staleness = await checkBuildStaleness(targetDir, mastraDir, outputDirectory);
  if (opts.skipBuild) {
    if (staleness.isStale && staleness.reason !== 'no-build') {
      if (staleness.reason === 'hash-mismatch') {
        p5.log.warn('Source files have changed since last build. Deploy may not reflect latest changes.');
      } else if (staleness.reason === 'no-manifest') {
        p5.log.warn('No build manifest found. Cannot verify if build is up-to-date.');
      }
    }
    p5.log.step('Skipping build (--skip-build)');
  } else if (staleness.isStale) {
    if (staleness.reason === 'hash-mismatch') {
      p5.log.step('Source files changed, rebuilding...');
    }
    await runBuild(targetDir, { debug: opts.debug });
  } else {
    p5.log.step('Build is up-to-date, skipping rebuild');
  }
  const outputEntry = join(targetDir, '.mastra', 'output', 'index.mjs');
  try {
    await access(outputEntry);
  } catch {
    throw new Error('.mastra/output/index.mjs not found \u2014 did the build succeed?');
  }
  const envVars = await readEnvVars2(targetDir, { autoAccept, envFile: opts.envFile });
  const envCount = Object.keys(envVars).length;
  if (envCount > 0) {
    p5.log.step(`Found ${envCount} env var(s)`);
  } else {
    p5.log.step('No env vars found in selected env file');
  }
  if (!skipPreflight) {
    const issues = await preflightBuildOutput(targetDir, envVars);
    const outcome = await printPreflightIssues(issues, { autoAccept });
    if (outcome === 'blocked') {
      p5.cancel('Deploy blocked by preflight errors.');
      process.exit(1);
    }
    if (outcome === 'cancelled') {
      p5.cancel('Deploy cancelled.');
      process.exit(0);
    }
  }
  s.start('Zipping build artifact...');
  const zipPath = await zipOutput2(targetDir);
  const zipStat = await stat(zipPath);
  const sizeKB = zipStat.size / 1024;
  const sizeLabel = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB.toFixed(1)}KB`;
  s.stop(`Created ${sizeLabel} archive`);
  s.start('Uploading...');
  const zipBuffer = await readFile(zipPath);
  const deployResult = await uploadServerDeploy(token, orgId, projectId, zipBuffer, {
    projectName,
    envVars: envCount > 0 ? envVars : void 0,
    disablePlatformObservability: projectConfig?.disablePlatformObservability === true,
  });
  s.stop(`Deploy accepted: ${deployResult.id}`);
  await rm(zipPath, { force: true });
  p5.log.step('Streaming deploy logs...');
  const finalStatus = await pollServerDeploy(deployResult.id, token, orgId);
  if (finalStatus.status === 'running') {
    p5.outro(`Deploy succeeded! ${finalStatus.instanceUrl}`);
  } else if (finalStatus.status === 'failed') {
    p5.log.error(`Deploy failed: ${finalStatus.error}`);
    process.exit(1);
  } else {
    p5.log.warning(`Deploy ended with status: ${finalStatus.status}`);
    process.exit(1);
  }
}
function printDeploySuggestions(deployId, diagnosis, options) {
  if (diagnosis.status === 'FAILED') {
    p5.log.error(`Diagnosis failed: ${diagnosis.error ?? 'unknown error'}`);
    return;
  }
  const meta = [pc8.dim(`Deploy: ${deployId}`)];
  if (diagnosis.completedAt) {
    meta.push(pc8.dim(`Diagnosed: ${diagnosis.completedAt}`));
  }
  p5.log.step(meta.join(pc8.dim(' \xB7 ')));
  p5.log.message(pc8.bold(pc8.magenta(`\u{1F3E5} Deploy Suggestions`)));
  if (diagnosis.summary) {
    p5.log.message(pc8.bold(pc8.cyan(`Summary: `)) + diagnosis.summary);
  }
  const recommendations = diagnosis.recommendations ?? [];
  if (recommendations.length === 0) {
    p5.log.warn(
      `No suggestions could be generated. The deploy may have failed due to an internal error \u2014 check the deploy logs for details.`,
    );
  } else {
    const lines = [];
    for (const [index, recommendation] of recommendations.entries()) {
      lines.push(`${pc8.bold(pc8.cyan(`${index + 1}.`))} ${pc8.bold(recommendation.title)}`);
      lines.push(pc8.dim(`   ${recommendation.description}`));
      if (recommendation.action) {
        lines.push(`   ${pc8.green('\u25B8')} ${pc8.green(recommendation.action)}`);
      }
      if (recommendation.docsUrl) {
        lines.push(`   ${pc8.blue('\u2197')} ${pc8.underline(pc8.blue(recommendation.docsUrl))}`);
      }
      lines.push('');
    }
    p5.log.message(lines.join('\n'));
  }
  const logsUrl = options?.logsUrl ?? `https://projects.mastra.ai`;
  p5.log.step(`Deploy logs: ${pc8.underline(pc8.blue(logsUrl))}`);
}
var POLL_TIMEOUT_MS = 5 * 60 * 1e3;
async function pollForDiagnosis(fetchDiagnosis) {
  const spinner5 = p5.spinner();
  spinner5.start(pc8.cyan('Diagnosing deploy failure'));
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  try {
    while (true) {
      const result = await withPollingRetries(fetchDiagnosis);
      if (result.state === 'healthy') {
        spinner5.stop(pc8.green('Deploy is healthy'));
        return result;
      }
      if (result.state === 'ready' && result.diagnosis.status !== 'PENDING') {
        spinner5.stop(pc8.green('Diagnosis complete'));
        return result;
      }
      if (Date.now() >= deadline) {
        throw new Error('Diagnosis polling timed out after 5 minutes. Please try again later.');
      }
      await new Promise(resolve7 => setTimeout(resolve7, 1e3));
    }
  } catch (error) {
    spinner5.stop(pc8.red('Diagnosis failed'));
    throw error;
  }
}
async function resolveAuth(cliOrg) {
  const token = await getToken();
  const orgId = process.env.MASTRA_ORG_ID ?? cliOrg ?? (await getCurrentOrgId());
  if (!orgId) {
    throw new Error('No organization selected. Run: mastra auth orgs switch');
  }
  return { token, orgId };
}
async function resolveProjectId(opts, auth) {
  const envProjectId = process.env.MASTRA_PROJECT_ID;
  if (envProjectId) return envProjectId;
  if (opts.project) {
    if (auth) {
      const projects = await fetchServerProjects(auth.token, auth.orgId);
      const match = projects.find(p16 => p16.slug === opts.project || p16.id === opts.project);
      if (match) return match.id;
    }
    return opts.project;
  }
  const config6 = await loadProjectConfig(process.cwd(), opts.config);
  if (!config6?.projectId) {
    throw new Error('No linked project found. Deploy first with `mastra server deploy` or set MASTRA_PROJECT_ID.');
  }
  return config6.projectId;
}
async function envListAction(opts) {
  const { token, orgId } = await resolveAuth();
  const projectId = await resolveProjectId(opts);
  const envVars = await getServerProjectEnv(token, orgId, projectId);
  const keys = Object.keys(envVars);
  if (keys.length === 0) {
    console.info('\nNo environment variables set.\n');
    return;
  }
  console.info(`
  Environment variables (${keys.length}):
`);
  for (const key of keys.sort()) {
    const val = envVars[key];
    const masked = val.length > 4 ? val.slice(0, 4) + '...' : val;
    console.info(`    ${key}=${masked}`);
  }
  console.info('');
}
async function envSetAction(key, value, opts) {
  const { token, orgId } = await resolveAuth();
  const projectId = await resolveProjectId(opts);
  const envVars = await getServerProjectEnv(token, orgId, projectId);
  envVars[key] = value;
  await updateServerProjectEnv(token, orgId, projectId, envVars);
  console.info(`
  Set ${key} successfully.
`);
}
async function envUnsetAction(key, opts) {
  const { token, orgId } = await resolveAuth();
  const projectId = await resolveProjectId(opts);
  const envVars = await getServerProjectEnv(token, orgId, projectId);
  if (!(key in envVars)) {
    console.info(`
  ${key} is not set.
`);
    return;
  }
  delete envVars[key];
  await updateServerProjectEnv(token, orgId, projectId, envVars);
  console.info(`
  Removed ${key} successfully.
`);
}
async function envImportAction(file, opts) {
  const filePath = resolve(file);
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    throw new Error(`Could not read file: ${filePath}`);
  }
  const newVars = parseEnvFile2(content);
  const newKeys = Object.keys(newVars);
  if (newKeys.length === 0) {
    console.info('\n  No variables found in file.\n');
    return;
  }
  const { token, orgId } = await resolveAuth();
  const projectId = await resolveProjectId(opts);
  const envVars = await getServerProjectEnv(token, orgId, projectId);
  Object.assign(envVars, newVars);
  await updateServerProjectEnv(token, orgId, projectId, envVars);
  console.info(`
  Imported ${newKeys.length} variable(s) from ${file}:
`);
  for (const key of newKeys.sort()) {
    console.info(`    ${key}`);
  }
  console.info('');
}
async function envPullAction(file, opts) {
  const { token, orgId } = await resolveAuth();
  const projectId = await resolveProjectId(opts, { token, orgId });
  const envVars = await getServerProjectEnv(token, orgId, projectId);
  const keys = Object.keys(envVars);
  const target = file ?? '.env';
  const shellSafeKey = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const lines = ['# Pulled from Mastra Server \u2014 do not edit manually', ''];
  let skipped = 0;
  for (const key of keys.sort()) {
    if (!shellSafeKey.test(key)) {
      lines.push(`# Skipped unsafe key: ${key.replace(/[^\w.-]/g, '?')}`);
      skipped++;
      continue;
    }
    const value = envVars[key];
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
    lines.push(`${key}="${escaped}"`);
  }
  lines.push('');
  const outputPath = resolve(target);
  await writeFile(outputPath, lines.join('\n'), { encoding: 'utf-8', mode: 384 });
  await chmod(outputPath, 384);
  const written = keys.length - skipped;
  if (written === 0) {
    console.info(`
  No environment variables set in the project. Wrote empty ${target}.
`);
  } else {
    console.info(
      `
  Pulled ${written} variable(s) to ${target}.${skipped > 0 ? ` Skipped ${skipped} unsafe key(s).` : ''}
`,
    );
  }
}

// src/commands/server/deploy-suggestions.ts
async function resolveDeployId(token, orgId, deployId) {
  if (deployId) {
    return { deployId };
  }
  const projectId = await resolveProjectId({}, { token, orgId });
  const { project } = await fetchServerProjectDetail(token, orgId, projectId);
  if (!project.latestDeployId) {
    throw new Error(
      `No deploys found for linked Server project ${project.name}. The suggestions command helps debug failed deployments, and you can run it after a deployment fails with \`mastra server deploy suggestions <deploy-id>\` or \`mastra server deploy suggestions\`.`,
    );
  }
  p5.log.info(`Using latest deploy: ${project.latestDeployId}${project.name ? ` (${project.name})` : ''}`);
  return { deployId: project.latestDeployId, projectId };
}
function buildLogsUrl(orgId, projectId, deployId) {
  if (!projectId) return void 0;
  return `https://projects.mastra.ai/orgs/${orgId}/server/projects/${projectId}/deploys/${deployId}`;
}
async function serverSuggestionsAction(deployId, opts) {
  p5.intro('mastra server deploy suggestions');
  try {
    const { token, orgId } = await resolveAuth(opts.org);
    const resolved = await resolveDeployId(token, orgId, deployId);
    const targetDeployId = resolved.deployId;
    const initialDiagnosis = await withPollingRetries(() => fetchServerDeployDiagnosis(targetDeployId, token, orgId));
    if (initialDiagnosis.state === 'healthy') {
      p5.outro('Deploy is running successfully. No suggestions required.');
      return;
    }
    if (initialDiagnosis.state === 'missing') {
      await startServerDeployDiagnosis(targetDeployId, token, orgId);
    }
    let isFirstPoll = initialDiagnosis.state === 'ready';
    const diagnosisResult = await pollForDiagnosis(async () => {
      if (isFirstPoll) {
        isFirstPoll = false;
        return initialDiagnosis;
      }
      return fetchServerDeployDiagnosis(targetDeployId, token, orgId);
    });
    if (diagnosisResult.state !== 'ready') {
      p5.outro('Deploy is running successfully. No suggestions required.');
      return;
    }
    const logsUrl = buildLogsUrl(orgId, resolved.projectId, targetDeployId);
    if (diagnosisResult.diagnosis.status === 'FAILED') {
      p5.log.error(`Diagnosis failed: ${diagnosisResult.diagnosis.error ?? 'unknown error'}`);
      p5.log.step(`Deploy logs: ${logsUrl ?? 'https://projects.mastra.ai'}`);
      process.exit(1);
    }
    printDeploySuggestions(targetDeployId, diagnosisResult.diagnosis, { logsUrl });
  } catch (err) {
    p5.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
async function serverPauseAction(opts) {
  p5.intro('mastra server pause');
  try {
    const { token, orgId } = await resolveAuth(opts.org);
    const projectId = await resolveProjectId(opts, { token, orgId });
    await pauseServerProject(token, orgId, projectId);
    p5.outro('Server paused.');
  } catch (err) {
    p5.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
async function serverRestartAction(opts) {
  p5.intro('mastra server restart');
  try {
    const { token, orgId } = await resolveAuth(opts.org);
    const projectId = await resolveProjectId(opts, { token, orgId });
    const s = p5.spinner();
    s.start('Requesting restart...');
    const deployId = await restartServerProject(token, orgId, projectId);
    s.stop(`Restart queued: ${deployId}`);
    p5.log.step('Streaming deploy logs...');
    const finalStatus = await pollServerDeploy(deployId, token, orgId);
    if (finalStatus.status === 'running') {
      p5.outro(finalStatus.instanceUrl ? `Restart complete! ${finalStatus.instanceUrl}` : 'Restart complete!');
    } else if (finalStatus.status === 'failed') {
      p5.log.error(`Restart failed: ${finalStatus.error ?? 'unknown error'}`);
      process.exit(1);
    } else {
      p5.log.warning(`Restart ended with status: ${finalStatus.status}`);
      process.exit(1);
    }
  } catch (err) {
    p5.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// src/commands/studio/deploy-list.ts
var statusIcon = {
  starting: '\u{1F680}',
  running: '\u2705',
  stopped: '\u23F9\uFE0F',
  failed: '\u274C',
  unknown: '\u2753',
};
async function deploysAction() {
  const token = await getToken();
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    console.error('No organization selected. Run: mastra auth login');
    process.exit(1);
  }
  await validateOrgAccess(token, orgId);
  const projects = await fetchProjects(token, orgId);
  if (projects.length === 0) {
    console.info('No deploys found.');
    return;
  }
  for (const project of projects) {
    const status = project.latestDeployStatus ?? 'none';
    const icon = statusIcon[status] ?? '\u2753';
    const url = project.instanceUrl ?? '';
    console.info(`${icon} ${project.name} (${project.id})`);
    console.info(`   Latest:   ${project.latestDeployId ?? 'none'} \u2014 ${status}`);
    if (url) {
      console.info(`   URL:      ${url}`);
    }
    console.info('');
  }
}

// src/commands/studio/deploy-logs.ts
async function getLogs(deployId, tail, token, orgId) {
  const client = createApiClient(token, orgId);
  const { data, error } = await client.GET('/v1/studio/deploys/{id}/logs', {
    params: {
      path: { id: deployId },
      query: tail ? { tail } : void 0,
    },
  });
  if (error) {
    throw new Error(`Failed to fetch logs: ${error.detail}`);
  }
  if (data.logs) {
    for (const line of data.logs.split('\n')) {
      if (line) await writeBarLine(line);
    }
  } else {
    console.info('(no logs available)');
  }
}
async function streamLogs(deployId, token, orgId) {
  const url = `${MASTRA_PLATFORM_API_URL}/v1/studio/deploys/${deployId}/logs/stream`;
  const resp = await platformFetch(url, {
    headers: {
      ...authHeaders(token, orgId),
      Accept: 'text/event-stream',
    },
  });
  if (!resp.ok) {
    const text3 = await resp.text();
    throw new Error(`Failed to stream logs: ${resp.status} \u2014 ${text3}`);
  }
  if (!resp.body) {
    throw new Error('No response body for log stream');
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  process.on('SIGINT', () => {
    void reader.cancel();
    process.exit(0);
  });
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trimStart();
        await writeBarLine(data);
      }
    }
  }
}
async function logsAction(deployId, opts) {
  const token = await getToken();
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    console.error('No organization selected. Run: mastra auth login');
    process.exit(1);
  }
  await validateOrgAccess(token, orgId);
  if (opts.follow) {
    await streamLogs(deployId, token, orgId);
  } else {
    await getLogs(deployId, opts.tail, token, orgId);
  }
}

// src/commands/studio/deploy-status.ts
function printDeploy(deploy) {
  const statusIcon2 = {
    starting: '\u{1F680}',
    running: '\u2705',
    stopped: '\u23F9\uFE0F',
    failed: '\u274C',
    unknown: '\u2753',
  };
  const icon = statusIcon2[deploy.status] ?? '\u2753';
  console.info(`${icon} Deploy ${deploy.id}`);
  console.info(`   Status:   ${deploy.status}`);
  if (deploy.projectName) {
    console.info(`   Project:  ${deploy.projectName}`);
  }
  if (deploy.instanceUrl) {
    console.info(`   URL:      ${deploy.instanceUrl}`);
  }
  if (deploy.error) {
    console.info(`   Error:    ${deploy.error}`);
  }
  if (deploy.createdAt) {
    console.info(`   Created:  ${deploy.createdAt}`);
  }
}
async function statusAction(deployId, opts) {
  const token = await getToken();
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    console.error('No organization selected. Run: mastra auth login');
    process.exit(1);
  }
  await validateOrgAccess(token, orgId);
  if (opts.watch) {
    let lastStatus = '';
    console.info(`Watching deploy ${deployId}...
`);
    while (true) {
      const deploy = await fetchDeployStatus(deployId, token, orgId);
      if (deploy.status !== lastStatus) {
        printDeploy(deploy);
        console.info('');
        lastStatus = deploy.status;
      }
      if (deploy.status === 'running' || deploy.status === 'failed' || deploy.status === 'stopped') {
        break;
      }
      await new Promise(r => setTimeout(r, 1e3));
    }
  } else {
    const deploy = await fetchDeployStatus(deployId, token, orgId);
    printDeploy(deploy);
  }
}
function getLatestProjectDeploy(projects, linkedProjectId) {
  const linkedProject = linkedProjectId ? projects.find(project => project.id === linkedProjectId) : null;
  if (linkedProject) {
    if (linkedProject.latestDeployId) {
      return { deployId: linkedProject.latestDeployId, projectId: linkedProject.id, projectName: linkedProject.name };
    }
    throw new Error(
      `No deploys found for linked Studio project ${linkedProject.name}. The suggestions command helps debug failed deployments, and you can run it after a deployment fails with \`mastra studio deploy suggestions <deploy-id>\` or \`mastra studio deploy suggestions\`.`,
    );
  }
  if (linkedProjectId) {
    throw new Error(
      `Linked Studio project ${linkedProjectId} was not found in this organization. Re-link your project or pass a deploy ID explicitly.`,
    );
  }
  const latestProject = projects
    .filter(project => project.latestDeployId)
    .sort((left, right) => {
      const leftTime = left.latestDeployCreatedAt ? Date.parse(left.latestDeployCreatedAt) : 0;
      const rightTime = right.latestDeployCreatedAt ? Date.parse(right.latestDeployCreatedAt) : 0;
      return rightTime - leftTime;
    })[0];
  if (!latestProject?.latestDeployId) {
    return null;
  }
  return { deployId: latestProject.latestDeployId, projectId: latestProject.id, projectName: latestProject.name };
}
async function resolveDeployId2(token, orgId, deployId) {
  if (deployId) {
    return { deployId };
  }
  const projectConfig = await loadProjectConfig(process.cwd());
  const latestDeploy = getLatestProjectDeploy(
    (await fetchProjects(token, orgId)).filter(project => project.organizationId === orgId),
    projectConfig?.organizationId === orgId ? projectConfig.projectId : void 0,
  );
  if (!latestDeploy) {
    throw new Error('No previous studio deploy found. Pass a deploy ID or deploy first.');
  }
  p5.log.info(
    `Using latest deploy: ${latestDeploy.deployId}${latestDeploy.projectName ? ` (${latestDeploy.projectName})` : ''}`,
  );
  return { deployId: latestDeploy.deployId, projectId: latestDeploy.projectId };
}
async function suggestionsAction(deployId) {
  p5.intro('mastra studio deploy suggestions');
  try {
    const token = await getToken();
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      p5.log.error('No organization selected. Run: mastra auth login');
      process.exit(1);
    }
    await validateOrgAccess(token, orgId);
    const resolved = await resolveDeployId2(token, orgId, deployId);
    const targetDeployId = resolved.deployId;
    const initialDiagnosis = await withPollingRetries(() => fetchDeployDiagnosis(targetDeployId, token, orgId));
    if (initialDiagnosis.state === 'healthy') {
      p5.outro('Deploy is running successfully. No suggestions required.');
      return;
    }
    if (initialDiagnosis.state === 'missing') {
      await startDeployDiagnosis(targetDeployId, token, orgId);
    }
    let isFirstPoll = initialDiagnosis.state === 'ready';
    const diagnosisResult = await pollForDiagnosis(async () => {
      if (isFirstPoll) {
        isFirstPoll = false;
        return initialDiagnosis;
      }
      return fetchDeployDiagnosis(targetDeployId, token, orgId);
    });
    if (diagnosisResult.state !== 'ready') {
      p5.outro('Deploy is running successfully. No suggestions required.');
      return;
    }
    const logsUrl = resolved.projectId
      ? `https://projects.mastra.ai/orgs/${orgId}/studio/projects/${resolved.projectId}/deploys/${targetDeployId}`
      : void 0;
    if (diagnosisResult.diagnosis.status === 'FAILED') {
      p5.log.error(`Diagnosis failed: ${diagnosisResult.diagnosis.error ?? 'unknown error'}`);
      p5.log.step(`Deploy logs: ${logsUrl ?? 'https://projects.mastra.ai'}`);
      process.exit(1);
    }
    printDeploySuggestions(targetDeployId, diagnosisResult.diagnosis, { logsUrl });
  } catch (err) {
    p5.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
async function listProjectsAction() {
  const token = await getToken();
  const { orgId, orgName } = await resolveCurrentOrg(token);
  const projects = await fetchProjects(token, orgId);
  console.info(`
Projects in ${orgName}:
`);
  if (projects.length === 0) {
    console.info('  No projects yet. Run: mastra studio projects create\n');
    return;
  }
  for (const proj of projects) {
    const status = proj.latestDeployStatus ? ` [${proj.latestDeployStatus}]` : '';
    console.info(`  ${proj.name}${status}`);
    console.info(`    ID: ${proj.id}`);
    if (proj.instanceUrl) {
      console.info(`    URL: ${proj.instanceUrl}`);
    }
  }
  console.info('');
}
async function createProjectAction() {
  const token = await getToken();
  const { orgId, orgName } = await resolveCurrentOrg(token);
  const name = await p5.text({
    message: `Project name (in ${orgName})`,
    placeholder: 'my-mastra-app',
    validate: v => (!v || v.trim().length === 0 ? 'Name is required' : void 0),
  });
  if (p5.isCancel(name)) {
    p5.cancel('Cancelled.');
    process.exit(0);
  }
  const project = await createProject2(token, orgId, name);
  console.info(`
Created project: ${project.name} (${project.id})
`);
}
var WorkerBundler = class extends Bundler {
  constructor({ outputDir } = {}) {
    super('Worker');
    this.platform = process.versions?.bun ? 'neutral' : 'node';
    if (outputDir) {
      this.outputDir = outputDir;
    }
  }
  getEnvFiles() {
    if (shouldSkipDotenvLoading()) {
      return Promise.resolve([]);
    }
    const possibleFiles = ['.env.production', '.env.local', '.env'];
    try {
      const fileService = new FileService$2();
      const envFile = fileService.getFirstExistingFile(possibleFiles);
      return Promise.resolve([envFile]);
    } catch {}
    return Promise.resolve([]);
  }
  async bundle(entryFile, outputDirectory, { toolsPaths, projectRoot }) {
    return this._bundle(this.getEntry(), entryFile, { outputDirectory, projectRoot }, toolsPaths);
  }
  getEntry() {
    return `
    import { mastra } from '#mastra';

    await mastra.startWorkers();

    console.log('[mastra] Workers started');

    const shutdown = async () => {
      console.log('[mastra] Shutting down workers...');
      await mastra.stopWorkers();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    `;
  }
};

// src/commands/worker/build.ts
async function buildWorker({ dir, root, tools, outputDir, debug }) {
  const rootDir = root || process.cwd();
  const mastraDir = dir ? (isAbsolute(dir) ? dir : join(rootDir, dir)) : join(rootDir, 'src', 'mastra');
  const logger2 = createLogger(debug ?? false);
  let outputDirectory;
  let bundlerOutputDir;
  if (outputDir) {
    outputDirectory = isAbsolute(outputDir) ? resolve(outputDir) : resolve(rootDir, outputDir);
    bundlerOutputDir = '.';
  } else {
    outputDirectory = join(rootDir, '.mastra');
    bundlerOutputDir = 'output';
  }
  try {
    const fs4 = new FileService();
    const mastraEntryFile = fs4.getFirstExistingFile([join(mastraDir, 'index.ts'), join(mastraDir, 'index.js')]);
    const bundler = new WorkerBundler({ outputDir: bundlerOutputDir });
    bundler.__setLogger(logger2);
    const discoveredTools = bundler.getAllToolPaths(mastraDir, tools ? tools.split(',') : []);
    await bundler.prepare(outputDirectory);
    await bundler.bundle(mastraEntryFile, outputDirectory, {
      toolsPaths: discoveredTools,
      projectRoot: rootDir,
    });
    const builtPath = join(outputDirectory, bundlerOutputDir, 'index.mjs');
    logger2.info('Worker build complete.');
    logger2.info(`Run with: mastra worker start [name]${outputDir ? ` --dir ${outputDir}` : ''}`);
    logger2.info(`  or:     node ${builtPath}`);
  } catch (error) {
    if (error instanceof Error) {
      logger2.error(`Worker build failed: ${error.message}`, { stack: error.stack });
    }
    process.exit(1);
  }
}
async function startWorker(options = {}) {
  if (!shouldSkipDotenvLoading()) {
    config({ path: [options.env || '.env.production', '.env'], quiet: true });
  }
  const outputDir = options.dir || '.mastra/output';
  const outputPath = join(process.cwd(), outputDir);
  const workerFile = join(outputPath, 'index.mjs');
  if (!fs.existsSync(workerFile)) {
    logger.error(`Worker bundle not found at ${workerFile}. Run \`mastra worker build\` first.`);
    process.exit(1);
  }
  const child = spawn(process.execPath, ['index.mjs'], {
    cwd: outputPath,
    stdio: ['inherit', 'inherit', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ...(options.name ? { MASTRA_WORKERS: options.name } : {}),
    },
  });
  let stderrBuffer = '';
  child.stderr?.on('data', data => {
    stderrBuffer += data.toString();
    process.stderr.write(data);
  });
  child.on('error', err => {
    logger.error(`Worker process failed to start: ${err.message}`, {
      stack: err.stack,
    });
    process.exit(1);
  });
  child.on('exit', code => {
    if (code !== 0 && stderrBuffer.includes('ERR_MODULE_NOT_FOUND')) {
      const packageNameMatch = stderrBuffer.match(/Cannot find package '([^']+)'/);
      const packageName = packageNameMatch ? packageNameMatch[1] : null;
      if (packageName) {
        logger.error('Module not found while starting Mastra worker', { package: packageName });
      }
    }
    process.exit(code ?? 0);
  });
  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });
  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

// src/commands/worker/dev.ts
async function devWorker(options = {}) {
  await buildWorker({
    dir: options.dir,
    root: options.root,
    tools: options.tools,
    outputDir: options.outputDir,
    debug: options.debug,
  });
  await startWorker({
    name: options.name,
    dir: options.outputDir,
    env: options.env,
  });
}

// src/index.ts
function wrapAction(fn) {
  return (...args) => {
    fn(...args).catch(err => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
  };
}
var mastraPkg = package_default;
var version = mastraPkg.version;
var analytics = new PosthogAnalytics({
  apiKey: 'phc_SBLpZVAB6jmHOct9CABq3PF0Yn5FU3G2FgT4xUr2XrT',
  host: 'https://us.posthog.com',
  version,
});
setAnalytics(analytics);
var program = new Command();
var origin2 = process.env.MASTRA_ANALYTICS_ORIGIN;
program
  .name('mastra')
  .version(`${version}`, '-v, --version')
  .addHelpText(
    'before',
    `
${pc8.bold(pc8.cyan('Mastra'))} is a typescript framework for building AI applications, agents, and workflows.
`,
  )
  .action(() => {
    program.help();
  });
program
  .command('create [project-name]')
  .description('Create a new Mastra project')
  .option('--default', 'Quick start with defaults (src, OpenAI, examples)')
  .option(
    '-c, --components <components>',
    `Comma-separated list of components (${COMPONENTS.join(', ')})`,
    parseComponents,
  )
  .option('-l, --llm <model-provider>', `Default model provider (${LLMProvider.join(', ')})`, parseLlmProvider)
  .option('-k, --llm-api-key <api-key>', 'API key for the model provider')
  .option('-e, --example', 'Include example code')
  .option('-n, --no-example', 'Do not include example code')
  .option('-t, --timeout [timeout]', 'Configurable timeout for package installation, defaults to 60000 ms')
  .option('-d, --dir <directory>', 'Target directory for Mastra source code (default: src/)')
  .option(
    '-p, --project-name <string>',
    'Project name that will be used in package.json and as the project directory name.',
  )
  .option(
    '-m, --mcp <editor>',
    'MCP Server for code editor (cursor, cursor-global, windsurf, vscode, antigravity)',
    parseMcp,
  )
  .option('--skills <agents>', 'Install Mastra agent skills for specified agents (comma-separated)', parseSkills)
  .option(
    '--template [template-name]',
    'Create project from a template (use template name, public GitHub URL, or leave blank to select from list)',
  )
  .option('--observability', 'Enable Mastra Observability (writes MASTRA_PLATFORM_ACCESS_TOKEN placeholder to .env)')
  .option('--no-observability', 'Do not enable Mastra Observability')
  .option(
    '--observability-project <name>',
    'Existing platform project name/slug to attach Observability to, or a name to create. Skips the interactive picker.',
  )
  .action(createProject);
program
  .command('init')
  .description('Initialize Mastra in your project')
  .option('--default', 'Quick start with defaults (src, OpenAI, examples)')
  .option('-d, --dir <directory>', 'Directory for Mastra files to (defaults to src/)')
  .option(
    '-c, --components <components>',
    `Comma-separated list of components (${COMPONENTS.join(', ')})`,
    parseComponents,
  )
  .option('-l, --llm <model-provider>', `Default model provider (${LLMProvider.join(', ')})`, parseLlmProvider)
  .option('-k, --llm-api-key <api-key>', 'API key for the model provider')
  .option('-e, --example', 'Include example code')
  .option('-n, --no-example', 'Do not include example code')
  .option(
    '-m, --mcp <editor>',
    'MCP Server for code editor (cursor, cursor-global, windsurf, vscode, antigravity)',
    parseMcp,
  )
  .option('--observability', 'Enable Mastra Observability (writes MASTRA_PLATFORM_ACCESS_TOKEN placeholder to .env)')
  .option('--no-observability', 'Do not enable Mastra Observability')
  .option(
    '--observability-project <name>',
    'Existing platform project name/slug to attach Observability to, or a name to create. Skips the interactive picker.',
  )
  .action(initProject);
registerApiCommand(program);
program
  .command('lint')
  .description('Lint your Mastra project')
  .option('-d, --dir <path>', 'Path to your Mastra folder')
  .option('-r, --root <path>', 'Path to your root folder')
  .option('-t, --tools <toolsDirs>', 'Comma-separated list of paths to tool files to include')
  .option('--preflight', 'Also run bundle preflight checks (builds if needed)')
  .option('--skip-build', 'Skip build, reuse existing .mastra/output (requires --preflight)')
  .option('--env-file <file>', 'Env file for preflight validation (requires --preflight)')
  .option('--strict', 'Treat warnings as errors')
  .option('--json', 'Emit machine-readable JSON output')
  .option('--debug', 'Enable debug logs', false)
  .action(lintProject);
program
  .command('dev')
  .description('Start mastra server')
  .option('-d, --dir <dir>', 'Path to your mastra folder')
  .option('-r, --root <root>', 'Path to your root folder')
  .option('-t, --tools <toolsDirs>', 'Comma-separated list of paths to tool files to include')
  .option('-e, --env <env>', 'Custom env file to include in the dev server')
  .option(
    '-i, --inspect [host:port]',
    'Start the dev server in inspect mode (optional: [host:]port, e.g., 0.0.0.0:9229)',
  )
  .option(
    '-b, --inspect-brk [host:port]',
    'Start the dev server in inspect mode and break at the beginning of the script (optional: [host:]port)',
  )
  .option(
    '-c, --custom-args <args>',
    'Comma-separated list of custom arguments to pass to the dev server. IE: --experimental-transform-types',
  )
  .option('-s, --https', 'Enable local HTTPS')
  .option('--request-context-presets <file>', 'Path to request context presets JSON file')
  .option('--debug', 'Enable debug logs', false)
  .action(startDevServer);
program
  .command('build')
  .description('Build your Mastra project')
  .option('-d, --dir <path>', 'Path to your Mastra Folder')
  .option('-r, --root <path>', 'Path to your root folder')
  .option('-t, --tools <toolsDirs>', 'Comma-separated list of paths to tool files to include')
  .option('-s, --studio', 'Bundle the studio UI with the build')
  .option('--debug', 'Enable debug logs', false)
  .action(buildProject);
var workerCommand = program.command('worker').description('Build and run standalone Mastra worker bundles');
workerCommand
  .command('build')
  .description('Bundle a worker artifact (defaults to .mastra/output/index.mjs)')
  .option('-d, --dir <path>', 'Path to your Mastra folder')
  .option('-r, --root <path>', 'Path to your root folder')
  .option('-t, --tools <toolsDirs>', 'Comma-separated list of paths to tool files to include')
  .option(
    '-o, --output-dir <path>',
    'Output directory for the worker bundle. Defaults to .mastra/output (overwrites the server bundle if both are built in the same project \u2014 fine for split deploys). Pass a different path (relative or absolute) to redirect the worker bundle and leave the server bundle alone.',
  )
  .option('--debug', 'Enable debug logs', false)
  .action(opts => {
    return buildWorker(opts);
  });
workerCommand
  .command('start [name]')
  .description(
    'Start the built worker (defaults to .mastra/output/index.mjs). [name] sets MASTRA_WORKERS for the spawned process.',
  )
  .option('-d, --dir <path>', 'Path to your built worker output directory (default: .mastra/output)')
  .option('-e, --env <env>', 'Custom env file to load')
  .action((name, opts) => {
    return startWorker({ name, ...opts });
  });
workerCommand
  .command('dev [name]')
  .description('Build and start a worker in one step. [name] sets MASTRA_WORKERS for the spawned process.')
  .option('-d, --dir <path>', 'Path to your Mastra folder')
  .option('-r, --root <path>', 'Path to your root folder')
  .option('-t, --tools <toolsDirs>', 'Comma-separated list of paths to tool files to include')
  .option(
    '-o, --output-dir <path>',
    'Output directory for the worker bundle. Defaults to .mastra/output. Pass a different path to keep server and worker bundles side by side.',
  )
  .option('-e, --env <env>', 'Custom env file to load')
  .option('--debug', 'Enable debug logs', false)
  .action((name, opts) => {
    return devWorker({ name, ...opts });
  });
program
  .command('start')
  .description('Start your built Mastra application')
  .option('-d, --dir <path>', 'Path to your built Mastra output directory (default: .mastra/output)')
  .option('-e, --env <env>', 'Custom env file to include in the start')
  .option(
    '-c, --custom-args <args>',
    'Comma-separated list of custom arguments to pass to the Node.js process. IE: --require=newrelic',
  )
  .action(startProject);
var studioCommand = program
  .command('studio')
  .description('Manage Mastra Studio')
  .option('-p, --port <port>', 'Port to run the studio on (default: 3000)')
  .option('-e, --env <env>', 'Custom env file to include in the studio')
  .option('-h, --server-host <serverHost>', 'Host of the Mastra API server (default: localhost)')
  .option('-s, --server-port <serverPort>', 'Port of the Mastra API server (default: 4111)')
  .option('-x, --server-protocol <serverProtocol>', 'Protocol of the Mastra API server (default: http)')
  .option('--server-api-prefix <serverApiPrefix>', 'API route prefix of the Mastra server (default: /api)')
  .option('--request-context-presets <file>', 'Path to request context presets JSON file')
  .action(startStudio);
var deployCommand = studioCommand
  .command('deploy [dir]')
  .description('Deploy studio')
  .option('--org <id>', 'Organization ID')
  .option('--project <id>', 'Project ID, slug, or name (creates new project if not found)')
  .option('-y, --yes', 'Auto-accept defaults without confirmation')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .option('--env-file <file>', 'Env file to deploy (for example: .env.production)')
  .option('--skip-build', 'Skip the build step and use existing .mastra/output')
  .option('--skip-preflight', 'Skip the pre-deploy build/env validation')
  .option('--debug', 'Enable debug logs', false)
  .action(wrapAction(deployAction));
deployCommand.command('list').description('List deployed studios').action(wrapAction(deploysAction));
deployCommand
  .command('status <deploy-id>')
  .description('Show deploy status')
  .option('-w, --watch', 'Watch for status changes')
  .action(wrapAction(statusAction));
deployCommand
  .command('logs <deploy-id>')
  .description('Show deploy logs')
  .option('-f, --follow', 'Stream logs in real time')
  .option('--tail <n>', 'Number of recent log lines')
  .action(wrapAction(logsAction));
if (coreFeatures.has('deploy-diagnosis')) {
  deployCommand
    .command('suggestions [deploy-id]')
    .description('Show deploy suggestions for a failed deploy')
    .action(wrapAction(suggestionsAction));
}
var studioProjects = studioCommand
  .command('projects')
  .description('Manage studio projects')
  .action(wrapAction(listProjectsAction));
studioProjects.command('create').description('Create a new project').action(wrapAction(createProjectAction));
program
  .command('migrate')
  .description('Run database migrations to update storage schema')
  .option('-d, --dir <path>', 'Path to your Mastra folder')
  .option('-r, --root <path>', 'Path to your root folder')
  .option('-e, --env <env>', 'Custom env file to include')
  .option('--debug', 'Enable debug logs', false)
  .option('-y, --yes', 'Skip confirmation prompt (for CI/automation)')
  .action(migrate2);
var scorersCommand = program.command('scorers').description('Manage scorers for evaluating AI outputs');
scorersCommand
  .command('add [scorer-name]')
  .description('Add a new scorer to your project')
  .option('-d, --dir <path>', 'Path to your Mastra directory (default: auto-detect)')
  .action(addScorer);
scorersCommand.command('list').description('List available scorer templates').action(listScorers);
var authCommand = program.command('auth').description('Manage authentication');
authCommand.command('login').description('Log in to Mastra').action(wrapAction(loginAction));
authCommand.command('logout').description('Log out and clear credentials').action(wrapAction(logoutAction));
authCommand.command('whoami').description('Show current user and organization').action(wrapAction(whoamiAction));
var authOrgs = authCommand.command('orgs').description('Manage organizations').action(wrapAction(listOrgsAction));
authOrgs.command('switch').description('Switch current organization').action(wrapAction(switchOrgAction));
var authTokens = authCommand.command('tokens').description('Manage API tokens').action(wrapAction(listTokensAction));
authTokens.command('create <name>').description('Create a new API token').action(wrapAction(createTokenAction));
authTokens.command('revoke <token-id>').description('Revoke an API token').action(wrapAction(revokeTokenAction));
var serverCommand = program.command('server').description('Manage Mastra Server deployments');
var serverDeployCommand = serverCommand
  .command('deploy [dir]')
  .description('Deploy to Mastra Server')
  .option('--org <id>', 'Organization ID')
  .option('--project <id>', 'Project ID, slug, or name (creates new project if not found)')
  .option('-y, --yes', 'Auto-accept defaults without confirmation')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .option('--env-file <file>', 'Env file to deploy (for example: .env.production)')
  .option('--skip-build', 'Skip the build step and deploy the existing .mastra/output directory')
  .option('--skip-preflight', 'Skip the pre-deploy build/env validation')
  .option('--debug', 'Enable debug logs', false)
  .action(wrapAction(serverDeployAction));
if (coreFeatures.has('deploy-diagnosis')) {
  serverDeployCommand
    .command('suggestions [deploy-id]')
    .description('Show deploy suggestions for a failed deploy')
    .option('--org <id>', 'Organization ID')
    .action(wrapAction(serverSuggestionsAction));
}
serverCommand
  .command('pause')
  .description('Pause the linked Mastra Server project instance')
  .option('--org <id>', 'Organization ID')
  .option('--project <id>', 'Project ID or slug (overrides linked project when MASTRA_PROJECT_ID is unset)')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .action(wrapAction(serverPauseAction));
serverCommand
  .command('restart')
  .description('Restart the linked Mastra Server project instance')
  .option('--org <id>', 'Organization ID')
  .option('--project <id>', 'Project ID or slug (overrides linked project when MASTRA_PROJECT_ID is unset)')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .action(wrapAction(serverRestartAction));
var serverEnvCommand = serverCommand.command('env').description('Manage server environment variables');
serverEnvCommand
  .command('list')
  .description('List environment variables for the linked project')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .action(wrapAction(envListAction));
serverEnvCommand
  .command('set <key> <value>')
  .description('Set an environment variable')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .action(wrapAction(envSetAction));
serverEnvCommand
  .command('unset <key>')
  .description('Remove an environment variable')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .action(wrapAction(envUnsetAction));
serverEnvCommand
  .command('import <file>')
  .description('Import environment variables from a .env file')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .action(wrapAction(envImportAction));
serverEnvCommand
  .command('pull [file]')
  .description('Pull environment variables into a local .env file (default: .env)')
  .option('-c, --config <file>', 'Project config file path (default: .mastra-project.json)')
  .option('--project <id>', 'Project ID or slug (overrides linked project when MASTRA_PROJECT_ID is unset)')
  .action(wrapAction(envPullAction));
program.parse(process.argv);

export { analytics, origin2 as origin, version };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
