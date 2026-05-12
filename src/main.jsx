function showFatalScreen(message) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:20px;color:#fff;background:#120f14;min-height:100vh;">
      <h2 style="margin:0 0 8px;">vAIb failed to start</h2>
      <p style="margin:0 0 10px;opacity:.9;">Startup JS crashed. Auto-reload in 1s…</p>
      <pre style="white-space:pre-wrap;background:#1e1724;padding:10px;border-radius:8px;">${message}</pre>
    </div>
  `
}

async function boot() {
  try {
    const mod = await import('./app-entry.jsx')
    mod.mountApp()
  } catch (err) {
    const msg = err?.stack || err?.message || String(err)
    console.error('[BOOT_FATAL]', msg)
    showFatalScreen(msg)
    setTimeout(() => window.location.reload(), 1000)
  }
}

boot()
