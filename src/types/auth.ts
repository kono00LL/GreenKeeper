export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';
export type Gender = 'male' | 'female' | 'private';

export type User = {
  user_id: string;
  user_email: string;
  user_name: string;
  avatar_url: string | null;
  gender: Gender;
  created_time: string;
  status: number;
  last_login_at: string | null;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type AuthResponse = AuthTokens & {
  user: User;
};

export type UserResponse = {
  user: User;
};
