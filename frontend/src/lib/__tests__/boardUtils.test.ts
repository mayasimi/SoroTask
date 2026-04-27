import {
  reorderWithinColumn,
  moveBetweenColumns,
  applyDragResult,
  findColumnForTask,
  findTaskIndex,
  createBoard,
} from "../boardUtils";
import type { BoardState, DragResult } from "@/src/types/board";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeBoard(): BoardState {
  return {
    columnIds: ["todo", "doing", "done"],
    columns: {
      todo:  { id: "todo",  title: "To Do",       taskIds: ["t1", "t2", "t3"] },
      doing: { id: "doing", title: "In Progress",  taskIds: ["t4"] },
      done:  { id: "done",  title: "Done",         taskIds: [] },
    },
  };
}

// ── createBoard ───────────────────────────────────────────────────────────────

describe("createBoard", () => {
  it("creates columns with empty taskIds", () => {
    const board = createBoard([
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ]);
    expect(board.columnIds).toEqual(["a", "b"]);
    expect(board.columns["a"].taskIds).toEqual([]);
    expect(board.columns["b"].taskIds).toEqual([]);
  });

  it("sets column titles", () => {
    const board = createBoard([{ id: "x", title: "My Column" }]);
    expect(board.columns["x"].title).toBe("My Column");
  });

  it("returns empty board for empty columns array", () => {
    const board = createBoard([]);
    expect(board.columnIds).toHaveLength(0);
  });
});

// ── reorderWithinColumn ───────────────────────────────────────────────────────

describe("reorderWithinColumn", () => {
  it("moves an item forward in the list", () => {
    const board = makeBoard();
    const result = reorderWithinColumn(board, "todo", 0, 2);
    expect(result.columns["todo"].taskIds).toEqual(["t2", "t3", "t1"]);
  });

  it("moves an item backward in the list", () => {
    const board = makeBoard();
    const result = reorderWithinColumn(board, "todo", 2, 0);
    expect(result.columns["todo"].taskIds).toEqual(["t3", "t1", "t2"]);
  });

  it("returns same board when fromIndex === toIndex", () => {
    const board = makeBoard();
    const result = reorderWithinColumn(board, "todo", 1, 1);
    expect(result).toBe(board);
  });

  it("returns same board for unknown column", () => {
    const board = makeBoard();
    const result = reorderWithinColumn(board, "ghost", 0, 1);
    expect(result).toBe(board);
  });

  it("does not mutate the original board", () => {
    const board = makeBoard();
    const original = [...board.columns["todo"].taskIds];
    reorderWithinColumn(board, "todo", 0, 2);
    expect(board.columns["todo"].taskIds).toEqual(original);
  });

  it("does not affect other columns", () => {
    const board = makeBoard();
    const result = reorderWithinColumn(board, "todo", 0, 1);
    expect(result.columns["doing"].taskIds).toEqual(["t4"]);
  });
});

// ── moveBetweenColumns ────────────────────────────────────────────────────────

describe("moveBetweenColumns", () => {
  it("removes task from source column", () => {
    const board = makeBoard();
    const result = moveBetweenColumns(board, "todo", "done", 0, 0);
    expect(result.columns["todo"].taskIds).not.toContain("t1");
  });

  it("adds task to destination column at correct index", () => {
    const board = makeBoard();
    const result = moveBetweenColumns(board, "todo", "done", 0, 0);
    expect(result.columns["done"].taskIds[0]).toBe("t1");
  });

  it("appends to destination when destinationIndex equals length", () => {
    const board = makeBoard();
    const result = moveBetweenColumns(board, "todo", "doing", 0, 1);
    expect(result.columns["doing"].taskIds).toEqual(["t4", "t1"]);
  });

  it("returns same board for unknown source column", () => {
    const board = makeBoard();
    expect(moveBetweenColumns(board, "ghost", "done", 0, 0)).toBe(board);
  });

  it("returns same board for unknown destination column", () => {
    const board = makeBoard();
    expect(moveBetweenColumns(board, "todo", "ghost", 0, 0)).toBe(board);
  });

  it("does not mutate the original board", () => {
    const board = makeBoard();
    const originalTodo = [...board.columns["todo"].taskIds];
    moveBetweenColumns(board, "todo", "done", 0, 0);
    expect(board.columns["todo"].taskIds).toEqual(originalTodo);
  });
});

// ── applyDragResult ───────────────────────────────────────────────────────────

describe("applyDragResult", () => {
  it("delegates to reorderWithinColumn for same-column drag", () => {
    const board = makeBoard();
    const result: DragResult = {
      taskId: "t1",
      sourceColumnId: "todo",
      destinationColumnId: "todo",
      sourceIndex: 0,
      destinationIndex: 2,
    };
    const next = applyDragResult(board, result);
    expect(next.columns["todo"].taskIds).toEqual(["t2", "t3", "t1"]);
  });

  it("delegates to moveBetweenColumns for cross-column drag", () => {
    const board = makeBoard();
    const result: DragResult = {
      taskId: "t1",
      sourceColumnId: "todo",
      destinationColumnId: "done",
      sourceIndex: 0,
      destinationIndex: 0,
    };
    const next = applyDragResult(board, result);
    expect(next.columns["todo"].taskIds).not.toContain("t1");
    expect(next.columns["done"].taskIds).toContain("t1");
  });
});

// ── findColumnForTask ─────────────────────────────────────────────────────────

describe("findColumnForTask", () => {
  it("finds the column containing a task", () => {
    expect(findColumnForTask(makeBoard(), "t4")).toBe("doing");
  });

  it("returns null for a task not on the board", () => {
    expect(findColumnForTask(makeBoard(), "ghost")).toBeNull();
  });

  it("finds tasks in the first column", () => {
    expect(findColumnForTask(makeBoard(), "t1")).toBe("todo");
  });
});

// ── findTaskIndex ─────────────────────────────────────────────────────────────

describe("findTaskIndex", () => {
  it("returns the correct index", () => {
    expect(findTaskIndex(makeBoard(), "todo", "t2")).toBe(1);
  });

  it("returns -1 for a task not in the column", () => {
    expect(findTaskIndex(makeBoard(), "todo", "t4")).toBe(-1);
  });

  it("returns -1 for an unknown column", () => {
    expect(findTaskIndex(makeBoard(), "ghost", "t1")).toBe(-1);
  });
});
