import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SceneJSON } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function deepMerge<T extends Record<string, unknown>>(target: T, patch: Partial<T>): T {
  const result = { ...target }
  for (const key in patch) {
    const patchVal = patch[key]
    const targetVal = target[key]
    if (
      patchVal !== null &&
      typeof patchVal === 'object' &&
      !Array.isArray(patchVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        patchVal as Record<string, unknown>
      ) as T[typeof key]
    } else {
      result[key] = patchVal as T[typeof key]
    }
  }
  return result
}

export function mergeSceneJSONPatch(base: SceneJSON, patch: Partial<SceneJSON>): SceneJSON {
  const merged = deepMerge(base as unknown as Record<string, unknown>, patch as Record<string, unknown>) as unknown as SceneJSON

  if (patch.slides && Array.isArray(patch.slides)) {
    merged.slides = base.slides.map((slide) => {
      const slidePatch = patch.slides!.find((s) => s.id === slide.id)
      if (!slidePatch) return slide
      return deepMerge(slide as unknown as Record<string, unknown>, slidePatch as unknown as Record<string, unknown>) as unknown as typeof slide
    })
  }

  return merged
}

export function needsVisualRerender(patch: Partial<SceneJSON>): 'video' | 'carousel' | 'both' | 'none' {
  const hasVideoChange = !!(patch.slides?.some(s => s.camera_prompt) || patch.music || patch.transition)
  const hasVisualChange = !!(patch.slides?.some(s => s.overlay) || patch.slides?.some(s => s.photo_index !== undefined))

  if (hasVideoChange && hasVisualChange) return 'both'
  if (hasVideoChange) return 'video'
  if (hasVisualChange) return 'carousel'
  return 'none'
}
