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

interface MembersListScreenProps {
  route: {
    params: {
      participantIds: string[];
      conversationId: string;
      groupName: string;
      userId?: string;
    };
  };
}

const BACKEND_URL = "http://localhost:4000";

export default function MembersListScreen({ route }: MembersListScreenProps) {
  const { participantIds, groupName } = route.params;
  const { onlineUsers } = useSocket();
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembersDetails();
  }, []);

  const fetchMembersDetails = async () => {
    try {
      const memberDetails = await Promise.all(
        participantIds.map(async (id) => {
          try {
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
              // Use socket data if available, otherwise use API data
              onlineStatus: onlineStatus?.onlineStatus || statusData.onlineStatus,
              lastSeen: onlineStatus?.lastSeen || statusData.lastSeen,
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
      // Fallback to socket data only
      const fallbackMembers = participantIds.map(id => getFallbackUserData(id));
      setMembers(fallbackMembers);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackUserData = (id: string) => {
    const onlineStatus = onlineUsers.find((u) => u.id === id);
    return {
      id,
      name: `User ${id.substring(0, 6)}`,
      profileImage: null,
      email: null,
      onlineStatus: onlineStatus?.onlineStatus || "offline",
      lastSeen: onlineStatus?.lastSeen || null,
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

  const renderMemberItem = ({ item }: { item: any }) => (
    <View style={styles.memberItem}>
      {item.profileImage ? (
        <Image
          source={{ uri: item.profileImage }}
          style={styles.memberAvatar}
        />
      ) : (
        <View style={styles.memberAvatarFallback}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || "U"}
          </Text>
        </View>
      )}
      
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
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
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b2cbf" />
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.memberCount}>
          {members.length} member{members.length !== 1 ? "s" : ""}
        </Text>
      </View>
      
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMemberItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {members.filter(m => m.onlineStatus === "online").length} online now
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  groupName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#240046",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 10,
  },
  listContainer: {
    padding: 16,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#7b2cbf",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  memberStatus: {
    fontSize: 14,
    marginBottom: 2,
  },
  onlineStatus: {
    color: "#4CAF50",
  },
  offlineStatus: {
    color: "rgba(255,255,255,0.6)",
  },
  memberEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
});