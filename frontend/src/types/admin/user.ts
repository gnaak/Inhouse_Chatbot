import { DirectoryProps } from "./directory";

// user_info 토큰 타입
export interface UserInfo {
  id: number;
  auth_type: string;
  user_nickname: string;
  created_at: string;
}

export interface UserDirectory {
  name: string;
  status: string;
  created_at: string;
  approved_at: string;
}

export interface UserModelItem {
  model_id: number;
  value: string;
  label: string;
  type: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  department: string;
  request: UserDirectory[];
  status: string;
  model_list?: UserModelItem[];
}

export interface UserDatas {
  total: number;
  user_list: UserData[];
}

export interface RequestData {
  id: number;
  user_id: number;
  name: string;
  department: string;
  department_full_name: string;
  email: string;
  type: string;
  status: string;
  directories: DirectoryProps[];
  created_at: string;
  approved_at: string;
}

export interface RequestDatas {
  waiting_total: number;
  total: number;
  condition_total: number;
  request_list: RequestData[];
}

export interface RequestDetail {
  type: string;
  directory: DirectoryProps[];
}
