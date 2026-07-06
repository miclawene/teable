import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IFieldPermissionLevel } from '@teable/openapi';
import { getAuthorityMatrix, updateAuthorityMatrix } from '@teable/openapi';
import {
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
import { Loader } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

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

  const { data, isLoading } = useQuery({
    queryKey: authorityMatrixQueryKey(baseId),
    queryFn: () => getAuthorityMatrix(baseId).then((res) => res.data),
    enabled: Boolean(baseId),
  });

  const { mutate: setLevel, isPending: isSaving } = useMutation({
    mutationFn: (update: { fieldId: string; roleName: string; level: IFieldPermissionLevel }) =>
      updateAuthorityMatrix(baseId, { updates: [update] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorityMatrixQueryKey(baseId) });
    },
  });

  const permissionByKey = new Map(
    (data?.permissions ?? []).map((permission) => [
      `${permission.fieldId}:${permission.roleName}`,
      permission.level,
    ])
  );

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
          {data.tables.map((table) => (
            <div key={table.id} className="rounded-md border">
              <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
                {table.name}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
