export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  email: string;
  nickname: string;
  accessToken: string;
  userId?: number;
}

export interface SignupRequet {
  email: string;
  password: string;
  nickname: string;
}
