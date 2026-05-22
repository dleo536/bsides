import "react-native-gesture-handler";

import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import StartupDiagnosticScreen from "./app/screens/StartupDiagnosticScreen";

const Stack = createNativeStackNavigator();
const USE_STARTUP_DIAGNOSTIC = false;

function LandingPage(props) {
  const Screen = require("./app/screens/LandingPage").default;
  return <Screen {...props} />;
}

function Welcome(props) {
  const Screen = require("./app/screens/Welcome").default;
  return <Screen {...props} />;
}

function SignInScreen(props) {
  const Screen = require("./app/screens/SignInScreen").default;
  return <Screen {...props} />;
}

function SignUpScreen(props) {
  const Screen = require("./app/screens/SignUpScreen").default;
  return <Screen {...props} />;
}

function SignUpDetailsScreen(props) {
  const Screen = require("./app/screens/SignUpDetailsScreen").default;
  return <Screen {...props} />;
}

function ProfilePicturePage(props) {
  const Screen = require("./app/screens/ProfilePicture").default;
  return <Screen {...props} />;
}

function LegalSupportScreen(props) {
  const Screen = require("./app/screens/LegalSupportScreen").default;
  return <Screen {...props} />;
}

export default function FullApp() {
  if (USE_STARTUP_DIAGNOSTIC) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Startup Diagnostic">
            <Stack.Screen
              options={{ headerShown: false }}
              name="Startup Diagnostic"
              component={StartupDiagnosticScreen}
            ></Stack.Screen>
            <Stack.Screen
              options={{ headerShown: false }}
              name="Landing"
              component={LandingPage}
            ></Stack.Screen>
            <Stack.Screen
              options={{ headerShown: false }}
              name="Welcome"
              component={Welcome}
            ></Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Landing">
          <Stack.Screen
            options={{ headerShown: false }}
            name="Landing"
            component={LandingPage}
          ></Stack.Screen>
          <Stack.Screen
            options={{ headerShown: false }}
            name="Welcome"
            component={Welcome}
          ></Stack.Screen>
          <Stack.Screen
            options={{ headerShown: false }}
            name="Sign Up"
            component={SignUpScreen}
          ></Stack.Screen>
          <Stack.Screen
            options={{ headerShown: false }}
            name="User Details"
            component={SignUpDetailsScreen}
          ></Stack.Screen>
          <Stack.Screen
            options={{ headerShown: false }}
            name="Sign In"
            component={SignInScreen}
          ></Stack.Screen>
          <Stack.Screen
            name="Profile Picture"
            component={ProfilePicturePage}
            options={{
              headerShown: false,
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="LegalSupport"
            component={LegalSupportScreen}
            options={{
              title: "Privacy, Safety & Support",
              headerBackTitle: "Back",
              headerBackTitleStyle: { fontSize: 10 },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
