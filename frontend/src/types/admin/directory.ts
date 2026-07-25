export interface DirectoryProps {
  id: number;
  name: string;
}

export interface LearningFilesProps {
  id: number;
  file_name: string;
  file_id: string;
  file_size: number;
  s3_key?: string | null;
}

export interface DirectoryDetailProps extends DirectoryProps {
  gpt_version: string;
  learning_type: string;
  learning_text: string;
  learning_files: LearningFilesProps[];
  greeting_message: string;
  instructions: string;
  fallback_message: string;
}
