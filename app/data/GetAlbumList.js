import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import axios from 'axios';

const GetAlbumList = () => {
  const [artistData, setArtistData] = useState(null);
  const artistId = 'a74b1b7f-71a5-4011-9441-d0b5e4122711'; // Replace with the actual MusicBrainz ID of the artist you are interested in

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const response = await axios.get(
          `http://musicbrainz.org/ws/2/artist/${artistId}?inc=release-groups&fmt=json`
        );

        // Handle the response data
        setArtistData(response.data);
      } catch (error) {
        // Handle errors
        console.error('Error fetching data:', error);
      }
    };

    fetchArtistData();
  }, [artistId]);

  return (
    <View>
      {artistData ? (
        <Text>{JSON.stringify(artistData, null, 2)}</Text>
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
};

export default GetAlbumList;