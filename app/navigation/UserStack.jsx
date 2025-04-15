import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomePage from '../screens/HomePage';
import AlbumPage from '../screens/AlbumPage';
import ArtistPage from '../screens/ArtistPage';
import SearchStack from './AppNavigator';

const Stack = createStackNavigator();

export default function UserStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomePage} />
        <Stack.Screen name="AlbumPage" component={AlbumPage}/>
        <Stack.Screen name="ArtistPage" component={ArtistPage}/>
        <Stack.Screen name="SearchStack" component={SearchStack}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}