import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, UserPlus, X } from '@teable/icons';
import type { IGetDepartmentVo } from '@teable/openapi';
import { getDepartmentList, getDepartmentUsers } from '@teable/openapi';
import { UserAvatar } from '@teable/sdk/components';
import { ReactQueryKeys } from '@teable/sdk/config';
import { Button } from '@teable/ui-lib/shadcn';
import { useState } from 'react';

interface IDepartmentTreeNodeProps {
  department: IGetDepartmentVo;
  depth: number;
  onRename: (department: { id: string; name: string }) => void;
  onDelete: (department: { id: string; name: string }) => void;
  onAddSubDepartment: (parentId: string) => void;
  onAddMember: (departmentId: string) => void;
  onRemoveMember: (departmentId: string, userId: string) => void;
}

export const DepartmentTreeNode = (props: IDepartmentTreeNodeProps) => {
  const { department, depth, onRename, onDelete, onAddSubDepartment, onAddMember, onRemoveMember } =
    props;
  const [expanded, setExpanded] = useState(false);
  const indent = 12 + depth * 20;

  const { data: children } = useQuery({
    queryKey: ReactQueryKeys.getDepartmentList({ parentId: department.id }),
    queryFn: () => getDepartmentList({ parentId: department.id }).then((res) => res.data),
    enabled: expanded,
  });
  const { data: memberData } = useQuery({
    queryKey: ReactQueryKeys.getDepartmentUsers({ departmentId: department.id }),
    queryFn: () => getDepartmentUsers({ departmentId: department.id }).then((res) => res.data),
    enabled: expanded,
  });

  return (
    <div>
      <div
        className="group flex items-center justify-between py-2 pr-3 text-sm hover:bg-accent"
        style={{ paddingLeft: indent }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{department.name}</span>
        </button>
        <div className="hidden shrink-0 gap-1 group-hover:flex">
          <Button
            size="xs"
            variant="ghost"
            title="Add sub-department"
            onClick={() => onAddSubDepartment(department.id)}
          >
            <Plus className="size-3.5" />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            title="Add member"
            onClick={() => onAddMember(department.id)}
          >
            <UserPlus className="size-3.5" />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            title="Rename"
            onClick={() => onRename({ id: department.id, name: department.name })}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            title="Delete"
            onClick={() => onDelete({ id: department.id, name: department.name })}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div>
          {memberData?.users.map((user) => (
            <div
              key={user.id}
              className="group flex items-center justify-between py-1.5 pr-3"
              style={{ paddingLeft: indent + 20 }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar name={user.name} avatar={user.avatar} />
                <span className="truncate text-sm">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <Button
                size="xs"
                variant="ghost"
                className="hidden group-hover:flex"
                onClick={() => onRemoveMember(department.id, user.id)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
          {memberData?.users.length === 0 && children?.length === 0 && (
            <div
              className="py-1.5 text-xs text-muted-foreground"
              style={{ paddingLeft: indent + 20 }}
            >
              Empty
            </div>
          )}
          {children?.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              department={child}
              depth={depth + 1}
              onRename={onRename}
              onDelete={onDelete}
              onAddSubDepartment={onAddSubDepartment}
              onAddMember={onAddMember}
              onRemoveMember={onRemoveMember}
            />
          ))}
        </div>
      )}
    </div>
  );
};
