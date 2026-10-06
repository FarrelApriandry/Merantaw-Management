// src/lib/googleApi.ts
// Minimal typings for gapi-script (no @types available) — logic unchanged.
interface GapiAuthInstance {
  signIn(): Promise<void>;
  signOut(): void;
  currentUser: {
    get(): { getAuthResponse(): { access_token: string } };
  };
}

interface GapiClient {
  init(config: {
    apiKey: string;
    clientId: string;
    discoveryDocs: string[];
    scope: string;
  }): void;
  gmail: {
    users: {
      messages: {
        list(params: { userId: string; maxResults?: number }): Promise<{
          result: { messages?: { id: string }[] };
        }>;
        get(params: {
          userId: string;
          id: string;
          format: string;
          metadataHeaders: string[];
        }): Promise<{ result: unknown }>;
      };
    };
  };
  auth2: {
    getAuthInstance(): GapiAuthInstance;
  };
}

interface Gapi {
  load(modules: string, cb: () => void): void;
  client: GapiClient;
  auth2: GapiClient["auth2"];
}

let gapi: Gapi | undefined;

export const initGapi = async (): Promise<void> => {
    const mod = (await import("gapi-script")) as unknown as { gapi: Gapi };
    gapi = mod.gapi;
    gapi.load("client:auth2", () => {
        gapi!.client.init({
        apiKey: import.meta.env.PUBLIC_VITE_GOOGLE_API_KEY as string,
        clientId: import.meta.env.PUBLIC_VITE_GOOGLE_CLIENT_ID as string,
        discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"
        ],
        scope: "https://www.googleapis.com/auth/gmail.readonly"
        });
    });
};

export const signInGmail = async (): Promise<string> => {
    const GoogleAuth = gapi!.auth2.getAuthInstance();
    await GoogleAuth.signIn();
    const user = GoogleAuth.currentUser.get();
    const token = user.getAuthResponse().access_token;
    return token;
};

export const signOutGmail = (): void => {
    const GoogleAuth = gapi!.auth2.getAuthInstance();
    GoogleAuth.signOut();
};

// Ambil list message IDs
export const getEmailsList = async (
  maxResults = 10
): Promise<{ id: string }[]> => {
    const response = await gapi!.client.gmail.users.messages.list({
        userId: "me",
        maxResults
    });
    return response.result.messages || [];
};

// Ambil detail email berdasarkan ID
export const getEmailDetail = async (messageId: string): Promise<unknown> => {
    const response = await gapi!.client.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"]
    });
    return response.result;
};
