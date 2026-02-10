import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "../context/SocketContext";
import { Search, LogOut, Users, User, Plus, Phone, MessageCircle, Settings } from "lucide-react-native";

export default function ChatListScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { userId, forwardMessage, onForward } = route.params || {};

  const [conversations, setConversations] = useState<any[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);

  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000",
    default: "http://10.5.209.88:4000",
  });

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversation/list/${userId}`);
      if (!res.ok) {
        const text = await res.text();
        console.error("Error fetching conversations:", text);
        return;
      }
      const data = await res.json();
      setConversations(data.conversations || []);
      setFilteredConversations(data.conversations || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [userId]);

  // Filter conversations based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv => {
        const searchLower = searchQuery.toLowerCase();
        if (conv.isGroup) {
          return conv.groupName?.toLowerCase().includes(searchLower);
        } else {
          return conv.participantName?.toLowerCase().includes(searchLower) ||
                 conv.participantEmail?.toLowerCase().includes(searchLower);
        }
      });
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  // listen for newly created groups via socket and add locally
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    
    const groupCreatedHandler = (payload: any) => {
      if (!payload || !payload.participantIds) return;
      if (!payload.participantIds.includes(userId)) return;
      
      setConversations((prev) => {
        if (prev.find((c) => c.conversationId === payload.conversationId)) return prev;
        return [{
          isGroup: true,
          conversationId: payload.conversationId,
          groupName: payload.name || "Group",
          groupImage: payload.groupImage || null,
          participantIds: payload.participantIds,
          lastMessage: null,
        }, ...prev];
      });
    };

    const groupImageUpdatedHandler = ({ conversationId, groupImage }: any) => {
      if (!conversationId) return;
      
      setConversations(prev =>
        prev.map(c =>
          c.isGroup && c.conversationId === conversationId
            ? { ...c, groupImage }
            : c
        )
      );
    };

    socket.on("group_created", groupCreatedHandler);
    socket.on("group_image_updated", groupImageUpdatedHandler);
    
    return () => {
      socket.off("group_created", groupCreatedHandler);
      socket.off("group_image_updated", groupImageUpdatedHandler);
    };
  }, [socket, userId]);

  const startChat = async (receiverId: string, conversationId?: string) => {
    try {
      let convId = conversationId;
      if (!convId) {
        const res = await fetch(
          `${BACKEND_URL}/api/conversation/get-or-create?user1=${userId}&user2=${receiverId}`
        );
        if (!res.ok) {
          const text = await res.text();
          console.error("Error starting chat:", text);
          return;
        }
        const data = await res.json();
        convId = data.conversationId;
      }

      navigation.navigate("Chat", {
        conversationId: convId,
        userId,
        receiverId,
      });
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("user");
              await AsyncStorage.removeItem("userId");
              navigation.replace("SignIn");
            } catch (err) {
              console.error("Logout error:", err);
            }
          }
        }
      ]
    );
  };

  const handleAddContact = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Please enter a phone number");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/contacts/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, phoneNumber }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Success", "Contact added successfully!");
        setPhoneNumber("");
        setShowAddContact(false);
        fetchConversations();
      } else {
        Alert.alert("Error", data.message || "Failed to add contact");
      }
    } catch (err) {
      console.error("Error adding contact:", err);
      Alert.alert("Error", "Failed to add contact");
    }
  };

  const handleVideoCall = () => {
    Alert.alert(
      "Video Call",
      "Select a contact to start a video call",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Random Call",
          onPress: () => {
            const roomName = `random_call_${userId}_${Date.now()}`;
            navigation.navigate("VideoCall", { roomName });
          }
        }
      ]
    );
  };

  const formatLastMessage = (message: any) => {
    if (!message) return "No messages yet";
    
    if (typeof message === 'string') {
      return message.length > 30 ? message.substring(0, 30) + '...' : message;
    }
    
    if (message.type === 'image') return '📷 Image';
    if (message.type === 'video') return '🎥 Video';
    if (message.type === 'audio') return '🎵 Audio';
    if (message.type === 'file') return '📎 File';
    
    return 'Unknown content';
  };

  const renderItem = ({ item }: any) => {
    const lastMessage = formatLastMessage(item.lastMessage);
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          if (forwardMessage && onForward) {
            const targetId = item.isGroup ? item.conversationId : item.participantId;
            if (!targetId || targetId === userId) {
              Alert.alert("Cannot forward to yourself!");
              return;
            }
            onForward(targetId, item.isGroup);
            return;
          }

          if (item.isGroup) {
            navigation.navigate("GroupChat", {
              conversationId: item.conversationId,
              userId,
              groupName: item.groupName,
              participantIds: item.participantIds || [userId],
            });
          } else {
            startChat(item.participantId, item.conversationId);
          }
        }}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: item.isGroup
                ? item.groupImage || "https://via.placeholder.com/50/3a0ca3/ffffff?text=G"
                : item.participantProfileImage || "https://via.placeholder.com/50/7b2cbf/ffffff?text=" + (item.participantName?.charAt(0) || "U"),
            }}
            style={styles.avatar}
          />
          {item.isGroup && (
            <View style={styles.groupBadge}>
              <Users size={12} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.isGroup ? (item.groupName || "Group") : item.participantName}
            </Text>
            {item.lastTimestamp && (
              <Text style={styles.timeText}>
                {new Date(item.lastTimestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            )}
          </View>
          
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
          
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b2cbf" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#240046" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleVideoCall}
            >
              <Phone size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('CreateGroup', { userId })}
            >
              <Users size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Profile', { userId })}
            >
              <User size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleLogout}
            >
              <LogOut size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add Contact Section (shown when Plus FAB is clicked) */}
        {showAddContact && (
          <View style={styles.addContactContainer}>
            <View style={styles.addContactHeader}>
              <Text style={styles.addContactTitle}>Add New Contact</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAddContact(false)}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.phoneInputContainer}>
              <TextInput
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={styles.phoneInput}
                keyboardType="phone-pad"
                autoFocus
              />
              <TouchableOpacity 
                style={[styles.addButton, !phoneNumber.trim() && styles.addButtonDisabled]}
                onPress={handleAddContact}
                disabled={!phoneNumber.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Conversations List */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.conversationId ?? item.participantId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageCircle size={64} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'No results found for your search' : 'Start a new conversation!'}
              </Text>
              <TouchableOpacity 
                style={styles.startChatButton}
                onPress={() => setShowAddContact(true)}
              >
                <Text style={styles.startChatText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Floating Action Button - Toggles Add Contact */}
        <TouchableOpacity 
          style={[styles.fab, showAddContact && styles.fabActive]}
          onPress={() => setShowAddContact(!showAddContact)}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#240046",
  },
  container: {
    flex: 1,
    backgroundColor: "#240046",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#240046",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // Reduced gap to fit all icons
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 12,
    fontSize: 16,
  },
  clearText: {
    color: "#7b2cbf",
    fontSize: 14,
    fontWeight: "600",
  },
  addContactContainer: {
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addContactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addContactTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 20,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#7b2cbf",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginLeft: 12,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    backgroundColor: "rgba(123,44,191,0.5)",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#3a0ca3",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#240046",
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  timeText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  lastMessage: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  unreadBadge: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "#7b2cbf",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: "#7b2cbf",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startChatText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7b2cbf",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    transform: [{ rotate: '0deg' }],
  },
  fabActive: {
    backgroundColor: "#3a0ca3",
    transform: [{ rotate: '45deg' }],
  },
});