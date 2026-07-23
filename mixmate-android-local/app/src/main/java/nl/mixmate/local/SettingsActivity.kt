package nl.mixmate.local

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class SettingsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = getString(R.string.settings_title)
        }

        val prefs = getSharedPreferences("mixmate", MODE_PRIVATE)
        val hostField = findViewById<EditText>(R.id.fieldHost)
        val portField = findViewById<EditText>(R.id.fieldPort)
        val saveBtn   = findViewById<Button>(R.id.btnSave)

        hostField.setText(prefs.getString("host", "mixmate.local"))
        portField.setText(prefs.getString("port", "8000"))

        saveBtn.setOnClickListener {
            val host = hostField.text.toString().trim().ifEmpty { "mixmate.local" }
            val port = portField.text.toString().trim().ifEmpty { "8000" }
            prefs.edit().putString("host", host).putString("port", port).apply()
            setResult(RESULT_OK)
            finish()
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressedDispatcher.onBackPressed()
        return true
    }
}
