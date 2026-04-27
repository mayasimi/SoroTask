/**
 * Board types for drag-and-drop task management.
 *
 * A Board has named Columns. Each Column holds an ordered list of task ids.
 * Moving a task between columns or reordering within a column produces a new
 * BoardState that can be persisted optimistically.
 */

export type ColumnId = string;

export interface Column {
  id: ColumnId;
  title: string;
  /** Ordered task ids in this column */
  taskIds: string[];
}

export interface BoardState {
  /** Ordered column ids (left → right) */
  columnIds: ColumnId[];
  /** Column data keyed by id */
  columns: Record<ColumnId, Column>;
}

/** Payload emitted after a successful drag operation */
export interface DragResult {
  taskId: string;
  sourceColumnId: ColumnId;
  destinationColumnId: ColumnId;
  sourceIndex: number;
  destinationIndex: number;
}
