import 'dart:async';
import 'dart:io';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import '../../../config/constants.dart';
import '../../../config/theme.dart';
import '../../../models/conversation.dart';

// ─── Voice Message Bubble ──────────────────────────────
// Plays a voice attachment (audio/*) inline using audioplayers.
// One play/pause button + linear progress + elapsed/duration text.
// Uses an HTTP source with the bearer token for authenticated download.
class VoiceMessageBubble extends StatefulWidget {
  final Attachment attachment;
  final String authToken;
  final bool isMe;

  const VoiceMessageBubble({
    super.key,
    required this.attachment,
    required this.authToken,
    required this.isMe,
  });

  @override
  State<VoiceMessageBubble> createState() => _VoiceMessageBubbleState();
}

class _VoiceMessageBubbleState extends State<VoiceMessageBubble> {
  final _player = AudioPlayer();
  Duration _position = Duration.zero;
  Duration? _duration;
  bool _playing = false;
  StreamSubscription? _stateSub;
  StreamSubscription? _posSub;
  StreamSubscription? _durSub;

  @override
  void initState() {
    super.initState();
    _stateSub = _player.onPlayerStateChanged.listen((s) {
      if (!mounted) return;
      setState(() => _playing = s == PlayerState.playing);
    });
    _posSub = _player.onPositionChanged.listen((p) {
      if (!mounted) return;
      setState(() => _position = p);
    });
    _durSub = _player.onDurationChanged.listen((d) {
      if (!mounted) return;
      setState(() => _duration = d);
    });
    _player.onPlayerComplete.listen((_) {
      if (!mounted) return;
      setState(() {
        _playing = false;
        _position = Duration.zero;
      });
    });
  }

  @override
  void dispose() {
    _stateSub?.cancel();
    _posSub?.cancel();
    _durSub?.cancel();
    _player.dispose();
    super.dispose();
  }

  String get _absoluteUrl => widget.attachment.url.startsWith('http')
      ? widget.attachment.url
      : '${AppConstants.apiBaseUrl}${widget.attachment.url}';

  Future<void> _toggle() async {
    if (_playing) {
      await _player.pause();
    } else {
      await _player.play(UrlSource(_absoluteUrl, mimeType: widget.attachment.fileType));
    }
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final fg = widget.isMe ? Colors.white : AppColors.accentBlue;
    final fgMuted = widget.isMe ? Colors.white70 : AppColors.textSecondary;
    final dur = _duration ?? Duration.zero;
    final progress = dur.inMilliseconds == 0
        ? 0.0
        : (_position.inMilliseconds / dur.inMilliseconds).clamp(0.0, 1.0);

    return Container(
      width: 220,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Row(
        children: [
          IconButton(
            onPressed: _toggle,
            icon: Icon(_playing ? Icons.pause_circle_filled : Icons.play_circle_filled),
            color: fg,
            iconSize: 32,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 4,
                    color: fg,
                    backgroundColor: fg.withValues(alpha: 0.25),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _fmt(_playing || _position > Duration.zero ? _position : dur),
                  style: TextStyle(fontSize: 11, color: fgMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Voice Recorder Sheet ──────────────────────────────
// Shown from the composer mic button. Records via the `record` package and
// returns the recorded `File` to the caller (or null if cancelled).

class VoiceRecorderSheet extends StatefulWidget {
  const VoiceRecorderSheet({super.key});

  static Future<File?> show(BuildContext context) {
    return showModalBottomSheet<File>(
      context: context,
      isDismissible: false,
      enableDrag: false,
      builder: (_) => const VoiceRecorderSheet(),
    );
  }

  @override
  State<VoiceRecorderSheet> createState() => _VoiceRecorderSheetState();
}

class _VoiceRecorderSheetState extends State<VoiceRecorderSheet> {
  final _recorder = AudioRecorder();
  bool _recording = false;
  Duration _elapsed = Duration.zero;
  Timer? _ticker;
  String? _path;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    if (!await _recorder.hasPermission()) {
      if (mounted) Navigator.pop(context);
      return;
    }
    final dir = await getTemporaryDirectory();
    _path = '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(), path: _path!);
    setState(() => _recording = true);
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed += const Duration(seconds: 1));
    });
  }

  Future<void> _stopAndSend() async {
    _ticker?.cancel();
    final path = await _recorder.stop();
    if (path == null) {
      if (mounted) Navigator.pop(context);
      return;
    }
    if (mounted) Navigator.pop(context, File(path));
  }

  Future<void> _cancel() async {
    _ticker?.cancel();
    if (_recording) await _recorder.stop();
    if (_path != null) {
      final f = File(_path!);
      if (await f.exists()) await f.delete();
    }
    if (mounted) Navigator.pop(context);
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.mic, color: AppColors.accentRed, size: 40),
            const SizedBox(height: 8),
            Text(_fmt(_elapsed), style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text('Recording…', style: TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                TextButton.icon(
                  onPressed: _cancel,
                  icon: const Icon(Icons.close),
                  label: const Text('Cancel'),
                ),
                ElevatedButton.icon(
                  onPressed: _stopAndSend,
                  icon: const Icon(Icons.send),
                  label: const Text('Send'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
