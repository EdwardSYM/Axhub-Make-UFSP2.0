import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const LEGACY_DOC_SKILLS_SEGMENT = '/doc-skills/';
const LEGACY_DOC_SKILLS_DIR = path.resolve(projectRoot, 'skills/third-party/doc-skills');

const SKILL_SOURCES = [
  {
    target: 'skills/third-party/frontend-design/SKILL.md',
    url: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md',
  },
  {
    target: 'skills/third-party/interface-design/SKILL.md',
    url: 'https://raw.githubusercontent.com/Dammyjay93/interface-design/main/.claude/skills/interface-design/SKILL.md',
  },
  {
    target: 'skills/ui-ux-pro-max/SKILL.md',
    url: 'https://raw.githubusercontent.com/nextlevelbuilder/ui-ux-pro-max-skill/main/.claude/skills/ui-ux-pro-max/SKILL.md',
  },
  {
    target: 'skills/third-party/implement-design/SKILL.md',
    url: 'https://raw.githubusercontent.com/figma/mcp-server-guide/main/skills/implement-design/SKILL.md',
  },
  {
    target: 'skills/third-party/baoyu-image-gen/SKILL.md',
    url: 'https://raw.githubusercontent.com/jimliu/baoyu-skills/main/skills/baoyu-image-gen/SKILL.md',
  },
  {
    target: 'skills/third-party/shadcn-ui/SKILL.md',
    url: 'https://raw.githubusercontent.com/giuseppe-trisciuoglio/developer-kit/main/plugins/developer-kit-typescript/skills/shadcn-ui/SKILL.md',
  },
  {
    target: 'skills/third-party/ant-design/SKILL.md',
    url: 'https://raw.githubusercontent.com/ant-design/antd-skill/main/skills/ant-design/SKILL.md',
  },
  {
    target: 'skills/third-party/stitch-skills/design-md/SKILL.md',
    url: 'https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/skills/design-md/SKILL.md',
  },
  {
    target: 'skills/third-party/stitch-skills/react-components/SKILL.md',
    url: 'https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/skills/react-components/SKILL.md',
  },
  {
    target: 'skills/third-party/stitch-skills/stitch-loop/SKILL.md',
    url: 'https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/skills/stitch-loop/SKILL.md',
  },
  {
    target: 'skills/third-party/brainstorming/SKILL.md',
    url: 'https://raw.githubusercontent.com/obra/superpowers/main/skills/brainstorming/SKILL.md',
  },
  {
    target: 'skills/third-party/deep-research/SKILL.md',
    url: 'https://raw.githubusercontent.com/199-biotechnologies/claude-deep-research-skill/main/SKILL.md',
  },
  {
    target: 'skills/third-party/anything-to-notebooklm/SKILL.md',
    url: 'https://raw.githubusercontent.com/joeseesun/anything-to-notebooklm/main/SKILL.md',
  },
  {
    target: 'skills/third-party/prd/SKILL.md',
    url: 'https://raw.githubusercontent.com/github/awesome-copilot/main/skills/prd/SKILL.md',
  },
  {
    target: 'skills/third-party/product-requirements/SKILL.md',
    url: 'https://raw.githubusercontent.com/stellarlinkco/myclaude/master/skills/product-requirements/SKILL.md',
  },
  {
    target: 'skills/third-party/research/SKILL.md',
    url: 'https://raw.githubusercontent.com/tavily-ai/skills/main/skills/tavily/research/SKILL.md',
  },
  {
    target: 'skills/third-party/user-story-writing/SKILL.md',
    url: 'https://raw.githubusercontent.com/aj-geddes/useful-ai-prompts/main/skills/user-story-writing/SKILL.md',
  },
];

async function syncSkill({ target, url }) {
  if (target.includes(LEGACY_DOC_SKILLS_SEGMENT)) {
    throw new Error(`Legacy nested target is not allowed: ${target}`);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  const outputPath = path.resolve(projectRoot, target);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, 'utf8');
}

async function main() {
  let hasErrors = false;

  await rm(LEGACY_DOC_SKILLS_DIR, { recursive: true, force: true });

  for (const source of SKILL_SOURCES) {
    try {
      await syncSkill(source);
      console.log(`[OK] ${source.target}`);
    } catch (error) {
      hasErrors = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[FAIL] ${source.target} - ${message}`);
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
    return;
  }

  console.log(`Synced ${SKILL_SOURCES.length} third-party skills.`);
}

await main();
