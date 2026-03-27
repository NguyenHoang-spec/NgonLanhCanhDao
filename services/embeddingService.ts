import { pipeline, env } from '@huggingface/transformers';

// Disable local models to force downloading from huggingface
env.allowLocalModels = false;
// Tắt đa luồng (multi-threading) để sửa lỗi "reading 'buffer'" trên Netlify do thiếu SharedArrayBuffer
env.backends.onnx.wasm.numThreads = 1;

class LocalEmbeddingService {
    private extractor: any = null;
    private isInitializing = false;
    private initPromise: Promise<void> | null = null;
    private progressListeners: ((progress: any) => void)[] = [];

    /**
     * Subscribe to model loading progress
     */
    onProgress(callback: (progress: any) => void) {
        this.progressListeners.push(callback);
        return () => {
            this.progressListeners = this.progressListeners.filter(cb => cb !== callback);
        };
    }

    private notifyProgress(progress: any) {
        this.progressListeners.forEach(cb => cb(progress));
    }

    private async init() {
        if (this.extractor) return;
        if (this.initPromise) return this.initPromise;

        this.isInitializing = true;
        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                console.log("[Hệ thống Ký ức] Đang tải mô hình AI cục bộ (Local Embedding)...");
                
                // Use a multilingual model for better Vietnamese support
                this.extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
                    dtype: 'q8',
                    progress_callback: (progress: any) => {
                        this.notifyProgress(progress);
                    }
                });
                
                console.log("[Hệ thống Ký ức] Tải mô hình thành công!");
                resolve();
            } catch (error) {
                console.error("[Hệ thống Ký ức] Lỗi tải mô hình:", error);
                reject(error);
            } finally {
                this.isInitializing = false;
            }
        });

        return this.initPromise;
    }

    /**
     * Generates a vector embedding using local browser AI.
     * Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
     */
    async embedText(text: string): Promise<number[]> {
        if (!text || text.trim().length === 0) return [];

        try {
            await this.init();
            
            if (!this.extractor) {
                console.warn("⚠️ [Hệ thống Ký ức] Mô hình chưa sẵn sàng.");
                return [];
            }

            const output = await this.extractor(text, { pooling: 'mean', normalize: true });
            
            // output.data is a Float32Array, convert to regular array
            return Array.from(output.data);
        } catch (e: any) {
            console.error("⚠️ [Hệ thống Ký ức] Lỗi tạo Local Embedding:", e);
            return [];
        }
    }

    // Alias for backward compatibility with existing code
    async embedTextLocal(text: string): Promise<number[]> {
        return this.embedText(text);
    }
}

export const localEmbeddingService = new LocalEmbeddingService();
