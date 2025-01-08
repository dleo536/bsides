import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Image } from 'react-native';
import axios from 'axios';


const AlbumList = ({SpotifyData}) =>{
  console.log(SpotifyData)

    return(
        <View style={styles.container}>
        <Text style={styles.title}>Top Albums for Somone</Text>
        
        <FlatList
          
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => 
          <View>
          {/* <Image source = {item.images[0]} style = {styles.image}></Image>     */}
          <Text>{item.name}</Text>
          <Text>{item.listeners}</Text>
          </View>
      
      
    }
    
        />
      
      </View>
    )

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

  export default AlbumList;