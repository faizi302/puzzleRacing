// ════════════════════════════════════════════════════════════
// uiFX.js — BACKWARD-COMPAT SHIM
// ────────────────────────────────────────────────────────────
// All FX helpers (toast, rewardBurst, popStat, tweenNumber, shake)
// have moved into uiRender.js. Keep this file so existing imports
// like `import { toast } from '../ui/uiFX.js'` continue to work
// without touching every scene file.
// ════════════════════════════════════════════════════════════
export {
  toast,
  rewardBurst,
  popStat,
  tweenNumber,
  shake,
} from '../visuals/uiRender.js';