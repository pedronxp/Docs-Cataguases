import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_sistema/admin/status')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_sistema/admin/status"!</div>
}
