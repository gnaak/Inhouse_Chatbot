export type DepartmentType = "hq" | "division" | "team" | "group" | "part";

export interface DepartmentProps {
  id: number;
  name: string;
  type: DepartmentType;
  parent_id: number | null;
}

export interface DepartmentNode extends DepartmentProps {
  children: DepartmentNode[];
}

export const buildDepartmentTree = (
  data: DepartmentProps[],
): DepartmentNode[] => {
  const map = new Map<number, DepartmentNode>();
  const roots: DepartmentNode[] = [];

  data.forEach((item) => {
    map.set(item.id, {
      ...item,
      children: [],
    });
  });

  data.forEach((item) => {
    const node = map.get(item.id)!;

    if (item.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(item.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  return roots;
};
