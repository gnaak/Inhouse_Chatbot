export interface UserDirectoryProps {
  id: number;
  name: string;
  status: string;
  checked: boolean;
}

export interface MessageProps {
  type: string;
  message: string;
  imageUrl?: string;
  imageUrls?: string[];
  pdfName?: string;
  pdfNames?: string[];
  fileNames?: string[];
  docFiles?: { name: string; url: string }[];
  created_at: string;
  isLoading?: boolean;
  isBuildingFile?: boolean;
  thinking?: string;
  isThinking?: boolean;
}
