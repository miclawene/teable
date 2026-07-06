import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IFieldPermissionLevel, ITableAccessPrincipalType } from '@teable/openapi';
import {
  getAuthorityMatrix,
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
          <p className="text-sm text-muted-foreground">
            Base roles (Owner/Creator/Editor/Commenter/Viewer) keep their default, base-wide access.
            Use this page to restrict individual tables and fields to specific departments or
            employees.
          </p>
        </div>
      </div>
      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader className="size-5 animate-spin" />
        </div>
      )}
      {!isLoading && data && (
        <div className="flex flex-col gap-6 px-8 pb-8">
          {data.tables.map((table) => (
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
                      <Badge key={`${grant.principalType}:${grant.principalId}`} variant="outline">
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
              {table.accessGrants.length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  Grant a department or employee access above to configure field visibility for
                  them.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 font-normal">Field</TableHead>
                      {table.accessGrants.map((grant) => (
                        <TableHead
                          key={`${grant.principalType}:${grant.principalId}`}
                          className="px-4 font-normal"
                        >
                          {principalName(grant.principalType, grant.principalId)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="px-4">{field.name}</TableCell>
                        {table.accessGrants.map((grant) => {
                          const key = `${field.id}:${grant.principalType}:${grant.principalId}`;
                          const level = principalPermissionByKey.get(key) ?? 'editable';
                          return (
                            <TableCell key={key} className="px-4">
                              <Select
                                value={level}
                                disabled={isSavingPrincipal}
                                onValueChange={(value) =>
                                  setPrincipalLevel({
                                    tableId: table.id,
                                    update: {
                                      fieldId: field.id,
                                      principalType: grant.principalType,
                                      principalId: grant.principalId,
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
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
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
