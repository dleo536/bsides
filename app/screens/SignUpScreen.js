import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ImageBackground,
} from "react-native";
import { auth, db } from "../config/firebase";
import {
  getAuth,
  createUserWithEmailAndPassword,
  User,
  updateProfile,
} from "firebase/auth";
import HomePage from "./HomePage";
import { useNavigation } from "@react-navigation/native";
import { collection, doc, addDoc } from "firebase/firestore";
import ProfilePage from "./ProfilePage";
//import App from '../../App';

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigation.replace("Profile Picture");
      }
    });
    return unsubscribe;
  }, []);

  const handleSignUp = async () => {
    await createUserWithEmailAndPassword(auth, email, password)
      .then((cred) => {
        // console.log(cred.user.uid);
        const localUser = cred.user;
        updateProfile(auth.currentUser, {
          displayName: username,
        })
          .then(() => {
            // Profile updated!
            // ...
          })
          .catch((error) => {
            console.log(error);
          });
        if (localUser) {
          pushUsername(cred.user.uid);
          postUsername(localUser);
        }
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorMessage);
        // ..
      }); // after email and password are stored in auth. Push UID created and username to the users database
  };
  const pushUsername = async (theUID) => {
    //console.log("push User Name is getting called");
    const myCollectionData = {
      uid: theUID,
      username: username,
    };

    const docRef = await addDoc(
      collection(db, "newTestingDoc"),
      myCollectionData
    );
    console.log("Document written with ID: ", docRef.id);
    //add API call here
  };

  const postUsername = async (localUser) => {
    fetchData = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Temp",
        uid: localUser.uid,
        email: localUser.email,
        username: username,
        "profile-picture": null,
        "want-to-listen": [
          "cd76f76b-ff15-3784-a71d-4da3078a6851",
          "b1392450-e666-3926-a536-22c65f834433",
        ],
        followers: null,
        following: null,
        "liked-lists": null,
        "liked-posts": null,
      }),
    };
    try {
      const response = await fetch(
        "https://test1.bsidesdatapath.xyz/users",
        fetchData
      );
      const json = await response.json();
      console.log("Niceeee!!!!!!!");
    } catch (error) {
      console.error(error);
      console.log("This be throwing an error!");
    }
  };

  return (
    <View style={styles.container}>
      {/* <ImageBackground source = {{uri:"https://lamag.com/.image/c_limit%2Ccs_srgb%2Cq_auto:eco%2Cw_1050/MTk3NTU2NDY0MzQyMTQ4ODAy/vinyl-records-record-shops-los-angeles.webp"}} style = {{height: "100%", width: "100%"}}> */}
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <Text style={styles.bsides}>b-sides.</Text>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={(text) => setEmail(text)}
            style={styles.input}
          ></TextInput>

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={(text) => setPassword(text)}
            style={styles.input}
            secureTextEntry
          ></TextInput>

          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={(text) => setUsername(text)}
            style={styles.input}
          ></TextInput>
          <StatusBar style="auto" />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleSignUp}
            style={[styles.button, styles.buttonOutline]}
          >
            <Text style={styles.buttonOutlineText}>Register</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {/* </ImageBackground> */}
    </View>
  );
}

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
