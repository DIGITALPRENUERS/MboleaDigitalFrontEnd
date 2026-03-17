import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_ORDER = [
    'CREATED',
    'AWAITING_PAYMENT',
    'PAID',
    'BULK_ORDERED',
    'IN_PRODUCTION',
    'SHIPPED',
    'IN_TRANSIT',
    'DELIVERED'
];

const Timeline = ({ currentStatus }) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);

    return (
        <div className="py-6">
            <div className="flex items-center justify-between w-full">
                {STATUS_ORDER.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                        <div key={step} className="flex flex-col items-center relative flex-1">
                            {/* Connecting Line */}
                            {index !== 0 && (
                                <div
                                    className={clsx(
                                        "absolute top-3 right-[50%] w-full h-1 -z-10",
                                        isCompleted ? "bg-green-600" : "bg-gray-200"
                                    )}
                                />
                            )}

                            {/* Icon */}
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center z-10 bg-white",
                                isCompleted ? "text-green-600" : "text-gray-300"
                            )}>
                                {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                            </div>

                            {/* Label */}
                            <div className="mt-2 text-center hidden md:block">
                                <span className={clsx(
                                    "text-xs font-medium",
                                    isCurrent ? "text-green-700 font-bold" : "text-gray-500"
                                )}>
                                    {step.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Mobile Label showing only current status */}
            <div className="md:hidden text-center mt-4">
                <p className="text-sm font-medium text-gray-700">
                    Current Status: <span className="font-bold text-green-700">{currentStatus?.replace(/_/g, ' ')}</span>
                </p>
            </div>
        </div>
    );
};

export default Timeline;
