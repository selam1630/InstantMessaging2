import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserContextType {
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
  loadUserData: () => Promise<void>;
  isLoading: boolean;
  currentUser: any | null; // Add full user object
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Try to get userId from multiple sources
      let userId = await AsyncStorage.getItem('userId');
      console.log('UserContext: Loaded userId from AsyncStorage:', userId);
      
      // If userId not found directly, try to extract from user object
      if (!userId) {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          try {
            const user = JSON.parse(userJson);
            userId = user.id;
            console.log('UserContext: Extracted userId from user object:', userId);
            
            // Save it for future use
            if (userId) {
              await AsyncStorage.setItem('userId', userId);
            }
          } catch (parseError) {
            console.error('Error parsing user JSON:', parseError);
          }
        }
      }
      
      // Load full user object
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          setCurrentUser(user);
        } catch (error) {
          console.error('Error parsing user object:', error);
        }
      }
      
      if (userId) {
        setCurrentUserId(userId);
      } else {
        console.log('UserContext: No userId found anywhere');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const value = {
    currentUserId,
    setCurrentUserId: async (id: string | null) => {
      setCurrentUserId(id);
      if (id) {
        await AsyncStorage.setItem('userId', id);
      } else {
        await AsyncStorage.removeItem('userId');
      }
    },
    loadUserData,
    isLoading,
    currentUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};


export const useCurrentUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within UserProvider');
  }
  return context;
};