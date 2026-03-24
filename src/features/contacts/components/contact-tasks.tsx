/**
 * src/features/contacts/components/contact-tasks.tsx
 *
 * ContactTasks — displays tasks linked to a contact with an "Add Task" button.
 *
 * Shows open tasks first, then completed tasks (muted with strikethrough).
 * The "+" button opens a CreateTaskDialog pre-linked to this contact.
 *
 * Props:
 *   tasks     — Pre-fetched task list with assignedUser relation.
 *   contactId — The contact's ID, passed as defaultContactId to the dialog.
 *   users     — Active workspace users for the task assignment dropdown.
 */

import { CheckSquare, AlertCircle, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { TASK_PRIORITY_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import type { TaskStatus, TaskPriority } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  assignedUser: { id: string; name: string | null } | null;
}

interface ContactTasksUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface ContactTasksProps {
  tasks: TaskItem[];
  contactId: string;
  users: ContactTasksUser[];
}

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

// ---------------------------------------------------------------------------
// ContactTasks
// ---------------------------------------------------------------------------

export function ContactTasks({ tasks, contactId, users }: ContactTasksProps) {
  const openTasks = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED");
  const doneTasks = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks
            {openTasks.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                {openTasks.length} open
              </span>
            )}
          </CardTitle>
          <CreateTaskDialog
            users={users}
            contacts={[]}
            defaultContactId={contactId}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Add task">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No tasks yet. Use the + button to add one.
          </p>
        ) : (
          <div className="space-y-2">
            {openTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}

            {doneTasks.length > 0 && openTasks.length > 0 && (
              <div className="border-t border-border pt-2 mt-2" />
            )}

            {doneTasks.map((task) => (
              <TaskRow key={task.id} task={task} done />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TaskRow
// ---------------------------------------------------------------------------

function TaskRow({ task, done = false }: { task: TaskItem; done?: boolean }) {
  const isOverdue =
    task.dueAt && task.dueAt < new Date() && task.status !== "COMPLETED";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 ${
        done ? "opacity-60" : "hover:bg-accent/30"
      }`}
    >
      {/* Status dot */}
      <div className="mt-1 flex-shrink-0">
        {done ? (
          <div className="h-3.5 w-3.5 rounded-sm border-2 border-muted-foreground bg-muted-foreground" />
        ) : (
          <div className="h-3.5 w-3.5 rounded-sm border-2 border-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          <span
            className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${TASK_PRIORITY_COLORS[task.priority]}`}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {task.assignedUser && <span>{task.assignedUser.name}</span>}
          {task.dueAt && (
            <span className={isOverdue ? "text-destructive font-medium" : ""}>
              {isOverdue && <AlertCircle className="inline h-3 w-3 mr-0.5" />}
              Due {formatDate(task.dueAt)}
            </span>
          )}
          <span>{STATUS_LABELS[task.status]}</span>
        </div>
      </div>
    </div>
  );
}
