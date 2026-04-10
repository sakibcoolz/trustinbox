package com.trustinbox.trustinbox

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log

// ─── Call State Receiver ────────────────────────────────
// Monitors phone call state transitions to detect when a call ends.
// After a call ends, notifies Flutter to show the post-call prompt
// ("Keep contact" or "Delete contact").

class CallStateReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "TrustInboxCallState"
        private var lastState = TelephonyManager.CALL_STATE_IDLE
        private var lastNumber: String? = null
        private var callStarted = false
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                // Incoming call ringing
                lastNumber = number
                lastState = TelephonyManager.CALL_STATE_RINGING
                Log.d(TAG, "Ringing: ${number?.takeLast(4)}")
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                // Call answered / outgoing call started
                callStarted = true
                lastState = TelephonyManager.CALL_STATE_OFFHOOK
                Log.d(TAG, "Call active: ${lastNumber?.takeLast(4)}")
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                // Call ended
                if (callStarted && lastNumber != null) {
                    Log.d(TAG, "Call ended: ${lastNumber?.takeLast(4)}")
                    notifyCallEnded(context, lastNumber!!)
                }
                callStarted = false
                lastNumber = null
                lastState = TelephonyManager.CALL_STATE_IDLE
            }
        }
    }

    private fun notifyCallEnded(context: Context, number: String) {
        try {
            val prefs = context.getSharedPreferences("trustinbox_calls", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("last_completed_call_number", number)
                .putLong("last_completed_call_time", System.currentTimeMillis())
                .putBoolean("pending_post_call_prompt", true)
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save call end info: ${e.message}")
        }
    }
}
