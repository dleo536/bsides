import { View, Text } from 'react-native'
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomePage from '../screens/HomePage';
import SearchPage from '../screens/SearchPage';
import NewsPage from '../screens/NewsPage';
import ProfilePage from '../screens/ProfilePage';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { Ionicons } from '@expo/vector-icons';


const Tab = createBottomTabNavigator();



const AppNavigator = () => {
    return <Tab.Navigator>
            <Tab.Screen name="Home" component={HomePage} options={{
                tabBarIcon: () => {
                    return <MaterialCommunityIcons name="record-player" size={24} color="black" />
                }
            }}/>
            <Tab.Screen name="Search" component={SearchPage} options={{
                tabBarIcon: () => {
                    return <Ionicons name="ios-search-outline" size={24} color="black" />
                }
            }}/>
            <Tab.Screen name="Profile" component={ProfilePage} options={{
                tabBarIcon: () => {
                    return <MaterialCommunityIcons name="human-greeting" size={24} color="black" />
                }
            }}/>
        </Tab.Navigator>
}

export default AppNavigator;