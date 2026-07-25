import DirectoryEditArea from "@/component/admin/directory/directoryEdit/editArea";
import DirectoryListArea from "@/component/admin/directory/directoryList/listArea";
import Loading from "@/component/common/loading";
import { useGet } from "@/hooks/common/useAPI";
import { DirectoryDetailProps, DirectoryProps } from "@/types/admin/directory";
import { useEffect, useState } from "react";

const defaultProps: DirectoryDetailProps = {
  id: 0,
  name: "",
  gpt_version: "gpt-5.4-mini",
  learning_type: "text",
  learning_text: "",
  learning_files: [],
  greeting_message: "",
  instructions: "",
  fallback_message: "",
};

const AdminDirectory = () => {
  const [editTarget, setEditTarget] = useState<number>(-1);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [savedDirectory, setSavedDirectory] =
    useState<DirectoryDetailProps>(defaultProps);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { data: directoryDetail, isLoading: loadingData } =
    useGet<DirectoryDetailProps>(
      `api/directory/directory_detail?id=${editTarget}`,
      ["directoryDetail", editTarget],
      editTarget !== -1,
    );

  const { data: directories } = useGet<DirectoryProps[]>(
    "api/directory/directory_list",
    ["directories"],
  );

  useEffect(() => {
    if (directoryDetail) {
      setSavedDirectory(directoryDetail);
    }
  }, [directoryDetail]);

  return (
    <>
      <div className="flex flex-row h-full px-5 gap-5">
        <DirectoryListArea
          directories={directories}
          editTarget={editTarget}
          setEditTarget={setEditTarget}
          setIsEdit={setIsEdit}
          setSavedDirectory={setSavedDirectory}
          isNew={isNew}
          setIsNew={setIsNew}
          setIsLoading={setIsLoading}
          defaultProps={defaultProps}
        />
        {isEdit && (
          <DirectoryEditArea
            savedDirectory={savedDirectory}
            setSavedDirectory={setSavedDirectory}
            setEditTarget={setEditTarget}
            setIsEdit={setIsEdit}
            setIsNew={setIsNew}
            setIsLoading={setIsLoading}
            total={directories.length}
          />
        )}
      </div>
      {(isLoading || loadingData) && <Loading />}
    </>
  );
};

export default AdminDirectory;
