export function paginateRecords(records, { page, pageSize }) {
  const totalItems = records.length;
  const startingIndex = (page - 1) * pageSize;
  return {
    data: records.slice(startingIndex, startingIndex + pageSize),
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}
