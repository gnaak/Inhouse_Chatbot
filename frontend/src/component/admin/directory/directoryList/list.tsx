import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePost } from "@/hooks/common/useAPI";
import Modal from "@/component/common/feedback/modal";
import warningIcon from "@/assets/admin/warning.svg";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import { DndContext, closestCenter } from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import SortableDirectoryItem from "./sortableDirectoryItem";

const DirectoryList = ({
  directoryList,
  openEditModal,
  editTarget,
  setIsLoading,
}) => {
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState(0);
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const openDeleteModal = (id) => {
    setDeleteTarget(id);
    setIsDeleteModal(true);
  };

  const { mutate: deleteDirectory } = usePost("api/directory/delete_directory");

  const deleteConfirm = () => {
    if (!deleteTarget) return;

    setIsLoading(true);

    deleteDirectory(
      { id: deleteTarget },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["directories"] });
          setIsDeleteModal(false);
          setDeleteTarget(0);
          setIsLoading(false);
        },
      },
    );
  };

  const sortWithFixedTop = (list) => {
    return [
      ...list.filter((d) => d.id === 1),
      ...list.filter((d) => d.id !== 1),
    ];
  };

  const [items, setItems] = useState(sortWithFixedTop(directoryList || []));

  useEffect(() => {
    setItems(sortWithFixedTop(directoryList || []));
  }, [directoryList]);

  const reorderMutation = usePost("api/directory/reorder");

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 🔥 1번은 절대 이동 불가
    if (active.id === 1 || over.id === 1) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const moved = arrayMove(items, oldIndex, newIndex);
    const sorted = sortWithFixedTop(moved);

    setItems(sorted);

    const reordered = sorted.map((item, index) => ({
      id: item.id,
      order: index + 1,
    }));

    reorderMutation.mutate(
      {
        reordered: reordered,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["directories"] });
        },
      },
    );
  };

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={(event) => setActiveId(event.active.id)}
        onDragEnd={(event) => {
          setActiveId(null);
          handleDragEnd(event);
        }}
      >
        <SortableContext
          items={items.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 w-full text-sm h-fit max-h-[580px] overflow-y-auto">
            {items.map((directory, idx) => (
              <SortableDirectoryItem
                key={directory.id}
                directory={directory}
                idx={idx}
                openEditModal={openEditModal}
                openDeleteModal={openDeleteModal}
                editTarget={editTarget}
                activeId={activeId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Modal
        open={isDeleteModal}
        buttonCount={2}
        title="디렉토리 삭제"
        description={
          <div className="flex flex-col">
            <span>선택한 디렉토리를 삭제하면 해당 디렉토리에 연결된</span>
            <span>모든 설정과 데이터가 즉시 삭제됩니다.</span>
          </div>
        }
        secondaryText="취소"
        onPrimary={deleteConfirm}
        onClose={() => setIsDeleteModal(false)}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <img src={warningIcon} alt="" />
          </div>
        }
      />
    </>
  );
};

export default DirectoryList;
