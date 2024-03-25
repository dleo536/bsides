import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Image } from 'react-native';
import axios from 'axios';


const LastFmTopAlbums = ({ artist }) => {
  const [topAlbums, setTopAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopAlbums = async () => {
      try {
        const response = await axios.get(
          `http://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(artist)}&api_key=8ec7720d4fa791eb84d96e96a64130c5&format=json`
        );
        setTopAlbums(response.data.results.artistmatches.artist);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching top albums:', error);
        setLoading(false);
      }
    };

    fetchTopAlbums();
  }, [artist]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    
    <View style={styles.container}>
      <Text style={styles.title}>Top Albums for {artist}</Text>
      <FlatList
        data={topAlbums}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => 
        <View>
        <Image source = {{uri: ""}} style = {styles.image}></Image>    
        <Text>{item.name}</Text>
        <Text>{item.listeners}</Text>
        </View>
    
    }

      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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

export default LastFmTopAlbums;