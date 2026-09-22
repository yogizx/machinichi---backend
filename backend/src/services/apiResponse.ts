import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, ...data });
};

export const sendError = (res: Response, message: string, statusCode = 400, errors?: any[]) => {
  const response: any = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

export const sendPaginated = (res: Response, data: any[], total: number, page: number, limit: number) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
};
