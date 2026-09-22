import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): any => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error?.issues || [];
      const messages = issues.map((e: any) => ({
        field: e.path?.join('.') || '',
        message: e.message || 'Invalid value',
      }));
      console.log(`[VALIDATE] Validation failed for ${req.method} ${req.path}:`, JSON.stringify(messages));
      return res.status(400).json({ message: 'Validation failed', errors: messages.length > 0 ? messages : issues });
    }
    req[source] = result.data;
    next();
  };
};
