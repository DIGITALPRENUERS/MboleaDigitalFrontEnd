import { twMerge } from 'tailwind-merge';

const Skeleton = ({ className, variant = 'rectangular', ...props }) => {
    const baseStyles = 'animate-pulse bg-slate-200 rounded';
    
    const variants = {
        rectangular: '',
        circular: 'rounded-full',
        text: 'h-4',
        heading: 'h-6',
        avatar: 'rounded-full w-10 h-10'
    };

    return (
        <div
            className={twMerge(baseStyles, variants[variant], className)}
            {...props}
        />
    );
};

export const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
        <Skeleton variant="heading" className="w-3/4 mb-4" />
        <Skeleton variant="text" className="w-full mb-2" />
        <Skeleton variant="text" className="w-5/6" />
    </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
    <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
            <Skeleton variant="heading" className="w-1/4" />
        </div>
        <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-4 flex gap-4">
                    {Array.from({ length: columns }).map((_, j) => (
                        <Skeleton key={j} variant="text" className="flex-1" />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export default Skeleton;
