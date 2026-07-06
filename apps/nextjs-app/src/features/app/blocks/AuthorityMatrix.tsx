import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IFieldPermissionLevel, ITableAccessPrincipalType } from '@teable/openapi';
import {
  getAuthorityMatrix,
  updateAuthorityMatrix,
  updateTableAccess,
  updateFieldPrincipalPermissions,
  getDepartmentList,
  getDepartmentUsers,
} from '@teable/openapi';
import type {
  IMemberSelectorDialogRef,
  ISelectedMember,
  MemberSelectorNodeType,
} from '@teable/sdk/components';
import { MemberSelectorDialog } from '@teable/sdk/components';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@teable/ui-lib/shadcn';
import { Loader, Settings2 } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';

const LEVEL_OPTIONS: { value: IFieldPermissionLevel; label: string }[] = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'readonly', label: 'Read only' },
  { value: 'editable', label: 'Editable' },
];

const authorityMatrixQueryKey = (baseId: string) => ['authority-matrix', baseId] as const;

export function AuthorityMatrixPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const baseId = router.query.baseId as string;
  const queryClient = useQueryClient();
  const memberSelectorRef = useRef<IMemberSelectorDialogRef>(null);
  const [activeTableId, setActiveTableId] = useState<string>();
  const [selectedPrincipal, setSelectedPrincipal] = useState<
    Record<string, { principalType: ITableAccessPrincipalType; principalId: string } | undefined>
  >({});

  const { data, isLoading } = useQuery({
    queryKey: authorityMatrixQueryKey(baseId),
    queryFn: () => getAuthorityMatrix(baseId).then((res) => res.data),
    enabled: Boolean(baseId),
  });

  const { data: departments } = useQuery({
    queryKey: ['authority-matrix-departments'],
    queryFn: () => getDepartmentList({}).then((res) => res.data),
  });
  const { data: userDirectory } = useQuery({
    queryKey: ['authority-matrix-users'],
    queryFn: () => getDepartmentUsers({ take: 500 }).then((res) => res.data),
  });

  const principalName = (principalType: ITableAccessPrincipalType, principalId: string) => {
    if (principalType === 'department') {
      return departments?.find((department) => department.id === principalId)?.name ?? principalId;
    }
    return userDirectory?.users.find((user) => user.id === principalId)?.name ?? principalId;
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: authorityMatrixQueryKey(baseId) });

  const { mutate: setLevel, isPending: isSaving } = useMutation({
    mutationFn: (update: { fieldId: string; roleName: string; level: IFieldPermissionLevel }) =>
      updateAuthorityMatrix(baseId, { updates: [update] }),
    onSuccess: invalidate,
  });

  const { mutate: setTableAccess } = useMutation({
    mutationFn: ({ tableId, members }: { tableId: string; members: ISelectedMember[] }) =>
      updateTableAccess(baseId, tableId, {
        grants: members.map((member) => ({
          principalType: member.type as ITableAccessPrincipalType,
          principalId: member.id,
        })),
      }),
    onSuccess: invalidate,
  });

  const { mutate: setPrincipalLevel, isPending: isSavingPrincipal } = useMutation({
    mutationFn: ({
      tableId,
      update,
    }: {
      tableId: string;
      update: {
        fieldId: string;
        principalType: ITableAccessPrincipalType;
        principalId: string;
        level: IFieldPermissionLevel;
      };
    }) => updateFieldPrincipalPermissions(baseId, tableId, { updates: [update] }),
    onSuccess: invalidate,
  });

  const permissionByKey = new Map(
    (data?.permissions ?? []).map((permission) => [
      `${permission.fieldId}:${permission.roleName}`,
      permission.level,
    ])
  );
  const principalPermissionByKey = new Map(
    (data?.principalPermissions ?? []).map((permission) => [
      `${permission.fieldId}:${permission.principalType}:${permission.principalId}`,
      permission.level,
    ])
  );

  const openAccessDialog = (tableId: string, grants: ISelectedMember[]) => {
    setActiveTableId(tableId);
    memberSelectorRef.current?.open(grants);
  };

  return (
    <div className="h-full flex-col md:flex">
      <Head>
        <title>{t('noun.authorityMatrix')}</title>
      </Head>
      <div className="flex flex-col gap-2 lg:gap-4">
        <div className="items-center justify-between space-y-2 px-8 pb-2 pt-6 lg:flex">
          <h2 className="text-3xl font-bold tracking-tight">{t('noun.authorityMatrix')}</h2>
        </div>
      </div>
      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader className="size-5 animate-spin" />
        </div>
      )}
      {!isLoading && data && (
        <div className="flex flex-col gap-6 px-8 pb-8">
          {data.tables.map((table) => {
            const currentPrincipal = selectedPrincipal[table.id];
            return (
              <div key={table.id} className="rounded-md border">
                <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                  <span className="text-sm font-medium">{table.name}</span>
                  <div className="flex items-center gap-2">
                    {table.accessGrants.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Visible to every collaborator
                      </span>
                    ) : (
                      table.accessGrants.map((grant) => (
                        <Badge
                          key={`${grant.principalType}:${grant.principalId}`}
                          variant="outline"
                        >
                          {principalName(grant.principalType, grant.principalId)}
                        </Badge>
                      ))
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        openAccessDialog(
                          table.id,
                          table.accessGrants.map((grant) => ({
                            id: grant.principalId,
                            type: grant.principalType as MemberSelectorNodeType,
                          })) as ISelectedMember[]
                        )
                      }
                    >
                      <Settings2 className="mr-1 size-3.5" />
                      Manage access
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 font-normal">Field</TableHead>
                      {data.roles.map((role) => (
                        <TableHead key={role.name} className="px-4 font-normal">
                          {role.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="px-4">{field.name}</TableCell>
                        {data.roles.map((role) => {
                          const level =
                            permissionByKey.get(`${field.id}:${role.name}`) ?? 'editable';
                          return (
                            <TableCell key={role.name} className="px-4">
                              <Select
                                value={level}
                                disabled={isSaving}
                                onValueChange={(value) =>
                                  setLevel({
                                    fieldId: field.id,
                                    roleName: role.name,
                                    level: value as IFieldPermissionLevel,
                                  })
                                }
                              >
                                <SelectTrigger className="w-36 bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LEVEL_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="border-t px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Field visibility per department/employee
                    </span>
                    {table.accessGrants.length > 0 && (
                      <Select
                        value={
                          currentPrincipal
                            ? `${currentPrincipal.principalType}:${currentPrincipal.principalId}`
                            : undefined
                        }
                        onValueChange={(value) => {
                          const [principalType, principalId] = value.split(':') as [
                            ITableAccessPrincipalType,
                            string,
                          ];
                          setSelectedPrincipal((prev) => ({
                            ...prev,
                            [table.id]: { principalType, principalId },
                          }));
                        }}
                      >
                        <SelectTrigger className="w-56 bg-background">
                          <SelectValue placeholder="Select a department or employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {table.accessGrants.map((grant) => (
                            <SelectItem
                              key={`${grant.principalType}:${grant.principalId}`}
                              value={`${grant.principalType}:${grant.principalId}`}
                            >
                              {principalName(grant.principalType, grant.principalId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {table.accessGrants.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Grant a department or employee access above to configure field visibility for
                      them.
                    </p>
                  )}
                  {currentPrincipal && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-4 font-normal">Field</TableHead>
                          <TableHead className="px-4 font-normal">Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.fields.map((field) => {
                          const key = `${field.id}:${currentPrincipal.principalType}:${currentPrincipal.principalId}`;
                          const level = principalPermissionByKey.get(key) ?? 'editable';
                          return (
                            <TableRow key={field.id}>
                              <TableCell className="px-4">{field.name}</TableCell>
                              <TableCell className="px-4">
                                <Select
                                  value={level}
                                  disabled={isSavingPrincipal}
                                  onValueChange={(value) =>
                                    setPrincipalLevel({
                                      tableId: table.id,
                                      update: {
                                        fieldId: field.id,
                                        principalType: currentPrincipal.principalType,
                                        principalId: currentPrincipal.principalId,
                                        level: value as IFieldPermissionLevel,
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-36 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LEVEL_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <MemberSelectorDialog
        ref={memberSelectorRef}
        header="Manage table access"
        onConfirm={(members) => {
          if (activeTableId) {
            setTableAccess({ tableId: activeTableId, members });
          }
        }}
      />
    </div>
  );
}
