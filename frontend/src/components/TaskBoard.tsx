"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useState, useCallback } from "react";
import { useBoardStore } from "@/src/store/boardStore";
import { useTaskStore } from "@/src/store/taskStore";
import { findColumnForTask, findTaskIndex } from "@/src/lib/boardUtils";
import type { Task } from "@/src/types/task";
import type { ColumnId } from "@/src/types/board";

interface TaskBoardProps {
  onTaskClick?: (task: Task) => void;
  "data-testid"?: string;
}

export default function TaskBoard({
  onTaskClick,
  "data-testid": testId,
}: TaskBoardProps) {
  const board = useBoardStore((s) => s.board);
  const draggingTaskId = useBoardStore((s) => s.draggingTaskId);
  const startDrag = useBoardStore((s) => s.startDrag);
  const endDrag = useBoardStore((s) => s.endDrag);
  const applyDrag = useBoardStore((s) => s.applyDrag);
  const moveToColumn = useBoardStore((s) => s.moveToColumn);

  const tasks = useTaskStore((s) => s.tasks);
  const selectTask = useTaskStore((s) => s.selectTask);

  // Track which column the dragged item is hovering over
  const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      startDrag(String(active.id));
    },
    [startDrag]
  );

  const handleDragOver = useCallback(
    ({ over }: DragOverEvent) => {
      if (!over) { setOverColumnId(null); return; }
      // over.id is either a column id or a task id — resolve to column
      const overId = String(over.id);
      if (board.columns[overId]) {
        setOverColumnId(overId);
      } else {
        setOverColumnId(findColumnForTask(board, overId));
      }
    },
    [board]
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      endDrag();
      setOverColumnId(null);
      if (!over) return;

      const taskId = String(active.id);
      const overId = String(over.id);

      const sourceColId = findColumnForTask(board, taskId);
      if (!sourceColId) return;

      // Determine destination column and index
      let destColId: ColumnId;
      let destIndex: number;

      if (board.columns[overId]) {
        // Dropped onto a column directly → append
        destColId = overId;
        destIndex = board.columns[overId].taskIds.length;
      } else {
        // Dropped onto another task → insert at that task's position
        destColId = findColumnForTask(board, overId) ?? sourceColId;
        destIndex = findTaskIndex(board, destColId, overId);
        if (destIndex === -1) destIndex = board.columns[destColId].taskIds.length;
      }

      const sourceIndex = findTaskIndex(board, sourceColId, taskId);

      applyDrag({
        taskId,
        sourceColumnId: sourceColId,
        destinationColumnId: destColId,
        sourceIndex,
        destinationIndex: destIndex,
      });
    },
    [board, endDrag, applyDrag]
  );

  const handleTaskClick = useCallback(
    (task: Task) => {
      selectTask(task.id);
      onTaskClick?.(task);
    },
    [selectTask, onTaskClick]
  );

  if (board.columnIds.length === 0) {
    return (
      <div
        data-testid={testId ? `${testId}-empty` : "board-empty"}
        className="flex items-center justify-center rounded-xl border border-neutral-700/50 bg-neutral-800/50 py-16 text-neutral-500"
        role="status"
      >
        No columns configured.
      </div>
    );
  }

  const draggingTask = draggingTaskId ? tasks[draggingTaskId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        data-testid={testId}
        className="flex gap-4 overflow-x-auto pb-4"
        role="region"
        aria-label="Task board"
      >
        {board.columnIds.map((colId) => {
          const col = board.columns[colId];
          return (
            <BoardColumn
              key={colId}
              columnId={colId}
              title={col.title}
              taskIds={col.taskIds}
              tasks={tasks}
              isOver={overColumnId === colId}
              onTaskClick={handleTaskClick}
            />
          );
        })}
      </div>

      {/* Drag overlay — renders the card being dragged */}
      <DragOverlay>
        {draggingTask ? (
          <DragCard task={draggingTask} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── BoardColumn ───────────────────────────────────────────────────────────────

interface BoardColumnProps {
  columnId: ColumnId;
  title: string;
  taskIds: string[];
  tasks: Record<string, Task>;
  isOver: boolean;
  onTaskClick: (task: Task) => void;
}

function BoardColumn({
  columnId,
  title,
  taskIds,
  tasks,
  isOver,
  onTaskClick,
}: BoardColumnProps) {
  return (
    <div
      data-testid={`column-${columnId}`}
      className={`flex w-72 shrink-0 flex-col rounded-xl border transition-colors ${
        isOver
          ? "border-blue-500/50 bg-blue-500/5"
          : "border-neutral-700/50 bg-neutral-800/50"
      }`}
      role="list"
      aria-label={`${title} column`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700/50">
        <h3 className="font-semibold text-neutral-100 text-sm">{title}</h3>
        <span className="text-xs text-neutral-500 bg-neutral-700/50 rounded-full px-2 py-0.5">
          {taskIds.length}
        </span>
      </div>

      {/* Sortable task list */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-3 min-h-[80px]">
          {taskIds.map((taskId) => {
            const task = tasks[taskId];
            if (!task) return null;
            return (
              <SortableTaskCard
                key={taskId}
                task={task}
                onClick={onTaskClick}
              />
            );
          })}
          {taskIds.length === 0 && (
            <p className="text-xs text-neutral-600 text-center py-4">
              Drop tasks here
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── SortableTaskCard ──────────────────────────────────────────────────────────

interface SortableTaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`task-card-${task.id}`}
      role="listitem"
      aria-label={`Task: ${task.title}`}
      aria-grabbed={isDragging}
      className="rounded-lg border border-neutral-700/50 bg-neutral-900 p-3 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500 select-none"
      onClick={() => onClick(task)}
      {...attributes}
      {...listeners}
    >
      <p className="text-sm font-medium text-neutral-100 truncate">{task.title}</p>
      <p className="text-xs text-neutral-500 mt-1">
        {new Date(task.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

// ── DragCard (overlay) ────────────────────────────────────────────────────────

function DragCard({ task }: { task: Task }) {
  return (
    <div
      className="rounded-lg border border-blue-500/50 bg-neutral-900 p-3 shadow-xl shadow-black/40 cursor-grabbing w-72"
      aria-hidden
    >
      <p className="text-sm font-medium text-neutral-100 truncate">{task.title}</p>
    </div>
  );
}
