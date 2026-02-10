import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSocket } from "../context/SocketContext";
import { useNavigation } from "@react-navigation/native";
import { useCurrentUser } from "../context/UserContext";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this import

interface MembersListScreenProps {
  route: {
    params: {
      participantIds: string[];
      conversationId: string;
      groupName: string;
    };
  };
}

const BACKEND_URL = "http://localhost:4000";

export default function MembersListScreen({ route }: MembersListScreenProps) {
  const { participantIds, conversationId, groupName } = route.params;
  
  // Use UserContext to get current user ID
  const { currentUserId, isLoading: isUserLoading } = useCurrentUser();
  const { onlineUsers } = useSocket();
  const navigation = useNavigation<any>();
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [groupLoading, setGroupLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading) {
      fetchGroupDetails();
      fetchMembersDetails();
    }
  }, [isUserLoading, currentUserId]);

  const fetchGroupDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${BACKEND_URL}/api/conversation/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (data.type === 'group') {
        setGroupImage(data.groupImage || null);
      }
    } catch (err) {
      console.error('Error fetching group details:', err);
    } finally {
      setGroupLoading(false);
    }
  };

  const fetchMembersDetails = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      const memberDetails = await Promise.all(
        participantIds.map(async (id) => {
          try {
            // Skip if it's the current user
            if (id === currentUserId) {
              return {
                id,
                name: "You",
                profileImage: null,
                email: null,
                onlineStatus: "online",
                lastSeen: null,
                isCurrentUser: true,
              };
            }

            // Fetch user profile details
            const userResponse = await fetch(`${BACKEND_URL}/api/user/${id}`);
            if (!userResponse.ok) {
              console.error(`Failed to fetch user ${id}: ${userResponse.status}`);
              return getFallbackUserData(id);
            }
            
            const userData = await userResponse.json();
            
            // Find online status from socket context
            const onlineStatus = onlineUsers.find((u) => u.id === id);
            
            // If not found in socket, fetch from API
            let statusData = { onlineStatus: "offline", lastSeen: null };
            if (!onlineStatus) {
              try {
                const statusResponse = await fetch(`${BACKEND_URL}/api/user/${id}/status`);
                if (statusResponse.ok) {
                  const statusResult = await statusResponse.json();
                  statusData = {
                    onlineStatus: statusResult.onlineStatus || "offline",
                    lastSeen: statusResult.lastSeen || null
                  };
                }
              } catch (statusError) {
                console.error(`Error fetching status for ${id}:`, statusError);
              }
            }
            
            return {
              id,
              name: userData.name || "Unknown User",
              profileImage: userData.profileImage,
              email: userData.email,
              onlineStatus: onlineStatus?.onlineStatus || statusData.onlineStatus,
              lastSeen: onlineStatus?.lastSeen || statusData.lastSeen,
              isCurrentUser: false,
            };
          } catch (error) {
            console.error(`Error processing user ${id}:`, error);
            return getFallbackUserData(id);
          }
        })
      );
      
      setMembers(memberDetails);
    } catch (error) {
      console.error("Error fetching members:", error);
      const fallbackMembers = participantIds.map(id => getFallbackUserData(id));
      setMembers(fallbackMembers);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackUserData = (id: string) => {
    const onlineStatus = onlineUsers.find((u) => u.id === id);
    const isCurrentUser = id === currentUserId;
    
    return {
      id,
      name: isCurrentUser ? "You" : `User ${id.substring(0, 6)}`,
      profileImage: null,
      email: null,
      onlineStatus: onlineStatus?.onlineStatus || "offline",
      lastSeen: onlineStatus?.lastSeen || null,
      isCurrentUser,
    };
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Never";
    
    try {
      const date = new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: diffDays >= 365 ? "numeric" : undefined,
      });
    } catch (error) {
      return "Unknown";
    }
  };

  const getStatusText = (member: any) => {
    if (member.onlineStatus === "online") {
      return "🟢 Online";
    } else if (member.lastSeen) {
      return `⚫ Last seen ${formatLastSeen(member.lastSeen)}`;
    } else {
      return "⚫ Offline";
    }
  };

  const handleMemberPress = (member: any) => {
    if (member.isCurrentUser) {
      navigation.navigate("Profile", { userId: member.id });
    } else {
      navigation.navigate("UserProfile", { 
        userId: member.id,
      });
    }
  };

  const handleEditGroupProfile = () => {
    navigation.navigate("GroupProfile", {
      conversationId,
      groupName
    });
  };

  const renderGroupProfileHeader = () => (
    <TouchableOpacity 
      style={styles.groupProfileSection}
      onPress={handleEditGroupProfile}
      activeOpacity={0.7}
    >
      <View style={styles.groupAvatarContainer}>
        {groupImage ? (
          <Image
            source={{ uri: groupImage }}
            style={styles.groupAvatarImage}
          />
        ) : (
          <View style={styles.groupAvatar}>
            <Text style={styles.groupAvatarText}>
              {groupName?.[0]?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupNameHeader}>{groupName}</Text>
        <Text style={styles.groupAction}>Edit group photo</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderMemberItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.memberItem}
      onPress={() => handleMemberPress(item)}
      activeOpacity={0.7}
    >
      {item.profileImage ? (
        <Image
          source={{ uri: item.profileImage }}
          style={styles.memberAvatar}
        />
      ) : (
        <View style={[
          styles.memberAvatarFallback,
          item.isCurrentUser && styles.currentUserAvatar
        ]}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || "U"}
          </Text>
        </View>
      )}
      
      <View style={styles.memberInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.memberName}>{item.name}</Text>
          {item.isCurrentUser && (
            <Text style={styles.youBadge}> (You)</Text>
          )}
        </View>
        <Text style={[
          styles.memberStatus,
          item.onlineStatus === "online" ? styles.onlineStatus : styles.offlineStatus
        ]}>
          {getStatusText(item)}
        </Text>
        {item.email && (
          <Text style={styles.memberEmail}>{item.email}</Text>
        )}
      </View>
      
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (isUserLoading || loading || groupLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b2cbf" />
        <Text style={styles.loadingText}>Loading group info...</Text>
      </View>
    );
  }

  const onlineCount = members.filter(m => m.onlineStatus === "online" && !m.isCurrentUser).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.memberCount}>
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
      
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMemberItem}
        ListHeaderComponent={renderGroupProfileHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
      />
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {onlineCount} {onlineCount === 1 ? 'person is' : 'people are'} online now
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#240046",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#240046",
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  headerTitle: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 14,
    color: "#94A3B8",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#240046",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  groupProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#240046',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  groupAvatarContainer: {
    marginRight: 16,
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7b2cbf',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  groupAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  groupAvatarText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  groupInfo: {
    flex: 1,
  },
  groupNameHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  groupAction: {
    fontSize: 14,
    color: '#94A3B8',
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#334155',
  },
  memberAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#240046",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#334155',
  },
  currentUserAvatar: {
    backgroundColor: "#3a0ca3",
    borderColor: '#6366F1',
  },
  avatarText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  youBadge: {
    fontSize: 14,
    color: "#94A3B8",
    fontStyle: "italic",
    marginLeft: 4,
  },
  memberStatus: {
    fontSize: 13,
    marginBottom: 2,
  },
  onlineStatus: {
    color: "#4CAF50",
  },
  offlineStatus: {
    color: "#94A3B8",
  },
  memberEmail: {
    fontSize: 12,
    color: "#64748B",
  },
  chevron: {
    fontSize: 24,
    color: "#64748B",
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    alignItems: "center",
    backgroundColor: '#240046',
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: '500',
  },
});
