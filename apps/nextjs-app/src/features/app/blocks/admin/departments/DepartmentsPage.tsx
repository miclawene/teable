import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, UserPlus, X } from '@teable/icons';
import {
  addDepartmentMember,
  createDepartment,
  deleteDepartment,
  getDepartmentList,
  getDepartmentUsers,
  removeDepartmentMember,
  updateDepartment,
} from '@teable/openapi';
import type { IMemberSelectorDialogRef, ISelectedMember } from '@teable/sdk/components';
import { MemberSelectorDialog, MemberSelectorNodeType, UserAvatar } from '@teable/sdk/components';
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
} from '@teable/ui-lib/shadcn';
import { useRef, useState } from 'react';

export const DepartmentsPage = () => {
  const queryClient = useQueryClient();
  const memberSelectorRef = useRef<IMemberSelectorDialogRef>(null);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string }>();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string }>();
  const [nameInput, setNameInput] = useState('');

  const { data: departments } = useQuery({
    queryKey: ReactQueryKeys.getDepartmentList({}),
    queryFn: () => getDepartmentList({}).then((res) => res.data),
  });

  const { data: memberData } = useQuery({
    queryKey: ReactQueryKeys.getDepartmentUsers({ departmentId: selectedDepartmentId }),
    queryFn: () =>
      getDepartmentUsers({ departmentId: selectedDepartmentId }).then((res) => res.data),
    enabled: Boolean(selectedDepartmentId),
  });

  const invalidateDepartments = () =>
    queryClient.invalidateQueries({ queryKey: ['department-list'] });
  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: ['department-users'] });

  const { mutate: createDepartmentMutation } = useMutation({
    mutationFn: (name: string) => createDepartment({ name }),
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
    onSuccess: (_data, id) => {
      invalidateDepartments();
      setDeleteTarget(undefined);
      if (selectedDepartmentId === id) {
        setSelectedDepartmentId(undefined);
      }
    },
  });

  const { mutate: addMemberMutation } = useMutation({
    mutationFn: async (members: ISelectedMember[]) => {
      if (!selectedDepartmentId) return;
      await Promise.all(
        members
          .filter((member) => member.type === MemberSelectorNodeType.USER)
          .map((member) => addDepartmentMember(selectedDepartmentId, { userId: member.id }))
      );
    },
    onSuccess: invalidateMembers,
  });

  const { mutate: removeMemberMutation } = useMutation({
    mutationFn: (userId: string) => removeDepartmentMember(selectedDepartmentId!, userId),
    onSuccess: invalidateMembers,
  });

  const selectedDepartment = departments?.find(
    (department) => department.id === selectedDepartmentId
  );

  return (
    <div className="flex size-full flex-1 gap-4 overflow-hidden p-6">
      <div className="flex w-72 shrink-0 flex-col gap-2 overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-semibold">Departments</span>
          <Button size="xs" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {departments?.map((department) => (
            <div
              key={department.id}
              role="button"
              tabIndex={0}
              className={
                'group flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-accent ' +
                (department.id === selectedDepartmentId ? 'bg-accent' : '')
              }
              onClick={() => setSelectedDepartmentId(department.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedDepartmentId(department.id);
                }
              }}
            >
              <span className="truncate">{department.name}</span>
              <div className="hidden shrink-0 gap-1 group-hover:flex">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameTarget({ id: department.id, name: department.name });
                    setNameInput(department.name);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: department.id, name: department.name });
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {departments?.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No departments yet</div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
        {selectedDepartment ? (
          <>
            <div className="flex items-center justify-between border-b p-3">
              <span className="text-sm font-semibold">{selectedDepartment.name} members</span>
              <Button size="xs" variant="outline" onClick={() => memberSelectorRef.current?.open()}>
                <UserPlus className="mr-1 size-4" />
                Add member
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {memberData?.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={user.name} avatar={user.avatar} />
                    <div className="flex flex-col">
                      <span className="text-sm">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                  <Button size="xs" variant="ghost" onClick={() => removeMemberMutation(user.id)}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              {memberData?.users.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No members yet</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a department to manage its members
          </div>
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
            <DialogTitle>New department</DialogTitle>
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
              onClick={() => createDepartmentMutation(nameInput.trim())}
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
              This removes the department and its member associations. This cannot be undone.
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
