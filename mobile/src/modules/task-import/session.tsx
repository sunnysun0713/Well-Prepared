import {
  createContext,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { ExtractedTask } from '@/ai/types';

/** 已选图片(原始 uri 供预览,识别阶段再压缩) */
export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

interface ImportSessionValue {
  images: PickedImage[];
  setImages: Dispatch<SetStateAction<PickedImage[]>>;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  importNote: string;
  setImportNote: Dispatch<SetStateAction<string>>;
  extracting: boolean;
  setExtracting: Dispatch<SetStateAction<boolean>>;
  result: ExtractedTask[];
  setResult: Dispatch<SetStateAction<ExtractedTask[]>>;
  resultOpen: boolean;
  setResultOpen: Dispatch<SetStateAction<boolean>>;
  /** 进行中的识别请求,放在模块外以便切换模块后仍可取消 */
  abortRef: { current: AbortController | null };
}

const ImportSessionContext = createContext<ImportSessionValue | null>(null);

/**
 * 任务载入会话:状态挂在应用根部而不是模块组件里。
 * 切到其它模块再切回来时,已选图片、识别进度和识别结果都不会丢失;
 * 识别请求在后台继续跑,完成后结果仍会保留。
 */
export function ImportSessionProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState('');
  const [importNote, setImportNote] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractedTask[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  return (
    <ImportSessionContext.Provider
      value={{
        images,
        setImages,
        error,
        setError,
        importNote,
        setImportNote,
        extracting,
        setExtracting,
        result,
        setResult,
        resultOpen,
        setResultOpen,
        abortRef,
      }}
    >
      {children}
    </ImportSessionContext.Provider>
  );
}

export function useImportSession(): ImportSessionValue {
  const value = useContext(ImportSessionContext);
  if (!value) {
    throw new Error('useImportSession 必须在 ImportSessionProvider 内使用');
  }
  return value;
}
