export const getUsernameByUID = async (userID) => {
  let json;
  fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `https://test1.bsidesdatapath.xyz/users/${userID}`
    );
    json = await response.json();
    console.log("Log from USER API:", json.username);

    return json.username;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};

export const getUserByUsername = async (username) => {
  let json;
  fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `https://test1.bsidesdatapath.xyz/users/${username}`
    );
    json = await response.json();
    console.log("Log from USER API:", json.username);

    return json.username;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
