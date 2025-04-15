import { list } from "firebase/storage";

/*data held within the AlbumList Object

username
Display name
Password
Favorites
bio


*/
export class List {
  //maybe should pass in the JSON reponse and process the data. Then ReviewAPI getReviews can return a review
  constructor(
    id,
    userID,
    listName,
    date,
    listDescription,
    percentageListened,
    albumList,
    visible,
    likes,
    comments,
    uid
  ) {
    this.id = id;
    this.userID = userID;
    this.listName = listName;
    this.date = date;
    this.listDescription = listDescription;
    this.percentageListened = percentageListened;
    this.likes = likes;
    this.comments = comments;
    this.visible = visible;
    this.albumList = albumList;
    this.uid = uid;
  }
}
