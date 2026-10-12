import { defineComponent, h, type PropType } from 'vue'

export const statuses = ['live', 'building', 'planned', 'blocked'] as const
export type Status = (typeof statuses)[number]

const labels: Record<Status, string> = {
  live: 'Live',
  building: 'Building',
  planned: 'Planned',
  blocked: 'Blocked'
}

export interface StatusPillProps {
  status: Status
  disabled?: boolean
}

/** The current status. Live = success (emerald), building = warning, planned = fg-subtle, blocked = danger. */
export const SwStatusPill = defineComponent(
  (props: StatusPillProps, { slots }) =>
    () =>
      h(
        'span',
        {
          class: [
            'sw-status-pill',
            `sw-status-pill--${props.status}`,
            { 'sw-is-disabled': props.disabled }
          ],
          'aria-disabled': props.disabled ? 'true' : undefined
        },
        slots.default?.() ?? labels[props.status]
      ),
  {
    name: 'SwStatusPill',
    props: {
      status: { type: String as PropType<Status>, required: true },
      disabled: { type: Boolean, default: false }
    }
  }
)
