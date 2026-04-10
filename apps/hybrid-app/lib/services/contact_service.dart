import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_contacts/flutter_contacts.dart';

// ─── Contact Management Service ─────────────────────────
// Manages phone contacts for the TrustInbox call gatekeeper.
// - Saves approved callback contacts to phone
// - Deletes contacts on user's post-call choice
// - Checks if a number is already saved

class ContactService {
  ContactService._();

  /// Check if a phone number exists in the user's contacts
  static Future<bool> isContactSaved(String phoneNumber) async {
    if (kIsWeb) return false;
    if (!await FlutterContacts.requestPermission()) return false;

    final contacts = await FlutterContacts.getContacts(withProperties: true);
    final normalized = _normalizeNumber(phoneNumber);

    for (final contact in contacts) {
      for (final phone in contact.phones) {
        if (_normalizeNumber(phone.number) == normalized) {
          return true;
        }
      }
    }
    return false;
  }

  /// Save a new contact to the phone after callback approval
  static Future<bool> saveContact({
    required String phoneNumber,
    required String displayName,
    String? organization,
    String? note,
  }) async {
    if (kIsWeb) return false;
    if (!await FlutterContacts.requestPermission()) return false;

    // Check if already saved
    if (await isContactSaved(phoneNumber)) return true;

    final contact = Contact()
      ..name = Name(first: displayName)
      ..phones = [Phone(phoneNumber)]
      ..notes = [if (note != null) Note(note)];

    if (organization != null) {
      contact.organizations = [Organization(company: organization)];
    }

    await FlutterContacts.insertContact(contact);
    return true;
  }

  /// Delete a contact by phone number (post-call cleanup)
  static Future<bool> deleteContactByNumber(String phoneNumber) async {
    if (kIsWeb) return false;
    if (!await FlutterContacts.requestPermission()) return false;

    final contacts = await FlutterContacts.getContacts(withProperties: true);
    final normalized = _normalizeNumber(phoneNumber);

    for (final contact in contacts) {
      for (final phone in contact.phones) {
        if (_normalizeNumber(phone.number) == normalized) {
          await FlutterContacts.deleteContact(contact);
          return true;
        }
      }
    }
    return false;
  }

  /// Get contact name for a phone number (for post-call display)
  static Future<String?> getContactName(String phoneNumber) async {
    if (kIsWeb) return null;
    if (!await FlutterContacts.requestPermission()) return null;

    final contacts = await FlutterContacts.getContacts(withProperties: true);
    final normalized = _normalizeNumber(phoneNumber);

    for (final contact in contacts) {
      for (final phone in contact.phones) {
        if (_normalizeNumber(phone.number) == normalized) {
          return contact.displayName;
        }
      }
    }
    return null;
  }

  /// Normalize phone number for comparison (strip spaces, dashes, parens)
  static String _normalizeNumber(String number) {
    return number.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
  }
}
