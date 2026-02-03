import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";

const UserProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params as { userId: string };

  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`http://localhost:4000/api/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const user = await res.json();
      setProfileImage(user.profileImage);
      setName(user.name);
    } catch (e) {
      console.error("Error loading user profile", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.profileContainer}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}

        <Text style={styles.name}>{name}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#240046",
    padding: 20,
  },
  backText: {
    fontSize: 18,
    color: "#007bff",
    marginBottom: 20,
  },
  profileContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  placeholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#e0e0e0",
  },
  name: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "600",
  },
});

export default UserProfileScreen;
