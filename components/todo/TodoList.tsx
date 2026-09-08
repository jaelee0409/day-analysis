"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PanelTitle } from "@/components/ui/primitives";
import { useT } from "@/lib/locale-context";
import { storage } from "@/lib/storage";
import type { Todo } from "@/types/time";

/**
 * The one forward-looking thing in an app that otherwise only records what
 * already happened. It stays deliberately small: text, done, gone. Anything
 * more — due dates, priorities, projects — turns this into the task manager
 * the product is not.
 */
export function TodoList() {
  const t = useT();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState("");

  const reload = useCallback(async () => {
    setTodos(await storage.getTodos());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await storage.createTodo(text);
    await reload();
  };

  const open = todos.filter((t) => !t.done).length;
  const done = todos.length - open;

  return (
    <Card className="p-5">
      <PanelTitle
        aside={todos.length > 0 ? (open > 0 ? t("todo.left", { count: open }) : t("todo.allDone")) : undefined}
      >
        {t("todo.title")}
      </PanelTitle>

      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void add();
          }
        }}
        placeholder={t("todo.placeholder")}
        aria-label={t("todo.add")}
        className="mt-3 h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13.5px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
      />

      {todos.length > 0 ? (
        <ul className="mt-1 divide-y divide-hairline">
          {todos.map((todo) => (
            <li key={todo.id} className="group flex items-center gap-2.5 py-2">
              <button
                type="button"
                onClick={async () => {
                  await storage.setTodoDone(todo.id, !todo.done);
                  await reload();
                }}
                aria-pressed={todo.done}
                aria-label={t(todo.done ? "todo.markNotDone" : "todo.markDone", { text: todo.text })}
                className={`h-[13px] w-[13px] shrink-0 rounded-full border transition-colors ${
                  todo.done ? "border-ink bg-ink" : "border-[#c3c8c8] hover:border-ink"
                }`}
              />
              <span
                className={`min-w-0 flex-1 break-words text-[13.5px] ${
                  todo.done ? "text-faint line-through" : "text-ink-soft"
                }`}
              >
                {todo.text}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await storage.deleteTodo(todo.id);
                  await reload();
                }}
                className="shrink-0 rounded p-1 text-faint opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={t("todo.deleteItem", { text: todo.text })}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="m2.5 2.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {done > 0 ? (
        <button
          type="button"
          onClick={async () => {
            await storage.clearDoneTodos();
            await reload();
          }}
          className="mt-3 text-[12.5px] text-muted underline underline-offset-2 hover:text-ink"
        >
          {t("todo.clearDone", { count: done })}
        </button>
      ) : null}
    </Card>
  );
}
