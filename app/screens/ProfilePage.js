import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  FlatList,
  RefreshControl,
} from "react-native";

import React, { useEffect, useState } from "react";
import { initializeApp } from "@firebase/app";
import { getFirestore } from "firebase/firestore";
import { collection, addDoc } from "firebase/firestore";
import "@firebase/auth";
import { app } from "../config/firebase";
import { auth } from "../config/firebase";
import { getAuth, signOut } from "firebase/auth";

import defaultProfileImage from "/Users/dannyleo/Workspace/b-sides/assets/defaultProfilePicture.png";
import { getListByUID, postList } from "../api/ListAPI";
import ListElement from "../components/listElement";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

const ProfilePage = () => {
  const db = getFirestore(app);
  const profileImage = auth.currentUser.photoURL;
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [lists, setLists] = useState([]);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  //get users lists

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        navigation.replace("Login");
      })
      .catch((error) => {
        // An error happened.
      });
  };
  const createNewList = async () => {
    await postList(auth.currentUser.uid, listDescription, listName);
    setListModalVisible(false);
    setListName("");
    setListDescription("");
  };
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchUserLists().then(() => {
      setRefreshing(false);
    });
  }, []);
  const fetchUserLists = async () => {
    const response = await getListByUID(auth.currentUser.uid);
    setLists(response);
  };
  //create new list
  useEffect(() => {
    fetchUserLists();
  }, []);
  //get users reviews

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.container}>
            <Modal
              animationType="slide"
              transparent={true}
              visible={listModalVisible}
              onRequestClose={() => {
                Alert.alert("Modal has been closed.");
                setListModalVisible(!listModalVisible);
              }}
            >
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <Text style={styles.modalText}>Create a List!</Text>
                  <TextInput
                    placeholder="List Name"
                    value={listName}
                    onChangeText={(text) => setListName(text)}
                    style={styles.input}
                  ></TextInput>
                  <TextInput
                    placeholder="List Description"
                    value={listDescription}
                    onChangeText={(text) => setListDescription(text)}
                    style={styles.input}
                  ></TextInput>
                  <Pressable
                    style={[styles.button, styles.buttonClose]}
                    onPress={() => createNewList(listName, listDescription)}
                  >
                    <Text style={styles.textStyle}>Create List</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.buttonClose]}
                    onPress={() => setListModalVisible(false)}
                  >
                    <Text style={styles.textStyle}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
            <View style={styles.profileBody}>
              <Image
                source={{ uri: profileImage }}
                style={styles.image}
              ></Image>

              <Text style={styles.welcome}>
                {" "}
                Welcome {auth.currentUser?.displayName}
              </Text>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => setListModalVisible(true)}
              >
                <Text>Create List</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => handleSignOut()}
              >
                <Text>Sign Out</Text>
              </Pressable>

              {/* <Text>{reviews}</Text>  */}
              <View style={styles.lists}>
                {lists && lists.length > 0 ? (
                  <FlatList
                    data={lists}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ListElement list={item} />}
                    style={styles.listElement}
                  />
                ) : (
                  <Text style={styles.noListsText}>No Lists Created Yet</Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    alignContent: "center",
    justifyContent: "center",
  },
  image: {
    width: "40%",
    height: "20%",
    borderRadius: 5,
    padding: 10,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 40,

    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  itemText: {
    fontSize: 16,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRadius: 2,
  },
  button: {
    padding: 10,
    width: "50%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderBottomWidth: 1,
    borderBottomColor: "purple",
    borderTopColor: "black",
  },
  lists: {
    width: "90%",

    borderWidth: 1,
  },
  scrollView: {
    flexGrow: 1,
    alignContent: "center",
    justifyContent: "center",
  },
  profileBody: {
    flex: 1,
    alignItems: "center",
  },
  welcome: {
    padding: 10,
  },
});

export default ProfilePage;
