import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface VideoCallScreenProps {
  route: {
    params: { roomName: string };
  };
}

const VideoCallScreen = ({ route }: VideoCallScreenProps) => {
  const { roomName } = route.params;

  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const webviewRef = useRef<WebView>(null);

  /**
   * Jitsi URL – auto join, no lobby, mic & camera ON
   */
  const jitsiUrl =
    `https://meet.jit.si/${roomName}` +
    `#config.prejoinPageEnabled=false` +
    `&config.startWithAudioMuted=false` +
    `&config.startWithVideoMuted=false` +
    `&config.disableDeepLinking=true` +
    `&interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true` +
    `&interfaceConfig.DISABLE_VIDEO_BACKGROUND=true`;

  /**
   * Send Jitsi commands into the WebView
   */
  const sendCommand = (command: string, value?: any) => {
    const js = `
      if (window.JitsiMeetExternalAPI) {
        JitsiMeetExternalAPI.executeCommand(
          '${command}',
          ${JSON.stringify(value)}
        );
      }
      true;
    `;
    webviewRef.current?.injectJavaScript(js);
  };

  /**
   * Force Jitsi to initialize audio & video
   * (known WebView workaround)
   */
  const forceStartMedia = () => {
    const js = `
      setTimeout(() => {
        if (window.JitsiMeetExternalAPI) {
          JitsiMeetExternalAPI.executeCommand('toggleAudio');
          JitsiMeetExternalAPI.executeCommand('toggleAudio');
          JitsiMeetExternalAPI.executeCommand('toggleVideo');
          JitsiMeetExternalAPI.executeCommand('toggleVideo');
        }
      }, 1000);
      true;
    `;
    webviewRef.current?.injectJavaScript(js);
  };

  const toggleMute = () => {
    sendCommand('toggleAudio');
    setMuted(prev => !prev);
  };

  const toggleVideo = () => {
    sendCommand('toggleVideo');
    setVideoOff(prev => !prev);
  };

  const leaveCall = () => {
    sendCommand('hangup');
    setTimeout(() => {
      // navigation.goBack(); ← hook this to your navigator
    }, 300);
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: jitsiUrl }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          forceStartMedia();
        }}
      />

      {loading && (
        <ActivityIndicator
          size="large"
          color="#7b2cbf"
          style={styles.loading}
        />
      )}

      {/* Call Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
          <Text style={styles.controlText}>
            {muted ? 'Unmute 🎤' : 'Mute 🎤'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
          <Text style={styles.controlText}>
            {videoOff ? 'Video On 📹' : 'Video Off 📹'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.leaveButton]}
          onPress={leaveCall}
        >
          <Text style={styles.leaveText}>Leave ❌</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VideoCallScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  loading: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },

  controls: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 30,
    minWidth: 90,
    alignItems: 'center',
  },

  controlText: {
    color: '#fff',
    fontSize: 12,
  },

  leaveButton: {
    backgroundColor: '#ff4b5c',
  },

  leaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
