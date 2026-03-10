import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import HomePage from "../screens/HomePage";
import SearchPage from "../screens/SearchPage";
import ProfilePage from "../screens/ProfilePage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../config/firebase";
import AlbumPage from "../screens/AlbumPage";
import ArtistPage from "../screens/ArtistPage";
import MusicianPage from "../screens/MusicianPage";
import UserPage from "../screens/UserPage";
import ReviewPage from "../screens/ReviewPage";
import ListPage from "../screens/ListPage";
import LikedListsPage from "../screens/LikedListsPage";
import YearPicker from "../screens/YearPicker";
import YearResults from "../screens/YearResults";
import CountryPicker from "../screens/CountryPicker";
import CountryResults from "../screens/CountryResults";
import NewReleasesResults from "../screens/NewReleasesResults";
const Tab = createBottomTabNavigator();

const Stack = createStackNavigator();
const AppNavigator = () => {
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
        component={ProfileStack}
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
          headerShown: false,

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
      <Stack.Screen name="YearPicker" component={YearPicker} options={{ title: "Pick a Year" }} />
      <Stack.Screen name="YearResults" component={YearResults} options={{ title: "Year" }} />
      <Stack.Screen
        name="CountryPicker"
        component={CountryPicker}
        options={{ title: "Pick a Country" }}
      />
      <Stack.Screen
        name="CountryResults"
        component={CountryResults}
        options={{ title: "New in Country" }}
      />
      <Stack.Screen
        name="NewReleasesResults"
        component={NewReleasesResults}
        options={{ title: "New Releases" }}
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

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileHome"
        component={ProfilePage}
        options={{
          headerBackTitle: "Back",
          headerBackTitleStyle: { fontSize: 10 },
          title: auth.currentUser?.displayName || "Profile",
        }}
      />
      <Stack.Screen
        name="LikedListsPage"
        component={LikedListsPage}
        options={{
          title: "Liked Lists",
          headerBackTitle: "Back",
          headerBackTitleStyle: { fontSize: 10 },
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
    </Stack.Navigator>
  );
}

export default AppNavigator;
