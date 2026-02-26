import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_sistema/admin/modelos/novo')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_sistema/admin/modelos/novo"!</div>
}
