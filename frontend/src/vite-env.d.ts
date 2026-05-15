/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_BACKEND_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
