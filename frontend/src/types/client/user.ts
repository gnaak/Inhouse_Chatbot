import { UserInfo } from "../admin/user";
import { UserDirectoryProps } from "./directory";

//me 호출 시 넘어오는 데이터
export interface UserDetail {
  id: number;
  name: string;
  email: string;
  profile_image: string;
  department_full_name: string;
  created_at: string;
  last_login_at: string;
}

export interface ClientLayoutContext {
  user?: UserInfo;
  meData: UserDetail;
  directoryId: number | null;
  setDirectoryId: (id: number) => void;
  userDirectoryDatas: UserDirectoryProps[] | undefined;
  setNewDirectory: (v: boolean) => void;
}
