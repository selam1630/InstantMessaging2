import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Platform } from "react-native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from "../../App";
import { ChevronLeft, Users, Check, Search, UserPlus } from "lucide-react-native";

export default function CreateGroupScreen({ route }: { route: { params: { userId: string } } }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>>();
  const { userId } = route.params;

  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000",
    default: "http://10.5.209.88:4000",
  });

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/contacts/${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        setContacts(data || []);
        setFilteredContacts(data || []);
      } catch (err) {
        console.error("Fetch contacts error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [userId]);

  // Filter contacts based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => {
        const searchLower = searchQuery.toLowerCase();
        return (
          contact.name?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.phoneNumber?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) 
        ? prev.filter((p) => p !== id) 
        : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert("Group Name Required", "Please enter a group name");
      return;
    }
    
    if (selectedIds.length < 1) {
      Alert.alert("Select Members", "Select at least one member to create a group");
      return;
    }

    setCreating(true);
    try {
      const body = { 
        name: groupName.trim(), 
        participants: [...selectedIds, userId], 
        adminId: userId,
        groupImage: null // You can add group image upload later
      };
      
      const res = await fetch(`${BACKEND_URL}/api/conversation/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Create group failed:", txt);
        Alert.alert("Error", "Could not create group. Please try again.");
        return;
      }

      const data = await res.json();
      const convId = data.id || data.conversationId;

      navigation.replace("GroupChat", {
        conversationId: convId,
        userId,
        groupName: data.name || groupName,
        participantIds: data.participantIds || [...selectedIds, userId],
      });
      
      Alert.alert("Success", `"${groupName}" group created successfully!`);
    } catch (err) {
      console.error("Create group error:", err);
      Alert.alert("Error", "Failed to create group. Check your connection.");
    } finally {
      setCreating(false);
    }
  };

  const renderContactItem = ({ item }: { item: any }) => {
    const isSelected = selectedIds.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.contactItem, isSelected && styles.contactItemSelected]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.contactInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: item.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || item.email || "U")}&background=7b2cbf&color=fff`,
              }}
              style={styles.avatar}
            />
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Check size={12} color="#fff" />
              </View>
            )}
          </View>
          
          <View style={styles.contactDetails}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.name || "Unnamed Contact"}
            </Text>
            <Text style={styles.contactSubtitle} numberOfLines={1}>
              {item.email || item.phoneNumber || "No contact info"}
            </Text>
          </View>
        </View>
        
        <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorActive]}>
          {isSelected ? (
            <Check size={20} color="#fff" />
          ) : (
            <View style={styles.emptyCircle} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b2cbf" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#240046" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Group</Text>
            <Text style={styles.headerSubtitle}>
              {selectedIds.length} member{selectedIds.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
          
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Group Name Input */}
        <View style={styles.groupNameContainer}>
          <View style={styles.groupIconContainer}>
            <Users size={24} color="#fff" />
          </View>
          <TextInput
            placeholder="Enter group name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={groupName}
            onChangeText={setGroupName}
            style={styles.groupNameInput}
            maxLength={50}
            autoFocus
          />
          {groupName.length > 0 && (
            <Text style={styles.charCount}>
              {groupName.length}/50
            </Text>
          )}
        </View>

        {/* Selected Members Preview */}
        {selectedIds.length > 0 && (
          <View style={styles.selectedPreview}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedScrollContent}
            >
              {contacts
                .filter(contact => selectedIds.includes(contact.id))
                .map(contact => (
                  <View key={contact.id} style={styles.selectedAvatarContainer}>
                    <Image
                      source={{
                        uri: contact.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || contact.email || "U")}&background=7b2cbf&color=fff`,
                      }}
                      style={styles.selectedAvatar}
                    />
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {contact.name?.split(' ')[0] || 'User'}
                    </Text>
                  </View>
                ))
              }
            </ScrollView>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
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

        {/* Contacts List */}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searchQuery ? (
                <>
                  <Search size={64} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyTitle}>No contacts found</Text>
                  <Text style={styles.emptySubtitle}>
                    No results for "{searchQuery}"
                  </Text>
                </>
              ) : (
                <>
                  <UserPlus size={64} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyTitle}>No contacts available</Text>
                  <Text style={styles.emptySubtitle}>
                    Add contacts from the chat list to create a group
                  </Text>
                </>
              )}
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              Select members ({contacts.length} total)
            </Text>
          }
        />

        {/* Create Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.createButton, 
              (!groupName.trim() || selectedIds.length < 1) && styles.createButtonDisabled
            ]} 
            onPress={handleCreate} 
            disabled={creating || !groupName.trim() || selectedIds.length < 1}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Users size={20} color="#fff" style={styles.createIcon} />
                <Text style={styles.createText}>
                  Create Group {selectedIds.length > 0 && `(${selectedIds.length + 1})`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  groupNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(123,44,191,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  groupNameInput: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: 4,
  },
  charCount: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  selectedPreview: {
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  selectedScrollContent: {
    paddingHorizontal: 12,
  },
  selectedAvatarContainer: {
    alignItems: "center",
    marginHorizontal: 8,
    width: 60,
  },
  selectedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#7b2cbf",
  },
  selectedName: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 20,
    marginBottom: 16,
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  contactItemSelected: {
    backgroundColor: "rgba(123,44,191,0.15)",
    borderColor: "#7b2cbf",
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  selectedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#7b2cbf",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#240046",
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionIndicatorActive: {
    backgroundColor: "#7b2cbf",
    borderColor: "#7b2cbf",
  },
  emptyCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#240046",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  createButton: {
    backgroundColor: "#7b2cbf",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonDisabled: {
    backgroundColor: "rgba(123,44,191,0.5)",
  },
  createIcon: {
    marginRight: 8,
  },
  createText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});