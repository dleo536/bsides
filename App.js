import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./app/navigation/AppNavigator";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";


import './app/config/firebase';
import Welcome from "./app/screens/Welcome";
import SignInScreen from "./app/screens/SignInScreen";
import HomePage from "./app/screens/HomePage";
import SignUpScreen from "./app/screens/SignUpScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen options={{headerShown: false}} name="Login" component={SignInScreen}></Stack.Screen>
          <Stack.Screen  options={{headerShown: false}} name="Welcome" component={Welcome}></Stack.Screen>
          <Stack.Screen  options={{headerShown: false}} name="Sign Up" component={SignUpScreen}></Stack.Screen>
          
        </Stack.Navigator>
        
        
      </NavigationContainer>
      // <NavigationContainer>
      //   <AppNavigator></AppNavigator>
      // </NavigationContainer>
   
  );
}

