import { View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native'
import React from 'react'
import GetAlbumList from '../data/GetAlbumList'
import GetCoverArt from '../data/GetCoverArt'
import { auth } from '../config/firebase.js'
import { useNavigation } from '@react-navigation/native'
import { getAuth, signOut } from "firebase/auth";

const HomePage = () => {
    const navigation = useNavigation()
    const handleSignOut = () => {
        const auth = getAuth();
        signOut(auth).then(() => {
            navigation.replace("Login")
        }).catch((error) => {
            // An error happened.
        });
    }

    return (
        <View style={styles.container}>
            <Text>Home page</Text>
            <Text> Email: {auth.currentUser?.email}</Text>
            <TouchableOpacity
                onPress={handleSignOut}
                style={styles.button}>
                    <Text style={styles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
            <ScrollView style={styles}>
            {/* <GetCoverArt></GetCoverArt> */}
            </ScrollView>
            
            
        </View>
    )
}
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputContainer:{
      width: '80%'
    },
    input:{
      backgroundColor:'white',
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 40
    },
    buttonContainer:{
      width: '60%',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 40
    },
    buttonOutline:{
      backgroundColor: 'white',
      marginTop: 5,
      borderColor: '#0782F9',
      borderWidth: 2,
  
    },
    button:{
      backgroundColor: '#0782F9',
      width: '60%',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      
    },
    buttonText:{
      color:'white',
      fontWeight: '700',
      fontSize:16
    },
    buttonOutlineText:{
      color:'#0782F9',
      fontWeight: '700',
      fontSize:16
    } 
    
  });

export default HomePage;