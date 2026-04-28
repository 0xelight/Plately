export type Vibe = 'warm' | 'energetic' | 'premium' | 'fun' | 'rustic'
export type ContentType = 'plat' | 'ambiance' | 'equipe' | 'boisson' | 'dessert'
export type Music = 'warm-acoustic' | 'upbeat-cafe' | 'chill-ambient' | 'energetic-beat' | 'elegant-piano'
export type Transition = 'smooth-dissolve' | 'cut' | 'fade-black'
export type Format = 'video' | 'carousel' | 'both'
export type Platform = 'tiktok' | 'reels' | 'instagram'
export type ProjectStatus = 'pending' | 'analyzing' | 'generating' | 'done' | 'error'
export type RerenderType = 'video' | 'carousel' | 'both' | 'none'

export interface SlideOverlay {
  text: string
  size: 'small' | 'medium' | 'large'
  position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center' | 'top-left' | 'top-right'
  color: string
  animation: 'fade' | 'fade-up' | 'slide-left' | 'none'
}

export interface Slide {
  id: number
  photo_index: number
  duration_sec: number
  overlay: SlideOverlay
  camera_prompt: string
}

export interface SceneJSON {
  context: {
    resto_name: string
    resto_type: string
    style: string
    vibe: Vibe
  }
  content_type: ContentType
  detected: {
    subject: string
    colors: string[]
    mood: string
  }
  slides: Slide[]
  music: Music
  transition: Transition
  caption: string
  hashtags: string[]
}

export interface Profile {
  id: string
  resto_name: string
  resto_type: string
  city: string
  style: string
  vibe: Vibe
  created_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Project {
  id: string
  profile_id: string
  status: ProjectStatus
  format: Format
  platform: Platform
  scene_json: SceneJSON | null
  video_url: string | null
  carousel_urls: string[] | null
  caption: string | null
  hashtags: string[] | null
  photo_paths: string[] | null
  created_at: string
}

export interface Message {
  id: string
  project_id: string
  role: 'user' | 'assistant'
  content: string
  scene_json_snapshot: SceneJSON | null
  created_at: string
}

export interface ChatResponse {
  updated_scene_json: SceneJSON
  needs_rerender: boolean
  rerender_type: RerenderType
  assistant_message: string
}
