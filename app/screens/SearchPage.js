import { View, Text, TextInput, StyleSheet, Button, FlatList, Image, TouchableOpacity, TouchableHighlight, Pressable} from 'react-native'
import React, { useEffect, useState } from 'react';
import LastFmTopAlbums from '../api/LastFM';
import SpotifySetup from '../api/SpotifyAPI';
import AlbumList from '../api/AlbumList';

const CLIENT_ID = "35328aeb78ec43cbbb12afc948cdc687";
const SECRET = "e284561d79744d4db2086e526e9d15d0" 
const redirectUrl = 'eg:http://localhost:8080'; 

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'user-read-private user-read-email';


const SearchPage = () => {
    const [searchVal, setSearch] = useState('');
    const [searchType, setSearchType] = useState('');
    const [selectedButton, setSelectedButton] = useState(null);
    const [accessToken, setAccessToken] = useState("");
    const [albums, setAlbums] = useState("");
    
      
    const handleButtonPress = (buttonIndex) => {
        setSelectedButton(buttonIndex);
    };
    
    const handleReturn = (event) => {
       // const spotifyTestData = SpotifySetup('Cher');

    };
    
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
        search();
    });

    async function search(){
        
        // Get request using search to get the Artist ID
        var aritstParameters = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        }
        var artistID = await fetch('https://api.spotify.com/v1/search?q=' + searchVal + '&type=artist', aritstParameters)
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

    return (
        <View style={StyleSheet.container}>
            <View style={styles.inputContainer}>
                <TextInput
                placeholder='Search'
                value={searchVal}
                onChangeText={text => setSearch(text)}
                // onKeyPress={(e) => handleReturn(e)}
                style={styles.input}
                >
                </TextInput>
            </View>
            <View style={styles.searchButtonContainer}>
                {['Artist', 'Album', 'Song', 'Musician'].map((index) => (
                <View key={index} style={styles.searchButton}>
                 <Button
                    title={index}
                    onPress={() => handleButtonPress(index)}
                    color={selectedButton === index ? 'blue' : 'gray'}
                />
                
                </View>
                ))}
            </View>
            <View style = {styles.searchResults}>
                <Text style={styles.title}>Top Albums for Somone</Text>
                <FlatList
                data = {albums}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => 
                    <View>
                        <Image source = {item.images[0]} style = {styles.image}></Image>   
                        <Text>{item.name}</Text>
                        <Text>{item.listeners}</Text>
                    </View>
                }
    
                />
            </View>
            
        </View>
    )
}
const styles = StyleSheet.create({
    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    inputContainer:{
        width: '95%',
        paddingLeft: 20,
        paddingBottom: 10
    },
    input:{
        backgroundColor:'white',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 20
    },
    searchButtonContainer:{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButton:{
        color: 'black',
        paddingVertical: 5,
        paddingHorizontal: 10,
        
        borderRadius: 4
    },
    searchButtonText:{
        color: 'black',
        fontSize: 15,
        fontFamily: 'Cochin'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10

    },
    searchResults:{
        justifyContent: 'center',
        width: '95%',
        paddingLeft: 20

    },
    image: {
        width: 50,
        height: 50
    }
    
})

export default SearchPage;