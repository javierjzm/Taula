export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  preferredLang: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
