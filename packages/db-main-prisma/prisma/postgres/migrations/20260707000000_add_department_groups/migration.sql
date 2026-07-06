-- CreateTable
CREATE TABLE "department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),
    "deleted_time" TIMESTAMP(3),

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_member" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "department_parent_id_idx" ON "department"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_member_department_id_user_id_key" ON "department_member"("department_id", "user_id");

-- CreateIndex
CREATE INDEX "department_member_user_id_idx" ON "department_member"("user_id");
