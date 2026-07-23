package nl.mixmate.local

import android.annotation.SuppressLint
import android.content.Intent
import android.content.SharedPreferences
import android.net.http.SslError
import android.os.Bundle
import android.view.KeyEvent
import android.view.Menu
import android.view.MenuItem
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences("mixmate", MODE_PRIVATE)
        webView = findViewById(R.id.webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportZoom(false)
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    view.loadDataWithBaseURL(null, buildErrorPage(), "text/html", "UTF-8", null)
                }
            }

            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.proceed() // Lokaal netwerk
            }
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            loadMachine()
        }
    }

    private fun loadMachine() {
        val host = prefs.getString("host", "mixmate.local") ?: "mixmate.local"
        val port = prefs.getString("port", "8000") ?: "8000"
        webView.loadUrl("http://$host:$port")
    }

    private fun buildErrorPage(): String {
        val host = prefs.getString("host", "mixmate.local") ?: "mixmate.local"
        val port = prefs.getString("port", "8000") ?: "8000"
        return """
            <!DOCTYPE html><html><head><meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <style>
              body{margin:0;background:#1d1d1f;font-family:-apple-system,sans-serif;color:#fff;
                   display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;box-sizing:border-box}
              .logo{font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:8px}
              .sub{color:#6e6e73;font-size:14px;margin-bottom:40px}
              .card{background:#2c2c2e;border-radius:16px;padding:28px 24px;max-width:320px;width:100%}
              .icon{font-size:40px;margin-bottom:16px}
              h2{font-size:18px;font-weight:700;margin:0 0 8px}
              p{font-size:14px;color:#aeaeb2;line-height:1.6;margin:0 0 20px}
              .addr{background:#1d1d1f;border-radius:8px;padding:10px 14px;font-size:13px;color:#6e6e73;margin-bottom:20px;font-family:monospace}
              button{width:100%;padding:14px;border-radius:12px;border:none;background:#fff;color:#1d1d1f;
                     font-size:15px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif}
            </style></head><body>
            <div class="logo">MIXMATE</div>
            <div class="sub">Machine verbinding</div>
            <div class="card">
              <div class="icon">📡</div>
              <h2>Geen verbinding</h2>
              <p>Controleer of je op hetzelfde WiFi-netwerk zit als de MIXMATE machine.</p>
              <div class="addr">http://$host:$port</div>
              <button onclick="window.location.href='http://$host:$port'">Opnieuw proberen</button>
            </div>
            </body></html>
        """.trimIndent()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_settings -> {
                startActivityForResult(Intent(this, SettingsActivity::class.java), 1)
                true
            }
            R.id.action_reload -> {
                loadMachine()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1 && resultCode == RESULT_OK) {
            loadMachine()
        }
    }
}
