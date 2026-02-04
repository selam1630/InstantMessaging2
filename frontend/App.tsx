import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LandingPage from "./src/components/LandingPage";
import SignInScreen from "./src/components/authpages/signin";
import SignUpScreen from "./src/components/authpages/signup";
import VerifyEmailScreen from "./src/components/authpages/VerifyEmailScreen";
import ChatScreen from "./src/screens/ChatScreen"; 
import ChatListScreen from "./src/screens/ChatListScreen";
import GroupChatScreen from "./src/screens/GroupChatScreen";
import CreateGroupScreen from "./src/screens/CreateGroupScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import { SocketProvider } from "./src/context/SocketContext";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import MembersListScreen from "./src/screens/GroupMembersScreen";
import GroupProfileScreen from "./src/screens/GroupProfileScreen";
import VideoCallScreen from "./src/screens/VideoCallScreen";
export type RootStackParamList = {
  Landing: undefined;
  SignIn: undefined;
  SignUp: undefined;
  VerifyEmail: { email: string; name: string; password: string ;phoneNumber: string };
  ChatList: { userId: string };
  Chat: { conversationId: string; userId: string; receiverId: string };
  GroupChat: { conversationId: string; userId: string; groupName: string; participantIds: string[] };
  CreateGroup: { userId: string };
  Profile: { userId: string };
  UserProfile: { userId: string };
  MembersList: { userIds: string[] };
  GroupProfile: { conversationId: string; groupName: string }; 
  VideoCall: { roomName: string };

};

const Stack = createNativeStackNavigator<RootStackParamList>();
const App: React.FC = () => {
  return (
    <SocketProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Landing" component={LandingPage} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="MembersList" component={MembersListScreen} />
           <Stack.Screen name="GroupProfile" component={GroupProfileScreen} /> 
           <Stack.Screen name="VideoCall" component={VideoCallScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SocketProvider>
  );
};

export default App;
