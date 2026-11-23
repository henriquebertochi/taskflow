import { MouseSensor, TouchSensor, type DragEndEvent } from "@dnd-kit/core"
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react"
import type { Task, TaskStatus } from "@/lib/api/tasks"

// Botões, seletor e links dentro do cartão continuam clicáveis: arrastar não começa neles.
const INTERACTIVE = "button, select, input, textarea, a, [data-no-drag]"
const startsOnCard = (target: EventTarget | null) => !(target instanceof Element && target.closest(INTERACTIVE))

export class CardMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent }: ReactMouseEvent) => nativeEvent.button === 0 && startsOnCard(nativeEvent.target),
    },
  ]
}

export class CardTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent }: ReactTouchEvent) => startsOnCard(nativeEvent.target),
    },
  ]
}

// Coluna onde o cartão foi solto, se mudou; null se soltou fora ou na mesma coluna.
export function droppedStatus(event: Pick<DragEndEvent, "active" | "over">): TaskStatus | null {
  const task = event.active.data.current?.task as Task | undefined
  const target = event.over?.id as TaskStatus | undefined
  if (!task || !target || target === task.status) return null
  return target
}
