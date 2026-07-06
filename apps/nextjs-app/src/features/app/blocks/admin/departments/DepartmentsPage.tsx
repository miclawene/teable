import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HttpError } from '@teable/core';
import { Plus } from '@teable/icons';
import {
  addDepartmentMember,
  createDepartment,
  deleteDepartment,
  getDepartmentList,
  removeDepartmentMember,
  updateDepartment,
} from '@teable/openapi';
import type { IMemberSelectorDialogRef, ISelectedMember } from '@teable/sdk/components';
import { MemberSelectorDialog, MemberSelectorNodeType } from '@teable/sdk/components';
import { ReactQueryKeys } from '@teable/sdk/config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  useToast,
} from '@teable/ui-lib/shadcn';
import { useRef, useState } from 'react';
import { DepartmentTreeNode } from './DepartmentTreeNode';

export const DepartmentsPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const memberSelectorRef = useRef<IMemberSelectorDialogRef>(null);

  const [activeDepartmentId, setActiveDepartmentId] = useState<string>();
  const [createParentId, setCreateParentId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string }>();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string }>();
  const [nameInput, setNameInput] = useState('');

  const { data: rootDepartments } = useQuery({
    queryKey: ReactQueryKeys.getDepartmentList({}),
    queryFn: () => getDepartmentList({}).then((res) => res.data),
  });

  const invalidateDepartments = () =>
    queryClient.invalidateQueries({ queryKey: ['department-list'] });
  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: ['department-users'] });

  const { mutate: createDepartmentMutation } = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      createDepartment({ name, parentId }),
    onSuccess: () => {
      invalidateDepartments();
      setCreateOpen(false);
      setNameInput('');
    },
  });

  const { mutate: renameDepartmentMutation } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateDepartment(id, { name }),
    onSuccess: () => {
      invalidateDepartments();
      setRenameTarget(undefined);
    },
  });

  const { mutate: deleteDepartmentMutation } = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      invalidateDepartments();
      setDeleteTarget(undefined);
    },
    onError: (error: HttpError) => {
      toast({
        title: 'Could not delete department',
        description: error.message,
        variant: 'destructive',
      });
      setDeleteTarget(undefined);
    },
  });

  const { mutate: addMemberMutation } = useMutation({
    mutationFn: async (members: ISelectedMember[]) => {
      if (!activeDepartmentId) return;
      await Promise.all(
        members
          .filter((member) => member.type === MemberSelectorNodeType.USER)
          .map((member) => addDepartmentMember(activeDepartmentId, { userId: member.id }))
      );
    },
    onSuccess: invalidateMembers,
  });

  const { mutate: removeMemberMutation } = useMutation({
    mutationFn: ({ departmentId, userId }: { departmentId: string; userId: string }) =>
      removeDepartmentMember(departmentId, userId),
    onSuccess: invalidateMembers,
  });

  const openCreateDialog = (parentId?: string) => {
    setCreateParentId(parentId);
    setNameInput('');
    setCreateOpen(true);
  };

  const openAddMemberDialog = (departmentId: string) => {
    setActiveDepartmentId(departmentId);
    memberSelectorRef.current?.open();
  };

  return (
    <div className="flex size-full flex-1 flex-col gap-4 overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">Departments</span>
        <Button size="sm" variant="outline" onClick={() => openCreateDialog(undefined)}>
          <Plus className="mr-1 size-4" />
          New department
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border">
        {rootDepartments?.map((department) => (
          <DepartmentTreeNode
            key={department.id}
            department={department}
            depth={0}
            onRename={(target) => {
              setRenameTarget(target);
              setNameInput(target.name);
            }}
            onDelete={setDeleteTarget}
            onAddSubDepartment={openCreateDialog}
            onAddMember={openAddMemberDialog}
            onRemoveMember={(departmentId, userId) =>
              removeMemberMutation({ departmentId, userId })
            }
          />
        ))}
        {rootDepartments?.length === 0 && (
          <div className="p-3 text-sm text-muted-foreground">No departments yet</div>
        )}
      </div>

      <MemberSelectorDialog
        ref={memberSelectorRef}
        disabledDepartment
        onConfirm={(members) => addMemberMutation(members)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createParentId ? 'New sub-department' : 'New department'}</DialogTitle>
          </DialogHeader>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Department name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!nameInput.trim()}
              onClick={() =>
                createDepartmentMutation({ name: nameInput.trim(), parentId: createParentId })
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => !open && setRenameTarget(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename department</DialogTitle>
          </DialogHeader>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Department name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={!nameInput.trim()}
              onClick={() =>
                renameTarget &&
                renameDepartmentMutation({ id: renameTarget.id, name: nameInput.trim() })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the department and its member associations. A department with
              sub-departments cannot be deleted until they are removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteDepartmentMutation(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
