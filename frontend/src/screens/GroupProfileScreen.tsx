import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type GroupProfileScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList, 'GroupChat'>;

const GroupProfileScreen: React.FC = () => {
  const navigation = useNavigation<GroupProfileScreenNavigationProp>();
  const route = useRoute();

  const { conversationId, groupName } = route.params as {
    conversationId: string;
    groupName: string;
  };

  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchGroup();
  }, []);

  const fetchGroup = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const res = await fetch(
        `http://localhost:4000/api/conversation/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (data.type !== 'group') {
        Alert.alert('Error', 'This is not a group conversation');
        navigation.goBack();
        return;
      }

      setGroupImage(data.groupImage || null);
    } catch (err) {
      console.error('Error fetching group:', err);
      Alert.alert('Error', 'Failed to load group info');
    } finally {
      setLoading(false);
    }
  };

  const selectImage = () => {
    if (uploading) return;

    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      (res) => {
        if (res.didCancel) return;
        if (res.errorMessage) {
          Alert.alert('Error', res.errorMessage);
          return;
        }
        if (res.assets && res.assets[0]) {
          uploadImage(res.assets[0]);
        }
      }
    );
  };

  const uploadImage = async (asset: any) => {
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('token');

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type,
        name: asset.fileName,
      } as any);

      const uploadRes = await fetch(
        'http://localhost:4000/api/files/upload',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        }
      );

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        Alert.alert('Error', uploadData.message || 'Upload failed');
        return;
      }

      await updateGroupImage(uploadData.fileUrl);
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const updateGroupImage = async (imageUrl: string) => {
    try {
      const token = await AsyncStorage.getItem('token');

      const res = await fetch(
        'http://localhost:4000/api/conversation/update-group-image',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ conversationId, imageUrl }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.message || 'Failed to update image');
        return;
      }

      setGroupImage(imageUrl);
      Alert.alert('Success', 'Group photo updated successfully');
    } catch (err) {
      console.error('Update group image error:', err);
      Alert.alert('Error', 'Failed to update group image');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading group...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Group Photo</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Group Image Section */}
        <View style={styles.content}>
          <TouchableOpacity 
            onPress={selectImage} 
            style={styles.imageContainer}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <View style={styles.imageWrapper}>
              {groupImage ? (
                <Image 
                  source={{ uri: groupImage }} 
                  style={styles.groupImage} 
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholder}>
                  <View style={styles.groupIcon}>
                    <Text style={styles.groupIconText}>
                      {groupName?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.placeholderText}>Add Group Photo</Text>
                </View>
              )}
              
              {/* Edit Overlay */}
              <View style={styles.editOverlay}>
                <View style={styles.editIconContainer}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </View>
            </View>
            
            {/* Uploading Indicator */}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Group Name */}
          <Text style={styles.groupNameDisplay}>{groupName}</Text>

          {/* Instructions */}
          <Text style={styles.instruction}>
            Tap the image to set or change the group photo
          </Text>
          <Text style={styles.subInstruction}>
            Recommended: Square image, max 2MB
          </Text>
          
          {/* Image Stats */}
          {groupImage && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Current Image</Text>
                <Text style={styles.statValue}>✓ Loaded</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Group photo is visible to all members
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#240046',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#240046',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#240046',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backArrow: {
    fontSize: 22,
    color: '#FFFFFF',
    marginRight: 6,
  },
  backText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 80, // Balance the header layout
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  imageWrapper: {
    position: 'relative',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  groupImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7b2cbf',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupIconText: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 20,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  groupNameDisplay: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  subInstruction: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  statsContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statValue: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default GroupProfileScreen;