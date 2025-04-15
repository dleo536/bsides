import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { initializeApp } from "@firebase/app";
import { getFirestore } from "firebase/firestore";
import { collection, addDoc } from "firebase/firestore";
import "@firebase/auth";
import { updateProfile } from "firebase/auth";
import { app } from "../config/firebase";
import { auth } from "../config/firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ProfilePicturePage = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState(null);
  const storage = getStorage();
  //const auth = getAuth();

  const pickImage = async () => {
    // submit image to firebase and if submission then redirect to welcome
    //const [image, setImage] = (useState < string) | (null > null);
    console.log("THis is being called");
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
    //console.log(result.assets[0].uri);
  };

  const uploadImage = async () => {
    if (!image) return;

    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const user = auth.currentUser;
      //console.log(user.id);
      const storageRef = ref(storage, `profileImages/${user.uid}`);
      // console.log(storageRef);
      try {
        await uploadBytes(storageRef, blob).then((snapshot) => {
          console.log("Uploaded a blob or file!");
        });
      } catch (error) {
        Alert.alert("Upload error", error.message);
      }
      //console.log(storageRef);

      const downloadURL = await getDownloadURL(storageRef);
      console.log(auth.currentUser);

      await updateProfile(user, { photoURL: downloadURL }).catch((error) => {
        console.error("Update unsuccessful:", error.code, error.message);
      });
      console.log("Updated Profile!");
      await user.reload();
      console.log("User Reloaded");
      navigation.replace("Welcome");

      //Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };
  const handleSkip = async () => {
    // submit default profilePicture to firebase and then redirect to Welcome
    updateProfile(auth.currentUser, {
      photoURL:
        "/Users/dannyleo/Workspace/b-sides/assets/defaultProfilePicture.png",
    })
      .then(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            navigation.replace("Welcome");
          }
        });
        return unsubscribe;
      })
      .catch((error) => {
        console.log(error);
      });
  };

  return (
    <View style={StyleSheet.container}>
      <Text style={styles.bsides}>b-sides.</Text>
      <Text style={styles.bsides}>Add a Profile Picture!</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={pickImage}
          style={[styles.button, styles.buttonOutline]}
        >
          <Text style={styles.buttonOutlineText}>Select Image</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={uploadImage}
          style={[styles.button, styles.buttonOutline]}
        >
          <Text style={styles.buttonOutlineText}>Upload Image</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSkip}
          disabled={!image}
          style={[styles.button, styles.buttonOutline]}
        >
          <Text style={styles.buttonOutlineText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#fff',
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff8a2",
  },
  bsides: {
    fontSize: 40,
    color: "grey",
    opacity: 0.9,
  },
  image: {
    resizeMode: "contain",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  inputContainer: {
    width: "80%",
  },
  input: {
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 40,
    width: 300,
    background:
      "linear-gradient(to right, rgba(255, 255, 255, 1), rgba(0, 0, 255, 0))",
  },
  buttonContainer: {
    width: "60%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  buttonOutline: {
    backgroundColor: "white",
    marginTop: 5,
    borderColor: "#0782F9",
    borderWidth: 2,
  },
  button: {
    backgroundColor: "#0782F9",
    width: "100%",
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  buttonOutlineText: {
    color: "#0782F9",
    fontWeight: "700",
    fontSize: 16,
  },
});
export default ProfilePicturePage;
