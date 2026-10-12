import { defineComponent, h, type PropType } from 'vue'

export const inputTypes = ['text', 'email', 'password', 'search', 'tel', 'url'] as const
export type InputType = (typeof inputTypes)[number]

export interface InputProps {
  modelValue?: string
  type?: InputType
  invalid?: boolean
  disabled?: boolean
}

/** Single-line text field with `v-model`. `invalid` sets `aria-invalid`; pair it with a hint text. */
export const SwInput = defineComponent(
  (props: InputProps, { emit }) =>
    () =>
      h('input', {
        class: 'sw-input',
        type: props.type,
        value: props.modelValue,
        disabled: props.disabled,
        'aria-invalid': props.invalid ? 'true' : undefined,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value)
      }),
  {
    name: 'SwInput',
    props: {
      modelValue: { type: String, default: '' },
      type: { type: String as PropType<InputType>, default: 'text' },
      invalid: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false }
    },
    emits: { 'update:modelValue': (_value: string) => true }
  }
)
