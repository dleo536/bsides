import { View, Text } from "react-native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import HomePage from "../screens/HomePage";
import SearchPage from "../screens/SearchPage";
import NewsPage from "../screens/NewsPage";
import ProfilePage from "../screens/ProfilePage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import AlbumPage from "../screens/AlbumPage";
import ArtistPage from "../screens/ArtistPage";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { NavigationContainer } from "@react-navigation/native";
import MusicianPage from "../screens/MusicianPage";
const Tab = createBottomTabNavigator();
const TopTab = createMaterialTopTabNavigator();

const Stack = createStackNavigator();
const AppNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomePage}
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
        name="Profile"
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
      <Stack.Screen name="SearchPage" component={SearchPage} />
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

export default AppNavigator;
