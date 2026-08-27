/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional. When present, AI requirement parsing calls a real model. */
  readonly VITE_AI_API_KEY?: string
  readonly VITE_AI_MODEL?: string
  readonly VITE_AI_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
