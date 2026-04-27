import { create } from "zustand";
import type { BoardState, ColumnId, DragResult } from "@/src/types/board";
import {
  applyDragResult,
  createBoard,
  moveBetweenColumns,
  reorderWithinColumn,
} from "@/src/lib/boardUtils";

export interface BoardStoreState {
  board: BoardState;
  /** Id of the task currently being dragged, or null */
  draggingTaskId: string | null;
  /** Snapshot taken at drag-start for optimistic rollback */
  snapshot: BoardState | null;
}

export interface BoardStoreActions {
  /** Initialise the board with column definitions */
  initBoard: (columns: { id: ColumnId; title: string }[]) => void;
  /** Replace the full board state (e.g. after a server sync) */
  setBoard: (board: BoardState) => void;
  /** Add a task id to a column at an optional index (default: end) */
  addTaskToColumn: (columnId: ColumnId, taskId: string, index?: number) => void;
  /** Remove a task id from whichever column it's in */
  removeTaskFromBoard: (taskId: string) => void;
  /** Reorder within a column */
  reorderInColumn: (columnId: ColumnId, fromIndex: number, toIndex: number) => void;
  /** Move a task between columns */
  moveToColumn: (
    sourceColumnId: ColumnId,
    destinationColumnId: ColumnId,
    sourceIndex: number,
    destinationIndex: number
  ) => void;
  /** Apply a completed DragResult */
  applyDrag: (result: DragResult) => void;
  /** Record drag start — saves snapshot for rollback */
  startDrag: (taskId: string) => void;
  /** Clear drag state after drop */
  endDrag: () => void;
  /** Roll back to the pre-drag snapshot (on failed persistence) */
  rollback: () => void;
  /** Reset to empty board */
  reset: () => void;
}

export type BoardStore = BoardStoreState & BoardStoreActions;

const EMPTY_BOARD: BoardState = { columnIds: [], columns: {} };

const INITIAL: BoardStoreState = {
  board: EMPTY_BOARD,
  draggingTaskId: null,
  snapshot: null,
};

export const useBoardStore = create<BoardStore>((set, get) => ({
  ...INITIAL,

  initBoard(columns) {
    set({ board: createBoard(columns) });
  },

  setBoard(board) {
    set({ board });
  },

  addTaskToColumn(columnId, taskId, index) {
    set((state) => {
      const col = state.board.columns[columnId];
      if (!col) return state;
      const ids = [...col.taskIds];
      if (ids.includes(taskId)) return state; // idempotent
      if (index === undefined || index >= ids.length) {
        ids.push(taskId);
      } else {
        ids.splice(Math.max(0, index), 0, taskId);
      }
      return {
        board: {
          ...state.board,
          columns: { ...state.board.columns, [columnId]: { ...col, taskIds: ids } },
        },
      };
    });
  },

  removeTaskFromBoard(taskId) {
    set((state) => {
      const columns = { ...state.board.columns };
      for (const colId of Object.keys(columns)) {
        const col = columns[colId];
        if (col.taskIds.includes(taskId)) {
          columns[colId] = {
            ...col,
            taskIds: col.taskIds.filter((id) => id !== taskId),
          };
        }
      }
      return { board: { ...state.board, columns } };
    });
  },

  reorderInColumn(columnId, fromIndex, toIndex) {
    set((state) => ({
      board: reorderWithinColumn(state.board, columnId, fromIndex, toIndex),
    }));
  },

  moveToColumn(sourceColumnId, destinationColumnId, sourceIndex, destinationIndex) {
    set((state) => ({
      board: moveBetweenColumns(
        state.board,
        sourceColumnId,
        destinationColumnId,
        sourceIndex,
        destinationIndex
      ),
    }));
  },

  applyDrag(result) {
    set((state) => ({ board: applyDragResult(state.board, result) }));
  },

  startDrag(taskId) {
    set((state) => ({ draggingTaskId: taskId, snapshot: state.board }));
  },

  endDrag() {
    set({ draggingTaskId: null, snapshot: null });
  },

  rollback() {
    const { snapshot } = get();
    if (snapshot) {
      set({ board: snapshot, draggingTaskId: null, snapshot: null });
    }
  },

  reset() {
    set(INITIAL);
  },
}));
