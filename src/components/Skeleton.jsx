/** Sadə "skeleton" placeholder bloku — data yüklənərkən onun formasını təqlid edir. */
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export default Skeleton
