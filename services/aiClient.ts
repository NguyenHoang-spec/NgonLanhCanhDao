// --- AI Client Service ---

import { GoogleGenAI } from "@google/genai";
import { AppSettings } from "../types";

// SAFELY override fetch using defineProperty to handle "only a getter" environments
const originalFetch = window.fetch;

try {
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    get: () => async (...args: [RequestInfo | URL, RequestInit?]) => {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource instanceof URL ? resource.href : (resource as Request).url;
      
      // Các mã lỗi sẽ được tự động thử lại
      const RETRYABLE_STATUS_CODES = [401, 429, 502, 503, 504];
      
      const performFetch = async (targetResource: RequestInfo | URL, targetConfig: RequestInit | undefined, attempt: number = 0): Promise<Response> => {
        try {
          // Log the URL being fetched for debugging
          if (attempt === 0 && !url.includes('localhost') && !url.includes('127.0.0.1')) {
             console.log(`%c[Fetch] 🌐 Requesting: ${url}`, "color: #3b82f6; font-size: 10px;");
          }
          
          // Clone the request if we might need to retry it, because a Request body can only be read once
          let fetchResource = targetResource;
          if (targetResource instanceof Request && attempt > 0) {
            // If it's a retry and it's a Request object, we should have cloned it.
            // Actually, to be safe for retries, we should clone it on EVERY attempt if it has a body.
            // But cloning a request with a stream body might be complex.
            // For now, just pass it. If it fails on retry due to body already read, it's a known fetch limitation.
          }
          
          // If it's a Request object, we must clone it before fetching if we want to retry later
          // because the body gets consumed.
          let requestToFetch = targetResource;
          let requestForRetry = targetResource;
          
          if (targetResource instanceof Request) {
            requestToFetch = targetResource.clone();
            requestForRetry = targetResource.clone();
          }
          
          const response = await originalFetch(requestToFetch, targetConfig);
          
          // NẾU BỊ LỖI THÌ THỬ LẠI LIÊN TỤC KHÔNG NGHỈ
          if (RETRYABLE_STATUS_CODES.includes(response.status)) {
            console.log(`%c[Fetch Guard] 🔄 Thử lại lần ${attempt + 1} (Status: ${response.status}) ngay lập tức...`, "color: #f59e0b; font-weight: bold;");
            
            // Gọi lại chính nó (Đệ quy) ngay lập tức
            return performFetch(requestForRetry, targetConfig, attempt + 1);
          }
          
          return response;
        } catch (error) {
          // Xử lý khi rớt mạng hoàn toàn
          console.log(`%c[Fetch Guard] 🌐 Lỗi mạng, thử lại lần ${attempt + 1} ngay lập tức...`, "color: #ef4444; font-weight: bold;");
          
          let requestForRetry = targetResource;
          if (targetResource instanceof Request) {
            requestForRetry = targetResource.clone();
          }
          return performFetch(requestForRetry, targetConfig, attempt + 1);
        }
      };

      // Bắt đầu thực thi fetch đã được bảo vệ
      return performFetch(resource, config);
    }
  });
} catch (e) {
  console.error("[AI Client] Không thể ghi đè fetch toàn cục.", e);
}

export const getAiClient = (settings: AppSettings) => {
  let apiKey: string = "";
  let source = "SYSTEM";
  
  // 1. Kiểm tra nếu dùng Proxy
  if (settings.useProxy && settings.proxyKey) {
    apiKey = settings.proxyKey;
    source = "PROXY";
  } 

  // Fallback nếu không có key nào
  if (!apiKey) {
    apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
    source = "SYSTEM_ENV";
  }
  
  console.log(`%c[AI Client] 🔑 Sử dụng key từ: ${source}`, "color: #10b981; font-weight: bold;");

  // Khởi tạo SDK với Key đã chọn
  let genAIConfig: any = { apiKey };

  if (settings.useProxy && settings.proxyUrl) {
    // We MUST pass the actual apiKey here so the SDK includes it in the headers
    // If we pass "PROXY_MODE", the proxy server will receive "PROXY_MODE" as the key and reject it.
    genAIConfig.apiKey = apiKey || "PROXY_MODE";
    
    // Clean the proxy URL robustly
    // Handle cases where user pastes the full endpoint URL or trailing slashes/versions
    let cleanProxy = settings.proxyUrl.trim().replace(/\/+$/, '');
    cleanProxy = cleanProxy
      .replace(/\/v1beta\/models\/.*$/, '')
      .replace(/\/v1alpha\/models\/.*$/, '')
      .replace(/\/v1\/models\/.*$/, '')
      .replace(/\/v1beta$/, '')
      .replace(/\/v1alpha$/, '')
      .replace(/\/v1$/, '');
    
    // The new @google/genai SDK supports baseUrl directly
    genAIConfig.baseUrl = cleanProxy;
    
    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        let urlStr = '';
        if (typeof input === 'string') {
          urlStr = input;
        } else if (input instanceof URL) {
          urlStr = input.href;
        } else if (input instanceof Request) {
          urlStr = input.url;
        }
        
        if (urlStr.includes(cleanProxy)) {
          return window.fetch(input, init);
        }
        
        const googleBase = 'https://generativelanguage.googleapis.com';
        if (urlStr.startsWith(googleBase)) {
          const newUrlStr = urlStr.replace(googleBase, cleanProxy);
          
          if (input instanceof Request) {
            // Reconstruct the request with the new URL
            const newReq = new Request(newUrlStr, input);
            return window.fetch(newReq, init);
          } else {
            return window.fetch(newUrlStr, init);
          }
        }
        
        return window.fetch(input, init);
      } catch (e) {
        console.error("[Proxy Fetch Error]", e);
        return window.fetch(input, init);
      }
    };

    // The new @google/genai SDK supports httpOptions
    genAIConfig.httpOptions = { fetch: customFetch };
    
    // We still keep the httpClient override for older versions
    genAIConfig.httpClient = { fetch: customFetch };
  }

  const genAI = new (GoogleGenAI as any)(genAIConfig);

  return genAI;
};
