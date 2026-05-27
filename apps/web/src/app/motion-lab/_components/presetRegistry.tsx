import { MOTION_PRESETS, type MotionPresetMeta } from "@/lib/motion/presets";

export function getPresetMeta(id: string): MotionPresetMeta | undefined {
  return MOTION_PRESETS.find((preset) => preset.id === id);
}

export { MOTION_PRESETS };
