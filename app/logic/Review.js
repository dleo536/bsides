export class Review {
  //maybe should pass in the JSON reponse and process the data. Then ReviewAPI getReviews can return a review
  constructor(
    id,
    userID,
    albumID,
    albumName,
    date,
    rating,
    reviewBody,
    likes,
    comments,
    visible,
    albumCover,
    artistName,
    username
  ) {
    this.id = id;
    this.albumID = albumID;
    this.rating = rating;
    this.userID = userID;
    this.date = date;
    this.reviewBody = reviewBody;
    this.likes = likes;
    this.comments = comments;
    this.visible = visible;
    this.albumName;
    this.albumCover;
    this.artistName;
    this.username;
  }
}
