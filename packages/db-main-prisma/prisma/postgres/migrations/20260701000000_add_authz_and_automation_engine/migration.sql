-- CreateTable
CREATE TABLE "role_policy" (
    "id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),
    "last_modified_by" TEXT,

    CONSTRAINT "role_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_definition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),
    "last_modified_by" TEXT,

    CONSTRAINT "role_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "trigger_type" TEXT NOT NULL,
    "trigger_config" TEXT NOT NULL,
    "condition_config" TEXT,
    "created_by" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),
    "last_modified_by" TEXT,
    "deleted_time" TIMESTAMP(3),

    CONSTRAINT "workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_action" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "action_type" TEXT NOT NULL,
    "action_config" TEXT NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),

    CONSTRAINT "workflow_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "trigger_event_name" TEXT,
    "trigger_payload" TEXT,
    "error" TEXT,
    "started_time" TIMESTAMP(3),
    "finished_time" TIMESTAMP(3),
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_action_run" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "workflow_action_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "output" TEXT,
    "error" TEXT,
    "started_time" TIMESTAMP(3),
    "finished_time" TIMESTAMP(3),

    CONSTRAINT "workflow_action_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_policy_role_name_scope_action_key" ON "role_policy"("role_name", "scope", "action");

-- CreateIndex
CREATE INDEX "role_policy_role_name_scope_idx" ON "role_policy"("role_name", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "role_definition_name_key" ON "role_definition"("name");

-- CreateIndex
CREATE INDEX "workflow_base_id_idx" ON "workflow"("base_id");

-- CreateIndex
CREATE INDEX "workflow_trigger_type_idx" ON "workflow"("trigger_type");

-- CreateIndex
CREATE INDEX "workflow_action_workflow_id_idx" ON "workflow_action"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_run_workflow_id_created_time_idx" ON "workflow_run"("workflow_id", "created_time");

-- CreateIndex
CREATE INDEX "workflow_action_run_run_id_idx" ON "workflow_action_run"("run_id");

-- AddForeignKey
ALTER TABLE "workflow_action" ADD CONSTRAINT "workflow_action_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_action_run" ADD CONSTRAINT "workflow_action_run_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
