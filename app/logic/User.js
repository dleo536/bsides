

class User {
    // constructor(username, displayName, biography, accountType, favorites, profilePicture, followers, following) {
    //   this.username = username;
    //   this.displayName = displayName;
    //   this.biography = biography;
    //   this.accountType = accountType;
    //   this.favorites = favorites;
    //   this.profilePicture = profilePicture;
    //   this.followers = followers;
    //   this.following = following; // Array to store reviews
    // }

    async getUsername(userID){
      let json
      fetchData = {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
      try {
        const response = await fetch(
          'https://test1.bsidesdatapath.xyz/users/' + userID, fetchData
        );
        json = await response.json();
        console.log("Niceeee!!!!!!!")
        console.log
        setReviews(json)
      } catch (error) {
        console.error(error);
        console.log("This be throwing an error!")
      }
    }
}