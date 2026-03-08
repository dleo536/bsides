import { View, Text, TouchableOpacity } from "react-native";
import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import HomePage from "../screens/HomePage";
import SearchPage from "../screens/SearchPage";
import NewsPage from "../screens/NewsPage";
import ProfilePage from "../screens/ProfilePage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../config/firebase";
import { getAuth } from "firebase/auth";
import AlbumPage from "../screens/AlbumPage";
import ArtistPage from "../screens/ArtistPage";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { NavigationContainer } from "@react-navigation/native";
import MusicianPage from "../screens/MusicianPage";
import UserPage from "../screens/UserPage";
import ReviewPage from "../screens/ReviewPage";
import ListPage from "../screens/ListPage";
const Tab = createBottomTabNavigator();
const TopTab = createMaterialTopTabNavigator();

const Stack = createStackNavigator();
const AppNavigator = () => {
  const [username, setUsername] = useState("");
  useEffect(() => {
    getUsername();
  }, []);
  const getUsername = async () => {
    const user = auth.currentUser;
    if (user) {
      const username = auth.currentUser?.displayName;
      setUsername(username);
    }
  };
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: "b-sides",
          tabBarIcon: () => {
            return (
              <MaterialCommunityIcons
                name="record-player"
                size={24}
                color="black"
              />
            );
          },
          // headerShown: false,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          tabBarIcon: () => {
            return <Ionicons name="search-outline" size={24}></Ionicons>;
          },
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="ProfilePage"
        component={ProfilePage}
        options={{
          tabBarIcon: () => {
            return (
              <MaterialCommunityIcons
                name="human-greeting"
                size={24}
                color="black"
              />
            );
          },
          tabBarLabel: "Me",
          headerTitle: username, // top header text

          // headerRight: () => (
          //   <TouchableOpacity onPress={() => console.log("settings")}>
          //     <Ionicons name="ellipsis-horizontal-outline" size={24} />
          //   </TouchableOpacity> // bottom tab label
          // ),
        }}
      />
    </Tab.Navigator>
  );
};

function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "black",
          tabBarShowLabel: false,
        },
      }}
    >
      <Stack.Screen
        name="SearchPage"
        component={SearchPage}
        options={{
          headerLeft: () => null,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="AlbumPage"
        component={AlbumPage}
        options={{
          headerBackTitle: "Back",
          headerBackTitleStyle: { fontSize: 10 },
        }}
      />
      <Stack.Screen
        name="ArtistPage"
        component={ArtistPage}
        options={{
          headerBackTitle: "Back",
          headerBackTitleStyle: { fontSize: 10 },
        }}
      />
      <Stack.Screen
        name="UserPage"
        component={UserPage}
        options={{
          headerBackTitle: "Back",
          headerBackTitleStyle: { fontSize: 10 },
        }}
      />
      <Stack.Screen
        name="MusicianPage"
        component={MusicianPage}
        options={{
          headerBackTitle: "Back",
          headerBackTitleStyle: { fontSize: 10 },
        }}
      />
    </Stack.Navigator>
  );
}
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomePage"
        component={HomePage}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReviewPage"
        component={ReviewPage}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ListPage"
        component={ListPage}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AlbumPage"
        component={AlbumPage}
        options={{
          headerBackTitle: "Back",
          headerBackTitleStyle: { fontSize: 10 },
        }}
      />
      <Stack.Screen
        name="ArtistPage"
        component={ArtistPage}
        options={{
          headerBackTitle: "Back",
          headerBackTitleStyle: { fontSize: 10 },
        }}
      />
    </Stack.Navigator>
  );
}

export default AppNavigator;
