import { View, Text, StyleSheet} from 'react-native'
import React from 'react'
import { initializeApp } from "@firebase/app";
import { getFirestore } from "firebase/firestore";
import { collection, addDoc } from "firebase/firestore"; 
import '@firebase/auth'
import { app } from '../config/firebase';
import { auth } from '../config/firebase'
import { getAuth, onAuthStateChanged, User } from "firebase/auth";


const ProfilePage = () => {
    
    const db = getFirestore(app);

    return (
        <View style={StyleSheet.container}>
            <Text>Profile page</Text>
            <Text> Email: {auth.currentUser?.email}</Text>
            <Text> Welcome {auth.currentUser?.displayName}</Text>

        </View>
    )
}
const styles = StyleSheet.create({
    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
})

export default ProfilePage;