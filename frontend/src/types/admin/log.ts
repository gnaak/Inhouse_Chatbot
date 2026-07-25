export interface LogDetailProps {
  log_id: number;
  created_at: string;
  user_name: string;
  user_email: string;
  directory_name: string;
  version: string;
}

export interface DetailLogDataProps {
  type: string;
  id?: number;
  log_id?: number;
  question?: string;
  answer?: string;
  version?: string;
  created_at?: string;
  image_base64?: string;
  image_media_type?: string;
  image_key?: string;
}

interface LogDataProps {
  id: number;
  created_at: string;
  name: string;
  email: string;
  directory: string;
  version: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface LogDatasProps {
  log_list: LogDataProps[];
  total: number;
}
