import React, { useEffect, useState } from 'react';
import { View, Image, Text } from 'react-native';
import axios from 'axios';

const GetCoverArt = () => {
  const [coverArtUrl, setCoverArtUrl] = useState(null);
  const artistId = 'Portishead'; // Replace with the actual MusicBrainz ID of the artist you are interested in
  console.log("This is working!!!!");
  useEffect(() => {
    const fetchCoverArt = async () => {
      try {
        // Fetching the release data to get the cover art ID
        
        const releaseResponse = await axios.get(
          `http://musicbrainz.org/ws/2/release-group/?query=artist:${artistId}`
        );
        console.log(releaseResponse.data);
        //const something = releaseResponse.data["releases-groups"][1].id;
        //console.log(something);

        if (releaseResponse.data != 0) {
          //const releaseId = releaseResponse.data.releases-groups[0].id;
           
          // Fetching the cover art data using the release ID
          const coverArtResponse = await axios.get(
            `https://coverartarchive.org/release-group/48140466-cff6-3222-bd55-63c27e43190d`
          );

          // Handle the response data
          setCoverArtUrl(coverArtResponse.data.images[0]?.image);
        } else {
          console.error('No releases found for the artist.');
        }
      } catch (error) {
        // Handle errors
        console.error('Error fetching cover art:', error);
      }
    };

    fetchCoverArt();
  }, [artistId]);

  return (
    <View>
      {coverArtUrl ? (
        <Image
          source={{ uri: coverArtUrl }}
          style={{ width: 150, height: 150 }}
        />
      ) : (
        <Text>No cover art available.</Text>
      )}
    </View>
  );
};

export default GetCoverArt;
