import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:photo_view/photo_view.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../config/constants.dart';
import '../../../config/theme.dart';
import '../../../models/conversation.dart';

// ─── Attachment Bubble ─────────────────────────────────
// Renders one attachment inside a chat message bubble.
//   • Images   → tappable thumbnail → fullscreen lightbox
//   • Audio    → handled by VoiceMessageBubble (not here)
//   • Other    → file row: icon + name + size, opens in external viewer
class AttachmentBubble extends StatelessWidget {
  final Attachment attachment;
  final String authToken;
  final bool isMe;

  const AttachmentBubble({
    super.key,
    required this.attachment,
    required this.authToken,
    required this.isMe,
  });

  String get _absoluteUrl {
    if (attachment.url.startsWith('http')) return attachment.url;
    return '${AppConstants.apiBaseUrl}${attachment.url}';
  }

  @override
  Widget build(BuildContext context) {
    if (attachment.isImage) return _buildImage(context);
    return _buildFile(context);
  }

  Widget _buildImage(BuildContext context) {
    return GestureDetector(
      onTap: () => _openLightbox(context),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 240, maxWidth: 240),
          child: CachedNetworkImage(
            imageUrl: _absoluteUrl,
            httpHeaders: {'Authorization': 'Bearer $authToken'},
            fit: BoxFit.cover,
            placeholder: (_, __) => Container(
              width: 200,
              height: 200,
              color: AppColors.bgCard,
              child: const Center(
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            errorWidget: (_, __, ___) => Container(
              width: 200,
              height: 200,
              color: AppColors.bgCard,
              child: const Icon(Icons.broken_image_outlined),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFile(BuildContext context) {
    return InkWell(
      onTap: () => _openExternal(),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: (isMe ? Colors.white : AppColors.accentBlue).withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(_iconForType(), size: 28, color: isMe ? Colors.white : AppColors.accentBlue),
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    attachment.fileName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isMe ? Colors.white : null,
                    ),
                  ),
                  Text(
                    _formatBytes(attachment.fileSize),
                    style: TextStyle(
                      fontSize: 11,
                      color: isMe ? Colors.white70 : AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForType() {
    final t = attachment.fileType.toLowerCase();
    if (t.startsWith('video/')) return Icons.videocam_outlined;
    if (t.contains('pdf')) return Icons.picture_as_pdf_outlined;
    if (t.contains('zip') || t.contains('compressed')) return Icons.archive_outlined;
    if (t.startsWith('audio/')) return Icons.audiotrack;
    return Icons.insert_drive_file_outlined;
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / 1024 / 1024).toStringAsFixed(1)} MB';
    return '${(bytes / 1024 / 1024 / 1024).toStringAsFixed(1)} GB';
  }

  Future<void> _openExternal() async {
    final uri = Uri.parse(_absoluteUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _openLightbox(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _LightboxScreen(
          imageUrl: _absoluteUrl,
          authToken: authToken,
          fileName: attachment.fileName,
        ),
      ),
    );
  }
}

class _LightboxScreen extends StatelessWidget {
  final String imageUrl;
  final String authToken;
  final String fileName;

  const _LightboxScreen({
    required this.imageUrl,
    required this.authToken,
    required this.fileName,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(fileName, style: const TextStyle(fontSize: 14)),
      ),
      body: PhotoView(
        imageProvider: CachedNetworkImageProvider(
          imageUrl,
          headers: {'Authorization': 'Bearer $authToken'},
        ),
        backgroundDecoration: const BoxDecoration(color: Colors.black),
        minScale: PhotoViewComputedScale.contained,
        maxScale: PhotoViewComputedScale.covered * 4,
      ),
    );
  }
}
