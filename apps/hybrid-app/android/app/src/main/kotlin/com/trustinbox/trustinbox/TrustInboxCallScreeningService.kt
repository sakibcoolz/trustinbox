package com.trustinbox.trustinbox

import android.content.ContentResolver
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log

// ─── Call Screening Service ─────────────────────────────
// Blocks ALL unknown callers. Only saved contacts ring through.
// Unknown callers are silently rejected — they must submit a
// callback request through the TrustInbox platform.

class TrustInboxCallScreeningService : CallScreeningService() {

    companion object {
        private const val TAG = "TrustInboxCallScreen"
    }

    override fun onScreenCall(callDetails: Call.Details) {
        val handle = callDetails.handle
        val number = handle?.schemeSpecificPart

        if (number.isNullOrEmpty()) {
            // No number available — block (private/unknown)
            respondToCall(callDetails, buildBlockResponse())
            Log.d(TAG, "Blocked call with no number (private/restricted)")
            return
        }

        if (isContactSaved(number)) {
            // Saved contact — allow call through
            respondToCall(callDetails, buildAllowResponse())
            Log.d(TAG, "Allowed call from saved contact: ${number.takeLast(4)}")
        } else {
            // Unknown caller — silently reject
            respondToCall(callDetails, buildBlockResponse())
            Log.d(TAG, "Blocked unknown caller: ${number.takeLast(4)}")

            // Notify Flutter about the blocked call via SharedPreferences
            // Flutter will pick this up and show "callback request" prompt
            notifyBlockedCall(number)
        }
    }

    private fun isContactSaved(phoneNumber: String): Boolean {
        val cr: ContentResolver = applicationContext.contentResolver
        val uri: Uri = Uri.withAppendedPath(
            ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
            Uri.encode(phoneNumber)
        )
        var cursor: Cursor? = null
        return try {
            cursor = cr.query(uri, arrayOf(ContactsContract.PhoneLookup._ID), null, null, null)
            cursor != null && cursor.count > 0
        } catch (e: Exception) {
            Log.e(TAG, "Error checking contact: ${e.message}")
            // On error, allow call through (fail-open for safety)
            true
        } finally {
            cursor?.close()
        }
    }

    private fun buildAllowResponse(): CallResponse {
        return CallResponse.Builder()
            .setDisallowCall(false)
            .setRejectCall(false)
            .setSilenceCall(false)
            .setSkipCallLog(false)
            .setSkipNotification(false)
            .build()
    }

    private fun buildBlockResponse(): CallResponse {
        return CallResponse.Builder()
            .setDisallowCall(true)
            .setRejectCall(true)
            .setSilenceCall(true)
            .setSkipCallLog(false)
            .setSkipNotification(true)
            .build()
    }

    private fun notifyBlockedCall(number: String) {
        try {
            val prefs = applicationContext.getSharedPreferences(
                "trustinbox_calls", MODE_PRIVATE
            )
            prefs.edit()
                .putString("last_blocked_number", number)
                .putLong("last_blocked_time", System.currentTimeMillis())
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save blocked call info: ${e.message}")
        }
    }
}
