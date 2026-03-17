import { useState, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Input from '../ui/Input';
import { SkeletonTable } from '../ui/Skeleton';

const DataTable = ({ columns, data, onRowClick, isLoading, searchable = false, pagination = true, pageSize = 10 }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm || !searchable) return data || [];
        
        return (data || []).filter((row) =>
            columns.some((col) => {
                const value = row[col.accessor];
                return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
            })
        );
    }, [data, searchTerm, searchable, columns]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (typeof aValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [filteredData, sortConfig]);

    // Paginate data
    const paginatedData = useMemo(() => {
        if (!pagination) return sortedData;
        
        const startIndex = (currentPage - 1) * pageSize;
        return sortedData.slice(startIndex, startIndex + pageSize);
    }, [sortedData, currentPage, pageSize, pagination]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (accessor) => {
        setSortConfig((prev) => ({
            key: accessor,
            direction: prev.key === accessor && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (accessor) => {
        if (sortConfig.key !== accessor) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    };

    if (isLoading) {
        return <SkeletonTable rows={5} columns={columns.length} />;
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full p-12 text-center border rounded-lg bg-white">
                <p className="text-slate-500 text-lg font-medium">No data available</p>
                <p className="text-slate-400 text-sm mt-2">There are no records to display</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search */}
            {searchable && (
                <div className="flex justify-end">
                    <div className="w-full max-w-sm">
                        <Input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            icon={Search}
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    scope="col"
                                    className={twMerge(
                                        'px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider',
                                        col.sortable !== false && 'cursor-pointer hover:bg-slate-100 transition-colors select-none'
                                    )}
                                    onClick={() => col.sortable !== false && col.accessor && handleSort(col.accessor)}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.header}
                                        {col.accessor && col.sortable !== false && getSortIcon(col.accessor)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedData.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={twMerge(
                                    'transition-colors',
                                    onRowClick && 'cursor-pointer hover:bg-green-50/50'
                                )}
                            >
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg">
                    <div className="text-sm text-slate-600">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{' '}
                        <span className="font-medium">{sortedData.length}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={twMerge(
                                            'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                                            currentPage === pageNum
                                                ? 'bg-green-600 text-white'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
