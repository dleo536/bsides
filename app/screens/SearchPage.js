import { View, Text, TextInput, StyleSheet, Button, TouchableOpacity, TouchableHighlight, Pressable} from 'react-native'
import React, { useEffect, useState } from 'react';
import LastFmTopAlbums from '../api/LastFM';
import SpotifySetup from '../api/SpotifyAPI';
import AlbumList from '../api/AlbumList';

const SearchPage = () => {
    const [searchVal, setSearch] = useState('');
    const [searchType, setSearchType] = useState('');
    const [selectedButton, setSelectedButton] = useState(null);
      
    const handleButtonPress = (buttonIndex) => {
        setSelectedButton(buttonIndex);
    };
    
    const handleReturn = (event) => {
    
        //Create components that produce an Artist list, album list, etc

    };
    
    useEffect(() => {
        // const spotifyTestData = JSON.stringify(SpotifySetup(searchVal));
        // console.log(spotifyTestData)

        console.log(searchVal);
       
    });
   

    return (
        <View style={StyleSheet.container}>
            <View style={styles.inputContainer}>
                <TextInput
                placeholder='Search'
                value={searchVal}
                onChangeText={text => setSearch(text)}
                onKeyPress={(e) => handleReturn(e)}
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
            <View >
                <AlbumList SpotifyData = {searchVal} />
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
    
    
    
})

export default SearchPage;