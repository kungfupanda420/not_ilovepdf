// Load Emscripten glue code from the public folder
self.importScripts('/wasm/converter.js');

self.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
  try {
    // @ts-ignore - createModule is injected globally by importScripts
    const wasmModule = await self.createModule();

    // Convert ArrayBuffer to Uint8Array for C++ consumption
    const docxArray = new Uint8Array(e.data.buffer);
    
    // Call the C++ function exposed via Embind
    const pdfUint8Array = wasmModule.convertDocxToPdf(docxArray);
    
    // We must clone the buffer because Emscripten memory views detach 
    // when crossing the worker boundary
    const resultBuffer = new Uint8Array(pdfUint8Array).buffer;

    // Send back to main thread, transferring ownership of the buffer
    self.postMessage({ success: true, pdfBuffer: resultBuffer }, [resultBuffer]);
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : "C++ WebAssembly crashed" 
    });
  }
};