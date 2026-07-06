-- CreateTable
CREATE TABLE "table_access_grant" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "principal_type" TEXT NOT NULL,
    "principal_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_access_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_principal_permission" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "principal_type" TEXT NOT NULL,
    "principal_id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'editable',
    "created_by" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),
    "last_modified_by" TEXT,

    CONSTRAINT "field_principal_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "table_access_grant_table_id_principal_type_principal_id_key" ON "table_access_grant"("table_id", "principal_type", "principal_id");

-- CreateIndex
CREATE INDEX "table_access_grant_table_id_idx" ON "table_access_grant"("table_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_principal_permission_field_id_principal_type_princip_key" ON "field_principal_permission"("field_id", "principal_type", "principal_id");

-- CreateIndex
CREATE INDEX "field_principal_permission_table_id_idx" ON "field_principal_permission"("table_id");
