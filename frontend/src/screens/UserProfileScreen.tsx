// screens/UserProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Phone, MessageCircle } from 'lucide-react-native';
import { useCurrentUser } from '../context/UserContext'; // Import the hook

interface UserProfileScreenProps {
  route: {
    params: {
      userId: string;
    };
  };
}

const BACKEND_URL = "http://localhost:4000";

const UserProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { userId } = route.params as { userId: string };
  
  // Use the UserContext
  const { currentUserId, isLoading: isUserLoading } = useCurrentUser();
  
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState('offline');
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading) {
      fetchUserProfile();
    }
  }, [isUserLoading]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Fetch user data
      const response = await fetch(`${BACKEND_URL}/api/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const user = await response.json();
        setUserData(user);
        
        // Fetch online status
        const statusResponse = await fetch(`${BACKEND_URL}/api/user/${userId}/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setOnlineStatus(status.onlineStatus || 'offline');
          setLastSeen(status.lastSeen || null);
        }
      } else {
        Alert.alert('Error', 'Failed to load user profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    
    try {
      const date = new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: diffDays >= 365 ? 'numeric' : undefined,
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const handleStartChat = async () => {
    // Get current user ID from context
    const loggedInUserId = currentUserId;
    
    if (!loggedInUserId) {
      Alert.alert('Error', 'Please log in to start a chat');
      return;
    }

    // Check if trying to chat with yourself
    if (userId === loggedInUserId) {
      Alert.alert('Cannot chat with yourself');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      
      // Use your existing getOrCreateConversation endpoint
      const response = await fetch(
        `${BACKEND_URL}/api/conversation/get-or-create?user1=${loggedInUserId}&user2=${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Navigate to chat screen
        navigation.navigate('Chat', {
          conversationId: data.conversationId,
          userId: loggedInUserId, // Use the logged-in user's ID from context
          receiverId: userId,
          receiverName: userData?.name || 'User',
        });
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleVideoCall = () => {
    // Get current user ID from context
    const callerId = currentUserId;
    
    if (!callerId) {
      Alert.alert('Error', 'Cannot make call without user ID');
      return;
    }

    if (userId === callerId) {
      Alert.alert('Cannot call yourself');
      return;
    }

    // Check if user is online before starting call
    if (onlineStatus !== 'online') {
      Alert.alert(
        'User is offline',
        `${userData?.name || 'This user'} is currently offline. They won't receive your call.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call Anyway', 
            onPress: () => {
              const roomName = `call_${callerId}_${userId}_${Date.now()}`;
              navigation.navigate('VideoCall', { roomName });
            }
          }
        ]
      );
      return;
    }

    const roomName = `call_${callerId}_${userId}_${Date.now()}`;
    navigation.navigate('VideoCall', { roomName });
  };

  if (isUserLoading || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7b2cbf" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Profile Image */}
      <View style={styles.profileImageContainer}>
        {userData?.profileImage ? (
          <Image
            source={{ uri: userData.profileImage }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImageText}>
              {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.userName}>{userData?.name || 'Unknown User'}</Text>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            onlineStatus === 'online' ? styles.onlineDot : styles.offlineDot
          ]} />
          <Text style={styles.statusText}>
            {onlineStatus === 'online' 
              ? 'Online' 
              : `Last seen ${formatLastSeen(lastSeen)}`
            }
          </Text>
        </View>

        {userData?.email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{userData.email}</Text>
          </View>
        )}

        {userData?.phoneNumber && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{userData.phoneNumber}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={handleStartChat}
        >
          <MessageCircle color="#fff" size={24} />
          <Text style={styles.buttonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.callButton}
          onPress={handleVideoCall}
        >
          <Phone color="#fff" size={24} />
          <Text style={styles.buttonText}>Video Call</Text>
        </TouchableOpacity>
      </View>

      {/* Additional info */}
      <View style={styles.extraInfo}>
        <Text style={styles.extraInfoText}>
          {onlineStatus === 'online' 
            ? 'Available for chat'
            : 'May be away'
          }
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#240046',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 36,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
    textAlign: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#7b2cbf',
  },
  profileImagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#7b2cbf',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#7b2cbf',
  },
  profileImageText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
  },
  infoContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: '#4CAF50',
  },
  offlineDot: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  statusText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    width: 80,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7b2cbf',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginRight: 16,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a0ca3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  extraInfo: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  extraInfoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default UserProfileScreen;