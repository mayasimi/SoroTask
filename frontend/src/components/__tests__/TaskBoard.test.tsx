import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import TaskBoard from "../TaskBoard";
import { useBoardStore } from "@/src/store/boardStore";
import { useTaskStore } from "@/src/store/taskStore";
import type { Task } from "@/src/types/task";

// ── dnd-kit mock ──────────────────────────────────────────────────────────────
// dnd-kit requires pointer/touch APIs not available in jsdom.
// We mock the drag primitives and test component behaviour directly.

jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn((...args: unknown[]) => args),
  closestCorners: jest.fn(),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: {},
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

jest.mock("@dnd-kit/modifiers", () => ({
  restrictToWindowEdges: jest.fn(),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: jest.fn(() => "") } },
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeTask(id: string, title = `Task ${id}`): Task {
  return {
    id,
    title,
    description: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

const COLS = [
  { id: "todo", title: "To Do" },
  { id: "doing", title: "In Progress" },
  { id: "done", title: "Done" },
];

function seedBoard(tasks: Task[], colTaskMap: Record<string, string[]> = {}) {
  act(() => {
    useTaskStore.getState().setTasks(tasks);
    useBoardStore.getState().initBoard(COLS);
    for (const [colId, taskIds] of Object.entries(colTaskMap)) {
      for (const taskId of taskIds) {
        useBoardStore.getState().addTaskToColumn(colId, taskId);
      }
    }
  });
}

beforeEach(() => {
  act(() => {
    useTaskStore.getState().reset();
    useBoardStore.getState().reset();
  });
});

// ── empty state ───────────────────────────────────────────────────────────────

describe("empty state", () => {
  it("shows empty message when no columns are configured", () => {
    render(<TaskBoard />);
    expect(screen.getByText(/no columns configured/i)).toBeInTheDocument();
  });

  it("empty state has role=status", () => {
    render(<TaskBoard />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("applies testid suffix -empty", () => {
    render(<TaskBoard data-testid="board" />);
    expect(screen.getByTestId("board-empty")).toBeInTheDocument();
  });
});

// ── column rendering ──────────────────────────────────────────────────────────

describe("column rendering", () => {
  beforeEach(() => seedBoard([], {}));

  it("renders all configured columns", () => {
    render(<TaskBoard />);
    expect(screen.getByTestId("column-todo")).toBeInTheDocument();
    expect(screen.getByTestId("column-doing")).toBeInTheDocument();
    expect(screen.getByTestId("column-done")).toBeInTheDocument();
  });

  it("renders column titles", () => {
    render(<TaskBoard />);
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders task count badge per column", () => {
    seedBoard([makeTask("t1"), makeTask("t2")], { todo: ["t1", "t2"] });
    render(<TaskBoard />);
    // The todo column badge should show 2
    const todoBadges = screen.getAllByText("2");
    expect(todoBadges.length).toBeGreaterThan(0);
  });

  it("shows drop hint when column is empty", () => {
    render(<TaskBoard />);
    expect(screen.getAllByText(/drop tasks here/i).length).toBeGreaterThan(0);
  });

  it("renders board with role=region and aria-label", () => {
    render(<TaskBoard />);
    expect(
      screen.getByRole("region", { name: /task board/i })
    ).toBeInTheDocument();
  });

  it("applies data-testid to the board wrapper", () => {
    render(<TaskBoard data-testid="my-board" />);
    expect(screen.getByTestId("my-board")).toBeInTheDocument();
  });
});

// ── task card rendering ───────────────────────────────────────────────────────

describe("task card rendering", () => {
  beforeEach(() => {
    seedBoard(
      [makeTask("t1", "Fix bug"), makeTask("t2", "Write tests")],
      { todo: ["t1"], doing: ["t2"] }
    );
  });

  it("renders task cards in the correct columns", () => {
    render(<TaskBoard />);
    expect(screen.getByTestId("task-card-t1")).toBeInTheDocument();
    expect(screen.getByTestId("task-card-t2")).toBeInTheDocument();
  });

  it("renders task titles", () => {
    render(<TaskBoard />);
    expect(screen.getByText("Fix bug")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  it("task cards have role=listitem", () => {
    render(<TaskBoard />);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("task cards have aria-label", () => {
    render(<TaskBoard />);
    expect(
      screen.getByRole("listitem", { name: /fix bug/i })
    ).toBeInTheDocument();
  });
});

// ── task click / selection ────────────────────────────────────────────────────

describe("task click", () => {
  beforeEach(() => {
    seedBoard([makeTask("t1", "Click me")], { todo: ["t1"] });
  });

  it("calls onTaskClick when a card is clicked", () => {
    const onTaskClick = jest.fn();
    render(<TaskBoard onTaskClick={onTaskClick} />);
    fireEvent.click(screen.getByTestId("task-card-t1"));
    expect(onTaskClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1" })
    );
  });

  it("updates store selectedTaskId on click", () => {
    render(<TaskBoard />);
    fireEvent.click(screen.getByTestId("task-card-t1"));
    expect(useTaskStore.getState().selectedTaskId).toBe("t1");
  });

  it("does not throw when onTaskClick is not provided", () => {
    render(<TaskBoard />);
    expect(() =>
      fireEvent.click(screen.getByTestId("task-card-t1"))
    ).not.toThrow();
  });
});

// ── column accessibility ──────────────────────────────────────────────────────

describe("column accessibility", () => {
  beforeEach(() => seedBoard([], {}));

  it("each column has role=list", () => {
    render(<TaskBoard />);
    expect(screen.getAllByRole("list").length).toBeGreaterThanOrEqual(3);
  });

  it("each column has aria-label with its title", () => {
    render(<TaskBoard />);
    expect(
      screen.getByRole("list", { name: /to do column/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: /in progress column/i })
    ).toBeInTheDocument();
  });
});

// ── drag state ────────────────────────────────────────────────────────────────

describe("drag state", () => {
  it("startDrag sets draggingTaskId in store", () => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().startDrag("t1");
    });
    expect(useBoardStore.getState().draggingTaskId).toBe("t1");
  });

  it("endDrag clears draggingTaskId", () => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().startDrag("t1");
      useBoardStore.getState().endDrag();
    });
    expect(useBoardStore.getState().draggingTaskId).toBeNull();
  });

  it("rollback restores board to pre-drag state", () => {
    act(() => {
      useBoardStore.getState().initBoard(COLS);
      useBoardStore.getState().addTaskToColumn("todo", "t1");
    });
    const before = useBoardStore.getState().board;
    act(() => {
      useBoardStore.getState().startDrag("t1");
      useBoardStore.getState().applyDrag({
        taskId: "t1",
        sourceColumnId: "todo",
        destinationColumnId: "done",
        sourceIndex: 0,
        destinationIndex: 0,
      });
    });
    act(() => useBoardStore.getState().rollback());
    expect(useBoardStore.getState().board).toEqual(before);
  });
});
