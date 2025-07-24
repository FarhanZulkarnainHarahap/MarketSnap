import { Profile } from "passport";

export interface GoogleProfileWithToken extends Profile {
  accessToken: string;
  id: string;
  displayName: string;
  emails: { value: string }[];
  photos: { value: string }[];
  name: {
    givenName: string;
    familyName: string;
  };
  _json: any;
  _raw: string;
}
