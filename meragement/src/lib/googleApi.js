// src\lib\googleApi.js
let gapi;

export const initGapi = async () => {
    gapi = (await import("gapi-script")).gapi;
    gapi.load("client:auth2", () => {
        gapi.client.init({
        apiKey: import.meta.env.PUBLIC_VITE_GOOGLE_API_KEY,
        clientId: import.meta.env.PUBLIC_VITE_GOOGLE_CLIENT_ID,
        discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"
        ],
        scope: "https://www.googleapis.com/auth/gmail.readonly"
        });
    });
};

export const signInGmail = async () => {
    const GoogleAuth = gapi.auth2.getAuthInstance();
    await GoogleAuth.signIn();
    const user = GoogleAuth.currentUser.get();
    const token = user.getAuthResponse().access_token;
    return token;
};

export const signOutGmail = () => {
    const GoogleAuth = gapi.auth2.getAuthInstance();
    GoogleAuth.signOut();
};

// Ambil list message IDs
export const getEmailsList = async (maxResults = 10) => {
    const response = await gapi.client.gmail.users.messages.list({
        userId: "me",
        maxResults
    });
    return response.result.messages || [];
};

// Ambil detail email berdasarkan ID
export const getEmailDetail = async (messageId) => {
    const response = await gapi.client.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"]
    });
    return response.result;
};
