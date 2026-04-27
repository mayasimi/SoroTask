import type { BoardState, ColumnId, DragResult } from "@/src/types/board";

/**
 * Reorders a task within the same column.
 * Returns a new BoardState (immutable update).
 */
export function reorderWithinColumn(
  board: BoardState,
  columnId: ColumnId,
  fromIndex: number,
  toIndex: number
): BoardState {
  const column = board.columns[columnId];
  if (!column) return board;
  if (fromIndex === toIndex) return board;

  const ids = [...column.taskIds];
  const [moved] = ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, moved);

  return {
    ...board,
    columns: {
      ...board.columns,
      [columnId]: { ...column, taskIds: ids },
    },
  };
}

/**
 * Moves a task from one column to another.
 * Returns a new BoardState (immutable update).
 */
export function moveBetweenColumns(
  board: BoardState,
  sourceColumnId: ColumnId,
  destinationColumnId: ColumnId,
  sourceIndex: number,
  destinationIndex: number
): BoardState {
  const source = board.columns[sourceColumnId];
  const dest = board.columns[destinationColumnId];
  if (!source || !dest) return board;

  const sourceIds = [...source.taskIds];
  const destIds = [...dest.taskIds];

  const [moved] = sourceIds.splice(sourceIndex, 1);
  destIds.splice(destinationIndex, 0, moved);

  return {
    ...board,
    columns: {
      ...board.columns,
      [sourceColumnId]: { ...source, taskIds: sourceIds },
      [destinationColumnId]: { ...dest, taskIds: destIds },
    },
  };
}

/**
 * Applies a DragResult to a BoardState.
 * Handles both same-column reorder and cross-column move.
 */
export function applyDragResult(
  board: BoardState,
  result: DragResult
): BoardState {
  if (result.sourceColumnId === result.destinationColumnId) {
    return reorderWithinColumn(
      board,
      result.sourceColumnId,
      result.sourceIndex,
      result.destinationIndex
    );
  }
  return moveBetweenColumns(
    board,
    result.sourceColumnId,
    result.destinationColumnId,
    result.sourceIndex,
    result.destinationIndex
  );
}

/**
 * Finds which column a task currently lives in.
 * Returns null if the task is not on the board.
 */
export function findColumnForTask(
  board: BoardState,
  taskId: string
): ColumnId | null {
  for (const col of Object.values(board.columns)) {
    if (col.taskIds.includes(taskId)) return col.id;
  }
  return null;
}

/**
 * Returns the index of a task within its column.
 * Returns -1 if not found.
 */
export function findTaskIndex(
  board: BoardState,
  columnId: ColumnId,
  taskId: string
): number {
  return board.columns[columnId]?.taskIds.indexOf(taskId) ?? -1;
}

/**
 * Creates a default board with the given column definitions.
 */
export function createBoard(
  columns: { id: ColumnId; title: string }[]
): BoardState {
  const columnMap: Record<ColumnId, import("@/src/types/board").Column> = {};
  for (const col of columns) {
    columnMap[col.id] = { id: col.id, title: col.title, taskIds: [] };
  }
  return {
    columnIds: columns.map((c) => c.id),
    columns: columnMap,
  };
}
