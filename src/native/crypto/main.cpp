/**
 * Web3 Crypto Streaming Service - Native Crypto Module
 * 
 * This module provides high-performance cryptographic operations
 * with proper visibility for cross-platform Node.js usage.
 */

#include <napi.h>
#include <string>
#include <memory>
#include <iostream>

// Forward declarations for our wrapper functions
Napi::Value AesEncrypt(const Napi::CallbackInfo& info);
Napi::Value AesDecrypt(const Napi::CallbackInfo& info);
Napi::Value Sha256Hash(const Napi::CallbackInfo& info);
Napi::Value GetModuleInfo(const Napi::CallbackInfo& info);

/**
 * Get module information including build details and visibility
 */
Napi::Value GetModuleInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    
    result.Set("name", "web3_crypto_native");
    result.Set("version", "1.0.0");
    
#ifdef _WIN32
    result.Set("platform", "win32");
#elif defined(__APPLE__)
    result.Set("platform", "darwin");
#elif defined(__linux__)
    result.Set("platform", "linux");
#else
    result.Set("platform", "unknown");
#endif

#ifdef _M_X64
    result.Set("arch", "x64");
#elif defined(_M_IX86)
    result.Set("arch", "ia32");
#elif defined(__x86_64__)
    result.Set("arch", "x64");
#elif defined(__aarch64__)
    result.Set("arch", "arm64");
#else
    result.Set("arch", "unknown");
#endif

    result.Set("buildDate", __DATE__);
    result.Set("buildTime", __TIME__);
    
    // Export visibility information
#ifdef _WIN32
    result.Set("symbolVisibility", "dllexport");
#else
    result.Set("symbolVisibility", "default");
#endif

    return result;
}

/**
 * Initialize module and register functions
 */
Napi::Object Initialize(Napi::Env env, Napi::Object exports) {
    // Register AES encryption/decryption functions
    exports.Set(Napi::String::New(env, "aesEncrypt"), 
                Napi::Function::New(env, AesEncrypt));
    exports.Set(Napi::String::New(env, "aesDecrypt"), 
                Napi::Function::New(env, AesDecrypt));
    
    // Register hash functions
    exports.Set(Napi::String::New(env, "sha256"), 
                Napi::Function::New(env, Sha256Hash));
    
    // Module information
    exports.Set(Napi::String::New(env, "getModuleInfo"), 
                Napi::Function::New(env, GetModuleInfo));
    
    return exports;
}

NODE_API_MODULE(web3_crypto_native, Initialize)
