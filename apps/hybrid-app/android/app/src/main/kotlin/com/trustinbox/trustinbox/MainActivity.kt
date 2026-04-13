package com.trustinbox.trustinbox

import android.app.NotificationManager
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.TelephonyManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

// ─── MainActivity — Flutter ↔ Native Bridge ─────────────
// Provides MethodChannel for call screening, contact management,
// DND integration, and post-call prompt communication.

class MainActivity : FlutterActivity() {

    companion object {
        private const val CHANNEL = "com.trustinbox/native"
        private const val REQUEST_CALL_SCREENING = 1001
    }

    private var callStateReceiver: CallStateReceiver? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                // ─── Call Screening ─────────────────────────
                "requestCallScreeningRole" -> {
                    requestCallScreeningRole()
                    result.success(true)
                }
                "isCallScreeningEnabled" -> {
                    result.success(isCallScreeningEnabled())
                }

                // ─── DND Access ─────────────────────────────
                "isDndAccessGranted" -> {
                    result.success(isDndAccessGranted())
                }
                "requestDndAccess" -> {
                    requestDndAccess()
                    result.success(true)
                }
                "isDndActive" -> {
                    result.success(isDndActive())
                }

                // ─── Blocked Call Info ──────────────────────
                "getLastBlockedCall" -> {
                    val prefs = getSharedPreferences("trustinbox_calls", MODE_PRIVATE)
                    val number = prefs.getString("last_blocked_number", null)
                    val time = prefs.getLong("last_blocked_time", 0)
                    if (number != null && time > 0) {
                        result.success(mapOf("number" to number, "time" to time))
                        // Clear after reading
                        prefs.edit().remove("last_blocked_number").remove("last_blocked_time").apply()
                    } else {
                        result.success(null)
                    }
                }

                // ─── Post-Call Prompt ───────────────────────
                "getPendingPostCallPrompt" -> {
                    val prefs = getSharedPreferences("trustinbox_calls", MODE_PRIVATE)
                    val pending = prefs.getBoolean("pending_post_call_prompt", false)
                    if (pending) {
                        val number = prefs.getString("last_completed_call_number", null)
                        val time = prefs.getLong("last_completed_call_time", 0)
                        prefs.edit()
                            .putBoolean("pending_post_call_prompt", false)
                            .remove("last_completed_call_number")
                            .remove("last_completed_call_time")
                            .apply()
                        result.success(mapOf("number" to number, "time" to time))
                    } else {
                        result.success(null)
                    }
                }

                else -> result.notImplemented()
            }
        }

        // Register call state receiver
        registerCallStateReceiver()
    }

    private fun requestCallScreeningRole() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(RoleManager::class.java)
            if (roleManager != null && !roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
                startActivityForResult(intent, REQUEST_CALL_SCREENING)
            }
        }
    }

    private fun isCallScreeningEnabled(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(RoleManager::class.java)
            return roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true
        }
        return false
    }

    private fun isDndAccessGranted(): Boolean {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return nm.isNotificationPolicyAccessGranted
    }

    private fun requestDndAccess() {
        val intent = Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        startActivity(intent)
    }

    private fun isDndActive(): Boolean {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return nm.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL
    }

    private fun registerCallStateReceiver() {
        if (callStateReceiver == null) {
            try {
                callStateReceiver = CallStateReceiver()
                val filter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    registerReceiver(callStateReceiver, filter, RECEIVER_NOT_EXPORTED)
                } else {
                    registerReceiver(callStateReceiver, filter)
                }
            } catch (e: Exception) {
                // Don't crash the app if receiver registration fails
                callStateReceiver = null
            }
        }
    }

    override fun onDestroy() {
        callStateReceiver?.let { unregisterReceiver(it) }
        callStateReceiver = null
        super.onDestroy()
    }
}
