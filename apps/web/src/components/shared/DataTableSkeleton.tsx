import { Skeleton } from '@/components/ui/skeleton'

interface DataTableSkeletonProps {
    rows?: number
    columns?: number
}

export function DataTableSkeleton({ rows = 5, columns = 4 }: DataTableSkeletonProps) {
    return (
        <div className="w-full space-y-3">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-10 w-[250px] rounded-md" />
                <div className="flex space-x-2">
                    <Skeleton className="h-10 w-[100px] rounded-md" />
                    <Skeleton className="h-10 w-[100px] rounded-md" />
                </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3 bg-slate-50/50 flex space-x-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton key={i} className="h-4 flex-1 rounded-sm" />
                    ))}
                </div>

                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="px-4 py-4 border-b border-slate-100 flex items-center space-x-4">
                        {Array.from({ length: columns }).map((_, j) => (
                            <Skeleton key={j} className="h-5 flex-1 rounded-sm" />
                        ))}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-[150px] rounded-sm" />
                <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
        </div>
    )
}
