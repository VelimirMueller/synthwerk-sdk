import { defineComponent, h, type PropType } from 'vue'

export const buttonKinds = ['primary', 'secondary', 'ghost'] as const
export const buttonSizes = ['md', 'sm'] as const
export type ButtonKind = (typeof buttonKinds)[number]
export type ButtonSize = (typeof buttonSizes)[number]

export interface ButtonProps {
  kind?: ButtonKind
  size?: ButtonSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

/** Pill button. One primary per view. A disabled button emits no click. */
export const SwButton = defineComponent(
  (props: ButtonProps, { emit, slots }) =>
    () =>
      h(
        'button',
        {
          class: ['sw-button', `sw-button--${props.kind}`, `sw-button--${props.size}`],
          type: props.type,
          disabled: props.disabled,
          onClick: (event: MouseEvent) => {
            if (!props.disabled) emit('click', event)
          }
        },
        slots.default?.()
      ),
  {
    name: 'SwButton',
    props: {
      kind: { type: String as PropType<ButtonKind>, default: 'primary' },
      size: { type: String as PropType<ButtonSize>, default: 'md' },
      type: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button' },
      disabled: { type: Boolean, default: false }
    },
    emits: { click: (_event: MouseEvent) => true }
  }
)
