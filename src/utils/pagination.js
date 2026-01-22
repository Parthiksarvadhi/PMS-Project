exports.getPagination = (page = 1, limit = 2) => {
  page = Number(page);
  limit = Number(limit);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100; // max

  const offset = (page - 1) * limit;

  return { page, limit, offset };
};
