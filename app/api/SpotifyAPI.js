import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Image } from 'react-native';
import axios from 'axios';

const CLIENT_ID = "35328aeb78ec43cbbb12afc948cdc687";
const SECRET = "e284561d79744d4db2086e526e9d15d0" 
const redirectUrl = 'eg:http://localhost:8080'; 

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'user-read-private user-read-email';



const SpotifySetup = ({ artist }) => {
    console.log("You are searching " + artist);
    const [accessToken, setAccessToken] = useState("");
    const [albums, setAlbums] = useState("");
    
    useEffect(() => {
        //API access token
        var authParameters = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials&client_id=' + CLIENT_ID + '&client_secret=' + SECRET
        }
        fetch('https://accounts.spotify.com/api/token', authParameters)
        .then(result => result.json())
        .then(data => setAccessToken(data.access_token))

    }, [])

    async function search(){
        
        // Get request using search to get the Artist ID
        var aritstParameters = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        }
        var artistID = await fetch('https://api.spotify.com/v1/search?q=' + artist + '&type=artist', aritstParameters)
        .then(response => response.json())
        .then(data => { return data.artists.items[0].id })
        console.log("Artist ID is " + artistID);
        // Get request with the Artist ID grab all the albums from that artist
        var returnedAlbums = await fetch('https://api.spotify.com/v1/artists/' + artistID + '/albums', aritstParameters)
            .then(response => response.json())
            .then(data => {
                setAlbums(data.items);
            })
            //console.log(albums);
        //Display those albums to the user
    }
   search();
    //  const searchHelper = useCallback(search, [artist]);
    //  searchHelper();
return (albums)
//   return (
    
//     <View style={styles.container}>
//     <Text style={styles.title}>Top Albums for {artist}</Text>
//     <FlatList
//       data={albums}
//       keyExtractor={(item) => item.name}
//       renderItem={({ item }) => 
//       <View>
//       <Image source = {item.images[0]} style = {styles.image}></Image>    
//       <Text>{item.name}</Text>
//       <Text>{item.listeners}</Text>
//       </View>
  
  
// }

//     />
//   </View>
    
//   )
  
}

const styles = StyleSheet.create({
    container: {
      // flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
     
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    loading: {
      justifyContent: 'center',
    },
    image: {
      width: 50,
      height: 50
    }
  });

export default SpotifySetup;
// Call the function to fetch Cher's information