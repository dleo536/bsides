import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../config/firebase";

import DefaultImage from "/Users/dannyleo/Workspace/b-sides/assets/ChatGPT Image Apr 2, 2025, 09_32_29 PM.png";
import bsideImage from "/Users/dannyleo/Workspace/b-sides/assets/Color logo - no background.png";

export default function LandingPage() {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigation.replace("Welcome");
      }
    });
    return unsubscribe;
  }, []);

  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={DefaultImage}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.content}>
        <View style={styles.contentHeader}>
          <Image source={bsideImage} style={styles.bsideImage} />
          <Text style={styles.text}>What albums did you listen to today?</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            navigation.navigate("Sign In");
          }}
        >
          <View style={styles.button}>
            <Text style={styles.buttonText}>Sign In</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate("Sign Up");
          }}
        >
          <View style={styles.button}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff8a2",
  },
  title: {
    fontSize: 28,
    fontWeight: "500",
    color: "#281b52",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 40,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "400",
    color: "#9992a7",
    textAlign: "center",
  },
  /** Hero */
  hero: {
    backgroundColor: "#fff8a2",
    margin: 12,
    borderRadius: 16,
    padding: 16,
  },
  heroImage: {
    width: "100%",
    height: 400,
  },
  bsideImage: {
    height: 60,
    width: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  /** Content */
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  contentHeader: {
    // paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    backgroundColor: "#fff2dd",
    transform: [
      {
        rotate: "-5deg",
      },
    ],
    paddingHorizontal: 6,
  },
  appNameText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#281b52",
  },
  /** Button */
  button: {
    backgroundColor: "#56409e",
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
  },
});
