import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../App";

type MembersListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MembersList"
>;

interface Member {
  id: string;
  name: string;
  profileImage?: string;
  onlineStatus?: string;
}

const MembersListScreen: React.FC = () => {
  const navigation = useNavigation<MembersListScreenNavigationProp>();
  const route = useRoute();

  const { participantIds, conversationId, groupName } = route.params as {
    participantIds: string[];
    conversationId: string;
    groupName: string;
  };

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      if (!participantIds?.length) return;

      const token = await AsyncStorage.getItem("token");

      const res = await fetch("http://localhost:4000/api/members/by-ids", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: participantIds }),
      });

      const data = await res.json();

      if (data.success) {
        setMembers(data.users);
      } else {
        Alert.alert("Error", "Failed to load members");
      }
    } catch (err) {
      console.error("Fetch members error:", err);
      Alert.alert("Error", "Could not fetch members");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7b2cbf" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          navigation.navigate("GroupProfile", {
            conversationId,
            groupName,
          })
        }
      >
        <Text style={styles.backText}>Set photo</Text>
      </TouchableOpacity>

      {/* Members */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.memberRow}
            onPress={() =>
              navigation.navigate("UserProfile", { userId: item.id })
            }
          >
            <Image
              source={{
                uri:
                  item.profileImage ||
                  `https://i.pravatar.cc/150?u=${item.id}`,
              }}
              style={styles.avatar}
            />
            <Text style={styles.name}>{item.name}</Text>
            <Text
              style={{
                color: item.onlineStatus === "online" ? "green" : "gray",
                marginLeft: 8,
              }}
            >
              ● {item.onlineStatus === "online" ? "Online" : "Offline"}
            </Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: "#333" }} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#240046" },
  memberRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  name: { fontSize: 16, fontWeight: "500", color: "#fff" },
  backText: { fontSize: 18, color: "#007bff", marginBottom: 12 },
});

export default MembersListScreen;
