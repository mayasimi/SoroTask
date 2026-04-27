import { act } from "@testing-library/react";
import { useBoardStore } from "../boardStore";

const COLS = [
  { id: "todo", title: "To Do" },
  { id: "doing", title: "In Progress" },
  { id: "done", title: "Done" },
];

beforeEach(() => {
  act(() => useBoardStore.getState().reset());
});

// ── initBoard ─────────────────────────────────────────────────────────────────

describe("initBoard", () => {
  it("creates columns with correct ids", () => {
    act(() => useBoardStore.getState().initBoard(COLS));
    expect(useBoardStore.getState().board.columnIds).toEqual([
      "todo", "doing", "done",
    ]);
  });

  it("initialises columns with empty taskIds", () => {
    act(() => useBoardStore.getState().initBoard(COLS));
    const { columns } = useBoardStore.getState().board;
    expect(columns["todo"].taskIds).toEqual([]);
  });
});

// ── addTaskToColumn ───────────────────────────────────────────────────────────

describe("addTaskToColumn", () => {
  beforeEach(() => act(() => useBoardStore.getState().initBoard(COLS)));

  it("appends a task to a column", () => {
    act(() => useBoardStore.getState().addTaskToColumn("todo", "t1"));
    expect(useBoardStore.getState().board.columns["todo"].taskIds).toContain("t1");
  });

  it("inserts at a specific index", () => {
    act(() => useBoardStore.getState().addTaskToColumn("todo", "t1"));
    act(() => useBoardStore.getState().addTaskToColumn("todo", "t2"));
    act(() => useBoardStore.getState().addTaskToColumn("todo", "t3", 1));
    expect(useBoardStore.getState().board.columns["todo"].taskIds).toEqual([
      "t1", "t3", "t2",
    ]);
  });

  it("is idempotent — does not duplicate", () => {
    act(() => useBoardStore.getState().addTaskToColumn("todo", "t1"));
    act(() => useBoardStore.getState().addTaskToColumn("todo", "t1"));
    expect(useBoardStore.getState().board.columns["todo"].taskIds).toHaveLength(1);
  });

  it("is a no-op for unknown column", () => {
    act(() => useBoardStore.getState().addTaskToColumn("ghost", "t1"));
    expect(useBoardStore.getState().board.columns["todo"].taskIds).toHaveLength(0);
  });
});

// ── removeTaskFromBoard ───────────────────────────────────────────────────────

describe("removeTaskFromBoard", () => {
  beforeEach(() => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().addTaskToColumn("todo", "t1");
      useBoardStore.getState().addTaskToColumn("doing", "t2");
    });
  });

  it("removes a task from its column", () => {
    act(() => useBoardStore.getState().removeTaskFromBoard("t1"));
    expect(useBoardStore.getState().board.columns["todo"].taskIds).not.toContain("t1");
  });

  it("is a no-op for a task not on the board", () => {
    act(() => useBoardStore.getState().removeTaskFromBoard("ghost"));
    expect(useBoardStore.getState().board.columns["todo"].taskIds).toContain("t1");
  });
});

// ── reorderInColumn ───────────────────────────────────────────────────────────

describe("reorderInColumn", () => {
  beforeEach(() => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().addTaskToColumn("todo", "t1");
      useBoardStore.getState().addTaskToColumn("todo", "t2");
      useBoardStore.getState().addTaskToColumn("todo", "t3");
    });
  });

  it("reorders tasks within a column", () => {
    act(() => useBoardStore.getState().reorderInColumn("todo", 0, 2));
    expect(useBoardStore.getState().board.columns["todo"].taskIds).toEqual([
      "t2", "t3", "t1",
    ]);
  });
});

// ── moveToColumn ──────────────────────────────────────────────────────────────

describe("moveToColumn", () => {
  beforeEach(() => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().addTaskToColumn("todo", "t1");
      useBoardStore.getState().addTaskToColumn("todo", "t2");
    });
  });

  it("moves a task to another column", () => {
    act(() => useBoardStore.getState().moveToColumn("todo", "done", 0, 0));
    expect(useBoardStore.getState().board.columns["todo"].taskIds).not.toContain("t1");
    expect(useBoardStore.getState().board.columns["done"].taskIds).toContain("t1");
  });
});

// ── applyDrag ─────────────────────────────────────────────────────────────────

describe("applyDrag", () => {
  beforeEach(() => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().addTaskToColumn("todo", "t1");
      useBoardStore.getState().addTaskToColumn("todo", "t2");
      useBoardStore.getState().addTaskToColumn("done", "t3");
    });
  });

  it("applies a same-column reorder", () => {
    act(() =>
      useBoardStore.getState().applyDrag({
        taskId: "t1",
        sourceColumnId: "todo",
        destinationColumnId: "todo",
        sourceIndex: 0,
        destinationIndex: 1,
      })
    );
    expect(useBoardStore.getState().board.columns["todo"].taskIds).toEqual([
      "t2", "t1",
    ]);
  });

  it("applies a cross-column move", () => {
    act(() =>
      useBoardStore.getState().applyDrag({
        taskId: "t1",
        sourceColumnId: "todo",
        destinationColumnId: "done",
        sourceIndex: 0,
        destinationIndex: 0,
      })
    );
    expect(useBoardStore.getState().board.columns["todo"].taskIds).not.toContain("t1");
    expect(useBoardStore.getState().board.columns["done"].taskIds[0]).toBe("t1");
  });
});

// ── startDrag / endDrag / rollback ────────────────────────────────────────────

describe("drag lifecycle", () => {
  beforeEach(() => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().addTaskToColumn("todo", "t1");
    });
  });

  it("startDrag sets draggingTaskId and saves snapshot", () => {
    act(() => useBoardStore.getState().startDrag("t1"));
    expect(useBoardStore.getState().draggingTaskId).toBe("t1");
    expect(useBoardStore.getState().snapshot).not.toBeNull();
  });

  it("endDrag clears draggingTaskId and snapshot", () => {
    act(() => useBoardStore.getState().startDrag("t1"));
    act(() => useBoardStore.getState().endDrag());
    expect(useBoardStore.getState().draggingTaskId).toBeNull();
    expect(useBoardStore.getState().snapshot).toBeNull();
  });

  it("rollback restores the pre-drag board state", () => {
    const boardBefore = useBoardStore.getState().board;
    act(() => useBoardStore.getState().startDrag("t1"));
    act(() =>
      useBoardStore.getState().applyDrag({
        taskId: "t1",
        sourceColumnId: "todo",
        destinationColumnId: "done",
        sourceIndex: 0,
        destinationIndex: 0,
      })
    );
    act(() => useBoardStore.getState().rollback());
    expect(useBoardStore.getState().board).toEqual(boardBefore);
    expect(useBoardStore.getState().draggingTaskId).toBeNull();
  });

  it("rollback is a no-op when there is no snapshot", () => {
    const board = useBoardStore.getState().board;
    act(() => useBoardStore.getState().rollback());
    expect(useBoardStore.getState().board).toEqual(board);
  });
});

// ── reset ─────────────────────────────────────────────────────────────────────

describe("reset", () => {
  it("clears all board state", () => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().addTaskToColumn("todo", "t1");
      useBoardStore.getState().startDrag("t1");
    });
    act(() => useBoardStore.getState().reset());
    expect(useBoardStore.getState().board.columnIds).toHaveLength(0);
    expect(useBoardStore.getState().draggingTaskId).toBeNull();
    expect(useBoardStore.getState().snapshot).toBeNull();
  });
});
