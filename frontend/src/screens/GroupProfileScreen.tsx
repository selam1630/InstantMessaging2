import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
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
    launchImageLibrary(
      { mediaType: 'photo', includeBase64: false },
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
    } catch (err) {
      console.error('Update group image error:', err);
      Alert.alert('Error', 'Failed to update group image');
    }
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1 }}
        size="large"
        color="#7b2cbf"
      />
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={selectImage} style={styles.imageContainer}>
          {groupImage ? (
            <Image source={{ uri: groupImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                {groupName?.[0]?.toUpperCase()}
              </Text>
            </View>
          )}

          {uploading && (
            <ActivityIndicator size="small" style={styles.loader} />
          )}
        </TouchableOpacity>

        <Text style={styles.instruction}>
          Tap the image to set or change the group profile picture
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#240046',
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 18,
    color: '#007bff',
  },
  profileContainer: {
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  placeholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#7b2cbf',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -10,
  },
  instruction: {
    marginTop: 20,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});

export default GroupProfileScreen;
