-- CreateTable
CREATE TABLE "field_role_permission" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'editable',
    "created_by" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),
    "last_modified_by" TEXT,

    CONSTRAINT "field_role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_role_permission_field_id_role_name_key" ON "field_role_permission"("field_id", "role_name");

-- CreateIndex
CREATE INDEX "field_role_permission_base_id_idx" ON "field_role_permission"("base_id");
