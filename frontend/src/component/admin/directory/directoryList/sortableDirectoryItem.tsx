import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, PencilIcon, TrashIcon } from "lucide-react";

const SortableDirectoryItem = ({
  directory,
  idx,
  openEditModal,
  openDeleteModal,
  editTarget,
  activeId,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: directory.id,
      disabled: directory.id === 1, // ✅ 1번은 드래그 금지
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className="flex px-4">
      <div
        ref={setNodeRef}
        style={style}
        className={`relative group w-full flex flex-row justify-between border p-3 rounded-xl hover:border-gray-300 bg-adminMain
        ${editTarget === directory.id ? "border-gray-300" : ""}`}
        onClick={() => openEditModal(directory.id)}
      >
        {/* 🔥 좌측 hover 핸들 */}
        {directory.id !== 1 && (
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className={`absolute -left-3 top-1/2 -translate-y-1/2 z-20 transition cursor-grab bg-white border rounded-md p-1 shadow-sm
            ${
              activeId === directory.id
                ? "opacity-100"
                : activeId
                  ? "opacity-0"
                  : "opacity-0 group-hover:opacity-100"
            }            
            `}
          >
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>
        )}

        <div className="flex flex-row gap-3 items-center w-3/4">
          <div className="flex w-6 h-6 border items-center justify-center rounded-lg shrink-0">
            <span className="text-[12px]">{idx + 1}</span>
          </div>
          <span>{directory.name}</span>
        </div>

        <div
          className="w-1/4 flex flex-row gap-2 justify-end items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-6 h-6 border items-center justify-center rounded-lg shrink-0"
            onClick={() => openEditModal(directory.id)}
          >
            <PencilIcon className="w-3 h-3" />
          </button>

          {directory.id !== 1 && (
            <button
              className="flex w-6 h-6 border border-gray-300 items-center justify-center rounded-lg  shrink-0"
              onClick={() => openDeleteModal(directory.id)}
            >
              <TrashIcon className="w-3 h-3 text-errorColor" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SortableDirectoryItem;
