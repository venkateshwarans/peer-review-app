// Adapted from shadcn/ui (https://ui.shadcn.com/docs/components/toast)
import * as React from "react"
import { useState, useEffect, useCallback } from "react"

export type ToastProps = {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

const TOAST_LIMIT = 1000
// TOAST_REMOVE_DELAY is used in the codebase but marked as unused by ESLint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

// toastTimeouts is used in the codebase but marked as unused by ESLint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      if (toastId) {
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId ? { ...t } : t
          ),
        }
      }

      return {
        ...state,
        toasts: state.toasts.map((t) => ({ ...t })),
      }
    }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

export function useToast() {
  const [state, setState] = useState<State>({ toasts: [] })

  const toast = useCallback(
    ({ ...props }: Omit<ToasterToast, "id">) => {
      const id = genId()

      const update = (props: ToasterToast) =>
        setState((state) => reducer(state, { type: actionTypes.UPDATE_TOAST, toast: props }))
      const dismiss = () => setState((state) => reducer(state, { type: actionTypes.DISMISS_TOAST, toastId: id }))

      setState((state) =>
        reducer(state, {
          type: actionTypes.ADD_TOAST,
          toast: {
            ...props,
            id,
            duration: props.duration || 5000,
          },
        })
      )

      return {
        id,
        dismiss,
        update,
      }
    },
    [setState]
  )

  const update = useCallback(
    (id: string, props: Partial<ToasterToast>) => {
      setState((state) => reducer(state, { type: actionTypes.UPDATE_TOAST, toast: { ...props, id } }))
    },
    [setState]
  )

  const dismiss = useCallback(
    (id: string) => {
      setState((state) => reducer(state, { type: actionTypes.DISMISS_TOAST, toastId: id }))
    },
    [setState]
  )

  useEffect(() => {
    const timeouts = new Map<string, ReturnType<typeof setTimeout>>()

    state.toasts.forEach((toast) => {
      if (toast.duration) {
        const timeout = setTimeout(() => {
          dismiss(toast.id)
          timeouts.delete(toast.id)
        }, toast.duration)

        timeouts.set(toast.id, timeout)
      }
    })

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout))
    }
  }, [state.toasts, dismiss])

  return {
    ...state,
    toast,
    dismiss,
    update,
  }
}
