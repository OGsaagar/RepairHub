export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "customer" | "repairer" | "admin";
  profile_status: "pending" | "active" | "suspended";
};

export type AuthTokens = {
  access: string;
  refresh: string;
  user: AuthUser;
};
