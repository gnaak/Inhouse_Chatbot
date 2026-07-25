import { UserInfo } from "./admin/user";

export type AuthContextType = {
  user: UserInfo | null;
  isLoading: boolean;
  setUser: (user: UserInfo | null) => void;
};
