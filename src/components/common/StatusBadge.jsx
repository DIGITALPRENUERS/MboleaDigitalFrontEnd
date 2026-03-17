import { twMerge } from 'tailwind-merge';

const StatusBadge = ({ status }) => {
    const getStatusColor = (status) => {
        const s = String(status || '').toUpperCase();
        switch (s) {
            case 'PAID':
            case 'CONFIRMED':
            case 'DELIVERED':
            case 'COMPLETED':
            case 'APPROVED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'PENDING':
            case 'AWAITING_PAYMENT':
            case 'IN_TRANSIT':
            case 'IN_PRODUCTION':
            case 'IN_LOGISTICS':
            case 'CONFIRMED_BY_SUPPLIER':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'CANCELLED':
            case 'REJECTED':
            case 'FAILED':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'SHIPPED':
            case 'PICKED':
                return 'bg-sky-100 text-sky-800 border-sky-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <span
            className={twMerge(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                getStatusColor(status)
            )}
        >
            {status ? status.replace(/_/g, ' ') : 'UNKNOWN'}
        </span>
    );
};

export default StatusBadge;
